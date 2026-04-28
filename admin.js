import { supabase } from './js/supabase.js'

let lojas    = []
let tabAtual = 'lojas'
let editId   = null
let searchVal = ''
let filtroStatus = 'todos'

const planoValor = { piloto: 0, basico: 79, padrao: 99 }
const planoLabel = { piloto: 'Piloto', basico: 'Básico R$79', padrao: 'Padrão R$99' }
const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

function toast(msg, dur = 2500) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), dur)
}

// ===== AUTH =====
async function init() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios').select('perfil').eq('email', user.email).single()
    if (perfil?.perfil === 'admin') {
      document.getElementById('hUser').textContent = user.email
      await carregarLojas()
      document.getElementById('loading').style.display  = 'none'
      document.getElementById('adminWrap').style.display = 'block'
      renderLojas()
      return
    }
  }
  document.getElementById('loading').style.display = 'none'
  document.getElementById('loginWrap').style.display = 'block'
}

window.fazerLogin = async function() {
  const email = document.getElementById('lEmail').value.trim()
  const senha = document.getElementById('lSenha').value
  const err   = document.getElementById('lErr')
  err.style.display = 'none'
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    const { data: perfil } = await supabase
      .from('usuarios').select('perfil').eq('email', email).single()
    if (perfil?.perfil !== 'admin') throw new Error('Sem permissão')
    document.getElementById('loginWrap').style.display  = 'none'
    document.getElementById('adminWrap').style.display  = 'block'
    document.getElementById('hUser').textContent = email
    await carregarLojas()
    renderLojas()
  } catch(e) {
    err.style.display = 'block'
  }
}

window.sair = async function() {
  await supabase.auth.signOut()
  window.location.reload()
}

// ===== DADOS =====
async function carregarLojas() {
  const { data } = await supabase
    .from('lojas').select('*').order('criada_em', { ascending: false })
  lojas = data || []
}

// ===== TABS =====
window.trocarTab = function(tab, el) {
  tabAtual = tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  if (tab === 'lojas') renderLojas()
  else renderFinanceiro()
}

// ===== LOJAS =====
function renderLojas() {
  const ativas   = lojas.filter(l => l.ativa).length
  const inativas = lojas.filter(l => !l.ativa).length
  const receita  = lojas.filter(l => l.ativa).reduce((s, l) => s + (planoValor[l.plano] || 0), 0)

  let filtradas = lojas.filter(l => {
    const ok = l.nome?.toLowerCase().includes(searchVal.toLowerCase()) ||
               l.cidade?.toLowerCase().includes(searchVal.toLowerCase()) ||
               l.email_dono?.toLowerCase().includes(searchVal.toLowerCase())
    const st = filtroStatus === 'todos' ? true : filtroStatus === 'ativo' ? l.ativa : !l.ativa
    return ok && st
  })

  let html = `
    <div class="stats">
      <div class="stat"><div class="stat-val or">${lojas.length}</div><div class="stat-lbl">Total de lojas</div></div>
      <div class="stat"><div class="stat-val gr">${ativas}</div><div class="stat-lbl">Ativas</div></div>
      <div class="stat"><div class="stat-val re">${inativas}</div><div class="stat-lbl">Inativas</div></div>
      <div class="stat"><div class="stat-val or">${fmt(receita)}</div><div class="stat-lbl">Receita/mês</div></div>
    </div>
    <div class="toolbar">
      <span class="toolbar-title">Lanchonetes cadastradas</span>
      <div class="toolbar-right">
        <input class="search" placeholder="Buscar..." value="${searchVal}" oninput="buscar(this.value)">
        <select class="sel" onchange="filtrar(this.value)">
          <option value="todos">Todas</option>
          <option value="ativo">Ativas</option>
          <option value="inativo">Inativas</option>
        </select>
        <button class="add-btn" onclick="abrirModalNova()">+ Nova loja</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr>
          <th>Lanchonete</th>
          <th>Cidade</th>
          <th>Plano</th>
          <th>Status</th>
          <th>Vencimento</th>
          <th>Cardápio</th>
          <th>Ações</th>
        </tr></thead>
        <tbody>`

  filtradas.forEach(l => {
    const vence    = l.plano_vence_em ? new Date(l.plano_vence_em) : null
    const hoje     = new Date()
    const dias     = vence ? Math.ceil((vence - hoje) / 86400000) : null
    const venceLbl = dias === null ? '—' : dias < 0 ? 'Vencido' : `${dias}d`
    const venceCls = dias === null ? '' : dias < 0 ? 'alerta-danger' : dias <= 7 ? 'alerta-warn' : 'alerta-ok'
    const link     = `${window.location.origin}/index.html?loja=${l.id}`

    html += `<tr>
      <td>
        <div class="store-name-cell">${l.nome}</div>
        <div class="store-email">${l.email_dono}</div>
      </td>
      <td>${l.cidade || '—'}</td>
      <td><span class="pill pill-or">${planoLabel[l.plano] || l.plano}</span></td>
      <td><span class="pill ${l.ativa ? 'pill-gr' : 'pill-re'}">${l.ativa ? 'Ativa' : 'Inativa'}</span></td>
      <td><span class="${venceCls}">${venceLbl}</span></td>
      <td>
        <button class="tbl-btn btn-bl" onclick="copiarLink('${link}')">Copiar link</button>
      </td>
      <td>
        <div class="tbl-actions">
          <button class="tbl-btn btn-or" onclick="editarLoja('${l.id}')">Editar</button>
          <button class="tbl-btn ${l.ativa ? 'btn-re' : 'btn-gr'}" onclick="toggleAtiva('${l.id}')">
            ${l.ativa ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </td>
    </tr>`
  })

  html += `</tbody></table></div>`
  document.getElementById('mainBody').innerHTML = html
}

window.buscar = function(v) { searchVal = v; renderLojas() }
window.filtrar = function(v) { filtroStatus = v; renderLojas() }

window.copiarLink = function(link) {
  navigator.clipboard.writeText(link)
  toast('✅ Link copiado!')
}

window.toggleAtiva = async function(id) {
  const l = lojas.find(x => x.id === id)
  l.ativa = !l.ativa
  await supabase.from('lojas').update({ ativa: l.ativa }).eq('id', id)
  toast(l.ativa ? '✅ Loja ativada' : '🔒 Loja desativada')
  renderLojas()
}

// ===== MODAL =====
window.abrirModalNova = function() {
  editId = null
  document.getElementById('modalTitleTxt').textContent = 'Nova lanchonete'
  document.getElementById('modalInfo').style.display   = 'none'
  document.getElementById('mSaveBtn').textContent      = 'Cadastrar lanchonete'
  document.getElementById('mNome').value   = ''
  document.getElementById('mCidade').value = ''
  document.getElementById('mWpp').value    = ''
  document.getElementById('mEmail').value  = ''
  document.getElementById('mSenha').value  = ''
  document.getElementById('mPlano').value  = 'piloto'
  const d = new Date(); d.setDate(d.getDate() + 60)
  document.getElementById('mVence').value  = d.toISOString().split('T')[0]
  document.getElementById('modalBg').classList.add('open')
}

window.editarLoja = function(id) {
  editId = id
  const l = lojas.find(x => x.id === id)
  document.getElementById('modalTitleTxt').textContent = 'Editar lanchonete'
  document.getElementById('mSaveBtn').textContent      = 'Salvar alterações'
  document.getElementById('modalInfo').style.display   = 'block'
  document.getElementById('modalInfo').innerHTML       =
    `<strong>ID:</strong> ${l.id}<br><strong>Criada em:</strong> ${new Date(l.criada_em).toLocaleDateString('pt-BR')}`
  document.getElementById('mNome').value   = l.nome || ''
  document.getElementById('mCidade').value = l.cidade || ''
  document.getElementById('mWpp').value    = l.whatsapp || ''
  document.getElementById('mEmail').value  = l.email_dono || ''
  document.getElementById('mSenha').value  = ''
  document.getElementById('mPlano').value  = l.plano || 'piloto'
  document.getElementById('mVence').value  = l.plano_vence_em || ''
  document.getElementById('modalBg').classList.add('open')
}

window.fecharModal = function() {
  document.getElementById('modalBg').classList.remove('open')
}

window.salvarLoja = async function() {
  const nome  = document.getElementById('mNome').value.trim()
  const email = document.getElementById('mEmail').value.trim()
  const senha = document.getElementById('mSenha').value.trim()
  if (!nome || !email) { toast('⚠️ Preencha nome e e-mail'); return }

  const btn = document.getElementById('mSaveBtn')
  btn.disabled = true
  btn.textContent = 'Salvando...'

  try {
    if (editId) {
      const updates = {
        nome,
        cidade:        document.getElementById('mCidade').value,
        whatsapp:      document.getElementById('mWpp').value,
        email_dono:    email,
        plano:         document.getElementById('mPlano').value,
        plano_vence_em: document.getElementById('mVence').value || null
      }
      await supabase.from('lojas').update(updates).eq('id', editId)
      const l = lojas.find(x => x.id === editId)
      Object.assign(l, updates)
      toast('✅ Loja atualizada!')

    } else {
      const { data: authData, error: authErr } = await supabase.auth.admin
        ? await supabase.auth.signUp({ email, password: senha || '123456' })
        : { data: null, error: { message: 'Use o Supabase Dashboard para criar usuários' } }

      const { data: novaLoja, error: lojaErr } = await supabase
        .from('lojas').insert({
          nome,
          cidade:         document.getElementById('mCidade').value,
          whatsapp:       document.getElementById('mWpp').value,
          email_dono:     email,
          plano:          document.getElementById('mPlano').value,
          plano_vence_em: document.getElementById('mVence').value || null,
          ativa:          true,
          aberta:         true
        }).select().single()

      if (lojaErr) throw lojaErr

      await supabase.from('usuarios').insert({
        loja_id: novaLoja.id,
        email,
        nome,
        perfil: 'dono',
        ativo:  true
      })

      lojas.unshift(novaLoja)
      toast('✅ Loja cadastrada!')
    }

    fecharModal()
    renderLojas()
  } catch(e) {
    console.error(e)
    toast('❌ Erro: ' + (e.message || 'tente novamente'))
  } finally {
    btn.disabled = false
    btn.textContent = editId ? 'Salvar alterações' : 'Cadastrar lanchonete'
  }
}

// ===== FINANCEIRO =====
function renderFinanceiro() {
  const ativas  = lojas.filter(l => l.ativa && l.plano !== 'piloto')
  const receita = ativas.reduce((s, l) => s + (planoValor[l.plano] || 0), 0)
  const hoje    = new Date()

  const vencendo = lojas
    .filter(l => l.plano_vence_em)
    .map(l => ({ ...l, dias: Math.ceil((new Date(l.plano_vence_em) - hoje) / 86400000) }))
    .filter(l => l.dias <= 7)
    .sort((a, b) => a.dias - b.dias)

  let html = `
    <div class="fin-total">
      <div>
        <div class="fin-total-lbl">Receita mensal recorrente</div>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-top:0.15rem;">${ativas.length} lojas pagantes</div>
      </div>
      <div class="fin-total-val">${fmt(receita)}/mês</div>
    </div>
    <div class="fin-grid">
      <div class="fin-card">
        <div class="fin-card-title">Lojas pagantes</div>`

  if (ativas.length) {
    ativas.forEach(l => {
      html += `<div class="fin-row">
        <span>${l.nome}</span>
        <span class="fin-val">${fmt(planoValor[l.plano])}</span>
      </div>`
    })
  } else {
    html += `<div style="font-size:0.82rem;color:var(--txt3);text-align:center;padding:1rem;">Nenhuma loja pagante ainda</div>`
  }

  html += `</div>
      <div class="fin-card">
        <div class="fin-card-title">Projeção de crescimento</div>
        <div class="fin-row"><span>Com 10 lojas (R$99)</span><span class="fin-val">R$990/mês</span></div>
        <div class="fin-row"><span>Com 20 lojas (R$99)</span><span class="fin-val">R$1.980/mês</span></div>
        <div class="fin-row"><span>Com 30 lojas (R$99)</span><span class="fin-val">R$2.970/mês</span></div>
        <div class="fin-row"><span>Com 50 lojas (R$99)</span><span class="fin-val">R$4.950/mês</span></div>
      </div>
    </div>
    <div class="alerta-card">
      <div class="alerta-title">Alertas de vencimento</div>`

  if (vencendo.length) {
    vencendo.forEach(l => {
      const cls = l.dias < 0 ? 'alerta-danger' : l.dias <= 3 ? 'alerta-warn' : ''
      const lbl = l.dias < 0 ? 'VENCIDO' : l.dias === 0 ? 'Vence hoje' : `Vence em ${l.dias}d`
      html += `<div class="alerta-row">
        <span>${l.nome} — ${l.cidade || ''}</span>
        <span class="${cls}">${lbl}</span>
      </div>`
    })
  } else {
    html += `<div class="alerta-row"><span>Nenhum alerta no momento</span><span class="alerta-ok">Tudo em dia ✓</span></div>`
  }

  html += `</div>`
  document.getElementById('mainBody').innerHTML = html
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginWrap').style.display !== 'none') {
    window.fazerLogin()
  }
})

init()
