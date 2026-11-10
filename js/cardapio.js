import { supabase } from './supabase.js'

// Colunas públicas da loja — NUNCA incluir mp_access_token, waha_api_key, email_dono.
// A view lojas_publicas (sql/008) já restringe no banco; a lista explícita é defesa em profundidade.
const LOJA_COLS_PUBLICAS = 'id,nome,descricao,logo_url,foto_capa_url,cor_primaria,tempo_entrega,cidade,aberta,ativa,hora_abre,hora_fecha,pix_ativo,chave_pix,mp_ativo,mp_public_key,dinheiro_ativo,whatsapp'

export async function getLoja(lojaId) {
  const { data, error } = await supabase
    .from('lojas_publicas').select(LOJA_COLS_PUBLICAS).eq('id', lojaId).single()
  if (!error) return data
  // Fallback para o período antes do sql/008 ser executado no Supabase
  const { data: loja } = await supabase
    .from('lojas').select(LOJA_COLS_PUBLICAS).eq('id', lojaId).single()
  return loja
}

export async function getCategorias(lojaId) {
  const { data } = await supabase.from('categorias')
    .select('*').eq('loja_id', lojaId).eq('ativa', true).order('ordem')
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
  const termo = bairro.trim()
  const { data } = await supabase
    .from('taxas_entrega')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .ilike('bairro', `%${termo}%`)
    .limit(1)
  return data?.[0] || null
}
