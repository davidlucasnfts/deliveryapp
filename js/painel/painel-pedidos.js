// js/painel/painel-pedidos.js — renderização e ações de pedidos

import { supabase } from '../supabase.js'
import { fmt, toast, tempoDecorrido, isUrgente } from './utils.js'
import { atualizarStatus, msgWhatsAppStatus } from '../pedidos.js'

const statusLabel     = { novo:'Novo', prep:'Em preparo', saiu:'Saiu p/ entrega', entregue:'Entregue' }
const statusNext      = { novo:'prep', prep:'saiu', saiu:'entregue' }
const statusNextLabel = { novo:'Iniciar preparo', prep:'Saiu p/ entrega', saiu:'Marcar entregue' }

// Referência ao array de pedidos (injetada pelo core)
let _pedidos = []
let _concluidos_aberto = false
export function setPedidos(arr) { _pedidos = arr }
export function getPedidos()    { return _pedidos }
export function toggleConcluidos() { _concluidos_aberto = !_concluidos_aberto; renderPedidos() }

export function renderPedidos() {
  const emAberto  = _pedidos.filter(p => p.status !== 'entregue')
  const concluidos = _pedidos.filter(p => p.status === 'entregue')
  const totalHoje = _pedidos.reduce((s, p) => s + Number(p.total || 0), 0)
  const qtdNovos = emAberto.filter(p => p.status === 'novo').length

  const badge = document.getElementById('badgeNovos')
  if (badge) { badge.textContent = qtdNovos; badge.className = qtdNovos > 0 ? 'tab-badge show' : 'tab-badge' }

  // Produto mais vendido hoje
  const contagem = {}
  _pedidos.forEach(p => (p.itens_pedido||[]).forEach(i => {
    contagem[i.nome_produto] = (contagem[i.nome_produto]||0) + i.quantidade
  }))
  const topProd = Object.entries(contagem).sort((a,b)=>b[1]-a[1])[0]
  const ticketMedio = _pedidos.length ? totalHoje / _pedidos.length : 0

  let h = `<div class="stats">
    <div class="stat"><div class="stat-val">${_pedidos.length}</div><div class="stat-lbl">Pedidos hoje</div></div>
    <div class="stat"><div class="stat-val">${emAberto.length}</div><div class="stat-lbl">Em aberto</div></div>
    <div class="stat"><div class="stat-val">${fmt(totalHoje)}</div><div class="stat-lbl">Faturamento</div></div>
  </div>
  ${_pedidos.length > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem;">
    <div class="stat">
      <div style="font-size:0.68rem;color:var(--txt2);margin-bottom:0.15rem;">🏆 Mais vendido</div>
      <div style="font-size:0.82rem;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${topProd?topProd[0]:'—'}</div>
      <div style="font-size:0.68rem;color:var(--txt3);">${topProd?topProd[1]+' unidades':''}</div>
    </div>
    <div class="stat">
      <div style="font-size:0.68rem;color:var(--txt2);margin-bottom:0.15rem;">💰 Ticket médio</div>
      <div style="font-size:0.82rem;font-weight:700;color:var(--or);">${fmt(ticketMedio)}</div>
      <div style="font-size:0.68rem;color:var(--txt3);">por pedido</div>
    </div>
  </div>` : ''}`

  const novos    = emAberto.filter(p => p.status === 'novo')
  const preparo  = emAberto.filter(p => p.status === 'prep')
  const saiu     = emAberto.filter(p => p.status === 'saiu')

  h += window.innerWidth >= 768
    ? renderKanban(novos, preparo, saiu, concluidos)
    : renderLinear(novos, preparo, saiu, concluidos)

  document.getElementById('mainBody').innerHTML = h
}

function renderKanban(novos, preparo, saiu, concluidos) {
  return `<div class="kanban">
    ${kanbanCol('novo', '🔴 Novos', novos)}
    ${kanbanCol('prep', '🟠 Em preparo', preparo)}
    ${kanbanCol('saiu', '🟡 Saiu', saiu)}
    ${kanbanCol('done', '✅ Concluídos', concluidos)}
  </div>`
}

function kanbanCol(tipo, label, lista) {
  const vazio = lista.length === 0 ? `<div class="kanban-vazio">Nenhum pedido</div>` : ''
  return `<div class="kanban-col kanban-col--${tipo}">
    <div class="kanban-col-hd">
      <span class="kanban-col-lbl">${label}</span>
      <span class="kanban-col-count">${lista.length}</span>
    </div>
    ${lista.map(p => cardPedido(p)).join('')}${vazio}
  </div>`
}

function renderLinear(novos, preparo, saiu, concluidos) {
  const secoes = [
    { label: '🔴 Novo',            lista: novos,   tipo: 'novo' },
    { label: '🟠 Em preparo',      lista: preparo, tipo: 'prep' },
    { label: '🟡 Saiu p/ entrega', lista: saiu,    tipo: 'saiu' },
  ]
  let h = ''
  let temAlgum = false
  secoes.forEach(({ label, lista, tipo }) => {
    if (!lista.length) return
    temAlgum = true
    h += `<div class="sec-title sec-${tipo}">${label} <span class="sec-count">${lista.length}</span></div>`
    lista.forEach(p => { h += cardPedido(p) })
  })
  if (concluidos.length) {
    temAlgum = true
    const seta = _concluidos_aberto ? '▼' : '▶'
    h += `<div class="sec-title sec-concluido sec-title--toggle" onclick="toggleConcluidos()">✅ Concluídos hoje <span class="sec-count">${concluidos.length}</span> <span class="sec-seta">${seta}</span></div>`
    if (_concluidos_aberto) concluidos.forEach(p => { h += cardPedido(p) })
  }
  if (!temAlgum) {
    h += `<div class="empty"><div class="empty-icon">📭</div><div class="empty-txt">Nenhum pedido ainda.<br>Aparecerá aqui automaticamente.</div></div>`
  }
  return h
}

function cardPedido(p) {
  const itens   = (p.itens_pedido || []).map(i => `${i.quantidade}x ${i.nome_produto}`).join(' · ')
  const prox    = statusNext[p.status]
  const tempo   = tempoDecorrido(p.criado_em)
  const urgente = isUrgente(p.criado_em, p.status)
  const num     = p.numero || p.id.slice(0, 6).toUpperCase()
  const pgtoIcon = {pix:'💚 PIX', cartao:'💳 Cartão', dinheiro:'💵 Dinheiro', pendente:'⏳ Pendente'}
  const pgtoLabel = pgtoIcon[p.forma_pagamento] || ''

  return `<div class="order-card ${p.status}" onclick="abrirDetalhes('${p.id}')">
    <div class="oc-top">
      <div class="oc-meta">
        <div class="oc-num">#${num}</div>
        <div class="oc-name">${p.nome_cliente}</div>
        <div class="oc-addr">📍 ${p.endereco_entrega || '—'}</div>
            ${pgtoLabel?`<div style="font-size:0.68rem;font-weight:700;margin-top:0.2rem;color:var(--txt2);">${pgtoLabel}</div>`:''}
      </div>
      <div class="oc-right">
        <span class="status-pill s-${p.status}">${statusLabel[p.status]}</span>
        <span class="oc-time${urgente ? ' urgente' : ''}">${urgente ? '⚠️ ' : ''} ${tempo}</span>
      </div>
    </div>
    <div class="oc-items">${itens || '—'}</div>
    ${p.observacoes ? `<div class="oc-obs">📝 ${p.observacoes}</div>` : ''}
    <div class="oc-footer">
      <span class="oc-total">${fmt(p.total)}</span>
      <div class="oc-actions">
        ${p.telefone_cliente && p.status !== 'novo' && p.status !== 'entregue' ? `<button class="oc-btn btn-wpp" onclick="event.stopPropagation();notificarCliente('${p.id}')">WhatsApp</button>` : ''}
        ${p.telefone_cliente && p.status === 'novo' ? `<button class="oc-btn btn-wpp" onclick="event.stopPropagation();chamarWpp('${p.telefone_cliente}','${p.nome_cliente}')">WhatsApp</button>` : ''}
        ${p.telefone_cliente && p.status === 'entregue' ? `<button class="oc-btn btn-aval" onclick="event.stopPropagation();pedirAvaliacao('${p.id}')">⭐ Avaliar</button>` : ''}
        ${prox ? `<button class="oc-btn btn-avancar" onclick="event.stopPropagation();avancarPedido('${p.id}','${prox}')">→ ${statusNextLabel[p.status]}</button>` : ''}
      </div>
    </div>
  </div>`
}

export function abrirDetalhes(id) {
  const p = _pedidos.find(x => x.id === id); if (!p) return
  const itens = p.itens_pedido || []
  const total = itens.reduce((s, i) => s + Number(i.subtotal), 0)
  const num   = p.numero || p.id.slice(0, 6).toUpperCase()

  document.getElementById('mdTitle').textContent = `Pedido #${num}`
  document.getElementById('mdBody').innerHTML = `
    <div class="mdet-section">Cliente</div>
    <div class="mdet-row"><span class="mdet-lbl">Nome</span><span class="mdet-val">${p.nome_cliente}</span></div>
    <div class="mdet-row"><span class="mdet-lbl">Telefone</span><span class="mdet-val">${p.telefone_cliente || '—'}</span></div>
    <div class="mdet-row"><span class="mdet-lbl">Endereço</span><span class="mdet-val">${p.endereco_entrega || '—'}</span></div>
    ${p.observacoes ? `<div class="mdet-row"><span class="mdet-lbl">Obs.</span><span class="mdet-val" style="color:var(--or)">${p.observacoes}</span></div>` : ''}
    <div class="mdet-row"><span class="mdet-lbl">Horário</span><span class="mdet-val">${new Date(p.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="mdet-row"><span class="mdet-lbl">Status</span><span class="mdet-val">${statusLabel[p.status]}</span></div>
    <div class="mdet-section">Itens</div>
    ${itens.map(i => `<div class="mdet-item"><span>${i.quantidade}x ${i.nome_produto}</span><span style="font-weight:700;color:var(--or)">${fmt(i.subtotal)}</span></div>`).join('')}
    <div class="mdet-total"><span>Total</span><span>${fmt(total)}</span></div>
    ${statusNext[p.status] ? `<button class="modal-avancar" onclick="avancarModalPedido('${p.id}','${statusNext[p.status]}')">→ ${statusNextLabel[p.status]}</button>` : ''}
  `
  document.getElementById('modalDetalhes').classList.add('open')
}

export async function avancarPedido(id, novo) {
  await atualizarStatus(id, novo)
  const p = _pedidos.find(x => x.id === id); if (p) p.status = novo
  renderPedidos(); toast(`✅ ${statusLabel[novo]}`)
}

export async function avancarModalPedido(id, novo) {
  await atualizarStatus(id, novo)
  const p = _pedidos.find(x => x.id === id); if (p) p.status = novo
  document.getElementById('modalDetalhes').classList.remove('open')
  renderPedidos(); toast(`✅ ${statusLabel[novo]}`)
}

export function chamarWpp(tel, nome) {
  window.open(`https://wa.me/55${tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${nome}, tudo bem com seu pedido?`)}`, '_blank')
}

export function pedirAvaliacao(id) {
  const p = _pedidos.find(x => x.id === id)
  if (!p || !p.telefone_cliente) return
  const num = p.numero || p.id.slice(0, 6).toUpperCase()
  const msg = `Olá ${p.nome_cliente}! 😊 Seu pedido #${num} foi entregue!\nComo foi sua experiência conosco? Responda com uma nota de 1️⃣ a 5️⃣ ⭐\nSua opinião é muito importante pra nós! 🙏`
  window.open(`https://wa.me/55${p.telefone_cliente.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
}

export function notificarCliente(id) {
  const p = _pedidos.find(x => x.id === id)
  if (!p || !p.telefone_cliente) return
  const msg = msgWhatsAppStatus(p.status, p.nome_cliente, '(nome da loja)')
  if (!msg) { chamarWpp(p.telefone_cliente, p.nome_cliente); return }
  window.open(`https://wa.me/55${p.telefone_cliente.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
}
