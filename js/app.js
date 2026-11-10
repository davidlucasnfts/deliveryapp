import { supabase } from './supabase.js'
import { esc } from './utils.js'
import { getLoja, getCategorias, getGruposAdicionais } from './cardapio.js'
import { criarPedido, validarCupom, buscarClientePorTelefone, buscarPedidosCliente } from './pedidos.js'
import { carregarCartSalvo, salvarCart, limparCartSalvo, atualizarCartBar, renderCarrinho, alterarQty, alterarQtyKey, abrirCarrinho, fecharCarrinho, renderTotais, renderUpsell, upsellAdd } from './carrinho.js'
import { abrirAdicionais, fecharAdicionais, toggleAdicional, decrementAdicional, calcTotalAdd, atualizarTotalAdd, atualizarBotaoAdd, chAddQty, confirmarAdicionais, abrirConfirmacao, chConfirmQty, adicionarConfirmItem, confirmContinuar, confirmIrCarrinho } from './adicionais.js'
import { mascaraTel, mascaraCep, onTelBlur, formatarCep, mostrarPontos, validarCep, buscarCep, aplicarCupom, verificarTaxaEntrega, atualizarTaxaUI, enviarPedido, abrirPagamento, fecharPagamento, selecionarPgto, inicializarMPForm, copiarPix, processarCartaoMP, confirmarPagamento, finalizarPedido } from './checkout.js'

const params  = new URLSearchParams(window.location.search)
const lojaId  = params.get('loja') || '0509197c-fb63-4319-9eae-e4e71368d3c4'

window.APP = {
  lojaId,
  loja: null, produtos: [], categorias: [], cart: [], itemAtual: null, qty: 1, catAtual: 'todos',
  cupomAtivo: null, descontoAtivo: 0, clienteLocal: null, fidelidadeConfig: null,
  pedidoAtual: null, pgtoSelecionado: null,
  mpInstance: null, mpCardId: null, mpFormReady: false,
  addProdutoAtual: null, addGruposAtual: [], addSelecionados: {}, addQty: 1, addTaxaEntrega: null,
  confirmItem: null, confirmQty: 1,
  CART_KEY: 'cart_' + lojaId
}

const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')
let loja = null, produtos = [], categorias = [], cart = [], itemAtual = null, qty = 1, fidelidadeConfig = null, catAtual = 'todos'
let _destaqueIdx = 0, _destaqueTimer = null, _destaqueItems = []
let _bannerIdx = 0, _bannerTimer = null, _bannerItems = []

window.imgErr = function(img) {
  const ph = document.createElement('div')
  ph.className = img.dataset.ph || 'img-ph'
  if (img.style.cssText) ph.style.cssText = img.style.cssText
  ph.textContent = img.dataset.emoji || '🍽️'
  img.parentNode.replaceChild(ph, img)
}

const exp = obj => Object.entries(obj).forEach(([k, v]) => { window[k] = v })
exp({
  carregarCartSalvo, salvarCart, limparCartSalvo, atualizarCartBar, renderCarrinho,
  alterarQty, alterarQtyKey, abrirCarrinho, fecharCarrinho, renderTotais, renderUpsell, upsellAdd,
  abrirAdicionais, fecharAdicionais, toggleAdicional, decrementAdicional,
  calcTotalAdd, atualizarTotalAdd, atualizarBotaoAdd, chAddQty,
  confirmarAdicionais, abrirConfirmacao, chConfirmQty, adicionarConfirmItem, confirmContinuar, confirmIrCarrinho,
  mascaraTel, mascaraCep, onTelBlur, buscarCep, aplicarCupom,
  verificarTaxaEntrega, atualizarTaxaUI,
  enviarPedido, abrirPagamento, fecharPagamento, selecionarPgto,
  inicializarMPForm, copiarPix, processarCartaoMP, confirmarPagamento, finalizarPedido,
  formatarCep, validarCep, mostrarPontos
})

function verificarHorarioAutomatico() {
  if (!loja || !loja.hora_abre || !loja.hora_fecha) return
  const agora = new Date()
  const [ha, ma] = (loja.hora_abre || '00:00').split(':').map(Number)
  const [hf, mf] = (loja.hora_fecha || '23:59').split(':').map(Number)
  const minAtual = agora.getHours() * 60 + agora.getMinutes()
  const minAbre  = ha * 60 + ma
  const minFecha = hf * 60 + mf
  let deveEstarAberta
  if (minAbre < minFecha) {
    deveEstarAberta = minAtual >= minAbre && minAtual < minFecha
  } else {
    deveEstarAberta = minAtual >= minAbre || minAtual < minFecha
  }
  if (loja.aberta !== deveEstarAberta) {
    loja.aberta = deveEstarAberta
    renderHero()
    const banner = document.getElementById('bannerFechado')
    if (banner) banner.style.display = deveEstarAberta ? 'none' : 'flex'
  }
}

async function init() {
  if (!lojaId) {
    document.getElementById('loading').innerHTML = '<div class="inativa"><div class="inativa-icon">🔗</div><div class="inativa-txt">Link inválido</div><div class="inativa-sub">Solicite o link correto ao estabelecimento.</div></div>'
    return
  }
  try {
    loja       = await getLoja(lojaId)
    categorias = await getCategorias(lojaId)
    const [{ data: p }, { data: fc }, { data: bn }] = await Promise.all([
      supabase.from('produtos').select('*,categorias(nome)').eq('loja_id', lojaId).eq('disponivel', true).order('ordem'),
      supabase.from('fidelidade_config').select('*').eq('loja_id', lojaId).eq('ativo', true).single(),
      supabase.from('banners').select('*').eq('loja_id', lojaId).eq('ativo', true).order('ordem')
    ])
    produtos        = p  || []
    fidelidadeConfig = fc || null
    _bannerItems    = bn || []
    window.APP.loja            = loja
    window.APP.produtos        = produtos
    window.APP.categorias      = categorias
    window.APP.fidelidadeConfig = fidelidadeConfig
    if (!loja || !loja.ativa) {
      document.getElementById('loading').innerHTML = '<div class="inativa"><div class="inativa-icon">🔒</div><div class="inativa-txt">Loja indisponível</div><div class="inativa-sub">Este estabelecimento está temporariamente fora do ar.</div></div>'
      return
    }
    verificarHorarioAutomatico()
    carregarCartSalvo()
    cart = window.APP.cart
    renderHero(); renderBanners(); renderCats(); renderMenu()
    atualizarCartBar()
    setInterval(verificarHorarioAutomatico, 60000)
    document.getElementById('loading').style.display = 'none'
    document.getElementById('app').style.display     = 'block'
    document.title = loja.nome + ' — Cardápio'
  } catch(e) {
    window.showToast('⚠️ Verifique sua conexão')
    document.getElementById('loading').innerHTML = '<div class="inativa"><div class="inativa-icon">⚠️</div><div class="inativa-txt">Erro ao carregar</div><div class="inativa-sub">Tente recarregar a página.</div></div>'
  }
}

function aplicarIdentidade() {
  const cor = loja.cor_primaria || '#E85000'
  const n = parseInt(cor.replace('#',''), 16)
  const r = Math.min(255, (n >> 16) + 40), g = Math.min(255, ((n >> 8) & 0xFF) + 25), b = Math.min(255, (n & 0xFF) + 15)
  const light = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')
  // Cardápio consome --pr/--pr2/--pr-grad (tokens.css); --or é o alias legado
  document.documentElement.style.setProperty('--pr', cor)
  document.documentElement.style.setProperty('--pr2', light)
  document.documentElement.style.setProperty('--or', cor)
  document.documentElement.style.setProperty('--pr-grad', `linear-gradient(135deg,${cor},${light})`)

  const logoImg = document.getElementById('headerLogoImg')
  if (logoImg) { logoImg.src = loja.logo_url || ''; logoImg.style.display = loja.logo_url ? 'block' : 'none' }

  const hdr = document.getElementById('mainHeader')
  if (hdr) {
    if (loja.foto_capa_url) {
      hdr.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.52),rgba(0,0,0,0.42)),url(${loja.foto_capa_url})`
      hdr.style.backgroundSize = 'cover'
      hdr.style.backgroundPosition = 'center'
      hdr.classList.add('tem-capa')
    } else {
      hdr.style.backgroundImage = ''
      hdr.classList.remove('tem-capa')
    }
  }
}

function renderHero() {
  document.getElementById('storeName').textContent = loja.nome
  document.title = loja.nome + ' — Cardápio'
  aplicarIdentidade()
  const aberta = loja.aberta !== false

  const storeDesc = document.getElementById('storeDesc')
  if (storeDesc) {
    storeDesc.textContent = loja.descricao || ''
    storeDesc.style.display = loja.descricao ? 'block' : 'none'
  }

  const headerInfo = document.getElementById('headerInfo')
  if (headerInfo) {
    const itens = []
    itens.push(`<span class="hinfo-status ${aberta ? 'aberto' : 'fechado'}">${aberta ? 'Aberto' : 'Fechado'}</span>`)
    if (loja.tempo_entrega) itens.push(`<span class="hinfo-item"><span class="mi" style="font-size:13px;vertical-align:-2px;">schedule</span> ${esc(loja.tempo_entrega)}</span>`)
    if (loja.cidade)        itens.push(`<span class="hinfo-item"><span class="mi" style="font-size:13px;vertical-align:-2px;">place</span> ${esc(loja.cidade)}</span>`)
    headerInfo.innerHTML = itens.join('')
    headerInfo.style.display = 'flex'
  }

  const bannerFechado = document.getElementById('bannerFechado')
  if (bannerFechado) bannerFechado.style.display = aberta ? 'none' : 'flex'
}

function bannerHtml(b) {
  return `<div class="banner-promo-card"><img src="${esc(b.foto_url)}" class="banner-promo-img" alt="Banner" loading="lazy" onerror="this.style.display='none'"></div>`
}

function renderBanners() {
  const bw = document.getElementById('bannerPromoWrap')
  if (!bw) return
  clearInterval(_bannerTimer)
  if (!_bannerItems.length) { bw.style.display = 'none'; bw.classList.remove('ativo'); return }
  bw.style.display = 'block'; bw.classList.add('ativo')
  if (_bannerItems.length === 1) { bw.innerHTML = bannerHtml(_bannerItems[0]); return }
  _bannerIdx = 0
  const dotsHtml = _bannerItems.map((_, i) => `<span class="banner-dot${i === 0 ? ' ativo' : ''}" onclick="goBanner(${i})"></span>`).join('')
  bw.innerHTML = `<div class="banner-promo-slider-wrap"><div id="bannerPromoCard">${bannerHtml(_bannerItems[0])}</div><div class="banner-dots">${dotsHtml}</div></div>`
  _bannerTimer = setInterval(() => { _bannerIdx = (_bannerIdx + 1) % _bannerItems.length; goBanner(_bannerIdx) }, 4000)
}

window.goBanner = function(idx) {
  _bannerIdx = idx
  const card = document.getElementById('bannerPromoCard')
  const dots = document.querySelectorAll('.banner-dot')
  if (!card || !_bannerItems.length) return
  card.style.opacity = '0'
  setTimeout(() => {
    card.innerHTML = bannerHtml(_bannerItems[_bannerIdx])
    dots.forEach((d, i) => d.classList.toggle('ativo', i === _bannerIdx))
    card.style.opacity = '1'
  }, 200)
  clearInterval(_bannerTimer)
  _bannerTimer = setInterval(() => { _bannerIdx = (_bannerIdx + 1) % _bannerItems.length; goBanner(_bannerIdx) }, 4000)
}

const _selosMap = { vegano: { i: '🌱', l: 'Vegano', c: 'vegano' }, sem_gluten: { i: '🌾', l: 'Sem glúten', c: 'sem-gluten' }, novo: { i: '✨', l: 'Novo', c: 'novo' }, picante: { i: '🌶️', l: 'Picante', c: 'picante' } }
function selosHtml(selos) {
  if (!selos?.length) return ''
  return `<div class="pcard-selos">${selos.map(s => _selosMap[s] ? `<span class="selo selo-${_selosMap[s].c}">${_selosMap[s].i} ${_selosMap[s].l}</span>` : '').join('')}</div>`
}

function prodEmoji(p) {
  const n = ((p.nome || '') + ' ' + (p.categorias?.nome || '')).toLowerCase()
  if (/pizza/.test(n))                                     return '🍕'
  if (/hambur|burger|x-burg/.test(n))                     return '🍔'
  if (/lanche|sanduíche|sanduiche/.test(n))               return '🥪'
  if (/frango|chicken/.test(n))                           return '🍗'
  if (/carne|churr|bife|costela|picanha/.test(n))         return '🥩'
  if (/porção|porcao|frit|batata/.test(n))                return '🍟'
  if (/bebid|suco|drink|refri|coca|guaraná|água/.test(n)) return '🥤'
  if (/sobrem|doce|bolo|torta|pudim/.test(n))             return '🍰'
  if (/açaí|acai|sorvete/.test(n))                        return '🍦'
  if (/salad|vegano|vegana/.test(n))                      return '🥗'
  if (/massa|macar|lasanha/.test(n))                      return '🍝'
  if (/combo|promo/.test(n))                              return '🔥'
  if (/sushi|temaki|japon/.test(n))                       return '🍣'
  return '🍽️'
}

function cardHtml(p) {
  const pos = `${p.img_offset_x ?? 50}% ${p.img_offset_y ?? 50}%`
  const fit = p.img_fit || 'cover'
  return `<div class="pcard" onclick="abrirItem('${p.id}')">
    <div class="pcard-img">
      ${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}" loading="lazy" data-ph="pcard-img-ph" onerror="imgErr(this)" style="object-fit:${fit};object-position:${pos}">` : `<div class="pcard-img-ph">${prodEmoji(p)}</div>`}
    </div>
    <div class="pcard-info">
      <div class="pcard-nome">${esc(p.nome)}</div>
      ${selosHtml(p.selos)}
      <div class="pcard-desc">${esc(p.descricao) || ''}</div>
      <div class="pcard-preco">${fmt(p.preco)}</div>
    </div>
    <button class="pcard-add" onclick="event.stopPropagation();quickAdd('${p.id}')">+</button>
  </div>`
}

function featuredHtml(p) {
  return `<div class="featured-card" onclick="abrirItem('${p.id}')">
    <div class="featured-img-wrap">
      ${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}" data-ph="featured-img-ph" onerror="imgErr(this)">` : `<div class="featured-ph">${prodEmoji(p)}</div>`}
      <div class="featured-tag">Mais pedidos 🔥</div>
      <div class="featured-overlay"></div>
      <div class="featured-info">
        <span class="featured-nome">${esc(p.nome)}</span>
        <span class="featured-preco-badge">${fmt(p.preco)}</span>
      </div>
    </div>
    <div class="featured-foot">
      <span class="featured-desc-txt">${esc(p.descricao) || ''}</span>
      <button class="featured-add" onclick="event.stopPropagation();quickAdd('${p.id}')">+</button>
    </div>
  </div>`
}

function renderCats() {
  let h = `<button class="cat-btn active" onclick="filtrar('todos',this)">Todos</button>`
  categorias.forEach(c => { h += `<button class="cat-btn" onclick="filtrar('${c.id}',this)">${esc(c.nome)}</button>` })
  document.getElementById('catsBar').innerHTML = h
}

function renderMenu() {
  const cats     = catAtual === 'todos' ? categorias : categorias.filter(c => c.id === catAtual)
  const fw       = document.getElementById('featuredWrap')
  const destaques = produtos.filter(p => !!p.destaque && p.disponivel !== false)
  clearInterval(_destaqueTimer)
  let excludeId = null
  if (fw) {
    if (destaques.length === 1) {
      fw.style.display = 'block'
      fw.innerHTML     = featuredHtml(destaques[0])
      excludeId        = destaques[0].id
    } else if (destaques.length > 1) {
      _destaqueItems = destaques; _destaqueIdx = 0
      const dotsHtml = destaques.map((_, i) => `<span class="destaque-dot${i === 0 ? ' ativo' : ''}" onclick="goDestaque(${i})"></span>`).join('')
      fw.style.display = 'block'
      fw.innerHTML     = `<div class="destaque-slider-wrap"><div id="destaqueCard">${featuredHtml(destaques[0])}</div><div class="destaque-dots">${dotsHtml}</div></div>`
      _destaqueTimer   = setInterval(() => { _destaqueIdx = (_destaqueIdx + 1) % _destaqueItems.length; goDestaque(_destaqueIdx) }, 3000)
    } else {
      fw.style.display = 'none'
    }
  }
  let h = ''
  cats.forEach(cat => {
    const itens = produtos.filter(p => p.categoria_id === cat.id && p.id !== excludeId)
    if (!itens.length) return
    h += `<div class="sec-hd">${esc(cat.nome)}</div>`
    itens.forEach(p => { h += cardHtml(p) })
  })
  if (!h) h = '<div style="text-align:center;padding:3rem;color:var(--txt3);font-size:0.85rem;">Nenhum item disponível</div>'
  document.getElementById('menuBody').innerHTML = h
}

window.goDestaque = function(idx) {
  _destaqueIdx = idx
  const card = document.getElementById('destaqueCard')
  const dots = document.querySelectorAll('.destaque-dot')
  if (!card || !_destaqueItems.length) return
  card.style.opacity = '0'
  setTimeout(() => {
    card.innerHTML = featuredHtml(_destaqueItems[_destaqueIdx])
    dots.forEach((d, i) => d.classList.toggle('ativo', i === _destaqueIdx))
    card.style.opacity = '1'
  }, 200)
  clearInterval(_destaqueTimer)
  _destaqueTimer = setInterval(() => { _destaqueIdx = (_destaqueIdx + 1) % _destaqueItems.length; goDestaque(_destaqueIdx) }, 3000)
}

window.filtrar = function(catId, el) {
  catAtual = catId
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'))
  el.classList.add('active')
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  renderMenu()
}

window.abrirItem = async function(id) {
  itemAtual = produtos.find(p => p.id === id); qty = 1
  window.APP.itemAtual = itemAtual; window.APP.qty = qty
  const grupos = await getGruposAdicionais(id)
  if (grupos.length) { fecharItem(); abrirAdicionais(itemAtual, grupos); return }
  document.getElementById('imName').textContent  = itemAtual.nome
  document.getElementById('imDesc').textContent  = itemAtual.descricao || ''
  document.getElementById('imPrice').textContent = fmt(itemAtual.preco)
  document.getElementById('qtyNum').textContent  = 1
  document.getElementById('imAddBtn').textContent = 'Adicionar ao pedido'
  document.getElementById('imImgWrap').innerHTML  = itemAtual.foto_url
    ? `<img class="im-img" src="${esc(itemAtual.foto_url)}" alt="${esc(itemAtual.nome)}" data-ph="im-img-placeholder" onerror="imgErr(this)">`
    : `<div class="im-img-placeholder">🍽️</div>`
  document.getElementById('itemOverlay').classList.add('open')
}

window.chQty = function(d) {
  qty = Math.max(1, qty + d); window.APP.qty = qty
  document.getElementById('qtyNum').textContent = qty
  document.getElementById('imAddBtn').textContent = qty > 1 ? `Adicionar ${qty}x — ${fmt(itemAtual.preco * qty)}` : 'Adicionar ao pedido'
}

window.quickAdd = async function(id) {
  const p = produtos.find(x => x.id === id)
  const grupos = await getGruposAdicionais(id)
  if (grupos.length) { abrirAdicionais(p, grupos); return }
  const ex = window.APP.cart.find(c => c.id === id)
  if (ex) ex.qty++; else window.APP.cart.push({ ...p, qty: 1 })
  salvarCart(); atualizarCartBar(); showToast(p.nome)
}

window.addCarrinho = function() {
  if (!itemAtual) return
  window.APP.confirmItem = { ...itemAtual, qty }
  window.APP.confirmQty  = qty
  fecharItem()
  abrirConfirmacao()
}

window.showToast = function(msg) {
  const t = document.getElementById('toastAdd')
  if (!t) return
  t.innerHTML = `<span class="mi" style="font-size:16px;color:var(--grn);">check_circle</span> ${esc(msg)}`
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200)
}

// ─── MEUS PEDIDOS ───────────────────────────────────────────
const MP_STATUS = {
  novo:     { lbl: 'Recebido',        cor: 'var(--gold)' },
  prep:     { lbl: 'Em preparo',      cor: 'var(--pr)' },
  saiu:     { lbl: 'Saiu p/ entrega', cor: 'var(--blue)' },
  entregue: { lbl: 'Entregue',        cor: 'var(--grn)' }
}

window.abrirPedidos = function() {
  bnavSetActive('bnavPedidos')
  document.getElementById('pedidosScreen').classList.add('open')
  const telSalvo = localStorage.getItem('tel_' + lojaId) || ''
  const inp = document.getElementById('mpTel')
  if (inp && telSalvo && !inp.value) inp.value = telSalvo
  if (telSalvo.replace(/\D/g, '').length >= 10) window.buscarMeusPedidos()
}

window.buscarMeusPedidos = async function() {
  const inp   = document.getElementById('mpTel')
  const lista = document.getElementById('mpLista')
  if (!inp || !lista) return
  const tel = inp.value.replace(/\D/g, '')
  if (tel.length < 10) { window.showToast('⚠️ Digite seu celular com DDD'); return }

  lista.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--txt3);font-size:0.85rem;">Buscando seus pedidos...</div>'
  const pedidos = await buscarPedidosCliente(lojaId, tel)
  localStorage.setItem('tel_' + lojaId, tel)

  if (!pedidos.length) {
    lista.innerHTML = `<div style="text-align:center;padding:2.5rem 1rem;">
      <div style="font-size:3rem;margin-bottom:0.75rem;">🧾</div>
      <div style="font-size:0.95rem;font-weight:700;color:var(--txt2);margin-bottom:0.35rem;">Nenhum pedido encontrado</div>
      <div style="font-size:0.8rem;color:var(--txt3);line-height:1.6;">Confira se o celular está correto — é o mesmo usado na hora do pedido.</div>
    </div>`
    return
  }

  lista.innerHTML = pedidos.map(p => {
    const st  = MP_STATUS[p.status] || { lbl: p.status, cor: 'var(--txt3)' }
    const data = new Date(p.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    return `<div style="background:var(--surf);border-radius:12px;padding:0.85rem 1rem;margin-bottom:0.6rem;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:space-between;gap:0.75rem;">
      <div style="min-width:0;">
        <div style="font-size:0.85rem;font-weight:800;color:var(--txt);">#${esc(p.numero || '—')}</div>
        <div style="font-size:0.72rem;color:var(--txt3);margin-top:0.15rem;">${data}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:0.85rem;font-weight:800;color:var(--pr);">${fmt(p.total)}</div>
        <div style="font-size:0.7rem;font-weight:700;color:${st.cor};margin-top:0.15rem;">${st.lbl}</div>
      </div>
    </div>`
  }).join('')
}

window.fecharItem     = () => document.getElementById('itemOverlay').classList.remove('open')
window.fecharCarrinho = () => document.getElementById('cartScreen').classList.remove('open')
window.fecharPedidos  = function() { document.getElementById('pedidosScreen').classList.remove('open'); bnavSetActive('bnavCardapio') }

function bnavSetActive(id) {
  document.querySelectorAll('.bnav-tab').forEach(t => t.classList.remove('bnav-active'))
  const el = document.getElementById(id); if (el) el.classList.add('bnav-active')
}

window.bnavIr = function(tab) {
  if (tab === 'cardapio')    { bnavSetActive('bnavCardapio'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  else if (tab === 'categorias') { bnavSetActive('bnavCategorias'); document.querySelector('.cats-wrap')?.scrollIntoView({ behavior: 'smooth' }) }
  else if (tab === 'pedidos')    { window.abrirPedidos() }
  else if (tab === 'perfil')     { bnavSetActive('bnavPerfil'); window.showToast('Perfil em breve') }
}

init()
