# Abinox — Plataforma digital de vendas

Contexto, decisões e regras do projeto: ver [`CLAUDE.md`](./CLAUDE.md).

## Arranque local

```bash
nvm use            # Node 24 (ver .nvmrc)
pnpm install
cp .env.example .env.local
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
