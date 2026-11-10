# ROADMAP.md — DeliveryApp

Fases até o lançamento e pós-lançamento. Cada fase indica o que já está pronto e o que falta.

---

## ✅ Fase 1 — Fundação (concluída)

- [x] Repositório GitHub + Vercel configurados
- [x] Supabase com PostgreSQL, Auth, Storage e Realtime
- [x] Cardápio público funcional (produtos, categorias, carrinho, checkout)
- [x] Painel do dono: pedidos, cardápio, configurações, relatórios, fidelidade
- [x] Painel administrativo para gestão de lojas
- [x] Multi-tenant via `loja_id` + RLS
- [x] Pagamento online via Mercado Pago + PIX/dinheiro
- [x] Envio de pedido por WhatsApp para a loja

---

## 🔨 Fase 2 — Segurança e confiabilidade (em andamento)

### Já entregue
- [x] RLS completo (`sql/008_rls_seguranca.sql`)
- [x] Sanitização XSS
- [x] Headers de segurança e CSP Report-Only
- [x] Functions protegidas por JWT/UUID/allowlist
- [x] Criação de loja server-side
- [x] "Meus pedidos" real

### Falta terminar
- [ ] Rodar `sql/008_rls_seguranca.sql` e `sql/009_meus_pedidos.sql` no Supabase
- [ ] Conferir `usuarios.id = auth.users.id` para usuários existentes
- [ ] Rotacionar `mp_access_token` das lojas (tokens antigos expostos)
- [x] Adicionar `@supabase/supabase-js` ao `package.json` (feito em 2026-11-09)
- [ ] Webhook do Mercado Pago para confirmação assíncrona real
- [ ] Recálculo de preço server-side no momento da criação do pedido
- [ ] Corrigir `cliente_id` em `pedidos` para anonimização LGPD funcionar
- [ ] Rate limit real (Upstash/Vercel KV)
- [ ] CSP em modo enforce (depois de conferir reports)

---

## ⬜ Fase 3 — MVP pronto para vender

- [ ] Billing do SaaS: cobrança recorrente dos planos (Stripe/Pagar.me/Asaas)
- [ ] Gating por plano (limites de produtos/banners/funcionários?)
- [ ] Self-service de cadastro de loja (com validação de pagamento)
- [ ] Onboarding do dono (passo a passo inicial)
- [ ] Página pública de acompanhamento do pedido (`acompanhar.html`)
- [ ] Notificação de novo pedido para o dono via WhatsApp
- [ ] Controle de estoque com badge "Últimas unidades!"
- [ ] Preço promocional (`preco_original` tachado)
- [ ] Tipo de pedido: entrega / retirada
- [ ] Domínio personalizado (`slug` da loja)
- [ ] Landing page (`home.html`) alinhada com funcionalidades reais
- [ ] Termos de uso e política de privacidade revisados

---

## ⬜ Fase 4 — Polimento e escala

- [ ] Pixel Google + Meta por loja
- [ ] Impressão automática de pedido (cupom térmico)
- [ ] QR Code para mesas (modo salão)
- [ ] Recuperador de carrinho abandonado
- [ ] Árvore de links (link de bio)
- [ ] Controle de acesso de funcionários (dono, caixa, atendente)
- [ ] Áreas de entrega por raio (km)
- [ ] Múltiplas bandeiras de cartão (Asaas/Stripe)

---

## ⬜ Fase 5 — Pós-lançamento

- [ ] Robô WhatsApp com IA (Evolution API)
- [ ] App móvel (PWA ou React Native)
- [ ] KDS (tela de cozinha)
- [ ] Integração com iFood
- [ ] Dashboard administrativo de MRR/churn
- [ ] Programa de indicação/afiliados
- [ ] API pública/documentada para parceiros
