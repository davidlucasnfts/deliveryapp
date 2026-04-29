# 📱 Skill: DeliveryApp UX/UI Design System

**Trigger**: Qualquer questão sobre design, layout, navegação, interações ou componentes visuais do DeliveryApp.

## 📋 Cobertura

Este skill cobre:
- Padrões de UI/UX para aplicação de delivery
- Componentes reutilizáveis (cards, modals, buttons)
- Fluxos de navegação
- Feedback visual e microinterações
- Tipografia e cores
- Layout responsivo (mobile-first)
- Acessibilidade básica
- Estados visuais (loading, erro, sucesso)

## 🎨 Design System (Estabelecido)

### Tipografia
- **Títulos**: Plus Jakarta Sans, 18-24px, bold
- **Corpo**: Plus Jakarta Sans, 14-16px, regular
- **Labels**: Plus Jakarta Sans, 12-14px, medium
- **Código/Mono**: Courier New (se needed)

### Cores (CSS Variables)
- `--color-primary`: Verde delivery (#10B981)
- `--color-secondary`: Cinza neutro (#6B7280)
- `--color-success`: Verde claro (#34D399)
- `--color-danger`: Vermelho (#EF4444)
- `--color-warning`: Amarelo (#F59E0B)
- `--color-info`: Azul (#3B82F6)

### Espaçamento
- Gap base: 8px, 12px, 16px, 24px, 32px
- Padding padrão: 12px (componentes), 16px (cards)
- Margin padrão: 16px (entre seções)

### Componentes Base

#### 1. Cards (produtos, pedidos)
```html
<div class="card">
  <img src="..." alt="Descrição"/>
  <h3>Título</h3>
  <p>Descrição breve</p>
  <div class="card-footer">
    <span class="price">R$ 15,00</span>
    <button>Adicionar</button>
  </div>
</div>
```

#### 2. Modals (adereços, checkout)
```html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2>Título</h2>
      <button class="close">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Conteúdo -->
    </div>
    <div class="modal-footer">
      <button class="btn-secondary">Cancelar</button>
      <button class="btn-primary">Confirmar</button>
    </div>
  </div>
</div>
```

#### 3. Buttons
- **Primary**: Fundo verde, texto branco, 44px altura (mobile touch)
- **Secondary**: Borda apenas, fundo transparente
- **Danger**: Fundo vermelho, para ações destrutivas
- Estados: Normal, Hover (mais escuro), Active (pressionado), Disabled (cinza 50%)

#### 4. Forms
- Label em cima do input
- Input com 44px altura (mobile)
- Feedback de validação abaixo (vermelho = erro, verde = sucesso)
- Placeholder cinzento claro
- Focus visible (outline 2px na cor primária)

#### 5. Lists/Tables (pedidos, produtos)
```html
<div class="list-item">
  <div class="list-item-main">
    <h4>Título</h4>
    <p>Descrição</p>
  </div>
  <div class="list-item-side">
    Valor ou ação
  </div>
</div>
```

## 🎯 Fluxos Principais

### Fluxo 1: Cliente navegando cardápio
1. Vê categorias (horizontal scroll)
2. Clica categoria → filtra produtos
3. Clica produto → Modal com detalhes + adereços
4. Seleciona adereços (obrigatórios em destaque)
5. Vê subtotal em tempo real
6. Clica "Adicionar ao carrinho" → Toast de confirmação
7. Mini-carrinho aparece no rodapé

### Fluxo 2: Carrinho e checkout
1. Clica "Ver carrinho" → Modal do carrinho
2. Vê itens com quantidade e adereços selecionados
3. Pode aumentar/diminuir quantidade ou remover
4. Vê resumo (subtotal, delivery, desconto, total)
5. Clica "Ir para entrega" → Passo 2
6. Preenche endereço (ou seleciona salvo)
7. Escolhe horário de entrega (ASAP ou agendar)
8. Clica "Ir para pagamento" → Passo 3
9. Seleciona método de pagamento
10. Clica "Confirmar" → Processa pagamento
11. Tela de confirmação com número do pedido

### Fluxo 3: Painel admin vendo pedidos
1. Dashboard mostra 3 abas: "Novos", "Preparando", "Pronto"
2. Cada pedido é um card com cliente, itens, endereço, telefone
3. Botão "Marcar como..." muda o status
4. Quando muda, pedido sai da aba atual e vai pra próxima
5. Realtime: novos pedidos chegam em tempo real (notificação visual)

### Fluxo 4: Admin gerenciando produtos
1. Aba "Produtos" lista todas as categorias
2. Expande categoria → mostra produtos
3. Clica "Editar" no produto → Modal de edição
4. Modal tem: Nome, Preço, Descrição, Imagem, Grupos de adereços
5. Botão "Novo grupo de adereços" → sub-modal
6. Sub-modal: Nome do grupo, Obrigatório?, Max seleções
7. Dentro do grupo, botão "Novo adereço" → Campo nome + preço
8. Salva → Produto atualizado

## 🎨 Estados Visuais

### Loading
- Spinner circular (16px) com animação `spin` (1s loop)
- Texto: "Carregando..." em cinza claro
- Desabilita cliques em background

### Error
- Toast vermelho no topo (auto-dismiss após 3s)
- Ícone de erro + mensagem clara
- Botão "Tentar novamente" se aplicável

### Success
- Toast verde no topo (auto-dismiss após 2s)
- Ícone de check + mensagem
- Exemplo: "Adereço criado com sucesso!"

### Empty State
- Ícone grande (cinza 40%)
- Título: "Sem dados"
- Subtitle: Descrição breve
- CTA: "Voltar" ou "Criar novo"

## 📐 Breakpoints

- Mobile: 0-767px (default)
- Tablet: 768px-1023px
- Desktop: 1024px+

Mobile first: escrever CSS para mobile, depois `@media (min-width: 768px)` para tablet+.

## ♿ Acessibilidade Mínima

- Todos os botões tem `aria-label` se ícone-only
- Formulários tem labels associados (`<label for="input-id">`)
- Cores não são único indicador (usar símbolos + cores)
- Contraste 4.5:1 em textos de corpo
- Keyboard navigation: Tab entre elementos focáveis

## 🔄 Microinterações

- Hover em buttons: fundo mais escuro (10% mais opaco)
- Clique em card: escala ligeira (98% → 100%) + sombra
- Input focus: outline 2px na cor primária
- List items drag: cursor muda para `move`
- Toast: fade-in (200ms) + fade-out (200ms) ao sair

## 📏 Dimensões Padrão

- Button height: 44px (mobile touch-friendly)
- Input height: 44px
- Card altura: varia (flexible)
- Modal width: 90vw max 500px (mobile), 500px (desktop)
- Header height: 56px
- Footer height: 56px (com mini-carrinho)

## 🎭 Padrões de Formulário

### Validação em Tempo Real
- Campo obrigatório: label com `*`
- Email: valida formato ao sair do campo
- Telefone: formata automaticamente
- CEP: busca automaticamente endereço (ViaCEP)

### Feedback
- ✓ Verde ao validar
- ✗ Vermelho ao falhar
- Mensagem de erro abaixo do campo

### Submit
- Button desabilitado até todos os campos obrigatórios preenchidos
- Loading spinner dentro do button enquanto processa
- Não deixa clicar 2x (prevenir double-submit)

## 🎯 Checklist para nova tela

- [ ] Segue typography padrão
- [ ] Usa cores do design system
- [ ] Espaçamento consistente (8px grid)
- [ ] Responsive (testa em 375px, 768px, 1024px)
- [ ] Estados visuais (loading, error, empty, success)
- [ ] Acessibilidade básica (labels, contraste, keyboard)
- [ ] Microinterações suaves (não abruptas)
- [ ] Testado no celular real (não só desktop)

---

**Versão**: 1.0  
**Último update**: Abril 2026  
**Aplicável a**: index.html, painel.html, checkout flow
