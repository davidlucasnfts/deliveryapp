# DeliveryApp — Contexto Completo do Projeto

## O que é
SaaS de cardápio digital + delivery para lanchonetes, pizzarias, açaiterias, hamburguerias e churrascarias no nordeste do Brasil.

## Desenvolvedor
- **Nome:** David Lucas — Analista de Sistemas no Grupo Mateus, Vargem Grande/MA
- **Email:** davidlucasnfts@gmail.com
- **GitHub:** github.com/davidlucasnfts/deliveryapp

## Infraestrutura
- **Supabase URL:** https://gkzdqnhhecfwkmrsfrcj.supabase.co
- **Vercel:** deliveryapp-theta.vercel.app (auto-deploy via git push)
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
├── index.html              ← cardápio do cliente (609 linhas)
├── cardapio-style.css      ← CSS do cardápio (separado para economia)
├── painel.html             ← painel do proprietário
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

# BUG ATUAL — PRIORIDADE MÁXIMA

O cardápio do cliente (index.html) não está carregando — fica preso em "Carregando cardápio...".

**Causa provável:** Os módulos JS (carrinho.js, adicionais.js, checkout.js) foram extraídos do index.html recentemente. A substituição automática de variáveis locais por `window.APP.xxx` gerou erros como:
- Chaves de objetos substituídas erroneamente: `{window.APP.qty: 1}` (inválido) em vez de `{qty: 1}`
- `const window.APP.qty` (declaração inválida)
- Classes CSS com window.APP dentro: `csi-window.APP.qty`

**O que fazer:**
1. Abra os 3 arquivos: `js/carrinho.js`, `js/adicionais.js`, `js/checkout.js`
2. Busque por padrões inválidos:
   - `{...window.APP.xxx:` → trocar por `{...xxx:`  (chave de objeto não pode ter ponto)
   - `const window.APP.` ou `let window.APP.` → trocar por `const ` ou `let `
   - Strings com `window.APP.` dentro de texto → trocar pelo texto correto
3. Teste no navegador: `https://deliveryapp-theta.vercel.app/index.html?loja=0509197c-fb63-4319-9eae-e4e71368d3c4`
4. Após corrigir: `git add . && git commit -m "fix: corrige erros nos modulos JS" && git push`

---

# FUNCIONALIDADES CONCLUÍDAS

1. ✅ Cardápio digital do cliente (hero, categorias, busca, carrinho persistente)
2. ✅ Painel do dono com 3 modais separados (categoria, produto, adicionais)
3. ✅ Adicionais e complementos por produto (obrigatório/opcional, radio/contador)
4. ✅ Taxa de entrega por bairro (cadastra no painel, calcula pelo CEP)
5. ✅ Reconhecimento do cliente pelo CEP (celular só busca pontos)
6. ✅ Pagamentos — PIX, Cartão (MP), Dinheiro (configurável por loja)
7. ✅ Fidelidade + cupons + transmissão WhatsApp em massa
8. ✅ Horário automático abre/fecha loja
9. ✅ Badge ABERTO em verde no cardápio
10. ✅ Segurança: valor recalculado no servidor, idempotency-key, logs, validações
11. ✅ "Peça também" no carrinho (upsell — sugere bebidas/sobremesas)
12. ✅ Modal de confirmação após adicionais (quantidade + observações + continuar/carrinho)
13. ✅ Separação do index.html em módulos (carrinho.js, adicionais.js, checkout.js, cardapio-style.css)

---

# MELHORIAS PENDENTES — POR ORDEM DE PRIORIDADE

## Alta Prioridade (fazer agora)

### 1. Barra de navegação inferior no cardápio
- **O que:** barra fixa no rodapé com ícones: Início / Carrinho (com badge de quantidade)
- **Onde:** index.html + cardapio-style.css
- **Referência:** igual ao Anota AI — padrão esperado em apps de delivery mobile
- **Por que:** melhora navegação, o cliente encontra o carrinho mais fácil

### 2. Melhorias técnicas rápidas (segunda IA sugeriu)
- **getTaxaEntrega:** trocar `.find()` local por `.ilike('bairro', '%termo%')` no Supabase (economiza dados)
  - Arquivo: `js/cardapio.js` função `getTaxaEntrega`
- **Cache HTTP:** adicionar Cache-Control no `vercel.json` para CSS, JS e imagens
- **Toast em vez de console.error:** substituir `console.error` nos catch() por `window.showToast('⚠️ Verifique sua conexão')` nos 3 módulos

## Média Prioridade (próximo mês)

### 3. Banners promocionais no topo do cardápio
- **O que:** carrossel de até 3 banners. Dono faz upload no painel, define ação (abrir categoria ou só visual). Troca automática a cada 4 segundos
- **Onde:** index.html (acima das categorias) + painel-config.js (nova seção) + nova tabela `banners` no Supabase
- **Referência:** Anota AI tem, CardapioWeb tem

### 4. Seção "Destaques" no topo do cardápio
- **O que:** grid horizontal com produtos marcados como destaque pelo dono. Preço promocional riscado com % de desconto. Acima das categorias
- **Onde:** index.html + coluna `destaque` boolean na tabela `produtos` + `preco_original` numeric
- **Referência:** Anota AI foto 1 — seção "Destaques" com cards grandes

### 5. Selos nos produtos (vegano, sem glúten, novo, destaque)
- **O que:** ícones visuais no card do produto no cardápio. Dono marca no painel ao editar produto
- **Onde:** index.html (card do produto) + painel-cardapio.js (checkboxes no modal de produto) + coluna `selos` jsonb na tabela `produtos`
- **Referência:** concorrentes têm, especialmente para público fitness

## Futuro (quando tiver 5+ lojas)

### 6. Repetir pedido anterior
- **O que:** cliente reconhecido vê botão "Repetir último pedido" que já monta o carrinho com os mesmos itens
- **Onde:** index.html + js/pedidos.js (nova função buscarUltimoPedido)

### 7. Acompanhamento do pedido em tempo real
- **O que:** link único após pedido. Timeline animada: recebido → em preparo → saiu → entregue. Realtime via Supabase
- **Onde:** nova página `acompanhar.html` + painel-pedidos.js (botão de atualizar status envia pro realtime)

### 8. QR Code para mesas (modo salão)
- **O que:** dono gera QR Code por mesa no painel. Cliente escaneia, faz pedido pelo celular com número da mesa
- **Onde:** painel + index.html (detecta parâmetro `?mesa=5` na URL)

### 9. Robô WhatsApp com IA (Evolution API)
- **O que:** 1 instância para N lojas. Atendimento automatizado, recebe pedidos por WhatsApp
- **Onde:** servidor dedicado + Evolution API + webhook para Supabase

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

# REGRAS IMPORTANTES PARA O CLAUDE CODE

1. **Sempre verificar sintaxe** antes de commitar: `node --check arquivo.js`
2. **Módulos usam window.APP** — nunca variáveis soltas (cart, loja, produtos)
3. **Funções cross-module** são chamadas via `window.xxx()` (showToast, salvarCart, etc)
4. **Chaves de objetos** NUNCA devem ter `window.APP.` — só valores
5. **Testar no navegador** após deploy: abrir F12 Console e verificar erros vermelhos
6. **Mobile-first** — testar em viewport 390px
7. **Supabase anon key é pública** — segurança é via RLS, não por esconder a key
