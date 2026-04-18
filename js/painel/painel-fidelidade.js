// js/painel/painel-fidelidade.js

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

  <!-- ── PROGRAMA DE PONTOS ── -->
  <div class="cfg-card" style="border-left:3px solid var(--or);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
      <div>
        <div class="cfg-title" style="margin:0;">⭐ Programa de pontos</div>
        <div style="font-size:0.72rem;color:var(--txt3);margin-top:0.15rem;">Recompense seus clientes por cada compra</div>
      </div>
      <button class="toggle ${cfg?.ativo ? 'on' : ''}" id="fidToggle" onclick="toggleFidelidade()"></button>
    </div>

    <!-- Linha 1: tipo de pontuação + valor -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
      <div>
        <label class="cfg-lbl">Como pontuar</label>
        <select class="ep-sel" id="fidTipo" style="margin-bottom:0;" onchange="mostrarCamposPontuacao()">
          <option value="compra"  ${cfg?.tipo_pontuacao !== 'produto' ? 'selected' : ''}>Por valor gasto (R$)</option>
          <option value="produto" ${cfg?.tipo_pontuacao === 'produto'  ? 'selected' : ''}>Por produto comprado</option>
        </select>
      </div>
      <div id="fidCampoCompra" style="display:${cfg?.tipo_pontuacao !== 'produto' ? 'block' : 'none'}">
        <label class="cfg-lbl">1 ponto a cada R$</label>
        <input class="cfg-inp" id="fidValorPonto" type="number" step="1" min="1" value="${cfg?.valor_por_ponto || 10}" style="margin-bottom:0;">
      </div>
      <div id="fidCampoProduto" style="display:${cfg?.tipo_pontuacao === 'produto' ? 'block' : 'none'}">
        <label class="cfg-lbl">Pontos por unidade</label>
        <input class="cfg-inp" id="fidPontosProd" type="number" min="1" value="${cfg?.pontos_por_real || 1}" style="margin-bottom:0;">
      </div>
    </div>

    <!-- Linha 2: meta + recompensa -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
      <div>
        <label class="cfg-lbl">Meta de pontos</label>
        <input class="cfg-inp" id="fidMeta" type="number" min="1" value="${cfg?.meta_pontos || 100}" style="margin-bottom:0;">
      </div>
      <div>
        <label class="cfg-lbl">Tipo de prêmio</label>
        <select class="ep-sel" id="fidRecompensa" style="margin-bottom:0;" onchange="mostrarCampoRecompensa()">
          <option value="desconto_pct"  ${!cfg?.tipo_recompensa || cfg?.tipo_recompensa === 'desconto_pct'  ? 'selected' : ''}>Desconto %</option>
          <option value="desconto_fixo" ${cfg?.tipo_recompensa === 'desconto_fixo' ? 'selected' : ''}>Desconto R$</option>
          <option value="brinde"        ${cfg?.tipo_recompensa === 'brinde'        ? 'selected' : ''}>Brinde</option>
        </select>
      </div>
    </div>

    <!-- Campo condicional da recompensa -->
    <div id="fidCampoDescPct" style="display:${!cfg?.tipo_recompensa || cfg?.tipo_recompensa === 'desconto_pct' ? 'block' : 'none'}">
      <label class="cfg-lbl">Desconto ao resgatar (%)</label>
      <input class="cfg-inp" id="fidPct" type="number" min="1" max="100" value="${cfg?.recompensa_valor || 10}">
    </div>
    <div id="fidCampoDescFixo" style="display:${cfg?.tipo_recompensa === 'desconto_fixo' ? 'block' : 'none'}">
      <label class="cfg-lbl">Desconto ao resgatar (R$)</label>
      <input class="cfg-inp" id="fidFixo" type="number" step="0.01" value="${cfg?.recompensa_valor || 0}">
    </div>
    <div id="fidCampoBrinde" style="display:${cfg?.tipo_recompensa === 'brinde' ? 'block' : 'none'}">
      <label class="cfg-lbl">Descrição do brinde</label>
      <input class="cfg-inp" id="fidBrinde" value="${cfg?.brinde_descricao || ''}" placeholder="Ex: Pizza broto grátis">
    </div>

    <button class="cfg-save" onclick="salvarFidelidade()">Salvar configuração</button>
  </div>

  <!-- ── CRIAR CUPOM ── -->
  <div class="cfg-card">
    <div class="cfg-title" style="margin-bottom:0.75rem;">🎟️ Criar cupom</div>

    <!-- Linha 1: código + tipo + valor juntos -->
    <div style="display:grid;grid-template-columns:2fr 1fr 1.2fr;gap:0.5rem;margin-bottom:0.5rem;">
      <div>
        <label class="cfg-lbl">Código</label>
        <input class="cfg-inp" id="cupomCodigo" placeholder="PROMO10"
          style="text-transform:uppercase;margin-bottom:0;font-weight:700;letter-spacing:1px;"
          oninput="this.value=this.value.toUpperCase()">
      </div>
      <div>
        <label class="cfg-lbl">Tipo</label>
        <select class="ep-sel" id="cupomTipo" style="margin-bottom:0;">
          <option value="pct">%</option>
          <option value="fixo">R$</option>
        </select>
      </div>
      <div>
        <label class="cfg-lbl">Valor</label>
        <input class="cfg-inp" id="cupomValor" type="number" step="0.01" placeholder="10"
          style="margin-bottom:0;">
      </div>
    </div>

    <!-- Linha 2: mínimo + limite (campos opcionais em destaque menor) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.75rem;">
      <div>
        <label class="cfg-lbl">Mínimo do pedido <span style="color:var(--txt3);font-weight:400;">(opcional)</span></label>
        <input class="cfg-inp" id="cupomMinimo" type="number" step="0.01" placeholder="R$ 0,00" style="margin-bottom:0;">
      </div>
      <div>
        <label class="cfg-lbl">Limite de usos <span style="color:var(--txt3);font-weight:400;">(opcional)</span></label>
        <input class="cfg-inp" id="cupomLimite" type="number" placeholder="Ilimitado" style="margin-bottom:0;">
      </div>
    </div>

    <button class="cfg-save" onclick="criarCupom()" style="width:100%;">+ Criar cupom</button>
  </div>

  <!-- ── CUPONS ATIVOS ── -->
  ${listaCupons.length ? `
  <div class="cfg-card">
    <div class="cfg-title">Cupons ativos (${listaCupons.filter(c=>c.ativo).length})</div>
    ${listaCupons.map(c => `
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 0;border-bottom:1px solid #F9FAFB;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:0.4rem;">
            <span style="font-size:0.88rem;font-weight:800;color:var(--txt);letter-spacing:0.5px;">${c.codigo}</span>
            <span style="font-size:0.72rem;background:#FFF7ED;color:var(--or);border-radius:5px;padding:0.1rem 0.4rem;font-weight:700;">
              ${c.tipo === 'pct' ? c.valor + '%' : 'R$' + Number(c.valor).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div style="font-size:0.7rem;color:var(--txt3);margin-top:0.1rem;">
            ${c.usos_atual || 0}${c.limite_usos ? '/'+c.limite_usos : ''} usos
            ${c.validade ? ' · até ' + new Date(c.validade).toLocaleDateString('pt-BR') : ''}
            ${c.minimo_pedido > 0 ? ' · mín R$'+Number(c.minimo_pedido).toFixed(2).replace('.',',') : ''}
          </div>
        </div>
        <button class="toggle ${c.ativo ? 'on' : ''}" onclick="toggleCupom('${c.id}',${!c.ativo})"></button>
        <button class="ce-del" onclick="deletarCupom('${c.id}')">🗑️</button>
      </div>`).join('')}
  </div>` : ''}

  <!-- ── CLIENTES ── -->
  <div class="cfg-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${lista.length ? '0.75rem' : '0'};">
      <div class="cfg-title" style="margin:0;">👥 Clientes (${lista.length})</div>
    </div>
    ${lista.length === 0
      ? `<div style="font-size:0.82rem;color:var(--txt3);text-align:center;padding:1rem 0;">
           Nenhum cliente ainda. Aparecem após o primeiro pedido.
         </div>`
      : `<textarea id="transmissaoMsg"
           style="width:100%;border:1.5px solid #E7E5E4;border-radius:9px;padding:0.5rem 0.75rem;
                  font-family:'Poppins',sans-serif;font-size:0.82rem;height:64px;resize:none;
                  margin-bottom:0.5rem;outline:none;"
           placeholder="Mensagem em massa via WhatsApp para todos os clientes..."></textarea>
         <button class="cfg-save" style="width:100%;margin-bottom:0.85rem;" onclick="enviarTransmissao()">
           📣 Enviar para todos (${lista.length})
         </button>
         <div style="max-height:280px;overflow-y:auto;">
           ${lista.map(c => `
             <div style="display:flex;align-items:center;gap:0.5rem;padding:0.55rem 0;border-bottom:1px solid #F9FAFB;">
               <div style="flex:1;min-width:0;">
                 <div style="font-size:0.83rem;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.nome}</div>
                 <div style="font-size:0.7rem;color:var(--txt3);">${c.telefone} · ${c.total_pedidos||0} pedidos · ${fmt(c.total_gasto||0)}</div>
               </div>
               <span style="background:#FFF7ED;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.72rem;font-weight:700;color:#C2410C;flex-shrink:0;">⭐ ${c.total_pontos||0}</span>
               <a href="https://wa.me/55${c.telefone}?text=${encodeURIComponent('Olá '+c.nome+'! 👋')}"
                  target="_blank"
                  style="background:#DCFCE7;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.72rem;font-weight:700;color:#15803D;text-decoration:none;flex-shrink:0;">WA</a>
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
  if (recompensa === 'desconto_pct')  recompensaValor = parseFloat(document.getElementById('fidPct')?.value)  || 10
  if (recompensa === 'desconto_fixo') recompensaValor = parseFloat(document.getElementById('fidFixo')?.value) || 0
  const { error } = await supabase.from('fidelidade_config').upsert({
    loja_id:         _loja.id,
    tipo_pontuacao:  tipo,
    valor_por_ponto: parseFloat(document.getElementById('fidValorPonto')?.value) || 10,
    pontos_por_real: parseFloat(document.getElementById('fidPontosProd')?.value) || 1,
    meta_pontos:     parseInt(document.getElementById('fidMeta').value) || 100,
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
  if (!codigo)          { toast('⚠️ Digite o código do cupom'); return }
  if (!valor || valor <= 0) { toast('⚠️ Digite o valor do desconto'); return }
  const { error } = await supabase.from('cupons').insert({
    loja_id:       _loja.id,
    codigo,
    tipo:          document.getElementById('cupomTipo').value,
    valor,
    minimo_pedido: parseFloat(document.getElementById('cupomMinimo').value) || 0,
    limite_usos:   parseInt(document.getElementById('cupomLimite').value) || null,
    ativo:         true
  })
  if (error) { toast(error.code === '23505' ? '❌ Código já existe' : '❌ Erro ao criar'); return }
  document.getElementById('cupomCodigo').value = ''
  document.getElementById('cupomValor').value  = ''
  document.getElementById('cupomMinimo').value = ''
  document.getElementById('cupomLimite').value = ''
  toast('✅ Cupom criado!')
  renderFidelidade()
}

export async function toggleCupom(id, novoValor) {
  await supabase.from('cupons').update({ ativo: novoValor }).eq('id', id)
  toast(novoValor ? '✅ Ativado' : '⚫ Desativado')
  renderFidelidade()
}

export async function deletarCupom(id) {
  if (!confirm('Excluir este cupom?')) return
  await supabase.from('cupons').delete().eq('id', id)
  toast('🗑️ Cupom excluído')
  renderFidelidade()
}

export async function enviarTransmissao() {
  const msg = document.getElementById('transmissaoMsg')?.value.trim()
  if (!msg) { toast('⚠️ Digite a mensagem'); return }
  const { data: clientes } = await supabase.from('clientes').select('nome,telefone').eq('loja_id', _loja.id)
  if (!clientes?.length) { toast('⚠️ Nenhum cliente na base'); return }
  await supabase.from('transmissoes').insert({ loja_id: _loja.id, mensagem: msg, total_envios: clientes.length })
  if (!confirm(`Serão abertos ${clientes.length} chats no WhatsApp.\n\nContinuar?`)) return
  let i = 0
  function abrirProximo() {
    if (i >= clientes.length) { toast(`✅ ${clientes.length} mensagens enviadas!`); return }
    const cl = clientes[i]
    window.open(`https://wa.me/55${cl.telefone.replace(/\D/g,'')}?text=${encodeURIComponent('Olá '+cl.nome+'! 👋\n\n'+msg)}`, '_blank')
    i++
    if (i < clientes.length) { toast(`📣 ${i}/${clientes.length}...`); setTimeout(abrirProximo, 1200) }
    else toast(`✅ ${clientes.length} mensagens enviadas!`)
  }
  abrirProximo()
}
