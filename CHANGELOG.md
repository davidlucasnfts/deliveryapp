# Changelog — DeliveryApp

## 🔜 Próximas sessões
- Dashboard do painel com métricas do dia (pedidos, ganhos, status por cor)
- Número do pedido formatado — `PD-20260429-00123` em vez de UUID

## 🔜 Futuro (5+ lojas)
- Repetir pedido anterior — botão "Repetir último pedido" monta carrinho automaticamente
- Acompanhamento em tempo real — timeline animada + Supabase Realtime (`acompanhar.html`)
- QR Code para mesas — modo salão, parâmetro `?mesa=5` na URL
- Robô WhatsApp com IA — Evolution API, 1 instância para N lojas

---

## [0.5.0] — 2026-04-29

✅ `pedidos.js`: substituído `console.error` por `showToast` na falha silenciosa de itens
✅ `admin.js`: removido `console.error` redundante (já havia `toast()` na sequência)
✅ `getTaxaEntrega` — confirmado uso de `.ilike()` no Supabase
✅ Cache HTTP — confirmado `Cache-Control` no `vercel.json` para JS, CSS, imagens
✅ Header mobile — confirmado CSS correto, mobile-first, flex-wrap funcionando
✅ Coluna `cidade` na tabela `lojas` — confirmada, salva e exibe no header

---

## [0.4.0] — 2026-04-27

✅ `painel-style.css` — CSS extraído do `painel.html` (440 → 181 linhas)
✅ `pagamento-style.css` + `pagamento.js` — extraídos do `pagamento.html` (643 → 56 linhas)
✅ `admin-style.css` + `admin.js` — extraídos do `admin.html` (569 → 98 linhas)
✅ Hook automático: avisa no terminal quando arquivo editado ultrapassa 400 linhas

---

## [0.3.0] — 2026-04-27

✅ Header expandido no cardápio: nome grande, status aberto/fechado, tempo de entrega, cidade
✅ Emoji automático por tipo de produto quando sem foto
✅ Campo "Cidade" no painel de configurações do dono
✅ Bug crítico no `vercel.json` corrigido (`(?:...)` inválido quebrava todos os deploys)
✅ Projeto recriado na Vercel com integração GitHub funcionando
✅ GitHub Action para auto-deploy via deploy hook
✅ `package.json` mínimo adicionado para Vercel reconhecer o projeto
✅ CSS compactado (cards e espaçamentos menores)
✅ `painel-cardapio.js` separado em módulos menores

---

## [0.2.0] — antes de 2026-04-27

✅ Selos nos produtos: vegano 🌱, sem glúten 🌾, novo ✨, picante 🌶️
✅ Banners promocionais no cardápio (carrossel até 3, troca a cada 4s, upload no painel)
✅ Seção "Destaques" no cardápio (carrossel horizontal, slide a cada 3s)
✅ Barra de navegação inferior (Início / Carrinho com badge)
✅ Modal de confirmação após adicionais (quantidade + observações + continuar/carrinho)
✅ "Peça também" no carrinho (upsell — sugere bebidas/sobremesas)
✅ Separação do `index.html` em módulos: `carrinho.js`, `adicionais.js`, `checkout.js`, `cardapio-style.css`

---

## [0.1.0] — versão inicial

✅ Cardápio digital do cliente (hero, categorias, busca, carrinho persistente)
✅ Painel do dono com 3 modais separados (categoria, produto, adicionais)
✅ Adicionais e complementos por produto (obrigatório/opcional, radio/contador)
✅ Taxa de entrega por bairro (cadastra no painel, calcula pelo CEP)
✅ Reconhecimento do cliente pelo CEP (celular só busca pontos)
✅ Pagamentos: PIX, Cartão via Mercado Pago, Dinheiro (configurável por loja)
✅ Fidelidade + cupons + transmissão WhatsApp em massa
✅ Horário automático abre/fecha loja
✅ Badge ABERTO em verde no cardápio
✅ Segurança: valor recalculado no servidor, idempotency-key, logs, validações
