// js/painel/painel-config.js — configurações da loja

import { supabase } from '../supabase.js'
import { toast, mascaraTel } from './utils.js'

let _loja = null
export function setLoja(loja) { _loja = loja }

export function renderConfig() {
  const link = `${window.location.origin}/index.html?loja=${_loja.id}`
  document.getElementById('mainBody').innerHTML = `

    <div class="cfg-card">
      <div class="cfg-title">🎨 Identidade Visual</div>

      <label class="cfg-lbl">Cor principal</label>
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.85rem;">
        <input type="color" id="cfgCor" value="${_loja.cor_primaria||'#E85000'}"
          style="width:48px;height:48px;border:none;border-radius:10px;cursor:pointer;padding:3px;background:var(--bg3);">
        <div>
          <div style="font-size:0.82rem;font-weight:700;color:var(--txt);">Cor dos botões e destaques</div>
          <div style="font-size:0.7rem;color:var(--txt3);">Aplicada em todo o cardápio do cliente</div>
        </div>
      </div>
      <button class="cfg-save" style="margin-bottom:1.1rem;" onclick="salvarIdentidade()">Salvar cor</button>

      <label class="cfg-lbl">Logo da loja</label>
      <div class="id-upload-area">
        ${_loja.logo_url
          ? `<img src="${_loja.logo_url}" class="id-logo-preview" id="idLogoImg" onerror="this.style.display='none'">`
          : `<div class="id-logo-ph" id="idLogoImg">🏪</div>`}
        <div style="flex:1;">
          <input type="file" id="logoFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="uploadLogo(this)">
          <button class="cfg-save" style="width:100%;margin-bottom:0.3rem;" onclick="document.getElementById('logoFileInput').click()">
            📷 ${_loja.logo_url ? 'Trocar logo' : 'Enviar logo'}
          </button>
          <div style="font-size:0.68rem;color:var(--txt3);margin-bottom:0.3rem;">Imagem quadrada · JPG/PNG · até 5MB</div>
          ${_loja.logo_url ? `<button onclick="removerLogo()" class="btn-excluir" style="margin-top:0;padding:0.3rem 0.75rem;font-size:0.72rem;">🗑️ Remover</button>` : ''}
        </div>
      </div>

      <label class="cfg-lbl">Foto de capa</label>
      ${_loja.foto_capa_url
        ? `<img src="${_loja.foto_capa_url}" class="id-capa-preview" onerror="this.style.display='none'">`
        : `<div class="id-capa-ph">📸 Aparece como fundo do header no cardápio</div>`}
      <input type="file" id="capaFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="uploadCapa(this)">
      <button class="cfg-save" style="margin-top:0.5rem;margin-bottom:0.35rem;" onclick="document.getElementById('capaFileInput').click()">
        🖼️ ${_loja.foto_capa_url ? 'Trocar foto de capa' : 'Enviar foto de capa'}
      </button>
      ${_loja.foto_capa_url ? `<button onclick="removerCapa()" class="btn-excluir" style="margin-top:0;padding:0.3rem 0.75rem;font-size:0.72rem;">🗑️ Remover capa</button>` : ''}
    </div>

    <div class="cfg-card" style="border-color:var(--or);">
      <div class="cfg-title">Formas de pagamento</div>
      <p style="font-size:0.78rem;color:var(--txt2);margin-bottom:0.85rem;">Configure o que aparece para o cliente na hora de pagar</p>

      <!-- PIX -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
        <div>
          <div style="font-size:0.83rem;font-weight:700;color:var(--txt);">PIX</div>
          <div style="font-size:0.72rem;color:var(--txt3);">Pagamento instantâneo</div>
        </div>
        <button class="toggle ${_loja.pix_ativo?'on':''}" id="togPix" onclick="togglePgto('pix')"></button>
      </div>
      <div id="pixChaveWrap" style="display:${_loja.pix_ativo?'block':'none'};margin-bottom:0.85rem;">
        <label class="cfg-lbl">Chave PIX</label>
        <input class="cfg-inp" id="cfgPixChave" value="${_loja.chave_pix||''}" placeholder="CPF, CNPJ, telefone ou e-mail">
      </div>

      <!-- CARTÃO ONLINE — Mercado Pago -->
      <div style="background:var(--bg3);border-radius:12px;padding:0.85rem;margin-bottom:0.85rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem;">
          <div>
            <div style="font-size:0.83rem;font-weight:700;color:var(--txt);">Cartão online (crédito/débito)</div>
            <div style="font-size:0.72rem;color:var(--txt3);">Via Mercado Pago · aprovação imediata</div>
          </div>
          <button class="toggle ${_loja.mp_ativo?'on':''}" id="togMP" onclick="togglePgto('mp')"></button>
        </div>
        <div id="mpWrap" style="display:${_loja.mp_ativo?'block':'none'};">
          <label class="cfg-lbl">Public Key do Mercado Pago</label>
          <input class="cfg-inp" id="cfgMpPublicKey" value="${_loja.mp_public_key||''}" placeholder="TEST-xxxxxxxx ou APP_USR-xxxxxxxx" style="font-size:0.75rem;">
          <label class="cfg-lbl">Access Token do Mercado Pago</label>
          <input class="cfg-inp" id="cfgMpToken" value="${_loja.mp_access_token||''}" placeholder="TEST-xxxx... ou APP_USR-xxxx..." style="font-size:0.75rem;" type="password">
          <p style="font-size:0.7rem;color:var(--txt3);margin-top:-0.3rem;margin-bottom:0.5rem;">
            Pegue em mercadopago.com.br → Seu negócio → Credenciais
          </p>
        </div>
      </div>

      <!-- DINHEIRO / CARTÃO PRESENCIAL -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
        <div>
          <div style="font-size:0.83rem;font-weight:700;color:var(--txt);">Dinheiro ou cartão na entrega</div>
          <div style="font-size:0.72rem;color:var(--txt3);">Pagamento presencial ao receber</div>
        </div>
        <button class="toggle ${_loja.dinheiro_ativo!==false?'on':''}" id="togDinheiro" onclick="togglePgto('dinheiro')"></button>
      </div>

      <button class="cfg-save" onclick="salvarPagamento()">Salvar formas de pagamento</button>
    </div>
    <div class="cfg-card">
      <div class="cfg-title">Link do cardápio</div>
      <div class="link-box" id="linkBox">${link}</div>
      <button class="copy-link" onclick="copiarLink()">📋 Copiar link</button>
    </div>
    <div class="cfg-card">
      <div class="cfg-title">Informações da loja</div>
      <label class="cfg-lbl">Nome</label>
      <input class="cfg-inp" id="cfgNome" value="${_loja.nome || ''}">
      <label class="cfg-lbl">Descrição</label>
      <input class="cfg-inp" id="cfgDesc" value="${_loja.descricao || ''}">
      <label class="cfg-lbl">Tempo de entrega (ex: 35-50 min)</label>
      <input class="cfg-inp" id="cfgTempo" value="${_loja.tempo_entrega || ''}" placeholder="35-50 min">
      <label class="cfg-lbl">Cidade</label>
      <input class="cfg-inp" id="cfgCidade" value="${_loja.cidade || ''}" placeholder="São Luís">
      <label class="cfg-lbl">WhatsApp (com DDD)</label>
      <div class="field-wrap">
        <input class="cfg-inp" id="cfgWpp" value="${_loja.whatsapp || ''}" type="tel"
          maxlength="15" placeholder="(99) 99999-9999"
          oninput="mascaraTelCfg(this)">
        <span class="field-icon" id="iconWpp"></span>
        <div class="field-msg" id="msgWpp"></div>
      </div>
      <button class="cfg-save" onclick="salvarConfig()">Salvar</button>
    </div>
    <div class="cfg-card">
      <div class="cfg-title">Funcionamento</div>
      <div class="cfg-row" style="margin-bottom:0.75rem;">
        <span style="font-size:0.82rem;color:var(--txt);">Loja aberta agora</span>
        <button class="toggle ${_loja.aberta ? 'on' : ''}" onclick="toggleLoja()"></button>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;">
        <div style="font-size:0.75rem;font-weight:700;color:var(--txt2);margin-bottom:0.6rem;">⏰ Horário automático (opcional)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
          <div>
            <label class="cfg-lbl">Abre às</label>
            <input class="cfg-inp" id="cfgAbre" type="time" value="${_loja.hora_abre||''}" style="margin-bottom:0;">
          </div>
          <div>
            <label class="cfg-lbl">Fecha às</label>
            <input class="cfg-inp" id="cfgFecha" type="time" value="${_loja.hora_fecha||''}" style="margin-bottom:0;">
          </div>
        </div>
        <p style="font-size:0.7rem;color:var(--txt3);">Se preenchido, a loja abre e fecha automaticamente nestes horários.</p>
      </div>
      <button class="cfg-save" onclick="salvarHorario()">Salvar horário</button>
    </div>`
}

export async function carregarTaxas() {
  const { data: taxas } = await supabase.from('taxas_entrega').select('*').eq('loja_id', _loja.id).eq('ativo', true).order('bairro')
  const lista = document.getElementById('taxasLista')
  if (!lista) return
  if (!taxas?.length) { lista.innerHTML = '<div style="font-size:0.78rem;color:var(--txt3);text-align:center;padding:0.5rem;">Nenhuma taxa cadastrada — entrega a combinar</div>'; return }
  lista.innerHTML = taxas.map(t => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #F9FAFB;">
      <div style="font-size:0.83rem;font-weight:600;color:var(--txt);">${t.bairro}</div>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <div style="font-size:0.83rem;font-weight:700;color:var(--or);">${t.taxa===0?'Grátis':'R$'+Number(t.taxa).toFixed(2).replace('.',',')}</div>
        <button onclick="excluirTaxa('${t.id}')" style="background:#FEE2E2;color:#B91C1C;border:none;border-radius:7px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.72rem;">🗑️</button>
      </div>
    </div>`).join('')
}

export async function adicionarTaxa() {
  const bairro = document.getElementById('novoBairro')?.value.trim()
  const taxa   = parseFloat(document.getElementById('novaTaxa')?.value) || 0
  if (!bairro) { toast('⚠️ Digite o nome do bairro'); return }
  const { error } = await supabase.from('taxas_entrega').insert({ loja_id: _loja.id, bairro, taxa, ativo: true })
  if (error) { toast('❌ Erro ao adicionar'); return }
  document.getElementById('novoBairro').value = ''
  document.getElementById('novaTaxa').value   = ''
  await carregarTaxas()
  toast('✅ Taxa adicionada!')
}

export async function excluirTaxa(id) {
  await supabase.from('taxas_entrega').delete().eq('id', id)
  await carregarTaxas(); toast('🗑️ Taxa removida')
}

export function togglePgto(tipo) {
  const ids = {pix:'togPix', mp:'togMP', dinheiro:'togDinheiro'}
  const btn = document.getElementById(ids[tipo])
  if (!btn) return
  btn.classList.toggle('on')
  const on = btn.classList.contains('on')
  if (tipo === 'pix') {
    const wrap = document.getElementById('pixChaveWrap')
    if (wrap) wrap.style.display = on ? 'block' : 'none'
  }
  if (tipo === 'mp') {
    const wrap = document.getElementById('mpWrap')
    if (wrap) wrap.style.display = on ? 'block' : 'none'
  }
}

export async function salvarPagamento() {
  const pixAtivo  = document.getElementById('togPix')?.classList.contains('on')
  const mpAtivo   = document.getElementById('togMP')?.classList.contains('on')
  const dinAtivo  = document.getElementById('togDinheiro')?.classList.contains('on')
  const chavePix  = document.getElementById('cfgPixChave')?.value.trim()
  const mpPubKey  = document.getElementById('cfgMpPublicKey')?.value.trim()
  const mpToken   = document.getElementById('cfgMpToken')?.value.trim()

  if (pixAtivo && !chavePix) { toast('Informe a chave PIX'); return }
  if (mpAtivo && (!mpPubKey || !mpToken)) { toast('Informe a Public Key e o Access Token do Mercado Pago'); return }

  const updates = {
    pix_ativo:      pixAtivo || false,
    mp_ativo:       mpAtivo || false,
    dinheiro_ativo: dinAtivo !== false,
    chave_pix:      chavePix || null,
    mp_public_key:  mpPubKey || null,
    mp_access_token: mpToken || null
  }
  await supabase.from('lojas').update(updates).eq('id', _loja.id)
  Object.assign(_loja, updates)
  toast('Formas de pagamento salvas!')
}

export function mascaraTelCfg(input) {
  mascaraTel(input)
  const icon = document.getElementById('iconWpp')
  const msg  = document.getElementById('msgWpp')
  const digits = input.value.replace(/\D/g, '')
  if (digits.length === 11) {
    icon.textContent = '✓'; icon.style.color = 'var(--green)'; msg.style.display = 'none'
  } else if (digits.length > 0) {
    icon.textContent = '✗'; icon.style.color = 'var(--red)'
    msg.textContent = 'Celular deve ter 11 dígitos'; msg.className = 'field-msg show'
  } else {
    icon.textContent = ''; msg.style.display = 'none'
  }
}

export function copiarLink() {
  navigator.clipboard.writeText(document.getElementById('linkBox').textContent)
  toast('✅ Link copiado!')
}

export async function renderTaxasConfig() {
  await carregarTaxas()
}

export async function salvarHorario() {
  const abre  = document.getElementById('cfgAbre').value
  const fecha = document.getElementById('cfgFecha').value
  await supabase.from('lojas').update({ hora_abre: abre||null, hora_fecha: fecha||null }).eq('id', _loja.id)
  Object.assign(_loja, { hora_abre: abre, hora_fecha: fecha })
  toast(abre && fecha ? `✅ Horário salvo — abre ${abre}, fecha ${fecha}` : '✅ Horário automático removido')
}

export async function salvarIdentidade() {
  const cor = document.getElementById('cfgCor')?.value || '#E85000'
  await supabase.from('lojas').update({ cor_primaria: cor }).eq('id', _loja.id)
  _loja.cor_primaria = cor
  toast('✅ Cor salva!')
}

async function _uploadImagem(file, path, maxMB) {
  if (!file) return null
  if (file.size > maxMB * 1024 * 1024) { toast(`⚠️ Máximo ${maxMB}MB`); return null }
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
  if (error) { toast('❌ Erro ao enviar imagem'); return null }
  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
  return publicUrl
}

export async function uploadLogo(input) {
  const file = input.files[0]; if (!file) return
  toast('⏳ Enviando logo...')
  const ext = file.name.split('.').pop()
  const url = await _uploadImagem(file, `logos/${_loja.id}/logo.${ext}`, 5)
  if (!url) return
  await supabase.from('lojas').update({ logo_url: url }).eq('id', _loja.id)
  _loja.logo_url = url
  renderConfig()
  toast('✅ Logo salvo!')
}

export async function uploadCapa(input) {
  const file = input.files[0]; if (!file) return
  toast('⏳ Enviando capa...')
  const ext = file.name.split('.').pop()
  const url = await _uploadImagem(file, `capas/${_loja.id}/capa.${ext}`, 10)
  if (!url) return
  await supabase.from('lojas').update({ foto_capa_url: url }).eq('id', _loja.id)
  _loja.foto_capa_url = url
  renderConfig()
  toast('✅ Foto de capa salva!')
}

export async function removerLogo() {
  await supabase.from('lojas').update({ logo_url: null }).eq('id', _loja.id)
  _loja.logo_url = null; renderConfig(); toast('🗑️ Logo removido')
}

export async function removerCapa() {
  await supabase.from('lojas').update({ foto_capa_url: null }).eq('id', _loja.id)
  _loja.foto_capa_url = null; renderConfig(); toast('🗑️ Capa removida')
}

export async function salvarConfig() {
  const wpp = document.getElementById('cfgWpp').value.replace(/\D/g, '')
  if (wpp.length > 0 && wpp.length !== 11) { toast('⚠️ WhatsApp deve ter 11 dígitos'); return }
  const updates = {
    nome:          document.getElementById('cfgNome').value,
    descricao:     document.getElementById('cfgDesc').value,
    tempo_entrega: document.getElementById('cfgTempo').value,
    cidade:        document.getElementById('cfgCidade').value,
    whatsapp:      document.getElementById('cfgWpp').value
  }
  await supabase.from('lojas').update(updates).eq('id', _loja.id)
  Object.assign(_loja, updates)
  const hdLj = document.getElementById('hdLoja'); if (hdLj) hdLj.textContent = _loja.nome
  toast('✅ Configurações salvas!')
}
