// api/processar-pagamento.js — Vercel Function
// Processa pagamentos com cartão via Mercado Pago
// O Access Token de cada loja fica seguro aqui no backend

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const { token, valor, descricao, pagador, parcelas, lojaId } = req.body

    // Validações básicas
    if (!token)   return res.status(400).json({ error: 'Token do cartão ausente' })
    if (!valor)   return res.status(400).json({ error: 'Valor ausente' })
    if (!lojaId)  return res.status(400).json({ error: 'Loja não identificada' })

    // Busca Access Token da loja no Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // service key — só no backend
    )

    const { data: loja, error: lojaErr } = await supabase
      .from('lojas')
      .select('mp_access_token, mp_ativo, nome')
      .eq('id', lojaId)
      .single()

    if (lojaErr || !loja) return res.status(404).json({ error: 'Loja não encontrada' })
    if (!loja.mp_ativo)   return res.status(400).json({ error: 'Pagamento online não configurado para esta loja' })
    if (!loja.mp_access_token) return res.status(400).json({ error: 'Access Token do Mercado Pago não configurado' })

    // Processa pagamento na API do Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${loja.mp_access_token}`,
        'X-Idempotency-Key': `${lojaId}-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        token,
        description: descricao || `Pedido — ${loja.nome}`,
        installments: parcelas || 1,
        payment_method_id: req.body.payment_method_id,
        payer: {
          email:          pagador?.email || 'cliente@deliveryapp.com',
          identification: {
            type:   pagador?.doc_tipo  || 'CPF',
            number: pagador?.doc_num   || '00000000000'
          }
        }
      })
    })

    const mpData = await mpRes.json()

    // Trata resposta do MP
    if (!mpRes.ok) {
      console.error('MP error:', mpData)
      return res.status(mpRes.status).json({
        error: mpData.message || 'Erro ao processar pagamento',
        causa: mpData.cause?.[0]?.description || null
      })
    }

    // Retorna resultado para o frontend
    return res.status(200).json({
      id:     mpData.id,
      status: mpData.status,                    // approved | rejected | pending
      detalhe: mpData.status_detail,            // cc_rejected_bad_filled_cvv, etc
      aprovado: mpData.status === 'approved',
      mensagem: statusMensagem(mpData.status, mpData.status_detail)
    })

  } catch (err) {
    console.error('Erro interno:', err)
    return res.status(500).json({ error: 'Erro interno — tente novamente' })
  }
}

// Mensagens amigáveis para o cliente
function statusMensagem(status, detalhe) {
  if (status === 'approved') return 'Pagamento aprovado!'
  const msgs = {
    cc_rejected_bad_filled_cvv:      'CVV incorreto. Verifique o código de segurança do cartão.',
    cc_rejected_bad_filled_date:     'Data de validade incorreta.',
    cc_rejected_bad_filled_other:    'Dados do cartão incorretos. Verifique e tente novamente.',
    cc_rejected_blacklist:           'Cartão não autorizado. Entre em contato com seu banco.',
    cc_rejected_call_for_authorize:  'Pagamento não autorizado. Ligue para seu banco para liberar.',
    cc_rejected_card_disabled:       'Cartão desativado. Entre em contato com seu banco.',
    cc_rejected_duplicated_payment:  'Pagamento duplicado detectado. Aguarde alguns minutos.',
    cc_rejected_high_risk:           'Pagamento recusado por segurança. Tente outro cartão.',
    cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
    cc_rejected_invalid_installments:'Número de parcelas inválido para este cartão.',
    cc_rejected_max_attempts:        'Limite de tentativas atingido. Tente outro cartão.',
  }
  return msgs[detalhe] || 'Pagamento não aprovado. Tente outro cartão ou forma de pagamento.'
}
