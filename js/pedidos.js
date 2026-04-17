import { supabase } from './supabase.js'

// Busca ou cria cliente pelo celular (cadastro automático)
async function salvarCliente(lojaId, cliente) {
  const tel = cliente.telefone.replace(/\D/g, '')
  const { data: existente } = await supabase
    .from('clientes').select('*')
    .eq('loja_id', lojaId).eq('telefone', tel).single()
  if (existente) {
    await supabase.from('clientes').update({
      nome:            cliente.nome,
      endereco_rua:    cliente.rua    || existente.endereco_rua,
      endereco_num:    cliente.num    || existente.endereco_num,
      endereco_comp:   cliente.comp   || existente.endereco_comp,
      endereco_bairro: cliente.bairro || existente.endereco_bairro,
      endereco_cidade: cliente.cidade || existente.endereco_cidade,
      endereco_cep:    cliente.cep    || existente.endereco_cep,
    }).eq('id', existente.id)
    return existente.id
  }
  const { data: novo } = await supabase.from('clientes').insert({
    loja_id: lojaId, nome: cliente.nome, telefone: tel,
    endereco_rua: cliente.rua, endereco_num: cliente.num,
    endereco_comp: cliente.comp, endereco_bairro: cliente.bairro,
    endereco_cidade: cliente.cidade, endereco_cep: cliente.cep,
  }).select().single()
  return novo?.id || null
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
export async function criarPedido(lojaId, cliente, itens, cupomId = null, desconto = 0, formaPagamento = 'pendente') {
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  const total    = Math.max(0, subtotal - desconto)

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
  // Tenta incluir forma_pagamento (só funciona se update_pagamento.sql foi rodado)
  try {
    dadosPedido.forma_pagamento  = formaPagamento
    dadosPedido.status_pagamento = formaPagamento === 'dinheiro' ? 'na_entrega' : 'pendente'
  } catch(e) {}

  const { data: pedido, error } = await supabase.from('pedidos')
    .insert(dadosPedido).select().single()

  if (error) throw error

  await supabase.from('itens_pedido').insert(itens.map(i => ({
    pedido_id: pedido.id, produto_id: i.produto_id,
    nome_produto: i.nome || 'Produto',
    preco_unitario: i.preco, quantidade: i.quantidade, subtotal: i.subtotal
  })))

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
