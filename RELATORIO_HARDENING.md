# Relatório de Hardening — DeliveryApp

Data: 2026-08-22 · Escopo: sessões de auditoria e correção (Passos 1–5)

Este documento consolida **todas as mudanças feitas no código** e, principalmente,
**tudo o que VOCÊ precisa fazer manualmente** para o sistema funcionar após o deploy.

---

## 1. Resumo dos 5 passos

| Passo | Tema | O que era o problema |
|-------|------|----------------------|
| 1 | Banco de dados (RLS) | Tabelas abertas para qualquer pessoa com a anon key (tokens do Mercado Pago, pedidos, clientes expostos) |
| 2 | XSS (front-end) | Nomes de produtos, bairros e dados do banco injetados em HTML sem escape |
| 3 | API + headers | Functions sem autenticação, CORS aberto, headers de segurança ausentes |
| 4 | Design system | Cores/raios/sombras duplicados em 4 arquivos CSS; cor da loja não aplicava |
| 5 | Limpeza | Página órfã com ações falsas, código morto, "Meus Pedidos" fake, taxas sem UI, admin com senha fixa `123456` |

---

## 2. O que mudou, arquivo por arquivo

### Novos arquivos
- `sql/008_rls_seguranca.sql` — habilita RLS nas 16 tabelas; view `lojas_publicas` (sem tokens);
  helpers `is_admin()` / `minha_loja_id()`; RPCs `buscar_cliente_por_telefone`, `obter_numero_pedido`,
  `confirmar_pagamento`, `registrar_ganho_pontos`; trigger `gerar_numero_pedido` com SECURITY DEFINER.
- `sql/009_meus_pedidos.sql` — RPC `buscar_pedidos_cliente(p_loja_id, p_telefone)` para a tela
  "Meus Pedidos" do cliente (retorna número, status, total e data; limite 20).
- `js/utils.js` — função `esc()` (escape HTML) usada em todo o front.
- `tokens.css` — fonte única de tokens de design (cores, raios, sombras); carregado antes do CSS de cada página.
- `api/admin-criar-usuario.js` — cria o login do dono de loja **no servidor** (service key), exigindo
  JWT de admin verificado no banco; senha mínima de 8 caracteres; rate limit 5/min.

### Arquivos removidos
- `pagamento.html`, `pagamento.js`, `pagamento-style.css` (raiz) — página órfã, nunca linkada,
  com botões que não faziam nada real.

### Arquivos alterados
- **`vercel.json`** — headers de segurança globais (X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy), CSP em modo **Report-Only**, fim do CORS wildcard, cache correto para JS/CSS/imagens.
- **`api/notificar-whatsapp.js`** — agora exige login do lojista e confere se a loja é dele;
  validação de UUID, allowlist de status, guarda contra SSRF na URL do WAHA, rate limit.
- **`api/processar-pagamento.js`** — validação de UUIDs, parcelas limitadas a 1–12,
  rate limit 10/min (anti-carding), sem stack trace em log.
- **`admin.js` / `admin.html`** — criação de loja passou a usar a nova function; fim da senha
  padrão `123456`; `usuarios.id` agora é igual ao `auth.uid()` (essencial para o RLS);
  campo de senha virou `type="password"`.
- **`js/pedidos.js`** — reescrito: UUIDs via `crypto.randomUUID()`, número do pedido via RPC,
  confirmação de pagamento e pontos de fidelidade via RPC (não dá mais para adulterar pelo navegador).
- **`js/cardapio.js`** — loja é lida da view `lojas_publicas` (tokens do MP não chegam mais ao navegador);
  removidas funções mortas.
- **`js/app.js`** — "Meus Pedidos" real (busca por celular, com telefone salvo por loja);
  `showToast` com escape (furo de XSS); removida busca de produtos sem uso.
- **`index.html`** — tela de pedidos virou dinâmica (input de celular + lista); link para `tokens.css`.
- **`js/adicionais.js`, `js/carrinho.js`, `js/pagamento.js`** — escape em todo HTML dinâmico;
  funções de adicionais agora recebem só IDs (sem nome/preço embutido no HTML).
- **`js/painel/*`** — escape (`esc()`) em todos os renders; `_notificarWAHA` envia o token de sessão;
  novo card **🛵 Taxas de entrega** em Configurações (a tabela existia sem interface);
  removidos stubs vazios e `atualizarData`.
- **`painel.html` / `admin.html`** — link para `tokens.css`; removida fonte Material Icons legada (~100KB).
- **`*-style.css` (4 arquivos)** — `:root` duplicados removidos; paleta unificada; overrides intencionais mantidos.
- **Bug corrigido:** `aplicarIdentidade` setava `--or`, mas o cardápio consome `--pr` — a cor da loja
  agora aplica de verdade nos botões e destaques.

---

## 3. AÇÕES MANUAIS — na ordem certa ⚠️

### 3.1. Antes de fazer o deploy (Supabase → SQL Editor)

Rode os scripts **nesta ordem** (cada um de uma vez, verificando se terminou sem erro):

1. `sql/007_waha_config.sql` — se ainda não rodou na sessão 2.
2. **`sql/008_rls_seguranca.sql`** — ⚠️ **crítico**: sem ele, o app novo não funciona
   (o front agora depende da view `lojas_publicas` e das RPCs).
3. **`sql/009_meus_pedidos.sql`** — necessário para a tela "Meus Pedidos".

> Se o 008 der erro em alguma policy, me mande a mensagem de erro antes de prosseguir.

### 3.2. Conferir o vínculo usuários ↔ auth (crítico)

O RLS novo exige que `usuarios.id` seja igual ao `id` do usuário em `auth.users`.
Rode no SQL Editor:

```sql
SELECT u.email, u.id AS usuario_id, au.id AS auth_id,
       (u.id = au.id) AS ok
FROM usuarios u
JOIN auth.users au ON au.email = u.email;
```

- Se `ok = true` para todo mundo: nada a fazer.
- Se algum `ok = false`: o painel/admin dessa pessoa vai quebrar. Me avise que eu te passo
  o SQL de correção (não rode updates nessa tabela por conta própria).

### 3.3. Rotacionar os tokens do Mercado Pago (segurança)

Os `mp_access_token` das lojas ficaram **expostos publicamente** até agora (qualquer pessoa
podia lê-los pela API). Considere-os comprometidos:

1. No painel do Mercado Pago de cada loja (a começar pela **Pizzaria Melinda**), gere um
   novo Access Token e revogue o antigo.
2. Atualize o token no painel da loja (Configurações → Pagamentos) ou direto no banco.

### 3.4. Deploy

Faça o commit/push quando quiser — **eu não commitei nem enviei nada**, por sua regra.
Só depois dos passos 3.1 e 3.2.

### 3.5. Testes pós-deploy (checklist)

- [ ] Cardápio abre normalmente (`index.html?loja=...`) e a cor da loja aplica nos botões.
- [ ] Fazer um pedido de teste até o fim (checkout cria o pedido com número sequencial).
- [ ] No cardápio, aba **Pedidos**: digitar o celular usado no teste → o pedido aparece com status.
- [ ] Painel da loja: lista de pedidos carrega, avançar status funciona (e dispara WhatsApp se o WAHA estiver no ar).
- [ ] Painel → **Configurações → 🛵 Taxas de entrega**: adicionar e remover um bairro.
- [ ] Admin: criar uma loja nova com senha de 8+ caracteres, entrar no painel dela com esse login,
      e **apagar a loja de teste depois**.
- [ ] F12 → Console: sem erros vermelhos; na aba Network, conferir que há relatórios de CSP
      (Report-Only) — se aparecer muita violação de algo legítimo, me avise antes de eu endurecer o CSP.

---

## 4. Pendências conhecidas (próximos passos, não bloqueantes)

- **Webhook do Mercado Pago** — hoje a confirmação de pagamento é chamada pelo navegador do cliente;
  o correto é o MP avisar o servidor. Anti-fraude de verdade vem daqui.
- **Recálculo de preço server-side no pedido** — o total ainda pode ser manipulado no navegador
  antes da criação do pedido (o pagamento em si já é recalculado no servidor).
- **Rate limit real** — o atual é por instância da function (best-effort); o definitivo usa
  Upstash/Vercel KV.
- **CSP em modo enforce** — ficou em Report-Only de propósito (o app usa handlers inline);
  endurecer exige migrar os `onclick` do HTML para listeners.
- **LGPD**: a coluna `cliente_id` nunca é gravada em `pedidos`, então a anonimização de pedidos
  de um cliente que pede exclusão não funciona ainda (bug conhecido).
- **UX**: alguns `alert()` nativos no checkout poderiam virar toasts.
- **Fonte Poppins** — é referenciada mas nunca carregada; hoje o app usa a fonte do sistema.
  Decidir se carrega de verdade ou se remove a referência.

---

## 5. O que NÃO foi mexido (decisões mantidas)

- Pagamento via Mercado Pago continua client-side com recálculo server-side na cobrança
  (mudar isso é o passo do webhook, acima).
- WAHA continua na mesma arquitetura — só passou a exigir login.
- Nenhum commit/push foi feito por mim.
