// js/painel/painel-cardapio.js

import { supabase } from '../supabase.js'
import { fmt, toast, comprimirImagem, atualizarPosImagem, iniciarDragImagem, imgOffsetX, imgOffsetY, setImgOffset } from './utils.js'

let _loja = null, _produtos = [], _categorias = []
export function setDados(loja, produtos, categorias) {
  _loja = loja; _produtos = produtos; _categorias = categorias
}

let editingProdId = null, uploadedImgUrl = null
let catAberta = {}, catSelecionada = null, holdTimer = null

// ===== RENDER CARDÁPIO =====
export function renderCardapio() {
  let h = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
    <span style="font-size:0.88rem;font-weight:800;color:var(--txt);">📂 Categorias</span>
    <button class="btn-add-cat" onclick="toggleNovaCatForm()">+ Nova categoria</button>
  </div>
  <div class="new-cat-form" id="newCatForm">
    <div style="font-size:0.8rem;font-weight:700;color:var(--txt);margin-bottom:0.6rem;">Nova categoria</div>
    <div class="new-cat-row">
      <input class="new-cat-inp" id="novaCatInput" placeholder="Nome da categoria...">
      <select class="ep-sel" id="novaCatTipo" style="width:auto;min-width:90px;margin-bottom:0;padding:0.48rem 0.5rem;font-size:0.75rem;">
        <option value="normal">Normal</option>
        <option value="combo">🔥 Combo</option>
      </select>
    </div>
    <div style="display:flex;gap:0.4rem;">
      <button class="add-cat-btn" onclick="adicionarCat()" style="flex:1;">✓ Adicionar</button>
      <button onclick="toggleNovaCatForm()" style="background:var(--bg3);color:var(--txt2);border:none;border-radius:9px;padding:0.45rem 0.8rem;font-size:0.8rem;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;">✕</button>
    </div>
  </div>`

  if (!_categorias.length) {
    h += `<div class="empty"><div class="empty-icon">🍽️</div><div class="empty-txt">Nenhuma categoria ainda.<br>Crie sua primeira acima!</div></div>`
  }

  _categorias.forEach((cat, idx) => {
    const itens    = _produtos.filter(p => p.categoria_id === cat.id)
    const aberta   = catAberta[cat.id] !== false
    const isCombo  = cat.tipo === 'combo'
    const primeiro = idx === 0
    const ultimo   = idx === _categorias.length - 1

    h += `<div class="cat-bloco" id="catbloco_${cat.id}">
      <div class="cat-header" onclick="toggleCat('${cat.id}')">
        <span class="cat-header-icon">${isCombo ? '🔥' : '📁'}</span>
        <div class="cat-header-info">
          <div class="cat-header-nome">${cat.nome}${isCombo ? `<span class="cat-tag-combo">COMBO</span>` : ''}</div>
          <div class="cat-header-count">${itens.length} produto${itens.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="cat-header-actions" onclick="event.stopPropagation()">
          <div class="cat-ordem-btns" id="ordem_${cat.id}">
            <button class="cat-ordem-btn" onclick="moverCat('${cat.id}',-1)" ${primeiro ? 'disabled style="opacity:0.35"' : ''}>↑</button>
            <button class="cat-ordem-btn" onclick="moverCat('${cat.id}',1)"  ${ultimo  ? 'disabled style="opacity:0.35"' : ''}>↓</button>
          </div>
          <button class="toggle ${cat.ativa ? 'on' : ''}" onclick="toggleCatAtiva('${cat.id}')"></button>
          <button class="ce-edit" onclick="openEc('${cat.id}')">Editar</button>
        </div>
        <span class="cat-chevron ${aberta ? 'open' : ''}">▾</span>
      </div>
      <div class="cat-body ${aberta ? 'open' : ''}">
        ${itens.length === 0 ? `<div style="padding:0.75rem 0.85rem;font-size:0.78rem;color:var(--txt3);">Nenhum produto ainda</div>` : ''}
        ${itens.map(p => `
          <div class="cat-prod-item">
            <div class="cat-prod-thumb">${p.foto_url ? `<img src="${p.foto_url}" alt="" loading="lazy">` : '🍽️'}</div>
            <div class="cat-prod-info">
              <div class="cat-prod-nome">${p.nome}</div>
              <div class="cat-prod-preco">${fmt(p.preco)}</div>
            </div>
            <div class="cat-prod-actions">
              <button class="toggle ${p.disponivel ? 'on' : ''}" onclick="toggleProd('${p.id}')"></button>
              <button class="ce-edit" onclick="openEp('${p.id}')">Editar</button>
              <button class="ce-del" onclick="confirmarDelProd('${p.id}')">🗑️</button>
            </div>
          </div>`).join('')}
        <div class="cat-body-footer">
          <button class="btn-add-prod" onclick="abrirNovoEpNaCat('${cat.id}')">＋ Novo produto</button>
        </div>
      </div>
    </div>`
  })

  document.getElementById('mainBody').innerHTML = h
  setTimeout(initSeguraParaOrdenar, 80)
}

// ===== CATEGORIAS =====
export function toggleCat(id) { catAberta[id] = catAberta[id] === false ? true : false; renderCardapio() }
export function toggleNovaCatForm() {
  const f = document.getElementById('newCatForm')
  if (f) { f.classList.toggle('open'); if (f.classList.contains('open')) document.getElementById('novaCatInput')?.focus() }
}
export async function toggleCatAtiva(id) {
  const cat = _categorias.find(x => x.id === id); cat.ativa = !cat.ativa
  await supabase.from('categorias').update({ ativa: cat.ativa }).eq('id', id)
  renderCardapio(); toast(cat.ativa ? '✅ Categoria ativada' : '⚫ Categoria desativada')
}
export async function adicionarCat() {
  const nome = document.getElementById('novaCatInput')?.value.trim()
  const tipo = document.getElementById('novaCatTipo')?.value || 'normal'
  if (!nome) { toast('⚠️ Digite o nome'); return }
  if (_categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())) { toast('⚠️ Categoria já existe'); return }
  const { data, error } = await supabase.from('categorias').insert({
    loja_id: _loja.id, nome, tipo, ordem: _categorias.length + 1, ativa: true
  }).select().single()
  if (error) { toast('❌ Erro ao adicionar'); return }
  _categorias.push(data); catAberta[data.id] = true
  renderCardapio(); toast(tipo === 'combo' ? '🔥 Combo criado!' : '✅ Categoria adicionada!')
}
export function openEc(id) {
  const cat = _categorias.find(x => x.id === id)
  document.getElementById('ecNome').value = cat.nome
  const prods = _produtos.filter(p => p.categoria_id === id)
  document.getElementById('ecProdutos').innerHTML = prods.length
    ? prods.map(p => `<div class="ec-prod-item"><div><div class="ec-prod-name">${p.nome}</div><div class="ec-prod-price">${fmt(p.preco)}</div></div><button class="ec-prod-del" onclick="delProdDaCat('${p.id}','${p.nome}')">🗑️</button></div>`).join('')
    : `<div style="font-size:0.8rem;color:var(--txt3);text-align:center;padding:0.75rem;">Nenhum produto</div>`
  document.getElementById('ecOverlay').classList.add('open')
  document.getElementById('ecOverlay').dataset.catId = id
}
export async function salvarCategoria() {
  const id = document.getElementById('ecOverlay').dataset.catId
  const nome = document.getElementById('ecNome').value.trim()
  if (!nome) { toast('⚠️ Nome é obrigatório'); return }
  await supabase.from('categorias').update({ nome }).eq('id', id)
  const c = _categorias.find(x => x.id === id); if (c) c.nome = nome
  document.getElementById('ecOverlay').classList.remove('open')
  renderCardapio(); toast('✅ Categoria atualizada!')
}
export async function deletarCategoria() {
  const id = document.getElementById('ecOverlay').dataset.catId
  const prods = _produtos.filter(p => p.categoria_id === id)
  if (prods.length > 0) {
    if (!confirm(`Esta categoria tem ${prods.length} produto(s).\nAo excluir, todos os produtos serão excluídos também.\nDeseja continuar?`)) return
    for (const p of prods) await deletarProdutoById(p.id)
  } else { if (!confirm('Excluir esta categoria?')) return }
  await supabase.from('categorias').delete().eq('id', id)
  _categorias.splice(_categorias.findIndex(c => c.id === id), 1)
  document.getElementById('ecOverlay').classList.remove('open')
  renderCardapio(); toast('🗑️ Categoria excluída!')
}
export async function delProdDaCat(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return
  await deletarProdutoById(id)
  openEc(document.getElementById('ecOverlay').dataset.catId)
}

// ===== REORDENAÇÃO =====
function initSeguraParaOrdenar() {
  catSelecionada = null
  document.querySelectorAll('.cat-bloco').forEach(bloco => {
    const header = bloco.querySelector('.cat-header')
    if (!header) return
    let downTime = 0
    header.addEventListener('mousedown', () => { downTime = Date.now() })
    header.addEventListener('mouseup', () => { if (Date.now() - downTime > 400) selecionarCat(bloco.id.replace('catbloco_', '')) })
    header.addEventListener('touchstart', () => {
      const id = bloco.id.replace('catbloco_', '')
      holdTimer = setTimeout(() => { selecionarCat(id); if (navigator.vibrate) navigator.vibrate(50) }, 400)
    }, { passive: true })
    header.addEventListener('touchend',  () => clearTimeout(holdTimer))
    header.addEventListener('touchmove', () => clearTimeout(holdTimer), { passive: true })
  })
}
function selecionarCat(id) {
  if (catSelecionada) { const ant = document.getElementById('catbloco_' + catSelecionada); if (ant) ant.classList.remove('selecionada') }
  if (catSelecionada === id) { catSelecionada = null; return }
  catSelecionada = id
  const bloco = document.getElementById('catbloco_' + id)
  if (bloco) { bloco.classList.add('selecionada'); bloco.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }
}
export async function moverCat(id, direcao) {
  const idx = _categorias.findIndex(x => x.id === id)
  const novoIdx = idx + direcao
  if (novoIdx < 0 || novoIdx >= _categorias.length) return
  const [item] = _categorias.splice(idx, 1); _categorias.splice(novoIdx, 0, item)
  await Promise.all(_categorias.map((cat, i) => supabase.from('categorias').update({ ordem: i + 1 }).eq('id', cat.id)))
  catSelecionada = id; renderCardapio()
  setTimeout(() => { const bloco = document.getElementById('catbloco_' + id); if (bloco) { bloco.classList.add('selecionada'); bloco.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } }, 60)
  toast(direcao === -1 ? '↑ Movida para cima' : '↓ Movida para baixo')
}

// ===== PRODUTOS =====
export async function toggleProd(id) {
  const p = _produtos.find(x => x.id === id); p.disponivel = !p.disponivel
  await supabase.from('produtos').update({ disponivel: p.disponivel }).eq('id', id)
  renderCardapio(); toast(p.disponivel ? '✅ Produto ativado' : '⚫ Produto desativado')
}
export function confirmarDelProd(id) {
  const p = _produtos.find(x => x.id === id)
  if (confirm(`Excluir "${p.nome}"?\n\nEsta ação não pode ser desfeita.`)) deletarProdutoById(id)
}
async function deletarProdutoById(id) {
  const p = _produtos.find(x => x.id === id)
  if (p?.foto_url) { const path = p.foto_url.split('/produtos/')[1]; if (path) await supabase.storage.from('produtos').remove([path]) }
  // Deletar grupos de adicionais associados
  await supabase.from('grupos_adicionais').delete().eq('produto_id', id)
  await supabase.from('produtos').delete().eq('id', id)
  _produtos.splice(_produtos.findIndex(x => x.id === id), 1)
  renderCardapio(); toast('🗑️ Produto excluído')
}
export function abrirNovoEpNaCat(catId) { abrirNovoEp(catId) }
export function abrirNovoEp(catIdPre = null) {
  if (!_categorias.length) { toast('⚠️ Crie uma categoria antes de adicionar produtos!'); const f = document.getElementById('newCatForm'); if (f) { f.classList.add('open'); document.getElementById('novaCatInput')?.focus() }; return }
  editingProdId = null; uploadedImgUrl = null; setImgOffset(50, 50)
  document.getElementById('epTitulo').textContent = 'Novo produto'
  document.getElementById('epNome').value = ''
  document.getElementById('epDesc').value = ''
  document.getElementById('epPreco').value = ''
  document.getElementById('epCat').innerHTML = _categorias.map(c => `<option value="${c.id}" ${catIdPre && c.id === catIdPre ? 'selected' : ''}>${c.tipo === 'combo' ? '🔥 ' : ''}${c.nome}</option>`).join('')
  resetModalImagem()
  document.getElementById('epDelBtn').style.display = 'none'
  document.getElementById('epOverlay').classList.add('open')
  // Limpa grupos de adicionais
  renderGruposAdicionaisPainel([])
}
export async function openEp(id) {
  editingProdId = id; uploadedImgUrl = null
  const p = _produtos.find(x => x.id === id)
  setImgOffset(p.img_offset_x || 50, p.img_offset_y || 50)
  document.getElementById('epTitulo').textContent = 'Editar produto'
  document.getElementById('epNome').value  = p.nome
  document.getElementById('epDesc').value  = p.descricao || ''
  document.getElementById('epPreco').value = p.preco
  document.getElementById('epCat').innerHTML = _categorias.map(c => `<option value="${c.id}" ${c.id === p.categoria_id ? 'selected' : ''}>${c.tipo === 'combo' ? '🔥 ' : ''}${c.nome}</option>`).join('')
  resetModalImagem()
  if (p.foto_url) {
    document.getElementById('epImgArea').style.display    = 'none'
    document.getElementById('epImgPosWrap').style.display = 'block'
    document.getElementById('epTrocarBtn').style.display  = 'block'
    document.getElementById('epImgPos').src = p.foto_url
    atualizarPosImagem(); iniciarDragImagem()
  }
  document.getElementById('epDelBtn').style.display = 'block'
  document.getElementById('epOverlay').classList.add('open')
  // Carrega grupos de adicionais
  const { data: grupos } = await supabase.from('grupos_adicionais').select('*,adicionais(*)').eq('produto_id', id).eq('ativo', true).order('ordem')
  renderGruposAdicionaisPainel(grupos || [])
}

// ===== ADICIONAIS NO PAINEL — interface simples =====

// Estrutura em memória: [{id, nome, obrigatorio, max, itens:[{id,nome,preco}]}]
let _grupos = []

function renderGruposAdicionaisPainel(gruposBanco) {
  // Converte do banco para estrutura em memória
  _grupos = (gruposBanco || []).map(g => ({
    id:          g.id,
    nome:        g.nome || '',
    obrigatorio: g.obrigatorio || false,
    max:         g.max_escolha || 1,
    itens:       (g.adicionais || []).map(i => ({
      id:    i.id,
      nome:  i.nome || '',
      preco: i.preco || 0
    }))
  }))
  _renderGrupos()
}

function _renderGrupos() {
  const container = document.getElementById('epAdicionais')
  if (!container) return

  let h = `<div style="display:flex;align-items:center;justify-content:space-between;margin:0.75rem 0 0.5rem;">
    <span class="ep-lbl" style="margin:0;font-size:0.78rem;">Adicionais / Complementos</span>
    <button onclick="addNovoGrupo()" style="background:var(--or);color:#fff;border:none;border-radius:8px;padding:0.3rem 0.85rem;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;">+ Novo grupo</button>
  </div>`

  if (!_grupos.length) {
    h += `<div style="font-size:0.75rem;color:var(--txt3);text-align:center;padding:0.65rem;background:#FAFAFA;border-radius:10px;border:1.5px dashed #E7E5E4;">
      Nenhum adicional. Ex: Tamanho, Borda, Complementos do açaí...
    </div>`
  }

  _grupos.forEach((g, gi) => {
    h += `<div class="add-pg" id="apg_${gi}">
      <div class="add-pg-hd">
        <input class="add-pg-nome" placeholder="Nome do grupo (ex: Borda, Tamanho, Complementos...)"
          value="${g.nome}" oninput="_grupos[${gi}].nome=this.value">
        <select class="add-pg-sel" onchange="_grupos[${gi}].obrigatorio=this.value==='1'">
          <option value="0" ${!g.obrigatorio?'selected':''}>Opcional</option>
          <option value="1" ${g.obrigatorio?'selected':''}>Obrigatório</option>
        </select>
        <div style="display:flex;align-items:center;gap:0.25rem;font-size:0.7rem;color:var(--txt3);">
          Máx <input type="number" min="1" max="20" value="${g.max}"
            oninput="_grupos[${gi}].max=parseInt(this.value)||1"
            style="width:36px;border:1.5px solid #E7E5E4;border-radius:6px;padding:0.2rem;font-size:0.75rem;text-align:center;">
        </div>
        <button class="add-pg-del" onclick="_removerGrupo(${gi})">🗑</button>
      </div>
      <div class="add-pg-body" id="apg_itens_${gi}">
        ${g.itens.map((item, ii) => `
          <div class="add-it" id="apit_${gi}_${ii}">
            <input class="add-it-nome" placeholder="Ex: Borda Catupiry" value="${item.nome}"
              oninput="_grupos[${gi}].itens[${ii}].nome=this.value">
            <input class="add-it-preco" placeholder="R$ 0,00" type="number" step="0.01" min="0"
              value="${item.preco||''}"
              oninput="_grupos[${gi}].itens[${ii}].preco=parseFloat(this.value)||0">
            <button class="add-it-del" onclick="_removerItem(${gi},${ii})">×</button>
          </div>`).join('')}
        <button class="add-pg-add" onclick="_addItem(${gi})">+ Adicionar opção</button>
      </div>
      <div class="add-pg-foot">
        ${g.obrigatorio
          ? '<span style="color:#BC3000;font-weight:700;">● Obrigatório</span> — cliente deve escolher'
          : '<span>○ Opcional</span> — cliente pode ignorar'}
        &nbsp;·&nbsp; máximo ${g.max} escolha${g.max!==1?'s':''}
      </div>
    </div>`
  })

  container.innerHTML = h
}

export function addNovoGrupo() {
  _grupos.push({ id: null, nome: '', obrigatorio: false, max: 1, itens: [] })
  _renderGrupos()
  // Foca no input do novo grupo
  const inputs = document.querySelectorAll('.add-pg-nome')
  if (inputs.length) inputs[inputs.length-1].focus()
}

export function addItemGrupo() {} // compatibilidade — não usado mais

window._addItem = function(gi) {
  if (!_grupos[gi]) return
  _grupos[gi].itens.push({ id: null, nome: '', preco: 0 })
  _renderGrupos()
  // Foca no novo item
  const container = document.getElementById(`apg_itens_${gi}`)
  const inputs = container?.querySelectorAll('.add-it-nome')
  if (inputs?.length) inputs[inputs.length-1].focus()
}

window._removerGrupo = function(gi) {
  _grupos.splice(gi, 1)
  _renderGrupos()
}

window._removerItem = function(gi, ii) {
  _grupos[gi].itens.splice(ii, 1)
  _renderGrupos()
}

export function removerGrupo() {}
export function removerItemGrupo() {}


// coletarGruposDoFormulario removida — usa _grupos em memória

// Salva grupos de adicionais no banco usando _grupos em memória
async function salvarGruposAdicionais(produtoId) {
  // Remove todos os grupos antigos e recria do zero
  await supabase.from('grupos_adicionais').delete().eq('produto_id', produtoId)

  for (let i = 0; i < _grupos.length; i++) {
    const g = _grupos[i]
    if (!g.nome.trim()) continue // ignora grupos sem nome

    const { data: grupoSalvo } = await supabase.from('grupos_adicionais').insert({
      produto_id:  produtoId,
      loja_id:     _loja.id,
      nome:        g.nome.trim(),
      obrigatorio: g.obrigatorio,
      min_escolha: g.obrigatorio ? 1 : 0,
      max_escolha: g.max || 1,
      ordem:       i,
      ativo:       true
    }).select().single()

    if (grupoSalvo && g.itens.length) {
      const itensFiltrados = g.itens.filter(it => it.nome.trim())
      if (itensFiltrados.length) {
        await supabase.from('adicionais').insert(
          itensFiltrados.map((item, j) => ({
            grupo_id: grupoSalvo.id,
            loja_id:  _loja.id,
            nome:     item.nome.trim(),
            preco:    item.preco || 0,
            ordem:    j,
            ativo:    true
          }))
        )
      }
    }
  }
}

function resetModalImagem() {
  document.getElementById('epImgArea').style.display    = 'block'
  document.getElementById('epImgPosWrap').style.display = 'none'
  document.getElementById('epUploadBtn').style.display  = 'none'
  document.getElementById('epTrocarBtn').style.display  = 'none'
  document.getElementById('epProgress').style.display   = 'none'
  document.getElementById('epProgressTxt').style.display = 'none'
}
export function closeEp() { document.getElementById('epOverlay').classList.remove('open') }
export async function deletarProduto() {
  if (!editingProdId) return
  if (confirm('Excluir este produto?\n\nEsta ação não pode ser desfeita.')) { closeEp(); await deletarProdutoById(editingProdId) }
}

export async function handleImgUpload(input) {
  if (!input.files || !input.files[0]) return
  const file = input.files[0]
  if (file.size > 20 * 1024 * 1024) { toast('❌ Arquivo muito grande — máximo 20MB'); return }
  const area = document.getElementById('epImgArea')
  const imgPosWrap = document.getElementById('epImgPosWrap')
  const imgEl      = document.getElementById('epImgPos')
  const uploadBtn  = document.getElementById('epUploadBtn')
  const trocarBtn  = document.getElementById('epTrocarBtn')
  const reader = new FileReader()
  reader.onload = e => {
    area.style.display = 'none'; imgPosWrap.style.display = 'block'
    uploadBtn.style.display = 'block'; trocarBtn.style.display = 'none'
    imgEl.src = e.target.result; setImgOffset(50, 50); atualizarPosImagem(); iniciarDragImagem()
  }
  reader.readAsDataURL(file)
  uploadBtn.onclick = async () => {
    uploadBtn.style.display = 'none'
    const progress = document.getElementById('epProgress')
    const progressBar = document.getElementById('epProgressBar')
    const progressTxt = document.getElementById('epProgressTxt')
    progress.style.display = 'block'; progressTxt.style.display = 'block'
    progressTxt.textContent = 'Processando 1080×1080...'; progressBar.style.width = '20%'
    try {
      const blob = await comprimirImagem(file, 1080)
      progressBar.style.width = '55%'; progressTxt.textContent = 'Enviando...'
      const path = `${_loja.id}/${editingProdId || 'novo_' + Date.now()}_${Date.now()}.jpg`
      const { error } = await supabase.storage.from('produtos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw new Error(error.message)
      progressBar.style.width = '90%'
      const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(path)
      uploadedImgUrl = urlData.publicUrl
      imgEl.src = uploadedImgUrl; atualizarPosImagem()
      progressBar.style.width = '100%'; progressTxt.textContent = '✅ Foto enviada!'
      trocarBtn.style.display = 'block'
      setTimeout(() => { progress.style.display = 'none'; progressTxt.style.display = 'none' }, 2000)
      if (editingProdId) {
        await supabase.from('produtos').update({ foto_url: uploadedImgUrl, img_offset_x: imgOffsetX, img_offset_y: imgOffsetY }).eq('id', editingProdId)
        const p = _produtos.find(x => x.id === editingProdId)
        if (p) { p.foto_url = uploadedImgUrl; p.img_offset_x = imgOffsetX; p.img_offset_y = imgOffsetY }
      }
      toast('✅ Foto adicionada!')
    } catch (err) {
      progress.style.display = 'none'; progressTxt.style.display = 'none'
      uploadBtn.style.display = 'block'; toast('❌ Erro ao enviar — ' + err.message)
    }
  }
}

export async function saveEp() {
  const nome         = document.getElementById('epNome').value.trim()
  const preco        = parseFloat(document.getElementById('epPreco').value)
  const categoria_id = document.getElementById('epCat').value
  const descricao    = document.getElementById('epDesc').value.trim()
  if (!nome)               { toast('⚠️ Nome é obrigatório'); return }
  if (!preco || preco <= 0){ toast('⚠️ Preço inválido'); return }
  if (!categoria_id)       { toast('⚠️ Selecione uma categoria'); return }
  const dados = { nome, descricao, preco, categoria_id, disponivel: true, img_offset_x: imgOffsetX, img_offset_y: imgOffsetY }
  if (uploadedImgUrl) dados.foto_url = uploadedImgUrl
  if (!editingProdId) {
    const { data: novo, error } = await supabase.from('produtos').insert({ ...dados, loja_id: _loja.id }).select('*,categorias(nome)').single()
    if (error) { toast('❌ Erro ao criar produto'); return }
    _produtos.push(novo)
    await salvarGruposAdicionais(novo.id)
    closeEp(); renderCardapio(); toast('✅ Produto criado!')
  } else {
    await supabase.from('produtos').update(dados).eq('id', editingProdId)
    const p = _produtos.find(x => x.id === editingProdId); Object.assign(p, dados)
    const cat = _categorias.find(c => c.id === categoria_id)
    if (p && cat) p.categorias = { nome: cat.nome }
    await salvarGruposAdicionais(editingProdId)
    closeEp(); renderCardapio(); toast('✅ Produto salvo!')
  }
}
