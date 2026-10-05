# Abinox — Plataforma digital de vendas

Contexto, decisões e regras do projeto: ver [`CLAUDE.md`](./CLAUDE.md).

## Arranque local

```bash
nvm use            # Node 24 (ver .nvmrc)
pnpm install
cp .env.example .env.local   # preencher segredos (openssl rand -hex 32)
pnpm db:up                   # Postgres em Docker (porta 5433)
pnpm db:migrate
pnpm db:seed                 # cria o admin de SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD
pnpm dev
```

## Scripts

| Script           | O que faz                     |
| ---------------- | ----------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento   |
| `pnpm build`     | Build de produção             |
| `pnpm lint`      | ESLint                        |
| `pnpm typecheck` | Verificação de tipos          |
| `pnpm format`    | Formata o código com Prettier |

## Emails em desenvolvimento

Sem `RESEND_API_KEY`, os emails (verificação de conta, recuperação de password) não são enviados: aparecem no log do `pnpm dev` como `email.dev`, com o link para copiar.
