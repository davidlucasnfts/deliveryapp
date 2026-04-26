// js/painel/painel-extras.js — destaques, upsell, banners

import { supabase } from '../supabase.js'
import { fmt, toast, comprimirImagem } from './utils.js'
import { getLoja, getProdutos, renderCardapio } from './painel-cardapio.js'

let _banners = []

export async function carregarBanners() {
  const { data } = await supabase.from('banners').select('*').eq('loja_id', getLoja().id).eq('ativo', true).order('ordem')
  _banners = data || []
}

export function renderDestaqueAdmin() {
  const produtos    = getProdutos()
  const selecionados = produtos.filter(p => p.destaque)
  const disponiveis  = produtos.filter(p => !p.destaque && p.disponivel !== false)

  const listaHTML = selecionados.length
    ? selecionados.map(p => `
      <div style="display:flex;align-items:center;gap:0.65rem;padding:0.5rem 0;border-bottom:1px solid #F9FAFB;">
        <div style="width:40px;height:40px;border-radius:9px;background:#F0EEE8;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem;overflow:hidden;">
          ${p.foto_url ? `<img src="${p.foto_url}" style="width:40px;height:40px;object-fit:cover;border-radius:9px;">` : '🍽️'}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.82rem;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nome}</div>
          <div style="font-size:0.75rem;color:var(--or);font-weight:700;">${fmt(p.preco)}</div>
        </div>
        <button onclick="removerDestaque('${p.id}')" style="background:#FEE2E2;color:#B91C1C;border:none;border-radius:7px;padding:0.25rem 0.6rem;cursor:pointer;font-size:0.75rem;font-weight:700;flex-shrink:0;">Remover</button>
      </div>`).join('')
    : `<div style="font-size:0.78rem;color:var(--txt3);text-align:center;padding:0.75rem 0;">Nenhum produto em destaque ainda</div>`

  const opcoesSelect = disponiveis.map(p =>
    `<option value="${p.id}">${p.nome} — ${fmt(p.preco)}</option>`
  ).join('')

  return `
  <div style="margin-top:1.25rem;">
    <div class="sec-hd"><span class="sec-title">🔥 Destaques do cardápio</span></div>
    <div style="background:#fff;border-radius:12px;border:1px solid #F0EDEB;padding:0.85rem;margin-bottom:1rem;">
      <p style="font-size:0.75rem;color:var(--txt2);margin-bottom:0.75rem;line-height:1.5;">
        Produtos em destaque aparecem no topo do cardápio. Com 2 ou mais, exibe slide automático a cada 3s.
      </p>
      <div id="destaqueAdminLista">${listaHTML}</div>
      <div style="display:flex;gap:0.5rem;margin-top:0.85rem;">
        <select id="destaqueSelect" style="flex:1;min-width:0;border:1.5px solid #E7E5E4;border-radius:9px;padding:0.45rem 0.65rem;font-size:0.82rem;font-family:'Plus Jakarta Sans',sans-serif;color:var(--txt);outline:none;background:#fff;">
          <option value="">Selecionar produto...</option>${opcoesSelect}
        </select>
        <button class="btn-or" style="flex-shrink:0;white-space:nowrap;" onclick="adicionarDestaque()">+ Adicionar</button>
      </div>
    </div>
  </div>`
}

export function renderUpsellAdmin() {
  const produtos    = getProdutos()
  const selecionados = produtos.filter(p => p.upsell)
  const disponiveis  = produtos.filter(p => !p.upsell && p.disponivel !== false)

  const listaHTML = selecionados.length
    ? selecionados.map(p => `
      <div style="display:flex;align-items:center;gap:0.65rem;padding:0.5rem 0;border-bottom:1px solid #F9FAFB;">
        <div style="width:40px;height:40px;border-radius:9px;background:#FEF3C7;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem;overflow:hidden;">
          ${p.foto_url ? `<img src="${p.foto_url}" style="width:40px;height:40px;object-fit:cover;border-radius:9px;">` : '🍽️'}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.82rem;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nome}</div>
          <div style="font-size:0.75rem;color:var(--or);font-weight:700;">${fmt(p.preco)}</div>
        </div>
        <button onclick="removerUpsell('${p.id}')" style="background:#FEE2E2;color:#B91C1C;border:none;border-radius:7px;padding:0.25rem 0.6rem;cursor:pointer;font-size:0.75rem;font-weight:700;flex-shrink:0;">Remover</button>
      </div>`).join('')
    : `<div style="font-size:0.78rem;color:var(--txt3);text-align:center;padding:0.75rem 0;">Nenhum produto adicionado ainda</div>`

  const opcoesSelect = disponiveis.map(p =>
    `<option value="${p.id}">${p.nome} — ${fmt(p.preco)}</option>`
  ).join('')

  return `
  <div style="margin-top:1.25rem;">
    <div class="sec-hd"><span class="sec-title">⭐ Peça também</span></div>
    <div style="background:#fff;border-radius:12px;border:1px solid #F0EDEB;padding:0.85rem;margin-bottom:1rem;">
      <p style="font-size:0.75rem;color:var(--txt2);margin-bottom:0.75rem;line-height:1.5;">
        Produtos que aparecem como sugestão quando o cliente abre o carrinho.
      </p>
      <div id="upsellAdminLista">${listaHTML}</div>
      <div style="display:flex;gap:0.5rem;margin-top:0.85rem;">
        <select id="upsellSelect" style="flex:1;min-width:0;border:1.5px solid #E7E5E4;border-radius:9px;padding:0.45rem 0.65rem;font-size:0.82rem;font-family:'Plus Jakarta Sans',sans-serif;color:var(--txt);outline:none;background:#fff;">
          <option value="">Selecionar produto...</option>${opcoesSelect}
        </select>
        <button class="btn-or" style="flex-shrink:0;white-space:nowrap;" onclick="adicionarUpsell()">+ Adicionar</button>
      </div>
    </div>
  </div>`
}

export function renderBannerAdmin() {
  const listaHTML = _banners.length
    ? _banners.map(b => `
      <div style="display:flex;align-items:center;gap:0.65rem;padding:0.5rem 0;border-bottom:1px solid #F9FAFB;">
        <img src="${b.foto_url}" style="width:72px;height:40px;object-fit:cover;border-radius:7px;flex-shrink:0;background:#F0EEE8;">
        <div style="flex:1;font-size:0.78rem;color:var(--txt2);">Banner ${_banners.indexOf(b)+1}</div>
        <button onclick="removerBanner('${b.id}')" style="background:#FEE2E2;color:#B91C1C;border:none;border-radius:7px;padding:0.25rem 0.6rem;cursor:pointer;font-size:0.75rem;font-weight:700;flex-shrink:0;">Remover</button>
      </div>`).join('')
    : `<div style="font-size:0.78rem;color:var(--txt3);text-align:center;padding:0.75rem 0;">Nenhum banner adicionado ainda</div>`

  const podeAdicionar = _banners.length < 3

  return `
  <div style="margin-top:1.25rem;">
    <div class="sec-hd"><span class="sec-title">🖼️ Banners promocionais</span></div>
    <div style="background:#fff;border-radius:12px;border:1px solid #F0EDEB;padding:0.85rem;margin-bottom:1rem;">
      <p style="font-size:0.75rem;color:var(--txt2);margin-bottom:0.75rem;line-height:1.5;">
        Imagens livres exibidas no topo do cardápio. Máx 3 banners. Troca automática a cada 4s.
      </p>
      <div id="bannerAdminLista">${listaHTML}</div>
      ${podeAdicionar ? `
      <div style="margin-top:0.85rem;position:relative;">
        <input type="file" id="bannerFileInput" accept="image/jpeg,image/png,image/webp" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;" onchange="adicionarBanner(this)">
        <div style="border:2px dashed #FED7AA;border-radius:10px;padding:0.85rem;text-align:center;background:#FFF7ED;cursor:pointer;">
          <div style="font-size:1.3rem;margin-bottom:0.2rem;">🖼️</div>
          <div style="font-size:0.8rem;font-weight:700;color:#C2410C;">Toque para adicionar banner</div>
          <div style="font-size:0.68rem;color:var(--txt3);margin-top:0.1rem;">JPG/PNG · até 20MB · ${3 - _banners.length} restante${3 - _banners.length !== 1 ? 's' : ''}</div>
        </div>
      </div>` : `<div style="font-size:0.75rem;color:var(--txt3);text-align:center;margin-top:0.65rem;">Limite de 3 banners atingido</div>`}
    </div>
  </div>`
}

export async function adicionarDestaque() {
  const sel = document.getElementById('destaqueSelect')
  const id = sel?.value
  if (!id) { toast('⚠️ Selecione um produto'); return }
  const { error } = await supabase.from('produtos').update({ destaque: true }).eq('id', id)
  if (error) { toast('❌ Erro: ' + error.message); return }
  const p = getProdutos().find(x => x.id === id)
  if (p) p.destaque = true
  renderCardapio()
  toast('✅ Produto adicionado aos destaques!')
}

export async function removerDestaque(id) {
  await supabase.from('produtos').update({ destaque: false }).eq('id', id)
  const p = getProdutos().find(x => x.id === id)
  if (p) p.destaque = false
  renderCardapio()
  toast('Produto removido dos destaques')
}

export async function adicionarUpsell() {
  const sel = document.getElementById('upsellSelect')
  const id = sel?.value
  if (!id) { toast('⚠️ Selecione um produto'); return }
  await supabase.from('produtos').update({ upsell: true }).eq('id', id)
  const p = getProdutos().find(x => x.id === id)
  if (p) p.upsell = true
  renderCardapio()
  const el = document.getElementById('upsellAdminLista')
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  toast('✅ Adicionado ao "Peça também"!')
}

export async function removerUpsell(id) {
  await supabase.from('produtos').update({ upsell: false }).eq('id', id)
  const p = getProdutos().find(x => x.id === id)
  if (p) p.upsell = false
  renderCardapio()
  toast('Produto removido do "Peça também"')
}

export async function adicionarBanner(input) {
  if (!input.files?.[0]) return
  const file = input.files[0]
  if (file.size > 20 * 1024 * 1024) { toast('❌ Máximo 20MB'); return }
  if (_banners.length >= 3) { toast('⚠️ Limite de 3 banners'); return }
  toast('⏳ Enviando banner...')
  try {
    const loja = getLoja()
    const blob = await comprimirImagem(file, 1200)
    const path = `${loja.id}/banner_${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage.from('banners').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) throw new Error(upErr.message)
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('banners').insert({ loja_id: loja.id, foto_url: urlData.publicUrl, ordem: _banners.length })
    if (dbErr) throw new Error(dbErr.message)
    await carregarBanners()
    renderCardapio()
    toast('✅ Banner adicionado!')
  } catch(err) {
    toast('❌ Erro: ' + err.message)
  }
}

export async function removerBanner(id) {
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) { toast('❌ Erro ao remover'); return }
  await carregarBanners()
  renderCardapio()
  toast('Banner removido')
}
