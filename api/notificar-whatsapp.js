// api/notificar-whatsapp.js — Vercel Function
// Envia mensagem WhatsApp ao cliente via WAHA quando status do pedido muda.
// Chamada fire-and-forget pelo painel — falhas não afetam o fluxo do pedido.
//
// SEGURANÇA (sql/008 + hardening 2026-08-19):
// - Exige JWT do lojista (Supabase Auth) e confirma que ele é dono da loja do pedido
// - pedidoId validado como UUID antes de qualquer consulta (sem injeção PostgREST)
// - novoStatus validado contra allowlist ANTES de tocar no banco
// - Rate limit best-effort por IP (por instância serverless; limite real = Upstash, futuro)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Rate limit best-effort (memória da instância — reseta em cold start, ainda assim limita abuso)
const _rl = new Map()
function rateLimitOk(ip, max = 20, janelaMs = 60000) {
  const agora = Date.now()
  const hits = (_rl.get(ip) || []).filter(t => agora - t < janelaMs)
  if (hits.length >= max) { _rl.set(ip, hits); return false }
  hits.push(agora); _rl.set(ip, hits); return true
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método não permitido' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (!rateLimitOk(ip)) return res.status(429).json({ error: 'Muitas requisições' })

  const { pedidoId, novoStatus } = req.body || {}

  // Validações de entrada — antes de qualquer acesso ao banco
  if (!pedidoId || !novoStatus) return res.status(400).json({ error: 'pedidoId e novoStatus obrigatórios' })
  if (!UUID_RE.test(pedidoId))  return res.status(400).json({ error: 'pedidoId inválido' })

  const msgs = {
    prep:     `👨‍🍳 Olá {nome}! Seu pedido *{num}* está sendo preparado. Em breve chegará até você! 🔥`,
    saiu:     `🛵 Olá {nome}! Seu pedido *{num}* saiu para entrega. Fique de olho! 🎉`,
    entregue: `✅ Olá {nome}! Seu pedido *{num}* foi entregue. Bom apetite! 😋`,
  }
  const msgTemplate = msgs[novoStatus]
  if (!msgTemplate) return res.status(200).json({ skip: 'status_sem_mensagem' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

  // Autenticação: exige token de sessão do lojista
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Não autenticado' })

  const rUser = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
  })
  if (!rUser.ok) return res.status(401).json({ error: 'Sessão inválida' })
  const user = await rUser.json()

  // Busca pedido (pedidoId já validado como UUID)
  const rPedido = await fetch(
    `${SUPABASE_URL}/rest/v1/pedidos?id=eq.${pedidoId}&select=nome_cliente,telefone_cliente,numero,loja_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const [pedido] = await rPedido.json()
  if (!pedido?.telefone_cliente) return res.status(200).json({ skip: 'sem_telefone' })

  // Autorização: usuário precisa ser dono da loja do pedido (ou admin)
  const rPerm = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${user.id}&select=loja_id,perfil`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const [usuario] = await rPerm.json()
  const autorizado = usuario && (usuario.perfil === 'admin' || usuario.loja_id === pedido.loja_id)
  if (!autorizado) return res.status(403).json({ error: 'Sem permissão para esta loja' })

  // Busca config WAHA da loja
  const rLoja = await fetch(
    `${SUPABASE_URL}/rest/v1/lojas?id=eq.${pedido.loja_id}&select=waha_url,waha_session,waha_api_key,waha_ativo`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const [loja] = await rLoja.json()
  if (!loja?.waha_ativo || !loja?.waha_url) return res.status(200).json({ skip: 'waha_inativo' })

  // Guarda SSRF: só http(s) — a URL vem do banco (configurada pelo lojista)
  let wahaBase
  try {
    wahaBase = new URL(loja.waha_url)
    if (!['http:', 'https:'].includes(wahaBase.protocol)) throw new Error()
  } catch {
    return res.status(200).json({ skip: 'waha_url_invalida' })
  }

  // Monta mensagem
  const num  = pedido.numero || `#${pedidoId.slice(0, 8).toUpperCase()}`
  const nome = pedido.nome_cliente || 'cliente'
  const text = msgTemplate.replace('{nome}', nome).replace('{num}', num)

  // Formata telefone para chatId WAHA
  const phone = pedido.telefone_cliente.replace(/\D/g, '')
  const chatId = `55${phone}@c.us`

  const headers = { 'Content-Type': 'application/json' }
  if (loja.waha_api_key) headers['X-Api-Key'] = loja.waha_api_key

  try {
    const resp = await fetch(`${wahaBase.origin}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session: loja.waha_session || 'default', chatId, text }),
    })
    if (!resp.ok) {
      const detail = await resp.text()
      return res.status(500).json({ error: 'waha_error', detail })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'fetch_error', detail: err.message })
  }
}
