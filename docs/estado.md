# Estado do projeto — passagem de contexto

> Documento vivo. **Atualizar no fim de cada sessão de trabalho** (secções 2, 6 e 7).
> O `CLAUDE.md` tem o contexto de negócio, as decisões e as regras; este ficheiro tem
> **o que já está feito, como está feito e o que falta**. Última atualização: 2026-11-04.

---

## 1. Resumo rápido (ler isto primeiro)

> Atualizado a **2026-11-04**, no fim de uma sessão longa em que se fez quase toda a fase 1.
> O detalhe de cada peça está na secção 6 ("Fase 1"); o histórico em `git log`.

### Onde estamos

- **Fase 1 em curso e bem avançada.** A reunião de 30/10 com o Bruno fechou as decisões (`docs/reuniao-2026-10-30.md`) e a fase 1 arrancou a 2026-11-04. O fluxo completo já funciona localmente, **de ponta a ponta**:
  **backoffice** (materiais do ERP → margens → mão de obra → opções e regras → categorias → produto com fórmula → validar → publicar) → **loja** (página inicial com a cena, categorias, configurador com preço ao vivo) → **carrinho** (orçamento guardado 30 dias) → **entrar** → **finalizar pedido** → **encomenda** (emails, estado, histórico) → **backoffice de encomendas** e **"As minhas encomendas"**.
- **Não há deploy.** Tudo corre só localmente (bloqueado pelas contas Vercel/Neon/Resend/R2 em nome da Habinox).
- **Ver a funcionar num PC novo:** seguir a secção 5, depois `pnpm db:demo` (carrega um portão de correr de demonstração) e abrir http://localhost:3000/pt. Entrar no backoffice (`/admin`) com o `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` do `.env.local`. `pnpm db:demo:clean` apaga a demonstração.
- **Cliente:** marca **HABINOX®** (não "Abinox"), Bruno Miguel Freitas, Lda, Núcleo Industrial de Antas, 4740-016 Antas, **Esposende**. Domínio `habinox.pt`, email `geral@habinox.pt`.
- **Repositório:** `github.com/RodrigoCorreia23/Habinox`, ramo `main`, CI verde (formatação, lint, tipos, migrações, 216 testes unitários, build, 6 e2e).

### Decisões que mudaram desde o plano original (já no `CLAUDE.md`)

- **ERP = Odoo** (Odoo Online, API JSON-2, só no plano Custom), não PHC GO. O Bruno regista os artigos; não há dados de teste. Lista de campos para ele: `docs/odoo-artigos.md`.
- **Sem produtos-piloto:** o Bruno cria tudo de raiz no backoffice.
- **Margem sobre o custo, por item:** `preço = custo × (1 + margem)`; cada material, componente e sector tem a sua; `null` = por decidir e bloqueia a publicação. Componentes (motores…) são artigos do ERP.
- **Línguas:** BD com texto por língua (`jsonb`, `src/lib/localized.ts`); lançamento só em PT; 7 línguas no fim (PT, EN, DE, FR, IT, ES, NL), traduzidas pelo Rodrigo.
- **Página inicial na fase 1, sem acréscimo**, igual ao artefacto/protótipo (`docs/site-inicial/`).

### Fase 1 — ponto de situação

| Área                                                                                                                                                                                 | Estado                                                    | Onde                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| Dinheiro, IVA, percentagens                                                                                                                                                          | ✅                                                        | `src/lib/money/`, `src/lib/percent.ts`               |
| Motor de preços (expressões sem `eval`, variáveis, linhas, margem por item, consumíveis)                                                                                             | ✅                                                        | `src/lib/pricing/`                                   |
| Opções e regras (`restrict`/`hide`/`require`/`forbid`, ordem)                                                                                                                        | ✅                                                        | `src/lib/options/`                                   |
| Schema e migrações (catálogo, ERP, orçamentos, carrinho, encomendas, consentimentos)                                                                                                 | ✅                                                        | `src/db/schema/`, migrações `0000`–`0005`            |
| Sincronização do ERP (cópia local, histórico, desaparecidos)                                                                                                                         | 🟡 só com o adaptador **fake**                            | `src/server/sync/odoo/`                              |
| Backoffice: materiais e margens, mão de obra, opções e regras da biblioteca, categorias, produtos (opções, regras, fórmula, preço de exemplo, validar/publicar, versões), encomendas | ✅                                                        | `src/app/admin/`                                     |
| Página inicial (cena da casa: loja ↔ apresentação ↔ entrar, como o artefacto)                                                                                                        | ✅                                                        | `src/app/[locale]/(inicio)/`                         |
| Loja: categoria, configurador com preço ao vivo (custos nunca saem do servidor)                                                                                                      | ✅                                                        | `src/app/[locale]/(loja)/loja/`, `src/server/store/` |
| Carrinho (cookie, orçamentos 30 dias, junta-se à conta ao entrar)                                                                                                                    | ✅                                                        | `src/server/store/cart*.ts`                          |
| Finalizar pedido, encomendas, máquina de estados, emails, "As minhas encomendas"                                                                                                     | ✅                                                        | `src/server/orders/`, `src/lib/orders/`              |
| Termos, privacidade, cookies                                                                                                                                                         | 🟡 rascunho para jurista; faltam NIPC, matrícula, capital | `src/content/legal/`                                 |
| Imagens (categorias, produtos) e R2                                                                                                                                                  | ⬜ fotografias **provisórias** do Unsplash nas categorias | `public/home/provisorio/`                            |
| Visualizador 3D (GLB do TopSolid)                                                                                                                                                    | ⬜ à espera dos GLB                                       | —                                                    |
| Adaptador Odoo real                                                                                                                                                                  | ⬜ à espera do plano Custom e dos artigos                 | —                                                    |
| Deploy (staging/produção), cron diário do ERP                                                                                                                                        | ⬜ à espera das contas                                    | —                                                    |
| Rate limiting das ações públicas, limpeza de carrinhos antigos, expirar encomendas                                                                                                   | ⬜                                                        | —                                                    |
| Páginas de registo/recuperar password no visual escuro, seletor de línguas, 404, emails em HTML                                                                                      | ⬜                                                        | —                                                    |

### Próximos passos sugeridos (por ordem)

1. **Envio de imagens no backoffice** (categorias e produtos), com tamanhos mínimos, recorte e ponto de foco (tabela na secção 6 › "Imagens e R2"); guardar localmente até haver R2.
2. **Rate limiting** de `quoteAction`, `addToCartAction` e do checkout (são públicos).
3. **Jobs do cron:** limpar carrinhos antigos; expirar encomendas não pagas (prazo a perguntar ao Bruno); `vercel.json` com o `odoo-sync` diário.
4. **Registo e recuperação de password** no visual da loja; página 404.
5. **Visualizador GLB** quando chegarem os ficheiros do TopSolid.
6. **Deploy** quando houver contas; depois o **adaptador Odoo real**.
7. Fase 1B (pagamentos) só depois de fechar a fase 1.

### À espera do Bruno

- Odoo: **plano Custom** (sem ele não há API) e os artigos registados conforme `docs/odoo-artigos.md`.
- **Contas** em nome da Habinox: Vercel, Neon, Resend, Cloudflare R2. DNS do `habinox.pt`.
- **Fotografias** das obras (tamanhos na secção 6) — ele arranja-as.
- **GLB** de teste exportados do TopSolid.
- **NIPC, conservatória/matrícula e capital social** (páginas legais); revisão dos textos legais por jurista.
- **Números** de clientes e toneladas da página inicial (retirados por serem provisórios).
- **Pendentes da reunião:** preço fixo por intervalo de medida; regra de transporte; prazo para expirar encomendas não pagas; diferença aceitável face a orçamentos reais antes de validar um produto.

### Regras de trabalho neste repositório

- Ler o `CLAUDE.md` (negócio, decisões, regras de código) e este ficheiro. Comunicar com o Rodrigo em **português de Portugal**.
- **Commits e push só quando o Rodrigo pedir.** Mensagens em português, um commit por passo lógico, autor **Rodrigo Correia** (`git -c user.name="Rodrigo Correia" commit …`; o git desta máquina pode estar com outro nome). **Nunca** acrescentar atribuição ao Claude (nem `Co-Authored-By`, nem "Generated with").
- Antes de cada commit: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (e `pnpm test:e2e` se mexer em páginas). Ensaiar no browser (Playwright) o que se muda na interface.
- Dados de ensaio criados para testar: **apagá-los** no fim (`pnpm db:demo:clean`), salvo se o Rodrigo os quiser ver.
- Os Excel dos orçamentos do Bruno **não entram no git** (nomes de clientes, custos internos).

### Armadilhas conhecidas (já resolvidas, não repetir)

- **Drizzle:** numa consulta sem join, as colunas dentro de subconsultas `sql` ficam sem o nome da tabela; usar consultas agrupadas à parte.
- **React 19:** `<form action>` limpa os campos depois de cada envio, mesmo com erro; no backoffice usar `submitKeepingValues` (`src/components/admin/`).
- **Preço no checkout:** a encomenda é recusada se o total não for o que o cliente viu no botão (um orçamento pode expirar entretanto).
- **drizzle-kit generate** pergunta (sem terminal interativo) quando se renomeia uma coluna: fazer em duas migrações (remover, depois acrescentar).
- **Next dev:** depois de mover rotas, apagar `.next/dev/types` se o typecheck se queixar de ficheiros que já não existem.

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

### Fase 0 — plano para a reunião presencial (2026-10-27)

- O Bruno pediu uma reunião presencial "para entender bem o que estás a desenvolver e outras questões de como vai funcionar".
- `docs/plano/Habinox-plano.pdf` (15 páginas, fonte em `docs/plano/plano.html`; gerado com o Chromium do Playwright, `--print-to-pdf`): resumo, percurso do cliente, painel de gestão, cálculo do preço com exemplo completo (valores inventados), o que mexe no preço, base de dados explicada por grupos, o que está feito, fases/horas/valores (valores por fase a 15 €/h = 7 800 € ÷ 520 h — confirmar com o contrato), fase 1 em detalhe, o que falta do Bruno, 14 pontos para decidir na reunião e forma de trabalho.

### Fase 0 — página inicial 3D com passagem contínua para a loja (2026-10-31)

- O Bruno gostou de uma página inicial 3D (escada em three.js, câmara por scroll; original em `Downloads/index.html`, cores noite `#0c1220` + dourado) e pediu mais fluidez, passagem entre páginas sem parecer mudança de página, as mesmas cores e um ambiente mais realista.
- **Protótipo em `docs/site-inicial/`** (online e privado: https://claude.ai/artifact/3P8GRmf4UieL9tQuqqRYDE; localmente, abrir o `index.html`): início e loja são estados da mesma página, a loja usa a mesma cena 3D como herói e a câmara viaja até lá (2,3 s, reversível a meio). Continuar a descer no fim do início também entra na loja. Entre ecrãs da loja, a fotografia transforma-se (View Transitions). Realismo: reflexo planar no pavimento, juntas no betão, degraus a acender, pó no ar, grão e vinheta, movimento com o rato; resolução adaptativa em máquinas lentas. A loja, os preços e as fotografias são de exemplo.
- **Categorias em duas linhas automáticas (pedido do Rodrigo):** a secção "Escolha o que quer fabricar" tem 12 categorias de exemplo em duas linhas que passam sozinhas, em sentidos opostos; param com o rato em cima, com o foco do teclado ou no botão Pausar. Sem animação (`prefers-reduced-motion` ou sem WebGL), deslizam à mão. Substitui, neste protótipo, o mosaico 8+4 / 4+4+4 do `DESIGN.md`: atualizar o documento se o Bruno aprovar. As 7 categorias novas e todos os preços são inventados.
- **Arrastar as categorias (pedido do Rodrigo):** cada linha arrasta-se para os dois lados com o rato ou o dedo, com inércia ao largar, e dá a volta sem fim; deixa de ser animação CSS e passa a ser um ciclo em JS. Um arrasto não abre a categoria; um clique simples abre.
- **Cenários 3D em vez de fotografias:** o Rodrigo não quis fotografias escurecidas. As 14 imagens de `docs/site-inicial/img/` são cenas renderizadas (`docs/site-inicial/cenarios/cenas.js` + `render.mjs`, com three.js no Chromium do Playwright): betão, luz quente de fim de dia, uma cena por categoria. São ilustrativas: não são produtos nem obras reais da Habinox. As 12 categorias e os preços continuam a ser de exemplo. A capa de Portões tem imagem panorâmica própria (`portoes-capa`), com o título sobre a imagem; uma imagem 4:3 cortada numa faixa larga fica ampliada e desfocada, por isso cada capa de categoria precisa de imagem panorâmica.
- **Abertura direta na loja (pedido do Rodrigo, 2026-10-31):** o site abre em "Metal feito à medida. Preço na hora.", com esta entrada: enquanto a cena carrega mostra só o nome HABINOX®; o nome desloca-se para o canto esquerdo e encaixa no logótipo do cabeçalho, os degraus acendem de baixo para cima e o título e o menu surgem durante esse acender (cerca de 3 s). A única animação nesse ecrã é o balanço lento da câmara à volta da escada (±4° em 14 s), que abranda ao fazer scroll e retoma quando a página para; sem parallax, pó nem grão a mexer. A apresentação da empresa passou para `#inicio` (link "Empresa" no menu); a viagem de câmara entre os dois mantém-se.
- **Escada mais real (pedido do Rodrigo):** chapa metálica com textura fina (a espessura falsa nos recortes foi retirada: fazia traços pretos), degraus e LED menos brilhantes (vê-se o veio) e sombra de contacto no chão.
- **Passagem do herói para as categorias:** a escada dissolve-se no fundo por gradiente, sem linha a separar as secções.
- **Logótipo num ecrã interior:** a fotografia de capa encolhe até à sua categoria (0,9 s) e a página fica nas categorias, com os cartões clicáveis durante a animação; um segundo clique no logótipo sobe ao topo.
- **Cabeçalho (pedido do Rodrigo):** à direita ficam o seletor de língua em dropdown (Português, Español, Français), Entrar e o carrinho (ícone, com número só quando há artigos), também em `#inicio`. As categorias e o link Empresa saíram do cabeçalho da loja: a empresa fica em "Sobre a Habinox", no rodapé. **Login (`#entrar`):** usa a mesma cena 3D; ao entrar, a câmara viaja para o outro lado da escada (2,3 s), os degraus baixam e voltam a acender de baixo para cima, o formulário surge à direita (em telemóvel, em baixo) e a câmara continua a rodar devagar (±10° em 26 s). No protótipo a língua só marca a escolha (não traduz) e o login é de exemplo, sem sessão; em produção ligam ao next-intl e ao Better Auth. Atualizar a secção Cabeçalho do `DESIGN.md` se o Bruno aprovar.
- **Página própria por categoria (pedido do Rodrigo):** as 12 categorias têm rota própria (`#escadas`, `#guardas`…), título e capa panorâmica em `img/capas/` (11 novas, geradas com `cenarios/render.mjs` a 2000×833; paredes de 3 cenas alargadas). A foto do cartão transforma-se na capa da categoria certa, e o logótipo devolve-a a esse cartão. Só as categorias de portões têm cartões que abrem o configurador (sempre o Linear); nas outras os modelos são de exemplo e não abrem nada. Nomes, modelos e preços inventados.
- **Vídeo renderizado em vez de three.js (pedido do Rodrigo, 2026-11-01: "uma escada real num ambiente real"):** a escada do protótipo foi posta numa casa em Blender/Cycles e o fundo passou a ser um leitor de imagens em canvas 2D (`#scene`), sem WebGL no navegador. Scripts em `docs/site-inicial/cenarios/casa/`: `assets.py` (descarrega do Poly Haven, CC0), `recortes.mjs` (máscaras das guardas), `casa.py` (cena), `render.sh` (retoma onde parou). Resultado em `img/casa/`: 160 imagens do percurso (`fNNN.jpg`) + 15 dos degraus a acender (`aNN.jpg`), 1440 × 810, 64 amostras, 26 MB, cerca de 2 h de render. É imagem de computador, não filmagem nem obra da Habinox; a paisagem de montanha não é de Esposende. Percurso fixo: sem câmara a seguir o rato nem vista de cima no início; os degraus só acendem na abertura da loja (no login já não). Em telemóvel a imagem é cortada à volta da escada e fica menos nítida. As 26 MB de imagens ainda não estão no git: decidir ao fazer commit. Isto substitui, neste protótipo, o reflexo planar, o pó, o grão e o movimento com o rato descritos acima.
- **Movimento parado como vídeo (pedido do Rodrigo, 2026-11-01):** a fusão de imagens a cerca de 4 por segundo deixava fantasmas. Na loja passa a tocar `img/casa/balanco.mp4` (`cenarios/casa/video.sh`: 66 posições renderizadas, interpolação com `minterpolate`, 24 s a 24 i/s, vaivém de ±3°, pinta no mesmo canvas); abranda ao fazer scroll e, nas viagens, volta às imagens a partir da mesma posição. No login a imagem fica parada.
- **Alta qualidade (pedido do Rodrigo, 2026-11-02):** `img/casa-hd/` tem as 175 imagens a 2560 × 1440 com 128 amostras (65 MB) e o `balanco.mp4` (12 MB, limite da publicação: 15 MB por ficheiro), gerados por `cenarios/casa/hd.sh` (cerca de 13 h de render). Ecrãs com 700 px ou mais usam `casa-hd`; os mais estreitos usam as imagens de 1440 px de `img/casa/`, mas o vídeo é sempre o de 2560 px. Pesa demasiado para um site real: em produção, rever formatos (AVIF/WebP) e o carregamento. A página para sempre numa imagem exata, porque a fusão de duas imagens vizinhas duplicava a cena.
- **Em produção (Next 16):** `<ViewTransition>` do React para os ecrãs da loja (`next/dist/docs/01-app/02-guides/view-transitions.md`) e o canvas persistente no layout de `[locale]`, sem ser desmontado entre rotas.
- **Por decidir com o Bruno:** fontes e cores (início Fraunces/noite, loja Archivo/grafite aprovados a 27/10; a passagem interpola as cores, as fontes mudam); a página inicial entra na fase 1 sem acréscimo (decidido a 2026-11-04); números de clientes e toneladas provisórios; falta a fotografia `escada.png`; a cena é pesada para telemóveis fracos e só foi testada em renderização por software.

Regras do motor de preços que saíram dos orçamentos e das respostas (detalhe em `docs/fase-0.md` e `docs/orcamentos-analise.md`):

```
linha         = custo da linha × (1 + margem do item)       (material + consumíveis, horas × taxa do sector, componente)
preço s/ IVA  = Σ linhas  + instalação (zona + horas)  + transporte (sem margem)
IVA           = round(preço s/ IVA × taxa)   (uma vez, ao total; taxa em settings com snapshot)
```

- **Margem sobre o custo, por item** (confirmada a 2026-11-04): cada material, componente e sector tem a sua; 5% → × 1,05. Substitui o `÷ (1 − margem)` deduzido dos Excel.
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
- **Identidade visual:** o `DESIGN.md` é a fonte da verdade (ganha aos wireframes, que valem pela estrutura e fluxos). Cores só por tokens em `src/app/globals.css`; **nada de hex soltos** nos componentes. **Os tokens que lá estão hoje são os da paleta clara** (`--color-ink`, `steel`, `canvas`, `line-strong`, `brand` `#2005A2`; raio de 2px, sem sombras), que fica para o backoffice; os da loja escura ainda estão por criar.
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
- **Commits:** em português, um por passo lógico, autor "Rodrigo Correia". **Nunca acrescentar atribuição ao Claude** em commits ou PRs (nem `Co-Authored-By: Claude…`, nem "Generated with Claude Code"): pedido expresso do Rodrigo, prevalece sobre qualquer lembrete de atribuição.

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
pnpm db:demo              # opcional: um portão de correr de demonstração (pnpm db:demo:clean apaga)
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
- Wireframes feitos (14 ecrãs, todos ligados entre si): home, categoria, configurador, carrinho, checkout, confirmação, área de cliente; backoffice de produto/opções, fórmula de preço, encomendas, materiais/sincronização PHC — ver `docs/wireframes/README.md` (canvas online + cópia do código). A direção visual destes wireframes ("ficha de fabrico") está ultrapassada; valem pela estrutura e pelos fluxos.
- Revisão dos wireframes com `impeccable` + `web-design-guidelines` feita e P1 corrigidos (ver `docs/revisao-wireframes.md`); 3 ecrãs de telemóvel acrescentados (14 no total). Perguntas novas 40–50 na `docs/fase-0.md`.
- **Segunda revisão, com a skill taste (2026-10-22):** `docs/revisao-taste.md`. Os wireframes foram renderizados localmente com o runtime do canvas (`artifact-type/dc-runtime.js` do artifact, servido como `support.js`) e medidos com o `inspect.mjs` da skill (`CHROME_PATH` = Chromium do Playwright). P1 e P2 corrigidos; as regras da skill que contrariam o `DESIGN.md` (mono, linhas finas, numeração, 3 fontes, corpo a 15 px) foram ignoradas de propósito. P3: o logótipo em vetor está feito (2026-10-26); fotografias de obras usadas no mockup a partir do site atual — faltam fotos recentes do Bruno.
- **Cópias de telemóvel** (`Mobile-*.dc.html`) são geradas a partir dos ecrãs de desktop: só mudam o `<title>` e o `$preview` (390 px). Ao alterar um ecrã de desktop, regenerar a cópia.
- **Identidade visual:** fechada pelo mockup v2 e pelo `DESIGN.md` (arquitetura moderna, escura, âmbar). A direção "catálogo técnico" (`docs/design/`, mockup v1, azul `#2005A2` como acento) foi **substituída na loja** a 2026-10-27; mantém-se só no backoffice e nos 14 wireframes, que ainda têm esse aspeto. Fontes em `src/lib/fonts.ts` (Archivo, IBM Plex Sans, IBM Plex Mono).
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
- Por fazer do nosso lado: validar os wireframes com o Bruno (o canvas está **privado**: partilhar pelo botão Share antes de enviar o link); preencher nos wireframes os marcadores `[MARCA]`, `[PREÇO]`, `[MORADA]`, `[TELEFONE]`, `[EMAIL]` e os `[x]%` / `[a definir com a Habinox]` dos wireframes.
- **P2 da revisão por fazer** (na implementação): dicionário único de estados da encomenda (rótulo cliente + interno); "Removido. Desfazer" no carrinho e nas linhas da fórmula; separadores/filtros com `tablist`/radio e estado no URL; pesquisa e ordenação em Encomendas e Materiais; ajuda de sintaxe junto às expressões das fórmulas.
- Ideias a discutir com o Bruno: ficha de fabrico "assinada" em PDF na encomenda; medição no local com preço descontado; etiquetas tipo carimbo.

### Fase 1 — detalhe do que foi feito (2026-11-04)

1. ✅ **Feito a 2026-11-04:** `lib/money` (decimal de ponto fixo sobre BigInt, 8 casas; cêntimos; IVA; formatação pt-PT), `lib/options` (condições e regras validadas com Zod; `resolveConfig` aplica `restrict`/`hide`/`require`/`forbid` numa passagem) e `lib/pricing` (parser de expressões sem `eval`, com vírgula decimal e `;` entre argumentos; `ceil`/`floor`/`round` encostam ao inteiro o erro de float; variáveis calculadas; linhas condicionadas; artigo escolhido por opção; componentes dos valores; consumíveis com a margem do material; margem por item, `null` bloqueia). Testes em `tests/unit/{money,expression,options,pricing}.test.ts`, com o portão de correr e a escada calculados à mão. Falta: validação das fórmulas para o backoffice (variáveis desconhecidas, dependências das regras pela ordem), preço fixo por intervalo de medida (pendente).
2. 🟡 **Schema do catálogo feito a 2026-11-04** (migração `0001_catalogo`): `materials` (margem da loja, peso por unidade, `erp_missing_at`), `material_costs`, `sync_runs`, `sectors` (taxa + margem), `option_definitions`, `option_values`, `categories` (árvore por `parent_id`), `products`, `product_versions`, `product_options`, `product_option_values`, `option_rules`, `formula_variables`, `formula_lines`, `formula_line_materials`. Textos visíveis em `jsonb` por língua (`src/lib/localized.ts`). Restrições na BD: chaves em minúsculas, margens e custos ≥ 0, mín ≤ máx, cada linha da fórmula com exatamente uma origem de custo; nada apaga em cascata o que um orçamento possa referir. Falta: `quotes`, `orders`, `order_items`, `payments`, `webhook_events`, `consents`, zonas (instalação/transporte), `discount_groups`.
3. Catálogo, configurador, carrinho, pedido; backoffice (shadcn + TanStack Table).
   - 🟡 **Backoffice iniciado (2026-11-04):** navegação lateral (no telemóvel passa para o topo) e **Materiais e custos** (`/admin/materiais`): artigos do ERP com custo, variação e peso; margem editável em % (`src/lib/percent.ts`: "12,5" ↔ `0.1250`, testado); filtro "precisam de atenção" (margem por decidir ou desaparecidos); aviso quando a última sincronização falhou; botão "Sincronizar agora"; tabela das últimas sincronizações. Tabela em HTML simples: o TanStack Table entra quando houver ordenação/pesquisa a sério. Paleta clara do `DESIGN.md` (secção Backoffice). Falta: histórico de custos por artigo e "usado em", categorias, biblioteca de opções, componentes, sectores, produtos e fórmulas, encomendas.
   - **Categorias** (`/admin/categorias`): árvore de dois níveis, criar/editar (nome, endereço gerado do nome por `src/lib/slug.ts`, categoria de cima, descrição, ordem), arquivar e repor. Regras no servidor: só dois níveis, uma categoria com subcategorias não passa a subcategoria, endereço único, não se arquiva com subcategorias ou produtos ativos. Ensaiado no browser. Falta: imagens da categoria (ver abaixo).
   - **Mão de obra** (`/admin/mao-de-obra`): sectores com custo/hora em euros (`parseEuroInput`, testado) e margem; criar, editar, arquivar, repor.
   - **Opções** (`/admin/opcoes`): biblioteca com nome, chave gerada do nome (`keyFromName`; não muda depois de criada), tipo (medida, número, escolha, sim/não; não muda), unidade das medidas, apresentação das escolhas, ajuda. Valores das escolhas em linhas que abrem para editar: nome, chave (fixa), ordem, artigo do ERP que acrescenta (ex.: motor), números para a fórmula (`valor=0,12; lados=2`, `parseParams` testado), RAL e cor da amostra, "pedir texto ao cliente"; arquivar e repor. Falta: regras da biblioteca ("inox → escovado ou polido"), que entram com o editor de produto.
   - **Produtos (passo 1 de 3, 2026-11-04)** (`/admin/produtos`): lista com estado na loja; criar (nome, endereço, categoria folha, descrição) cria logo a versão 1 em rascunho; editor com dados do produto e **opções do produto** (acrescentar da biblioteca, nome na fórmula, mínimo/máximo/passo em mm, obrigatória, valores permitidos e valor por omissão, subir/descer, tirar). Só se edita o rascunho; uma versão publicada não muda e "Criar versão nova" copia-a (opções, valores, regras, variáveis, linhas). **Passo 2 (fórmula):** consumíveis em %; variáveis calculadas (nome, expressão, texto e "mostrar ao cliente", ordem); linhas de custo (material, serviço externo, componente, mão de obra; quantidade; artigo fixo ou conforme uma opção, com um artigo por valor; sector nas horas; condições "só conta se…" com o mesmo formato das regras); problemas das expressões mostrados junto da variável ou linha (`validateFormula`, testado); **preço de exemplo** com a decomposição por linha (quantidade, custo, margem, preço) e consumíveis. A montagem para o motor (`loadPricingModel` em `src/server/catalog/formula.ts`) é a mesma que a loja e os orçamentos vão usar. Ensaiado no browser com o portão do teste unitário: 4 000 × 1 600, ferro, motor → 895,48 € sem IVA, igual às contas à mão. **Passo 3 (regras e publicação):** regras do produto e **regras da biblioteca** (`/admin/opcoes/regras`) com o mesmo formulário: condições "se… e…" (escolha é/não é, sim/não, medida comparada com um número ou com outra medida × fator) e efeito (só permite valores, esconde, torna obrigatória, não é possível com mensagem); cada regra aparece como frase ("Se Material é Inox → Motorização só Motor e 2 comandos"). `validateRules` (testado) recusa regras que dependem de opções abaixo da que afetam. **Painel "Falta resolver antes de publicar"** (`checkVersion`): sem opções ou linhas, opção sem valores, problemas das expressões, regras fora de ordem, margens por decidir, linha sem artigo; avisos para medidas sem limites e artigos desaparecidos do ERP. Rascunho → **Validar** → **Publicar na loja** (volta a verificar ao publicar; `products.published_version_id` passa a esta versão). Ensaiado no browser do princípio ao fim, incluindo "Criar versão nova" depois de publicar. Falta: comparação com orçamentos reais dentro de ±x% antes de validar (por definir com o Bruno), arquivar produtos.
   - **Loja (2026-11-04), primeira parte:** layout escuro do `DESIGN.md` só no grupo `(loja)` (as páginas de conta mantêm a paleta clara até serem redesenhadas); tokens `night-*`, `amber`, `paper`, `dim` em `globals.css` e a utilidade `font-display` (Archivo larga, 115%, peso 300; a fonte passou a variável com o eixo `wdth`). Rotas: `/pt/loja` (categorias com produtos publicados), `/pt/loja/[categoria]` (grelha 4:5, ainda sem fotografias), `/pt/loja/[categoria]/[produto]` (**configurador**). O configurador corre as regras no browser (`lib/options`: esconder, restringir com troca para o valor por omissão e aviso, obrigatória, não é possível) e pede o preço ao servidor (`quoteAction` → `quoteProduct`, com atraso de 250 ms); **custos e margens nunca saem do servidor**. Preço com IVA (taxa em `settings.vat_rate`, semeada a 0.2300 pelo `db:seed`), valor sem IVA e variáveis "mostrar ao cliente". Desenho cotado com as duas primeiras medidas, à escala. Textos em `messages/pt.json` (`Shop`). Ensaiado: 400 × 160 cm, ferro, motor → 1 101,44 € com IVA (895,48 € + 23%). Falta: fotografias, visualizador GLB, rate limiting do `quoteAction` (é público), teste e2e do configurador (precisa de um produto publicado na BD do CI).
   - **Carrinho (2026-11-04):** migração `0004_orcamentos_e_carrinho` com `quotes` (preço fixo durante `settings.quote_validity_days`, 30 por omissão; snapshot com versão, escolhas, resumo legível, decomposição com custos e margens, IVA), `carts` (identificado por cookie `habinox_cart` httpOnly/SameSite=Lax com 32 bytes aleatórios; na BD só o hash SHA-256) e `cart_items` (quantidade 1–99, até 50 linhas). "Adicionar ao carrinho" no configurador calcula no servidor e grava o orçamento; contador no cabeçalho; página `/pt/carrinho` com as escolhas de cada linha, quantidade, remover, "preço garantido até…"; orçamento expirado é recalculado só para mostrar, com aviso do preço anterior; produto arquivado ou combinação já impossível fica "indisponível" e sai do total. Totais: subtotal sem IVA + IVA uma vez sobre o total (as linhas mostram o preço com IVA só para apresentação). Ensaiado no browser (duas configurações, quantidade, remover, expiração com subida de custo, produto arquivado, outro visitante não vê o carrinho). Falta: limpeza de carrinhos antigos (job), rate limiting das actions públicas.
   - **Finalizar pedido (2026-11-04):** migração `0005_encomendas` com `orders` (número `HBX-AAAA-NNNNN` pela sequência `order_number_seq`; estado; totais com a taxa de IVA usada; email, telefone, NIF, moradas de faturação e entrega em `jsonb`; notas; `measures_accepted_at` e `terms_accepted_at`), `order_items` (cópia do orçamento: preço unitário, configuração e snapshot), `order_events` (histórico de estados) e `consents` (RGPD: `terms` e `measures_responsibility` com a origem `order:<número>`). Máquina de estados pura em `src/lib/orders/state.ts` (`canTransition`, `onPaymentConfirmed`: pagamento depois de `expired` vai para revisão, webhook repetido é ignorado), NIF com dígito de controlo e código postal `0000-000` em `src/lib/address.ts`, com testes. `/pt/checkout` exige login (volta ao checkout depois de entrar); formulário de contacto, faturação, entrega (igual por omissão), notas e as duas confirmações obrigatórias; resumo com "Transporte e instalação: a confirmar pela Habinox". `placeOrder` numa transação com o carrinho bloqueado (`FOR UPDATE`): orçamentos dentro do prazo mantêm o preço, expirados são renovados, linhas indisponíveis travam tudo; **se o total não for o que o cliente viu no botão, não encomenda** e mostra o total novo. Emails depois do commit: confirmação ao cliente e aviso para `settings.orders_notify_email` (geral@habinox.pt). Página `/pt/encomenda/[número]` só para o dono. Ensaiado: erros de validação sem perder o que se escreveu, recálculo de orçamento expirado, preço alterado entre abrir e enviar, dois envios simultâneos (uma encomenda, o outro recebe "carrinho vazio"). Nota: um envio recusado gasta um número da sequência (pode haver saltos; a numeração fiscal é a das faturas do Odoo). Falta: pagamento (fase 1B).
   - **Encomendas no backoffice (2026-11-04)** (`/admin/encomendas`): lista com filtro por estado e contagens; detalhe com artigos (escolhas, variáveis, **decomposição interna** do snapshot com custos e margens), totais e custo estimado, histórico de estados (quem e quando), cliente (email, telefone, NIF, moradas, notas, data da aceitação das medidas). Mudança de estado só pelas transições da máquina de estados, numa transação com a encomenda bloqueada, com registo em `order_events`; cancelar exige motivo; o cliente recebe email a cada mudança (texto com a nota). Ensaiado: paga → produção → pronta; cancelamento sem motivo recusado e com motivo aceite. Falta: expirar encomendas não pagas (job, prazo por definir com o Bruno), reembolsos e pagamentos (fase 1B), pesquisa por número/cliente.
   - **A minha conta (2026-11-04):** `/pt/conta` passou para o grupo `(loja)` (visual escuro) com "As minhas encomendas": número, data, nº de artigos, total e estado, cada uma a ligar à página da encomenda (que ganhou a ligação de volta). Os formulários de entrar, registo e recuperação continuam com a paleta clara em `(conta)` até serem redesenhados (o protótipo tem o login sobre a cena 3D).
   - **Carrinho e conta (2026-11-04):** todos os pontos que usam o carrinho pedem-no a `getCurrentCart` (`src/server/store/current-cart.ts`). Com sessão, o carrinho é o da conta (o mesmo em qualquer browser); um carrinho anónimo do cookie junta-se a ele ao entrar, ou passa a ser da conta se ela não tinha; vários carrinhos da conta juntam-se no mais recente. Sem sessão só vale um carrinho anónimo: depois de terminar a sessão o browser não mostra o carrinho da conta. Decisão pura e testada em `cart-ownership.ts` (`planCart`); aplicação idempotente numa transação. Ensaiado no browser (entrar, sair, voltar a entrar com outro artigo, outro browser com a mesma conta).
   - **Página inicial (2026-11-04):** `/pt` passou a ser a apresentação da empresa do protótipo (`docs/site-inicial/`), no grupo `(inicio)` com cabeçalho próprio transparente: cena da casa desenhada imagem a imagem num canvas conforme o scroll (`home-scene.tsx`), 9 blocos com entrada palavra a palavra, linhas uma a uma, contador, véus de leitura e barra de progresso; "Entrar na loja" leva a `/pt/loja`. Paleta e fonte da apresentação (noite, dourado, Fraunces) como tokens `dusk`, `cream`, `gold…` e `--font-fraunces`. Modo decidido antes de pintar por um script no `<head>` do layout (`data-home="scrolly"`); com menos movimento pedido ou sem JavaScript é uma página normal com uma imagem fixa. **Imagens otimizadas:** só o troço que o scroll percorre (imagens 40–144), em WebP, 1920 px (5,5 MB) e 900 px para telemóvel (2,4 MB), carregadas por fases (`docs/site-inicial/cenarios/export-web.sh` com ffmpeg); o protótipo usava 103 MB. Corrigido em relação ao protótipo: a legenda "Obra real Habinox" passou a "Imagem 3D ilustrativa" (é uma renderização) e os números de clientes e toneladas (marcados PROVISÓRIOS) não aparecem até o Bruno os confirmar. Ainda não passou: a viagem de câmara até à loja e o login sobre a cena (a loja e o login são páginas próprias), o vídeo `balanco.mp4` e a animação das luzes, o seletor de línguas (beta só em PT).
   - **Página inicial igual ao artefacto (2026-11-04, a pedido do Rodrigo):** `/pt` abre no estado **"loja"**, como o protótipo: a câmara chega à escada, os degraus acendem (`a00–a14`) e fica o vaivém em vídeo (`balanco.mp4`, 2,1 MB / 0,5 MB no telemóvel), que abranda ao fazer scroll; herói "Metal feito à medida. Preço na hora."; categorias reais em duas filas que passam sozinhas (arrastar, pausa, inércia; `category-rails.tsx`); rodapé com as ligações legais e "Sobre a Habinox". `#inicio`/`#empresa`/`#servicos`/`#contactos` mudam para a apresentação com **viagem de câmara** (2,3 s, mesma curva das cores) e as cores passam da noite azul ao grafite (`@property --night/--cream/--gold`); continuar a descer no fim da apresentação volta à loja. Estado decidido antes de pintar (`data-route` no script do `<head>`); cada estado guarda a sua posição de scroll. Abertura: o nome "HABINOX®" respira no centro pelo menos 2,5 s e viaja 2,2 s até ao logótipo do cabeçalho (`SPLASH_MIN_MS`, `DOCK_MS` em `home-scene.tsx`); cabeçalho e herói aparecem a meio da viagem e o logótipo troca com o nome à chegada. Cabeçalho do artefacto: "HABINOX®" em Fraunces, Empresa/Serviços/Contactos só na apresentação, Entrar ou Conta e o saco com o número de artigos. "Configurar agora" leva ao primeiro produto publicado. `/pt/loja` redireciona para `/pt#familias` e as ligações "Loja" das outras páginas apontam para lá. **Fotografias das categorias PROVISÓRIAS** (as categorias e os produtos vêm todos do backoffice; as que aparecem localmente são da demonstração; fotografias do Unsplash, do protótipo, em `public/home/provisorio/`): usadas enquanto a categoria não tem imagem; **trocar pelas obras da Habinox antes de abrir** (upload de imagens de categoria ainda por fazer, depende do R2). **Entrar (estado `#entrar`, como o artefacto):** a câmara sai da loja e dá a volta à escada até ao ponto de login (imagem 21; exportadas também as imagens 20–39), o enquadramento desloca-se e o formulário "Entrar na sua conta." aparece à direita (em baixo no telemóvel), com entradas desfasadas. Login real com o Better Auth (`scene-sign-in.tsx`); depois de entrar segue para `next` ou para a conta. Todos os pedidos de login (proxy, `requireUser`, `/pt/entrar`) passam a abrir `/pt?next=…#entrar`; registo e recuperação de password continuam nas páginas claras. Ainda não passou: o seletor de línguas.
   - **Páginas legais (2026-11-04), RASCUNHO a validar por jurista:** `/pt/termos`, `/pt/privacidade`, `/pt/cookies`, com o texto em `src/content/legal/pt.tsx` (um ficheiro por língua; dados da empresa e da entidade de litígios em `company.ts`). Termos com as regras decididas: medidas da responsabilidade do cliente; **sem direito de livre resolução em produtos por medida** (art. 17.º, n.º 1, c) do DL 24/2014), cancelamento possível até ao início do fabrico; preço garantido 30 dias; transporte e instalação à parte, confirmados antes do pagamento; pagamento total até 1 000 € ou 50/50 acima; garantia de 3 anos (DL 84/2021); Livro de Reclamações; resolução alternativa de litígios no **CIAB (Braga)**, competente para Esposende. A plataforma europeia de litígios em linha foi encerrada a 20/07/2025 (Regulamento 2024/3228), por isso não há ligação. Privacidade com dados, bases legais, prazos (faturação 10 anos), subcontratantes, direitos e CNPD. Cookies: só os essenciais (`habinox_cart`, sessão do Better Auth, `NEXT_LOCALE`, confirmados na app), por isso sem aviso de consentimento até haver métricas (fase 2). Ligações legais no rodapé da loja, das páginas de conta e no fim da página inicial; as confirmações do checkout ligam aos termos (ponto 8) e à privacidade, em novo separador. **Falta o Bruno dar:** NIPC, conservatória e n.º de matrícula, capital social (aparecem entre [ ] nos termos e na privacidade); confirmar a lista de subcontratantes quando as contas existirem.
   - **Bug corrigido:** numa consulta sem join, o drizzle não qualifica as colunas dentro de subconsultas `sql`; `categories.id` era lido como o `id` de `products` e as contagens davam 0 (afetava a loja, a coluna "Valores" das opções e "versão nova em preparação"). Passaram a consultas agrupadas à parte. Regra: não usar subconsultas correlacionadas em `sql` numa consulta sem join.
   - **Formulários do backoffice não perdem o que se escreveu:** com `<form action>` o React 19 limpava os campos depois de cada envio, mesmo com erro. Agora enviam por `submitKeepingValues` (`src/components/admin/`).
   - **Componentes = artigos do ERP (2026-11-04):** motores, comandos, LED… vêm do Odoo como os materiais (custo do Odoo, margem da loja). Migrações `0002_sem_componentes` (ordem corrigida à mão: o drizzle-kit apagava a tabela antes das FKs) e `0003_artigo_do_valor` (`option_values.material_id`). Não há página de componentes: aparecem em Materiais e custos, com a margem de cada um.
   - **Imagens e R2 (por fazer):** as imagens (categorias, produtos, GLB) vão para o **Cloudflare R2**, que ainda não está configurado (conta em nome da Habinox). Cada imagem tem de ter o tamanho certo para o desenho da loja e da página inicial; os formatos saem do protótipo (`docs/site-inicial/`):

     | Onde                                         | Proporção | Tamanho mínimo | No protótipo                   |
     | -------------------------------------------- | --------- | -------------- | ------------------------------ |
     | Mosaico da categoria (página inicial e loja) | 4:3       | 1200 × 900 px  | `img/*.jpg`                    |
     | Capa panorâmica da categoria                 | 12:5      | 2400 × 1000 px | `img/capas/*.jpg` (2000 × 833) |
     | Cartão de produto / modelo                   | 4:5       | 960 × 1200 px  | `.card figure`                 |

     Proposta: no upload, o backoffice **recusa imagens abaixo do mínimo** e mostra a pré-visualização já recortada em cada formato; o Bruno marca o **ponto de foco** (no protótipo `focus`/`object-position`), porque em telemóvel só se vê uma faixa da capa. Guardar o original no R2 e servir pelo `next/image` (redimensiona e converte para WebP/AVIF). JPEG ou WebP, até 10 MB. **O Bruno arranja as fotografias** (2026-11-04); passar-lhe esta tabela de tamanhos.

   - Corrigido no login: com `?next=` o `callbackURL` fixo em `/conta` competia com o `router.push(next)` e às vezes ganhava.
4. 🟡 **Sincronização Odoo feita com o adaptador fake (2026-11-04)** em `src/server/sync/odoo/`: `ErpClient` + `FakeErpClient` (6 artigos de exemplo), `planSync` puro e testado (cria, atualiza, histórico só quando o custo muda, marca desaparecidos sem apagar, ignora inválidos e repetidos, resposta vazia não marca nada), `syncErpMaterials` numa transação com advisory lock e registo em `sync_runs`; job `odoo-sync` no cron. O fake só corre em development; noutro ambiente o job falha até existir o adaptador real. Ensaiado contra o Postgres local. Falta: adaptador Odoo (API JSON-2), `vercel.json` com o cron diário, botão "sincronizar agora" e avisos no backoffice, limiar de variação de custo que pede aprovação (pergunta 45 da fase 0).
5. RGPD: tabela `consents` e checkbox de termos/privacidade no registo (ainda **não** existe); apagamento de conta no backoffice; cookies.
6. Visualizador GLB (react-three-fiber), SEO básico, templates HTML de email.

### Pequenas pendências técnicas

- `NextIntlClientProvider` envia todas as mensagens para o cliente; filtrar por namespace quando o ficheiro crescer.
- Emails só em texto simples; falta template HTML com a marca.
- Sem página de erro/404 personalizada.
- O build descarrega as fontes do Google (`next/font/google`); a 2026-10-09 o CI falhou uma vez a obter a IBM Plex Sans e passou ao repetir. Se voltar a acontecer (ou na Vercel), passar a fontes locais (`next/font/local` com os ficheiros no repositório).
- Página `/admin` não tem login próprio: usa o estado "entrar" da página inicial (`/pt?next=/admin#entrar`).

---

## 7. Por confirmar com o cliente

Ver secção 8 do `CLAUDE.md`. Além disso:

- **Margem:** confirmada a 2026-11-04, `custo × (1 + margem)`. O PDF do plano, os wireframes e os mockups ainda mostram a fórmula antiga (`÷ (1 − margem)`); são documentos de fase 0 e não foram alterados.
- **Valores por fase no PDF:** calculados a 15 €/h (7 800 € ÷ 520 h); confirmar com o contrato.

- Titularidade das contas: **decidido — ficam em nome da Habinox** (Vercel, Neon, Sentry, Resend). Falta criá-las.
- Domínio: **`habinox.pt`** (site atual em WordPress, email `geral@habinox.pt` no mesmo domínio). Falta saber quem gere o DNS e se a loja fica no domínio principal ou num subdomínio.
