// api/notificar-whatsapp.js — Vercel Function
// Envia mensagem WhatsApp ao cliente via WAHA quando status do pedido muda.
// Chamada fire-and-forget pelo painel — falhas não afetam o fluxo do pedido.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método não permitido' })

  const { pedidoId, novoStatus } = req.body || {}
  if (!pedidoId || !novoStatus) return res.status(400).json({ error: 'pedidoId e novoStatus obrigatórios' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

  // Busca pedido
  const rPedido = await fetch(
    `${SUPABASE_URL}/rest/v1/pedidos?id=eq.${pedidoId}&select=nome_cliente,telefone_cliente,numero,loja_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const [pedido] = await rPedido.json()
  if (!pedido?.telefone_cliente) return res.status(200).json({ skip: 'sem_telefone' })

  // Busca config WAHA da loja
  const rLoja = await fetch(
    `${SUPABASE_URL}/rest/v1/lojas?id=eq.${pedido.loja_id}&select=waha_url,waha_session,waha_api_key,waha_ativo`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const [loja] = await rLoja.json()
  if (!loja?.waha_ativo || !loja?.waha_url) return res.status(200).json({ skip: 'waha_inativo' })

  // Monta mensagem por status
  const num = pedido.numero || `#${pedidoId.slice(0, 8).toUpperCase()}`
  const nome = pedido.nome_cliente || 'cliente'
  const msgs = {
    prep:     `👨‍🍳 Olá ${nome}! Seu pedido *${num}* está sendo preparado. Em breve chegará até você! 🔥`,
    saiu:     `🛵 Olá ${nome}! Seu pedido *${num}* saiu para entrega. Fique de olho! 🎉`,
    entregue: `✅ Olá ${nome}! Seu pedido *${num}* foi entregue. Bom apetite! 😋`,
  }
  const text = msgs[novoStatus]
  if (!text) return res.status(200).json({ skip: 'status_sem_mensagem' })

  // Formata telefone para chatId WAHA
  const phone = pedido.telefone_cliente.replace(/\D/g, '')
  const chatId = `55${phone}@c.us`

  const headers = { 'Content-Type': 'application/json' }
  if (loja.waha_api_key) headers['X-Api-Key'] = loja.waha_api_key

  try {
    const resp = await fetch(`${loja.waha_url}/api/sendText`, {
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
