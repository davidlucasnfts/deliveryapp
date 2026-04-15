// js/painel/painel-fidelidade.js — pontos, cupons, clientes, transmissão

import { supabase } from '../supabase.js'
import { fmt, toast } from './utils.js'

let _loja = null
export function setLoja(loja) { _loja = loja }

export async function renderFidelidade() {
  const [{ data: cfg }, { data: clientes }, { data: cupons }] = await Promise.all([
    supabase.from('fidelidade_config').select('*').eq('loja_id', _loja.id).single(),
    supabase.from('clientes').select('*').eq('loja_id', _loja.id).order('total_pontos', { ascending: false }),
    supabase.from('cupons').select('*').eq('loja_id', _loja.id).order('criado_em', { ascending: false })
  ])
  const lista = clientes || []
  const listaCupons = cupons || []

  document.getElementById('mainBody').innerHTML = `
    <!-- PONTOS -->
    <div class="cfg-card" style="border:1.5px solid var(--or);">
      <div class="cfg-title">⭐ Programa de pontos</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <span style="font-size:0.82rem;color:var(--txt);">Programa ativo</span>
        <button class="toggle ${cfg?.ativo ? 'on' : ''}" id="fidToggle" onclick="toggleFidelidade()"></button>
      </div>
      <label class="cfg-lbl">Tipo de pontuação</label>
      <select class="ep-sel" id="fidTipo" style="margin-bottom:0.65rem;" onchange="mostrarCamposPontuacao()">
        <option value="compra"  ${cfg?.tipo_pontuacao === 'compra'  ? 'selected' : ''}>Por compra (R$ gasto)</option>
        <option value="produto" ${cfg?.tipo_pontuacao === 'produto' ? 'selected' : ''}>Por produto (un. comprada)</option>
      </select>
      <div id="fidCampoCompra" style="display:${cfg?.tipo_pontuacao !== 'produto' ? 'block' : 'none'}">
        <label class="cfg-lbl">1 ponto a cada quantos reais?</label>
        <input class="cfg-inp" id="fidValorPonto" type="number" step="0.01" value="${cfg?.valor_por_ponto || 10}">
      </div>
      <div id="fidCampoProduto" style="display:${cfg?.tipo_pontuacao === 'produto' ? 'block' : 'none'}">
        <label class="cfg-lbl">Pontos por produto comprado</label>
        <input class="cfg-inp" id="fidPontosProd" type="number" value="${cfg?.pontos_por_real || 1}">
      </div>
      <label class="cfg-lbl">Meta de pontos para resgatar</label>
      <input class="cfg-inp" id="fidMeta" type="number" value="${cfg?.meta_pontos || 100}">
      <label class="cfg-lbl">Tipo de recompensa</label>
      <select class="ep-sel" id="fidRecompensa" style="margin-bottom:0.65rem;" onchange="mostrarCampoRecompensa()">
        <option value="desconto_pct"  ${cfg?.tipo_recompensa === 'desconto_pct'  ? 'selected' : ''}>Desconto em %</option>
        <option value="desconto_fixo" ${cfg?.tipo_recompensa === 'desconto_fixo' ? 'selected' : ''}>Desconto em R$ fixo</option>
        <option value="brinde"        ${cfg?.tipo_recompensa === 'brinde'        ? 'selected' : ''}>Brinde</option>
      </select>
      <div id="fidCampoDescPct"  style="display:${!cfg?.tipo_recompensa || cfg?.tipo_recompensa === 'desconto_pct' ? 'block' : 'none'}">
        <label class="cfg-lbl">Percentual de desconto (%)</label>
        <input class="cfg-inp" id="fidPct" type="number" value="${cfg?.recompensa_valor || 10}">
      </div>
      <div id="fidCampoDescFixo" style="display:${cfg?.tipo_recompensa === 'desconto_fixo' ? 'block' : 'none'}">
        <label class="cfg-lbl">Valor do desconto (R$)</label>
        <input class="cfg-inp" id="fidFixo" type="number" step="0.01" value="${cfg?.recompensa_valor || 0}">
      </div>
      <div id="fidCampoBrinde"   style="display:${cfg?.tipo_recompensa === 'brinde' ? 'block' : 'none'}">
        <label class="cfg-lbl">Descrição do brinde</label>
        <input class="cfg-inp" id="fidBrinde" value="${cfg?.brinde_descricao || ''}" placeholder="Ex: Pizza broto grátis">
      </div>
      <button class="cfg-save" onclick="salvarFidelidade()">Salvar configuração</button>
    </div>

    <!-- CUPONS -->
    <div class="cfg-card">
      <div class="cfg-title">🎟️ Criar cupom</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.65rem;">
        <div><label class="cfg-lbl">Código</label><input class="cfg-inp" id="cupomCodigo" placeholder="EX: PROMO10" style="text-transform:uppercase;margin-bottom:0;" oninput="this.value=this.value.toUpperCase()"></div>
        <div><label class="cfg-lbl">Tipo</label><select class="ep-sel" id="cupomTipo" style="margin-bottom:0;"><option value="pct">%</option><option value="fixo">R$ fixo</option></select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.65rem;">
        <div><label class="cfg-lbl">Valor</label><input class="cfg-inp" id="cupomValor" type="number" step="0.01" placeholder="Ex: 10" style="margin-bottom:0;"></div>
        <div><label class="cfg-lbl">Pedido mínimo (R$)</label><input class="cfg-inp" id="cupomMinimo" type="number" step="0.01" placeholder="0" style="margin-bottom:0;"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.65rem;">
        <div><label class="cfg-lbl">Validade</label><input class="cfg-inp" id="cupomValidade" type="date" style="margin-bottom:0;"></div>
        <div><label class="cfg-lbl">Limite de usos</label><input class="cfg-inp" id="cupomLimite" type="number" placeholder="∞" style="margin-bottom:0;"></div>
      </div>
      <label class="cfg-lbl">Descrição</label>
      <input class="cfg-inp" id="cupomDesc" placeholder="Ex: Promoção de fim de semana">
      <button class="cfg-save" onclick="criarCupom()">Criar cupom</button>
    </div>

    ${listaCupons.length ? `
    <div class="cfg-card">
      <div class="cfg-title">🎟️ Cupons ativos</div>
      ${listaCupons.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid #F9FAFB;">
          <div>
            <div style="font-size:0.85rem;font-weight:700;color:var(--txt);">${c.codigo}</div>
            <div style="font-size:0.72rem;color:var(--txt3);">${c.tipo === 'pct' ? c.valor + '%' : 'R$' + Number(c.valor).toFixed(2).replace('.', ',')} · ${c.usos_atual || 0}/${c.limite_usos || '∞'} usos${c.validade ? ' · até ' + new Date(c.validade).toLocaleDateString('pt-BR') : ''}</div>
          </div>
          <div style="display:flex;gap:0.35rem;">
            <button class="toggle ${c.ativo ? 'on' : ''}" onclick="toggleCupom('${c.id}',${!c.ativo})"></button>
            <button class="ce-del" onclick="deletarCupom('${c.id}')">🗑️</button>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <!-- BASE DE CLIENTES -->
    <div class="cfg-card">
      <div class="cfg-title">👥 Base de clientes (${lista.length})</div>
      ${lista.length === 0
        ? `<div style="font-size:0.82rem;color:var(--txt3);text-align:center;padding:1rem;">Nenhum cliente ainda.<br>Aparecem após o primeiro pedido.</div>`
        : `<div style="margin-bottom:0.75rem;">
            <label class="cfg-lbl">Mensagem para envio em massa</label>
            <textarea id="transmissaoMsg" style="width:100%;border:1.5px solid #E7E5E4;border-radius:9px;padding:0.5rem 0.75rem;font-family:'Poppins',sans-serif;font-size:0.82rem;height:70px;resize:none;" placeholder="Ex: 🍕 Promoção! 20% de desconto hoje. Use o cupom PROMO20"></textarea>
            <button class="cfg-save" style="margin-top:0.5rem;width:100%;" onclick="enviarTransmissao()">📣 Enviar para todos (${lista.length})</button>
          </div>
          <div style="max-height:300px;overflow-y:auto;">
            ${lista.map(c => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0;border-bottom:1px solid #F9FAFB;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.83rem;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.nome}</div>
                  <div style="font-size:0.7rem;color:var(--txt3);">${c.telefone} · ${c.total_pedidos || 0} pedidos · ${fmt(c.total_gasto || 0)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
                  <div style="background:#FFF7ED;border-radius:8px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;color:#C2410C;">⭐ ${c.total_pontos || 0}</div>
                  <a href="https://wa.me/55${c.telefone}?text=${encodeURIComponent('Olá ' + c.nome + '! 👋')}" target="_blank" style="background:#DCFCE7;border-radius:8px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;color:#15803D;text-decoration:none;">WhatsApp</a>
                </div>
              </div>`).join('')}
          </div>`}
    </div>`
}

export function mostrarCamposPontuacao() {
  const v = document.getElementById('fidTipo').value
  document.getElementById('fidCampoCompra').style.display  = v === 'compra'  ? 'block' : 'none'
  document.getElementById('fidCampoProduto').style.display = v === 'produto' ? 'block' : 'none'
}

export function mostrarCampoRecompensa() {
  const v = document.getElementById('fidRecompensa').value
  document.getElementById('fidCampoDescPct').style.display  = v === 'desconto_pct'  ? 'block' : 'none'
  document.getElementById('fidCampoDescFixo').style.display = v === 'desconto_fixo' ? 'block' : 'none'
  document.getElementById('fidCampoBrinde').style.display   = v === 'brinde'        ? 'block' : 'none'
}

export async function toggleFidelidade() {
  const novoVal = !document.getElementById('fidToggle').classList.contains('on')
  document.getElementById('fidToggle').classList.toggle('on')
  await supabase.from('fidelidade_config').upsert({ loja_id: _loja.id, ativo: novoVal }, { onConflict: 'loja_id' })
  toast(novoVal ? '✅ Programa ativado' : '⚫ Programa desativado')
}

export async function salvarFidelidade() {
  const tipo      = document.getElementById('fidTipo').value
  const recompensa = document.getElementById('fidRecompensa').value
  let recompensaValor = 0
  if (recompensa === 'desconto_pct')  recompensaValor = parseFloat(document.getElementById('fidPct').value)  || 10
  if (recompensa === 'desconto_fixo') recompensaValor = parseFloat(document.getElementById('fidFixo').value) || 0
  const { error } = await supabase.from('fidelidade_config').upsert({
    loja_id: _loja.id,
    tipo_pontuacao: tipo,
    valor_por_ponto: parseFloat(document.getElementById('fidValorPonto')?.value) || 10,
    pontos_por_real: parseFloat(document.getElementById('fidPontosProd')?.value) || 1,
    meta_pontos: parseInt(document.getElementById('fidMeta').value) || 100,
    tipo_recompensa: recompensa,
    recompensa_valor: recompensaValor,
    brinde_descricao: document.getElementById('fidBrinde')?.value || null,
    ativo: document.getElementById('fidToggle').classList.contains('on')
  }, { onConflict: 'loja_id' })
  if (error) { toast('❌ Erro ao salvar'); return }
  toast('✅ Configuração salva!')
  renderFidelidade()
}

export async function criarCupom() {
  const codigo = document.getElementById('cupomCodigo').value.trim().toUpperCase()
  const valor  = parseFloat(document.getElementById('cupomValor').value)
  if (!codigo) { toast('⚠️ Digite o código'); return }
  if (!valor || valor <= 0) { toast('⚠️ Digite o valor do desconto'); return }
  const { error } = await supabase.from('cupons').insert({
    loja_id: _loja.id, codigo,
    tipo: document.getElementById('cupomTipo').value,
    valor,
    minimo_pedido: parseFloat(document.getElementById('cupomMinimo').value) || 0,
    validade: document.getElementById('cupomValidade').value || null,
    limite_usos: parseInt(document.getElementById('cupomLimite').value) || null,
    descricao: document.getElementById('cupomDesc').value || null,
    ativo: true
  })
  if (error) { toast(error.code === '23505' ? '❌ Código já existe' : '❌ Erro ao criar cupom'); return }
  toast('✅ Cupom criado!'); renderFidelidade()
}

export async function toggleCupom(id, novoValor) {
  await supabase.from('cupons').update({ ativo: novoValor }).eq('id', id)
  toast(novoValor ? '✅ Cupom ativado' : '⚫ Cupom desativado'); renderFidelidade()
}

export async function deletarCupom(id) {
  if (!confirm('Excluir este cupom?')) return
  await supabase.from('cupons').delete().eq('id', id)
  toast('🗑️ Cupom excluído'); renderFidelidade()
}

export async function enviarTransmissao() {
  const msg = document.getElementById('transmissaoMsg')?.value.trim()
  if (!msg) { toast('⚠️ Digite a mensagem'); return }
  const { data: clientes } = await supabase.from('clientes').select('nome,telefone').eq('loja_id', _loja.id)
  if (!clientes?.length) { toast('⚠️ Nenhum cliente na base'); return }
  await supabase.from('transmissoes').insert({ loja_id: _loja.id, mensagem: msg, total_envios: clientes.length })
  let i = 0
  function abrirProximo() {
    if (i >= clientes.length) return
    const c = clientes[i]
    window.open(`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá ' + c.nome + '! 👋\n\n' + msg)}`, '_blank')
    i++
    if (i < clientes.length) { toast(`📣 ${i}/${clientes.length}...`); setTimeout(abrirProximo, 1200) }
    else toast(`✅ ${clientes.length} mensagens enviadas!`)
  }
  if (confirm(`Serão abertos ${clientes.length} chats no WhatsApp.\n\nContinuar?`)) abrirProximo()
}
