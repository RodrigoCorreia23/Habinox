# Estado do projeto — passagem de contexto

> Documento vivo. **Atualizar no fim de cada sessão de trabalho** (secções 2, 6 e 7).
> O `CLAUDE.md` tem o contexto de negócio, as decisões e as regras; este ficheiro tem
> **o que já está feito, como está feito e o que falta**. Última atualização: 2026-10-09.

---

## 1. Resumo rápido

- **Fase atual:** esqueleto técnico feito (passos 1–6 de 7). Falta o deploy (passo 7) e a **fase 0** (fórmulas reais de produtos-piloto).
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
  lib/                            log, safe-redirect, auth-client, sentry-options, fonts, utils
  server/auth/                    auth.ts (config Better Auth), session.ts, roles.ts
  server/email/                   send.ts (Resend ou log em dev), templates.ts
  server/jobs/                    registry.ts, cron-auth.ts
  proxy.ts                        (ex-middleware no Next 16) next-intl + verificação otimista de sessão
  instrumentation*.ts, sentry.*.config.ts
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
- **Fonte:** Geist com variável `--font-sans` (o tema shadcn espera esse nome).
- **i18n:** textos da loja em `messages/pt.json`; usar `Link`/`redirect` de `@/i18n/navigation` nas páginas com locale. Backoffice com texto direto em PT.
- **Logs:** `log.child({ jobId })` / `{ correlationId }`; uma linha JSON por evento.
- **Emails em dev:** sem `RESEND_API_KEY` aparecem no terminal do `pnpm dev` como `email.dev`, com o link.
- **Skills do agente** (instaladas no projeto em `.agents/skills/`, atalhos em `.claude/skills/`, versões em `skills-lock.json`; também instaladas globalmente no PC principal). Atualizar com `npx skills update`. `.agents/` está fora do Prettier.
  - Pesquisa: `find-skills`.
  - Backend: `better-auth-best-practices`, `better-auth-security-best-practices`, `neon-postgres`, `vitest`, `resend`.
  - Frontend: `web-design-guidelines`, `impeccable` (inclui a antiga `audit`), `emil-design-eng`, `tailwind-design-system`, `web-perf`.
  - Em conflito, o `CLAUDE.md` prevalece (ex.: a skill do Better Auth sugere `drizzle-kit push`; aqui só `generate` + `migrate`). Comandos `npx impeccable …` descarregam um pacote npm: pedir autorização antes.
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
#   SEED_ADMIN_EMAIL=admin@abinox.local
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

- Contas **Vercel** e **Neon** em nome da Abinox, com o Rodrigo como membro/admin. Domínio e DNS por decidir.
- Ligar Neon ↔ Vercel (branch de BD por preview). Ramos git: `main` → produção, `staging` → staging.
- Build de staging/prod: `pnpm db:migrate && next build`.
- **Resend** com domínio verificado (obrigatório fora de dev). **Sentry** opcional por agora.
- Configurar `trustedOrigins` do Better Auth para os URLs de preview da Vercel.
- `vercel.json` com crons só quando existir o primeiro job real (sync PHC).

### Fase 0 (próximo trabalho real; não depende do deploy)

- **Ver `docs/fase-0.md`**: decisões já tomadas, perguntas para o Bruno (blocos A–I) e checklist de entregáveis.
- Em curso: o Rodrigo vai reunir com o Bruno (blocos A–C: produtos, preço, responsabilidade/instalação) e contactar o privado que aloja o site atual (bloco H: domínio, DNS, email, conteúdo).
- Wireframes feitos (11 ecrãs, todos ligados entre si): home, categoria, configurador, carrinho, checkout, confirmação, área de cliente; backoffice de produto/opções, fórmula de preço, encomendas, materiais/sincronização PHC — ver `docs/wireframes/README.md` (canvas online + cópia do código). Direção visual "ficha de fabrico" com desenho cotado do portão.
- Revisão dos wireframes com `impeccable` + `web-design-guidelines` feita e P1 corrigidos (ver `docs/revisao-wireframes.md`); 3 ecrãs de telemóvel acrescentados (14 no total). Perguntas novas 40–50 na `docs/fase-0.md`.
- **Identidade visual fechada:** `DESIGN.md` (catálogo técnico) + mockup de referência em `docs/design/Loja_Pagina_Inicial_mockup.html`. Tokens aplicados em `src/app/globals.css` e fontes em `src/lib/fonts.ts` (Archivo, IBM Plex Sans, IBM Plex Mono). Ajustes de contraste: `line-strong #85827A` para bordas de campos e `accent-text #A83F17` para cotas sobre `surface-alt`. Os wireframes ainda têm o aspeto antigo.
- **Decisões técnicas da revisão:** números com `Intl.NumberFormat('pt-PT', { useGrouping: 'always' })`; tokens de design em variáveis CSS; linhas de fórmula com artigo PHC por material (rever modelo antes de `lib/pricing`).
- Por fazer do nosso lado: validar os wireframes com o Bruno (partilhar o canvas); fechar o modelo de opções reutilizáveis com produtos reais; mockup final com o logótipo.

### Fase 1 (depois da fase 0), pela ordem do CLAUDE.md

1. `lib/money` + `lib/pricing` (puro, sem BD) com testes — **antes de qualquer UI**. Fórmulas por linhas de custo, versionadas, parser seguro (nunca `eval`).
2. Schema: `materials`, `material_costs`, `categories`, `products`, `product_options`, `formula_versions`, `formula_lines`, `finishes`, `quotes`, `orders`, `order_items`, `payments`, `webhook_events`, `discount_groups`, `consents`, … (ver secção 4 do CLAUDE.md).
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

- Titularidade das contas: **decidido — ficam em nome da Abinox** (Vercel, Neon, Sentry, Resend). Falta criá-las.
- Domínio do beta e quem gere o DNS.
