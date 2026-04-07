import { supabase } from './supabase.js'

export async function criarPedido(lojaId, cliente, itens) {
  const total = itens.reduce((s, i) => s + i.subtotal, 0)

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({
      loja_id:          lojaId,
      nome_cliente:     cliente.nome,
      telefone_cliente: cliente.telefone,
      endereco_entrega: cliente.endereco,
      observacoes:      cliente.obs,
      total,
      status:           'novo'
    })
    .select()
    .single()

  if (error) throw error

  const itensSalvar = itens.map(i => ({
    pedido_id:      pedido.id,
    produto_id:     i.produto_id,
    nome_produto:   i.nome,
    preco_unitario: i.preco,
    quantidade:     i.quantidade,
    subtotal:       i.subtotal
  }))

  await supabase.from('itens_pedido').insert(itensSalvar)
  return pedido
}

export async function atualizarStatus(pedidoId, novoStatus) {
  await supabase
    .from('pedidos')
    .update({ status: novoStatus })
    .eq('id', pedidoId)
}

export function escutarPedidos(lojaId, callback) {
  return supabase
    .channel(`pedidos-${lojaId}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'pedidos',
      filter: `loja_id=eq.${lojaId}`
    }, callback)
    .subscribe()
}