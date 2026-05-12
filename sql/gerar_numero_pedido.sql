-- 1. Coluna numero na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero TEXT;

-- 2. Tabela de contador atômico por dia (evita duplicata em pedidos simultâneos)
CREATE TABLE IF NOT EXISTS pedidos_contador (
  data      DATE    PRIMARY KEY,
  contador  INTEGER NOT NULL DEFAULT 0
);

-- 3. Função do trigger
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
  data_hoje    DATE;
  data_str     TEXT;
  novo_cont    INTEGER;
BEGIN
  data_hoje := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  data_str  := TO_CHAR(data_hoje, 'YYYYMMDD');

  -- Incremento atômico: garante unicidade mesmo com pedidos simultâneos
  INSERT INTO pedidos_contador (data, contador)
    VALUES (data_hoje, 1)
  ON CONFLICT (data)
    DO UPDATE SET contador = pedidos_contador.contador + 1
  RETURNING contador INTO novo_cont;

  NEW.numero := 'PD-' || data_str || '-' || LPAD(novo_cont::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger (recria se já existir)
DROP TRIGGER IF EXISTS trigger_numero_pedido ON pedidos;
CREATE TRIGGER trigger_numero_pedido
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_numero_pedido();
