import { supabase } from './supabase.js'

export async function getLoja(lojaId) {
  const { data } = await supabase
    .from('lojas')
    .select('*')
    .eq('id', lojaId)
    .single()
  return data
}

export async function getCategorias(lojaId) {
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ativa', true)
    .order('ordem')
  return data
}

// Cardápio público — só produtos disponíveis (tela do cliente)
export async function getProdutos(lojaId) {
  const { data } = await supabase
    .from('produtos')
    .select('*, categorias(nome)')
    .eq('loja_id', lojaId)
    .eq('disponivel', true)
    .order('ordem')
  return data
}

// BUG FIX: painel do dono vê TODOS os produtos incluindo indisponíveis
export async function getTodosProdutos(lojaId) {
  const { data } = await supabase
    .from('produtos')
    .select('*, categorias(nome)')
    .eq('loja_id', lojaId)
    .order('ordem')
  return data
}
