// js/painel/painel-config.js — configurações da loja

import { supabase } from '../supabase.js'
import { toast, mascaraTel } from './utils.js'

let _loja = null
export function setLoja(loja) { _loja = loja }

export function renderConfig() {
  const link = `${window.location.origin}/index.html?loja=${_loja.id}`
  document.getElementById('mainBody').innerHTML = `
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
      <label class="cfg-lbl">Tempo de entrega</label>
      <input class="cfg-inp" id="cfgTempo" value="${_loja.tempo_entrega || ''}">
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

export async function salvarConfig() {
  const wpp = document.getElementById('cfgWpp').value.replace(/\D/g, '')
  if (wpp.length > 0 && wpp.length !== 11) { toast('⚠️ WhatsApp deve ter 11 dígitos'); return }
  const updates = {
    nome:          document.getElementById('cfgNome').value,
    descricao:     document.getElementById('cfgDesc').value,
    tempo_entrega: document.getElementById('cfgTempo').value,
    whatsapp:      document.getElementById('cfgWpp').value
  }
  await supabase.from('lojas').update(updates).eq('id', _loja.id)
  Object.assign(_loja, updates)
  const hdLj = document.getElementById('hdLoja'); if (hdLj) hdLj.textContent = _loja.nome
  toast('✅ Configurações salvas!')
}
