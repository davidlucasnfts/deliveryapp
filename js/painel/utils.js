// js/painel/utils.js — funções reutilizáveis em todos os módulos

export const fmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',')

export function toast(msg, dur = 2500) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), dur)
}

export function mascaraTel(input) {
  let v = input.value.replace(/\D/g, '')
  if (v.length > 11) v = v.slice(0, 11)
  if (v.length <= 2)       v = '(' + v
  else if (v.length <= 7)  v = '(' + v.slice(0,2) + ') ' + v.slice(2)
  else                     v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7)
  input.value = v
}

export function atualizarData() {
  const d = new Date()
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const el = document.getElementById('hDate')
  if (el) el.textContent = `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

export function tempoDecorrido(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1)  return 'agora mesmo'
  if (diff === 1) return 'há 1 min'
  if (diff < 60)  return `há ${diff} min`
  return `há ${Math.floor(diff / 60)}h`
}

export function isUrgente(ts, status) {
  if (status === 'entregue') return false
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000) > 30
}

// ===== IMAGEM =====
export let imgOffsetX = 50
export let imgOffsetY = 50

export function setImgOffset(x, y) {
  imgOffsetX = x
  imgOffsetY = y
}

export function atualizarPosImagem() {
  const img = document.getElementById('epImgPos')
  if (!img) return
  img.style.left = `calc(${imgOffsetX}% - 75%)`
  img.style.top  = `calc(${imgOffsetY}% - 75%)`
}

export function iniciarDragImagem() {
  const wrap = document.getElementById('epImgPosWrap')
  if (!wrap || wrap._dragInit) return
  wrap._dragInit = true
  let dragging = false, startX = 0, startY = 0, ox = 50, oy = 50

  const onStart = (cx, cy) => {
    dragging = true
    startX = cx; startY = cy
    ox = imgOffsetX; oy = imgOffsetY
  }
  const onMove = (cx, cy) => {
    if (!dragging) return
    const rect = wrap.getBoundingClientRect()
    imgOffsetX = Math.max(0, Math.min(100, ox - (cx - startX) / rect.width  * 100))
    imgOffsetY = Math.max(0, Math.min(100, oy - (cy - startY) / rect.height * 100))
    atualizarPosImagem()
  }
  const onEnd = () => { dragging = false }

  wrap.addEventListener('mousedown',  e => onStart(e.clientX, e.clientY))
  wrap.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY))
  wrap.addEventListener('mouseup',    onEnd)
  wrap.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  wrap.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: false })
  wrap.addEventListener('touchend',   onEnd)
}

export function comprimirImagem(file, maxSize = 1080) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const { width: w, height: h } = img
        const lado = Math.min(w, h)
        const c1 = document.createElement('canvas')
        c1.width = lado; c1.height = lado
        const ox = (imgOffsetX / 100) * (w - lado)
        const oy = (imgOffsetY / 100) * (h - lado)
        c1.getContext('2d').drawImage(img, ox, oy, lado, lado, 0, 0, lado, lado)
        const c2 = document.createElement('canvas')
        c2.width = maxSize; c2.height = maxSize
        c2.getContext('2d').drawImage(c1, 0, 0, maxSize, maxSize)
        c2.toBlob(blob => blob ? resolve(blob) : reject(new Error('Erro ao comprimir')), 'image/jpeg', 0.92)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
