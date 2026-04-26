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
  // imagem centralizada via CSS object-fit:contain — sem posicionamento manual
}

export function iniciarDragImagem() {
  // removido: imagem agora é responsiva e centralizada automaticamente
}

export function comprimirImagem(file, maxSize = 1080) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const { width: w, height: h } = img
        let newW = w, newH = h
        if (w > maxSize || h > maxSize) {
          if (w >= h) { newW = maxSize; newH = Math.round(h * maxSize / w) }
          else        { newH = maxSize; newW = Math.round(w * maxSize / h) }
        }
        const c = document.createElement('canvas')
        c.width = newW; c.height = newH
        c.getContext('2d').drawImage(img, 0, 0, newW, newH)
        c.toBlob(blob => blob ? resolve(blob) : reject(new Error('Erro ao comprimir')), 'image/jpeg', 0.92)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
