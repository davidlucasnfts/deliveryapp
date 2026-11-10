import { supabase } from './supabase.js'

// Busca ou cria cliente pelo celular (cadastro automático)
// Lookup via RPC security definer (sql/008) — anon não tem SELECT em clientes
async function salvarCliente(lojaId, cliente) {
  const tel = cliente.telefone.replace(/\D/g, '')

  try {
    const { data: rows } = await supabase.rpc('buscar_cliente_por_telefone', {
      p_loja_id: lojaId, p_telefone: tel
    })
    const existente = rows?.[0]

    if (existente) {
      // Atualiza nome, endereço e consentimento (colunas liberadas para anon)
      await supabase.from('clientes').update({
        nome:            cliente.nome,
        endereco_rua:    cliente.rua    || null,
        endereco_num:    cliente.num    || null,
        endereco_comp:   cliente.comp   || null,
        endereco_bairro: cliente.bairro || null,
        endereco_cidade: cliente.cidade || null,
        endereco_cep:    cliente.cep    || null,
        lgpd_consent_em: new Date().toISOString(),
      }).eq('id', existente.id)

      return existente.id
    }

    // Cria novo cliente — UUID gerado no cliente (anon não tem SELECT para ler de volta)
    const novoId = crypto.randomUUID()
    const { error } = await supabase.from('clientes').insert({
      id:       novoId,
      loja_id:  lojaId,
      nome:     cliente.nome,
      telefone: tel,
    })

    if (error) return null

    // Endereço e consentimento em update separado (colunas liberadas para anon)
    try {
      await supabase.from('clientes').update({
        endereco_rua:    cliente.rua    || null,
        endereco_num:    cliente.num    || null,
        endereco_comp:   cliente.comp   || null,
        endereco_bairro: cliente.bairro || null,
        endereco_cidade: cliente.cidade || null,
        endereco_cep:    cliente.cep    || null,
        lgpd_consent_em: new Date().toISOString(),
      }).eq('id', novoId)
    } catch(e) {}

    return novoId

  } catch(e) {
    // Se falhar tudo, não quebra o pedido
    console.warn('salvarCliente falhou (não crítico):', e.message)
    return null
  }
}

// Acumula pontos — registra histórico e totais via RPC (sql/008)
async function acumularPontos(lojaId, clienteId, pedidoId, total, itens) {
  const { data: config } = await supabase
    .from('fidelidade_config').select('*')
    .eq('loja_id', lojaId).eq('ativo', true).single()
  if (!config) return
  let pontos = 0
  if (config.tipo_pontuacao === 'compra') {
    pontos = Math.floor(total / (config.valor_por_ponto || 10))
  } else {
    pontos = itens.reduce((s, i) => s + (i.quantidade * (config.pontos_por_real || 1)), 0)
  }
  await supabase.rpc('registrar_ganho_pontos', {
    p_loja_id:    lojaId,
    p_cliente_id: clienteId,
    p_pedido_id:  pedidoId,
    p_pontos:     Math.max(0, pontos),
    p_descricao:  `Pedido #${pedidoId.slice(0,6).toUpperCase()}`,
    p_total:      total
  })
}

// Valida cupom
export async function validarCupom(lojaId, codigo, totalPedido) {
  const { data: cupom, error } = await supabase
    .from('cupons').select('*')
    .eq('loja_id', lojaId).eq('codigo', codigo.toUpperCase().trim()).eq('ativo', true).single()
  if (error || !cupom) return { ok: false, msg: 'Cupom inválido ou não encontrado' }
  if (cupom.validade) {
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const validade = new Date(cupom.validade + 'T23:59:59')
    if (validade < hoje) return { ok: false, msg: 'Cupom expirado' }
  }
  if (cupom.limite_usos !== null && cupom.usos_atual >= cupom.limite_usos)
    return { ok: false, msg: 'Cupom esgotado' }
  if (cupom.minimo_pedido > 0 && totalPedido < cupom.minimo_pedido)
    return { ok: false, msg: `Pedido mínimo de ${fmtVal(cupom.minimo_pedido)} para usar este cupom` }
  const desconto = cupom.tipo === 'pct'
    ? (totalPedido * cupom.valor) / 100
    : cupom.valor
  return {
    ok: true, cupom, desconto: Math.min(desconto, totalPedido),
    msg: cupom.tipo === 'pct'
      ? `Cupom aplicado! ${cupom.valor}% de desconto`
      : `Cupom aplicado! ${fmtVal(cupom.valor)} de desconto`
  }
}

function fmtVal(v) { return 'R$' + Number(v).toFixed(2).replace('.', ',') }

// Busca cliente pelo celular para autopreenchimento (via RPC — sem dump de PII)
export async function buscarClientePorTelefone(lojaId, telefone) {
  const tel = telefone.replace(/\D/g, '')
  if (tel.length < 10) return null
  const { data } = await supabase.rpc('buscar_cliente_por_telefone', {
    p_loja_id: lojaId, p_telefone: tel
  })
  return data?.[0] || null
}

// Busca pedidos do cliente pelo celular — tela "Meus pedidos" (via RPC, sql/009)
export async function buscarPedidosCliente(lojaId, telefone) {
  const tel = telefone.replace(/\D/g, '')
  if (tel.length < 10) return []
  const { data } = await supabase.rpc('buscar_pedidos_cliente', {
    p_loja_id: lojaId, p_telefone: tel
  })
  return data || []
}

// Cria pedido principal
export async function criarPedido(lojaId, cliente, itens, cupomId = null, desconto = 0, formaPagamento = 'pendente', taxaEntrega = 0) {
  // ─── VALIDAÇÕES ANTES DE QUALQUER INSERT ──────────────
  if (!lojaId)                 throw new Error('Loja não identificada')
  if (!cliente?.nome?.trim())  throw new Error('Nome do cliente é obrigatório')
  if (cliente.nome.trim().length < 3) throw new Error('Nome muito curto (mínimo 3 caracteres)')

  const telLimpo = String(cliente.telefone || '').replace(/\D/g, '')
  if (telLimpo.length !== 11)  throw new Error('Celular inválido — precisa ter 11 dígitos')

  if (!Array.isArray(itens) || !itens.length) throw new Error('Nenhum item no pedido')

  // Valida cada item individualmente
  for (const i of itens) {
    if (!i.produto_id)                     throw new Error('Item sem produto_id')
    if (!i.quantidade || i.quantidade < 1) throw new Error('Quantidade inválida em algum item')
    if (!Number.isFinite(Number(i.preco)) || Number(i.preco) < 0) throw new Error('Preço inválido em algum item')
    if (!Number.isFinite(Number(i.subtotal)) || Number(i.subtotal) < 0) throw new Error('Subtotal inválido em algum item')
  }

  // Calcula total com segurança
  const subtotal = itens.reduce((s, i) => s + Number(i.subtotal || 0), 0)
  const taxaNum  = Math.max(0, Number(taxaEntrega) || 0)
  const descNum  = Math.max(0, Number(desconto) || 0)
  const total    = Math.max(0, subtotal + taxaNum - descNum)

  if (total <= 0) throw new Error('Total do pedido é zero ou negativo')

  // UUID gerado no cliente — anon não tem SELECT em pedidos (sql/008),
  // então não podemos usar insert().select() para ler a linha de volta
  const pedidoId = crypto.randomUUID()

  const dadosPedido = {
    id:               pedidoId,
    loja_id:          lojaId,
    nome_cliente:     cliente.nome,
    telefone_cliente: cliente.telefone,
    endereco_entrega: cliente.endereco,
    observacoes:      cliente.obs,
    total,
    status:           'novo',
    forma_pagamento:  formaPagamento,
    status_pagamento: formaPagamento === 'dinheiro' ? 'na_entrega' : 'pendente'
  }

  const { error } = await supabase.from('pedidos').insert(dadosPedido)

  if (error) {
    throw new Error(error.message || 'Erro ao salvar pedido no banco')
  }

  // Número formatado (PD-YYYYMMDD-NNNNN) é gerado pelo trigger — busca best-effort
  // via RPC para exibir na tela de confirmação
  let numero = null
  try {
    const { data: num } = await supabase.rpc('obter_numero_pedido', { p_id: pedidoId })
    numero = num || null
  } catch(e) {}

  // Insere itens do pedido (UUIDs gerados no cliente para vincular adicionais)
  const itensBanco = itens.map(i => ({
    id:             crypto.randomUUID(),
    pedido_id:      pedidoId,
    produto_id:     i.produto_id,
    nome_produto:   i.nome || 'Produto',
    preco_unitario: i.preco,
    quantidade:     i.quantidade,
    subtotal:       i.subtotal
  }))

  const { error: erroItens } = await supabase
    .from('itens_pedido').insert(itensBanco)

  if (erroItens) {
    window.showToast('⚠️ Verifique sua conexão')
  }

  // Salva adicionais (só se tabela existir — update_fase1.sql rodado)
  try {
    const adicionaisParaSalvar = []
    if (!erroItens) {
      itensBanco.forEach((itemCriado, idx) => {
        const itemOriginal = itens[idx]
        if (itemOriginal?.adicionais?.length) {
          itemOriginal.adicionais.forEach(a => {
            adicionaisParaSalvar.push({
              item_pedido_id: itemCriado.id,
              adicional_id:   a.adicional_id,
              grupo_id:       a.grupo_id,
              nome_adicional: a.nome_adicional,
              nome_grupo:     a.nome_grupo,
              preco:          a.preco
            })
          })
        }
      })
    }
    if (adicionaisParaSalvar.length) {
      await supabase.from('itens_pedido_adicionais').insert(adicionaisParaSalvar)
    }
  } catch(e) {
    console.warn('Adicionais não salvos (rode update_fase1.sql):', e.message)
  }

  // Incrementa uso do cupom (anon só pode alterar a coluna usos_atual — sql/008)
  if (cupomId) {
    const { data: c } = await supabase.from('cupons').select('usos_atual').eq('id', cupomId).single()
    if (c) await supabase.from('cupons').update({ usos_atual: (c.usos_atual || 0) + 1 }).eq('id', cupomId)
  }

  // Fidelidade em background
  salvarCliente(lojaId, cliente).then(clienteId => {
    if (clienteId) acumularPontos(lojaId, clienteId, pedidoId, total, itens)
  }).catch(() => {})

  return { ...dadosPedido, numero }
}

export async function atualizarStatus(pedidoId, novoStatus) {
  await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
}

// Confirmação de pagamento via RPC security definer (sql/008) —
// anon não tem UPDATE em pedidos (prevenção de fraude)
export async function atualizarFormaPagamento(pedidoId, formaPagamento) {
  const { error } = await supabase.rpc('confirmar_pagamento', {
    p_pedido_id: pedidoId, p_forma: formaPagamento
  })
  if (error) throw new Error(error.message || 'Erro ao confirmar pagamento')
}

export function escutarPedidos(lojaId, callback) {
  return supabase.channel(`pedidos-${lojaId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public',
      table: 'pedidos', filter: `loja_id=eq.${lojaId}`
    }, callback).subscribe()
}

// Mensagens pré-formatadas por status (semi-automático)
export function msgWhatsAppStatus(status, nomeCliente, nomeLoja) {
  const msgs = {
    prep:     `Olá ${nomeCliente}! Seu pedido na ${nomeLoja} está sendo preparado. Em breve sairá para entrega!`,
    saiu:     `Boa notícia ${nomeCliente}! Seu pedido da ${nomeLoja} saiu para entrega. Aguarde!`,
    entregue: `Seu pedido da ${nomeLoja} foi entregue! Bom apetite, ${nomeCliente}! Obrigado pela preferência.`
  }
  return msgs[status] || ''
}
