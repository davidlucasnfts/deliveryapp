// js/carrinho.js — carrinho, totais, upsell
// Usa variáveis globais do index.html via window

import { getGruposAdicionais } from './cardapio.js'

// Atalhos para estado global (definidos no index.html)
const APP = () => window.APP
const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

export function carregarCartSalvo(){
  try{
    const salvo=localStorage.getItem(window.APP.CART_KEY)
    if(salvo)window.APP.cart=JSON.parse(salvo)
  }catch(e){window.APP.cart=[]}
}
export function salvarCart(){
  try{ localStorage.setItem(window.APP.CART_KEY,JSON.stringify(window.APP.cart)) }catch(e){}
}
export function limparCartSalvo(){
  try{ localStorage.removeItem(window.APP.CART_KEY) }catch(e){}
}
export function atualizarCartBar(){
  const subtotal=window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)
  const total=Math.max(0,subtotal-window.APP.descontoAtivo)
  const count=window.APP.cart.reduce((s,i)=>s+i.qty,0)
  const bar=document.getElementById('cartBar')
  if(!count){bar.classList.remove('show');return}
  bar.classList.add('show')
  document.getElementById('cbCnt').textContent=count+(count===1?' item':' itens')
  document.getElementById('cbTot').textContent=fmt(total)
}
export function renderCarrinho(){
  const subtotal=window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)
  const tw=document.getElementById('csTotalWrap')
  const form=document.getElementById('csForm')
  if(!window.APP.cart.length){
    document.getElementById('csBodyItens').innerHTML=`<div class="cs-empty"><div class="cs-empty-icon">🛒</div><div style="font-size:0.88rem;font-weight:700;color:var(--txt2);">Seu carrinho está vazio</div></div>`
    tw.style.display='none';form.style.display='none'
    const uw=document.getElementById('upsellWrap');if(uw)uw.style.display='none'
    return
  }
  tw.style.display='block';form.style.display='block'
  window.renderTotais()
  window.renderUpsell()
  document.getElementById('csBodyItens').innerHTML=window.APP.cart.map(i=>{
    const key=i._cartKey||i.id
    return `<div class="cs-item">
      ${i.foto_url?`<img class="csi-img" src="${i.foto_url}" alt="${i.nome}">`:`<div class="csi-img-ph">🍽️</div>`}
      <div class="csi-info">
        <div class="csi-name">${i.nome}</div>
        ${i._descAdicionais?`<div style="font-size:0.68rem;color:var(--txt3);margin-top:0.1rem;">${i._descAdicionais}</div>`:''}
        <div class="csi-price">${fmt(i.preco)} un.</div>
      </div>
      <div class="csi-controls">
        <button class="csi-btn remove" onclick="alterarQtyKey('${key}',-1)">−</button>
        <span class="csi-qty">${i.qty}</span>
        <button class="csi-btn" onclick="alterarQtyKey('${key}',1)">+</button>
      </div>
      <span class="csi-subtotal">${fmt(i.preco*i.qty)}</span>
    </div>`}).join('')
}
export function alterarQty(id,d){
  const idx=window.APP.cart.findIndex(c=>c.id===id&&!c._cartKey);if(idx===-1)return
  window.APP.cart[idx].qty+=d;if(window.APP.cart[idx].qty<=0)window.APP.cart.splice(idx,1)
  window.salvarCart();window.atualizarCartBar();window.renderCarrinho()
}
export function alterarQtyKey(key,d){
  const idx=window.APP.cart.findIndex(c=>(c._cartKey||c.id)===key);if(idx===-1)return
  window.APP.cart[idx].qty+=d;if(window.APP.cart[idx].qty<=0)window.APP.cart.splice(idx,1)
  window.salvarCart();window.atualizarCartBar();window.renderCarrinho()
}
export function fecharCarrinho(){
  document.getElementById('cartScreen').classList.remove('open')
}

export function abrirCarrinho(){window.renderCarrinho();document.getElementById('cartScreen').classList.add('open')}
export function renderTotais(){
  const subtotal=window.APP.cart.reduce((s,i)=>s+i.preco*i.qty,0)
  const taxa=window.APP.addTaxaEntrega?Number(window.APP.addTaxaEntrega.taxa):0
  const total=Math.max(0,subtotal+taxa-window.APP.descontoAtivo)
  document.getElementById('csSubtotal').textContent=fmt(subtotal)
  document.getElementById('csTotalFinal').textContent=fmt(total)
  document.getElementById('cbTot').textContent=fmt(total)
  const dr=document.getElementById('csDescontoRow')
  if(window.APP.descontoAtivo>0){
    dr.style.display='flex'
    document.getElementById('csDesconto').textContent='−'+fmt(window.APP.descontoAtivo)
  } else {
    dr.style.display='none'
  }
}
export function renderUpsell(){
  const wrap=document.getElementById('upsellWrap')
  const scroll=document.getElementById('upsellScroll')
  if(!wrap||!scroll) return

  // Pega IDs dos produtos que já estão no carrinho
  const idsNoCarrinho=new Set(window.APP.cart.map(i=>i.id))

  // Seleciona produtos que NÃO estão no carrinho
  // Prioridade: 1) bebidas/sobremesas, 2) mais baratos, 3) aleatório
  let sugestoes=window.APP.produtos.filter(p=>!idsNoCarrinho.has(p.id)&&p.disponivel!==false)

  // Tenta priorizar categorias "complementares" (bebidas, sobremesas, acompanhamentos)
  const catNomes={}
  window.APP.categorias.forEach(cat=>{catNomes[cat.id]=cat.nome.toLowerCase()})
  const complementares=['bebida','refrigerante','suco','sobremesa','acompanhamento','porção','porcao','batata','drink']

  // Separa em complementares e resto
  const priorizados=sugestoes.filter(p=>{
    const catNome=catNomes[p.categoria_id]||''
    return complementares.some(term=>catNome.includes(term))
  })
  const resto=sugestoes.filter(p=>!priorizados.includes(p))

  // Monta lista final: até 6 produtos, priorizados primeiro
  sugestoes=[...priorizados,...resto].slice(0,6)

  if(!sugestoes.length||!window.APP.cart.length||window.APP.loja?.upsell_ativo===false){
    wrap.style.display='none'
    return
  }

  wrap.style.display='block'
  scroll.innerHTML=sugestoes.map(p=>`
    <div class="upsell-card" onclick="upsellAdd('${p.id}')">
      <div class="upsell-img">
        ${p.foto_url?`<img src="${p.foto_url}" alt="${p.nome}" loading="lazy">`:'🍽️'}
      </div>
      <button class="upsell-add" onclick="event.stopPropagation();upsellAdd('${p.id}')">+</button>
      <div class="upsell-info">
        <div class="upsell-nome">${p.nome}</div>
        <div class="upsell-preco">${fmt(p.preco)}</div>
      </div>
    </div>`).join('')
}
export async function upsellAdd(id){
  const p=window.APP.produtos.find(x=>x.id===id)
  if(!p) return
  // Verifica se tem adicionais
  const grupos=await getGruposAdicionais(id)
  if(grupos.length){
    window.abrirAdicionais(p,grupos)
    return
  }
  // Adiciona direto ao carrinho
  const ex=window.APP.cart.find(c=>c.id===id&&!c._cartKey)
  if(ex) ex.qty++
  else window.APP.cart.push({...p,qty:1})
  window.salvarCart();window.atualizarCartBar();window.renderCarrinho()
  window.showToast(p.nome+' adicionado!')
}
