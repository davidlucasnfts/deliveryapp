# DeliveryApp — Contexto Completo do Projeto

## O que é
SaaS de cardápio digital + delivery para lanchonetes, pizzarias, açaiterias, hamburguerias e churrascarias no nordeste do Brasil.

## Desenvolvedor
- **Nome:** David Lucas — Analista de Sistemas no Grupo Mateus, Vargem Grande/MA
- **Email:** davidlucasnfts@gmail.com
- **GitHub:** github.com/davidlucasnfts/deliveryapp

## Infraestrutura
- **Supabase URL:** https://gkzdqnhhecfwkmrsfrcj.supabase.co
- **Vercel:** deliveryapp-git-main-davidlucasnfts-projects.vercel.app (auto-deploy via git push)
- **Bucket Storage:** `produtos` (público)
- **Login admin:** davidlucasnfts@gmail.com
- **Login dono piloto:** dono@pizzariamelinda.com / melinda123
- **ID Pizzaria Melinda:** 0509197c-fb63-4319-9eae-e4e71368d3c4

## Stack
- HTML5 + CSS3 + JavaScript ES Modules (SEM framework)
- Supabase (banco + auth + storage + realtime)
- Vercel (deploy + serverless functions)
- Mercado Pago (pagamentos — cada dono usa própria conta)

## Estrutura de Arquivos

```
deliveryapp/
├── index.html              ← cardápio do cliente
├── cardapio-style.css      ← CSS do cardápio
├── painel.html             ← painel do proprietário (HTML apenas)
├── painel-style.css        ← CSS do painel
├── admin.html              ← painel administrativo (HTML apenas)
├── admin-style.css         ← CSS do admin
├── admin.js                ← lógica do admin (ES module)
├── pagamento.html          ← configuração de gateways (HTML apenas)
├── pagamento-style.css     ← CSS da tela de pagamento
├── pagamento.js            ← lógica de gateways de pagamento
├── login.html
├── home.html
├── vercel.json
├── api/
│   └── processar-pagamento.js  ← Vercel Function Mercado Pago
└── js/
    ├── supabase.js
    ├── auth.js
    ├── cardapio.js          ← getLoja, getCategorias, getProdutos, getGruposAdicionais, getTaxaEntrega
    ├── pedidos.js           ← criarPedido (com validações), validarCupom, buscarClientePorTelefone
    ├── carrinho.js          ← carrinho, totais, "peça também" (upsell)
    ├── adicionais.js        ← modal de adicionais + modal de confirmação
    ├── checkout.js          ← formulário, CEP, pagamento, cupom
    └── painel/
        ├── painel-core.js
        ├── painel-pedidos.js
        ├── painel-cardapio.js  ← 3 modais separados (categoria, produto, adicionais)
        ├── painel-fidelidade.js
        ├── painel-config.js    ← taxas de entrega, pagamento MP, horário
        └── utils.js
```

## Arquitetura de Estado
- Todos os módulos JS compartilham estado via `window.APP`
- O `index.html` cria `window.APP` com todas as variáveis no init()
- Módulos leem/escrevem `window.APP.cart`, `window.APP.loja`, etc
- Funções cross-module são chamadas via `window.xxx()` (expostas pelo exp({}) no index)
- NUNCA usar variáveis soltas nos módulos — sempre `window.APP.variavel`

## Banco de Dados — Tabelas

| Tabela | Função |
|---|---|
| `lojas` | Config + pix_ativo, cartao_ativo, dinheiro_ativo, chave_pix, mp_public_key, mp_access_token, mp_ativo, hora_abre, hora_fecha |
| `usuarios` | Donos e admin |
| `categorias` | tipo: normal/combo, ordem, ativa |
| `produtos` | img_offset_x/y, disponivel |
| `pedidos` | forma_pagamento, status_pagamento, mp_payment_id |
| `itens_pedido` | produto_id, preco_unitario, quantidade, subtotal |
| `itens_pedido_adicionais` | adicionais escolhidos por item |
| `grupos_adicionais` | grupos por produto (obrigatorio, min/max_escolha) |
| `adicionais` | opções de cada grupo com preço |
| `taxas_entrega` | taxa por bairro por loja |
| `clientes` | endereco_rua/num/comp/bairro/cidade/cep, total_pontos/pedidos/gasto |
| `pontos_historico` | histórico de pontos |
| `fidelidade_config` | configuração do programa de fidelidade |
| `cupons` | cupons de desconto |
| `transmissoes` | histórico de transmissões WhatsApp |
| `banners` | banners promocionais por loja (foto_url, ordem, ativo) — bucket storage: `banners` |

## Segurança
- RLS ativo em todas as tabelas
- anon pode: criar pedidos, itens, clientes, ler categorias/produtos/adicionais/taxas/cupons
- authenticated (dono): CRUD completo na sua loja
- Vercel Function busca valor do BANCO (nunca do frontend) para pagamento
- Idempotency-Key baseada no pedidoId no Mercado Pago
- Validações robustas antes de INSERT (nome, celular 11 dígitos, itens, total > 0)

## Modelo de Negócio

| Plano | Valor |
|---|---|
| Piloto | Grátis |
| Básico | R$79/mês |
| Padrão | R$99/mês |

Concorrentes: Anota AI (R$280-399/mês), CardapioWeb (R$135-300/mês)

## Diretrizes de Código
- Mobile-first sempre
- Fontes: Plus Jakarta Sans (cardápio) + Poppins (painel)
- Feedback visual em tudo (toast, loading, disabled)
- Formulários mínimos — CEP preenche endereço via ViaCEP
- RLS antes de produção, UUIDs, índices em colunas de busca
- Arquivos JS max 400 linhas, funções max 50 linhas
- Multi-tenant — sempre filtrar por loja_id
- git pull antes de começar em qualquer computador

---

# BACKLOG DE MELHORIAS (priorizado por impacto)

> Baseado em análise completa de: Cardapio.ai (R$49,90–R$99,90), Anota AI (R$280–399), CardapioWeb (R$135–300), Saipos (R$219), Deeliv. Última análise: 2026-04-29.

## ✅ Entregues

- [x] Dashboard de pedidos com métricas do dia (faturamento, em aberto, ticket médio, mais vendido)
- [x] Pedidos agrupados por status com seção colapsável de concluídos
- [x] Número de pedido formatado `PD-YYYYMMDD-NNNNN` via trigger Supabase
- [x] Relatórios (hoje / 7 dias / 30 dias): faturamento, top produtos, bairros, horários de pico
- [x] Botão avaliação pós-entrega (WhatsApp)
- [x] Banners promocionais por loja
- [x] Destaques e upsell ("peça também")
- [x] Programa de fidelidade + cupons + transmissão WhatsApp
- [x] Taxas de entrega por bairro
- [x] Adicionais por grupo (obrigatório, min/max) com drag

---

## 🔥 Alta Prioridade (próximas sessões)

### 1. Painel responsivo para desktop
- **Por que:** Cardapio.ai e todos os concorrentes têm painel desktop com sidebar + kanban. Donos que gerenciam no computador vão preferir o concorrente.
- **O que:** `painel-style.css` com breakpoint `@media (min-width: 768px)` — sidebar fixa lateral, conteúdo ocupa 100% da tela, kanban de pedidos em colunas lado a lado
- **Cardápio do cliente:** NÃO precisa — 95%+ dos pedidos vêm de celular, mobile-first está correto
- **Onde:** `painel-style.css` + `painel.html` (estrutura sidebar)

### 2. Kanban de pedidos (visão desktop)
- **Por que:** Cardapio.ai mostra 4 colunas simultâneas (Novo | Em preparo | Saiu | Concluído). Muito mais produtivo que scroll linear.
- **O que:** no desktop, renderizar `renderPedidos()` em layout kanban 4 colunas; no mobile mantém layout atual
- **Onde:** `painel-pedidos.js` + `painel-style.css`

### 3. Acompanhamento do pedido em tempo real
- **Por que:** Feature chave de retenção — cliente não precisa ligar para saber o status
- **O que:** Link único `acompanhar.html?id=PD-20260429-00123`. Timeline animada: recebido → em preparo → saiu → entregue. Atualiza via Supabase Realtime.
- **Onde:** nova página `acompanhar.html` + `acompanhar-style.css` + `js/acompanhar.js`

### 4. Controle de estoque com gatilho de urgência
- **Por que:** Cardapio.ai exibe "Últimas unidades!" e desativa produto automaticamente quando zera
- **O que:** campo `estoque INTEGER` em `produtos`. Quando vende, decrementa. Badge "Últimas unidades!" quando ≤5. Desativa automaticamente quando =0.
- **Onde:** `produtos` table + `painel-cardapio.js` (campo no modal) + `index.html` (badge)

### 5. Central de alertas WhatsApp (notificação de novo pedido)
- **Por que:** Cardapio.ai envia mensagem completa (número, horário, cliente, produtos, total, pagamento) num grupo WhatsApp. Donos recebem sem abrir o painel.
- **O que:** Ao criar pedido, Vercel Function monta mensagem e chama API WhatsApp (Evolution API ou Z-API)
- **Onde:** `api/notificar-pedido.js` (Vercel Function) + campo `whatsapp_notif` em `lojas`

---

## ⚡ Média Prioridade

### 6. Preço promocional no cardápio
- **Por que:** Cardapio.ai mostra "R$49,99 ~~R$69,89~~" — aumenta conversão visualmente
- **O que:** campo `preco_original NUMERIC` em `produtos`. Quando preenchido, mostra tachado.
- **Onde:** `produtos` table + `painel-cardapio.js` + `index.html` + `cardapio-style.css`

### 7. Repetir pedido anterior
- **O que:** Cliente reconhecido (mesmo celular) vê botão "Repetir último pedido" que monta o carrinho automaticamente
- **Onde:** `index.html` + `js/pedidos.js` (função `buscarUltimoPedido`)

### 8. Previsão de entrega no pedido
- **Por que:** Cardapio.ai mostra "Previsão: 12:27" na notificação e no acompanhamento
- **O que:** campo `tempo_entrega_min INTEGER` em `lojas`. Ao fazer pedido, calcula `criado_em + tempo_entrega_min` e exibe na confirmação e no acompanhamento
- **Onde:** `lojas` table + `painel-config.js` + `js/checkout.js` + `acompanhar.html`

### 9. Tipo de pedido: Entrega / Retirada
- **Por que:** Muitos clientes querem retirar no local e pagar menos (sem taxa)
- **O que:** seletor na tela de checkout. Se "Retirada", zera taxa de entrega e não exige endereço.
- **Onde:** `pedidos` table (campo `tipo_pedido`) + `js/checkout.js` + `painel-pedidos.js`

### 10. Pixel Google + Meta (rastreamento)
- **Por que:** Donos que investem em anúncios precisam rastrear conversões
- **O que:** campos `pixel_google TEXT`, `pixel_meta TEXT` em `lojas`. Injeta o script de tracking no `index.html` dinamicamente.
- **Onde:** `lojas` table + `painel-config.js` + `js/cardapio.js` (init)

### 11. Impressão automática (PDV)
- **Por que:** Cardapio.ai tem integração com impressora térmica — grande diferencial operacional
- **O que:** ao receber novo pedido no painel, abre `window.print()` com layout de cupom fiscal
- **Onde:** `painel-pedidos.js` + `painel-style.css` (`@media print`)

### 12. Domínio personalizado
- **Por que:** Cardapio.ai oferece `cardapio.ai/seurestaurante`. Nós já temos `?loja=ID`, mas URL amigável passa profissionalismo.
- **O que:** campo `slug TEXT UNIQUE` em `lojas`. Vercel rewrite: `/r/melinda → index.html?loja=ID`
- **Onde:** `lojas` table + `vercel.json` + `js/cardapio.js`

### 13. "Serve X pessoas" e informações no card
- **Por que:** Cardapio.ai mostra "Serve 4 pessoas · 500ml" — aumenta percepção de valor
- **O que:** campo `serve_pessoas TEXT` em `produtos`. Exibe abaixo da descrição no cardápio.
- **Onde:** `produtos` table + `painel-cardapio.js` + `index.html`

---

## 🔮 Baixa Prioridade (quando tiver 5+ lojas)

### 14. QR Code para mesas (modo salão)
- **O que:** Dono gera QR Code por mesa. Cliente escaneia, faz pedido com número da mesa visível no painel.
- **Onde:** painel + `index.html` (parâmetro `?mesa=5`) + `pedidos` table (campo `numero_mesa`)

### 15. Robô WhatsApp com IA (Evolution API)
- **O que:** 1 instância para N lojas. Saudação automática, confirmação de pedido, atualizações de status via WhatsApp.
- **Onde:** servidor dedicado + Evolution API + webhook Supabase

### 16. Recuperador de carrinho
- **O que:** Se cliente montou carrinho e não finalizou, recebe mensagem WhatsApp 30min depois com link direto
- **Onde:** Supabase Edge Function com cron + Evolution API

### 17. Árvore de links (link de bio)
- **O que:** Cardapio.ai oferece página `cardapio.ai/seurestaurante` com todos os links (cardápio, WhatsApp, Instagram, Google Maps)
- **Onde:** nova página `links.html` ou integrada ao `home.html`

### 18. Controle de acesso de funcionários
- **O que:** Dono cria login para funcionário (caixa, atendente) com permissões limitadas — sem acesso a financeiro/config
- **Onde:** `usuarios` table (campo `role: dono|funcionario`) + RLS por role

### 19. Áreas de entrega por raio (km)
- **O que:** Alternativa às taxas por bairro. Define raio máximo em km a partir do endereço da loja.
- **Onde:** `lojas` table (lat/lng, raio_max) + Google Maps Distance Matrix API

### 20. Múltiplas bandeiras de cartão (Asaas/Stripe)
- **O que:** Além do Mercado Pago, integrar Asaas para parcelamento e mais bandeiras
- **Onde:** nova Vercel Function + `painel-config.js`

---

# CONCORRENTES ANALISADOS

| Concorrente | Preço | Pontos fortes |
|---|---|---|
| **Cardapio.ai** | R$49,90–R$99,90/mês | Painel desktop kanban, robô WhatsApp, estoque, impressão, pixel, recuperador carrinho |
| **Anota AI** | R$280–399/mês | Adicionais completos, "Peça também", banners, destaques, PIX dinâmico, acompanhamento pedido |
| **CardapioWeb** | R$135–300/mês | Bom design, muitos planos, taxa por raio/km |
| **Saipos** | R$219/mês | PDV completo, KDS (tela cozinha), motoboy, integração iFood |
| **Deeliv** | — | Mobile-first moderno |

**Nosso diferencial:** preço 3x menor que a maioria, design superior, dinheiro direto ao dono (sem intermediário), fidelidade integrada, sem taxa por transação

---

# COMO TRABALHAR COM O CLAUDE NESTE PROJETO

## Perfil do desenvolvedor
David Lucas é analista de sistemas (não desenvolvedor) que usa o Claude Code como ferramenta principal de desenvolvimento. Tem visão de produto e negócio, mas não escreve código manualmente. Quer projetos escaláveis e profissionais. Prefere entender o "porquê" além do "como".

## Idioma e estilo de resposta
- **Sempre em português** — perguntas, respostas, confirmações, tudo
- **Modo direto:** resultado primeiro, sem rodeios, sem narração do processo
- Expandir explicações só se pedido explicitamente

## Workflow obrigatório ao finalizar qualquer tarefa
1. `node --check arquivo.js` em todos os JS modificados
2. Confirmar com David que está tudo ok
3. `git commit` com mensagem descritiva
4. `git push origin main` — **obrigatório**, a Vercel só deploya com push

## Templates de prompt prontos (use para pedir tarefas ao Claude)

**Bug / ajuste visual:**
```
CONTEXTO: [arquivo ou tela]
PROBLEMA: [o que está errado]
COMPORTAMENTO ATUAL: [o que acontece]
COMPORTAMENTO ESPERADO: [como deveria ser]
RESTRIÇÃO: [o que NÃO pode mudar]
```

**Nova funcionalidade:**
```
FUNCIONALIDADE: [nome curto]
OBJETIVO: [por que é importante]
QUEM USA: [cliente / dono / admin]
FLUXO ESPERADO: [passo a passo]
ONDE APARECE: [tela, modal, painel]
```

**Retomar sessão anterior:**
```
Leia o CLAUDE.md e me diga: o que foi feito, o que está pendente e qual o próximo passo.
```

**Commit e deploy:**
```
Revise o que foi alterado, crie um commit com mensagem clara e faça o push para a Vercel.
```

---

# REGRAS IMPORTANTES PARA O CLAUDE CODE

1. **Sempre verificar sintaxe** antes de commitar: `node --check arquivo.js`
2. **Módulos usam window.APP** — nunca variáveis soltas (cart, loja, produtos)
3. **Funções cross-module** são chamadas via `window.xxx()` (showToast, salvarCart, etc)
4. **Chaves de objetos** NUNCA devem ter `window.APP.` — só valores
5. **Testar no navegador** após deploy: abrir F12 Console e verificar erros vermelhos
6. **Mobile-first** — testar em viewport 390px
7. **Supabase anon key é pública** — segurança é via RLS, não por esconder a key
8. **vercel.json:** padrões `source` usam path-to-regexp, não regex puro — `(?:...)` é inválido, usar entradas separadas por extensão
9. **Deploy quebrado na Vercel?** Criar novo projeto importando o mesmo repo — a tela de criação mostra o erro real do vercel.json
10. **Arquivos max 400 linhas** — ao ultrapassar, separar CSS em `-style.css` e JS em arquivo próprio
11. **Ao finalizar sessão** — sempre atualizar a seção PROGRESSO DAS SESSÕES no CLAUDE.md
12. **Indicar ferramentas disponíveis** — sempre avisar quando um slash command (`/qa`, `/verificar-seguranca`, `/gerar-diagrama`, `/revisar-codigo`, `/gerar-user-stories`, `/das`, `/adr`, `/gerar-changelog`, `/documentar-requisitos`, `/gerar-casos-de-uso`) ou agente (`arquiteto-solucoes`, `arquiteto-postgresql`, `engenheiro-dba`, `analista-de-negocio`, `technical-writer`, `engenheiro-react-frontend`) se aplica à situação — deixar o usuário decidir se usa

---

# PROGRESSO DA SESSÃO ATUAL

### ✅ Entregue em 2026-04-29
- Trigger Supabase para número de pedido `PD-YYYYMMDD-NNNNN` (`gerar_numero_pedido.sql`)
- Módulo `painel-relatorios.js` com período hoje/7/30 dias, top produtos, bairros, horários
- Aba Relatórios no painel
- Botão "⭐ Avaliar" pós-entrega (WhatsApp) no card do pedido
- Backlog completo de 20 melhorias baseado em análise de 5 concorrentes

### 🔜 Próximos passos sugeridos
1. Painel responsivo para desktop + Kanban de pedidos (#1 e #2 do backlog)
2. Acompanhamento do pedido em tempo real (#3)
3. Controle de estoque com urgência (#4)

- Ver `CHANGELOG.md` para histórico completo
