// js/painel/painel-waha.js — configuração e status da integração WAHA

import { supabase } from '../supabase.js'
import { toast }    from './utils.js'

let _loja = null
export function setLojaWaha(loja) { _loja = loja }

export async function salvarWaha() {
  const url     = document.getElementById('wahaUrl')?.value.trim()
  const session = document.getElementById('wahaSession')?.value.trim() || 'default'
  const apiKey  = document.getElementById('wahaApiKey')?.value.trim()
  const ativo   = document.getElementById('wahaAtivo')?.checked ?? false

  const { error } = await supabase.from('lojas').update({
    waha_url:     url     || null,
    waha_session: session,
    waha_api_key: apiKey  || null,
    waha_ativo:   ativo,
  }).eq('id', _loja.id)

  if (error) { toast('❌ Erro ao salvar'); return }

  _loja.waha_url     = url     || null
  _loja.waha_session = session
  _loja.waha_api_key = apiKey  || null
  _loja.waha_ativo   = ativo

  toast('✅ WAHA salvo!')
}

export async function testarWaha() {
  const url     = document.getElementById('wahaUrl')?.value.trim()
  const session = document.getElementById('wahaSession')?.value.trim() || 'default'
  const apiKey  = document.getElementById('wahaApiKey')?.value.trim()

  if (!url) { toast('⚠️ Informe a URL do WAHA primeiro'); return }

  const btn = document.getElementById('wahaTestBtn')
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...' }

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers['X-Api-Key'] = apiKey

    const resp = await fetch(`${url}/api/sessions/${session}`, { headers })
    const data = await resp.json()

    const status = data?.status || data?.engine?.state || 'desconhecido'
    const conectado = status === 'WORKING' || status === 'CONNECTED'
    toast(conectado ? `✅ Conectado (${status})` : `⚠️ Status: ${status}`)
  } catch {
    toast('❌ Não foi possível conectar ao WAHA')
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Testar conexão' }
  }
}
