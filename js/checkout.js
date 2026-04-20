// js/checkout.js — formulário, pagamento, CEP, cupom
// Usa variáveis globais do index.html via window

import { criarPedido, validarCupom, buscarClientePorTelefone, atualizarFormaPagamento } from './pedidos.js'
import { getTaxaEntrega } from './cardapio.js'

const APP = () => window.APP
const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

export function mascaraTel(input){
  let v=input.value.replace(/\D/g,'')
  if(v.length>11)v=v.slice(0,11)
  if(v.length<=2)v='('+v
  else if(v.length<=7)v='('+v.slice(0,2)+') '+v.slice(2)
  else v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7)
  input.value=v
}
export function mascaraCep(input){
  let v=input.value.replace(/\D/g,'')
  if(v.length>8)v=v.slice(0,8)
  if(v.length>5)v=v.slice(0,5)+'-'+v.slice(5)
  input.value=v
}
export async function onTelBlur(){
  const tel=document.getElementById('cliTel').value
  if(tel.replace(/\D/g,'').length<10)return
  const cli=await buscarClientePorTelefone(window.APP.lojaId,tel)
  if(!cli)return
  window.APP.clienteLocal=cli
  // Preenche nome se ainda não preenchido
  if(cli.nome){
    const n=document.getElementById('cliNome')
    if(n&&!n.value)n.value=cli.nome
  }
  // Só mostra pontos — endereço é pelo CEP
  if(window.APP.fidelidadeConfig&&window.APP.fidelidadeConfig.ativo&&window.APP.fidelidadeConfig.id){
    mostrarPontos(cli.total_pontos||0,window.APP.fidelidadeConfig.meta_pontos||100,window.APP.fidelidadeConfig)
  }
}
export function formatarCep(cep){
  const v=cep.replace(/\D/g,'')
  return v.length===8?v.slice(0,5)+'-'+v.slice(5):cep
}
export function mostrarPontos(pontos,meta,config){
  const card=document.getElementById('pontosCard')
  document.getElementById('pontosVal').textContent=pontos
  document.getElementById('pontosMetaVal').textContent=meta
  const pct=Math.min(100,Math.round((pontos/meta)*100))
  document.getElementById('pontosProg').style.width=pct+'%'
  let sub=''
  if(pontos>=meta){
    sub=`🎉 Você atingiu a meta! Ganhe sua recompensa no próximo pedido.`
  } else {
    const faltam=meta-pontos
    if(config.tipo_recompensa==='brinde')sub=`Faltam ${faltam} pontos para ganhar: ${config.brinde_descricao||'brinde'}`
    else if(config.tipo_recompensa==='desconto_pct')sub=`Faltam ${faltam} pontos para ganhar ${config.recompensa_valor}% de desconto`
    else sub=`Faltam ${faltam} pontos para ganhar R$${Number(config.recompensa_valor).toFixed(2).replace('.',',')} de desconto`
  }
  document.getElementById('pontosSub').textContent=sub
  card.classList.add('show')
}
export async function validarCep(){
  const v=document.getElementById('cliCep').value.replace(/\D/g,'')
  if(v.length===8)await buscarCep()
}
export async function buscarCep(){
  const cepRaw=document.getElementById('cliCep').value.replace(/\D/g,'')
  const h=document.getElementById('cepHint')
  if(cepRaw.length!==8){
    if(cepRaw.length>0){h.textContent='CEP incompleto';h.className='cep-hint err';}
    return
  }
  h.textContent='Buscando...';h.className='cep-hint'
  try{
    // 1. Busca endereço no ViaCEP
    const r=await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`)
    const d=await r.json()
    if(d.erro){h.textContent='CEP não encontrado';h.className='cep-hint err';return}

    // Preenche rua, bairro e cidade sempre (vem do ViaCEP)
    document.getElementById('cliRua').value=d.logradouro||''
    document.getElementById('cliBairro').value=d.bairro||''
    document.getElementById('cliCidade').value=`${d.localidade} — ${d.uf}`
    h.textContent=`${d.localidade} — ${d.uf}`;h.className='cep-hint ok'

    // 2. Busca cliente no banco que já usou esse CEP
    // (busca pelo telefone se já preenchido, ou pelo CEP)
    const telAtual=document.getElementById('cliTel').value.replace(/\D/g,'')
    let cli=null

    if(telAtual.length===11){
      // Se já tem telefone, busca por ele
      cli=await buscarClientePorTelefone(window.APP.lojaId,telAtual)
    }

    if(cli){
      window.APP.clienteLocal=cli
      // Preenche nome se vazio
      const nomeEl=document.getElementById('cliNome')
      if(nomeEl&&!nomeEl.value&&cli.nome) nomeEl.value=cli.nome

      // Preenche número e complemento do endereço anterior nesse CEP
      // só se o CEP bate com o do cadastro
      const cepCadastro=(cli.endereco_cep||'').replace(/\D/g,'')
      if(cepCadastro===cepRaw){
        const numEl=document.getElementById('cliNum')
        const compEl=document.getElementById('cliComp')
        if(numEl&&!numEl.value&&cli.endereco_num) numEl.value=cli.endereco_num
        if(compEl&&!compEl.value&&cli.endereco_comp) compEl.value=cli.endereco_comp
        showToast('Endereço reconhecido!')
      }

      // Pontos
      if(window.APP.fidelidadeConfig&&window.APP.fidelidadeConfig.ativo&&window.APP.fidelidadeConfig.id){
        mostrarPontos(cli.total_pontos||0,window.APP.fidelidadeConfig.meta_pontos||100,window.APP.fidelidadeConfig)
      }
    }

    // Foca no número para o cliente completar
    document.getElementById('cliNum').focus()

  }catch(e){
    console.error('buscarCep:',e)
    h.textContent='Erro ao buscar. Preencha manualmente.';h.className='cep-hint err'
  }
}
export async function aplicarCupom(){
  const codigo=document.getElementById('cupomInput').value.trim()
  const inp=document.getElementById('cupomInput')
  const msg=document.getElementById('cupomMsg')
  if(!codigo){msg.textContent='Digite o código do cupom';msg.className='cupom-msg err';return}
  const subtotal=window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)
  msg.textContent='Verificando...';msg.className='cupom-msg ok'
  const res=await validarCupom(window.APP.lojaId,codigo,subtotal)
  if(res.ok){
    window.APP.cupomAtivo=res.cupom;window.APP.descontoAtivo=res.desconto
    inp.classList.add('ok');inp.classList.remove('err')
    msg.textContent=res.msg;msg.className='cupom-msg ok'
    renderTotais()
  } else {
    window.APP.cupomAtivo=null;window.APP.descontoAtivo=0
    inp.classList.add('err');inp.classList.remove('ok')
    msg.textContent=res.msg;msg.className='cupom-msg err'
    renderTotais()
  }
}
export async function verificarTaxaEntrega(bairro){
  window.APP.addTaxaEntrega=null
  if(!bairro) return
  const taxa=await getTaxaEntrega(window.APP.lojaId,bairro)
  window.APP.addTaxaEntrega=taxa
  atualizarTaxaUI()
}
export function atualizarTaxaUI(){
  const taxaRow=document.getElementById('taxaEntregaRow')
  if(!taxaRow) return
  if(!window.APP.addTaxaEntrega){
    taxaRow.innerHTML=`<span class="taxa-lbl">Taxa de entrega</span><span class="taxa-val combinar">A combinar</span>`
  } else if(window.APP.addTaxaEntrega.taxa===0){
    taxaRow.innerHTML=`<span class="taxa-lbl">Taxa de entrega</span><span class="taxa-val gratis">Grátis</span>`
  } else {
    taxaRow.innerHTML=`<span class="taxa-lbl">Taxa de entrega</span><span class="taxa-val">+${fmt(window.APP.addTaxaEntrega.taxa)}</span>`
  }
}
export async function enviarPedido(){
  if(window.APP.loja&&!window.APP.loja.aberta){
    alert('A window.APP.loja esta fechada no momento. Aguarde a reabertura para finalizar o pedido.')
    return
  }
  const nome=document.getElementById('cliNome').value.trim()
  const tel=document.getElementById('cliTel').value.replace(/\D/g,'')
  const rua=document.getElementById('cliRua').value.trim()
  const num=document.getElementById('cliNum').value.trim()
  const bairro=document.getElementById('cliBairro').value.trim()
  const comp=document.getElementById('cliComp').value.trim()
  const cidade=document.getElementById('cliCidade').value.trim()
  const cep=document.getElementById('cliCep').value.trim()
  const obs=document.getElementById('cliObs').value.trim()
  const erros=[]
  if(nome.length<3)erros.push('Nome completo é obrigatório')
  if(tel.length!==11)erros.push('Celular deve ter 11 dígitos — Ex: (99) 99999-9999')
  if(!rua)erros.push('Rua é obrigatória')
  if(!num)erros.push('Número é obrigatório')
  if(!bairro)erros.push('Bairro é obrigatório')
  if(erros.length){alert('Por favor corrija:\n\n• '+erros.join('\n• '));return}

  const btn=document.getElementById('btnEnviar')
  btn.disabled=true;btn.textContent='Salvando pedido...'

  try{
    const enderecoCompleto=`${rua}, ${num}${comp?' — '+comp:''}, ${bairro}${cidade?' — '+cidade:''} (CEP: ${cep})`
    const itens=window.APP.cart.map(i=>({produto_id:i.id,nome:i.nome||'Produto',preco:i.preco,quantidade:i.qty,subtotal:i.preco*i.qty}))
    const clienteData={nome,telefone:document.getElementById('cliTel').value,endereco:enderecoCompleto,obs,rua,num,comp,bairro,cidade,cep}

    // Cria pedido com status aguardando pagamento (inclui taxa de entrega)
    const taxaEntregaValor=window.APP.addTaxaEntrega?Number(window.APP.addTaxaEntrega.taxa):0
    window.APP.pedidoAtual=await criarPedido(window.APP.lojaId,clienteData,itens,window.APP.cupomAtivo?.id||null,window.APP.descontoAtivo,'pendente',taxaEntregaValor)
    window.APP.pedidoAtual._clienteData=clienteData
    window.APP.pedidoAtual._itens=itens
    window.APP.pedidoAtual._rua=rua;window.APP.pedidoAtual._num=num;window.APP.pedidoAtual._comp=comp
    window.APP.pedidoAtual._bairro=bairro;window.APP.pedidoAtual._cidade=cidade;window.APP.pedidoAtual._cep=cep

    // Abre tela de pagamento
    abrirPagamento()
    btn.disabled=false;btn.textContent='Confirmar pedido'
  }catch(e){
    console.error('Erro criarPedido:', e?.message || e)
    // Mostra erro mais detalhado em dev
    const msg = e?.message?.includes('column') 
      ? 'Erro de configuração do banco. Rode o SQL update_pagamento.sql no Supabase.'
      : 'Erro ao registrar pedido. Tente novamente.'
    alert(msg)
    btn.disabled=false;btn.textContent='Confirmar pedido'
  }
}
export function abrirPagamento(){
  const subtotal=window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)
  const total=Math.max(0,subtotal-window.APP.descontoAtivo)
  document.getElementById('pgtoTotalVal').textContent=fmt(total)
  window.APP.pgtoSelecionado=null
  document.getElementById('pgtoConfirmar').disabled=true

  // Monta opções baseado na configuração da window.APP.loja
  const pixAtivo=window.APP.loja.pix_ativo&&window.APP.loja.chave_pix
  const cartaoAtivo=window.APP.loja.cartao_ativo
  const dinheiroAtivo=window.APP.loja.dinheiro_ativo!==false

  let h=''

  if(pixAtivo){
    h+=`<div class="pgto-opcao" id="pgto-pix" onclick="selecionarPgto('pix')">
      <div class="pgto-opcao-header">
        <div class="pgto-opcao-icon" style="background:#E8F5E9;">💚</div>
        <div class="pgto-opcao-info">
          <div class="pgto-opcao-nome">PIX</div>
          <div class="pgto-opcao-desc">Instantâneo · aprovação na hora</div>
        </div>
        <div class="pgto-radio"><div class="pgto-radio-inner"></div></div>
      </div>
      <div class="pix-area">
        <div class="pix-chave">
          <div>
            <div class="pix-chave-lbl">Chave PIX</div>
            <div class="pix-chave-val">${window.APP.loja.chave_pix}</div>
          </div>
          <button class="pix-copy-btn" onclick="copiarPix(event)">Copiar</button>
        </div>
        <div class="pix-instrucao">
          1. Copie a chave PIX acima<br>
          2. Abra seu banco e faça o pagamento de ${fmt(total)}<br>
          3. Envie o comprovante pelo WhatsApp ao confirmar
        </div>
      </div>
    </div>`
  }

  // Cartão online (MP) — só aparece se mp_ativo e mp_public_key configurados
  const mpAtivo = window.APP.loja.mp_ativo && window.APP.loja.mp_public_key
  if(mpAtivo){
    h+=`<div class="pgto-opcao" id="pgto-cartao" onclick="selecionarPgto('cartao')">
      <div class="pgto-opcao-header">
        <div class="pgto-opcao-icon" style="background:#E3F2FD;">💳</div>
        <div class="pgto-opcao-info">
          <div class="pgto-opcao-nome">Cartão de crédito ou débito</div>
          <div class="pgto-opcao-desc">Online · aprovação imediata · seguro</div>
        </div>
        <div class="pgto-radio"><div class="pgto-radio-inner"></div></div>
      </div>
      <div class="mp-form-wrap">
        <div class="mp-loading" id="mpLoading">Carregando formulário seguro...</div>
        <div id="mpCardForm"></div>
        <select class="pgto-parcelas" id="mpParcelas" style="display:none;">
          <option value="1">1x sem juros</option>
        </select>
        <div class="mp-erro" id="mpErro"></div>
        <div class="mp-aprovado" id="mpAprovado">Pagamento aprovado!</div>
      </div>
    </div>`
  }

  if(dinheiroAtivo){
    h+=`<div class="pgto-opcao" id="pgto-dinheiro" onclick="selecionarPgto('dinheiro')">
      <div class="pgto-opcao-header">
        <div class="pgto-opcao-icon" style="background:#FFF8E1;">💵</div>
        <div class="pgto-opcao-info">
          <div class="pgto-opcao-nome">Dinheiro na entrega</div>
          <div class="pgto-opcao-desc">Pague ao receber o pedido</div>
        </div>
        <div class="pgto-radio"><div class="pgto-radio-inner"></div></div>
      </div>
    </div>`
  }

  if(!h){
    h=`<div style="text-align:center;padding:2rem;color:var(--txt2);font-size:0.88rem;">
      Nenhuma forma de pagamento configurada.<br>Entre em contato com o estabelecimento.
    </div>`
  }

  document.getElementById('pgtoOpcoes').innerHTML=h
  document.getElementById('pgtoScreen').classList.add('open')
}
export function fecharPagamento(){
  document.getElementById('pgtoScreen').classList.remove('open')
}
export function selecionarPgto(tipo){
  window.APP.pgtoSelecionado=tipo
  document.querySelectorAll('.pgto-opcao').forEach(el=>el.classList.remove('selecionado'))
  const el=document.getElementById('pgto-'+tipo)
  if(el)el.classList.add('selecionado')
  const labels={pix:'Confirmar — paguei no PIX',cartao:'Pagar com cartão',dinheiro:'Confirmar — pago na entrega'}
  document.getElementById('pgtoConfirmar').textContent=labels[tipo]||'Confirmar pagamento'
  // Cartão: inicializa formulário MP e deixa o botão desabilitado até preencher
  if(tipo==='cartao'){
    document.getElementById('pgtoConfirmar').disabled=true
    inicializarMPForm()
  } else {
    document.getElementById('pgtoConfirmar').disabled=false
  }
}
export function inicializarMPForm(){
  if(window.APP.mpFormReady)return
  if(!window.APP.loja.mp_public_key)return
  try{
    window.APP.mpInstance=new MercadoPago(window.APP.loja.mp_public_key,{locale:'pt-BR'})
    const cardForm=window.APP.mpInstance.cardForm({
      amount: String(Math.max(0,window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)-window.APP.descontoAtivo)),
      iframe: true,
      form:{
        id:'mpCardForm',
        cardNumber:{id:'form-checkout__cardNumber',placeholder:'Número do cartão'},
        expirationDate:{id:'form-checkout__expirationDate',placeholder:'MM/AA'},
        securityCode:{id:'form-checkout__securityCode',placeholder:'CVV'},
        cardholderName:{id:'form-checkout__cardholderName',placeholder:'Nome como no cartão'},
        issuer:{id:'form-checkout__issuer',placeholder:'Banco emissor'},
        installments:{id:'form-checkout__installments',placeholder:'Parcelas'},
        identificationType:{id:'form-checkout__identificationType',placeholder:'Tipo de doc.'},
        identificationNumber:{id:'form-checkout__identificationNumber',placeholder:'CPF'},
        cardholderEmail:{id:'form-checkout__cardholderEmail',placeholder:'E-mail (opcional)'},
      },
      callbacks:{
        onFormMounted: err=>{
          document.getElementById('mpLoading').style.display='none'
          if(err)console.warn('Form mount error:',err)
          else window.APP.mpFormReady=true
        },
        onSubmit: async event=>{
          event.preventDefault()
          await processarCartaoMP(cardForm.getCardFormData())
        },
        onFetching: resource=>{
          const btn=document.getElementById('pgtoConfirmar')
          btn.disabled=true;btn.textContent='Verificando cartão...'
          return ()=>{
            btn.disabled=false;btn.textContent='Pagar com cartão'
          }
        },
        onValidityChange: (errors,field)=>{
          // Habilita botão quando formulário válido
          const erros=window.APP.mpInstance?.cardForm?.getCardFormData?.()
          document.getElementById('pgtoConfirmar').disabled=false
        }
      }
    })
    window.APP.mpCardId=cardForm
    document.getElementById('pgtoConfirmar').disabled=false
  }catch(e){
    console.error('Erro ao inicializar MP:',e)
    document.getElementById('mpLoading').textContent='Erro ao carregar formulário. Recarregue a página.'
  }
}
export function copiarPix(e){
  e.stopPropagation()
  navigator.clipboard.writeText(window.APP.loja.chave_pix||'')
  const btn=e.target
  btn.textContent='Copiado!'
  setTimeout(()=>{btn.textContent='Copiar'},2000)
}
export async function processarCartaoMP(formData){
  const btn=document.getElementById('pgtoConfirmar')
  const erroEl=document.getElementById('mpErro')
  const aprovEl=document.getElementById('mpAprovado')
  erroEl.classList.remove('show');aprovEl.classList.remove('show')
  btn.disabled=true;btn.textContent='Processando pagamento...'

  try{
    // SEGURANÇA: não enviamos valor — backend busca do banco
    if(!window.APP.pedidoAtual?.id){
      throw new Error('Pedido não foi registrado. Recarregue a página.')
    }

    const res=await fetch('/api/processar-pagamento',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        token:              formData.token,
        pedidoId:           window.APP.pedidoAtual.id,
        payment_method_id:  formData.paymentMethodId,
        parcelas:           formData.installments||1,
        descricao:          `Pedido ${window.APP.loja.nome}`,
        window.APP.lojaId:             window.APP.lojaId,
        pagador:{
          email:    formData.cardholderEmail||'cliente@deliveryapp.com',
          doc_tipo: formData.identificationType||'CPF',
          doc_num:  formData.identificationNumber||'00000000000'
        }
      })
    })

    const data=await res.json()

    if(data.aprovado){
      aprovEl.textContent='Pagamento aprovado!'
      aprovEl.classList.add('show')
      btn.textContent='Confirmado!'
      // Continua com o fluxo normal de confirmação
      await finalizarPedido('cartao_online')
    } else {
      erroEl.textContent=data.mensagem||'Pagamento recusado. Tente outro cartão.'
      erroEl.classList.add('show')
      btn.disabled=false;btn.textContent='Tentar novamente'
    }
  }catch(e){
    console.error('Erro pagamento:',e)
    erroEl.textContent='Erro de conexão. Verifique sua internet e tente novamente.'
    erroEl.classList.add('show')
    btn.disabled=false;btn.textContent='Tentar novamente'
  }
}
export async function confirmarPagamento(){
  if(!window.APP.pgtoSelecionado||!window.APP.pedidoAtual)return
  // Cartão online: o submit é feito pelo SDK do MP (onSubmit callback)
  if(window.APP.pgtoSelecionado==='cartao'&&window.APP.mpCardId){
    window.APP.mpCardId.cardForm?.submit?.()
    return
  }
  await finalizarPedido(window.APP.pgtoSelecionado)
}
export async function finalizarPedido(formaPagamento){
  const btn=document.getElementById('pgtoConfirmar')
  btn.disabled=true;btn.textContent='Confirmando...'

  try{
    // Atualiza forma de pagamento no banco
    await atualizarFormaPagamento(window.APP.pedidoAtual.id, formaPagamento)

    // Monta mensagem WhatsApp com pagamento incluído
    const subtotal=window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)
    const total=Math.max(0,subtotal-window.APP.descontoAtivo)
    const nome=window.APP.pedidoAtual._clienteData.nome
    const tel=window.APP.pedidoAtual._clienteData.telefone
    const rua=window.APP.pedidoAtual._rua,num=window.APP.pedidoAtual._num,comp=window.APP.pedidoAtual._comp
    const bairro=window.APP.pedidoAtual._bairro,cidade=window.APP.pedidoAtual._cidade,cep=window.APP.pedidoAtual._cep
    const obs=window.APP.pedidoAtual._clienteData.obs

    const pgtoLabel={pix:'PIX (comprovante em anexo)',cartao:'Cartão na entrega',dinheiro:'Dinheiro na entrega'}

    let msg=`*Novo Pedido — ${window.APP.loja.nome}*\n\n`
    msg+=`*Cliente:* ${nome}\n*Celular:* ${tel}\n\n`
    msg+=`*Endereço:*\n${rua}, ${num}${comp?' — '+comp:''}\n${bairro}${cidade?' — '+cidade:''}\nCEP: ${cep}\n\n`
    msg+=`*Itens:*\n`
    window.APP.cart.forEach(i=>{msg+=`• ${i.qty}x ${i.nome} — ${fmt(i.preco*i.qty)}\n`})
    if(window.APP.descontoAtivo>0)msg+=`\n*Desconto:* −${fmt(window.APP.descontoAtivo)}`
    msg+=`\n*Total: ${fmt(total)}*`
    msg+=`\n*Pagamento:* ${pgtoLabel[window.APP.pgtoSelecionado]}`
    if(obs)msg+=`\n\n*Obs:* ${obs}`

    if(window.APP.loja.whatsapp)window.open(`https://wa.me/55${window.APP.loja.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank')

    // Calcula pontos
    let pontosGanhos=0
    if(window.APP.fidelidadeConfig&&window.APP.fidelidadeConfig.ativo&&window.APP.fidelidadeConfig.id){
      if(window.APP.fidelidadeConfig.tipo_pontuacao==='compra'){
        pontosGanhos=Math.floor(total/(window.APP.fidelidadeConfig.valor_por_ponto||10))
      } else {
        pontosGanhos=window.APP.pedidoAtual._itens.reduce((s,i)=>s+(i.quantidade*(window.APP.fidelidadeConfig.pontos_por_real||1)),0)
      }
    }

    // Fecha tela de pagamento e mostra sucesso
    window.APP.mpFormReady=false;window.APP.mpInstance=null;window.APP.mpCardId=null
    document.getElementById('pgtoScreen').classList.remove('open')
    document.getElementById('cartScreen').innerHTML=`
      <div class="cs-success">
        <div class="cs-success-icon">🎉</div>
        <div class="cs-success-title">Pedido confirmado!</div>
        <div class="cs-success-sub">
          Pedido enviado pelo WhatsApp com sucesso!<br><br>
          <strong>Pagamento:</strong> ${pgtoLabel[window.APP.pgtoSelecionado]}<br><br>
          <strong>Entrega em:</strong><br>${rua}, ${num}${comp?' — '+comp:''}<br>${bairro}${cidade?' — '+cidade:''} · CEP: ${cep}
        </div>
        ${pontosGanhos>0?`<div class="cs-success-pontos"><div class="cs-success-pontos-txt">Voce ganhou neste pedido</div><div class="cs-success-pontos-val">+${pontosGanhos} pontos</div></div>`:''}
        <button class="cs-novo-btn" onclick="location.reload()">Fazer novo pedido</button>
      </div>`
    window.APP.cart=[];limparCartSalvo();atualizarCartBar()
  }catch(e){
    console.error(e)
    alert('Erro ao confirmar. Tente novamente.')
    btn.disabled=false;btn.textContent='Confirmar pagamento'
  }
}
