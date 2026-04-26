// js/painel/painel-cardapio.js — cardápio: estado, render, categorias

import { supabase } from '../supabase.js'
import { fmt, toast } from './utils.js'
import { renderDestaqueAdmin, renderUpsellAdmin, renderBannerAdmin, carregarBanners } from './painel-extras.js'
import { abrirModalProd, fecharModalProd, deletarProdPorId } from './painel-modal-produto.js'

export * from './painel-modal-produto.js'
export * from './painel-extras.js'

let _loja = null, _produtos = [], _categorias = []
let _editCatId = null

export function getLoja()       { return _loja }
export function getProdutos()   { return _produtos }
export function getCategorias() { return _categorias }

export async function setDados(loja, produtos, categorias) {
  _loja = loja; _produtos = produtos; _categorias = categorias
  await carregarBanners()
}

// ════════════════════════════════════════════
// RENDER PRINCIPAL DO CARDÁPIO
// ════════════════════════════════════════════
export function renderCardapio() {
  let h = `
  <div class="sec-hd">
    <span class="sec-title">Cardápio</span>
    <button class="btn-or" onclick="abrirModalCat(null)">+ Nova categoria</button>
  </div>`

  if (!_categorias.length) {
    h += `<div class="empty">
      <div class="empty-icon">📂</div>
      <div class="empty-txt">Nenhuma categoria ainda.<br>Crie a primeira acima!</div>
    </div>`
    document.getElementById('mainBody').innerHTML = h
    return
  }

  _categorias.forEach((cat, idx) => {
    const itens   = _produtos.filter(p => p.categoria_id === cat.id)
    const primeiro = idx === 0, ultimo = idx === _categorias.length - 1

    h += `
    <div class="cat-bloco" id="catbloco_${cat.id}">
      <div class="cat-header" onclick="toggleCat('${cat.id}')">
        <span class="cat-header-icon">${cat.tipo === 'combo' ? '🔥' : '📁'}</span>
        <div class="cat-header-info">
          <div class="cat-header-nome">
            ${cat.nome}
            ${cat.tipo === 'combo' ? '<span class="cat-tag-combo">COMBO</span>' : ''}
          </div>
          <div class="cat-header-count">${itens.length} produto${itens.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="cat-header-actions" onclick="event.stopPropagation()">
          <div class="cat-ordem-btns" id="ordem_${cat.id}">
            <button class="cat-ordem-btn" onclick="moverCat('${cat.id}',-1)" ${primeiro ? 'disabled style="opacity:0.3"' : ''}>↑</button>
            <button class="cat-ordem-btn" onclick="moverCat('${cat.id}',1)" ${ultimo ? 'disabled style="opacity:0.3"' : ''}>↓</button>
          </div>
          <button class="toggle ${cat.ativa ? 'on' : ''}" onclick="toggleCatAtiva('${cat.id}')"></button>
          <button class="ce-edit" onclick="abrirModalCat('${cat.id}')">Editar</button>
        </div>
        <span class="cat-chevron open" id="chev_${cat.id}">▾</span>
      </div>
      <div class="cat-body open" id="catbody_${cat.id}">
        ${itens.length === 0
          ? `<div style="padding:0.65rem 0.85rem;font-size:0.75rem;color:var(--txt3);">Nenhum produto ainda</div>`
          : itens.map(p => prodCard(p)).join('')}
        <div class="cat-body-footer">
          <button class="btn-add-prod" onclick="abrirModalProd(null,'${cat.id}')">+ Novo produto</button>
        </div>
      </div>
    </div>`
  })

  h += renderDestaqueAdmin()
  h += renderUpsellAdmin()
  h += renderBannerAdmin()
  document.getElementById('mainBody').innerHTML = h
  initSeguraParaOrdenar()
}

function prodEmoji(p) {
  const n = ((p.nome || '') + ' ' + (p.categorias?.nome || '')).toLowerCase()
  if (/pizza/.test(n))                                      return '🍕'
  if (/hambur|burger|x-burg/.test(n))                      return '🍔'
  if (/lanche|sanduíche|sanduiche/.test(n))                return '🥪'
  if (/frango|chicken/.test(n))                            return '🍗'
  if (/carne|churr|bife|costela|picanha/.test(n))          return '🥩'
  if (/porção|porcao|frit|batata/.test(n))                 return '🍟'
  if (/bebid|suco|drink|refri|coca|guaraná|água/.test(n))  return '🥤'
  if (/sobrem|doce|bolo|torta|pudim/.test(n))              return '🍰'
  if (/açaí|acai|sorvete/.test(n))                         return '🍦'
  if (/salad|vegano|vegana/.test(n))                       return '🥗'
  if (/massa|macar|lasanha/.test(n))                       return '🍝'
  if (/combo|promo/.test(n))                               return '🔥'
  if (/sushi|temaki|japon/.test(n))                        return '🍣'
  return '🍽️'
}

function prodCard(p) {
  const numGrupos = p._numGrupos || 0
  return `
  <div class="cat-prod-item" id="proditem_${p.id}">
    <div class="cat-prod-thumb">
      ${p.foto_url
        ? `<img src="${p.foto_url}" alt="${p.nome}" style="width:44px;height:44px;object-fit:cover;border-radius:9px;">`
        : `<span style="font-size:1.5rem;">${prodEmoji(p)}</span>`}
    </div>
    <div class="cat-prod-info">
      <div class="cat-prod-nome">${p.nome}</div>
      <div class="cat-prod-preco">${fmt(p.preco)}</div>
      ${numGrupos > 0
        ? `<div class="cat-prod-add-badge">+${numGrupos} grupo${numGrupos > 1 ? 's' : ''} de adicionais</div>`
        : `<div class="cat-prod-add-badge" style="background:#F9FAFB;color:var(--txt3);">sem adicionais</div>`}
    </div>
    <div class="cat-prod-actions">
      <button class="prod-btn add" title="Configurar adicionais" onclick="abrirModalAdd('${p.id}','${p.nome}')">+</button>
      <button class="prod-btn edit" onclick="abrirModalProd('${p.id}',null)">✏️</button>
      <button class="prod-btn del" onclick="confirmarDelProd('${p.id}')">🗑</button>
    </div>
  </div>`
}

// ════════════════════════════════════════════
// TOGGLE CATEGORIA (abrir/fechar)
// ════════════════════════════════════════════
export function toggleCat(id) {
  const body = document.getElementById('catbody_' + id)
  const chev = document.getElementById('chev_' + id)
  if (!body) return
  body.classList.toggle('open')
  chev.classList.toggle('open')
}

export async function toggleCatAtiva(id) {
  const cat = _categorias.find(x => x.id === id)
  cat.ativa = !cat.ativa
  await supabase.from('categorias').update({ ativa: cat.ativa }).eq('id', id)
  renderCardapio()
  toast(cat.ativa ? '✅ Categoria ativada' : '⚫ Categoria desativada')
}

export async function toggleProd(id) {
  const p = _produtos.find(x => x.id === id)
  p.disponivel = !p.disponivel
  await supabase.from('produtos').update({ disponivel: p.disponivel }).eq('id', id)
  renderCardapio()
  toast(p.disponivel ? '✅ Produto ativado' : '⚫ Produto desativado')
}

// ════════════════════════════════════════════
// REORDENAÇÃO DE CATEGORIAS
// ════════════════════════════════════════════
let _catSel = null, _holdTimer = null

function initSeguraParaOrdenar() {
  _catSel = null
  document.querySelectorAll('.cat-bloco').forEach(bloco => {
    const header = bloco.querySelector('.cat-header')
    if (!header) return
    let downTime = 0
    header.addEventListener('mousedown', () => { downTime = Date.now() })
    header.addEventListener('mouseup', () => {
      if (Date.now() - downTime > 400) selecionarCat(bloco.id.replace('catbloco_', ''))
    })
    header.addEventListener('touchstart', () => {
      const id = bloco.id.replace('catbloco_', '')
      _holdTimer = setTimeout(() => {
        selecionarCat(id)
        if (navigator.vibrate) navigator.vibrate(40)
      }, 400)
    }, { passive: true })
    header.addEventListener('touchend', () => clearTimeout(_holdTimer))
    header.addEventListener('touchmove', () => clearTimeout(_holdTimer), { passive: true })
  })
}

function selecionarCat(id) {
  if (_catSel) document.getElementById('catbloco_' + _catSel)?.classList.remove('selecionada')
  if (_catSel === id) { _catSel = null; return }
  _catSel = id
  const bloco = document.getElementById('catbloco_' + id)
  bloco?.classList.add('selecionada')
  bloco?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

export async function moverCat(id, dir) {
  const idx = _categorias.findIndex(x => x.id === id)
  const novoIdx = idx + dir
  if (novoIdx < 0 || novoIdx >= _categorias.length) return
  const [item] = _categorias.splice(idx, 1)
  _categorias.splice(novoIdx, 0, item)
  await Promise.all(_categorias.map((c, i) =>
    supabase.from('categorias').update({ ordem: i + 1 }).eq('id', c.id)
  ))
  _catSel = id; renderCardapio()
  setTimeout(() => {
    const b = document.getElementById('catbloco_' + id)
    b?.classList.add('selecionada')
    b?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, 60)
  toast(dir === -1 ? '↑ Movida para cima' : '↓ Movida para baixo')
}

// ════════════════════════════════════════════
// MODAL CATEGORIA
// ════════════════════════════════════════════
export function abrirModalCat(id) {
  _editCatId = id || null
  const cat = id ? _categorias.find(x => x.id === id) : null

  document.getElementById('catModalTitulo').textContent = cat ? 'Editar categoria' : 'Nova categoria'
  document.getElementById('catNome').value = cat?.nome || ''
  document.getElementById('catDelBtn').style.display = cat ? 'block' : 'none'

  document.querySelectorAll('#catTipoWrap .tipo-opt').forEach(opt => {
    opt.classList.toggle('on', opt.dataset.val === (cat?.tipo || 'normal'))
  })

  document.getElementById('modalCat').classList.add('open')
  setTimeout(() => document.getElementById('catNome').focus(), 100)
}

export function fecharModalCat() {
  document.getElementById('modalCat').classList.remove('open')
}

export function selecionarTipoCat(el) {
  document.querySelectorAll('#catTipoWrap .tipo-opt').forEach(x => x.classList.remove('on'))
  el.classList.add('on')
}

export async function salvarCategoria() {
  const nome = document.getElementById('catNome').value.trim()
  if (!nome) { toast('⚠️ Digite o nome da categoria'); return }
  const tipo = document.querySelector('#catTipoWrap .tipo-opt.on')?.dataset.val || 'normal'

  if (_editCatId) {
    await supabase.from('categorias').update({ nome, tipo }).eq('id', _editCatId)
    const c = _categorias.find(x => x.id === _editCatId)
    if (c) { c.nome = nome; c.tipo = tipo }
    toast('✅ Categoria atualizada!')
  } else {
    if (_categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())) {
      toast('⚠️ Categoria já existe'); return
    }
    const { data } = await supabase.from('categorias')
      .insert({ loja_id: _loja.id, nome, tipo, ordem: _categorias.length + 1, ativa: true })
      .select().single()
    if (data) _categorias.push(data)
    toast('✅ Categoria criada!')
  }
  fecharModalCat()
  renderCardapio()
}

export async function deletarCategoria() {
  if (!_editCatId) return
  const prods = _produtos.filter(p => p.categoria_id === _editCatId)
  const msg = prods.length
    ? `Esta categoria tem ${prods.length} produto(s). Todos serão excluídos. Confirmar?`
    : 'Excluir esta categoria?'
  if (!confirm(msg)) return
  let falhou = false
  for (const p of prods) { const ok = await deletarProdPorId(p.id); if (!ok) falhou = true }
  if (falhou) { fecharModalCat(); renderCardapio(); return }
  await supabase.from('categorias').delete().eq('id', _editCatId)
  _categorias.splice(_categorias.findIndex(c => c.id === _editCatId), 1)
  fecharModalCat()
  renderCardapio()
  toast('🗑️ Categoria excluída')
}

// ════════════════════════════════════════════
// ALIASES E STUBS DE COMPATIBILIDADE
// ════════════════════════════════════════════
export function abrirNovoEp(catId)      { abrirModalProd(null, catId) }
export function openEp(id)              { abrirModalProd(id, null) }
export function closeEp()               { fecharModalProd() }
export function abrirNovoEpNaCat(catId) { abrirModalProd(null, catId) }
export function openEc(id)              { abrirModalCat(id) }
export function closeEc()               { fecharModalCat() }
export function toggleNovaCatForm()     {}
export function delProdDaCat()          {}
export function addNovoGrupo()          {}
export function addItemGrupo()          {}
export function removerGrupo()          {}
export function removerItemGrupo()      {}
