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
14. ✅ Banners promocionais no cardápio (carrossel até 3, troca a cada 4s, upload no painel)
15. ✅ Seção "Destaques" no cardápio (produtos com destaque=true, carrossel horizontal)
16. ✅ Barra de navegação inferior (Início / Carrinho com badge)

---

# MELHORIAS PENDENTES — POR ORDEM DE PRIORIDADE

## Alta Prioridade (fazer agora)

### 1. Melhorias técnicas rápidas ✅ concluído em 2026-04-29
- ✅ **getTaxaEntrega:** já usava `.ilike()` — confirmado
- ✅ **Cache HTTP:** `vercel.json` já tinha Cache-Control — confirmado
- ✅ **Toast em vez de console.error:** `pedidos.js` e `admin.js` corrigidos

## Média Prioridade (próximo mês)

### 4. Selos nos produtos (vegano, sem glúten, novo, destaque)
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

# PROGRESSO DAS SESSÕES

## 2026-04-27 (sessão 1)

### ✅ Feito
- Header expandido no cardápio (nome grande, status aberto/fechado, tempo, cidade)
- Emoji automático por tipo de produto quando sem foto
- Campo "Cidade" no painel de configurações
- CSS compactado (cards e espaçamentos menores)
- Separação do `painel-cardapio.js` em módulos menores
- Correção do bug que quebrava todos os deploys na Vercel (`(?:...)` inválido no `vercel.json`)
- Recriação do projeto na Vercel com integração GitHub funcionando
- GitHub Action para auto-deploy via deploy hook (`.github/workflows/deploy.yml`)
- `package.json` mínimo adicionado para Vercel reconhecer projeto

## 2026-04-27 (sessão 2)

### ✅ Feito
- Auditoria de linhas em todos os arquivos — identificados 3 acima de 400 linhas
- `painel.html` (440→181): CSS extraído para `painel-style.css`
- `pagamento.html` (643→56): CSS → `pagamento-style.css`, JS → `pagamento.js`
- `admin.html` (569→98): CSS → `admin-style.css`, JS → `admin.js`
- Hook automático configurado em `.claude/settings.json`: avisa no terminal quando arquivo editado ultrapassa 400 linhas
- Memórias locais movidas para o `CLAUDE.md` — contexto agora 100% portátil via git

### ✅ Verificado em 2026-04-29
- Header mobile confirmado OK — CSS correto, mobile-first, flex-wrap funcionando
- Coluna `cidade` confirmada na tabela `lojas` — salva e exibe no header

### 🔜 Próximos passos
- Melhorias técnicas rápidas (Alta Prioridade): getTaxaEntrega, Cache HTTP, console.error → showToast
