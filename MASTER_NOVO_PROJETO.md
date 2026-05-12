# MASTER — Template para Novo Projeto
*Copie este arquivo para a raiz de qualquer novo projeto. Preencha as seções marcadas com [PREENCHER].*
*Baseado em: claude-spec-toolkit + DIRETRIZES_PROJETO.md (David Lucas, 2026-05-12)*

---

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| **Nome** | [PREENCHER] |
| **Tipo** | [Ex: SaaS, API, App mobile, sistema interno] |
| **Público-alvo** | [PREENCHER] |
| **Desenvolvedor** | David Lucas — davidlucasnfts@gmail.com |
| **Repositório** | [PREENCHER] |
| **Deploy** | [Ex: Vercel, Railway, Fly.io, AWS] |
| **URL produção** | [PREENCHER após primeiro deploy] |

---

## 2. Infraestrutura e Acessos

| Serviço | Detalhe |
|---|---|
| **Banco de dados** | [Ex: Supabase, PlanetScale, PostgreSQL] |
| **Autenticação** | [Ex: Supabase Auth, Clerk, Auth0] |
| **Storage** | [Ex: Supabase Storage, S3, Cloudflare R2] |
| **Deploy** | [PREENCHER] |
| **Pagamentos** | [Ex: Mercado Pago, Stripe — ou N/A] |

> **Regra:** Nunca commitar credenciais reais. Usar `.env.local` no `.gitignore`.

---

## 3. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | [PREENCHER] |
| **Backend** | [PREENCHER] |
| **Banco** | [PREENCHER] |
| **Deploy** | [PREENCHER] |

### Stack padrão aprovada por David Lucas (priorizar quando possível)
- **Frontend web simples:** HTML5 + CSS3 + JS ES Modules (sem framework, até ~50k usuários/mês)
- **Frontend webapp:** React + Vite + TypeScript + Tailwind CSS
- **Backend serverless:** Vercel Functions ou Supabase Edge Functions
- **Banco:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Deploy:** Vercel (auto-deploy via GitHub)

---

## 4. Estrutura de Arquivos

```
projeto/
├── .gitignore         ← SEMPRE: .env, node_modules, dist, desktop.ini
├── .env.example       ← SEMPRE: placeholders, nunca valores reais
├── package.json
├── sql/               ← migrations e scripts de banco
└── [PREENCHER resto da estrutura]
```

---

## 5. Banco de Dados

```sql
-- [PREENCHER com tabelas principais]
-- Padrão: snake_case, UUID como PK, created_at/updated_at em tudo
-- RLS habilitado em todas as tabelas antes de produção
```

### Convenções obrigatórias
- Tabelas e colunas em **snake_case**
- **UUID** como PK (nunca serial em SaaS multi-tenant)
- Índices: `idx_<tabela>_<coluna>` em colunas de busca frequente
- FK: `fk_<origem>_<destino>`
- **RLS ativo** antes de qualquer cliente real
- Scripts SQL versionados na pasta `sql/`

---

## 6. Segurança

### Regras absolutas
- **Nunca hardcode** credenciais em código versionado
- **Nunca commitar** `.env` com valores reais — usar `.env.example`
- **Nunca desabilitar** SSL/TLS fora de dev local
- **Nunca** `eval()`, `innerHTML` com dados do usuário sem sanitização
- **Nunca concatenar** strings para SQL — queries parametrizadas sempre
- **RLS antes de produção** — sem exceção

### Gestão de variáveis de ambiente
```env
# .env.example — versionado, com placeholders
DATABASE_URL=postgresql://localhost:5432/meubanco
API_KEY=TROCAR_AQUI
JWT_SECRET=TROCAR_AQUI

# .env.local — NÃO versionado, valores reais
```

---

## 7. Convenções de Código

| Regra | Limite |
|---|---|
| Linhas por arquivo | Máximo 400 |
| Linhas por função | Máximo 50 |

| Elemento | Convenção | Exemplo |
|---|---|---|
| Classes/Componentes | PascalCase | `ListaProdutos` |
| Funções e variáveis | camelCase | `buscarProdutos()` |
| Constantes | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Tabelas/colunas SQL | snake_case | `pedido_item` |

### Princípios
- **Mobile-first** — testar em 390px
- **Feedback visual** em toda ação (toast, loading, disabled)
- **Formulários mínimos** — autopreenchimento sempre que possível
- **Lazy loading** em todas as imagens
- Comentários só onde a lógica não for óbvia

---

## 8. Workflow Git

```bash
# Sempre antes de começar
git pull origin main

# Ao finalizar cada tarefa
node --check arquivo.js   # se JS — verificar sintaxe
git status
git diff --stat
git add arquivo1 arquivo2  # nunca git add . sem revisar
git commit -m "tipo: descrição clara"
git push origin main
```

### Padrão de commit
```
feat: nova funcionalidade
fix: correção de bug
style: ajustes visuais
refactor: reorganização sem feat/fix
chore: manutenção, dependências
docs: documentação
```

### Proibido
- `git push --force` na `main`
- `--no-verify`
- Commitar `.env` com valores reais

---

## 9. Checklist antes de Commitar

```
CÓDIGO
[ ] Sintaxe verificada
[ ] Funções ≤ 50 linhas
[ ] Arquivos ≤ 400 linhas
[ ] Sem console.log em produção

SEGURANÇA
[ ] Nenhuma credencial hardcoded
[ ] .env não staged com valores reais
[ ] RLS configurado para tabelas novas
[ ] Queries parametrizadas

FUNCIONALIDADE
[ ] Testado (celular 390px se web)
[ ] Estado vazio tratado
[ ] Erros com mensagem clara
[ ] Loading implementado
[ ] Validação de campos obrigatórios

BANCO
[ ] Índice em nova coluna de busca
[ ] Script SQL em sql/
[ ] Filtro por tenant em todas as queries
```

---

## 10. Slash Commands Disponíveis

| Comando | Quando usar |
|---|---|
| `/qa` | Pipeline completo antes de deploy importante |
| `/revisar-codigo` | Revisão com múltiplos agentes (score A-F) |
| `/verificar-seguranca` | Auditoria de segurança completa |
| `/gerar-diagrama` | Diagrama Mermaid (ER, sequência, fluxo) |
| `/gerar-user-stories` | User stories com critérios de aceite |
| `/gerar-changelog` | Changelog a partir dos commits |
| `/documentar-requisitos` | Levantamento de requisitos guiado |
| `/das` | Documento de Arquitetura de Software |
| `/adr` | Architecture Decision Records |

---

## 11. Agentes Especializados

| Quando usar | Agente |
|---|---|
| Banco, queries, performance | `arquiteto-postgresql` |
| DDL, migrations | `engenheiro-dba` |
| Requisitos, user stories | `analista-de-negocio` |
| Decisões de arquitetura | `arquiteto-solucoes` |
| Documentação técnica | `technical-writer` |
| Frontend React/TS | `engenheiro-react-frontend` |

---

## 12. Princípios de Produto (David Lucas)

- **UX primeiro:** "um leigo consegue usar sem instrução?"
- **Mobile-first:** 95% dos usuários no celular
- **Performance:** zero frameworks desnecessários
- **Multi-tenant:** filtrar por `tenant_id` desde o início
- **Receita recorrente:** mensalidade, nunca taxa por transação
- **Toda feature:** retém cliente ou aumenta receita?

---

## 13. Como Trabalhar com o Claude

- **Sempre em português** — tudo
- **Resultado primeiro** — sem rodeios

**Bug:** `CONTEXTO / PROBLEMA / ATUAL / ESPERADO / RESTRIÇÃO`

**Feature:** `FUNCIONALIDADE / OBJETIVO / QUEM USA / FLUXO / ONDE`

**Retomar:** `Leia o MASTER_NOVO_PROJETO.md e me diga o que foi feito, pendente e próximo passo.`

---

## 14. Backlog

### ✅ Entregues
- [preencher]

### 🔥 Alta Prioridade
- [preencher]

### ⚡ Média Prioridade
- [preencher]

### 🔮 Futuro
- [preencher]

---

## 15. Progresso das Sessões

### Sessão 1 — [DATA]
**Entregue:** [preencher]
**Pendente:** [preencher]
**Próxima sessão:** [preencher]
