# Revisão dos wireframes com a skill taste — 2026-10-22

Revisão dos 14 wireframes (`docs/wireframes/`) com a skill `design-taste-frontend` (tasteskill v2). Os ecrãs foram renderizados localmente com o runtime do canvas e medidos com `scripts/inspect.mjs` a 1440, 768 e 390 px: os 7 da loja em modo página, os 4 do backoffice em modo aplicação (`--app`). `scripts/lint.mjs` correu sobre o código. Os 3 ecrãs de telemóvel são cópias dos de desktop e ficam cobertos pela largura de 390 px.

## Ignorado: conflito com o `DESIGN.md`

A maior parte das falhas do inspetor são proibições da casa da skill que contrariam a identidade "catálogo técnico". O `DESIGN.md` prevalece; **não se mudam**:

| Regra da skill                                | Porque fica                                                       |
| --------------------------------------------- | ----------------------------------------------------------------- |
| Sem monoespaçada                              | Medidas, códigos e referências em IBM Plex Mono é a regra de ouro |
| Sem linhas finas / caixas com contorno de 1px | Separação por linha de 1px é a forma da identidade                |
| Sem numeração 01 / 02 / 03                    | Barra de categorias e passos numerados fazem parte do sistema     |
| Sem etiquetas pequenas em maiúsculas          | Etiqueta de categoria em mono maiúsculas                          |
| Máximo de 2 fontes                            | Archivo + IBM Plex Sans + IBM Plex Mono                           |
| Fundo "creme" (`#F5F4F1`)                     | É o `canvas` da paleta                                            |
| Sem sombras                                   | A sombra do cartão do herói é a exceção prevista                  |
| Página parada (sem animação)                  | São wireframes; o movimento é decidido na implementação           |

## Problemas e estado

| Sev. | Problema                                                                                                                                                                                                                     | Estado |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P1   | **Editor de fórmulas desatualizado** face ao modelo do Bruno: margem sobre o custo, uma só mão de obra, IVA dentro da fórmula; faltam consumíveis em %, taxas por sector, componentes a preço de venda, margem sobre a venda | ✅     |
| P1   | **Configurador:** "Adicionar ao carrinho" com aspeto de botão desativado (cinzento), contra a decisão da revisão anterior (ativo, diz o que falta)                                                                           | ✅     |
| P1   | **Configurador:** o desenho acaba a meio do ecrã e a coluna da esquerda fica vazia mais de 1 000 px                                                                                                                          | ✅     |
| P2   | **Página inicial:** 6 produtos em 4 colunas (linha órfã de 2); título "Como funciona" em 4 linhas; menu do telemóvel em 3 linhas antes do herói; barra de categorias cortada no telemóvel sem indicação                      | ✅     |
| P2   | **Escala de tipo:** até 14 tamanhos por página; texto corrido a 14 px e em cinzento no carrinho, checkout, confirmação e conta                                                                                               | ✅     |
| P2   | **Transbordo:** fórmula sai 74 px para o lado a 768 px; carrinho e checkout com margens desiguais a 390 px                                                                                                                   | ✅     |
| P2   | **Símbolos ✓ ✗** nas fórmulas e no produto, em vez de ícones de traço fino                                                                                                                                                   | ✅     |
| P3   | **Nenhuma fotografia** em nenhum ecrã. Os desenhos cotados ficam (são a assinatura), mas a página inicial precisa de fotos reais de obras e da oficina → pedir ao Bruno                                                      | ⏳     |
| P3   | **Logótipo** escrito em texto no cabeçalho → redesenhado em SVG e aplicado nos wireframes e na app (2026-10-26)                                                                                                              | ✅     |

## As três mudanças com mais efeito

1. Editor de fórmulas com o modelo real do Bruno (é o ecrã que ele reconhece: é o Excel dele).
2. Configurador: desenho fixo ao scroll e botão ativo.
3. Tipografia: menos tamanhos, texto corrido no tamanho de corpo do `DESIGN.md` e a preto, títulos em duas linhas no máximo.

## O que foi corrigido (2026-10-22)

- **Fórmula:** consumíveis em %; margem sobre o preço de venda (`custo ÷ (1 − margem)`); mão de obra por sector (corte laser, serralharia) com taxa em Definições; artigo PHC conforme o material (ferro / inox / alumínio, com seletor no teste); componentes a preço de venda, sem margem; instalação = zona + horas; "Sem arredondamento" como opção; IVA fora da fórmula ("Preço sem IVA"). Notas do canvas atualizadas.
- **Configurador:** desenho fixo ao scroll em desktop (`position: sticky` a partir de 1000 px); "Adicionar ao carrinho" sempre no azul de ação, a dizer o que falta.
- **Página inicial:** produtos em 3 colunas (2 em tablet, 1 em telemóvel); "Do modelo à encomenda." em 2 linhas; botão "Menu" no telemóvel em vez de 3 linhas de links; categorias em lista de 2 colunas no telemóvel; títulos do herói e da Área Pro com `clamp()`.
- **Cabeçalho das páginas interiores** (categoria, configurador, carrinho, conta): botão "Menu" no telemóvel.
- **Tipografia:** 14 → 15 px, 18 → 17 px, 19 → 20 px, 11–12 → 13 px nas páginas da loja. O corpo fica a **15 px**, que é o máximo do `DESIGN.md` (14–15 px); o texto de apoio continua em `steel`/`steel-light`, como o `DESIGN.md` define. A skill pede 16 px e preto: diferença assumida.
- **Transbordo:** contentores com scroll horizontal passam a `position: relative` (o texto escondido para leitores de ecrã saía da tabela e empurrava a página a 768 px).
- **Ícones:** ✓ ✗ substituídos por ícones de traço fino, com texto para leitores de ecrã.
- As cópias de telemóvel foram regeneradas a partir dos ecrãs de desktop.

Avisos do inspetor que ficam, por serem do `DESIGN.md` ou falsos positivos: corpo a 15 px e texto de apoio cinzento; "eyebrow" em pares rótulo/valor (ex.: "Portes" acima do total); títulos "nome simples" em ecrãs de tarefa (Carrinho, Checkout); margens ligeiramente desiguais medidas sobre o texto, não sobre as caixas.
