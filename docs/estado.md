# Estado do projeto — passagem de contexto

> Documento vivo. **Atualizar no fim de cada sessão de trabalho** (secções 2, 6 e 7).
> O `CLAUDE.md` tem o contexto de negócio, as decisões e as regras; este ficheiro tem
> **o que já está feito, como está feito e o que falta**. Última atualização: 2026-10-27.

---

## 1. Resumo rápido

- **Fase atual:** esqueleto técnico feito (passos 1–6 de 7). **Fase 0 quase fechada**: as regras de preço, pagamento, IVA e transporte estão todas respondidas pelo Bruno (`docs/fase-0.md`, respostas de 14/10 e 26/10); 14 wireframes com a marca **Habinox**, o azul do logótipo e duas revisões feitas. Logótipo redesenhado em SVG (`public/brand/`) e aplicado na app e nos wireframes. O mockup v1 (`docs/mockup/`, "catálogo técnico") foi recusado pelo Bruno ("muitas caixas"); o **mockup v2** (`docs/mockup-v2/`: loja escura de arquitetura moderna, com vista 3D) foi **aprovado a 2026-10-27** e o `DESIGN.md` reescrito. Falta: o Bruno aprovar os wireframes e o logótipo; fotografias recentes das obras; GLB de teste do TopSolid; contrato assinado; e o deploy (passo 7). Depois: fase 1 a começar por `lib/money` + `lib/pricing`.
- **Cliente:** marca **HABINOX®** (não "Abinox"), Bruno Miguel Freitas, Lda, Núcleo Industrial de Antas, 4740-016 Antas, **Esposende**. Domínio `habinox.pt`, email `geral@habinox.pt`.
- **Repositório:** `github.com/RodrigoCorreia23/Habinox`, ramo `main`. CI no GitHub Actions verde.
- **Nada de lógica de negócio ainda** (catálogo, preços, PHC, encomendas): só infraestrutura, autenticação e páginas placeholder.

---

## 2. O que está feito (por commit)

| Commit                                 | Conteúdo                                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f79ed47` chore: base do projeto       | Next.js 16 (App Router), TS estrito (`noUncheckedIndexedAccess`), Tailwind 4, ESLint, Prettier, pnpm 12, Node 24, `src/env.ts` (Zod)                             |
| `df37896` feat: i18n e layouts         | next-intl com rotas `/[locale]` (só `pt`), `/` → `/pt`; `/admin` fora do locale, `noindex`; shadcn/ui (Radix, preset Nova)                                       |
| `1819de4` feat: logs, cron, Sentry     | `lib/log` (JSON + `child()`), `/api/cron/[job]` com `CRON_SECRET`, job `health`; Sentry 11 com recolha de dados pessoais desligada                               |
| `ee4cbf8` test: Vitest, Playwright, CI | Testes unitários e e2e; workflow `.github/workflows/ci.yml`                                                                                                      |
| `c0918c1` feat: base de dados          | Postgres 17 em Docker (porta **5433**), Drizzle, migração inicial (auth + `settings`), scripts `db:*`                                                            |
| `38dd910` feat: autenticação           | Better Auth: registo com verificação de email, login, recuperação de password, papéis, rate limit na BD, proteção de `/admin` e `/[locale]/conta`, seed do admin |

### Fase 0 — documentação, design e ferramentas (2026-10-08 e 2026-10-09)

| Commit                                           | Conteúdo                                                                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db9671a` docs: estado do projeto                | Este ficheiro (passagem de contexto para outro PC)                                                                                                                    |
| `325b7ca` docs: fase 0                           | `docs/fase-0.md`: decisões já tomadas com o Rodrigo, perguntas para o Bruno (blocos A–I) e checklist de entregáveis                                                   |
| `b4415cb` docs: wireframes da loja               | Configurador do portão de correr, carrinho, checkout e confirmação                                                                                                    |
| `68fa6fa` docs: wireframe do editor de fórmulas  | Backoffice: fórmula por linhas de custo, pré-visualização com valores de exemplo, versões                                                                             |
| `f46bfe7` docs: restantes wireframes             | Home, categoria, área de cliente; backoffice de produto/opções, encomendas, materiais/sincronização PHC                                                               |
| `2c22b11` / `60cd4fd` / `8a1d165` chore: skills  | `find-skills` + 10 skills de backend e frontend em `.agents/skills/` (ver secção 4); `.agents/` fora do ESLint e do Prettier                                          |
| `99e30fb` docs: revisão dos wireframes           | Revisão com `impeccable` + `web-design-guidelines` (`docs/revisao-wireframes.md`), P1 corrigidos, 3 ecrãs de telemóvel, perguntas novas 40–50 (bloco J)               |
| `ac8a01a` feat: identidade visual                | `DESIGN.md` ("catálogo técnico"), mockup de referência em `docs/design/`, tokens em `globals.css`, fontes Archivo + IBM Plex Sans/Mono, raio 2px; regras no CLAUDE.md |
| `458635d` docs: nota sobre fontes no build       | Falha intermitente do CI a descarregar a IBM Plex Sans (ver secção 6)                                                                                                 |
| `f856dfc` docs: wireframes com a nova identidade | Os 14 wireframes reestilizados segundo o `DESIGN.md`; home refeita a partir do mockup                                                                                 |

### Fase 0 — respostas do Bruno, orçamentos e marca (2026-10-10 a 2026-10-22)

| Commit                                       | Conteúdo                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `554a06e` docs: estado do projeto            | Atualização deste ficheiro com o trabalho de 8–9 de outubro                                                                                                                                                                                                      |
| `50f6e38` docs: catálogo e opções pelo Bruno | O Bruno cria no backoffice categorias, opções, materiais, cores, limites e regras (não são perguntas); custo da linha de fórmula depende do material (`formula_line_materials`)                                                                                  |
| `04a0025` docs: respostas e orçamentos       | Respostas do Bruno em `docs/fase-0.md`; análise dos 4 orçamentos Excel em `docs/orcamentos-analise.md` (os `.xlsx` **não** entram no git: nomes de clientes e custos)                                                                                            |
| `cc6ade3` docs: componentes e IVA            | Componentes comprados criados pelo Bruno a **preço de venda** (sem margem); IVA aplicado **uma vez ao total**                                                                                                                                                    |
| `611d95f` docs: wireframes Habinox           | Wireframes com a marca Habinox, morada em Esposende e números de encomenda `HBX-`                                                                                                                                                                                |
| `9069d3f` chore: marca Habinox               | "Abinox" → "Habinox" e Viana do Castelo → Esposende na documentação e nos textos da app (título, backoffice, Better Auth, emails, teste e2e)                                                                                                                     |
| `2001c57` feat: acento azul                  | Acento = azul do logótipo `#2005A2` em `DESIGN.md`, `globals.css` (token `brand`; `brand-text` removido) e wireframes; links com sublinhado no hover                                                                                                             |
| `dad3492` docs: estado do projeto            | Atualização deste ficheiro (respostas do Bruno, marca, acento; email e fatura enviados)                                                                                                                                                                          |
| `536d9cd` chore: skill taste                 | Skill `design-taste-frontend` no projeto e global (ver secção 4)                                                                                                                                                                                                 |
| `67dcf05` docs: revisão taste                | Revisão dos wireframes com a skill taste (`docs/revisao-taste.md`) e correções P1/P2: fórmula com o modelo do Bruno, desenho do configurador fixo ao scroll e botão ativo, página inicial (grelha 3 colunas, menu no telemóvel), tipografia, transbordos, ícones |
| `4512c1d` docs: estado do projeto            | Atualização deste ficheiro com a revisão taste                                                                                                                                                                                                                   |
| `c0ed8ef` docs: respostas de 26/10           | Respostas do Bruno de 26/10 em `docs/fase-0.md`; editor de fórmulas sem arredondamento e com "preço com IVA"; checkout com a regra 50/50 acima de 1 000 €                                                                                                        |

### Fase 0 — logótipo e mockup final (2026-10-26)

| Commit                              | Conteúdo                                                                                                                                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bd3bdad` docs: estado do projeto   | Atualização deste ficheiro com as respostas de 26/10                                                                                                                                                                               |
| `12bf444` design: logótipo em SVG   | Logótipo vetorizado a partir do JPEG (potrace): `public/brand/habinox-logo.svg` (com slogan), `-sem-slogan`, `-simbolo`, `-branco`; secção "Logótipo" no `DESIGN.md` (a validar com o Bruno)                                       |
| `8876082` design: logótipo aplicado | Logótipo (SVG em linha) nos 14 wireframes (branco no backoffice); `next/image` no cabeçalho da loja e na barra do backoffice; `src/app/icon.svg` (símbolo) substitui o `favicon.ico`                                               |
| `3e9599e` docs: mockup final        | `docs/mockup/`: página inicial e configurador do portão de correr, desktop e telemóvel, versão clara (`DESIGN.md`) e escura (60/30/10); fotografias reais em `img/`; README com valores de exemplo e correspondência dos `/_blob/` |
| `75fef4a` docs: mockup com aço      | Versão escura: o bege `#E4E1DA` passou a cinzento-aço `#E3E6E9` (pedido do Rodrigo: o bege não ficava bem)                                                                                                                         |

### Fase 0 — mockup v2 aprovado (2026-10-27)

- O Bruno recusou o mockup v1: "muito simples e quadrada e tem muitas caixas"; pediu o visual de imagens de arquitetura moderna do Pinterest (interiores escuros com LED âmbar) e que a loja fosse só loja.
- **Mockup v2** feito num canvas novo (https://claude.ai/artifact/SbBGznCFf11VEcdd7YUev3, privado), cópia em `docs/mockup-v2/` (README com imagens, `/_blob/` e notas): loja — início, categoria Portões com filtros, configurador do portão de correr com preço ao vivo e desenho cotado, **vista 3D** (three.js: rodar, aproximar, rodar sozinho, abrir o portão, material e cor ao vivo) e início em telemóvel.
- Fotografias **do Unsplash, ilustrativas** (não do Pinterest, por direitos); no site entram as das obras.
- **Aprovado pelo Bruno a 2026-10-27:** "A ideia é mesmo esta com um ar de arquitectura moderna, é este o caminho."
- `DESIGN.md` reescrito para a nova direção (grafite `#0F0E0D`, âmbar `#D6A25E`, Archivo larga a 300, sem caixas; o azul do logótipo sai da loja; contrastes verificados; bordas de controlos subidas para `#706960`, 3,56:1). Backoffice mantém a paleta clara. `CLAUDE.md` (stack e decisão 16) atualizado.
- **Email ao Bruno** com as regras de exportação dos GLB (detalhe em `docs/mockup-v2/README.md`): peças `folha` / `folha_esquerda` / `folha_direita`, material `acabamento` (as RAL vêm do backoffice), GLB com peças separadas, portão fechado, sem cenário; pedidos 2 ficheiros de teste.

### Fase 0 — modelo de opções (2026-10-27)

- `docs/modelo-opcoes.md`: biblioteca de opções (medida, número, escolha, sim/não) e valores com `params`; opção do produto com limites e valores permitidos; regras "se… então" (`restrict`, `hide`, `require`, `forbid`), também ao nível da biblioteca, sem ciclos; preço pelas opções via componente, condição na linha ou números nas expressões; variáveis calculadas; artigo da linha escolhido por qualquer opção. Opções e fórmula publicadas juntas em `product_versions`. Testado contra o portão, a guarda, a escada, a chaminé e a caixa de correio. Schema do `CLAUDE.md` atualizado.

Regras do motor de preços que saíram dos orçamentos e das respostas (detalhe em `docs/fase-0.md` e `docs/orcamentos-analise.md`):

```
custo direto  = Σ materiais (qtd × custo, por material escolhido) + consumíveis (% dos materiais) + Σ horas × taxa do sector
preço s/ IVA  = custo direto / (1 − margem)  + Σ componentes (preço de venda)  + instalação (zona + horas)  + portes
IVA           = round(preço s/ IVA × taxa)   (uma vez, ao total; taxa em settings com snapshot)
```

- **Margem sobre o preço de venda** (50% → preço = 2 × custo), não markup.
- **Taxa horária por sector** (23,50 €/h geral; corte laser 120 €/h).
- Pagamento: > 1 000 € **com IVA** → 50% na adjudicação + 50% no despacho; ≤ 1 000 € → total (resposta de 26/10, substitui os 40/60). Sem arredondamentos. Preços mostrados sempre com IVA. Instalação à parte. Transporte por m³ × km, com valores definidos pelo Bruno no backoffice. Linhas e valores de cada produto definidos pelo Bruno ao criá-lo. Validade dos orçamentos: 30 dias. Transporte: próprio, transportadora (por zona no beta) ou levantamento. Prazo de produção pela capacidade mensal (fora do âmbito original — estimar antes de prometer). Cliente envia foto ou rascunho do espaço (upload).

Pontos principais dos wireframes (detalhe em `docs/wireframes/README.md` e `docs/revisao-wireframes.md`):

- **Configurador:** desenho técnico cotado que acompanha as medidas; aceita "3 500" e sugere a unidade certa; lado de recolha obrigatório com espaço livre cotado; ajuda "Como medir" + "Pedir medição no local"; confirmação das medidas presa às medidas (anula-se se mudarem); preço sempre visível (faixa fixa em desktop, barra em baixo em telemóvel); o botão de adicionar diz o que falta.
- **Checkout:** confirmação das medidas por produto, separada das condições; telefone visível. **Confirmação:** 4 casos (pago, à espera do MB WAY, Multibanco por pagar, pagamento falhou).
- **Backoffice:** validar uma fórmula exige linhas sem erros + orçamentos reais dentro de ±[x]% + artigos PHC revistos; produto com fluxo único guardar → publicar; variações de custo do PHC acima de [x]% ficam "por aprovar"; cancelar/devolver encomenda pede confirmação com motivo e valor.
- Canvas online (privado, partilhar pelo menu Share): https://claude.ai/artifact/Vi61zk6137BkzVVcppTCc6 — cópia do código em `docs/wireframes/`.

Mockup final (detalhe em `docs/mockup/README.md`; canvas https://claude.ai/artifact/Lr38BFXy4aW4uXqiTbG64a, privado):

- **Fotografias reais** da galeria do site atual (habinox.pt, 2010–2015): portões, escadas, hotte, soldadura, oficina, fachada. Antigas e de baixa resolução; não há guardas, chaminés, caixas de correio nem foto atual do escritório.
- **Textos e contactos reais** do site atual (desde 2005, equipamento, telefones 253 873 429 / 969 413 616, GPS); sem marcadores.
- **Configurador com preço ao vivo** no modelo do Bruno, com valores **de exemplo** (4 000 × 1 600 mm, ferro lacado → 2 786,43 €); mostra o pagamento 50/50 acima de 1 000 €; enchimento barras/chapa.
- **Modo claro e escuro.** Escuro = regra 60/30/10 pedida pelo Bruno: 60% grafite `#1F2225`, 30% aço claro `#E3E6E9`, 10% azul só dentro do aço (sobre o grafite o azul fica a 1,37:1). Logótipo branco no escuro. Se for adotado, atualizar `DESIGN.md` e `globals.css` (tema escuro).
- Feito com a skill impeccable (modo polish; o launcher não correu por descarregar um binário — lido o `DESIGN.md` diretamente) e duas rondas de verificação local a 1440 e 390 px.

### Verificado manualmente

- Sem sessão: `/pt/conta` e `/admin` → 307 para `/pt/entrar?next=…`.
- Login antes de verificar email → `EMAIL_NOT_VERIFIED` (e reenvia o link).
- Link de verificação → inicia sessão e redireciona para `/pt/conta`.
- Cliente autenticado em `/admin` → **404** (não revela o backoffice).
- Admin do seed entra e vê `/admin`.
- Link de recuperação é de uso único (2.ª vez → `INVALID_TOKEN`); email inexistente dá a mesma resposta que um existente.

### Testes

- **Unitários (Vitest, 23):** validação de env, autenticação do cron, registo de jobs (incl. chaves do protótipo), `safeNextPath` (open redirects).
- **E2E (Playwright, 4):** redirecionamento `/` → `/pt`; `/pt/conta` sem sessão → login; credenciais erradas; login do admin até ao backoffice.
- **CI:** formatação → lint → tipos → migrações em falta (`db:check` + `db:generate` sem diff) → migrar + seed → unitários → build → e2e. Postgres como service container.

---

## 3. Stack e versões instaladas

| Área              | Escolha                                                                | Versão                                      |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Framework         | Next.js (App Router, Turbopack)                                        | 16.3.8                                      |
| UI                | React / Tailwind / shadcn/ui (Radix, preset Nova)                      | 19.2 / 4.3 / shadcn 4.21                    |
| i18n              | next-intl                                                              | 4.14                                        |
| BD                | PostgreSQL (local Docker; prod Neon) + Drizzle ORM + driver `postgres` | PG 17 / drizzle-orm 0.45 / drizzle-kit 0.31 |
| Auth              | Better Auth (adaptador Drizzle)                                        | 1.7.7                                       |
| Validação         | Zod                                                                    | 4.6                                         |
| Email             | Resend                                                                 | 6.32                                        |
| Erros             | Sentry (`@sentry/nextjs`)                                              | 11.4                                        |
| Testes            | Vitest / Playwright                                                    | 5.0 / 1.63                                  |
| Scripts TS        | tsx                                                                    | 4.23                                        |
| Runtime / pacotes | Node / pnpm                                                            | 24 / 12.9                                   |

Infra planeada (ainda não criada): **Vercel** (app + Cron), **Neon** (Postgres, branch por preview), **Cloudflare R2** (GLB, imagens, ficheiros técnicos), **Resend**, **Sentry**.

---

## 4. Como está feito — estrutura e convenções

```
src/
  app/
    [locale]/layout.tsx           root layout da loja (html/body, NextIntlClientProvider, header)
    [locale]/(loja)/page.tsx      home placeholder
    [locale]/(conta)/             entrar, registo, recuperar-password, nova-password, conta
    admin/layout.tsx              root layout do backoffice (só PT); chama requireAdmin()
    admin/page.tsx                painel placeholder; chama requireAdmin()
    api/auth/[...all]/route.ts    handler do Better Auth
    api/cron/[job]/route.ts       jobs agendados (Bearer CRON_SECRET)
  components/ui/                  shadcn (button, input, label, card, alert)
  components/auth/                AuthCard, Field, FormMessage, useAuthErrorMessage
  db/client.ts                    ligação Drizzle (singleton em dev, prepare:false)
  db/schema/                      auth.ts (gerado + ajustado), settings.ts, index.ts
  db/migrations/                  SQL versionado (drizzle-kit)
  env.ts                          validação Zod de TODAS as env vars do servidor
  i18n/                           routing.ts, request.ts, navigation.ts
  lib/                            log, safe-redirect, auth-client, sentry-options, fonts (Archivo + Plex), utils
  server/auth/                    auth.ts (config Better Auth), session.ts, roles.ts
  server/email/                   send.ts (Resend ou log em dev), templates.ts
  server/jobs/                    registry.ts, cron-auth.ts
  proxy.ts                        (ex-middleware no Next 16) next-intl + verificação otimista de sessão
  instrumentation*.ts, sentry.*.config.ts
DESIGN.md                         identidade visual (fonte da verdade; importado pelo CLAUDE.md)
docs/estado.md, docs/fase-0.md, docs/revisao-wireframes.md
docs/wireframes/                  14 ecrãs .dc.html + canvas.json + README
docs/design/                      mockup de referência da home (fora do Prettier)
docs/mockup/                      mockup v1 (recusado): 8 ecrãs .dc.html (claro/escuro, desktop/telemóvel) + img/ + README (fora do Prettier)
docs/mockup-v2/                   mockup v2 (aprovado): 5 ecrãs .dc.html (loja, categoria, configurador, 3D, telemóvel) + img/ + README (fora do Prettier)
public/brand/                     logótipo em SVG (completo, sem slogan, símbolo, branco)
messages/pt.json                  textos da loja (namespaces Metadata, Nav, Home, Account, Auth)
scripts/seed.ts                   cria/promove admin (idempotente)
tests/unit, tests/e2e
docker-compose.yml, docker/postgres-init/   Postgres local + BD abinox_test
```

### Convenções e decisões de implementação (importantes)

- **Next 16 mudou muito.** Ler `node_modules/next/dist/docs/` antes de usar APIs (ver `AGENTS.md`). Ex.: `middleware.ts` → `proxy.ts`; `PageProps<"/rota">`, `LayoutProps<…>` e `RouteContext<…>` são globais gerados por `next typegen` (por isso `pnpm typecheck` corre `next typegen` primeiro).
- **Dois root layouts** (`[locale]/layout.tsx` e `admin/layout.tsx`), cada um com `<html>`; não existe `app/layout.tsx`.
- **Env:** tudo passa por `src/env.ts`. Nova variável → acrescentar ao schema **e** ao `.env.example` (e ao `vitest.config.ts`/CI se for obrigatória). Fora de `development`, `RESEND_API_KEY` é obrigatória (para links de verificação nunca irem para logs).
- **Auth:**
  - O `proxy.ts` só verifica se existe cookie (otimista). A verificação real é **sempre** no servidor: `requireUser()` / `requireAdmin()` em `src/server/auth/session.ts`. **Cada página, server action e route handler do backoffice tem de chamar `requireAdmin()`** — o layout sozinho não chega.
  - Não-admin em `/admin` → `notFound()` (404).
  - `role` (`cliente|pro|admin`) é `additionalField` com `input: false`: nunca vem do cliente. Contas Pro/admin atribuem-se no backoffice ou no seed.
  - IDs em UUID (`advanced.database.generateId: "uuid"`).
  - Rate limit com `storage: "database"` (tabela `rate_limit`); por omissão o Better Auth só o liga em produção.
  - Parâmetro `next` do login validado por `safeNextPath()` (só caminhos relativos).
- **Schema do Better Auth** (`src/db/schema/auth.ts`) foi gerado com `pnpm dlx auth@1.7.7 generate --config src/server/auth/auth.ts --output src/db/schema/auth.ts` e **ajustado à mão: todas as datas em `timestamptz`**. Se regenerar, reaplicar (senão as datas ficam desfasadas fora de UTC). A CLI antiga `@better-auth/cli` está desatualizada; usar o pacote `auth`.
- **BD:** dinheiro em cêntimos (integer) quando existir; `settings` guarda parâmetros de negócio (jsonb). Migrações sempre com `db:generate` + `db:migrate` (nunca `push` fora de local). `drizzle.config.ts` carrega `.env.local` sozinho.
- **Sentry 11:** o `sendDefaultPii` deixou de existir; usa-se `dataCollection` (tudo desligado em `src/lib/sentry-options.ts`, por RGPD). `withSentryConfig` importa-se de `@sentry/nextjs/config`. Sem `NEXT_PUBLIC_SENTRY_DSN` fica desligado.
- **pnpm 12** exige aprovar scripts de build de dependências. Os que não são precisos estão em `pnpm-workspace.yaml` com `false` (sharp, unrs-resolver, @parcel/watcher, @swc/core, esbuild). Se um `pnpm add` falhar com `ERR_PNPM_IGNORED_BUILDS`, decidir e acrescentar lá.
- **shadcn:** `pnpm dlx shadcn@latest add <componente>`. O pacote `cn` é o utilitário oficial do shadcn (substitui clsx + tailwind-merge).
- **Identidade visual:** o `DESIGN.md` é a fonte da verdade (ganha aos wireframes, que valem pela estrutura e fluxos). Cores só por tokens (`--color-ink`, `steel`, `canvas`, `line-strong`, `brand`, …) em `src/app/globals.css`; **nada de hex soltos** nos componentes. Variáveis do shadcn mapeadas para a paleta, `--radius: 0.125rem` (2px), sem sombras. Acento (`brand`, `#2005A2`, azul do logótipo) raro: 2–3 vezes por ecrã.
- **Fontes:** `src/lib/fonts.ts` (`next/font/google`) — Archivo (`--font-heading`, títulos e preços), IBM Plex Sans (`--font-sans`, corpo) e IBM Plex Mono (`--font-mono`, medidas, códigos, numeração). `fontVariables` é usado nos dois root layouts.
- **Números:** sempre `Intl.NumberFormat('pt-PT', { useGrouping: 'always' })` ("3 500"); nunca formatação à mão.
- **i18n:** textos da loja em `messages/pt.json`; usar `Link`/`redirect` de `@/i18n/navigation` nas páginas com locale. Backoffice com texto direto em PT.
- **Logs:** `log.child({ jobId })` / `{ correlationId }`; uma linha JSON por evento.
- **Emails em dev:** sem `RESEND_API_KEY` aparecem no terminal do `pnpm dev` como `email.dev`, com o link.
- **Skills do agente** (instaladas no projeto em `.agents/skills/`, atalhos em `.claude/skills/`, versões em `skills-lock.json`; também instaladas globalmente no PC principal). Atualizar com `npx skills update`. `.agents/` está fora do Prettier.
  - Pesquisa: `find-skills`.
  - Backend: `better-auth-best-practices`, `better-auth-security-best-practices`, `neon-postgres`, `vitest`, `resend`.
  - Frontend: `web-design-guidelines`, `impeccable` (inclui a antiga `audit`), `emil-design-eng`, `tailwind-design-system`, `web-perf`, `design-taste-frontend` (leonxlnx/taste-skill, 2026-10-22; o `scripts/assets.mjs` descarrega imagens de bancos externos — pedir autorização antes de o correr; o `DESIGN.md` prevalece sobre as direções que ela sugere).
  - Em conflito, o `CLAUDE.md` prevalece (ex.: a skill do Better Auth sugere `drizzle-kit push`; aqui só `generate` + `migrate`). Comandos `npx impeccable …` e o launcher da `impeccable` descarregam um binário/pacote: pedir autorização antes (na revisão de 2026-10-09 o detetor **não correu**; a revisão foi feita lendo o código).
  - Noutro PC, para as ter em todos os projetos: `npx skills add <owner/repo@skill> -g -y` (lista em `skills-lock.json`).
- **Commits:** em português, um por passo lógico, autor "Rodrigo Correia".

---

## 5. Arrancar noutro PC

Pré-requisitos: Node 24 (nvm), Docker (no Windows: Docker Desktop com _WSL Integration_ ativa), git, `gh` (opcional, para ver o CI).

> **Windows:** trabalhar **dentro do WSL** (ex.: `~/dev/HabiNox`), nunca em `/mnt/c/...` — lá o Next/pnpm fica muito lento e o hot reload falha.

```bash
git clone https://github.com/RodrigoCorreia23/Habinox.git ~/dev/HabiNox
cd ~/dev/HabiNox
nvm install && nvm use
npm i -g pnpm@12          # o corepack falhou com o pnpm 12 nesta máquina
pnpm install
pnpm exec playwright install chromium

cp .env.example .env.local
# Preencher em .env.local:
#   BETTER_AUTH_SECRET=$(openssl rand -hex 32)
#   CRON_SECRET=$(openssl rand -hex 32)
#   SEED_ADMIN_EMAIL=admin@habinox.local
#   SEED_ADMIN_PASSWORD=<mín. 10 caracteres>
#   (DATABASE_URL e BETTER_AUTH_URL já vêm com os valores locais)

pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev                  # http://localhost:3000 → /pt ; backoffice em /admin
```

Verificação completa (igual ao CI): `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`.

Notas:

- O Postgres do projeto usa a porta **5433** (a 5432 pode estar ocupada por um Postgres nativo).
- Os e2e correm na porta 3000 (tem de coincidir com `BETTER_AUTH_URL`); parar o `pnpm dev` antes ou deixá-lo a correr (é reaproveitado).
- Para fazer push de alterações a `.github/workflows/` o token do GitHub precisa do scope `workflow`: `gh auth refresh -h github.com -s workflow && gh auth setup-git`.
- Os segredos **não estão no git**. O `.env.local` é gerado de novo em cada máquina.

---

## 6. O que falta

### Passo 7 do esqueleto — deploy (bloqueado pelo cliente)

- Contas **Vercel** e **Neon** em nome da Habinox, com o Rodrigo como membro/admin. Domínio e DNS por decidir.
- Ligar Neon ↔ Vercel (branch de BD por preview). Ramos git: `main` → produção, `staging` → staging.
- Build de staging/prod: `pnpm db:migrate && next build`.
- **Resend** com domínio verificado (obrigatório fora de dev). **Sentry** opcional por agora.
- Configurar `trustedOrigins` do Better Auth para os URLs de preview da Vercel.
- `vercel.json` com crons só quando existir o primeiro job real (sync PHC).

### Fase 0 (próximo trabalho real; não depende do deploy)

- **Ver `docs/fase-0.md`**: decisões já tomadas, perguntas para o Bruno (blocos A–J, perguntas 1–50) e checklist de entregáveis.
- **Respostas do Bruno (2026-10-14)** registadas em `docs/fase-0.md`; 4 orçamentos reais analisados em `docs/orcamentos-analise.md` (chaminé, escada, 2 guardas → passam a ser os produtos-piloto). Os Excel estão com o Rodrigo, fora do git.
- **Email enviado ao Bruno (2026-10-22); resposta a 2026-10-26**, completada por decisões do Rodrigo (tudo em `docs/fase-0.md`):
  - preço no formato do Excel: componentes ao metro linear, m² ou unidade; é o **Bruno que define linhas, quantidades e valores ao criar cada produto** no backoffice (já não se pedem medidas nem composições);
  - consumíveis em % e margem **por produto**;
  - pagamento: **acima de 1 000 € com IVA → 50% na adjudicação + 50% no despacho**; até 1 000 € → total (substitui os 40/60 de 14/10);
  - **preços sempre mostrados com IVA**; IVA calculado uma vez sobre o total; **sem arredondamentos**;
  - instalação à parte;
  - transporte por **m³ × km**, com valores definidos pelo Bruno no backoffice; a distância recomendada = códigos postais com coordenadas × fator de estrada (decidir na fase 1B);
  - capacidade de produção: basta o campo no backoffice (simular com valores de exemplo);
  - logótipo só existe em JPEG → redesenhar em SVG e validar com o Bruno.
- Erros nas folhas Excel do Bruno (soma que ignora a linha 10, títulos "15%"/"5 sectores" que não batem) **não** foram incluídos no email; estão em `docs/orcamentos-analise.md`.
- ✅ Fatura dos **50% da fase 0** enviada para `geral@habinox.pt` (2026-10-22). ⏳ **Contrato por assinar** (vai ser assinado pessoalmente).
- Falta contactar o privado que aloja o site atual (bloco H: domínio, DNS, email, conteúdo).
- Wireframes feitos (14 ecrãs, todos ligados entre si): home, categoria, configurador, carrinho, checkout, confirmação, área de cliente; backoffice de produto/opções, fórmula de preço, encomendas, materiais/sincronização PHC — ver `docs/wireframes/README.md` (canvas online + cópia do código). Direção visual "ficha de fabrico" com desenho cotado do portão.
- Revisão dos wireframes com `impeccable` + `web-design-guidelines` feita e P1 corrigidos (ver `docs/revisao-wireframes.md`); 3 ecrãs de telemóvel acrescentados (14 no total). Perguntas novas 40–50 na `docs/fase-0.md`.
- **Segunda revisão, com a skill taste (2026-10-22):** `docs/revisao-taste.md`. Os wireframes foram renderizados localmente com o runtime do canvas (`artifact-type/dc-runtime.js` do artifact, servido como `support.js`) e medidos com o `inspect.mjs` da skill (`CHROME_PATH` = Chromium do Playwright). P1 e P2 corrigidos; as regras da skill que contrariam o `DESIGN.md` (mono, linhas finas, numeração, 3 fontes, corpo a 15 px) foram ignoradas de propósito. P3: o logótipo em vetor está feito (2026-10-26); fotografias de obras usadas no mockup a partir do site atual — faltam fotos recentes do Bruno.
- **Cópias de telemóvel** (`Mobile-*.dc.html`) são geradas a partir dos ecrãs de desktop: só mudam o `<title>` e o `$preview` (390 px). Ao alterar um ecrã de desktop, regenerar a cópia.
- **Identidade visual fechada:** `DESIGN.md` (catálogo técnico) + mockup de referência em `docs/design/Loja_Pagina_Inicial_mockup.html`. Tokens aplicados em `src/app/globals.css` e fontes em `src/lib/fonts.ts` (Archivo, IBM Plex Sans, IBM Plex Mono). Ajustes de contraste: `line-strong #85827A` para bordas de campos. Acento = azul do logótipo `#2005A2` (2026-10-22, substituiu o laranja `#B8461A` do mockup). Os 14 wireframes já seguem a nova identidade.
- **Decisões técnicas da revisão:** números com `Intl.NumberFormat('pt-PT', { useGrouping: 'always' })`; tokens de design em variáveis CSS; linhas de fórmula com artigo PHC por material (decidido: `formula_line_materials`, já no `CLAUDE.md`).
- **Nomes técnicos internos** (`abinox` na BD, utilizador do Postgres, `package.json`, CI) ficaram de propósito com o nome antigo: invisíveis e mudá-los obriga a recriar a BD local. Mudar só se houver motivo.
- **Mockup v2 aprovado (2026-10-27)** — ver secção 2 e `docs/mockup-v2/README.md`. Por fazer:
  - **Tokens da loja escura** em `src/app/globals.css` (`ground`, `surface`, `line-strong`, `amber`, …) e fonte Archivo com eixo de largura em `src/lib/fonts.ts`; o tema atual é o claro (fica para o backoffice). Fazer no início da UI da fase 1.
  - **Fotografias recentes das obras**, alta resolução, ao fim do dia, de todas as famílias (faltam guardas, chaminés, caixas de correio).
  - **GLB de teste** (um portão de correr, um de batente) para confirmar peças separadas e nomes.
  - **"Abrir o portão" no 3D:** não está escrito no âmbito da fase 1 (≈ 8–15 h). Decidir com o Bruno: fase 1 ou fase 8.
  - Os wireframes continuam na direção v1; valem pela estrutura e fluxos. Telemóvel da categoria, do configurador e do 3D por desenhar.
- **Mockup v1 (2026-10-26, recusado):** ver `docs/mockup/README.md`. Email ao Bruno escrito (informal: mockup em anexo em HTML, modo claro e escuro e telemóvel; falta fotos melhores e modelos 3D; pedir foto atual do escritório). O Rodrigo envia o HTML. **Aguarda:** opinião do Bruno, escolha do modo por omissão, validação do logótipo e das cores, fotografias recentes.
- **Bug do runtime do canvas:** texto interpolado (`{{…}}`) dentro de `<text>` SVG não aparece (o runtime embrulha-o num `<span>`). No mockup as cotas são HTML sobre o SVG; o configurador dos wireframes (`docs/wireframes/Main.dc.html`) **ainda não mostra as cotas** — corrigir.
- Por fazer do nosso lado: validar os wireframes com o Bruno (o canvas está **privado**: partilhar pelo botão Share antes de enviar o link); fechar o modelo de opções reutilizáveis com produtos reais; preencher nos wireframes os marcadores `[MARCA]`, `[PREÇO]`, `[MORADA]`, `[TELEFONE]`, `[EMAIL]` e os `[x]%` / `[a definir com a Habinox]` dos wireframes.
- **P2 da revisão por fazer** (na implementação): dicionário único de estados da encomenda (rótulo cliente + interno); "Removido. Desfazer" no carrinho e nas linhas da fórmula; separadores/filtros com `tablist`/radio e estado no URL; pesquisa e ordenação em Encomendas e Materiais; ajuda de sintaxe junto às expressões das fórmulas.
- Ideias a discutir com o Bruno: ficha de fabrico "assinada" em PDF na encomenda; medição no local com preço descontado; etiquetas tipo carimbo.

### Fase 1 (depois da fase 0), pela ordem do CLAUDE.md

1. `lib/money` + `lib/pricing` (puro, sem BD) com testes — **antes de qualquer UI**. Fórmulas por linhas de custo, versionadas, parser seguro (nunca `eval`).
2. Schema (opções, regras e fórmulas segundo `docs/modelo-opcoes.md`): `materials`, `material_costs`, `categories`, `products`, `option_definitions`, `option_values`, `product_versions`, `product_options`, `product_option_values`, `option_rules`, `formula_variables`, `formula_lines`, `formula_line_materials`, `components`, sectores/taxas horárias, zonas (instalação e transporte), `finishes`, `quotes`, `orders`, `order_items`, `payments`, `webhook_events`, `discount_groups`, `consents`, … (ver secção 4 do CLAUDE.md).
3. Catálogo, configurador, carrinho, pedido; backoffice (shadcn + TanStack Table).
4. Sincronização PHC: interface `PhcClient` + adaptador fake primeiro; real quando houver AppID/token.
5. RGPD: tabela `consents` e checkbox de termos/privacidade no registo (ainda **não** existe); apagamento de conta no backoffice; cookies.
6. Visualizador GLB (react-three-fiber), SEO básico, templates HTML de email.

### Pequenas pendências técnicas

- `NextIntlClientProvider` envia todas as mensagens para o cliente; filtrar por namespace quando o ficheiro crescer.
- Emails só em texto simples; falta template HTML com a marca.
- Sem página de erro/404 personalizada.
- O build descarrega as fontes do Google (`next/font/google`); a 2026-10-09 o CI falhou uma vez a obter a IBM Plex Sans e passou ao repetir. Se voltar a acontecer (ou na Vercel), passar a fontes locais (`next/font/local` com os ficheiros no repositório).
- Página `/admin` não tem login próprio: usa `/pt/entrar?next=/admin`.

---

## 7. Por confirmar com o cliente

Ver secção 8 do `CLAUDE.md`. Além disso:

- Titularidade das contas: **decidido — ficam em nome da Habinox** (Vercel, Neon, Sentry, Resend). Falta criá-las.
- Domínio: **`habinox.pt`** (site atual em WordPress, email `geral@habinox.pt` no mesmo domínio). Falta saber quem gere o DNS e se a loja fica no domínio principal ou num subdomínio.
