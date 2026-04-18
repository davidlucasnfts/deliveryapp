import { supabase } from './supabase.js'

// Busca ou cria cliente pelo celular (cadastro automático)
// Só salva campos que existem com certeza na tabela
async function salvarCliente(lojaId, cliente) {
  const tel = cliente.telefone.replace(/\D/g, '')
  
  try {
    const { data: existente } = await supabase
      .from('clientes').select('id,nome,total_pontos,total_pedidos,total_gasto')
      .eq('loja_id', lojaId).eq('telefone', tel).single()

    if (existente) {
      // Atualiza só nome — campos de endereço podem não existir ainda
      await supabase.from('clientes')
        .update({ nome: cliente.nome })
        .eq('id', existente.id)
      
      // Tenta atualizar endereço se as colunas existirem
      try {
        await supabase.from('clientes').update({
          endereco_rua:    cliente.rua    || null,
          endereco_num:    cliente.num    || null,
          endereco_comp:   cliente.comp   || null,
          endereco_bairro: cliente.bairro || null,
          endereco_cidade: cliente.cidade || null,
          endereco_cep:    cliente.cep    || null,
        }).eq('id', existente.id)
      } catch(e) {} // silencia se colunas não existirem

      return existente.id
    }

    // Cria novo cliente com campos básicos
    const { data: novo, error } = await supabase.from('clientes').insert({
      loja_id:  lojaId,
      nome:     cliente.nome,
      telefone: tel,
    }).select('id').single()

    if (error || !novo) return null

    // Tenta salvar endereço separadamente
    try {
      await supabase.from('clientes').update({
        endereco_rua:    cliente.rua    || null,
        endereco_num:    cliente.num    || null,
        endereco_comp:   cliente.comp   || null,
        endereco_bairro: cliente.bairro || null,
        endereco_cidade: cliente.cidade || null,
        endereco_cep:    cliente.cep    || null,
      }).eq('id', novo.id)
    } catch(e) {}

    return novo.id

  } catch(e) {
    // Se falhar tudo, não quebra o pedido
    console.warn('salvarCliente falhou (não crítico):', e.message)
    return null
  }
}

// Acumula pontos (trigger no banco faz o update, só registra o histórico)
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
  if (pontos <= 0) return
  await supabase.from('pontos_historico').insert({
    loja_id: lojaId, cliente_id: clienteId, pedido_id: pedidoId,
    pontos, tipo: 'ganho',
    descricao: `Pedido #${pedidoId.slice(0,6).toUpperCase()}`
  })
  // Atualiza total_gasto manualmente (trigger cuida dos pontos)
  const { data: cli } = await supabase.from('clientes').select('total_gasto').eq('id', clienteId).single()
  if (cli) await supabase.from('clientes').update({
    total_gasto: (cli.total_gasto || 0) + total
  }).eq('id', clienteId)
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

// Busca cliente pelo celular para autopreenchimento
export async function buscarClientePorTelefone(lojaId, telefone) {
  const tel = telefone.replace(/\D/g, '')
  if (tel.length < 10) return null
  const { data } = await supabase.from('clientes').select('*')
    .eq('loja_id', lojaId).eq('telefone', tel).single()
  return data
}

// Cria pedido principal
export async function criarPedido(lojaId, cliente, itens, cupomId = null, desconto = 0, formaPagamento = 'pendente', taxaEntrega = 0) {
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  const total    = Math.max(0, subtotal + taxaEntrega - desconto)

  // Monta dados do pedido — forma_pagamento é opcional (depende do SQL ter rodado)
  const dadosPedido = {
    loja_id:          lojaId,
    nome_cliente:     cliente.nome,
    telefone_cliente: cliente.telefone,
    endereco_entrega: cliente.endereco,
    observacoes:      cliente.obs,
    total,
    status:           'novo'
  }
  // Inclui forma_pagamento (rode update_pagamento.sql se ainda não rodou)
  dadosPedido.forma_pagamento  = formaPagamento
  dadosPedido.status_pagamento = formaPagamento === 'dinheiro' ? 'na_entrega' : 'pendente'

  const { data: pedido, error } = await supabase.from('pedidos')
    .insert(dadosPedido).select().single()

  if (error) {
    console.error('Erro ao criar pedido:', error)
    throw new Error(error.message || 'Erro ao salvar pedido no banco')
  }

  // Insere itens do pedido
  const itensBanco = itens.map(i => ({
    pedido_id:      pedido.id,
    produto_id:     i.produto_id,
    nome_produto:   i.nome || 'Produto',
    preco_unitario: i.preco,
    quantidade:     i.quantidade,
    subtotal:       i.subtotal
  }))

  const { data: itensCriados, error: erroItens } = await supabase
    .from('itens_pedido').insert(itensBanco).select()

  if (erroItens) {
    console.error('Erro ao salvar itens:', erroItens)
    // Não lança erro — pedido já foi criado
  }

  // Salva adicionais (só se tabela existir — update_fase1.sql rodado)
  try {
    const adicionaisParaSalvar = []
    if (itensCriados) {
      itensCriados.forEach((itemCriado, idx) => {
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

  // Incrementa uso do cupom
  if (cupomId) {
    const { data: c } = await supabase.from('cupons').select('usos_atual').eq('id', cupomId).single()
    if (c) await supabase.from('cupons').update({ usos_atual: (c.usos_atual || 0) + 1 }).eq('id', cupomId)
  }

  // Fidelidade em background
  salvarCliente(lojaId, cliente).then(clienteId => {
    if (clienteId) acumularPontos(lojaId, clienteId, pedido.id, total, itens)
  }).catch(() => {})

  return pedido
}

export async function atualizarStatus(pedidoId, novoStatus) {
  await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
}

export async function atualizarFormaPagamento(pedidoId, formaPagamento) {
  await supabase.from('pedidos').update({
    forma_pagamento: formaPagamento,
    status_pagamento: formaPagamento === 'dinheiro' ? 'na_entrega' : 'pago'
  }).eq('id', pedidoId)
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
