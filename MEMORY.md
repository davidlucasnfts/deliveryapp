# MEMORY.md — Histórico de Entregas DeliveryApp

Tabela consolidada de funcionalidades entregues, ordenadas da mais recente para a mais antiga. Use como referência rápida de evolução do produto.

| Funcionalidade (valor de negócio primeiro, detalhe técnico entre parênteses) | Data |
|---|---|
| Hardening de segurança completo: RLS em 16 tabelas, view `lojas_publicas`, RPCs security definer, headers de segurança, CSP Report-Only, sanitização XSS, criação de loja server-side | 2026-08-19 a 2026-08-22 |
| Integração WAHA Core para notificações automáticas de status do pedido via WhatsApp (Vercel Function + config no painel) | 2026-05-12 |
| Conformidade LGPD: consentimento no checkout, anonimização de dados, política de privacidade (`privacidade.html`) | 2026-05-12 |
| Políticas RLS dos buckets `produtos` e `banners` isoladas por `loja_id` | 2026-05-12 |
| Organização dos scripts SQL com prefixo numérico (`001_`, `002_`...) | 2026-05-12 |
| Correção de XSS no painel de pedidos + redesign da identidade visual | 2026-05-12 |
| Painel desktop responsivo com kanban de pedidos e identidade visual customizável por loja | 2026-04-29 |
| Aba Relatórios com faturamento, top produtos, bairros e horários de pico | 2026-04-29 |
| Botão de avaliação pós-entrega via WhatsApp | 2026-04-29 |
| Número de pedido formatado `PD-YYYYMMDD-NNNNN` gerado por trigger no Supabase | 2026-04-29 |
| Dashboard de pedidos com agrupamento por status e métricas do dia | 2026-04-29 |
| Skills do projeto (`claude-spec-toolkit`) e backlog priorizado | 2026-04-29 |
| Criação do `CHANGELOG.md` e enxugamento do `CLAUDE.md` | 2026-04-29 |
| Substituição de `console.error` por `showToast` para feedback ao usuário | 2026-04-29 |
| Separação de CSS/JS de `pagamento.html` e `admin.html` em arquivos próprios | 2026-04-27 |
| Extração do CSS do `painel.html` para `painel-style.css` | 2026-04-27 |
| Separação do login do dono do login admin (tela `login.html` dedicada) | 2026-04-27 |
| Configuração do projeto como site estático na Vercel (`outputDirectory .`, `package.json`) | 2026-04-27 |
| Correção do padrão inválido no `vercel.json` que quebrava todos os deploys | 2026-04-27 |
| Header expandido no cardápio: nome, status, tempo de entrega, cidade | 2026-04-26 |
| Emoji automático por tipo de produto quando não há foto | 2026-04-26 |
| Separação do `index.html` em módulos (`js/app.js`, `carrinho.js`, `adicionais.js`, `checkout.js`) | 2026-04-26 |
| Foto do produto com ponto focal ajustável (`img_offset_x/y`) | 2026-04-26 |
| Modos de exibição da foto: preencher (contain) e ajustável (cover com drag) | 2026-04-26 |
| Selos nos produtos: vegano, sem glúten, novo, picante | 2026-04-26 |
| Banners promocionais por loja (carrossel de até 3, troca automática) | 2026-04-26 |
| Seção "Destaques" no cardápio (carrossel horizontal) | 2026-04-23 |
| Aplicação do Design System Fast Casual em todas as telas | 2026-04-23 |
| "Peça também" (upsell) no carrinho, gerenciado pelo dono no painel | 2026-04-21 |
| Sistema de fidelidade: pontos, cupons, base de clientes e transmissão WhatsApp | 2026-04-13 |
| Adicionais por produto com grupos obrigatórios/opcionais e mín/máx | 2026-04-17 |
| Taxa de entrega por bairro (cadastro no painel, cálculo pelo CEP) | 2026-04-17 |
| Autopreenchimento de endereço pelo CEP (ViaCEP) | 2026-04-17 |
| Pagamento online com cartão via Mercado Pago | 2026-04-16 |
| Envio do pedido por WhatsApp para a loja + mensagens por status | 2026-04-15 |
| Recálculo do valor do pedido no servidor + idempotency-key no MP | 2026-04-20 |
| Novo painel do dono com 3 modais separados (categoria, produto, adicionais) | 2026-04-18 |
| Upload de imagem com posicionador drag no modal de produto | 2026-04-14 |
| Ordenação de categorias por pressionar e segurar | 2026-04-14 |
| Cardápio digital inicial do cliente (hero, categorias, busca, carrinho persistente) | 2026-04 (inicial) |
| Loja piloto Pizzaria Melinda configurada como fallback no `js/app.js` | 2026-04 |
