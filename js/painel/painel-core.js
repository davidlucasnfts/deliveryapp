// js/painel/painel-core.js — inicialização, auth, realtime, navegação

import { supabase }      from '../supabase.js'
import { escutarPedidos } from '../pedidos.js'
import { getTodosProdutos, getTodasCategorias } from '../cardapio.js'
import { atualizarData, toast }  from './utils.js'
import { renderPedidos, setPedidos, getPedidos, abrirDetalhes, avancarPedido, avancarModalPedido, chamarWpp, notificarCliente } from './painel-pedidos.js'
import { renderCardapio, setDados as setDadosCardapio,
  toggleCat, toggleCatAtiva, moverCat, toggleProd, confirmarDelProd,
  abrirNovoEp, abrirNovoEpNaCat, openEp, closeEp, deletarProduto,
  handleImgUpload, saveEp, openEc, closeEc, salvarCategoria, deletarCategoria,
  abrirModalCat, fecharModalCat, selecionarTipoCat,
  abrirModalProd, fecharModalProd,
  abrirModalAdd, fecharModalAdd, salvarAdicionais,
  initBtnNovoGrupo,
  addNovoGrupo, addItemGrupo, removerGrupo, removerItemGrupo,
  delProdDaCat, toggleNovaCatForm
} from './painel-cardapio.js'
import { renderFidelidade, setLoja as setLojaFid, mostrarCamposPontuacao, mostrarCampoRecompensa, toggleFidelidade, salvarFidelidade, criarCupom, toggleCupom, deletarCupom, enviarTransmissao } from './painel-fidelidade.js'
import { renderConfig, setLoja as setLojaCfg, mascaraTelCfg, copiarLink, salvarConfig, salvarHorario, togglePgto, salvarPagamento, adicionarTaxa, excluirTaxa, carregarTaxas } from './painel-config.js'

let loja  = null
let canal = null
let tabAtual = 'pedidos'

// ===== EXPÕE FUNÇÕES GLOBAIS (chamadas via onclick no HTML) =====
const exp = obj => Object.entries(obj).forEach(([k, v]) => { window[k] = v })

exp({
  // pedidos
  abrirDetalhes, avancarPedido, avancarModalPedido, chamarWpp, notificarCliente,
  fecharDetalhes: () => document.getElementById('modalDetalhes').classList.remove('open'),
  // cardápio
  toggleCat, toggleNovaCatForm, toggleCatAtiva, moverCat,
  toggleProd, confirmarDelProd, abrirNovoEp, abrirNovoEpNaCat,
  openEp, closeEp, deletarProduto, handleImgUpload, saveEp,
  openEc, closeEc, salvarCategoria, deletarCategoria, delProdDaCat,
  abrirModalCat, fecharModalCat, selecionarTipoCat,
  abrirModalProd, fecharModalProd,
  abrirModalAdd, fecharModalAdd, salvarAdicionais,
  addNovoGrupo, addItemGrupo, removerGrupo, removerItemGrupo,
  // fidelidade
  mostrarCamposPontuacao, mostrarCampoRecompensa, toggleFidelidade,
  salvarFidelidade, criarCupom, toggleCupom, deletarCupom, enviarTransmissao,
  // config
  mascaraTelCfg, copiarLink, salvarConfig, salvarHorario, togglePgto, salvarPagamento, adicionarTaxa, excluirTaxa,
  // loja
  toggleLoja, sair, trocarTab,
})

// ===== INIT =====
async function init() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }

  const { data: perfil } = await supabase
    .from('usuarios').select('*,lojas(*)').eq('email', user.email).single()
  if (!perfil) { window.location.href = 'login.html'; return }

  loja = perfil.lojas
  document.getElementById('hStoreName').textContent = loja.nome
  document.getElementById('linkCardapio').href = `index.html?loja=${loja.id}`

  atualizarBotaoStatus()
  atualizarData()
  setInterval(atualizarData, 60000)
  setInterval(() => { if (tabAtual === 'pedidos') renderPedidos() }, 60000)

  await carregarDados()
  iniciarRealtime()

  document.getElementById('loading').style.display  = 'none'
  document.getElementById('appRoot').style.display  = 'block'
  renderPedidos()
}

async function carregarDados() {
  const [p, c, { data: pd }] = await Promise.all([
    getTodosProdutos(loja.id),
    getTodasCategorias(loja.id),
    supabase.from('pedidos').select('*,itens_pedido(*)').eq('loja_id', loja.id)
      .order('criado_em', { ascending: false }).limit(80)
  ])
  setPedidos(pd || [])
  setDadosCardapio(loja, p || [], c || [])
  setLojaFid(loja)
  setLojaCfg(loja)
}

function iniciarRealtime() {
  if (canal) { supabase.removeChannel(canal); canal = null }
  canal = escutarPedidos(loja.id, async payload => {
    const { data } = await supabase.from('pedidos').select('*,itens_pedido(*)').eq('id', payload.new.id).single()
    if (data) {
      getPedidos().unshift(data)
      if (tabAtual === 'pedidos') renderPedidos()
      mostrarNotif()
    }
  })
}

function mostrarNotif() {
  const n = document.getElementById('notif'); n.classList.add('show')
  setTimeout(() => n.classList.remove('show'), 4000)
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.3
    o.start(); o.stop(ctx.currentTime + 0.15)
  } catch (e) {}
}

function atualizarBotaoStatus() {
  const btn = document.getElementById('btnStatus')
  const dot = document.getElementById('dotStatus')
  const txt = document.getElementById('statusTxt')
  if (loja.aberta) {
    btn.className = 'h-status aberta'; dot.className = 'dot green'; txt.textContent = 'Aberta'
  } else {
    btn.className = 'h-status fechada'; dot.className = 'dot red';   txt.textContent = 'Fechada'
  }
}

async function toggleLoja() {
  loja.aberta = !loja.aberta
  await supabase.from('lojas').update({ aberta: loja.aberta }).eq('id', loja.id)
  atualizarBotaoStatus(); toast(loja.aberta ? '✅ Loja aberta' : '🔒 Loja fechada')
  // Atualiza referência no config
  setLojaCfg(loja)
}

async function sair() { await supabase.auth.signOut(); window.location.href = 'login.html' }

function trocarTab(tab, el) {
  tabAtual = tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  if      (tab === 'pedidos')    renderPedidos()
  else if (tab === 'cardapio')   renderCardapio()
  else if (tab === 'fidelidade') renderFidelidade()
  else                           renderConfig()
}

init()
