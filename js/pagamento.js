// js/pagamento.js — fluxo de pagamento (PIX, cartão MP, dinheiro)

import { atualizarFormaPagamento } from './pedidos.js'

const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

export function abrirPagamento() {
  const subtotal = window.APP.cart.reduce((s, i) => s + i.preco * i.qty, 0)
  const total    = Math.max(0, subtotal - window.APP.descontoAtivo)
  document.getElementById('pgtoTotalVal').textContent = fmt(total)
  window.APP.pgtoSelecionado = null
  document.getElementById('pgtoConfirmar').disabled = true

  const pixAtivo     = window.APP.loja.pix_ativo && window.APP.loja.chave_pix
  const mpAtivo      = window.APP.loja.mp_ativo && window.APP.loja.mp_public_key
  const dinheiroAtivo = window.APP.loja.dinheiro_ativo !== false

  let h = ''

  if (pixAtivo) {
    h += `<div class="pgto-opcao" id="pgto-pix" onclick="selecionarPgto('pix')">
      <div class="pgto-opcao-header">
        <div class="pgto-opcao-icon" style="background:#E8F5E9;">💚</div>
        <div class="pgto-opcao-info">
          <div class="pgto-opcao-nome">PIX</div>
          <div class="pgto-opcao-desc">Instantâneo · aprovação na hora</div>
        </div>
        <div class="pgto-radio"><div class="pgto-radio-inner"></div></div>
      </div>
      <div class="pix-area">
        <div class="pix-chave">
          <div>
            <div class="pix-chave-lbl">Chave PIX</div>
            <div class="pix-chave-val">${window.APP.loja.chave_pix}</div>
          </div>
          <button class="pix-copy-btn" onclick="copiarPix(event)">Copiar</button>
        </div>
        <div class="pix-instrucao">
          1. Copie a chave PIX acima<br>
          2. Abra seu banco e faça o pagamento de ${fmt(total)}<br>
          3. Envie o comprovante pelo WhatsApp ao confirmar
        </div>
      </div>
    </div>`
  }

  if (mpAtivo) {
    h += `<div class="pgto-opcao" id="pgto-cartao" onclick="selecionarPgto('cartao')">
      <div class="pgto-opcao-header">
        <div class="pgto-opcao-icon" style="background:#E3F2FD;">💳</div>
        <div class="pgto-opcao-info">
          <div class="pgto-opcao-nome">Cartão de crédito ou débito</div>
          <div class="pgto-opcao-desc">Online · aprovação imediata · seguro</div>
        </div>
        <div class="pgto-radio"><div class="pgto-radio-inner"></div></div>
      </div>
      <div class="mp-form-wrap">
        <div class="mp-loading" id="mpLoading">Carregando formulário seguro...</div>
        <div id="mpCardForm"></div>
        <select class="pgto-parcelas" id="mpParcelas" style="display:none;">
          <option value="1">1x sem juros</option>
        </select>
        <div class="mp-erro" id="mpErro"></div>
        <div class="mp-aprovado" id="mpAprovado">Pagamento aprovado!</div>
      </div>
    </div>`
  }

  if (dinheiroAtivo) {
    h += `<div class="pgto-opcao" id="pgto-dinheiro" onclick="selecionarPgto('dinheiro')">
      <div class="pgto-opcao-header">
        <div class="pgto-opcao-icon" style="background:#FFF8E1;">💵</div>
        <div class="pgto-opcao-info">
          <div class="pgto-opcao-nome">Dinheiro na entrega</div>
          <div class="pgto-opcao-desc">Pague ao receber o pedido</div>
        </div>
        <div class="pgto-radio"><div class="pgto-radio-inner"></div></div>
      </div>
    </div>`
  }

  if (!h) {
    h = `<div style="text-align:center;padding:2rem;color:var(--txt2);font-size:0.88rem;">
      Nenhuma forma de pagamento configurada.<br>Entre em contato com o estabelecimento.
    </div>`
  }

  document.getElementById('pgtoOpcoes').innerHTML = h
  document.getElementById('pgtoScreen').classList.add('open')
}

export function fecharPagamento() {
  document.getElementById('pgtoScreen').classList.remove('open')
}

export function selecionarPgto(tipo) {
  window.APP.pgtoSelecionado = tipo
  document.querySelectorAll('.pgto-opcao').forEach(el => el.classList.remove('selecionado'))
  const el = document.getElementById('pgto-' + tipo)
  if (el) el.classList.add('selecionado')
  const labels = { pix: 'Confirmar — paguei no PIX', cartao: 'Pagar com cartão', dinheiro: 'Confirmar — pago na entrega' }
  document.getElementById('pgtoConfirmar').textContent = labels[tipo] || 'Confirmar pagamento'
  if (tipo === 'cartao') {
    document.getElementById('pgtoConfirmar').disabled = true
    inicializarMPForm()
  } else {
    document.getElementById('pgtoConfirmar').disabled = false
  }
}

export function inicializarMPForm() {
  if (window.APP.mpFormReady) return
  if (!window.APP.loja.mp_public_key) return
  try {
    window.APP.mpInstance = new MercadoPago(window.APP.loja.mp_public_key, { locale: 'pt-BR' })
    const cardForm = window.APP.mpInstance.cardForm({
      amount: String(Math.max(0, window.APP.cart.reduce((s, i) => s + i.preco * i.qty, 0) - window.APP.descontoAtivo)),
      iframe: true,
      form: {
        id: 'mpCardForm',
        cardNumber:           { id: 'form-checkout__cardNumber',          placeholder: 'Número do cartão' },
        expirationDate:       { id: 'form-checkout__expirationDate',      placeholder: 'MM/AA' },
        securityCode:         { id: 'form-checkout__securityCode',        placeholder: 'CVV' },
        cardholderName:       { id: 'form-checkout__cardholderName',      placeholder: 'Nome como no cartão' },
        issuer:               { id: 'form-checkout__issuer',              placeholder: 'Banco emissor' },
        installments:         { id: 'form-checkout__installments',        placeholder: 'Parcelas' },
        identificationType:   { id: 'form-checkout__identificationType',  placeholder: 'Tipo de doc.' },
        identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'CPF' },
        cardholderEmail:      { id: 'form-checkout__cardholderEmail',     placeholder: 'E-mail (opcional)' },
      },
      callbacks: {
        onFormMounted: err => {
          document.getElementById('mpLoading').style.display = 'none'
          if (err) console.warn('Form mount error:', err)
          else window.APP.mpFormReady = true
        },
        onSubmit: async event => {
          event.preventDefault()
          await processarCartaoMP(cardForm.getCardFormData())
        },
        onFetching: () => {
          const btn = document.getElementById('pgtoConfirmar')
          btn.disabled = true; btn.textContent = 'Verificando cartão...'
          return () => { btn.disabled = false; btn.textContent = 'Pagar com cartão' }
        },
        onValidityChange: () => {
          document.getElementById('pgtoConfirmar').disabled = false
        }
      }
    })
    window.APP.mpCardId = cardForm
    document.getElementById('pgtoConfirmar').disabled = false
  } catch (e) {
    window.showToast('⚠️ Verifique sua conexão')
    document.getElementById('mpLoading').textContent = 'Erro ao carregar formulário. Recarregue a página.'
  }
}

export function copiarPix(e) {
  e.stopPropagation()
  navigator.clipboard.writeText(window.APP.loja.chave_pix || '')
  const btn = e.target
  btn.textContent = 'Copiado!'
  setTimeout(() => { btn.textContent = 'Copiar' }, 2000)
}

export async function processarCartaoMP(formData) {
  const btn    = document.getElementById('pgtoConfirmar')
  const erroEl = document.getElementById('mpErro')
  const aprovEl = document.getElementById('mpAprovado')
  erroEl.classList.remove('show'); aprovEl.classList.remove('show')
  btn.disabled = true; btn.textContent = 'Processando pagamento...'

  try {
    if (!window.APP.pedidoAtual?.id) {
      throw new Error('Pedido não foi registrado. Recarregue a página.')
    }
    const res = await fetch('/api/processar-pagamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token:             formData.token,
        pedidoId:          window.APP.pedidoAtual.id,
        payment_method_id: formData.paymentMethodId,
        parcelas:          formData.installments || 1,
        descricao:         `Pedido ${window.APP.loja.nome}`,
        lojaId:            window.APP.lojaId,
        pagador: {
          email:    formData.cardholderEmail || 'cliente@deliveryapp.com',
          doc_tipo: formData.identificationType || 'CPF',
          doc_num:  formData.identificationNumber || '00000000000'
        }
      })
    })
    const data = await res.json()
    if (data.aprovado) {
      aprovEl.textContent = 'Pagamento aprovado!'
      aprovEl.classList.add('show')
      btn.textContent = 'Confirmado!'
      await finalizarPedido('cartao_online')
    } else {
      erroEl.textContent = data.mensagem || 'Pagamento recusado. Tente outro cartão.'
      erroEl.classList.add('show')
      btn.disabled = false; btn.textContent = 'Tentar novamente'
    }
  } catch (e) {
    window.showToast('⚠️ Verifique sua conexão')
    erroEl.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.'
    erroEl.classList.add('show')
    btn.disabled = false; btn.textContent = 'Tentar novamente'
  }
}

export async function confirmarPagamento() {
  if (!window.APP.pgtoSelecionado || !window.APP.pedidoAtual) return
  if (window.APP.pgtoSelecionado === 'cartao' && window.APP.mpCardId) {
    window.APP.mpCardId.cardForm?.submit?.()
    return
  }
  await finalizarPedido(window.APP.pgtoSelecionado)
}

export async function finalizarPedido(formaPagamento) {
  const btn = document.getElementById('pgtoConfirmar')
  btn.disabled = true; btn.textContent = 'Confirmando...'

  try {
    await atualizarFormaPagamento(window.APP.pedidoAtual.id, formaPagamento)

    const subtotal = window.APP.cart.reduce((s, i) => s + i.preco * i.qty, 0)
    const total    = Math.max(0, subtotal - window.APP.descontoAtivo)
    const nome     = window.APP.pedidoAtual._clienteData.nome
    const tel      = window.APP.pedidoAtual._clienteData.telefone
    const rua = window.APP.pedidoAtual._rua, num = window.APP.pedidoAtual._num, comp = window.APP.pedidoAtual._comp
    const bairro = window.APP.pedidoAtual._bairro, cidade = window.APP.pedidoAtual._cidade, cep = window.APP.pedidoAtual._cep
    const obs = window.APP.pedidoAtual._clienteData.obs

    const pgtoLabel = { pix: 'PIX (comprovante em anexo)', cartao: 'Cartão na entrega', dinheiro: 'Dinheiro na entrega' }

    let msg = `*Novo Pedido — ${window.APP.loja.nome}*\n\n`
    msg += `*Cliente:* ${nome}\n*Celular:* ${tel}\n\n`
    msg += `*Endereço:*\n${rua}, ${num}${comp ? ' — ' + comp : ''}\n${bairro}${cidade ? ' — ' + cidade : ''}\nCEP: ${cep}\n\n`
    msg += `*Itens:*\n`
    window.APP.cart.forEach(i => { msg += `• ${i.qty}x ${i.nome} — ${fmt(i.preco * i.qty)}\n` })
    if (window.APP.descontoAtivo > 0) msg += `\n*Desconto:* −${fmt(window.APP.descontoAtivo)}`
    msg += `\n*Total: ${fmt(total)}*`
    msg += `\n*Pagamento:* ${pgtoLabel[window.APP.pgtoSelecionado]}`
    if (obs) msg += `\n\n*Obs:* ${obs}`

    if (window.APP.loja.whatsapp) window.open(`https://wa.me/55${window.APP.loja.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')

    let pontosGanhos = 0
    if (window.APP.fidelidadeConfig?.ativo && window.APP.fidelidadeConfig?.id) {
      if (window.APP.fidelidadeConfig.tipo_pontuacao === 'compra') {
        pontosGanhos = Math.floor(total / (window.APP.fidelidadeConfig.valor_por_ponto || 10))
      } else {
        pontosGanhos = window.APP.pedidoAtual._itens.reduce((s, i) => s + (i.quantidade * (window.APP.fidelidadeConfig.pontos_por_real || 1)), 0)
      }
    }

    window.APP.mpFormReady = false; window.APP.mpInstance = null; window.APP.mpCardId = null
    document.getElementById('pgtoScreen').classList.remove('open')
    document.getElementById('cartScreen').innerHTML = `
      <div class="cs-success">
        <div class="cs-success-icon">🎉</div>
        <div class="cs-success-title">Pedido confirmado!</div>
        <div class="cs-success-sub">
          Pedido enviado pelo WhatsApp com sucesso!<br><br>
          <strong>Pagamento:</strong> ${pgtoLabel[window.APP.pgtoSelecionado]}<br><br>
          <strong>Entrega em:</strong><br>${rua}, ${num}${comp ? ' — ' + comp : ''}<br>${bairro}${cidade ? ' — ' + cidade : ''} · CEP: ${cep}
        </div>
        ${pontosGanhos > 0 ? `<div class="cs-success-pontos"><div class="cs-success-pontos-txt">Voce ganhou neste pedido</div><div class="cs-success-pontos-val">+${pontosGanhos} pontos</div></div>` : ''}
        <button class="cs-novo-btn" onclick="location.reload()">Fazer novo pedido</button>
      </div>`
    window.APP.cart = []; window.limparCartSalvo(); window.atualizarCartBar()
  } catch (e) {
    window.showToast('⚠️ Erro ao confirmar. Tente novamente.')
    btn.disabled = false; btn.textContent = 'Confirmar pagamento'
  }
}
