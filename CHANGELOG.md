# Changelog — DeliveryApp

## [Unreleased] — Em desenvolvimento

### Planejado (quando tiver 5+ lojas)
- Repetir pedido anterior — botão "Repetir último pedido" monta carrinho automaticamente
- Acompanhamento em tempo real — timeline animada + Supabase Realtime (`acompanhar.html`)
- QR Code para mesas — modo salão, parâmetro `?mesa=5` na URL
- Robô WhatsApp com IA — Evolution API, 1 instância para N lojas

---

## [0.5.0] — 2026-04-29

### Corrigido
- `pedidos.js`: removido `console.error` redundante antes do `throw`; falha silenciosa em itens agora exibe toast
- `admin.js`: removido `console.error` que duplicava o `toast()` já existente

### Confirmado (já estava implementado)
- `getTaxaEntrega` — já usava `.ilike()` no Supabase
- Cache HTTP — `vercel.json` já tinha Cache-Control para JS, CSS, PNG, JPG, SVG, ICO
- Header mobile — CSS correto, mobile-first, flex-wrap funcionando
- Coluna `cidade` na tabela `lojas` — salva e exibe no header do cardápio

---

## [0.4.0] — 2026-04-27 (sessão 2)

### Adicionado
- `painel-style.css` — CSS extraído do `painel.html` (440 → 181 linhas)
- `pagamento-style.css` + `pagamento.js` — extraídos do `pagamento.html` (643 → 56 linhas)
- `admin-style.css` + `admin.js` — extraídos do `admin.html` (569 → 98 linhas)
- Hook automático no `.claude/settings.json`: avisa quando arquivo editado ultrapassa 400 linhas

### Interno
- Memórias locais migradas para o `CLAUDE.md` — contexto portátil via git

---

## [0.3.0] — 2026-04-27 (sessão 1)

### Adicionado
- Header expandido no cardápio: nome grande, status aberto/fechado, tempo de entrega, cidade
- Emoji automático por tipo de produto quando sem foto
- Campo "Cidade" no painel de configurações do dono

### Corrigido
- Bug crítico no `vercel.json`: padrão `(?:...)` inválido em path-to-regexp causava falha em todos os deploys
- Projeto recriado na Vercel com integração GitHub funcionando
- GitHub Action para auto-deploy via deploy hook (`.github/workflows/deploy.yml`)
- `package.json` mínimo adicionado para Vercel reconhecer o projeto

### Refatorado
- CSS compactado (cards e espaçamentos menores)
- `painel-cardapio.js` separado em módulos menores

---

## [0.2.0] — antes de 2026-04-27

### Adicionado
- Selos nos produtos: vegano 🌱, sem glúten 🌾, novo ✨, picante 🌶️
- Banners promocionais no cardápio (carrossel até 3, troca a cada 4s, upload no painel)
- Seção "Destaques" no cardápio (carrossel horizontal, slide a cada 3s)
- Barra de navegação inferior (Início / Carrinho com badge)
- Modal de confirmação após adicionais (quantidade + observações + continuar/carrinho)
- "Peça também" no carrinho (upsell — sugere bebidas/sobremesas)
- Separação do `index.html` em módulos: `carrinho.js`, `adicionais.js`, `checkout.js`, `cardapio-style.css`

---

## [0.1.0] — versão inicial

### Adicionado
- Cardápio digital do cliente (hero, categorias, busca, carrinho persistente)
- Painel do dono com 3 modais separados (categoria, produto, adicionais)
- Adicionais e complementos por produto (obrigatório/opcional, radio/contador)
- Taxa de entrega por bairro (cadastra no painel, calcula pelo CEP)
- Reconhecimento do cliente pelo CEP (celular só busca pontos)
- Pagamentos: PIX, Cartão via Mercado Pago, Dinheiro (configurável por loja)
- Fidelidade + cupons + transmissão WhatsApp em massa
- Horário automático abre/fecha loja
- Badge ABERTO em verde no cardápio
- Segurança: valor recalculado no servidor, idempotency-key, logs, validações
