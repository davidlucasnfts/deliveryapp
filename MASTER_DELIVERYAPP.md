# MASTER — DeliveryApp
*Documento mestre do projeto. Fonte única de verdade para Claude Code nesta sessão e nas próximas.*
*Criado: 2026-05-12 | Baseado em: CLAUDE.md + DIRETRIZES_PROJETO.md + claude-spec-toolkit*

---

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| **Nome** | DeliveryApp |
| **Tipo** | SaaS de cardápio digital + delivery |
| **Público-alvo** | Lanchonetes, pizzarias, açaiterias, hamburguerias e churrascarias no nordeste do Brasil |
| **Desenvolvedor** | David Lucas — Analista de Sistemas, Grupo Mateus, Vargem Grande/MA |
| **Contato** | davidlucasnfts@gmail.com |
| **Repositório** | github.com/davidlucasnfts/deliveryapp |
| **Deploy** | Vercel — auto-deploy via push na `main` |
| **URL produção** | deliveryapp-git-main-davidlucasnfts-projects.vercel.app |
| **Cliente piloto** | Pizzaria Melinda — dono@pizzariamelinda.com / melinda123 |
| **ID Pizzaria Melinda** | 0509197c-fb63-4319-9eae-e4e71368d3c4 |

---

## 2. Infraestrutura e Acessos

| Serviço | Detalhe |
|---|---|
| **Supabase URL** | https://gkzdqnhhecfwkmrsfrcj.supabase.co |
| **Bucket Storage** | `produtos` (público), `banners` (público) |
| **Login admin** | davidlucasnfts@gmail.com |
| **Vercel** | Auto-deploy a cada `git push origin main` |
| **Pagamentos** | Mercado Pago — cada dono usa sua própria conta MP |

> **Regra:** Nunca commitar chaves reais. Supabase `anon key` é pública por design — segurança é via RLS.

---

## 3. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | HTML5 + CSS3 + JavaScript ES Modules (sem framework) |
| **Banco** | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| **Deploy** | Vercel + serverless functions |
| **Pagamentos** | Mercado Pago via Vercel Function |
| **CEP** | ViaCEP API (gratuita) |
| **Fontes** | Plus Jakarta Sans (cardápio cliente) + Poppins (painel) |
| **Ícones** | Material Symbols Outlined |

---

## 4. Estrutura de Arquivos

```
deliveryapp/
├── index.html              ← cardápio do cliente
├── cardapio-style.css      ← CSS do cardápio
├── painel.html             ← painel do proprietário
├── painel-style.css        ← CSS do painel
├── admin.html              ← painel administrativo
├── admin-style.css         ← CSS do admin
├── admin.js                ← lógica do admin
├── pagamento.html          ← configuração de gateways
├── pagamento-style.css
├── pagamento.js
├── login.html
├── home.html
├── vercel.json
├── package.json            ← apenas declara o projeto (Vercel detection)
├── .gitignore              ← .env, node_modules, desktop.ini, etc.
├── CHANGELOG.md
├── sql/                    ← migrations e scripts Supabase
│   ├── gerar_numero_pedido.sql
│   ├── identidade_visual.sql
│   └── logos_bucket_policies.sql
├── api/
│   └── processar-pagamento.js  ← Vercel Function (Mercado Pago)
└── js/
    ├── supabase.js
    ├── auth.js
    ├── app.js               ← entry point do cardápio (⚠ 405 linhas — no limite)
    ├── cardapio.js          ← getLoja, getCategorias, getProdutos, getGruposAdicionais, getTaxaEntrega
    ├── pedidos.js           ← criarPedido, validarCupom, buscarClientePorTelefone
    ├── carrinho.js          ← carrinho, totais, upsell "peça também"
    ├── adicionais.js        ← modal de adicionais + modal de confirmação
    ├── checkout.js          ← formulário, CEP, pagamento, cupom
    └── painel/
        ├── painel-core.js
        ├── painel-pedidos.js
        ├── painel-cardapio.js    ← gerenciamento de categorias e listagem
        ├── painel-modal-produto.js ← modal de produto (373 linhas)
        ├── painel-extras.js      ← destaques, upsell, banners (199 linhas)
        ├── painel-fidelidade.js
        ├── painel-relatorios.js  ← relatórios hoje/7/30 dias
        ├── painel-config.js      ← taxas, pagamento MP, horário
        └── utils.js
```

> **Atenção:** `js/app.js` está em 405 linhas — 5 acima do limite de 400. Na próxima sessão que tocar nele, extrair a inicialização de handlers para um `js/handlers.js`.

---

## 5. Banco de Dados — Tabelas

| Tabela | Função principal |
|---|---|
| `lojas` | Config, pix_ativo, cartao_ativo, dinheiro_ativo, chave_pix, mp_*, hora_abre/fecha |
| `usuarios` | Donos e admin |
| `categorias` | tipo: normal/combo, ordem, ativa |
| `produtos` | img_offset_x/y, disponivel |
| `pedidos` | forma_pagamento, status_pagamento, mp_payment_id, numero_pedido (PD-YYYYMMDD-NNNNN) |
| `itens_pedido` | produto_id, preco_unitario, quantidade, subtotal |
| `itens_pedido_adicionais` | adicionais por item |
| `grupos_adicionais` | grupos por produto (obrigatorio, min/max_escolha) |
| `adicionais` | opções de cada grupo com preço |
| `taxas_entrega` | taxa por bairro por loja |
| `clientes` | endereço, total_pontos/pedidos/gasto |
| `pontos_historico` | histórico de pontos |
| `fidelidade_config` | configuração do programa de fidelidade |
| `cupons` | cupons de desconto |
| `transmissoes` | histórico de transmissões WhatsApp |
| `banners` | banners promocionais por loja (foto_url, ordem, ativo) |

---

## 6. Arquitetura de Estado (JavaScript)

- Todos os módulos compartilham estado via `window.APP`
- `index.html` cria `window.APP` com todas as variáveis no `init()`
- Módulos leem/escrevem `window.APP.cart`, `window.APP.loja`, etc.
- Funções cross-module são chamadas via `window.xxx()` — expostas pelo `exp({})` no index
- **NUNCA** usar variáveis soltas nos módulos — sempre `window.APP.variavel`
- **Chaves de objetos** NUNCA têm `window.APP.` — só os valores

---

## 7. Segurança

### Regras absolutas (nunca quebrar)
- **RLS ativo** em todas as tabelas antes de qualquer cliente real
- **Nunca hardcode** de credenciais, tokens ou chaves de API no código versionado
- **Supabase anon key** é pública por design — segurança via RLS, não por esconder a key
- **UUIDs** como chave primária — nunca IDs sequenciais em SaaS multi-tenant
- **Vercel Function** busca valor do BANCO (nunca do frontend) para pagamentos

### Permissões Supabase (RLS)
| Papel | Permissões |
|---|---|
| `anon` | Criar pedidos, itens, clientes; ler categorias, produtos, adicionais, taxas, cupons |
| `authenticated` (dono) | CRUD completo na própria loja |

### Validações obrigatórias antes de INSERT
- Nome preenchido
- Celular com 11 dígitos
- Itens no carrinho
- Total > 0

### Segurança em código
- Nunca usar `eval()` ou `innerHTML` com dados do usuário sem sanitização
- Nunca desabilitar validação SSL/TLS
- Idempotency-Key baseada no `pedidoId` no Mercado Pago

---

## 8. Convenções de Código

### Regras de qualidade
| Regra | Limite |
|---|---|
| Linhas por arquivo JS | Máximo 400 |
| Linhas por função | Máximo 50 |
| Imagens | Máx 1080×1080, qualidade 92% |
| Lazy loading | Obrigatório em todas as imagens |

### Nomenclatura
- Variáveis de negócio em **português** (`pedido`, `loja`, `cliente`)
- Funções em **camelCase** (`buscarProdutos`, `calcularTotal`)
- Constantes em **UPPER_SNAKE_CASE** (`MAX_ITENS`, `TIMEOUT_MS`)
- Tabelas e colunas SQL em **snake_case** (`loja_id`, `criado_em`)
- Índices: `idx_<tabela>_<coluna>` (`idx_pedidos_loja_id`)

### Princípios
- Mobile-first sempre (testar em viewport 390px)
- Feedback visual em tudo (toast, loading, disabled)
- Formulários mínimos — CEP preenche endereço via ViaCEP
- Multi-tenant — sempre filtrar por `loja_id`
- Separar responsabilidades: HTML no `.html`, lógica em módulos JS

---

## 9. Workflow Git

### Antes de começar
```bash
git pull origin main   # sempre antes de qualquer trabalho
```

### Após cada tarefa concluída
```bash
node --check arquivo.js   # verificar sintaxe de todos os JS alterados
# → confirmar com David que está ok
git add arquivo1 arquivo2   # nunca git add . sem revisão
git commit -m "tipo: descrição clara e direta"
git push origin main         # Vercel faz deploy automático
```

### Padrão de commit (adaptado para solo dev sem chamados)
```
feat: nova funcionalidade implementada
fix: correção do bug X
style: ajustes visuais no painel
refactor: reorganização do módulo de pedidos
chore: atualização de dependências
```

### Regras de proteção
- **Nunca** `git push --force` na `main`
- **Nunca** `--no-verify` nos hooks
- **Nunca** commitar `.env` com valores reais
- Deploy quebrado na Vercel? → criar novo projeto importando o mesmo repo

### vercel.json
- Padrões `source` usam path-to-regexp, **não** regex puro
- `(?:...)` é inválido → usar entradas separadas por extensão

---

## 10. Checklist de Qualidade (Antes de Commitar)

```
SINTAXE
[ ] node --check em todos os JS alterados

SEGURANÇA
[ ] Nenhuma credencial hardcoded
[ ] RLS configurado para tabelas novas
[ ] Índice criado se há nova coluna de busca

FUNCIONALIDADE
[ ] Testado no celular (viewport 390px)
[ ] Estado vazio tratado (sem dados, sem foto, sem categoria)
[ ] Erro tratado com mensagem clara para o usuário
[ ] Loading/feedback visual implementado
[ ] Validação de campos obrigatórios ativa

MULTI-TENANT
[ ] Todas as queries filtram por loja_id
[ ] RLS cobre o novo dado

ARQUIVO
[ ] JS ≤ 400 linhas? Se não, dividir
[ ] Função ≤ 50 linhas?
[ ] window.APP usado (nunca variáveis soltas nos módulos)
```

---

## 11. Checklist Antes de Lançar Feature

```
[ ] Funciona no iPhone e Android
[ ] Estado vazio tratado
[ ] Erro tratado com mensagem clara
[ ] Loading implementado
[ ] Validação de campos obrigatórios
[ ] RLS configurado
[ ] Índice criado se houver nova coluna de busca
[ ] Testado com simulação realista de uso
[ ] F12 Console sem erros vermelhos
```

---

## 12. Slash Commands Disponíveis (claude-spec-toolkit)

### QA e Revisão
| Comando | Quando usar |
|---|---|
| `/qa` | Pipeline completo antes de qualquer deploy importante |
| `/revisar-codigo` | Revisão avançada com múltiplos agentes e score A-F |
| `/verificar-seguranca` | Auditoria de segurança completa |

### Documentação
| Comando | Quando usar |
|---|---|
| `/gerar-diagrama` | Gerar diagrama Mermaid (ER, sequência, fluxo) |
| `/gerar-user-stories` | Gerar user stories com critérios de aceite |
| `/gerar-changelog` | Gerar changelog a partir dos commits |
| `/documentar-requisitos` | Levantamento de requisitos guiado |
| `/gerar-casos-de-uso` | Gerar casos de uso com diagramas |
| `/das` | Documento de Arquitetura de Software |
| `/adr` | Architecture Decision Records |

---

## 13. Agentes Especializados (claude-spec-toolkit)

| Quando usar | Agente |
|---|---|
| Modelagem de banco, queries complexas, índices | `arquiteto-postgresql` |
| DDL, migrations, padrões Supabase | `engenheiro-dba` |
| Levantamento de requisitos, user stories | `analista-de-negocio` |
| Decisões de arquitetura, trade-offs, padrões | `arquiteto-solucoes` |
| Documentação técnica, runbooks | `technical-writer` |

---

## 14. Modelo de Negócio

| Plano | Valor |
|---|---|
| Piloto | Grátis |
| Básico | R$79/mês |
| Padrão | R$99/mês |

**Concorrentes:** Anota AI (R$280-399/mês), CardapioWeb (R$135-300/mês), Cardapio.ai (R$49-99/mês)

**Diferenciais:** preço menor, design superior, dinheiro direto ao dono (sem intermediário), fidelidade integrada, sem taxa por transação

---

## 15. Backlog Priorizado

### ✅ Entregues
- Dashboard de pedidos com métricas (faturamento, em aberto, ticket médio, mais vendido)
- Pedidos agrupados por status com seção colapsável de concluídos
- Número de pedido formatado `PD-YYYYMMDD-NNNNN` via trigger Supabase
- Relatórios (hoje / 7 dias / 30 dias): faturamento, top produtos, bairros, horários
- Botão avaliação pós-entrega (WhatsApp)
- Banners promocionais por loja
- Destaques e upsell ("peça também")
- Programa de fidelidade + cupons + transmissão WhatsApp
- Taxas de entrega por bairro
- Adicionais por grupo (obrigatório, min/max) com drag
- Painel responsivo para desktop (sidebar fixa + kanban de pedidos)

### 🔥 Alta Prioridade (próximas sessões)
1. **Acompanhamento do pedido em tempo real** — `acompanhar.html?id=PD-...` com timeline animada via Supabase Realtime
2. **Controle de estoque com urgência** — campo `estoque` em `produtos`, badge "Últimas unidades!" ≤5, desativa quando =0
3. **Central de alertas WhatsApp** — notificação de novo pedido via Evolution API ou Z-API

### ⚡ Média Prioridade
4. Preço promocional no cardápio (campo `preco_original` com tachado)
5. Repetir pedido anterior
6. Previsão de entrega no pedido (`tempo_entrega_min` em `lojas`)
7. Tipo de pedido: Entrega / Retirada
8. Pixel Google + Meta (rastreamento de conversões)
9. Impressão automática (PDV via `window.print()`)
10. Domínio personalizado (`slug` + Vercel rewrite)

### 🔮 Baixa Prioridade (quando tiver 5+ lojas)
11. QR Code para mesas
12. Robô WhatsApp com IA (Evolution API)
13. Recuperador de carrinho
14. Árvore de links (link de bio)
15. Controle de acesso de funcionários
16. Áreas de entrega por raio (km)
17. Múltiplas bandeiras de cartão

---

## 16. Concorrentes Analisados (2026-04-29)

| Concorrente | Preço | Pontos fortes |
|---|---|---|
| **Cardapio.ai** | R$49,90–R$99,90/mês | Painel desktop kanban, robô WhatsApp, estoque, impressão, pixel |
| **Anota AI** | R$280–399/mês | Adicionais completos, "Peça também", banners, PIX dinâmico |
| **CardapioWeb** | R$135–300/mês | Bom design, muitos planos, taxa por raio/km |
| **Saipos** | R$219/mês | PDV completo, KDS, motoboy, integração iFood |
| **Deeliv** | — | Mobile-first moderno |

---

## 17. Como Trabalhar com o Claude Neste Projeto

### Perfil do desenvolvedor
David Lucas é analista de sistemas (não desenvolvedor) que usa Claude Code como ferramenta principal. Tem visão de produto e negócio, mas não escreve código manualmente. Quer projetos escaláveis e profissionais. Prefere entender o "porquê" além do "como".

### Idioma e estilo
- **Sempre em português** — tudo: perguntas, respostas, confirmações
- **Modo direto:** resultado primeiro, sem rodeios
- Expandir explicações só se pedido explicitamente

### Templates de prompt

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

**Retomar sessão:**
```
Leia o MASTER_DELIVERYAPP.md e me diga: o que foi feito, o que está pendente e qual o próximo passo.
```

---

## 18. Regras do Claude Code (DeliveryApp)

1. **Verificar sintaxe** antes de commitar: `node --check arquivo.js`
2. **Módulos usam window.APP** — nunca variáveis soltas
3. **Funções cross-module** chamadas via `window.xxx()` (showToast, salvarCart, etc.)
4. **Testar no navegador** após deploy: F12 Console, sem erros vermelhos
5. **Mobile-first** — testar em viewport 390px
6. **Arquivos max 400 linhas** — ao ultrapassar, separar em arquivo próprio
7. **vercel.json** — usar entradas separadas por extensão, não regex com `(?:...)`
8. **Multi-tenant** — sempre filtrar por `loja_id`
9. **RLS antes de produção** — nunca subir tabela sem política ativa
10. **Indicar ferramentas disponíveis** — sempre avisar quando `/qa`, `/verificar-seguranca`, `/gerar-diagrama`, `/revisar-codigo`, `/das`, `/adr` ou algum agente se aplica

---

## 19. Progresso da Sessão

### ✅ Entregue em 2026-04-29
- Trigger Supabase para número de pedido `PD-YYYYMMDD-NNNNN`
- Módulo `painel-relatorios.js` com período hoje/7/30 dias
- Aba Relatórios no painel
- Botão "⭐ Avaliar" pós-entrega (WhatsApp) no card do pedido
- Backlog completo de 20 melhorias baseado em análise de 5 concorrentes

### ✅ Entregue em 2026-05-12
- MASTER_DELIVERYAPP.md criado (este arquivo)
- MASTER_NOVO_PROJETO.md criado (template genérico)
- Análise completa do claude-spec-toolkit integrada

### 🔜 Próxima sessão sugerida
1. Acompanhamento do pedido em tempo real (`acompanhar.html`)
2. Controle de estoque com urgência
3. Central de alertas WhatsApp
