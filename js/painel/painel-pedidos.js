// js/painel/painel-pedidos.js — renderização e ações de pedidos

import { supabase } from '../supabase.js'
import { fmt, toast, tempoDecorrido, isUrgente } from './utils.js'
import { atualizarStatus } from '../pedidos.js'

const statusLabel     = { novo:'Novo', prep:'Em preparo', saiu:'Saiu p/ entrega', entregue:'Entregue' }
const statusNext      = { novo:'prep', prep:'saiu', saiu:'entregue' }
const statusNextLabel = { novo:'Iniciar preparo', prep:'Saiu p/ entrega', saiu:'Marcar entregue' }

// Referência ao array de pedidos (injetada pelo core)
let _pedidos = []
export function setPedidos(arr) { _pedidos = arr }
export function getPedidos()    { return _pedidos }

export function renderPedidos() {
  const emAberto  = _pedidos.filter(p => p.status !== 'entregue')
  const concluidos = _pedidos.filter(p => p.status === 'entregue')
  const totalHoje = _pedidos.reduce((s, p) => s + Number(p.total || 0), 0)
  const novos = emAberto.filter(p => p.status === 'novo').length

  const badge = document.getElementById('badgeNovos')
  if (badge) { badge.textContent = novos; badge.className = novos > 0 ? 'tab-badge show' : 'tab-badge' }

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

  if (emAberto.length) {
    h += `<div class="sec-title">Em aberto (${emAberto.length})</div>`
    emAberto.forEach(p => { h += cardPedido(p) })
  }
  if (concluidos.length) {
    h += `<div class="sec-title">Concluídos hoje (${concluidos.length})</div>`
    concluidos.forEach(p => { h += cardPedido(p) })
  }
  if (!_pedidos.length) {
    h += `<div class="empty"><div class="empty-icon">📭</div><div class="empty-txt">Nenhum pedido ainda.<br>Aparecerá aqui automaticamente.</div></div>`
  }

  document.getElementById('mainBody').innerHTML = h
}

function cardPedido(p) {
  const itens   = (p.itens_pedido || []).map(i => `${i.quantidade}x ${i.nome_produto}`).join(' · ')
  const prox    = statusNext[p.status]
  const tempo   = tempoDecorrido(p.criado_em)
  const urgente = isUrgente(p.criado_em, p.status)
  const num     = p.numero || p.id.slice(0, 6).toUpperCase()

  return `<div class="order-card ${p.status}" onclick="abrirDetalhes('${p.id}')">
    <div class="oc-top">
      <div class="oc-meta">
        <div class="oc-num">#${num}</div>
        <div class="oc-name">${p.nome_cliente}</div>
        <div class="oc-addr">📍 ${p.endereco_entrega || '—'}</div>
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
        ${p.telefone_cliente ? `<button class="oc-btn btn-wpp" onclick="event.stopPropagation();chamarWpp('${p.telefone_cliente}','${p.nome_cliente}')">WhatsApp</button>` : ''}
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
