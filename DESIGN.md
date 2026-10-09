# Abinox — identidade visual

Fonte da verdade visual da plataforma (loja e backoffice). Referência estática: [`docs/design/Loja_Pagina_Inicial_mockup.html`](docs/design/Loja_Pagina_Inicial_mockup.html) (página inicial, desktop 1440px). Em caso de conflito com os wireframes de `docs/wireframes/`, **este documento ganha**: os wireframes valem pela estrutura e pelos fluxos, não pelo aspeto.

---

## Carácter

**Catálogo técnico**, não loja de decoração. O cliente configura uma peça metálica por medida; o site transmite precisão e competência industrial. Referências: desenho técnico, folha de especificações, catálogo de fabricante alemão ou italiano de serralharia.

Não usar: gradientes, cantos muito arredondados, sombras suaves, ilustrações, emojis, tons pastel, fotografia de estilo de vida.

Princípios:

- O produto e o preço são o conteúdo. O resto é moldura.
- Densidade informativa a favor do profissional, sem parecer apertado.
- Branco e linhas finas em vez de caixas e sombras.
- **Números, medidas e códigos sempre em monoespaçada** — é o que dá o tom técnico.

Dois públicos, o mesmo sistema: o **particular** (chega por pesquisa, precisa de clareza) e o **profissional** (construtores, instaladores; quer densidade e rapidez). A diferença faz-se por **fundo e hierarquia**, nunca por paleta ou tipografia diferentes.

---

## Paleta

Neutros quentes acinzentados e um único acento.

| Token         | Hex       | Uso                                                                     |
| ------------- | --------- | ----------------------------------------------------------------------- |
| `ink`         | `#15171A` | Texto principal, fundos escuros (faixa Pro), botões primários           |
| `ink-soft`    | `#33373D` | Separadores sobre fundo escuro                                          |
| `steel`       | `#4A4F56` | Texto secundário, descrições                                            |
| `steel-light` | `#5A5F66` | Etiquetas, metadados, texto de apoio                                    |
| `mist`        | `#A9AEB5` | Texto de apoio sobre fundo escuro                                       |
| `mist-light`  | `#C9CDD2` | Parágrafos sobre fundo escuro                                           |
| `canvas`      | `#F5F4F1` | Fundo da página                                                         |
| `surface`     | `#FFFFFF` | Cartões de produto, painéis                                             |
| `surface-alt` | `#EAE8E3` | Área de imagem dos produtos, blocos neutros                             |
| `line`        | `#DAD8D2` | Bordas e separadores **decorativos**                                    |
| `line-soft`   | `#EDECE8` | Separadores internos de cartões                                         |
| `line-strong` | `#85827A` | Bordas de **campos e controlos** (precisam de ≥ 3:1)                    |
| `accent`      | `#B8461A` | Acento único: CTA principal, cotas, numeração de passos, estados ativos |
| `accent-text` | `#A83F17` | Texto de acento **pequeno sobre `surface-alt`** (cotas dos desenhos)    |
| `graphite`    | `#383E42` | Amostra RAL 7016 (exemplo de acabamento)                                |
| `error`       | `#B3261E` | Erros (sempre com texto)                                                |

Regras:

- O acento é **raro**: 2–3 vezes por ecrã, não em cada elemento.
- Nunca transmitir estado só com cor; juntar sempre texto ou ícone.
- Acentos alternativos aceites (decisão do cliente): azul técnico `#1F4E79`, ou o próprio `ink` para um registo mais sóbrio.

### Contrastes verificados (WCAG)

| Par                                                | Rácio              | Nota                                                     |
| -------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| `accent` / `surface`                               | 5,34               | OK texto                                                 |
| `accent` / `canvas`                                | 4,86               | OK texto (hover de links)                                |
| `accent` / `surface-alt`                           | 4,37               | **Falha para texto pequeno** → usar `accent-text` (5,06) |
| branco / `accent`                                  | 5,34               | OK (CTA)                                                 |
| `steel-light` / `canvas`, `surface`, `surface-alt` | 5,85 / 6,43 / 5,26 | OK                                                       |
| `mist` / `ink`                                     | 8,05               | OK                                                       |
| `line` / `surface`                                 | 1,43               | **Só decorativo**; nunca como borda de campo             |
| `line-strong` / `surface`                          | 3,84               | OK para bordas de campos e controlos                     |

---

## Tipografia

| Família           | Função                                                         | Pesos         |
| ----------------- | -------------------------------------------------------------- | ------------- |
| **Archivo**       | Títulos, nomes de produto, preços, logótipo                    | 500, 600, 700 |
| **IBM Plex Sans** | Corpo, navegação, botões, descrições                           | 400, 500, 600 |
| **IBM Plex Mono** | Medidas, dimensões, códigos, etiquetas de categoria, numeração | 400, 500      |

| Papel                  | Tamanho | Família / peso                                           |
| ---------------------- | ------- | -------------------------------------------------------- |
| Título principal       | 64px    | Archivo 600, `letter-spacing: -0.02em`, line-height 1.04 |
| Título de secção       | 40px    | Archivo 600, `-0.01em`                                   |
| Título de faixa escura | 44px    | Archivo 600, `-0.01em`                                   |
| Subtítulo              | 32px    | Archivo 600                                              |
| Nome de produto        | 20px    | Archivo 600                                              |
| Título de passo        | 19px    | Archivo 600                                              |
| Parágrafo de destaque  | 17–18px | Plex Sans 400, line-height 1.6                           |
| Corpo                  | 14–15px | Plex Sans 400/500                                        |
| Apoio / metadados      | 13px    | Plex Sans 400                                            |
| Etiqueta de categoria  | 11–13px | Plex Mono, maiúsculas, `letter-spacing: 0.08em`          |
| Cotas e medidas        | 12–13px | Plex Mono                                                |

**Regra de ouro:** qualquer número que represente uma medida, um código ou uma referência vai em **IBM Plex Mono**, mesmo dentro de uma frase. Os números formatam-se com `Intl.NumberFormat('pt-PT', { useGrouping: 'always' })` ("3 500").

Em mobile, os títulos de 64/44/40px descem (usar `clamp()`), nunca ficam fixos.

---

## Forma e espaçamento

- **Raio dos cantos: 2px.** Nunca 8px ou mais.
- **Sem sombras**, exceto o cartão flutuante sobre o visual do herói: `0 12px 32px rgba(21,23,26,0.08)`.
- Separação por **linha de 1px** (`line`), não por sombra nem fundo alternado.
- Margem lateral: **80px** desktop; **16–24px** mobile.
- Entre secções: 72–112px.
- Grelha interna em múltiplos de 4: 6, 8, 10, 12, 16, 24, 32, 64.
- Alvos interativos: **44px** (padrão) e **52px** (ações principais). Nunca abaixo de 44px.
- Preenchimento interno dos cartões: 24px.

---

## Componentes

- **Cabeçalho:** 76px, fundo claro, borda inferior 1px. Logótipo em Archivo 700 à esquerda, navegação ao lado, ações à direita. O botão de pedido é o único elemento escuro.
- **Barra de categorias:** faixa de largura total, colunas iguais separadas por linhas verticais de 1px, nome + número de ordem em mono (01, 02…). Em mobile vira lista ou carrossel horizontal.
- **Cartão de produto:** branco, borda 1px, sem sombra. Topo de 280px em `surface-alt` com o desenho técnico centrado. Depois: etiqueta de categoria (mono, maiúsculas), nome (Archivo 600), características em `steel-light`, rodapé separado por linha com preço à esquerda e botão escuro à direita.
- **Desenhos técnicos:** linha em `ink`, traço 1,5–1,6px, sem preenchimento. Cotas e linhas de dimensão em `accent`; valores em mono (`accent-text` sobre `surface-alt`). É o detalhe que mostra que o site é feito por quem percebe do produto.
- **Botões:** primário = fundo `ink`, texto branco; CTA principal = fundo `accent`, texto branco (só um por ecrã); secundário = transparente com borda 1px `ink`. Em fundo escuro inverte (fundo branco, texto `ink`). Raio 2px.
- **Faixa escura (Área Pro):** largura total em `ink`, texto branco, etiqueta em `mist`, parágrafos em `mist-light`, lista numerada separada por linhas `ink-soft`.
- **Passos numerados:** borda superior 2px `ink`, número em mono na cor `accent`, título Archivo 600, descrição em `steel`.
- **Campos de formulário:** fundo `surface`, borda 1px `line-strong`, raio 2px, altura 44–48px; valores numéricos em mono.
- **Rodapé:** fundo da página (sem faixa escura), colunas de links com cabeçalhos a negrito. Inclui sempre: termos, privacidade, cookies, Livro de Reclamações, resolução de litígios.

---

## Comportamento

- Hover em links: de `ink` para `accent`.
- **Foco visível sempre:** anel de 2px em `ink` sobre fundos claros, branco sobre fundos escuros (o `accent` sobre `ink` fica em 3,36:1 — só como alternativa).
- Interativos são sempre `<button>`, `<a href>` ou `<input>` com `<label>`; nunca `div` com clique.
- Ícones: traço fino (1,6px), em linha, da mesma família dos desenhos técnicos. Sem ícones preenchidos nem emojis.
- Mobile: grelha de 3 colunas de produtos passa a 1; margem lateral 16–24px.
- Movimento: mínimo e com `prefers-reduced-motion` respeitado.

---

## Contexto

Cliente: **Bruno Miguel Freitas, Lda** (Abinox), serralharia em Viana do Castelo. Portões, escadas, guardas, chaminés, chapéus de chaminé e caixas de correio, quase tudo por medida, em inox, ferro e alumínio.

Marcadores por preencher no mockup: `[MARCA]`, `[PREÇO]`, `[MORADA]`, `[TELEFONE]`, `[EMAIL]`.
