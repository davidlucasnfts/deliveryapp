# 🗄️ Skill: DeliveryApp Database Architecture

**Trigger**: Questões sobre banco de dados, tabelas, relacionamentos, migrações, RLS, queries, Supabase, performance.

## 📋 Cobertura

Este skill cobre:
- Estrutura de tabelas PostgreSQL (via Supabase)
- Relacionamentos entre tabelas (FK, composite keys)
- Row Level Security (RLS) policies
- Índices e performance
- Migrações seguras
- Triggers e functions
- Queries otimizadas (N+1, agregações)
- Backup e recovery

## 🏗️ Arquitetura Atual (Aprovada)

### Stack
- **Banco**: Supabase (PostgreSQL 14+)
- **Auth**: Supabase Auth (JWT)
- **Realtime**: Supabase Realtime (postgres_changes)
- **Storage**: Supabase Storage (imagens)

### Tabelas Principais

#### 1. `lojas` (Estabelecimentos)
```sql
CREATE TABLE lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE, -- Para URL amigável
  descricao TEXT,
  whatsapp VARCHAR(20),
  email_contato VARCHAR(100),
  cidade VARCHAR(50),
  estado VARCHAR(2),
  ativa BOOLEAN DEFAULT true,
  plano VARCHAR(20) DEFAULT 'gratis', -- gratis, basico, pro
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT plano_valido CHECK (plano IN ('gratis', 'basico', 'pro'))
);

-- Índices
CREATE UNIQUE INDEX lojas_slug_idx ON lojas(slug);
CREATE INDEX lojas_cidade_idx ON lojas(cidade);
```

#### 2. `usuarios` (Proprietários, admins)
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
  email VARCHAR(100) NOT NULL UNIQUE,
  nome VARCHAR(100),
  telefone VARCHAR(20),
  perfil VARCHAR(20) DEFAULT 'proprietario', -- proprietario, admin, gerente
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP,
  
  CONSTRAINT perfil_valido CHECK (perfil IN ('proprietario', 'admin', 'gerente'))
);

CREATE INDEX usuarios_loja_id_idx ON usuarios(loja_id);
CREATE INDEX usuarios_email_idx ON usuarios(email);
```

#### 3. `categorias` (Lanches, bebidas, etc)
```sql
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(50) NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT categorias_uniq UNIQUE(loja_id, nome)
);

CREATE INDEX categorias_loja_idx ON categorias(loja_id);
```

#### 4. `produtos` (Itens do cardápio)
```sql
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE NOT NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  preco_base DECIMAL(10,2) NOT NULL,
  imagem_url VARCHAR(500),
  ativo BOOLEAN DEFAULT true,
  ordem INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX produtos_loja_idx ON produtos(loja_id);
CREATE INDEX produtos_categoria_idx ON produtos(categoria_id);
```

#### 5. `grupos_aderecos` (NOVO - Grupos de variações)
```sql
CREATE TABLE grupos_aderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  obrigatorio BOOLEAN DEFAULT false,
  max_selecoes INT DEFAULT NULL, -- NULL = ilimitado
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT max_maior_zero CHECK (max_selecoes IS NULL OR max_selecoes > 0)
);

CREATE INDEX grupos_aderecos_produto_idx ON grupos_aderecos(produto_id);
```

#### 6. `aderecos` (NOVO - Variações individuais)
```sql
CREATE TABLE aderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES grupos_aderecos(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  preco_adicional DECIMAL(10,2) DEFAULT 0,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT aderecos_uniq UNIQUE(grupo_id, nome)
);

CREATE INDEX aderecos_grupo_idx ON aderecos(grupo_id);
```

#### 7. `pedidos` (Pedidos dos clientes)
```sql
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE NOT NULL,
  numero_pedido VARCHAR(20) NOT NULL UNIQUE, -- PD-20260429-00123
  cliente_nome VARCHAR(100),
  cliente_telefone VARCHAR(20),
  cliente_email VARCHAR(100),
  endereco_rua VARCHAR(150),
  endereco_numero VARCHAR(10),
  endereco_complemento VARCHAR(100),
  endereco_bairro VARCHAR(50),
  endereco_cidade VARCHAR(50),
  endereco_cep VARCHAR(10),
  
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  taxa_entrega DECIMAL(10,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  metodo_pagamento VARCHAR(20), -- pix, credito, debito, dinheiro
  status VARCHAR(20) DEFAULT 'novo', -- novo, preparando, pronto, saiu, entregue, cancelado
  tempo_entrega_estimado INT, -- em minutos
  
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT status_valido CHECK (status IN ('novo', 'preparando', 'pronto', 'saiu', 'entregue', 'cancelado'))
);

CREATE INDEX pedidos_loja_status_idx ON pedidos(loja_id, status);
CREATE INDEX pedidos_created_at_idx ON pedidos(created_at DESC);
CREATE INDEX pedidos_numero_idx ON pedidos(numero_pedido);
```

#### 8. `itens_pedidos` (Itens de cada pedido)
```sql
CREATE TABLE itens_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  aderecos_selecionados JSONB, -- {"grupo_id": ["aderecol1_id"], ...}
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX itens_pedidos_pedido_idx ON itens_pedidos(pedido_id);
CREATE INDEX itens_pedidos_produto_idx ON itens_pedidos(produto_id);
```

## 🔐 Row Level Security (RLS)

Todos as tabelas têm RLS ativo. Regras:

### Tabela `lojas`
```sql
-- Proprietário vê apenas sua loja
CREATE POLICY "Proprietario ve sua loja" ON lojas
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM usuarios WHERE loja_id = lojas.id)
  );
```

### Tabela `produtos`
```sql
-- Público vê produtos ativos
CREATE POLICY "Publico ve produtos ativos" ON produtos
  FOR SELECT USING (ativo = true);

-- Proprietário edita seus produtos
CREATE POLICY "Proprietario edita seus produtos" ON produtos
  FOR UPDATE USING (
    loja_id IN (SELECT loja_id FROM usuarios WHERE id = auth.uid())
  );
```

### Tabela `pedidos`
```sql
-- Proprietário vê seus pedidos
CREATE POLICY "Proprietario ve seus pedidos" ON pedidos
  FOR SELECT USING (
    loja_id IN (SELECT loja_id FROM usuarios WHERE id = auth.uid())
  );

-- Sistema atualiza status
CREATE POLICY "Sistema atualiza status" ON pedidos
  FOR UPDATE USING (true) WITH CHECK (true);
```

## 📊 Queries Importantes

### 1. Listar produtos de uma categoria (com adereços)
```sql
SELECT 
  p.id, p.nome, p.preco_base, p.imagem_url,
  json_agg(
    json_build_object(
      'id', ga.id,
      'nome', ga.nome,
      'obrigatorio', ga.obrigatorio,
      'aderecos', (
        SELECT json_agg(
          json_build_object('id', a.id, 'nome', a.nome, 'preco', a.preco_adicional)
        )
        FROM aderecos a
        WHERE a.grupo_id = ga.id AND a.ativo = true
        ORDER BY a.ordem
      )
    )
    ORDER BY ga.ordem
  ) as grupos_aderecos
FROM produtos p
LEFT JOIN grupos_aderecos ga ON p.id = ga.produto_id AND ga.ativo = true
WHERE p.categoria_id = $1 AND p.ativo = true
GROUP BY p.id, p.nome, p.preco_base, p.imagem_url
ORDER BY p.ordem;
```

### 2. Obter total de vendas do dia
```sql
SELECT 
  DATE(created_at) as data,
  COUNT(*) as num_pedidos,
  SUM(total) as total_vendas,
  AVG(total) as ticket_medio
FROM pedidos
WHERE loja_id = $1 AND DATE(created_at) = CURRENT_DATE
GROUP BY DATE(created_at);
```

### 3. Pedidos em tempo real (para o painel)
```sql
SELECT 
  p.*,
  COUNT(ip.id) as num_itens,
  STRING_AGG(pr.nome, ', ') as itens_nomes
FROM pedidos p
LEFT JOIN itens_pedidos ip ON p.id = ip.pedido_id
LEFT JOIN produtos pr ON ip.produto_id = pr.id
WHERE p.loja_id = $1 AND p.status != 'cancelado'
GROUP BY p.id
ORDER BY p.created_at DESC;
```

## 🔄 Triggers (Functions)

### 1. Auto-incrementar número do pedido
```sql
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 14) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM pedidos
  WHERE loja_id = NEW.loja_id 
  AND DATE(created_at) = CURRENT_DATE;
  
  NEW.numero_pedido := 'PD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_numero_pedido
BEFORE INSERT ON pedidos
FOR EACH ROW
EXECUTE FUNCTION gerar_numero_pedido();
```

### 2. Atualizar `updated_at` automaticamente
```sql
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_updated_at_produtos
BEFORE UPDATE ON produtos
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_updated_at_pedidos
BEFORE UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();
```

## 📈 Performance

### Índices Obrigatórios
- `pedidos(loja_id, status)` — Dashboard filtra por loja + status
- `produtos(loja_id)` — Cardápio busca por loja
- `itens_pedidos(pedido_id)` — Detalhe do pedido
- `categorias(loja_id)` — Filtro por categoria

### Índices Opcionais (após escalar)
- `pedidos(created_at DESC)` — Relatórios por data
- `pedidos(cliente_telefone)` — Busca por cliente
- `produtos(preco_base)` — Filtro por preço (if added)

## 🚀 Migrações Seguras

### Processo
1. Criar migration file: `supabase/migrations/{timestamp}_add_aderecos.sql`
2. Escrever SQL com IF NOT EXISTS
3. Testar localmente: `supabase migration up`
4. Fazer push: `git push` → Vercel detecta, deploy automático

### Exemplo seguro (sem quebrar se executar 2x)
```sql
CREATE TABLE IF NOT EXISTS grupos_aderecos (...);
CREATE TABLE IF NOT EXISTS aderecos (...);
CREATE INDEX IF NOT EXISTS idx_grupos ON grupos_aderecos(produto_id);
```

## 🎯 Checklist antes de fazer migration

- [ ] SQL testado no Supabase console
- [ ] Tem `IF NOT EXISTS` (idempotente)
- [ ] RLS policies incluídas
- [ ] Índices criados para performance
- [ ] FKs com ON DELETE CASCADE/SET NULL apropriado
- [ ] Backup feito (manual ou automático do Supabase)
- [ ] Rollback plan caso dê erro

---

**Versão**: 1.0  
**Último update**: Abril 2026  
**Banco**: Supabase PostgreSQL 14+
