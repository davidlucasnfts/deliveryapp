import { supabase } from './supabase.js'

export async function login(email, senha) {
  const { data, error } = await supabase.auth
    .signInWithPassword({ email, password: senha })
  if (error) throw error
  return data
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

export async function getUsuarioAtual() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

export async function getPerfil(userId) {
  const { data } = await supabase
    .from('usuarios')
    .select('*, lojas(*)')
    .eq('id', userId)
    .single()
  return data
}