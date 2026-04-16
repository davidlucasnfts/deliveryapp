// js/painel/painel-config.js — configurações da loja

import { supabase } from '../supabase.js'
import { toast, mascaraTel } from './utils.js'

let _loja = null
export function setLoja(loja) { _loja = loja }

export function renderConfig() {
  const link = `${window.location.origin}/index.html?loja=${_loja.id}`
  document.getElementById('mainBody').innerHTML = `
    <div class="cfg-card" style="border-color:var(--or);">
      <div class="cfg-title">💳 Pagamentos</div>
      <p style="font-size:0.78rem;color:var(--txt2);margin-bottom:0.75rem;">Configure PIX, cartão e seu gateway</p>
      <a href="pagamento.html" style="display:inline-block;background:var(--or);color:#fff;border-radius:9px;padding:0.48rem 1.1rem;font-size:0.8rem;font-weight:700;text-decoration:none;">Configurar pagamentos →</a>
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
  document.getElementById('hStoreName').textContent = _loja.nome
  toast('✅ Configurações salvas!')
}
