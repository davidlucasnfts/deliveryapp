// Escape de HTML — OBRIGATÓRIO em toda interpolação de dado do banco/usuário em innerHTML.
// Uso: elemento.innerHTML = `<div>${esc(dado.nome)}</div>`
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}
