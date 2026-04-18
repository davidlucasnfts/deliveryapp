import { supabase } from '../supabase.js'
import { fmt, toast, comprimirImagem, atualizarPosImagem, iniciarDragImagem, imgOffsetX, imgOffsetY, setImgOffset } from './utils.js'

let _loja = null, _produtos = [], _categorias = []
let _editCatId = null
let _editProdId = null, _uploadedUrl = null
let _addProdId = null

export function setDados(loja, produtos, categorias) {
  _loja = loja; _produtos = produtos; _categorias = categorias
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
    const itens = _produtos.filter(p => p.categoria_id === cat.id)
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

  document.getElementById('mainBody').innerHTML = h
  initSeguraParaOrdenar()
}

function prodCard(p) {
  const numGrupos = p._numGrupos || 0
  return `
  <div class="cat-prod-item" id="proditem_${p.id}">
    <div class="cat-prod-thumb">
      ${p.foto_url
        ? `<img src="${p.foto_url}" alt="${p.nome}" style="width:44px;height:44px;object-fit:cover;border-radius:9px;">`
        : '🍽️'}
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

// ════════════════════════════════════════════
// TOGGLE ATIVO
// ════════════════════════════════════════════
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
// MODAL CATEGORIA — simples: nome + tipo
// ════════════════════════════════════════════
export function abrirModalCat(id) {
  _editCatId = id || null
  const cat = id ? _categorias.find(x => x.id === id) : null

  document.getElementById('catModalTitulo').textContent = cat ? 'Editar categoria' : 'Nova categoria'
  document.getElementById('catNome').value = cat?.nome || ''
  document.getElementById('catDelBtn').style.display = cat ? 'block' : 'none'

  // Tipo selecionado
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
  for (const p of prods) await _deletarProdId(p.id)
  await supabase.from('categorias').delete().eq('id', _editCatId)
  _categorias.splice(_categorias.findIndex(c => c.id === _editCatId), 1)
  fecharModalCat()
  renderCardapio()
  toast('🗑️ Categoria excluída')
}

// ════════════════════════════════════════════
// MODAL PRODUTO — info básica + foto
// ════════════════════════════════════════════
export function abrirModalProd(prodId, catIdPre) {
  _editProdId = prodId || null
  _uploadedUrl = null
  const p = prodId ? _produtos.find(x => x.id === prodId) : null

  document.getElementById('prodModalTitulo').textContent = p ? 'Editar produto' : 'Novo produto'
  document.getElementById('epNome').value    = p?.nome      || ''
  document.getElementById('epPreco').value   = p?.preco     || ''
  document.getElementById('epDesc').value    = p?.descricao || ''
  document.getElementById('epDelBtn').style.display = p ? 'block' : 'none'

  // Categorias no select
  const catPad = catIdPre || p?.categoria_id || ''
  document.getElementById('epCat').innerHTML = _categorias.map(c =>
    `<option value="${c.id}" ${c.id === catPad ? 'selected' : ''}>${c.tipo === 'combo' ? '🔥 ' : ''}${c.nome}</option>`
  ).join('')

  // Reset foto
  document.getElementById('epImgArea').style.display    = 'block'
  document.getElementById('epImgPosWrap').style.display = 'none'
  document.getElementById('epUploadBtn').style.display  = 'none'
  document.getElementById('epTrocarBtn').style.display  = 'none'
  document.getElementById('epProgress').style.display   = 'none'
  document.getElementById('epProgressTxt').style.display = 'none'

  if (p?.foto_url) {
    setImgOffset(p.img_offset_x || 50, p.img_offset_y || 50)
    document.getElementById('epImgArea').style.display    = 'none'
    document.getElementById('epImgPosWrap').style.display = 'block'
    document.getElementById('epTrocarBtn').style.display  = 'block'
    document.getElementById('epImgPos').src = p.foto_url
    atualizarPosImagem(); iniciarDragImagem()
  } else {
    setImgOffset(50, 50)
  }

  document.getElementById('modalProd').classList.add('open')
  setTimeout(() => document.getElementById('epNome').focus(), 100)
}

export function fecharModalProd() {
  document.getElementById('modalProd').classList.remove('open')
}

export async function handleImgUpload(input) {
  if (!input.files?.[0]) return
  const file = input.files[0]
  if (file.size > 20 * 1024 * 1024) { toast('❌ Máximo 20MB'); return }
  const imgEl = document.getElementById('epImgPos')
  const reader = new FileReader()
  reader.onload = e => {
    document.getElementById('epImgArea').style.display    = 'none'
    document.getElementById('epImgPosWrap').style.display = 'block'
    document.getElementById('epUploadBtn').style.display  = 'block'
    imgEl.src = e.target.result
    setImgOffset(50, 50); atualizarPosImagem(); iniciarDragImagem()
  }
  reader.readAsDataURL(file)

  document.getElementById('epUploadBtn').onclick = async () => {
    document.getElementById('epUploadBtn').style.display = 'none'
    const bar = document.getElementById('epProgressBar')
    document.getElementById('epProgress').style.display    = 'block'
    document.getElementById('epProgressTxt').style.display = 'block'
    document.getElementById('epProgressTxt').textContent   = 'Comprimindo...'
    bar.style.width = '20%'
    try {
      const blob = await comprimirImagem(file, 1080)
      bar.style.width = '55%'
      document.getElementById('epProgressTxt').textContent = 'Enviando...'
      const path = `${_loja.id}/${_editProdId || 'novo_' + Date.now()}_${Date.now()}.jpg`
      const { error } = await supabase.storage.from('produtos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw new Error(error.message)
      const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(path)
      _uploadedUrl = urlData.publicUrl
      imgEl.src = _uploadedUrl
      bar.style.width = '100%'
      document.getElementById('epProgressTxt').textContent = '✅ Foto pronta!'
      document.getElementById('epTrocarBtn').style.display = 'block'
      setTimeout(() => {
        document.getElementById('epProgress').style.display    = 'none'
        document.getElementById('epProgressTxt').style.display = 'none'
      }, 2000)
      if (_editProdId) {
        await supabase.from('produtos').update({ foto_url: _uploadedUrl, img_offset_x: imgOffsetX, img_offset_y: imgOffsetY }).eq('id', _editProdId)
        const p = _produtos.find(x => x.id === _editProdId)
        if (p) { p.foto_url = _uploadedUrl; p.img_offset_x = imgOffsetX; p.img_offset_y = imgOffsetY }
      }
    } catch (err) {
      document.getElementById('epProgress').style.display    = 'none'
      document.getElementById('epProgressTxt').style.display = 'none'
      document.getElementById('epUploadBtn').style.display   = 'block'
      toast('❌ Erro: ' + err.message)
    }
  }
}

export async function saveEp() {
  const nome         = document.getElementById('epNome').value.trim()
  const preco        = parseFloat(document.getElementById('epPreco').value)
  const categoria_id = document.getElementById('epCat').value
  const descricao    = document.getElementById('epDesc').value.trim()
  if (!nome)          { toast('⚠️ Nome é obrigatório'); return }
  if (!preco || preco <= 0) { toast('⚠️ Preço inválido'); return }
  if (!categoria_id)  { toast('⚠️ Selecione uma categoria'); return }

  const dados = { nome, descricao, preco, categoria_id, img_offset_x: imgOffsetX, img_offset_y: imgOffsetY }
  if (_uploadedUrl) dados.foto_url = _uploadedUrl

  if (!_editProdId) {
    const { data, error } = await supabase.from('produtos')
      .insert({ ...dados, loja_id: _loja.id, disponivel: true })
      .select('*,categorias(nome)').single()
    if (error) { toast('❌ Erro ao criar produto'); return }
    _produtos.push(data)
    toast('✅ Produto criado!')
  } else {
    await supabase.from('produtos').update(dados).eq('id', _editProdId)
    const p = _produtos.find(x => x.id === _editProdId)
    Object.assign(p, dados)
    const cat = _categorias.find(c => c.id === categoria_id)
    if (p && cat) p.categorias = { nome: cat.nome }
    toast('✅ Produto salvo!')
  }
  fecharModalProd()
  renderCardapio()
}

export async function deletarProduto() {
  if (!_editProdId) return
  if (!confirm('Excluir este produto?')) return
  fecharModalProd()
  await _deletarProdId(_editProdId)
  renderCardapio()
}

export async function confirmarDelProd(id) {
  const p = _produtos.find(x => x.id === id)
  if (!confirm(`Excluir "${p?.nome}"?`)) return
  await _deletarProdId(id)
  renderCardapio()
  toast('🗑️ Produto excluído')
}

async function _deletarProdId(id) {
  const p = _produtos.find(x => x.id === id)
  if (p?.foto_url) {
    const path = p.foto_url.split('/produtos/')[1]
    if (path) await supabase.storage.from('produtos').remove([path])
  }
  await supabase.from('grupos_adicionais').delete().eq('produto_id', id)
  await supabase.from('produtos').delete().eq('id', id)
  _produtos.splice(_produtos.findIndex(x => x.id === id), 1)
}

// Exporta abrirNovoEp para compatibilidade
export function abrirNovoEp(catId) { abrirModalProd(null, catId) }
export function openEp(id) { abrirModalProd(id, null) }
export function closeEp() { fecharModalProd() }
export function abrirNovoEpNaCat(catId) { abrirModalProd(null, catId) }

// Stubs de compatibilidade
export function toggleNovaCatForm() {}
export function openEc(id) { abrirModalCat(id) }
export function closeEc() { fecharModalCat() }
export function delProdDaCat() {}
export function addNovoGrupo() {}
export function addItemGrupo() {}
export function removerGrupo() {}
export function removerItemGrupo() {}

// ════════════════════════════════════════════
// MODAL ADICIONAIS — dedicado, separado, limpo
// ════════════════════════════════════════════
export async function abrirModalAdd(prodId, prodNome) {
  _addProdId = prodId

  document.getElementById('addModalTitulo').textContent = `Adicionais — ${prodNome}`

  // Carrega grupos existentes
  const { data: grupos } = await supabase
    .from('grupos_adicionais')
    .select('*, adicionais(*)')
    .eq('produto_id', prodId)
    .eq('ativo', true)
    .order('ordem')

  // Reconstrói a lista
  const lista = document.getElementById('adicionaisLista')
  lista.innerHTML = ''

  if (grupos?.length) {
    grupos.forEach(g => adicionarGrupoDOM(g.nome, g.obrigatorio, g.max_escolha || 1,
      (g.adicionais || []).map(i => ({ nome: i.nome, preco: i.preco }))
    ))
  } else {
    lista.innerHTML = `<div class="add-vazio" id="addVazio">
      Nenhum adicional ainda.<br>
      Ex: <strong>Borda</strong> (Catupiry, Cheddar), <strong>Ponto da carne</strong> (Mal, Ao ponto, Bem passado)
    </div>`
  }

  document.getElementById('modalAdd').classList.add('open')
}

export function fecharModalAdd() {
  document.getElementById('modalAdd').classList.remove('open')
}

function adicionarGrupoDOM(nome = '', obrigatorio = false, max = 1, itens = []) {
  const lista = document.getElementById('adicionaisLista')
  document.getElementById('addVazio')?.remove()

  const grupo = document.createElement('div')
  grupo.className = 'add-pg'

  // Header do grupo
  const hd = document.createElement('div')
  hd.className = 'add-pg-hd'
  hd.innerHTML = `
    <input class="add-pg-nome" placeholder="Nome do grupo (ex: Borda, Tamanho, Ponto da carne...)" value="${nome}">
    <select class="add-pg-sel">
      <option value="0" ${!obrigatorio ? 'selected' : ''}>Opcional</option>
      <option value="1" ${obrigatorio ? 'selected' : ''}>Obrigatório</option>
    </select>
    <div class="add-pg-max-wrap">Máx <input type="number" class="add-pg-max" min="1" max="20" value="${max}"></div>
    <button class="add-pg-del">🗑</button>`

  hd.querySelector('.add-pg-del').addEventListener('click', () => {
    grupo.remove()
    if (!lista.querySelector('.add-pg')) {
      lista.innerHTML = `<div class="add-vazio" id="addVazio">Nenhum adicional ainda.</div>`
    }
  })
  grupo.appendChild(hd)

  // Corpo com opções
  const body = document.createElement('div')
  body.className = 'add-pg-body'

  function novaOpcaoDOM(nomeItem = '', precoItem = '') {
    const row = document.createElement('div')
    row.className = 'add-it'
    row.innerHTML = `
      <input class="add-it-nome" placeholder="Ex: Borda Catupiry, Sem cebola...">
      <input class="add-it-preco" type="number" step="0.01" min="0" placeholder="0,00">
      <button class="add-it-del">×</button>`
    row.querySelector('.add-it-nome').value  = nomeItem
    row.querySelector('.add-it-preco').value = precoItem || ''
    row.querySelector('.add-it-del').addEventListener('click', () => row.remove())
    body.insertBefore(row, btnAddOpcao)
    row.querySelector('.add-it-nome').focus()
  }

  const btnAddOpcao = document.createElement('button')
  btnAddOpcao.className = 'add-nova-op'
  btnAddOpcao.textContent = '+ Adicionar opção'
  btnAddOpcao.addEventListener('click', () => novaOpcaoDOM())
  body.appendChild(btnAddOpcao)

  itens.forEach(i => novaOpcaoDOM(i.nome, i.preco))
  grupo.appendChild(body)
  lista.appendChild(grupo)
}

export async function salvarAdicionais() {
  if (!_addProdId) return

  // 1. Deleta grupos antigos
  await supabase.from('grupos_adicionais').delete().eq('produto_id', _addProdId)

  const grupos = document.querySelectorAll('#adicionaisLista .add-pg')
  let totalGrupos = 0

  for (let i = 0; i < grupos.length; i++) {
    const g = grupos[i]
    const nome    = g.querySelector('.add-pg-nome')?.value.trim()
    const obrig   = g.querySelector('.add-pg-sel')?.value === '1'
    const max     = parseInt(g.querySelector('.add-pg-max')?.value) || 1
    if (!nome) continue

    const { data: grupoSalvo } = await supabase.from('grupos_adicionais').insert({
      produto_id:  _addProdId,
      loja_id:     _loja.id,
      nome, obrigatorio: obrig,
      min_escolha: obrig ? 1 : 0,
      max_escolha: max,
      ordem: i, ativo: true
    }).select().single()

    if (!grupoSalvo) continue
    totalGrupos++

    const itens = [...g.querySelectorAll('.add-it')]
      .map((row, j) => ({
        nome:  row.querySelector('.add-it-nome')?.value.trim(),
        preco: parseFloat(row.querySelector('.add-it-preco')?.value) || 0,
        ordem: j
      }))
      .filter(it => it.nome)

    if (itens.length) {
      await supabase.from('adicionais').insert(
        itens.map(it => ({ grupo_id: grupoSalvo.id, loja_id: _loja.id, ...it, ativo: true }))
      )
    }
  }

  // Atualiza badge no card do produto
  const p = _produtos.find(x => x.id === _addProdId)
  if (p) p._numGrupos = totalGrupos

  fecharModalAdd()
  renderCardapio()
  toast(totalGrupos > 0 ? `✅ ${totalGrupos} grupo(s) salvo(s)!` : '✅ Adicionais removidos')
}

// Registra botão + Novo grupo no modal de adicionais
export function initBtnNovoGrupo() {
  document.getElementById('btnNovoGrupo')?.addEventListener('click', () => adicionarGrupoDOM())
}
