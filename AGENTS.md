# AGENTS.md — Regras para IA no DeliveryApp

Arquivo de governação para qualquer IA que continue este projeto. Leia sempre que iniciar uma sessão.

---

## 1. Perfil do dono do projeto

- **Dono:** David Lucas — Analista de Sistemas no Grupo Mateus, Vargem Grande/MA.
- **Não é desenvolvedor profissional:** usa IA como ferramenta principal de implementação.
- **Gosta de entender o "porquê"** além do "como".
- **Idioma obrigatório:** português em todas as respostas, perguntas, confirmações e documentação.

---

## 2. Como rodar local

Este é um site **estático + Vercel Functions**. Não precisa de `npm install`.

```bash
# Navegar até a raiz do projeto
cd "c:/Users/David Lucas/Documents/PROJETOS IA/DeliveryApp"

# Servir localmente (qualquer servidor estático funciona)
npx serve .
# ou
python -m http.server 3000
```

- Abrir `http://localhost:3000/index.html?loja=0509197c-fb63-4319-9eae-e4e71368d3c4` para o cardápio piloto (Pizzaria Melinda).
- Abrir `http://localhost:3000/login.html` para o painel do dono.
- Abrir `http://localhost:3000/admin.html` para o painel administrativo.

### Comandos de verificação obrigatórios

```bash
# 1. Verificar sintaxe de TODO JS alterado
node --check arquivo.js

# Para arquivos ES modules (api/*.js), copie para .mjs temporário:
cp api/processar-pagamento.js /tmp/_check.mjs && node --check /tmp/_check.mjs

# 2. Validar vercel.json
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('OK')"

# 3. npm audit (não há dependências, mas verifique)
npm audit
```

Não existe teste automatizado, lint nem build real. O `package.json` só existe para a Vercel detectar o projeto.

---

## 3. Convenções do projeto

### Stack e estrutura

- **Frontend:** HTML5 + CSS3 + JavaScript ES Modules. Sem framework.
- **Backend:** Vercel Functions (`api/*.js`).
- **Banco:** Supabase (PostgreSQL + Auth + Storage + Realtime).
- **Pagamentos:** Mercado Pago (cada loja usa sua própria conta).
- **Deploy:** Vercel, auto-deploy a cada `git push origin main`.

### Idioma e nomenclatura

- Código e comentários em **português**.
- Variáveis de negócio em português (`pedido`, `loja`, `cliente`).
- Funções em `camelCase` (`buscarProdutos`).
- Constantes em `UPPER_SNAKE_CASE`.
- Tabelas/colunas SQL em `snake_case` (`loja_id`, `criado_em`).

### Arquitetura de estado

- Todos os módulos compartilham estado via `window.APP`.
- `index.html` cria `window.APP` no `init()`.
- NUNCA usar variáveis soltas nos módulos — sempre `window.APP.variavel`.
- Funções cross-module são expostas via `window.xxx()` (usando o helper `exp({})`).

### Limites de tamanho

- Arquivos JS: **máximo 400 linhas**. Se passar, dividir.
- Funções JS: **máximo 50 linhas**. Extrair helpers.
- Imagens: máximo 1080×1080, qualidade 92%.
- Lazy loading obrigatório em todas as imagens.

### Multi-tenant

- **Sempre filtrar por `loja_id`** em queries.
- Toda tabela nova precisa de RLS ativo antes de produção.
- UUIDs como chave primária — nunca IDs sequenciais.
- A view pública é `lojas_publicas`. Nunca exponha `mp_access_token`, `waha_api_key` ou `email_dono` para anon.

---

## 4. Regras de ouro

1. **NUNCA commitar/pushar sem autorização explícita de David.** Sempre pergunte antes.
2. **Edições cirúrgicas:** altere só o necessário. Não aproveite para "limpar" ou refatorar código não relacionado.
3. **Não crie arquivos duplicados.** Antes de criar, verifique se já existe.
4. **Sempre atualize a documentação** (`MASTER_DELIVERYAPP.md`, `SESSION-CONTEXT.md`, `ROADMAP.md`) após mudanças relevantes.
5. **Nunca commitar credenciais.** A `anon key` do Supabase já é pública por design; segurança é via RLS. A `service key` fica apenas em variáveis de ambiente da Vercel.
6. **Sem `git push --force` na `main`.**
7. **Toda tabela nova precisa de RLS + índice** antes de ir para produção.
8. **Ao usar `innerHTML` com dados do banco/usuário, escapar com `esc()`** (`js/utils.js`).
9. **Antes de finalizar qualquer tarefa, rode o checklist abaixo.**

---

## 5. Checklist obrigatório antes de finalizar qualquer tarefa

```markdown
[ ] Código alterado testado mentalmente ou no navegador
[ ] `node --check` passou em todos os JS modificados
[ ] `vercel.json` válido (JSON.parse)
[ ] Nenhuma credencial hardcoded
[ ] RLS configurado para tabelas/colunas novas
[ ] Índice criado se há nova coluna de busca
[ ] XSS: dados do banco/usuário em innerHTML foram escapados
[ ] Multi-tenant: queries filtram por loja_id
[ ] Documentação atualizada (MASTER, SESSION-CONTEXT, ROADMAP se aplicável)
[ ] Ações manuais do dono listadas e claras
[ ] Sem console.log de debug em produção
```

---

## 6. Ferramentas e agentes úteis

Quando algum destes se aplicar, mencione ao David e deixe ele decidir:

- **Slash commands:** `/qa`, `/verificar-seguranca`, `/revisar-codigo`, `/gerar-diagrama`, `/gerar-user-stories`, `/gerar-changelog`, `/documentar-requisitos`, `/das`, `/adr`.
- **Agentes especializados:** `arquiteto-postgresql`, `engenheiro-dba`, `analista-de-negocio`, `arquiteto-solucoes`, `technical-writer`, `engenheiro-react-frontend`.

---

## 7. Como retomar uma sessão

A próxima IA deve abrir um **chat novo** e dizer:

> "Leia o SESSION-CONTEXT.md e me diga: o que foi feito, o que está pendente e qual o próximo passo."

`SESSION-CONTEXT.md` é a fonte da verdade do estado atual.
