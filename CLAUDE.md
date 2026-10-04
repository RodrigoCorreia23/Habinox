@AGENTS.md

# Abinox — Plataforma digital de vendas

Contexto do projeto para desenvolvimento assistido. Lê este ficheiro antes de propor arquitetura, escrever código ou tomar decisões de produto.

---

## 1. Contexto de negócio

A **Abinox** é uma serralharia em Viana do Castelo (inox, ferro, alumínio). Produz portões (batente e correr), escadas, guardas/guarda-corpos, chaminés, chapéus de chaminé e caixas de correio. Quase tudo é feito **por medida**.

Hoje vende sobretudo por recomendação, com um site com mais de 15 anos. Capta cerca de 3% do mercado no raio regional e cerca de 0,02% a nível nacional. O objetivo é chegar a 1% nacional e, mais tarde, expandir para Espanha e França.

**O problema a resolver:** cada pedido passa hoje por orçamento manual. A plataforma deve permitir ao cliente configurar o produto (medidas, material, cor) e **receber o preço de imediato**, sem intervenção humana.

**Cliente:** Bruno Freitas (Abinox). **Prestador:** Rodrigo Correia (freelancer, trabalha sozinho).

### Restrições comerciais (importantes para decisões técnicas)

- Preço **fechado por fase**. Derrapagem de horas é custo do prestador → preferir soluções simples e provadas a soluções elegantes e demoradas.
- Plano base: ~520h, 7 800 € + IVA. Disponibilidade ~15h/semana.
- Manutenção posterior: 75 €/mês, limitada a 5h/mês → **código que exija pouca manutenção é um requisito de negócio**, não um luxo.
- O código é propriedade do prestador; o cliente recebe licença de utilização. Pode haver reutilização futura noutros clientes → **evitar hard-coding de regras específicas da Abinox**; parametrizar.

---

## 2. Âmbito por fases

As fases são sequenciais. Não começar trabalho de uma fase seguinte sem a anterior fechada.

| Fase | Conteúdo | Horas |
|---|---|---|
| 0 | Definição, lista de produtos e campos, regras de preço, wireframes | 20h |
| 1 | Loja online (beta) **+ integração PHC GO** | 210h |
| 1B | Pagamento online (Stripe ou equivalente) | 40h |
| 2 | Métricas e análise do site | 35h |
| 3 | Integração com o CRM GoHighLevel | 35h |
| 4 | Área Pro (rede de instaladores) | 100h |
| 5 | Assistente com IA | 60h |
| 6 | Relatórios automáticos de procura | 20h |
| 7 | *(opcional)* Prospeção via concursos públicos | 70h |
| 8 | *(opcional)* 3D por medida e ligação à produção | 135h |

### Detalhe funcional

**Fase 1 — Loja**
- Catálogo por categorias; página de produto com largura, comprimento, altura, material, cor e outras opções, cada uma com mínimos e máximos.
- **Motor de preços paramétrico**: preço = f(matéria-prima, quantidade de material em função das medidas, custo/hora de mão de obra, tempo estimado, margem). Alterar o custo de um material recalcula todos os produtos que o usam. As fórmulas por produto são configuráveis em backoffice, não escritas em código.
- Visualizador 3D: ficheiros **GLB** exportados pelo cliente a partir do TopSolid. **No beta o 3D muda cor e material, não muda de tamanho.** As medidas afetam apenas o preço. (3D por medida = fase 8.)
- Registo e login de clientes, carrinho, envio de pedido, emails transacionais.
- Backoffice: produtos, categorias, materiais, cores, fórmulas de preço, pedidos.
- RGPD (consentimentos e cookies), SEO básico.

**Fase 1 — Integração PHC GO (ERP do cliente)**
- Só **leitura** de artigos (materiais) e custos. A Simple API do PHC GO chega.
- Necessário AppID + token; o cliente fornece acessos e ambiente de testes.
- **Padrão obrigatório: cópia local.** Um job sincroniza (1x/dia) e grava na BD da loja. A loja lê **sempre** a cópia local, nunca o PHC em tempo real de request.
- Botão "sincronizar agora" no backoffice.
- Se o PHC falhar: a loja continua com os últimos valores conhecidos + aviso no backoffice com data da última sincronização.
- Se um artigo desaparecer do PHC: **nunca apagar nem pôr preço a zero**; manter o último custo e marcar para revisão humana.
- Guardar histórico de custos (serve para relatórios e para auditoria de preços).

**Fase 1B — Pagamentos**
- Gateway: Stripe ou equivalente nacional (IfthenPay, Eupago). Requisito: **cartão + MB WAY + referência Multibanco**.
- Confirmação por **webhook**. A referência Multibanco pode ser paga dias depois → a máquina de estados do pedido tem de aguentar pagamentos assíncronos e tardios.
- Portes de envio configuráveis; ligação a faturação.
- **Nunca** cobrar taxa ao cliente por meio de pagamento (proibido em Portugal, DL 3/2010). O custo é absorvido na margem, configurável como % no backoffice.

**Fase 3 — GoHighLevel (CRM)**
- Cada registo cria/atualiza contacto no GHL.
- Eventos do site viram tags/campos: `configurou`, `adicionou_carrinho`, `nao_concluiu_24h`, etc. Os workflows de follow-up vivem no GHL, não no código.
- Consentimento de contacto registado no momento do registo (necessário para o follow-up).

**Fase 4 — Área Pro (rede de instaladores)**
- **Não é marketplace aberto.** Contas criadas por convite do Bruno.
- Modelo comercial: **desconto**, não comissão. O instalador compra com desconto e revende. Não há cálculo de comissões.
- Encomenda com **morada de entrega diferente da de faturação** (entrega em casa do cliente final).
- Painel do instalador: encomendas, histórico, estados.
- Acesso a ficheiros técnicos (STEP/IGES/TopSolid) em ZIP, só nesta área. **Nunca servir .exe para download.**

**Fase 5 — Assistente com IA** → ver secção 5.

**Fase 6 — Relatórios**
- Relatório mensal automático a partir dos dados da própria loja (produtos, medidas, cores, regiões, evolução), comparação com meses anteriores, envio por email. Sem fontes externas.

---

## 3. Stack

Escolhida para um programador sozinho, com manutenção baixa e muito trabalho feito por serviços geridos.

**Aplicação**
- **Next.js (App Router) + TypeScript** — site, backoffice e API no mesmo projeto.
- **Uma única app, sem monorepo** (sem Turborepo/pacotes separados). Módulos de domínio com fronteiras claras.
- **Tailwind CSS** + **shadcn/ui**. Design: técnico e minimalista (ver mockup).
- **Backoffice próprio** com shadcn/ui + TanStack Table (não Payload nem outro CMS).
- **Drizzle ORM** sobre **PostgreSQL**.
- **Better Auth** (adaptador Drizzle) para autenticação. Dados na nossa BD (RGPD, apagamento), papéis `cliente|pro|admin`, convites Pro. Não usar Clerk.
- **next-intl** desde o dia 1, com rotas `/[locale]` (`pt`, depois `es`, `fr`). No beta só existe PT. O backoffice (`/admin`) fica só em PT, sem i18n.
- **Zod** para validação de input em todas as fronteiras (forms, API, webhooks).
- **react-three-fiber + drei** para o visualizador GLB. Carregamento lazy; modelos comprimidos com Draco/meshopt.

**Infraestrutura**
- **Vercel** para a app + **Neon** para Postgres (branches de BD para staging, backups com point-in-time restore). Motivo: a operação de servidor (backups, updates, restauro) comeria as 5h/mês de manutenção. Só considerar VPS (Hetzner + Coolify) perante um requisito concreto (jobs longos, custo recusado pelo cliente).
- **Cloudflare R2** para GLB, imagens e ficheiros técnicos.
- **Vercel Cron** a chamar `app/api/cron/[job]`, protegido por segredo, para sincronização PHC, agentes, relatórios e verificações.
- **Resend** para email transacional.
- **Sentry** para erros; **Umami** ou GA4 + **Microsoft Clarity** para analytics.
- Ambientes: `dev` local, `staging`, `prod`. Migrações versionadas no repositório.

**Integrações**
- PHC GO (Simple API) — leitura de artigos/custos.
- GoHighLevel — contactos e tags.
- Stripe / IfthenPay / Eupago — pagamentos.
- Anthropic API — agentes (ver secção 5).

**Estrutura de pastas**

```
src/
  app/
    [locale]/(loja)/          catálogo, produto, carrinho, checkout
    [locale]/(conta)/         registo, login, encomendas do cliente
    [locale]/pro/             área Pro (fase 4)
    admin/                    backoffice (só PT)
    api/
      webhooks/[provider]/    pagamentos (fase 1B)
      cron/[job]/             phc-sync, agentes, relatórios (protegidos por segredo)
  lib/
    pricing/                  PURO: sem BD nem I/O; recebe dados e devolve preço + decomposição
    money/                    cêntimos e IVA (nada de float)
  server/                     um módulo por domínio (service + repository)
    catalog/
    quotes/
    orders/                   máquina de estados explícita
    sync/phc/                 interface PhcClient + adaptador real + adaptador fake
    payments/                 interface PaymentProvider (fase 1B)
    crm/                      fase 3
    agents/                   fase 5 (prompts versionados em agents/prompts/)
    events/                   tabela events: espinha comum de métricas, CRM e agentes
  db/
    schema/                   Drizzle, um ficheiro por domínio
    migrations/
  components/ui/              shadcn/ui
tests/
```

**Regras de código**
- Lógica de preço isolada num módulo puro e testado (`lib/pricing`), com testes unitários. É a parte onde um erro custa dinheiro real. `lib/pricing` não importa nada de `server/` nem de `db/`.
- Cada integração externa (PHC, gateway, GHL, Anthropic) fica atrás de uma **interface com adaptador fake**. Permite desenvolver e testar sem os acessos reais.
- Dinheiro em **cêntimos (integer)**; custos de material em `numeric(12,4)`. Nunca `float` para valores monetários.
- Parâmetros de negócio (margem do gateway, validade dos orçamentos, custo/hora, taxa de IVA…) vivem na tabela `settings`, não em constantes no código.
- Sem segredos no repositório; variáveis de ambiente.
- Jobs idempotentes: correr duas vezes não pode duplicar nada.
- Logs estruturados com `jobId`/`correlationId`.
- Testes: **Vitest** para `pricing`, `money`, sincronização PHC (com o adaptador fake) e máquina de estados das encomendas. **Playwright** só para o fluxo configurar → carrinho → pedido.

**Fórmulas de preço: estruturadas por linhas de custo** (não expressão livre)

```
Portão de correr =
  linha "chapa"      material: inox_304   qtd = L × H × 1.1      (m²)
  linha "tubo"       material: tubo_40x40 qtd = 2×L + 3×H         (m)
  linha "soldadura"  mão de obra          horas = 2 + 0.5 × L
  linha "pintura"    acabamento           qtd = L × H
  margem: 35%   arredondamento: 5 €
```

- Só as **quantidades** são expressões: variáveis das opções do produto, `+ - × ÷`, `min`, `max`, `ceil`. Parser pequeno e seguro, **nunca `eval`**.
- O backoffice mostra uma pré-visualização com valores de exemplo e a decomposição por linha.
- As fórmulas têm **versão**. Cada orçamento e cada encomenda guarda um *snapshot* (versão da fórmula, custos usados, decomposição), para auditoria e para a validade dos orçamentos.

**Estados da encomenda (rascunho)**

`pending_payment → paid → in_production → ready → shipped → delivered`, mais `cancelled` e `expired`. As transições ficam numa função pura e testada. Um pagamento que chega depois de `expired` vai para revisão humana; não muda o estado automaticamente.

**IVA**
- No beta: vendas em Portugal, taxa de 23% guardada em `settings` (não hard-coded), com snapshot da taxa em cada encomenda.
- Regime OSS (vendas a particulares em ES/FR) só é tratado na expansão internacional.

---

## 4. Modelo de dados (esboço)

```
materials        (id, phc_code, name, unit, cost numeric(12,4), cost_updated_at, phc_missing_at)
material_costs   (id, material_id, cost, observed_at)          -- histórico
categories       (id, slug, name)
products         (id, category_id, slug, name, model_glb_url, active)
product_options  (id, product_id, key, type, min, max, step, unit, required)
formula_versions (id, product_id, version, margin, rounding, active, created_at, created_by)
formula_lines    (id, formula_version_id, label, kind: material|labour|finish, material_id, quantity_expr, unit, position)
finishes         (id, name, type: material|cor, ral, price_modifier)
quotes           (id, user_id, product_id, config_json, price_cents, pricing_snapshot jsonb, valid_until)
orders           (id, user_id, status, total_cents, vat_rate, billing_address, shipping_address)
order_items      (id, order_id, product_id, config_json, unit_price_cents, qty, pricing_snapshot jsonb)
payments         (id, order_id, provider, method, external_ref, amount_cents, status, created_at, paid_at)
webhook_events   (id, provider, external_id UNIQUE, payload_json, received_at, processed_at)  -- idempotência
users            (id, email, role: cliente|pro|admin, discount_group_id)
discount_groups  (id, name, discount_pct)
pro_invites      (id, email, invited_by, accepted_at)
consents         (id, user_id, type, granted, source, created_at)            -- RGPD
settings         (key, value_json, updated_at, updated_by)                   -- parâmetros de negócio
events           (id, user_id, type, payload_json, created_at)  -- métricas + gatilhos CRM
sync_runs        (id, source, started_at, finished_at, status, items, errors_json)
agent_messages   (id, from_agent, to_agent, type, payload_json, severity, created_at, resolved_at)
```

**Regra de preços:** um orçamento guardado mantém o preço durante um prazo configurável (sugestão: 15 ou 30 dias). Passado esse prazo, recalcula. Evita que o cliente veja preços diferentes de um dia para o outro sem explicação.

---

## 5. Camada de IA — agentes que comunicam entre si

Requisito do cliente: **as IAs têm de falar umas com as outras para perceber se está tudo a correr bem.** Ou seja, além do assistente virado ao cliente, existe uma camada de supervisão que vigia a saúde do negócio e do sistema e que escala para humano quando é preciso.

### Agentes

| Agente | Função | Lê | Escreve |
|---|---|---|---|
| **Atendimento** | Responde a dúvidas no site e WhatsApp, pede fotos do espaço, qualifica, marca reuniões, passa a humano | Catálogo, FAQ, estado de encomendas | `agent_messages`, CRM |
| **Operações** | Vigia saúde: sincronização PHC, webhooks de pagamento, erros, latência, jobs falhados | `sync_runs`, logs, Sentry, estados de pedidos | `agent_messages` |
| **Comercial** | Vigia sinais de negócio: quebras de conversão, carrinhos abandonados acima do normal, produtos sem procura, variações bruscas de custo | `events`, `orders`, `material_costs` | `agent_messages`, relatórios |
| **Supervisor** | Lê o que os outros produziram, cruza, decide o que é ruído e o que é problema, prioriza e escala | `agent_messages` | Resumo diário, alertas a humano |

### Como comunicam

- **Não há conversa livre entre agentes.** Comunicam por **mensagens estruturadas** gravadas na tabela `agent_messages`, que é a única fonte de verdade da camada de IA. Tudo fica auditável.
- Formato: `{ from, to, type, severity: info|warn|critical, subject, facts: {...}, suggested_action, requires_human: bool }`.
- `facts` contém **números verificáveis** retirados da base de dados, não impressões. Um agente nunca afirma algo sem o facto correspondente.
- Ciclo: os agentes Operações e Comercial correm por **cron** (ex.: de hora a hora e diariamente). O Supervisor corre a seguir, lê as mensagens não resolvidas, agrega e produz um resumo. O agente de Atendimento corre a pedido do utilizador e pode abrir mensagens para os outros (ex.: "três clientes relataram preço estranho no portão X").
- Escalonamento: `critical` → WhatsApp/email imediato ao Bruno e ao programador. `warn` → entra no resumo diário. `info` → fica no painel.
- Exemplo de cadeia: Operações deteta que a sincronização do PHC falhou há 36h → mensagem `warn` → Comercial reporta queda de 40% em pedidos no mesmo período → Supervisor cruza as duas, classifica como `critical`, propõe "verificar token do PHC" e escala.

### Guardrails (obrigatórios)

- Os agentes **não escrevem nada no PHC** nem alteram preços, produtos ou encomendas. Só **leem** e **propõem**. Qualquer ação com efeito comercial exige confirmação humana no backoffice.
- **Teto de custo** por dia e por agente nas chamadas à API; ao atingir o teto, degrada para verificações determinísticas (sem LLM) e avisa.
- Muita da "vigilância" deve ser feita por **regras simples** (thresholds em SQL). O LLM entra para interpretar, agregar e escrever em linguagem natural, não para detetar o que uma query deteta melhor e mais barato.
- Dedup: a mesma condição não gera alerta repetido antes de ser resolvida ou de passar uma janela definida.
- Nada de dados pessoais de clientes nos prompts além do estritamente necessário; sem dados de pagamento.
- Todos os prompts versionados no repositório.

---

## 6. Segurança e conformidade

- RGPD: consentimentos registados com data e origem; direito ao apagamento implementado no backoffice; o prestador atua como subcontratante.
- Sem dados de cartões na plataforma — tudo via gateway.
- Ficheiros técnicos (STEP/IGES/TopSolid) servidos apenas a utilizadores Pro autenticados, com URLs assinadas e de curta duração.
- Backups diários da base de dados, com restauro testado.
- Rate limiting nos endpoints públicos e nos webhooks (verificar assinatura).

---

## 7. Decisões já tomadas (não reabrir sem motivo)

1. 3D no beta: só cor e material. Medidas afetam o preço.
2. Ficheiros 3D: GLB exportado pelo TopSolid pelo cliente. Sem pipeline de conversão no servidor.
3. PHC GO: só leitura, com cópia local e sincronização diária.
4. Área Pro: por convite, com desconto, sem comissões.
5. Sem taxas de pagamento cobradas ao cliente final.
6. Fases 7 e 8 fora do plano base.
7. Relatórios da fase 6 só com dados internos.
8. Uma única app Next.js, sem monorepo; módulos de domínio em `src/server/`.
9. Fórmulas de preço estruturadas por linhas de custo, versionadas, com snapshot em orçamentos e encomendas. Sem expressão livre nem `eval`.
10. Infraestrutura: Vercel + Neon + R2 + Vercel Cron.
11. Autenticação: Better Auth (dados na nossa BD).
12. i18n com next-intl desde o início (rotas `/[locale]`); beta só em PT.
13. Backoffice próprio (shadcn/ui + TanStack Table), sem CMS.
14. IVA: 23% PT no beta, parametrizado em `settings`; OSS só na expansão.
15. Integrações externas atrás de interfaces com adaptador fake.

### Ordem de trabalho

1. Fase 0: lista de produtos e fórmulas reais de 2–3 produtos-piloto (portão de correr, guarda, caixa de correio).
2. Esqueleto: Next.js, Drizzle, Neon, Better Auth, next-intl, CI, Sentry, staging.
3. `lib/pricing` + testes, **antes** de qualquer UI.
4. Catálogo, configurador e backoffice.
5. Sincronização PHC: primeiro com o adaptador fake, depois com o real quando chegarem os acessos.

## 8. Por confirmar com o cliente

- Acessos à API do PHC GO (AppID, token, ambiente de testes) — **bloqueia a integração real e o fecho da fase 1** (o desenvolvimento avança com o adaptador fake).
- Gateway de pagamento escolhido e confirmação do suporte a MB WAY.
- Faturação automática no PHC quando o pagamento entra, ou manual? (Automática alarga a integração e sobe a fase 1B para ~50h.)
- Lista final de produtos e respetivas fórmulas de preço.
- Regras de portes de envio.
- Prazo de validade dos orçamentos guardados.

---

## 9. Como quero trabalhar neste repositório

- Antes de implementar uma fase, propõe um plano curto e espera aprovação.
- Prefere bibliotecas estáveis e documentadas a soluções criativas.
- Nada de dependências novas sem justificação.
- Em pagamentos, autenticação e preços: código explícito, testado e revisto linha a linha. É onde erros custam dinheiro e confiança.
- Escreve testes para o motor de preços e para a sincronização PHC.
- Mensagens de commit e comentários em português; nomes de código em inglês.
