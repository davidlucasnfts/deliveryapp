// api/admin-criar-usuario.js — Vercel Function
// Cria o usuário de autenticação do dono de uma nova loja.
// ANTES: admin.js usava supabase.auth.signUp com a anon key — isso derrubava
// a sessão do admin E o usuário ficava sem vínculo (usuarios.id ≠ auth.uid()),
// quebrando o RLS. Agora a criação usa a service key aqui no servidor.
//
// SEGURANÇA: exige JWT de um usuário com perfil 'admin' (verificado no banco).

// Rate limit best-effort (memória da instância)
const _rl = new Map()
function rateLimitOk(ip, max = 5, janelaMs = 60000) {
  const agora = Date.now()
  const hits = (_rl.get(ip) || []).filter(t => agora - t < janelaMs)
  if (hits.length >= max) { _rl.set(ip, hits); return false }
  hits.push(agora); _rl.set(ip, hits); return true
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método não permitido' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (!rateLimitOk(ip)) return res.status(429).json({ error: 'Muitas requisições' })

  const { email, senha } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'E-mail inválido' })
  if (!senha || senha.length < 8)
    return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

  // Autenticação: token de sessão do admin
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Não autenticado' })

  const rUser = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
  })
  if (!rUser.ok) return res.status(401).json({ error: 'Sessão inválida' })
  const user = await rUser.json()

  // Autorização: precisa ser admin (perfil verificado no banco, nunca no client)
  const rPerm = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${user.id}&select=perfil`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  const [usuario] = await rPerm.json()
  if (usuario?.perfil !== 'admin') return res.status(403).json({ error: 'Apenas administradores' })

  try {
    // Cria via REST da API admin do GoTrue — sem dependência de pacote
    const rCreate = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        email,
        password: senha,
        email_confirm: true // dono já entra confirmado — sem e-mail de confirmação
      })
    })
    const data = await rCreate.json().catch(() => ({}))

    if (!rCreate.ok) {
      const msg = data.msg || data.message || data.error_description || ''
      if (/already been registered|already exists|duplicate/i.test(msg))
        return res.status(409).json({ error: 'Este e-mail já está cadastrado' })
      return res.status(400).json({ error: msg || 'Falha ao criar usuário' })
    }

    return res.status(200).json({ userId: data.id })
  } catch (err) {
    console.error('admin-criar-usuario:', err.message)
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' })
  }
}
