import { supabase } from './supabase.js'
import { getLoja, getCategorias, getGruposAdicionais } from './cardapio.js'
import { criarPedido, validarCupom, buscarClientePorTelefone } from './pedidos.js'
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

function renderHero() {
  document.getElementById('storeName').textContent = loja.nome
  document.title = loja.nome + ' — Cardápio'
  const bannerFechado = document.getElementById('bannerFechado')
  if (bannerFechado) bannerFechado.style.display = loja.aberta ? 'none' : 'flex'
}

function bannerHtml(b) {
  return `<div class="banner-promo-card"><img src="${b.foto_url}" class="banner-promo-img" alt="Banner" loading="lazy" onerror="this.style.display='none'"></div>`
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

function cardHtml(p) {
  const pos = `${p.img_offset_x ?? 50}% ${p.img_offset_y ?? 50}%`
  const fit = p.img_fit || 'cover'
  return `<div class="pcard" onclick="abrirItem('${p.id}')">
    <div class="pcard-img">
      ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nome}" loading="lazy" data-ph="pcard-img-ph" onerror="imgErr(this)" style="object-fit:${fit};object-position:${pos}">` : `<div class="pcard-img-ph">🍽️</div>`}
    </div>
    <div class="pcard-info">
      <div class="pcard-nome">${p.nome}</div>
      ${selosHtml(p.selos)}
      <div class="pcard-desc">${p.descricao || ''}</div>
      <div class="pcard-preco">${fmt(p.preco)}</div>
    </div>
    <button class="pcard-add" onclick="event.stopPropagation();quickAdd('${p.id}')">+</button>
  </div>`
}

function featuredHtml(p) {
  return `<div class="featured-card" onclick="abrirItem('${p.id}')">
    <div class="featured-img-wrap">
      ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nome}" data-ph="featured-img-ph" onerror="imgErr(this)">` : `<div class="featured-ph">🍽️</div>`}
      <div class="featured-tag">Mais pedidos 🔥</div>
      <div class="featured-overlay"></div>
      <div class="featured-info">
        <span class="featured-nome">${p.nome}</span>
        <span class="featured-preco-badge">${fmt(p.preco)}</span>
      </div>
    </div>
    <div class="featured-foot">
      <span class="featured-desc-txt">${p.descricao || ''}</span>
      <button class="featured-add" onclick="event.stopPropagation();quickAdd('${p.id}')">+</button>
    </div>
  </div>`
}

function renderCats() {
  let h = `<button class="cat-btn active" onclick="filtrar('todos',this)">Todos</button>`
  categorias.forEach(c => { h += `<button class="cat-btn" onclick="filtrar('${c.id}',this)">${c.nome}</button>` })
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
    h += `<div class="sec-hd">${cat.nome}</div>`
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

window.buscarProdutos = function(termo) {
  const clear = document.getElementById('searchClear')
  if (clear) clear.style.display = termo ? 'block' : 'none'
  if (!termo.trim()) { renderMenu(); return }
  const t = termo.toLowerCase().trim()
  const encontrados = produtos.filter(p => p.nome.toLowerCase().includes(t) || (p.descricao && p.descricao.toLowerCase().includes(t)))
  let h = ''
  if (!encontrados.length) {
    h = `<div style="text-align:center;padding:3rem 1rem;">
      <div style="font-size:2.5rem;margin-bottom:0.75rem;">🔍</div>
      <div style="font-size:0.88rem;font-weight:700;color:var(--txt2);">Nenhum produto encontrado</div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:0.35rem;">Tente outro termo</div>
    </div>`
  } else {
    h += `<div class="sec-hd">${encontrados.length} resultado${encontrados.length !== 1 ? 's' : ''} para "${termo}"</div>`
    encontrados.forEach(p => { h += cardHtml(p) })
  }
  const fw = document.getElementById('featuredWrap')
  if (fw) fw.style.display = 'none'
  document.getElementById('menuBody').innerHTML = h
}

window.limparBusca = function() {
  const inp = document.getElementById('searchInput')
  if (inp) inp.value = ''
  const clear = document.getElementById('searchClear')
  if (clear) clear.style.display = 'none'
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
    ? `<img class="im-img" src="${itemAtual.foto_url}" alt="${itemAtual.nome}" data-ph="im-img-placeholder" onerror="imgErr(this)">`
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
  t.innerHTML = `<span class="mi" style="font-size:16px;color:var(--grn);">check_circle</span> ${msg}`
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200)
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
  else if (tab === 'pedidos')    { bnavSetActive('bnavPedidos'); document.getElementById('pedidosScreen').classList.add('open') }
  else if (tab === 'perfil')     { bnavSetActive('bnavPerfil'); window.showToast('Perfil em breve') }
}

init()
