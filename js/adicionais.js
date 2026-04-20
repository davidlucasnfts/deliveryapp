// js/adicionais.js — modal de adicionais e confirmação
// Usa variáveis globais do index.html via window

const APP = () => window.APP
const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

export function abrirAdicionais(produto, grupos){
  window.APP.addProdutoAtual=produto; window.APP.addGruposAtual=grupos; window.APP.addSelecionados={}; window.APP.addQty=1

  // Foto e info do produto
  document.getElementById('addTopNome').textContent=produto.nome
  document.getElementById('addProdNome').textContent=produto.nome
  document.getElementById('addProdPreco').textContent=fmt(produto.preco)
  document.getElementById('addProdDesc').textContent=produto.descricao||''
  document.getElementById('addFotoWrap').innerHTML=produto.foto_url
    ?`<img class="add-prod-foto" src="${produto.foto_url}" alt="${produto.nome}" loading="lazy">`
    :`<div class="add-prod-foto-ph">🍽️</div>`
  document.getElementById('addQtyNum').textContent=1

  // Renderiza grupos
  let h=''
  grupos.forEach(grupo=>{
    const isRadio=grupo.max_escolha===1
    const subTxt=grupo.obrigatorio
      ?`Escolha ${grupo.max_escolha===1?'1 item':`até ${grupo.max_escolha} itens`}`
      :`Escolha até ${grupo.max_escolha} ${grupo.max_escolha===1?'item':'itens'}`
    h+=`<div class="add-grupo">
      <div class="add-grupo-hd">
        <div class="add-grupo-info">
          <div class="add-grupo-titulo">${grupo.nome}</div>
          <div class="add-grupo-sub">${subTxt}</div>
        </div>
        <span class="add-grupo-badge ${grupo.obrigatorio?'obrig':'opcao'}">${grupo.obrigatorio?'Obrigatório':'Opcional'}</span>
      </div>
      <div class="add-grupo-body">`
    grupo.itens.forEach(item=>{
      if(isRadio){
        h+=`<div class="add-item" onclick="toggleAdicional('${grupo.id}','${item.id}',${grupo.max_escolha},${item.preco},'${item.nome.replace(/'/g,"\'")}')">
          <div class="add-item-foto">🍽️</div>
          <div class="add-item-info">
            <div class="add-item-nome">${item.nome}</div>
            <div class="add-item-max">Máx ${grupo.max_escolha}</div>
            ${item.preco>0?`<div class="add-item-preco">+${fmt(item.preco)}</div>`:``}
          </div>
          <div class="add-item-ctrl">
            <div class="add-ctrl-radio" id="ctrl_${item.id}"></div>
          </div>
        </div>`
      } else {
        h+=`<div class="add-item">
          <div class="add-item-foto">🍽️</div>
          <div class="add-item-info">
            <div class="add-item-nome">${item.nome}</div>
            <div class="add-item-max">Máx ${grupo.max_escolha}</div>
            ${item.preco>0?`<div class="add-item-preco">+${fmt(item.preco)}</div>`:``}
          </div>
          <div class="add-item-ctrl" id="ctrl_wrap_${item.id}">
            <button class="add-ctrl-mais" id="ctrl_${item.id}"
              onclick="toggleAdicional('${grupo.id}','${item.id}',${grupo.max_escolha},${item.preco},'${item.nome.replace(/'/g,"\'")}')">+</button>
          </div>
        </div>`
      }
    })
    h+=`</div></div>`
  })
  document.getElementById('addGrupos').innerHTML=h
  atualizarTotalAdd()
  atualizarBotaoAdd()
  // Scroll pro topo
  const scroll=document.getElementById('addScroll')
  if(scroll)scroll.scrollTop=0
  document.getElementById('addOverlay').classList.add('open')
}
export function fecharAdicionais(){
  document.getElementById('addOverlay').classList.remove('open')
  window.APP.addProdutoAtual=null; window.APP.addGruposAtual=[]; window.APP.addSelecionados={}
}
export function toggleAdicional(grupoId,itemId,maxEscolha,preco,nome){
  if(!window.APP.addSelecionados[grupoId]) window.APP.addSelecionados[grupoId]=[]
  const idx=window.APP.addSelecionados[grupoId].findIndex(x=>x.id===itemId)

  if(maxEscolha===1){
    // RADIO — limpa anterior e seleciona novo
    const anterior=window.APP.addSelecionados[grupoId][0]
    if(anterior){
      const ctrlAnt=document.getElementById('ctrl_'+anterior.id)
      if(ctrlAnt)ctrlAnt.classList.remove('sel')
    }
    if(idx>=0){
      window.APP.addSelecionados[grupoId]=[]
      const ctrl=document.getElementById('ctrl_'+itemId)
      if(ctrl)ctrl.classList.remove('sel')
    } else {
      window.APP.addSelecionados[grupoId]=[{id:itemId,preco,nome}]
      const ctrl=document.getElementById('ctrl_'+itemId)
      if(ctrl)ctrl.classList.add('sel')
    }
  } else {
    // MÚLTIPLA ESCOLHA — botão + e contador
    const total=window.APP.addSelecionados[grupoId].reduce((s,x)=>s+x.qty,0)
    if(idx>=0){
      window.APP.addSelecionados[grupoId][idx].qty=(window.APP.addSelecionados[grupoId][idx].qty||1)+1
      if(window.APP.addSelecionados[grupoId][idx].qty>maxEscolha){
        window.APP.addSelecionados[grupoId].splice(idx,1)
      }
    } else {
      if(total>=maxEscolha){window.showToast('Máximo de '+maxEscolha+' opções neste grupo');return}
      window.APP.addSelecionados[grupoId].push({id:itemId,preco,nome,qty:1})
    }
    // Atualiza visual do botão +
    const qtdAtual=(window.APP.addSelecionados[grupoId].find(x=>x.id===itemId)||{qty:0}).qty
    const ctrlWrap=document.getElementById('ctrl_wrap_'+itemId)
    if(ctrlWrap){
      if(qtdAtual>0){
        ctrlWrap.innerHTML=`<div class="add-ctrl-counter">
          <button class="add-ctrl-menos" onclick="event.stopPropagation();decrementAdicional('${grupoId}','${itemId}',${preco},'${nome}')">−</button>
          <span>${qtdAtual}</span>
          <button class="add-ctrl-mais ativo" onclick="event.stopPropagation();toggleAdicional('${grupoId}','${itemId}',${maxEscolha},${preco},'${nome}')">+</button>
        </div>`
      } else {
        ctrlWrap.innerHTML=`<button class="add-ctrl-mais" id="ctrl_${itemId}"
          onclick="toggleAdicional('${grupoId}','${itemId}',${maxEscolha},${preco},'${nome}')">+</button>`
      }
    }
  }
  atualizarTotalAdd()
  atualizarBotaoAdd()
}
export function decrementAdicional(grupoId,itemId,preco,nome){
  if(!window.APP.addSelecionados[grupoId]) return
  const idx=window.APP.addSelecionados[grupoId].findIndex(x=>x.id===itemId)
  if(idx<0) return
  window.APP.addSelecionados[grupoId][idx].qty=(window.APP.addSelecionados[grupoId][idx].qty||1)-1
  if(window.APP.addSelecionados[grupoId][idx].qty<=0) window.APP.addSelecionados[grupoId].splice(idx,1)
  const qtdAtual=(window.APP.addSelecionados[grupoId].find(x=>x.id===itemId)||{qty:0}).qty
  const ctrlWrap=document.getElementById('ctrl_wrap_'+itemId)
  if(ctrlWrap){
    if(qtdAtual>0){
      ctrlWrap.innerHTML=`<div class="add-ctrl-counter">
        <button class="add-ctrl-menos" onclick="event.stopPropagation();decrementAdicional('${grupoId}','${itemId}',${preco},'${nome}')">−</button>
        <span>${qtdAtual}</span>
        <button class="add-ctrl-mais ativo" onclick="event.stopPropagation();toggleAdicional('${grupoId}','${itemId}',1,${preco},'${nome}')">+</button>
      </div>`
    } else {
      ctrlWrap.innerHTML=`<button class="add-ctrl-mais" onclick="toggleAdicional('${grupoId}','${itemId}',1,${preco},'${nome}')">+</button>`
    }
  }
  atualizarTotalAdd()
  atualizarBotaoAdd()
}
export function calcTotalAdd(){
  if(!window.APP.addProdutoAtual) return 0
  let extra=0
  Object.values(window.APP.addSelecionados).forEach(sel=>sel.forEach(s=>extra+=Number(s.preco)*(s.qty||1)))
  return (window.APP.addProdutoAtual.preco+extra)*window.APP.addQty
}
export function atualizarTotalAdd(){
  document.getElementById('addTotalVal').textContent=fmt(calcTotalAdd())
}
export function atualizarBotaoAdd(){
  const ok=window.APP.addGruposAtual.every(g=>
    !g.obrigatorio||((window.APP.addSelecionados[g.id]||[]).length>=1)
  )
  const btn=document.getElementById('addConfirmar')
  btn.disabled=!ok
  const totalEl=document.getElementById('addTotalVal')
  if(totalEl)totalEl.textContent=fmt(calcTotalAdd())
}
export function chAddQty(d){
  window.APP.addQty=Math.max(1,window.APP.addQty+d)
  document.getElementById('addQtyNum').textContent=window.APP.addQty
  atualizarTotalAdd(); atualizarBotaoAdd()
}
export function confirmarAdicionais(){
  if(!window.APP.addProdutoAtual)return
  const adicionaisEscolhidos=[]
  window.APP.addGruposAtual.forEach(g=>{
    const sel=window.APP.addSelecionados[g.id]||[]
    sel.forEach(s=>{
      const window.APP.qty=s.qty||1
      for(let i=0;i<window.APP.qty;i++){
        adicionaisEscolhidos.push({
          grupo_id:g.id, nome_grupo:g.nome,
          adicional_id:s.id, nome_adicional:s.nome, preco:s.preco
        })
      }
    })
  })
  const extraPreco=adicionaisEscolhidos.reduce((s,a)=>s+Number(a.preco),0)
  const precoFinal=window.APP.addProdutoAtual.preco+extraPreco
  const cartKey=window.APP.addProdutoAtual.id+'_'+adicionaisEscolhidos.map(a=>a.adicional_id).join('_')

  // Prepara item para confirmação
  window.APP.confirmItem={
    ...addProdutoAtual,
    _cartKey:cartKey,
    preco:precoFinal,
    qty:window.APP.addQty,
    adicionais:adicionaisEscolhidos,
    _descAdicionais:adicionaisEscolhidos.map(a=>a.nome_adicional).join(', ')
  }
  window.APP.confirmQty=window.APP.addQty
  window.fecharAdicionais()
  window.abrirConfirmacao()
}
export function abrirConfirmacao(){
  if(!window.APP.confirmItem) return
  document.getElementById('confirmNome').textContent=window.APP.confirmItem.nome+' adicionado ao carrinho!'
  document.getElementById('confirmQtyNum').textContent=window.APP.confirmQty
  document.getElementById('confirmObs').value=''
  document.getElementById('confirmOverlay').classList.add('open')
}
export function chConfirmQty(d){
  window.APP.confirmQty=Math.max(1,window.APP.confirmQty+d)
  document.getElementById('confirmQtyNum').textContent=window.APP.confirmQty
}
export function adicionarConfirmItem(){
  if(!window.APP.confirmItem)return
  window.APP.confirmItem.qty=window.APP.confirmQty
  const obs=document.getElementById('confirmObs')?.value.trim()
  if(obs) window.APP.confirmItem._obs=obs
  const ex=window.APP.cart.find(c=>c._cartKey===window.APP.confirmItem._cartKey)
  if(ex) ex.qty+=window.APP.confirmQty
  else window.APP.cart.push(window.APP.confirmItem)
  window.salvarCart();window.atualizarCartBar()
  window.showToast(window.APP.confirmItem.nome+' adicionado!')
  document.getElementById('confirmOverlay').classList.remove('open')
  window.APP.confirmItem=null
}
export function confirmContinuar(){
  window.adicionarConfirmItem()
  // Fica no cardápio
}
export function confirmIrCarrinho(){
  window.adicionarConfirmItem()
  setTimeout(()=>window.abrirCarrinho(),200)
}
