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

# PRÓXIMAS FUNCIONALIDADES

## Média Prioridade (próximas sessões)

### 1. Dashboard do painel com métricas do dia
- **O que:** 3 cards no topo do painel — pedidos do dia, ganhos (R$), entregas concluídas. Cards de pedidos por status: 🔴 Novo → 🟠 Preparando → 🟡 Pronto → entregue
- **Onde:** `painel.html` + `js/painel/painel-pedidos.js`
- **Referência:** `.claude/skills/deliveryapp-uxui/SKILL.md` (Fluxo 3)

### 2. Número do pedido formatado
- **O que:** pedidos com ID legível tipo `PD-20260429-00123` em vez de UUID
- **Onde:** trigger no Supabase + tabela `pedidos` + exibição no painel e confirmação
- **Referência:** `.claude/skills/deliveryapp-database/SKILL.md`

## Futuro (quando tiver 5+ lojas)

### 3. Repetir pedido anterior
- **O que:** cliente reconhecido vê botão "Repetir último pedido" que já monta o carrinho
- **Onde:** `index.html` + `js/pedidos.js` (nova função `buscarUltimoPedido`)

### 4. Acompanhamento do pedido em tempo real
- **O que:** link único após pedido. Timeline animada: recebido → em preparo → saiu → entregue
- **Onde:** nova página `acompanhar.html` + `painel-pedidos.js`

### 5. QR Code para mesas (modo salão)
- **O que:** dono gera QR Code por mesa. Cliente escaneia, faz pedido com número da mesa
- **Onde:** painel + `index.html` (parâmetro `?mesa=5`)

### 6. Robô WhatsApp com IA (Evolution API)
- **O que:** 1 instância para N lojas. Atendimento automatizado via WhatsApp
- **Onde:** servidor dedicado + Evolution API + webhook Supabase

---

# CONCORRENTES ANALISADOS

| Concorrente | Preço | Pontos fortes |
|---|---|---|
| **Anota AI** | R$280-399/mês | Adicionais completos, "Peça também", banners, destaques, PIX dinâmico, acompanhamento pedido |
| **CardapioWeb** | R$135-300/mês | Bom design, muitos planos, taxa por raio/km |
| **Pedidu** | R$99-199/mês | Simples, foco em delivery |
| **Consumer** | Variável | Robusto, muitas integrações |

**Nosso diferencial:** preço 3x menor, design superior, dinheiro direto ao dono (sem intermediário), fidelidade integrada

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

### 🔜 Próximos passos
- Ver `CHANGELOG.md` para histórico completo de funcionalidades entregues
- Próximas features: repetir pedido, acompanhamento em tempo real, QR Code mesas, robô WhatsApp
