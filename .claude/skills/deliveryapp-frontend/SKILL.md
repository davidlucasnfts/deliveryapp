# 💻 Skill: DeliveryApp Frontend Stack & Best Practices

**Trigger**: Questões sobre JavaScript, arquitetura frontend, módulos, padrões, debugging, otimização, estrutura de código, estado da aplicação.

## 📋 Cobertura

Este skill cobre:
- Arquitetura ES Modules (sem framework)
- Gerenciamento de estado global
- Padrões de componentes reutilizáveis
- Manipulação do DOM eficiente
- Requisições HTTP (Supabase client)
- Event listeners e delegação
- Local storage e persistência
- Debugging e performance
- Estrutura de pastas e organização
- Linting e formatting

## 🏗️ Arquitetura (Aprovada)

### Stack
- **Linguagem**: JavaScript ES2020+ (sem transpilação necessária)
- **Módulos**: ES Modules (import/export)
- **Banco**: Supabase (SDK oficial @supabase/supabase-js)
- **DOM**: Vanilla JavaScript (querySelector, addEventListener)
- **HTTP**: Fetch API + Supabase client
- **Estado**: Global via `window.APP` (objeto compartilhado)
- **Styling**: CSS puro com custom properties

### Estrutura de Pastas
```
DeliveryApp/
├── index.html                    # Cardápio público
├── painel.html                   # Painel do proprietário
├── css/
│   ├── style.css                # Estilos globais + design tokens
│   ├── cardapio.css             # Estilos específicos do cardápio
│   └── painel.css               # Estilos do painel
├── js/
│   ├── main.js                  # Inicialização da aplicação
│   ├── supabase.js              # Configuração do cliente Supabase
│   ├── auth.js                  # Autenticação (login, logout)
│   ├── api.js                   # Requisições HTTP padronizadas
│   ├── cardapio.js              # Lógica: buscar produtos, categorias
│   ├── carrinho.js              # Gerenciamento do carrinho
│   ├── checkout.js              # Fluxo de pagamento
│   ├── painel/
│   │   ├── dashboard.js         # Dashboard de pedidos
│   │   ├── produtos.js          # Gestão de produtos
│   │   └── aderecos.js          # Gestão de adereços
│   └── utils/
│       ├── storage.js           # Wrapper para localStorage
│       ├── format.js            # Formatação (moeda, telefone)
│       ├── validation.js        # Validações de formulário
│       └── dom.js               # Helpers de manipulação DOM
├── api/
│   └── processar-pagamento.js   # Vercel Function para Mercado Pago
└── .env.local                   # Credenciais (gitignored)
```

## 🧩 Padrões de Código

### 1. Estado Global (`window.APP`)
```javascript
// main.js
window.APP = {
  lojaId: null,
  usuarioId: null,
  usuario: null,
  carrinho: [],
  produtos: [],
  categorias: [],
  settings: {
    taxaEntrega: 5.00,
    tempoEstimado: 45
  },
  
  // Métodos
  adicionarAoCarrinho(produto, quantidade, aderecos) {
    // ...
  },
  
  removerDoCarrinho(itemId) {
    // ...
  },
  
  calcularTotal() {
    // ...
  }
};
```

### 2. Módulos Bem Definidos
```javascript
// js/cardapio.js
export async function buscarCategorias(lojaId) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('loja_id', lojaId)
    .order('ordem');
  
  if (error) throw error;
  return data;
}

export async function buscarProdutos(categoriaId) {
  const { data, error } = await supabase
    .from('produtos')
    .select(`
      *,
      grupos_aderecos (
        *,
        aderecos (*)
      )
    `)
    .eq('categoria_id', categoriaId);
  
  if (error) throw error;
  return data;
}
```

### 3. DOM Queries Eficientes
```javascript
// ✓ BOM: Queries no topo do módulo, reutilizadas
const DOM = {
  carrinho: document.getElementById('carrinho'),
  produtosList: document.querySelector('[data-produtos]'),
  modal: document.getElementById('modal-produto'),
  // ...
};

// Listener delegado (melhor que listeners em cada elemento)
DOM.produtosList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add-produto]');
  if (btn) {
    const produtoId = btn.dataset.produtoId;
    adicionarAoCarrinho(produtoId);
  }
});
```

### 4. Tratamento de Erros
```javascript
// ✓ BOM: Try/catch com feedback ao usuário
export async function criarPedido(dados) {
  try {
    mostrarLoading();
    
    const { data, error } = await supabase
      .from('pedidos')
      .insert([dados])
      .select();
    
    if (error) throw error;
    
    mostrarToast('Pedido criado com sucesso!', 'success');
    return data[0];
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    mostrarToast('Erro ao criar pedido. Tente novamente.', 'error');
    throw err;
  } finally {
    ocultarLoading();
  }
}
```

### 5. Realtime Subscriptions
```javascript
// ✓ BOM: Limpar subscriptions ao desmontar
export function inscreverEmPedidos(lojaId, callback) {
  const subscription = supabase
    .channel(`pedidos:loja_id=eq.${lojaId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'pedidos' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  // Retorna função para desinscrever
  return () => {
    supabase.removeChannel(subscription);
  };
}

// Uso
let unsubscribe;
document.addEventListener('DOMContentLoaded', () => {
  unsubscribe = inscreverEmPedidos(APP.lojaId, (payload) => {
    atualizarPainel(payload.new);
  });
});

window.addEventListener('beforeunload', () => {
  if (unsubscribe) unsubscribe();
});
```

## 🎯 Best Practices

### 1. Validação de Formulários
```javascript
export function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validarTelefone(telefone) {
  const regex = /^\(\d{2}\)\s9\d{4}-\d{4}$/;
  return regex.test(telefone);
}

// Uso em formulário
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  if (!validarEmail(email)) {
    mostrarErro('Email inválido');
    return;
  }
  
  // Continuar...
});
```

### 2. Persistência (Local Storage)
```javascript
// js/utils/storage.js
export const Storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.error('Erro ao ler do localStorage:', err);
      return defaultValue;
    }
  },
  
  remove(key) {
    localStorage.removeItem(key);
  }
};

// Uso
Storage.set('carrinho', APP.carrinho);
APP.carrinho = Storage.get('carrinho', []);
```

### 3. Formatação de Dados
```javascript
// js/utils/format.js
export const Format = {
  moeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  },
  
  telefone(valor) {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  },
  
  cep(valor) {
    return valor.replace(/(\d{5})(\d)/, '$1-$2');
  },
  
  data(data) {
    return new Date(data).toLocaleDateString('pt-BR');
  }
};

// Uso no HTML
<span>{{ Format.moeda(produto.preco) }}</span>
```

### 4. Funções Reutilizáveis (Helpers)
```javascript
// js/utils/dom.js
export const DOM = {
  // Criar elemento com classe e atributos
  createElement(tag, classes = '', attrs = {}) {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
    return el;
  },
  
  // Remover todos os filhos
  clear(el) {
    el.innerHTML = '';
  },
  
  // Mostrar/ocultar com classe
  show(el) {
    el.classList.remove('hidden');
  },
  
  hide(el) {
    el.classList.add('hidden');
  },
  
  // Trocar tema
  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }
};
```

### 5. Manipulação de Modals
```javascript
// ✓ BOM: Modal reutilizável
export function abrirModal(titulo, conteudo, botoes = []) {
  const modal = document.getElementById('modal');
  const header = modal.querySelector('.modal-header h2');
  const body = modal.querySelector('.modal-body');
  const footer = modal.querySelector('.modal-footer');
  
  header.textContent = titulo;
  body.innerHTML = conteudo;
  footer.innerHTML = '';
  
  botoes.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.label;
    button.className = `btn btn-${btn.type || 'secondary'}`;
    button.addEventListener('click', btn.onClick);
    footer.appendChild(button);
  });
  
  modal.classList.add('show');
  return modal;
}

export function fecharModal() {
  document.getElementById('modal').classList.remove('show');
}

// Uso
abrirModal(
  'Confirmar excluir?',
  '<p>Tem certeza que deseja excluir este item?</p>',
  [
    { label: 'Cancelar', type: 'secondary', onClick: () => fecharModal() },
    { label: 'Excluir', type: 'danger', onClick: () => deletarItem() }
  ]
);
```

## 🔍 Debugging

### 1. Console Estruturado
```javascript
// ✓ BOM: Prefixar logs por módulo
const log = (msg) => console.log('[Cardápio]', msg);
const error = (msg, err) => console.error('[Cardápio]', msg, err);

log('Iniciando cardápio...');
error('Erro ao buscar produtos', error);
```

### 2. Inspecionar Estado
```javascript
// No console do navegador
console.table(window.APP);
console.table(window.APP.carrinho);
```

### 3. Performance
```javascript
// Medir tempo de execução
console.time('buscar-produtos');
const produtos = await buscarProdutos();
console.timeEnd('buscar-produtos');
// Output: buscar-produtos: 245ms
```

## 📦 Gerenciamento de Dependências

### Bibliotecas Permitidas
- **@supabase/supabase-js** — Banco de dados e autenticação
- **date-fns** — Manipulação de datas (se preciso)
- **lodash** — Utilities (se preciso)

### Evitar
- React, Vue, Angular (não use framework)
- jQuery (não precisa)
- Bibliotecas pesadas desnecessárias

## 🚀 Otimização

### 1. Code Splitting (Lazy Loading)
```javascript
// ✓ BOM: Importar módulo sob demanda
document.getElementById('btn-abrir-painel').addEventListener('click', async () => {
  const { iniciarPainel } = await import('./painel/dashboard.js');
  iniciarPainel();
});
```

### 2. Debounce para Buscas
```javascript
// js/utils/debounce.js
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Uso
const buscarProdutos = debounce(async (termo) => {
  const resultado = await supabase
    .from('produtos')
    .select()
    .textSearch('nome', termo);
}, 300);

input.addEventListener('input', (e) => {
  buscarProdutos(e.target.value);
});
```

### 3. Lazy Load Images
```html
<!-- No HTML -->
<img src="placeholder.jpg" data-src="produto.jpg" loading="lazy" alt="Descrição"/>

<!-- No JavaScript -->
const images = document.querySelectorAll('img[data-src]');
images.forEach(img => {
  img.src = img.dataset.src;
});
```

## 🎯 Checklist antes de considerar pronto

- [ ] Sem erros no console
- [ ] Sem warnings (eslint/console)
- [ ] Testado em Chrome, Firefox, Safari, Edge
- [ ] Testado em mobile (iPhone 12, Android)
- [ ] Persiste carrinho com localStorage
- [ ] Realtime funciona (novos pedidos chegam)
- [ ] RLS não bloqueia requisições legítimas
- [ ] Todas as queries têm índices apropriados
- [ ] Sem N+1 queries (JOIN no Supabase)
- [ ] Performance: <3s para carregar cardápio

---

**Versão**: 1.0  
**Último update**: Abril 2026  
**Stack**: Vanilla JS ES2020+ + Supabase + CSS3
