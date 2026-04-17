import { supabase } from './supabase.js'

export async function getLoja(lojaId) {
  const { data } = await supabase.from('lojas').select('*').eq('id', lojaId).single()
  return data
}

export async function getCategorias(lojaId) {
  const { data } = await supabase.from('categorias')
    .select('*').eq('loja_id', lojaId).eq('ativa', true).order('ordem')
  return data || []
}

export async function getProdutos(lojaId, categoriaId) {
  const { data } = await supabase.from('produtos')
    .select('*').eq('loja_id', lojaId).eq('categoria_id', categoriaId).eq('disponivel', true)
  return data || []
}

export async function getTodosProdutos(lojaId) {
  const { data } = await supabase.from('produtos')
    .select('*,categorias(nome)').eq('loja_id', lojaId).order('nome')
  return data || []
}

export async function getTodasCategorias(lojaId) {
  const { data } = await supabase.from('categorias')
    .select('*').eq('loja_id', lojaId).order('ordem')
  return data || []
}

// Busca grupos de adicionais de um produto com seus itens
export async function getGruposAdicionais(produtoId) {
  const { data: grupos } = await supabase
    .from('grupos_adicionais')
    .select('*')
    .eq('produto_id', produtoId)
    .eq('ativo', true)
    .order('ordem')
  if (!grupos?.length) return []

  const grupoIds = grupos.map(g => g.id)
  const { data: itens } = await supabase
    .from('adicionais')
    .select('*')
    .in('grupo_id', grupoIds)
    .eq('ativo', true)
    .order('ordem')

  return grupos.map(g => ({
    ...g,
    itens: (itens || []).filter(i => i.grupo_id === g.id)
  }))
}

// Busca taxa de entrega por bairro
export async function getTaxaEntrega(lojaId, bairro) {
  if (!bairro) return null
  const termo = bairro.toLowerCase().trim()
  const { data } = await supabase
    .from('taxas_entrega')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
  if (!data?.length) return null
  // Busca por correspondência parcial
  const found = data.find(t =>
    t.bairro.toLowerCase().includes(termo) || termo.includes(t.bairro.toLowerCase())
  )
  return found || null
}

// Busca todas as taxas de entrega de uma loja
export async function getTaxasEntrega(lojaId) {
  const { data } = await supabase
    .from('taxas_entrega')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('bairro')
  return data || []
}
