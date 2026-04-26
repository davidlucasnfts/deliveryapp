// js/checkout.js — formulário, CEP, cupom, taxa de entrega
// Usa variáveis globais do index.html via window

import { criarPedido, validarCupom, buscarClientePorTelefone } from './pedidos.js'
import { getTaxaEntrega } from './cardapio.js'
import { abrirPagamento } from './pagamento.js'

export * from './pagamento.js'

const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

export function mascaraTel(input) {
  let v = input.value.replace(/\D/g, '')
  if (v.length > 11) v = v.slice(0, 11)
  if (v.length <= 2)      v = '(' + v
  else if (v.length <= 7) v = '(' + v.slice(0, 2) + ') ' + v.slice(2)
  else                    v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7)
  input.value = v
}

export function mascaraCep(input) {
  let v = input.value.replace(/\D/g, '')
  if (v.length > 8) v = v.slice(0, 8)
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5)
  input.value = v
}

export async function onTelBlur() {
  const tel = document.getElementById('cliTel').value
  if (tel.replace(/\D/g, '').length < 10) return
  const cli = await buscarClientePorTelefone(window.APP.lojaId, tel)
  if (!cli) return
  window.APP.clienteLocal = cli
  if (cli.nome) {
    const n = document.getElementById('cliNome')
    if (n && !n.value) n.value = cli.nome
  }
  if (window.APP.fidelidadeConfig?.ativo && window.APP.fidelidadeConfig?.id) {
    mostrarPontos(cli.total_pontos || 0, window.APP.fidelidadeConfig.meta_pontos || 100, window.APP.fidelidadeConfig)
  }
}

export function formatarCep(cep) {
  const v = cep.replace(/\D/g, '')
  return v.length === 8 ? v.slice(0, 5) + '-' + v.slice(5) : cep
}

export function mostrarPontos(pontos, meta, config) {
  const card = document.getElementById('pontosCard')
  document.getElementById('pontosVal').textContent     = pontos
  document.getElementById('pontosMetaVal').textContent = meta
  const pct = Math.min(100, Math.round((pontos / meta) * 100))
  document.getElementById('pontosProg').style.width = pct + '%'
  let sub = ''
  if (pontos >= meta) {
    sub = `🎉 Você atingiu a meta! Ganhe sua recompensa no próximo pedido.`
  } else {
    const faltam = meta - pontos
    if (config.tipo_recompensa === 'brinde')        sub = `Faltam ${faltam} pontos para ganhar: ${config.brinde_descricao || 'brinde'}`
    else if (config.tipo_recompensa === 'desconto_pct') sub = `Faltam ${faltam} pontos para ganhar ${config.recompensa_valor}% de desconto`
    else sub = `Faltam ${faltam} pontos para ganhar R$${Number(config.recompensa_valor).toFixed(2).replace('.', ',')} de desconto`
  }
  document.getElementById('pontosSub').textContent = sub
  card.classList.add('show')
}

export async function validarCep() {
  const v = document.getElementById('cliCep').value.replace(/\D/g, '')
  if (v.length === 8) await buscarCep()
}

export async function buscarCep() {
  const cepRaw = document.getElementById('cliCep').value.replace(/\D/g, '')
  const h = document.getElementById('cepHint')
  if (cepRaw.length !== 8) {
    if (cepRaw.length > 0) { h.textContent = 'CEP incompleto'; h.className = 'cep-hint err' }
    return
  }
  h.textContent = 'Buscando...'; h.className = 'cep-hint'
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`)
    const d = await r.json()
    if (d.erro) { h.textContent = 'CEP não encontrado'; h.className = 'cep-hint err'; return }

    document.getElementById('cliRua').value    = d.logradouro || ''
    document.getElementById('cliBairro').value = d.bairro || ''
    document.getElementById('cliCidade').value = `${d.localidade} — ${d.uf}`
    h.textContent = `${d.localidade} — ${d.uf}`; h.className = 'cep-hint ok'

    const telAtual = document.getElementById('cliTel').value.replace(/\D/g, '')
    let cli = null
    if (telAtual.length === 11) {
      cli = await buscarClientePorTelefone(window.APP.lojaId, telAtual)
    }

    if (cli) {
      window.APP.clienteLocal = cli
      const nomeEl = document.getElementById('cliNome')
      if (nomeEl && !nomeEl.value && cli.nome) nomeEl.value = cli.nome

      const cepCadastro = (cli.endereco_cep || '').replace(/\D/g, '')
      if (cepCadastro === cepRaw) {
        const numEl  = document.getElementById('cliNum')
        const compEl = document.getElementById('cliComp')
        if (numEl  && !numEl.value  && cli.endereco_num)  numEl.value  = cli.endereco_num
        if (compEl && !compEl.value && cli.endereco_comp) compEl.value = cli.endereco_comp
        window.showToast('Endereço reconhecido!')
      }

      if (window.APP.fidelidadeConfig?.ativo && window.APP.fidelidadeConfig?.id) {
        mostrarPontos(cli.total_pontos || 0, window.APP.fidelidadeConfig.meta_pontos || 100, window.APP.fidelidadeConfig)
      }
    }

    document.getElementById('cliNum').focus()
  } catch (e) {
    window.showToast('⚠️ Verifique sua conexão')
    h.textContent = 'Erro ao buscar. Preencha manualmente.'; h.className = 'cep-hint err'
  }
}

export async function aplicarCupom() {
  const codigo = document.getElementById('cupomInput').value.trim()
  const inp    = document.getElementById('cupomInput')
  const msg    = document.getElementById('cupomMsg')
  if (!codigo) { msg.textContent = 'Digite o código do cupom'; msg.className = 'cupom-msg err'; return }
  const subtotal = window.APP.cart.reduce((s, i) => s + i.preco * i.qty, 0)
  msg.textContent = 'Verificando...'; msg.className = 'cupom-msg ok'
  const res = await validarCupom(window.APP.lojaId, codigo, subtotal)
  if (res.ok) {
    window.APP.cupomAtivo = res.cupom; window.APP.descontoAtivo = res.desconto
    inp.classList.add('ok'); inp.classList.remove('err')
    msg.textContent = res.msg; msg.className = 'cupom-msg ok'
    window.renderTotais()
  } else {
    window.APP.cupomAtivo = null; window.APP.descontoAtivo = 0
    inp.classList.add('err'); inp.classList.remove('ok')
    msg.textContent = res.msg; msg.className = 'cupom-msg err'
    window.renderTotais()
  }
}

export async function verificarTaxaEntrega(bairro) {
  window.APP.addTaxaEntrega = null
  if (!bairro) return
  const taxa = await getTaxaEntrega(window.APP.lojaId, bairro)
  window.APP.addTaxaEntrega = taxa
  window.atualizarTaxaUI()
}

export function atualizarTaxaUI() {
  const taxaRow = document.getElementById('taxaEntregaRow')
  if (!taxaRow) return
  if (!window.APP.addTaxaEntrega) {
    taxaRow.innerHTML = `<span class="taxa-lbl">Taxa de entrega</span><span class="taxa-val combinar">A combinar</span>`
  } else if (window.APP.addTaxaEntrega.taxa === 0) {
    taxaRow.innerHTML = `<span class="taxa-lbl">Taxa de entrega</span><span class="taxa-val gratis">Grátis</span>`
  } else {
    taxaRow.innerHTML = `<span class="taxa-lbl">Taxa de entrega</span><span class="taxa-val">+${fmt(window.APP.addTaxaEntrega.taxa)}</span>`
  }
}

export async function enviarPedido() {
  if (window.APP.loja && !window.APP.loja.aberta) {
    alert('A loja está fechada no momento. Aguarde a reabertura para finalizar o pedido.')
    return
  }
  const nome   = document.getElementById('cliNome').value.trim()
  const tel    = document.getElementById('cliTel').value.replace(/\D/g, '')
  const rua    = document.getElementById('cliRua').value.trim()
  const num    = document.getElementById('cliNum').value.trim()
  const bairro = document.getElementById('cliBairro').value.trim()
  const comp   = document.getElementById('cliComp').value.trim()
  const cidade = document.getElementById('cliCidade').value.trim()
  const cep    = document.getElementById('cliCep').value.trim()
  const obs    = document.getElementById('cliObs').value.trim()
  const erros  = []
  if (nome.length < 3) erros.push('Nome completo é obrigatório')
  if (tel.length !== 11) erros.push('Celular deve ter 11 dígitos — Ex: (99) 99999-9999')
  if (!rua)    erros.push('Rua é obrigatória')
  if (!num)    erros.push('Número é obrigatório')
  if (!bairro) erros.push('Bairro é obrigatório')
  if (erros.length) { alert('Por favor corrija:\n\n• ' + erros.join('\n• ')); return }

  const btn = document.getElementById('btnEnviar')
  btn.disabled = true; btn.textContent = 'Salvando pedido...'

  try {
    const enderecoCompleto = `${rua}, ${num}${comp ? ' — ' + comp : ''}, ${bairro}${cidade ? ' — ' + cidade : ''} (CEP: ${cep})`
    const itens       = window.APP.cart.map(i => ({ produto_id: i.id, nome: i.nome || 'Produto', preco: i.preco, quantidade: i.qty, subtotal: i.preco * i.qty }))
    const clienteData = { nome, telefone: document.getElementById('cliTel').value, endereco: enderecoCompleto, obs, rua, num, comp, bairro, cidade, cep }

    const taxaEntregaValor = window.APP.addTaxaEntrega ? Number(window.APP.addTaxaEntrega.taxa) : 0
    window.APP.pedidoAtual = await criarPedido(window.APP.lojaId, clienteData, itens, window.APP.cupomAtivo?.id || null, window.APP.descontoAtivo, 'pendente', taxaEntregaValor)
    window.APP.pedidoAtual._clienteData = clienteData
    window.APP.pedidoAtual._itens  = itens
    window.APP.pedidoAtual._rua    = rua;    window.APP.pedidoAtual._num    = num;    window.APP.pedidoAtual._comp   = comp
    window.APP.pedidoAtual._bairro = bairro; window.APP.pedidoAtual._cidade = cidade; window.APP.pedidoAtual._cep    = cep

    abrirPagamento()
    btn.disabled = false; btn.textContent = 'Confirmar pedido'
  } catch (e) {
    window.showToast('⚠️ Verifique sua conexão')
    const msg = e?.message?.includes('column')
      ? 'Erro de configuração do banco. Rode o SQL update_pagamento.sql no Supabase.'
      : 'Erro ao registrar pedido. Tente novamente.'
    alert(msg)
    btn.disabled = false; btn.textContent = 'Confirmar pedido'
  }
}
