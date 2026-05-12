// js/painel/painel-lgpd.js — gestão de dados pessoais (LGPD art. 18)

import { supabase } from '../supabase.js'
import { toast } from './utils.js'

let _lojaId = null
export function setLojaLGPD(id) { _lojaId = id }

export async function buscarClienteLGPD() {
  const tel = document.getElementById('lgpdTel')?.value.replace(/\D/g, '')
  if (!tel || tel.length < 10) { toast('⚠️ Digite o telefone do cliente'); return }

  const res = document.getElementById('lgpdResultado')
  res.innerHTML = '<div style="font-size:0.78rem;color:var(--txt3);padding:0.5rem 0;">Buscando...</div>'

  const { data: c } = await supabase
    .from('clientes')
    .select('id,nome,telefone,endereco_rua,endereco_bairro,endereco_cidade,total_pedidos,lgpd_consent_em,anonimizado_em')
    .eq('loja_id', _lojaId).eq('telefone', tel).single()

  if (!c) {
    res.innerHTML = '<div style="font-size:0.78rem;color:var(--txt3);padding:0.5rem 0;">Nenhum cliente encontrado com este telefone.</div>'
    return
  }

  if (c.anonimizado_em) {
    res.innerHTML = `<div class="lgpd-ok">Dados deste cliente já foram anonimizados em ${new Date(c.anonimizado_em).toLocaleString('pt-BR')}.</div>`
    return
  }

  const addr = [c.endereco_rua, c.endereco_bairro, c.endereco_cidade].filter(Boolean).join(', ') || '—'
  const consent = c.lgpd_consent_em ? new Date(c.lgpd_consent_em).toLocaleString('pt-BR') : 'Não registrado'

  res.innerHTML = `
    <div class="lgpd-card">
      <div class="lgpd-row"><strong>${c.nome}</strong></div>
      <div class="lgpd-row">📱 ${c.telefone}</div>
      <div class="lgpd-row">📍 ${addr}</div>
      <div class="lgpd-meta">Pedidos: ${c.total_pedidos || 0} · Consentimento: ${consent}</div>
      <button class="lgpd-del-btn" onclick="anonimizarClienteLGPD('${c.id}')">🗑️ Anonimizar dados pessoais</button>
    </div>`
}

export async function anonimizarClienteLGPD(clienteId) {
  if (!confirm('Remove permanentemente os dados pessoais deste cliente (nome, telefone, endereço). Os valores financeiros são mantidos para fins contábeis. Confirmar?')) return

  const agora = new Date().toISOString()

  await supabase.from('clientes').update({
    nome: 'Dados removidos', telefone: null,
    endereco_rua: null, endereco_num: null, endereco_comp: null,
    endereco_bairro: null, endereco_cidade: null, endereco_cep: null,
    anonimizado_em: agora
  }).eq('id', clienteId).eq('loja_id', _lojaId)

  await supabase.from('pedidos').update({
    nome_cliente: 'Dados removidos',
    telefone_cliente: null,
    endereco_entrega: 'Removido a pedido do titular'
  }).eq('cliente_id', clienteId).eq('loja_id', _lojaId)

  document.getElementById('lgpdResultado').innerHTML =
    `<div class="lgpd-ok">✅ Dados anonimizados em ${new Date().toLocaleString('pt-BR')}.</div>`
  toast('✅ Dados do cliente anonimizados')
}
