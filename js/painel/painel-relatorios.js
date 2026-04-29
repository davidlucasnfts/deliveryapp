// js/painel/painel-relatorios.js

import { supabase } from '../supabase.js'
import { fmt } from './utils.js'

let _lojaId = null
let _periodo = 'hoje'

export function setLojaRel(id) { _lojaId = id }

export function trocarPeriodoRel(p) { _periodo = p; renderRelatorios() }

export async function renderRelatorios() {
  document.getElementById('mainBody').innerHTML =
    `<div class="rel-loading">Carregando...</div>`

  const { inicio, fim } = getPeriodo(_periodo)
  const { data } = await supabase
    .from('pedidos')
    .select('*,itens_pedido(*)')
    .eq('loja_id', _lojaId)
    .gte('criado_em', inicio)
    .lt('criado_em', fim)
    .order('criado_em', { ascending: false })

  renderHTML(data || [])
}

function getPeriodo(p) {
  // Brasil = UTC-3
  const agora    = new Date()
  const agoraBR  = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const dataHoje = agoraBR.toISOString().slice(0, 10)
  const meiaNBR  = new Date(dataHoje + 'T03:00:00.000Z') // meia-noite BR em UTC
  const dia      = 86400000

  if (p === 'hoje')   return { inicio: meiaNBR.toISOString(), fim: new Date(meiaNBR.getTime() + dia).toISOString() }
  if (p === 'semana') return { inicio: new Date(meiaNBR.getTime() - 6 * dia).toISOString(), fim: new Date(meiaNBR.getTime() + dia).toISOString() }
  if (p === 'mes')    return { inicio: new Date(meiaNBR.getTime() - 29 * dia).toISOString(), fim: new Date(meiaNBR.getTime() + dia).toISOString() }
}

function renderHTML(pd) {
  const faturamento = pd.reduce((s, p) => s + Number(p.total || 0), 0)
  const qtd         = pd.length
  const ticket      = qtd ? faturamento / qtd : 0
  const entregues   = pd.filter(p => p.status === 'entregue').length

  // Top 5 produtos
  const prods = {}
  pd.forEach(p => (p.itens_pedido || []).forEach(i => {
    prods[i.nome_produto] = (prods[i.nome_produto] || 0) + i.quantidade
  }))
  const topProds  = Object.entries(prods).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxProd   = topProds[0]?.[1] || 1

  // Top 5 bairros
  const bairros = {}
  pd.forEach(p => {
    const b = extrairBairro(p.endereco_entrega)
    if (b) bairros[b] = (bairros[b] || 0) + 1
  })
  const topBairros = Object.entries(bairros).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxBairro  = topBairros[0]?.[1] || 1

  // Horários de pico
  const horas = Array(24).fill(0)
  pd.forEach(p => { horas[new Date(p.criado_em).getHours()]++ })
  const maxHora = Math.max(...horas, 1)
  const horasAtivas = horas.map((v, h) => ({ h, v })).filter(x => x.v > 0)

  document.getElementById('mainBody').innerHTML = `
    <div class="rel-periodo">
      ${['hoje', 'semana', 'mes'].map(p =>
        `<button class="rel-per-btn${_periodo === p ? ' on' : ''}" onclick="trocarPeriodoRel('${p}')">${p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : '30 dias'}</button>`
      ).join('')}
    </div>

    <div class="rel-stats">
      <div class="rel-stat"><div class="rel-stat-val">${fmt(faturamento)}</div><div class="rel-stat-lbl">Faturamento</div></div>
      <div class="rel-stat"><div class="rel-stat-val">${qtd}</div><div class="rel-stat-lbl">Pedidos</div></div>
      <div class="rel-stat"><div class="rel-stat-val">${fmt(ticket)}</div><div class="rel-stat-lbl">Ticket médio</div></div>
      <div class="rel-stat"><div class="rel-stat-val">${entregues}</div><div class="rel-stat-lbl">Entregues</div></div>
    </div>

    ${topProds.length ? `
    <div class="rel-section">
      <div class="rel-sec-title">🏆 Mais vendidos</div>
      ${topProds.map(([nome, q]) => `
        <div class="rel-bar-row">
          <div class="rel-bar-nome">${nome}</div>
          <div class="rel-bar-wrap"><div class="rel-bar-fill" style="width:${Math.round(q / maxProd * 100)}%"></div></div>
          <div class="rel-bar-val">${q}x</div>
        </div>`).join('')}
    </div>` : ''}

    ${topBairros.length ? `
    <div class="rel-section">
      <div class="rel-sec-title">📍 Bairros que mais pedem</div>
      ${topBairros.map(([nome, q]) => `
        <div class="rel-bar-row">
          <div class="rel-bar-nome">${nome}</div>
          <div class="rel-bar-wrap"><div class="rel-bar-fill rel-bar-fill--grn" style="width:${Math.round(q / maxBairro * 100)}%"></div></div>
          <div class="rel-bar-val">${q}</div>
        </div>`).join('')}
    </div>` : ''}

    ${horasAtivas.length ? `
    <div class="rel-section">
      <div class="rel-sec-title">🕐 Horários de pico</div>
      <div class="rel-horas">
        ${horas.map((v, h) => `
          <div class="rel-hora-col" title="${h}h: ${v} pedido${v !== 1 ? 's' : ''}">
            <div class="rel-hora-bar" style="height:${Math.round(v / maxHora * 100)}%"></div>
            ${v > 0 ? `<div class="rel-hora-lbl">${h}h</div>` : ''}
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${!qtd ? `<div class="empty"><div class="empty-icon">📊</div><div class="empty-txt">Nenhum pedido no período.</div></div>` : ''}
  `
}

function extrairBairro(endereco) {
  if (!endereco) return null
  const p = endereco.split(',')
  if (p.length < 3) return null
  return p[2].trim().split(/[—(]/)[0].trim() || null
}
