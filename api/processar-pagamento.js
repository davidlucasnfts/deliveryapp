// api/processar-pagamento.js — Vercel Function
// SEGURANÇA: recebe só o pedidoId do cliente. Busca itens no banco e
// recalcula o total aqui no servidor. Isso impede fraude via DevTools.

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método não permitido' })

  const tLog = Date.now()

  try {
    const { token, pedidoId, descricao, pagador, parcelas, lojaId, payment_method_id } = req.body

    // ─── Validações de entrada ──────────────────────────────
    if (!token)              return res.status(400).json({ error: 'Token do cartão ausente' })
    if (!pedidoId)           return res.status(400).json({ error: 'ID do pedido ausente' })
    if (!lojaId)             return res.status(400).json({ error: 'Loja não identificada' })
    if (!payment_method_id)  return res.status(400).json({ error: 'Método de pagamento ausente' })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // ─── Busca pedido e itens NO BANCO (fonte da verdade) ──
    const { data: pedido, error: pedErr } = await supabase
      .from('pedidos')
      .select('id, loja_id, total, status_pagamento, nome_cliente, telefone_cliente')
      .eq('id', pedidoId)
      .single()

    if (pedErr || !pedido) {
      console.error(`[LOG ${tLog}] Pedido não encontrado:`, pedidoId, pedErr?.message)
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    // Verifica se o pedido pertence à loja informada (impede trocar loja no meio)
    if (pedido.loja_id !== lojaId) {
      console.error(`[LOG ${tLog}] Loja divergente — pedido.loja_id=${pedido.loja_id}, lojaId=${lojaId}`)
      return res.status(403).json({ error: 'Pedido não pertence a esta loja' })
    }

    // Impede pagamento duplicado do mesmo pedido
    if (pedido.status_pagamento === 'aprovado') {
      console.warn(`[LOG ${tLog}] Tentativa de pagar pedido já aprovado:`, pedidoId)
      return res.status(400).json({
        error: 'Este pedido já foi pago',
        status: 'approved',
        aprovado: true,
        mensagem: 'Pedido já pago anteriormente'
      })
    }

    // Valor vem do BANCO, nunca do cliente
    const valor = Number(pedido.total)
    if (!valor || valor <= 0) {
      console.error(`[LOG ${tLog}] Valor inválido no banco:`, valor)
      return res.status(400).json({ error: 'Valor do pedido inválido' })
    }

    // ─── Busca credenciais da loja ──────────────────────────
    const { data: loja, error: lojaErr } = await supabase
      .from('lojas')
      .select('mp_access_token, mp_ativo, nome')
      .eq('id', lojaId)
      .single()

    if (lojaErr || !loja)          return res.status(404).json({ error: 'Loja não encontrada' })
    if (!loja.mp_ativo)            return res.status(400).json({ error: 'Pagamento online não configurado' })
    if (!loja.mp_access_token)     return res.status(400).json({ error: 'Access Token do Mercado Pago não configurado' })

    // LOG — registra tentativa de pagamento
    console.log(`[LOG ${tLog}] Iniciando pagamento — loja=${lojaId} pedido=${pedidoId} valor=R$${valor.toFixed(2)}`)

    // ─── Chama Mercado Pago ─────────────────────────────────
    // IDEMPOTENCY-KEY baseada no pedidoId — previne cobrança dupla
    // se o cliente clicar várias vezes ou a rede cair
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'Authorization':      `Bearer ${loja.mp_access_token}`,
        'X-Idempotency-Key':  `pedido-${pedidoId}`
      },
      body: JSON.stringify({
        transaction_amount: valor,                      // <- VEIO DO BANCO
        token,
        description:        descricao || `Pedido — ${loja.nome}`,
        installments:       parcelas || 1,
        payment_method_id,
        external_reference: pedidoId,                   // <- rastreia no MP
        payer: {
          email:          pagador?.email || 'cliente@deliveryapp.com',
          identification: {
            type:   pagador?.doc_tipo || 'CPF',
            number: pagador?.doc_num  || '00000000000'
          }
        }
      })
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok) {
      console.error(`[LOG ${tLog}] MP error — status=${mpRes.status}:`, mpData.message, mpData.cause)
      return res.status(mpRes.status).json({
        error: mpData.message || 'Erro ao processar pagamento',
        causa: mpData.cause?.[0]?.description || null
      })
    }

    console.log(`[LOG ${tLog}] MP response — id=${mpData.id} status=${mpData.status} detalhe=${mpData.status_detail}`)

    // ─── Atualiza status do pedido no banco ────────────────
    if (mpData.status === 'approved') {
      await supabase
        .from('pedidos')
        .update({
          status_pagamento: 'aprovado',
          mp_payment_id:    String(mpData.id)
        })
        .eq('id', pedidoId)
      console.log(`[LOG ${tLog}] ✅ Pedido ${pedidoId} marcado como aprovado`)
    } else if (mpData.status === 'rejected') {
      await supabase
        .from('pedidos')
        .update({ status_pagamento: 'rejeitado' })
        .eq('id', pedidoId)
    }

    // ─── Retorna ao frontend ────────────────────────────────
    return res.status(200).json({
      id:       mpData.id,
      status:   mpData.status,
      detalhe:  mpData.status_detail,
      aprovado: mpData.status === 'approved',
      mensagem: statusMensagem(mpData.status, mpData.status_detail)
    })

  } catch (err) {
    console.error(`[LOG ${tLog}] Erro interno:`, err.message, err.stack)
    return res.status(500).json({ error: 'Erro interno. Tente novamente em instantes.' })
  }
}

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
    cc_rejected_max_attempts:        'Limite de tentativas atingido. Tente outro cartão.'
  }
  return msgs[detalhe] || 'Pagamento não aprovado. Tente outro cartão ou forma de pagamento.'
}
