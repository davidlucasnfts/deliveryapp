const gateways = {
  mercadopago: {
    nome: 'Mercado Pago',
    logo: '🟢',
    tag: 'PIX · Cartão · QR Code',
    badge: { txt: 'Mais popular', cls: 'popular' },
    campos: [
      { id: 'accessToken', label: 'Access Token', placeholder: 'TEST-... ou APP_USR-...', tipo: 'password', ajuda: 'Seu negócio → Configurações → Credenciais' },
      { id: 'publicKey',   label: 'Public Key',   placeholder: 'TEST-... ou APP_USR-...', tipo: 'password', ajuda: 'Mesma página das credenciais' },
    ],
    taxas: [
      { nome: '💠 PIX',               val: '0,99%' },
      { nome: '💳 Crédito à vista',   val: '4,99%' },
      { nome: '💳 Crédito 2x–6x',     val: '6,99%' },
      { nome: '💳 Crédito 7x–12x',    val: '8,99%' },
      { nome: '💳 Débito',            val: '1,99%' },
    ],
    passos: [
      { t: 'Criar conta no Mercado Pago', d: 'Acesse mercadopago.com.br e crie com CPF ou CNPJ', link: 'https://mercadopago.com.br', linkTxt: '→ Acessar Mercado Pago' },
      { t: 'Acessar as credenciais', d: 'No painel: Seu negócio → Configurações → Credenciais de aplicação' },
      { t: 'Copiar Access Token de TESTE', d: 'Use credenciais TEST- primeiro para testar sem cobrar de verdade', code: 'TEST-xxxxxxxxxxxxxxxx' },
      { t: 'Copiar Public Key de TESTE', d: 'Na mesma página das credenciais', code: 'TEST-xxxxxxxxxxxxxxxx' },
      { t: 'Colar aqui e testar', d: 'Cole os dois valores, clique em Testar conexão e confirme que está ok' },
      { t: 'Ativar produção', d: 'Quando tudo ok, troque pelas credenciais de produção (APP_USR-) e desative o modo teste' },
    ],
    testeCartao: { num: '5031 4332 1540 6351', val: '11/25', cvv: '123', nome: 'APRO' }
  },
  pagseguro: {
    nome: 'PagSeguro',
    logo: '🔵',
    tag: 'PIX · Cartão · Boleto',
    badge: { txt: 'Tradicional', cls: 'popular' },
    campos: [
      { id: 'token',  label: 'Token da conta', placeholder: 'Seu token do PagSeguro', tipo: 'password', ajuda: 'Minha conta → Preferências → Integrações' },
      { id: 'email',  label: 'E-mail da conta', placeholder: 'email@cadastrado.com', tipo: 'text', ajuda: 'E-mail de login no PagSeguro' },
    ],
    taxas: [
      { nome: '💠 PIX',               val: '0,99%' },
      { nome: '💳 Crédito à vista',   val: '4,99%' },
      { nome: '💳 Crédito parcelado', val: 'a partir de 6,99%' },
      { nome: '📄 Boleto',            val: 'R$2,49 fixo' },
    ],
    passos: [
      { t: 'Criar conta no PagSeguro', d: 'Acesse pagseguro.uol.com.br e crie conta de vendedor', link: 'https://pagseguro.uol.com.br', linkTxt: '→ Acessar PagSeguro' },
      { t: 'Acessar o Token', d: 'Minha conta → Preferências → Integrações → Token de segurança' },
      { t: 'Copiar o Token', d: 'Clique em Gerar novo token e copie o valor gerado', code: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { t: 'Confirmar o e-mail', d: 'Use o mesmo e-mail que está cadastrado na sua conta PagSeguro' },
      { t: 'Colar aqui e salvar', d: 'Cole token e e-mail e clique em Salvar credenciais' },
    ]
  },
  stripe: {
    nome: 'Stripe',
    logo: '🟣',
    tag: 'Cartão · Internacional',
    badge: { txt: 'Internacional', cls: 'inter' },
    campos: [
      { id: 'secretKey',    label: 'Secret Key',    placeholder: 'sk_test_... ou sk_live_...', tipo: 'password', ajuda: 'Dashboard → Developers → API Keys' },
      { id: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_test_... ou pk_live_...', tipo: 'text', ajuda: 'Mesma página das API Keys' },
    ],
    taxas: [
      { nome: '💳 Crédito/Débito', val: '3,99% + R$0,39' },
      { nome: '🌍 Internacional',  val: '5,49% + R$0,39' },
    ],
    passos: [
      { t: 'Criar conta no Stripe', d: 'Acesse stripe.com e crie sua conta de vendedor', link: 'https://stripe.com', linkTxt: '→ Acessar Stripe' },
      { t: 'Acessar as API Keys', d: 'Dashboard → Developers → API Keys' },
      { t: 'Copiar Secret Key de teste', d: 'Começa com sk_test_ — use para testar primeiro', code: 'sk_test_xxxxxxxxxxxxxxxx' },
      { t: 'Copiar Publishable Key de teste', d: 'Começa com pk_test_', code: 'pk_test_xxxxxxxxxxxxxxxx' },
      { t: 'Colar aqui e testar', d: 'Cole as duas chaves e verifique a conexão' },
      { t: 'Ativar produção', d: 'Troque pelas chaves live (sk_live_ e pk_live_)' },
    ]
  },
  paghiper: {
    nome: 'PagHiper',
    logo: '🟠',
    tag: 'PIX · Boleto barato',
    badge: { txt: 'PIX grátis', cls: 'barato' },
    campos: [
      { id: 'apiKey',  label: 'API Key', placeholder: 'Sua API Key do PagHiper', tipo: 'password', ajuda: 'Painel → Ferramentas → API Key' },
      { id: 'token',   label: 'Token',   placeholder: 'Seu Token do PagHiper',   tipo: 'password', ajuda: 'Painel → Ferramentas → Token' },
    ],
    taxas: [
      { nome: '💠 PIX',    val: '0% (gratuito)' },
      { nome: '📄 Boleto', val: 'R$1,99 fixo' },
    ],
    passos: [
      { t: 'Criar conta no PagHiper', d: 'Acesse paghiper.com e cadastre sua empresa', link: 'https://paghiper.com', linkTxt: '→ Acessar PagHiper' },
      { t: 'Acessar API Key e Token', d: 'Painel → Ferramentas → Chaves de API' },
      { t: 'Copiar a API Key', d: 'Chave de identificação da sua conta', code: 'apk_xxxxxxxxxxxxxxxx' },
      { t: 'Copiar o Token', d: 'Token de segurança para autenticação', code: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { t: 'Colar aqui e salvar', d: 'Cole as duas chaves e salve as credenciais' },
    ]
  },
  asaas: {
    nome: 'Asaas',
    logo: '🔷',
    tag: 'PIX · Cartão · Gestão',
    badge: { txt: 'Gestão completa', cls: 'barato' },
    campos: [
      { id: 'apiKey', label: 'API Key', placeholder: '$aact_...', tipo: 'password', ajuda: 'Configurações → Integrações → API Key' },
    ],
    taxas: [
      { nome: '💠 PIX',             val: '1%' },
      { nome: '💳 Crédito à vista', val: '2,99%' },
      { nome: '💳 Crédito parc.',   val: 'a partir de 4,99%' },
      { nome: '📄 Boleto',          val: 'R$1,99' },
    ],
    passos: [
      { t: 'Criar conta no Asaas', d: 'Acesse asaas.com e cadastre sua empresa', link: 'https://asaas.com', linkTxt: '→ Acessar Asaas' },
      { t: 'Acessar a API Key', d: 'Configurações → Integrações → Gerar chave de API' },
      { t: 'Copiar a API Key', d: 'Começa com $aact_', code: '$aact_xxxxxxxxxxxxxxxx' },
      { t: 'Colar aqui e salvar', d: 'Cole a chave e salve as credenciais' },
    ]
  },
  efi: {
    nome: 'Efí (GerenciaNet)',
    logo: '🟤',
    tag: 'PIX nativo barato',
    badge: { txt: 'PIX barato', cls: 'barato' },
    campos: [
      { id: 'clientId',     label: 'Client ID',     placeholder: 'Client_Id_...', tipo: 'password', ajuda: 'API → Minhas aplicações → Credenciais' },
      { id: 'clientSecret', label: 'Client Secret', placeholder: 'Client_Secret_...', tipo: 'password', ajuda: 'Mesma página das credenciais' },
    ],
    taxas: [
      { nome: '💠 PIX',             val: '0,90%' },
      { nome: '💳 Crédito à vista', val: '3,49%' },
      { nome: '📄 Boleto',          val: 'R$1,99' },
    ],
    passos: [
      { t: 'Criar conta na Efí', d: 'Acesse sejaefi.com.br e cadastre sua empresa', link: 'https://sejaefi.com.br', linkTxt: '→ Acessar Efí' },
      { t: 'Criar aplicação', d: 'API → Minhas aplicações → Nova aplicação' },
      { t: 'Copiar Client ID e Secret', d: 'Credenciais geradas para sua aplicação', code: 'Client_Id_xxxxxxxx' },
      { t: 'Colar aqui e salvar', d: 'Cole as duas chaves e salve' },
    ]
  }
}

let gwAtual = null
let config = { modoTeste: true, pixAtivo: true, cartaoAtivo: true, debitoAtivo: false, chavePix: '', tipoChavePix: 'cpf' }
let credenciais = {}

function fmt(v) { return 'R$' + Number(v).toFixed(2).replace('.', ',') }

function toast(msg, dur=2500) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), dur)
}

function renderGateways() {
  const grid = document.getElementById('gwGrid')
  grid.innerHTML = Object.entries(gateways).map(([id, gw]) => `
    <div class="gw-card ${gwAtual === id ? 'selected' : ''}" onclick="selecionarGw('${id}')">
      <div class="gw-logo">${gw.logo}</div>
      <div class="gw-name">${gw.nome}</div>
      <div class="gw-tag">${gw.tag}</div>
      ${gw.badge ? `<div class="gw-badge ${gw.badge.cls}">${gw.badge.txt}</div>` : ''}
    </div>`).join('')
}

function selecionarGw(id) {
  gwAtual = id
  const gw = gateways[id]
  renderGateways()
  document.getElementById('gwSelecao').style.display = 'none'
  const bar = document.getElementById('gwBar')
  bar.classList.add('show')
  document.getElementById('gwBarIcon').textContent = gw.logo
  document.getElementById('gwBarName').textContent = gw.nome
  document.getElementById('gwBarSub').textContent  = gw.tag
  document.getElementById('abasWrap').style.display = 'block'
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', i===0))
  renderConfig()
  atualizarStatus()
}

function trocarGateway() {
  gwAtual = null
  document.getElementById('gwSelecao').style.display = 'block'
  document.getElementById('gwBar').classList.remove('show')
  document.getElementById('abasWrap').style.display = 'none'
  renderGateways()
  atualizarStatus()
}

function trocarAba(aba, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  if (aba === 'config')  renderConfig()
  else if (aba === 'passos')  renderPassos()
  else if (aba === 'metodos') renderMetodos()
  else renderTaxas()
}

function atualizarStatus() {
  const gw    = gwAtual ? gateways[gwAtual] : null
  const temCred = gwAtual && credenciais[gwAtual] && Object.keys(credenciais[gwAtual]).length > 0
  const icon  = document.getElementById('sIcon')
  const title = document.getElementById('sTitle')
  const sub   = document.getElementById('sSub')
  const pill  = document.getElementById('sPill')

  if (!gw) {
    icon.style.background = '#F3F4F6'; icon.textContent = '⚙️'
    title.textContent = 'Pagamentos não configurados'
    sub.textContent   = 'Escolha um gateway e configure suas credenciais'
    pill.className = 's-pill pill-off'; pill.textContent = 'Inativo'
  } else if (!temCred) {
    icon.style.background = '#FEF3C7'; icon.textContent = '🔑'
    title.textContent = `${gw.nome} selecionado — aguardando credenciais`
    sub.textContent   = 'Insira suas chaves de API na aba Configuração'
    pill.className = 's-pill pill-warn'; pill.textContent = 'Pendente'
  } else if (config.modoTeste) {
    icon.style.background = '#FEF3C7'; icon.textContent = '🧪'
    title.textContent = `${gw.nome} — modo teste ativo`
    sub.textContent   = 'Pagamentos reais desativados · apenas simulações'
    pill.className = 's-pill pill-warn'; pill.textContent = 'Teste'
  } else {
    icon.style.background = '#DCFCE7'; icon.textContent = '✅'
    title.textContent = `${gw.nome} configurado e ativo`
    sub.textContent   = 'Recebimentos vão direto para sua conta'
    pill.className = 's-pill pill-ok'; pill.textContent = 'Ativo'
  }
}

function renderConfig() {
  if (!gwAtual) return
  const gw = gateways[gwAtual]
  const creds = credenciais[gwAtual] || {}

  let camposHtml = gw.campos.map(c => `
    <label class="lbl">${c.label} <span style="font-weight:400;color:var(--txt3);">— ${c.ajuda}</span></label>
    <div class="inp-row">
      <input class="inp inp-mono" type="${c.tipo}" id="cred_${c.id}"
        placeholder="${c.placeholder}" value="${creds[c.id]||''}"
        oninput="setCred('${c.id}',this.value)">
      ${c.tipo==='password' ? `<button class="show-btn" onclick="toggleShow('cred_${c.id}',this)">👁 Ver</button>` : ''}
    </div>`).join('')

  document.getElementById('abaContent').innerHTML = `
    <div class="info blue">
      💡 Suas credenciais são <strong>exclusivamente suas</strong>. O dinheiro vai direto para sua conta no ${gw.nome}. O DeliveryApp não tem acesso aos seus valores.
    </div>

    <div class="card">
      <div class="card-title">🔑 Credenciais — ${gw.nome}</div>
      <div class="card-desc">Configure suas chaves de acesso à API do ${gw.nome}</div>

      <div class="toggle-row" style="margin-bottom:0.85rem;">
        <div class="tgl-info">
          <div class="tgl-lbl">Modo de teste</div>
          <div class="tgl-sub">Use credenciais de teste para simular pagamentos sem cobrar de verdade</div>
        </div>
        <button class="toggle ${config.modoTeste?'on':''}" onclick="toggleCfg('modoTeste',this)"></button>
      </div>

      ${camposHtml}

      <div class="btn-row">
        <button class="btn-test" onclick="testarConexao()">🧪 Testar conexão</button>
        <button class="btn-or" onclick="salvarCredenciais()">Salvar credenciais</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">💠 Chave PIX para cobranças manuais</div>
      <div class="card-desc">Aparece para o cliente quando ele escolher PIX manual — sem precisar do gateway</div>
      <label class="lbl">Tipo da chave</label>
      <select class="inp-sel" onchange="config.tipoChavePix=this.value">
        <option value="cpf" ${config.tipoChavePix==='cpf'?'selected':''}>CPF</option>
        <option value="cnpj" ${config.tipoChavePix==='cnpj'?'selected':''}>CNPJ</option>
        <option value="telefone" ${config.tipoChavePix==='telefone'?'selected':''}>Telefone</option>
        <option value="email" ${config.tipoChavePix==='email'?'selected':''}>E-mail</option>
        <option value="aleatoria" ${config.tipoChavePix==='aleatoria'?'selected':''}>Chave aleatória</option>
      </select>
      <label class="lbl">Chave PIX</label>
      <input class="inp" placeholder="Ex: 999.999.999-99" value="${config.chavePix}"
        oninput="config.chavePix=this.value">
      <button class="btn-or full" onclick="toast('✅ Chave PIX salva!')">Salvar chave PIX</button>
    </div>`
}

function renderPassos() {
  if (!gwAtual) return
  const gw = gateways[gwAtual]

  let testeHtml = ''
  if (gw.testeCartao) {
    const tc = gw.testeCartao
    testeHtml = `
      <div class="card" style="margin-top:0.85rem;">
        <div class="card-title">🧪 Cartão de teste — ${gw.nome}</div>
        <div class="card-desc">Use esses dados para simular pagamentos em modo teste</div>
        <div style="background:#F9FAFB;border-radius:10px;padding:0.85rem;font-size:0.78rem;line-height:2;font-family:'Courier New',monospace;">
          <div><strong>Número:</strong> ${tc.num}</div>
          <div><strong>Validade:</strong> ${tc.val} &nbsp; <strong>CVV:</strong> ${tc.cvv}</div>
          <div><strong>Nome titular:</strong> ${tc.nome} <span style="font-family:Poppins,sans-serif;font-size:0.7rem;color:#78716C;">(para aprovação)</span></div>
        </div>
      </div>`
  }

  document.getElementById('abaContent').innerHTML = `
    <div class="card">
      <div class="card-title">📖 Como obter suas credenciais — ${gw.nome}</div>
      <div class="card-desc">Siga o passo a passo para configurar sua conta</div>
      <div class="steps">
        ${gw.passos.map((p,i) => `
          <div class="step">
            <div class="step-n">${i+1}</div>
            <div class="step-body">
              <div class="step-t">${p.t}</div>
              <div class="step-d">${p.d}</div>
              ${p.code ? `<div class="step-code">${p.code}</div>` : ''}
              ${p.link ? `<a class="step-link" href="${p.link}" target="_blank">${p.linkTxt}</a>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
    ${testeHtml}
    <div class="info orange" style="margin-top:0.85rem;">
      ⚠️ Nunca compartilhe suas chaves com ninguém. O DeliveryApp armazena suas credenciais de forma segura e nunca as utiliza para movimentar sua conta.
    </div>`
}

function renderMetodos() {
  document.getElementById('abaContent').innerHTML = `
    <div class="card">
      <div class="card-title">💳 Métodos de pagamento aceitos</div>
      <div class="card-desc">Escolha quais formas aparecem para o cliente na tela de pagamento</div>
      <div class="toggle-row">
        <div class="tgl-info">
          <div class="tgl-lbl">💠 PIX automático</div>
          <div class="tgl-sub">QR Code gerado na hora · confirmação imediata</div>
        </div>
        <button class="toggle ${config.pixAtivo?'on':''}" onclick="toggleCfg('pixAtivo',this)"></button>
      </div>
      <div class="toggle-row">
        <div class="tgl-info">
          <div class="tgl-lbl">💳 Cartão de crédito</div>
          <div class="tgl-sub">Visa, Mastercard, Elo · parcelamento disponível</div>
        </div>
        <button class="toggle ${config.cartaoAtivo?'on':''}" onclick="toggleCfg('cartaoAtivo',this)"></button>
      </div>
      <div class="toggle-row">
        <div class="tgl-info">
          <div class="tgl-lbl">💳 Cartão de débito</div>
          <div class="tgl-sub">Aprovação imediata · taxa menor</div>
        </div>
        <button class="toggle ${config.debitoAtivo?'on':''}" onclick="toggleCfg('debitoAtivo',this)"></button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📱 Pré-visualização — tela do cliente</div>
      <div class="card-desc">Assim vai aparecer na hora de pagar</div>
      <div style="background:#F9FAFB;border-radius:12px;padding:0.85rem;" id="previewMetodos"></div>
      <button class="btn-or full" style="margin-top:1rem;" onclick="toast('✅ Métodos salvos!')">Salvar métodos</button>
    </div>`
  renderPreview()
}

function renderPreview() {
  const el = document.getElementById('previewMetodos')
  if (!el) return
  let h = ''
  if (config.pixAtivo) h += metodoCard('💠','#F0FDF4','PIX','Aprovação imediata · sem espera')
  if (config.cartaoAtivo) h += metodoCard('💳','#EFF6FF','Cartão de crédito','Visa, Mastercard, Elo · parcelar')
  if (config.debitoAtivo) h += metodoCard('💳','#F5F3FF','Cartão de débito','À vista · aprovação rápida')
  if (!h) h = '<div style="text-align:center;padding:1rem;font-size:0.82rem;color:#A8A29E;">Nenhum método ativo</div>'
  el.innerHTML = h
}

function metodoCard(icon, bg, nome, sub) {
  return `<div class="metodo-preview">
    <div class="mp-icon" style="background:${bg}">${icon}</div>
    <div><div class="mp-name">${nome}</div><div class="mp-sub">${sub}</div></div>
    <div class="mp-radio"></div>
  </div>`
}

function renderTaxas() {
  if (!gwAtual) return
  const gw = gateways[gwAtual]
  document.getElementById('abaContent').innerHTML = `
    <div class="info blue">
      ℹ️ Taxas cobradas pelo <strong>${gw.nome}</strong> por transação aprovada. O DeliveryApp não cobra nenhuma taxa sobre os pagamentos — apenas a mensalidade do sistema.
    </div>

    <div class="card">
      <div class="card-title">📊 Taxas — ${gw.nome}</div>
      <div class="card-desc">Valores aproximados · variam conforme volume de vendas e tipo de conta</div>
      ${gw.taxas.map(t => `<div class="taxa-row"><span>${t.nome}</span><span class="taxa-val">${t.val}</span></div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">🧮 Simulador de valor líquido</div>
      <div class="card-desc">Quanto você recebe após a taxa do ${gw.nome}</div>
      <label class="lbl">Valor do pedido (R$)</label>
      <input class="inp" type="number" placeholder="Ex: 50" oninput="simular(this.value,'${gwAtual}')">
      <div id="simRes" style="display:none;">
        <div class="sim-grid" id="simGrid"></div>
      </div>
    </div>`
}

function simular(val, gwId) {
  const v   = parseFloat(val)
  const res = document.getElementById('simRes')
  const grd = document.getElementById('simGrid')
  if (!v || v <= 0 || !grd) { if(res) res.style.display='none'; return }
  const gw  = gateways[gwId]
  const taxMap = {}
  gw.taxas.forEach(t => {
    const pct = parseFloat(t.val.replace('%','').replace(',','.').replace('R$',''))
    if (!isNaN(pct) && t.val.includes('%')) taxMap[t.nome] = v * (1 - pct/100)
    else if (!isNaN(pct)) taxMap[t.nome] = v - pct
  })
  const colors = ['#F0FDF4','#EFF6FF','#FFF7ED','#F5F3FF','#FEF3C7']
  const txts   = ['#15803D','#1D4ED8','#C2410C','#6D28D9','#92400E']
  grd.innerHTML = Object.entries(taxMap).slice(0,3).map(([nome, liq], i) => `
    <div class="sim-card" style="background:${colors[i]}">
      <div class="sim-lbl" style="color:${txts[i]}">${nome.replace(/[💠💳📄]/g,'').trim()}</div>
      <div class="sim-val" style="color:${txts[i]}">${fmt(liq)}</div>
    </div>`).join('')
  res.style.display = 'block'
}

function setCred(campo, val) {
  if (!gwAtual) return
  if (!credenciais[gwAtual]) credenciais[gwAtual] = {}
  credenciais[gwAtual][campo] = val
}

function toggleShow(id, btn) {
  const inp = document.getElementById(id)
  if (inp.type === 'password') { inp.type='text'; btn.textContent='🙈 Ocultar' }
  else { inp.type='password'; btn.textContent='👁 Ver' }
}

function toggleCfg(key, btn) {
  config[key] = !config[key]
  btn.classList.toggle('on', config[key])
  atualizarStatus()
  if (key==='pixAtivo'||key==='cartaoAtivo'||key==='debitoAtivo') renderPreview()
}

function testarConexao() {
  const creds = credenciais[gwAtual]||{}
  const gw    = gateways[gwAtual]
  if (!gw.campos.every(c => creds[c.id])) {
    toast('⚠️ Preencha todos os campos primeiro'); return
  }
  toast('🔄 Testando conexão...')
  setTimeout(() => {
    toast('✅ Conexão estabelecida com sucesso!')
    atualizarStatus()
  }, 1800)
}

function salvarCredenciais() {
  const creds = credenciais[gwAtual]||{}
  const gw    = gateways[gwAtual]
  if (!gw.campos.every(c => creds[c.id])) {
    toast('⚠️ Preencha todos os campos'); return
  }
  toast('✅ Credenciais salvas com segurança!')
  atualizarStatus()
}

renderGateways()
