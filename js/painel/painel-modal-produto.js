// js/painel/painel-modal-produto.js — modais de produto e adicionais

import { supabase } from '../supabase.js'
import { toast, comprimirImagem, atualizarPosImagem, iniciarDragImagem, imgOffsetX, imgOffsetY, setImgOffset } from './utils.js'
import { getLoja, getProdutos, getCategorias, renderCardapio } from './painel-cardapio.js'

let _editProdId = null, _uploadedUrl = null
let _addProdId = null

// ════════════════════════════════════════════
// MODAL PRODUTO
// ════════════════════════════════════════════
export function abrirModalProd(prodId, catIdPre) {
  _editProdId = prodId || null
  _uploadedUrl = null
  const produtos = getProdutos()
  const categorias = getCategorias()
  const p = prodId ? produtos.find(x => x.id === prodId) : null

  document.getElementById('prodModalTitulo').textContent = p ? 'Editar produto' : 'Novo produto'
  document.getElementById('epNome').value    = p?.nome      || ''
  document.getElementById('epPreco').value   = p?.preco     || ''
  document.getElementById('epDesc').value    = p?.descricao || ''
  document.getElementById('epDelBtn').style.display = p ? 'block' : 'none'

  const catPad = catIdPre || p?.categoria_id || ''
  document.getElementById('epCat').innerHTML = categorias.map(c =>
    `<option value="${c.id}" ${c.id === catPad ? 'selected' : ''}>${c.tipo === 'combo' ? '🔥 ' : ''}${c.nome}</option>`
  ).join('')

  document.getElementById('epImgArea').style.display     = 'block'
  document.getElementById('epImgPosWrap').style.display  = 'none'
  document.getElementById('epUploadBtn').style.display   = 'none'
  document.getElementById('epTrocarBtn').style.display   = 'none'
  document.getElementById('epProgress').style.display    = 'none'
  document.getElementById('epProgressTxt').style.display = 'none'

  const fitAtual = p?.img_fit || 'cover'
  document.querySelectorAll('[name="epImgFit"]').forEach(el => { el.checked = el.value === fitAtual })

  if (p?.foto_url) {
    setImgOffset(p.img_offset_x || 50, p.img_offset_y || 50)
    document.getElementById('epImgArea').style.display    = 'none'
    document.getElementById('epImgPosWrap').style.display = 'block'
    document.getElementById('epTrocarBtn').style.display  = 'block'
    const imgEl = document.getElementById('epImgPos')
    imgEl.src = p.foto_url
    if (fitAtual === 'cover') {
      atualizarPosImagem(); iniciarDragImagem()
    } else {
      imgEl.style.objectFit      = 'contain'
      imgEl.style.width          = '100%'
      imgEl.style.height         = '100%'
      imgEl.style.maxWidth       = ''
      imgEl.style.maxHeight      = ''
      imgEl.style.objectPosition = '50% 50%'
      imgEl.style.cursor         = 'default'
    }
  } else {
    setImgOffset(50, 50)
  }
  document.querySelectorAll('[data-selo]').forEach(el => {
    el.checked = (p?.selos || []).includes(el.dataset.selo)
  })

  document.getElementById('modalProd').classList.add('open')
  setTimeout(() => document.getElementById('epNome').focus(), 100)
}

export function fecharModalProd() {
  document.getElementById('modalProd').classList.remove('open')
}

document.addEventListener('change', e => {
  if (e.target.name !== 'epImgFit') return
  const img = document.getElementById('epImgPos')
  if (!img?.src || img.src === window.location.href) return
  if (e.target.value === 'cover') {
    iniciarDragImagem()
    const btn = document.getElementById('epUploadBtn')
    btn.style.display = 'block'
    btn.textContent = '✓ Confirmar posição'
    btn.onclick = async () => {
      if (!_editProdId) { btn.style.display = 'none'; return }
      btn.disabled = true; btn.textContent = 'Salvando...'
      await supabase.from('produtos').update({ img_fit: 'cover', img_offset_x: imgOffsetX, img_offset_y: imgOffsetY }).eq('id', _editProdId)
      const p = getProdutos().find(x => x.id === _editProdId)
      if (p) { p.img_fit = 'cover'; p.img_offset_x = imgOffsetX; p.img_offset_y = imgOffsetY }
      btn.style.display = 'none'; btn.disabled = false
      toast('✅ Posição salva!')
    }
  } else {
    img.style.objectFit      = 'contain'
    img.style.width          = '100%'
    img.style.height         = '100%'
    img.style.maxWidth       = ''
    img.style.maxHeight      = ''
    img.style.cursor         = 'default'
    img.style.objectPosition = '50% 50%'
    document.getElementById('epUploadBtn').style.display = 'none'
  }
})

export async function handleImgUpload(input) {
  if (!input.files?.[0]) return
  const file = input.files[0]
  if (file.size > 20 * 1024 * 1024) { toast('❌ Máximo 20MB'); return }
  const imgEl = document.getElementById('epImgPos')

  const reader = new FileReader()
  reader.onload = e => {
    imgEl.src = e.target.result
    document.getElementById('epImgArea').style.display    = 'none'
    document.getElementById('epImgPosWrap').style.display = 'block'
    document.getElementById('epUploadBtn').style.display  = 'none'
    document.getElementById('epTrocarBtn').style.display  = 'none'
    document.querySelectorAll('[name="epImgFit"]').forEach(el => { el.checked = el.value === 'cover' })
    imgEl.style.objectFit = 'cover'
    imgEl.style.height    = '100%'
    imgEl.style.maxWidth  = 'none'
    imgEl.style.maxHeight = 'none'
    setImgOffset(50, 50); atualizarPosImagem(); iniciarDragImagem()
  }
  reader.readAsDataURL(file)

  const bar = document.getElementById('epProgressBar')
  document.getElementById('epProgress').style.display    = 'block'
  document.getElementById('epProgressTxt').style.display = 'block'
  document.getElementById('epProgressTxt').textContent   = 'Comprimindo...'
  bar.style.width = '20%'
  try {
    const loja = getLoja()
    const blob = await comprimirImagem(file, 1080)
    bar.style.width = '55%'
    document.getElementById('epProgressTxt').textContent = 'Enviando...'
    const path = `${loja.id}/${_editProdId || 'novo_' + Date.now()}_${Date.now()}.jpg`
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
      await supabase.from('produtos').update({ foto_url: _uploadedUrl, img_fit: 'cover', img_offset_x: imgOffsetX, img_offset_y: imgOffsetY }).eq('id', _editProdId)
      const p = getProdutos().find(x => x.id === _editProdId)
      if (p) { p.foto_url = _uploadedUrl; p.img_fit = 'cover'; p.img_offset_x = imgOffsetX; p.img_offset_y = imgOffsetY }
    }
  } catch (err) {
    document.getElementById('epProgress').style.display    = 'none'
    document.getElementById('epProgressTxt').style.display = 'none'
    toast('❌ Erro no upload: ' + err.message)
  }
}

export async function saveEp() {
  const nome         = document.getElementById('epNome').value.trim()
  const preco        = parseFloat(document.getElementById('epPreco').value)
  const categoria_id = document.getElementById('epCat').value
  const descricao    = document.getElementById('epDesc').value.trim()
  if (!nome)                { toast('⚠️ Nome é obrigatório'); return }
  if (!preco || preco <= 0) { toast('⚠️ Preço inválido'); return }
  if (!categoria_id)        { toast('⚠️ Selecione uma categoria'); return }

  const loja      = getLoja()
  const produtos  = getProdutos()
  const categorias = getCategorias()
  const selos   = [...document.querySelectorAll('[data-selo]:checked')].map(el => el.dataset.selo)
  const img_fit = document.querySelector('[name="epImgFit"]:checked')?.value || 'cover'
  const dados   = { nome, descricao, preco, categoria_id, img_offset_x: imgOffsetX, img_offset_y: imgOffsetY, selos, img_fit }
  if (_uploadedUrl) dados.foto_url = _uploadedUrl

  if (!_editProdId) {
    const { data, error } = await supabase.from('produtos')
      .insert({ ...dados, loja_id: loja.id, disponivel: true })
      .select('*,categorias(nome)').single()
    if (error) { toast('❌ Erro ao criar produto'); return }
    produtos.push(data)
    toast('✅ Produto criado!')
  } else {
    await supabase.from('produtos').update(dados).eq('id', _editProdId)
    const p = produtos.find(x => x.id === _editProdId)
    Object.assign(p, dados)
    const cat = categorias.find(c => c.id === categoria_id)
    if (p && cat) p.categorias = { nome: cat.nome }
    toast('✅ Produto salvo!')
  }
  fecharModalProd()
  renderCardapio()
}

export async function deletarProduto() {
  if (!_editProdId) return
  if (!confirm('Excluir este produto?')) return
  const ok = await deletarProdPorId(_editProdId)
  if (ok) { fecharModalProd(); renderCardapio() }
}

export async function confirmarDelProd(id) {
  const p = getProdutos().find(x => x.id === id)
  if (!confirm(`Excluir "${p?.nome}"?`)) return
  const ok = await deletarProdPorId(id)
  if (ok) { renderCardapio(); toast('🗑️ Produto excluído') }
}

export async function deletarProdPorId(id) {
  const produtos = getProdutos()
  const p = produtos.find(x => x.id === id)
  if (p?.foto_url) {
    const path = p.foto_url.split('/produtos/')[1]
    if (path) await supabase.storage.from('produtos').remove([path])
  }
  const { data: grupos } = await supabase.from('grupos_adicionais').select('id').eq('produto_id', id)
  if (grupos?.length) {
    await supabase.from('adicionais').delete().in('grupo_id', grupos.map(g => g.id))
    await supabase.from('grupos_adicionais').delete().eq('produto_id', id)
  }
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) {
    toast('⚠️ Produto está em pedidos. Para removê-lo do cardápio, desative-o.')
    return false
  }
  produtos.splice(produtos.findIndex(x => x.id === id), 1)
  return true
}

// ════════════════════════════════════════════
// MODAL ADICIONAIS
// ════════════════════════════════════════════
export async function abrirModalAdd(prodId, prodNome) {
  _addProdId = prodId
  document.getElementById('addModalTitulo').textContent = `Adicionais — ${prodNome}`

  const { data: grupos } = await supabase
    .from('grupos_adicionais')
    .select('*, adicionais(*)')
    .eq('produto_id', prodId)
    .eq('ativo', true)
    .order('ordem')

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
  const loja    = getLoja()
  const produtos = getProdutos()

  await supabase.from('grupos_adicionais').delete().eq('produto_id', _addProdId)

  const grupos = document.querySelectorAll('#adicionaisLista .add-pg')
  let totalGrupos = 0

  for (let i = 0; i < grupos.length; i++) {
    const g    = grupos[i]
    const nome = g.querySelector('.add-pg-nome')?.value.trim()
    const obrig = g.querySelector('.add-pg-sel')?.value === '1'
    const max   = parseInt(g.querySelector('.add-pg-max')?.value) || 1
    if (!nome) continue

    const { data: grupoSalvo } = await supabase.from('grupos_adicionais').insert({
      produto_id: _addProdId, loja_id: loja.id,
      nome, obrigatorio: obrig,
      min_escolha: obrig ? 1 : 0, max_escolha: max,
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
        itens.map(it => ({ grupo_id: grupoSalvo.id, loja_id: loja.id, ...it, ativo: true }))
      )
    }
  }

  const p = produtos.find(x => x.id === _addProdId)
  if (p) p._numGrupos = totalGrupos

  fecharModalAdd()
  renderCardapio()
  toast(totalGrupos > 0 ? `✅ ${totalGrupos} grupo(s) salvo(s)!` : '✅ Adicionais removidos')
}

export function initBtnNovoGrupo() {
  document.getElementById('btnNovoGrupo')?.addEventListener('click', () => adicionarGrupoDOM())
}
