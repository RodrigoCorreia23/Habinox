# Habinox — identidade visual

Fonte da verdade visual da plataforma. Referência: o **mockup v2** em [`docs/mockup-v2/`](docs/mockup-v2/README.md) (canvas https://claude.ai/artifact/SbBGznCFf11VEcdd7YUev3), **aprovado pelo Bruno a 2026-10-27** ("um ar de arquitectura moderna, é este o caminho"). Em caso de conflito com os wireframes de `docs/wireframes/`, **este documento ganha**: os wireframes valem pela estrutura e pelos fluxos, não pelo aspeto.

Até 2026-10-27 a direção era "catálogo técnico" claro (mockup v1 em `docs/mockup/`, referência antiga em `docs/design/`). O Bruno achou-a "muito simples e quadrada, com muitas caixas"; ficou substituída na loja.

**Âmbito:** esta identidade é a da **loja**. O **backoffice** mantém, por agora, a paleta clara anterior (secção [Backoffice](#backoffice)): é um ecrã de trabalho, usado horas seguidas.

---

## Carácter

**Arquitetura moderna, à noite.** Fotografias de casas, portões e escadas com luz quente, fundo escuro, muito espaço, poucas palavras. O produto aparece no seu sítio, na casa, e não numa ficha. Referência do Bruno: quadros do Pinterest de interiores escuros com fita LED âmbar.

A loja **é só loja**: produtos, medidas, preço, carrinho. A história da Habinox, a oficina, a equipa e a Área Pro ficam na página de apresentação do site, não aqui.

Princípios:

- **A fotografia é o conteúdo.** Imagens grandes, de ponta a ponta, sem moldura nem borda.
- **Menos caixas.** Separar com espaço e com linhas de 1px, nunca com cartões, fundos alternados ou sombras.
- **Pouco texto, letra grande.** Títulos grandes e finos; parágrafos curtos.
- **A precisão continua lá, discreta:** medidas, preços e códigos em monoespaçada; o desenho cotado no configurador.

Não usar: cartões com borda à volta dos produtos, sombras, cantos arredondados em imagens, ilustrações, emojis, ícones preenchidos, gradientes decorativos (o único gradiente permitido é o escurecimento por cima de uma fotografia para o texto se ler).

---

## Paleta (loja)

Grafite quente e um único acento: o **âmbar** da luz LED.

| Token          | Hex       | Uso                                                                             |
| -------------- | --------- | ------------------------------------------------------------------------------- |
| `ground`       | `#0F0E0D` | Fundo da página                                                                 |
| `surface`      | `#181715` | Campos, fundo das imagens enquanto carregam, painéis                            |
| `stage`        | `#141210` | Fundo do visualizador 3D                                                        |
| `line`         | `#2A2724` | Separadores **decorativos** (1px)                                               |
| `line-strong`  | `#706960` | Bordas de **campos e controlos** (precisam de ≥ 3:1)                            |
| `text`         | `#EEE9E2` | Texto principal, botões selecionados (fundo)                                    |
| `text-soft`    | `#C9C2B8` | Texto sobre fotografia, navegação                                               |
| `text-muted`   | `#A8A095` | Texto secundário, descrições                                                    |
| `text-faint`   | `#8E867B` | Apoio, metadados, caminho de navegação                                          |
| `amber`        | `#D6A25E` | Acento único: botão principal, números dos passos, estado ativo, cor de seleção |
| `amber-hover`  | `#E4B676` | Hover do botão principal                                                        |
| `on-amber`     | `#15120E` | Texto sobre âmbar e sobre `text`                                                |
| `paper`        | `#E9E4DC` | Fundo do desenho técnico cotado (o único bloco claro)                           |
| `dim`          | `#8A5A1E` | Cotas e linhas de dimensão no desenho, sobre `paper`                            |
| `error-border` | `#E5796F` | Borda de campo com erro (2px)                                                   |
| `error-text`   | `#F0A39B` | Texto de erro                                                                   |

Regras:

- O âmbar é **raro**: um botão principal por ecrã, mais pequenos sinais (números de passos, contador do carrinho, anel da cor escolhida).
- O **azul do logótipo (`#2005A2`) não entra na interface da loja**: sobre o fundo escuro fica a 1,47:1. O logótipo aparece na versão branca.
- Nunca transmitir estado só com cor; juntar texto, `aria-pressed` ou ícone.
- Fotografia com texto por cima leva escurecimento por baixo do texto (de `rgba(15,14,13,0)` a `rgba(15,14,13,0.85–0.92)`), nunca texto direto sobre zonas claras da imagem.

### Contrastes verificados (WCAG)

| Par                                 | Rácio         | Nota                                |
| ----------------------------------- | ------------- | ----------------------------------- |
| `text` / `ground`, `surface`        | 15,97 / 14,83 | OK                                  |
| `text-soft` / `ground`              | 10,92         | OK                                  |
| `text-muted` / `ground`, `surface`  | 7,46 / 6,93   | OK                                  |
| `text-faint` / `ground`, `surface`  | 5,37 / 4,99   | OK texto pequeno                    |
| `amber` / `ground`                  | 8,44          | OK texto                            |
| `on-amber` / `amber`                | 8,17          | OK (botão principal)                |
| `line-strong` / `ground`, `surface` | 3,56 / 3,31   | OK bordas de controlos              |
| `line` / `ground`                   | 1,30          | **Só decorativo**                   |
| `dim` / `paper`                     | 4,66          | OK cotas                            |
| `error-text` / `ground`             | 9,57          | OK                                  |
| `#2005A2` (azul) / `ground`         | 1,47          | **Nunca** azul sobre o fundo escuro |

---

## Tipografia

As mesmas três famílias da v1; muda o uso da Archivo.

| Família           | Função                                                       | Pesos    |
| ----------------- | ------------------------------------------------------------ | -------- |
| **Archivo**       | Títulos (eixo de largura a 115%, peso 300), nomes de produto | 300, 400 |
| **IBM Plex Sans** | Corpo, navegação, botões, descrições                         | 400, 500 |
| **IBM Plex Mono** | Medidas, preços, códigos, numeração, etiquetas               | 400, 500 |

A Archivo carrega-se com o eixo de largura (`Archivo:wdth,wght@62..125,200..700`) e usa-se com `font-stretch: 115%`.

| Papel                       | Tamanho (desktop → telemóvel) | Família / peso                                  |
| --------------------------- | ----------------------------- | ----------------------------------------------- |
| Título do herói             | 112 → 52px                    | Archivo 300, 115%, `line-height` 0.98           |
| Título de categoria         | 128 → 64px                    | Archivo 300, 115%                               |
| Título de secção            | 64 → 40px                     | Archivo 300, 115%, `letter-spacing: -0.01em`    |
| Título de faixa fotográfica | 80 → 44px                     | Archivo 300, 115%                               |
| Nome do produto (página)    | 80 → 56px                     | Archivo 300, 115%                               |
| Nome do produto (grelha)    | 22–24px                       | Archivo 400, 110%                               |
| Preço no configurador       | 44px                          | Plex Mono 400                                   |
| Parágrafo de destaque       | 16–18px                       | Plex Sans 400, `line-height` 1.6                |
| Corpo                       | 14–15px                       | Plex Sans 400/500                               |
| Apoio                       | 13px                          | Plex Sans 400                                   |
| Etiqueta                    | 12px                          | Plex Mono, maiúsculas, `letter-spacing: 0.08em` |

**Regra de ouro (mantém-se):** qualquer número que represente uma medida, um preço, um código ou uma referência vai em **IBM Plex Mono**. Os números formatam-se com `Intl.NumberFormat('pt-PT', { useGrouping: 'always' })` ("3 500").

Em ecrãs estreitos os títulos descem com `clamp()`; nunca ficam fixos.

---

## Forma e espaçamento

- **Imagens:** sem cantos arredondados, sem borda. Proporção 4:5 nas grelhas de produto.
- **Botões e filtros:** botão principal retangular (sem raio); filtros e opções em **pílula** (`border-radius: 999px`); cores em círculo.
- **Campos:** raio de 2px.
- **Sem sombras.** O anel da cor escolhida é `box-shadow` de contorno (`0 0 0 3px ground, 0 0 0 5px amber`), não sombra.
- Margem lateral: **56px** desktop; **20px** telemóvel. Largura máxima 1440px.
- Entre secções: **140px** desktop; **88px** telemóvel.
- Grelhas de produto: espaço de 24px entre colunas, 72px entre linhas.
- Alvos interativos: **44px** (padrão), **56–60px** (ação principal). Nunca abaixo de 44px.

---

## Componentes

- **Cabeçalho:** 88px. Na página inicial fica **por cima da fotografia**, transparente; nas outras, fundo `ground` com linha inferior. Logótipo branco à esquerda (26px de altura), categorias ao centro, pesquisa, conta e carrinho à direita (ícones de traço, contador do carrinho em âmbar). Em telemóvel, menu à esquerda e categorias escondidas.
- **Herói:** fotografia de ponta a ponta (~900px), escurecida em baixo; título grande no canto inferior esquerdo, segunda linha em âmbar; parágrafo curto e o botão principal.
- **Mosaico de categorias:** grelha de 12 colunas com peças de tamanhos diferentes (8+4 em cima, 4+4+4 em baixo), 12px entre elas. Cada peça: fotografia, nome em Archivo grande e uma linha em mono ("De correr, de batente e pedonais · desde 1 290 €"), seta num círculo de traço que fica âmbar no hover.
- **Produto em grelha:** fotografia 4:5 sem moldura; por baixo, nome, descrição curta em `text-muted` e preço "desde" em mono. No hover: a imagem aproxima 4% e aparece o botão "Configurar" em âmbar sobre a fotografia (sempre visível em telemóvel).
- **Filtros:** pílulas; selecionada = fundo `text`, letra `on-amber`; não selecionada = transparente com borda `line-strong`. `aria-pressed` sempre.
- **Configurador:** duas colunas (7/5). À esquerda, a vista (fotografia, ambiente, desenho cotado, 3D) fixa ao scroll, com miniaturas por baixo. À direita: etiqueta, nome grande, descrição, **preço grande em mono** que muda ao vivo, e as opções separadas por linhas de 1px, sem caixas. Botão principal em largura total: "Adicionar ao carrinho · 2 786,43 €".
- **Desenho cotado:** o único bloco claro (`paper`); peça em linhas da cor escolhida, cotas e valores em `dim`, em mono.
- **Visualizador 3D:** palco `stage` em largura total; controlos em pílulas por cima (rodar sozinho, abrir/fechar, repor vista); opções por baixo. Ver `docs/mockup-v2/README.md` (secção Vista 3D).
- **Faixa fotográfica:** fotografia de ponta a ponta escurecida a ~72%, título grande e passos numerados (número em mono âmbar, linha superior de 1px).
- **Lista de modelos:** linhas com nome à esquerda e preço em mono à direita, separadas por 1px; o nome fica âmbar no hover.
- **Ligações de texto:** sublinhado de 1px semitransparente, que fica âmbar no hover.
- **Rodapé:** sem faixa; logótipo branco, colunas Loja / Ajuda / Legal. Inclui sempre: termos, privacidade, cookies, Livro de Reclamações, resolução de litígios. Meios de pagamento e "Preços com IVA incluído".

---

## Fotografia

- Arquitetura moderna, luz quente, de preferência ao fim do dia ou à noite. Produto no local, não em fundo branco.
- No site final: **fotografias das obras da Habinox**. As do mockup são do Unsplash e só ilustrativas (lista em `docs/mockup-v2/README.md`). Pedir ao Bruno fotos recentes, em alta resolução, ao fim do dia, de todas as famílias (faltam guardas, chaminés e caixas de correio).
- Nunca imagens do Pinterest (direitos de terceiros).

---

## Comportamento

- **Foco visível sempre:** anel de 2px em `text`, afastado 3px.
- Interativos são sempre `<button>`, `<a href>` ou `<input>` com `<label>`; nunca `div` com clique.
- Ícones: traço fino (1,5px), em linha. Sem ícones preenchidos nem emojis.
- Movimento: imagens aproximam devagar no hover (`1.1s cubic-bezier(.16,1,.3,1)`); setas deslizam 4px. Tudo respeita `prefers-reduced-motion` (sem zoom, sem rotação automática no 3D).
- Telemóvel: grelhas passam a 1 coluna; o mosaico de categorias fica em coluna com peças de 380px.

---

## Backoffice

**«Ficha de fabrico»** (aprovada a 2026-11-05). Um ecrã de trabalho, usado horas seguidas pelo Bruno, que não é técnico: área de trabalho clara e calma, numa moldura da mesma família da loja. Componentes partilhados em `src/components/admin/`, primitivos em `src/components/ui/`; o `<body>` do backoffice leva `data-admin`, que ativa as regras abaixo sem tocar na loja.

### Moldura

- **Barra lateral grafite** `rail #181715` (o `night-surface` da loja) com o logótipo branco a 125×24 e «Backoffice» em `rail-muted`. Fixa ao scroll a partir de 1024px (240px de largura); abaixo disso passa a uma barra de topo de 56px com o menu, que abre uma folha à esquerda com a mesma navegação.
- **Navegação agrupada pelo trabalho:** Painel · Vendas (Encomendas, Clientes) · Catálogo, pela ordem em que se cria (Categorias, Opções, Regras indentada, Produtos) · Custos (Materiais e custos, Mão de obra) · Configuração (Traduções, Parâmetros). Ícones lucide de 16px, traço 1,5. Item ativo: fundo `rail-active`, texto `rail-text-strong` e um **traço âmbar de 2×12px** à esquerda (a única marca de «está aqui»). Ativo = o endereço mais longo que é prefixo da página.
- **Contagens só quando há trabalho** (Encomendas por tratar, materiais que precisam de atenção, secções sem margem): quadrado âmbar de 6px e o número; o leitor de ecrã ouve «Encomendas, 3 por tratar».
- **Rodapé da barra:** saúde do ERP (ponto verde/âmbar/vermelho e «Custos do ERP: ontem às 20:46»), «Ver a loja» e a sessão com «Sair».

### Cor

O **âmbar** passa a ser o único acento, com o mesmo papel que tem na loja; o **azul** `#2005A2` fica no logótipo e no tom «info» dos estados.

| Token                                | Hex                               | Uso                                                                   |
| ------------------------------------ | --------------------------------- | --------------------------------------------------------------------- |
| `canvas`                             | `#F5F4F1`                         | Fundo de trabalho                                                     |
| `surface`                            | `#FFFFFF`                         | Painéis, tabelas, campos                                              |
| `surface-alt`                        | `#EAE8E3`                         | Hover de linha, campo só de leitura, bloco interno do talão           |
| `line-soft` / `line` / `line-strong` | `#EDECE8` / `#DAD8D2` / `#85827A` | Divisão de linhas / contornos / bordas de campos e botões secundários |
| `ink` / `ink-soft`                   | `#15171A` / `#33373D`             | Texto                                                                 |
| `steel` / `steel-light`              | `#4A4F56` / `#5A5F66`             | Ajudas / metadados (mínimo 12px). `mist` nunca em texto               |
| `amber` / `amber-hover` / `on-amber` | `#D6A25E` / `#E4B676` / `#15120E` | Botão principal (um por ecrã), traço do item ativo, contagens         |
| `amber-border`                       | `#B5864A`                         | Contorno do botão principal                                           |
| `amber-ink`                          | `#8A5A1E`                         | Ligações, foco, cursor, caixas de seleção                             |
| `amber-wash`                         | `#F6ECDD`                         | Zona de largar ficheiros ativa                                        |
| `rail*`                              | `#181715` …                       | Barra lateral (fundo, linhas, hover, ativo, texto)                    |

- **Nunca `text-amber` sobre fundo claro** (2:1): para texto e ligações usa-se `amber-ink`. As ligações no meio do texto usam a utilidade `link-admin` (sempre sublinhadas, não só no hover).
- **Tons de estado** (texto / fundo / linha), sempre com texto, nunca só cor: `ok` `#1E5E3B` / `#E4F2E9` / `#B9DCC6` · `warn` `#7A4310` / `#FBF1DE` / `#E9CC93` · `danger` `#9B2019` / `#FBEAE8` / `#F0BDB7` · `info` `#2005A2` / `#EEEDF8` / `#CFCBEE` · `quiet` `#33373D` / `#EAE8E3` / `#DAD8D2`. «Em preparação» é uma etiqueta com borda tracejada. `error #B3261E` só na borda de 2px de um campo com erro.
- Os nomes e tons de cada estado vivem num só sítio, `src/components/admin/status.ts` (encomendas, versões, produtos, materiais, sincronização, traduções, consentimentos, categorias).

Contrastes verificados: `amber-ink`/`canvas` 5,36 · `amber-ink`/branco 5,90 · `on-amber`/`amber` 8,17 · `rail-text`/`rail` 10,15 · `rail-muted`/`rail` 4,99 (só 12px+) · `ok` 6,68 · `warn` 7,10 · `danger` 6,90 · `info` 11,28 · `quiet` 9,77 (cada um sobre o seu fundo).

### Tipografia

- Escala fechada 12/13/14/15/18/24px; nada abaixo de 12px.
- **h1** em Archivo a 24px, peso 600, `font-stretch: 115%` (o parentesco com a loja). **h2** de secção 18px e **h3** 15px em **Plex Sans** semibold.
- Corpo 14px; rótulos 14px médio; ajudas 13px `steel`; metadados 12px `steel-light`; cabeçalhos de tabela 12px médio `steel`, em sentence case, sem faixa de fundo.
- **Números em Plex Sans com algarismos tabulares**, alinhados à direita, com a unidade em `steel` depois de um espaço («1 000 mm», «18,50 €/m»).
- **Mono só para códigos e expressões:** número de encomenda, código do ERP, expressões de fórmula, letras de variável (L, H), endereço/slug em pré-visualização. **Nunca** em dinheiro, medidas, telefone, NIF, rótulos ou títulos. (Na loja, a regra do mono mantém-se como está.)

### Forma, espaço e movimento

- Raio de 2px em tudo. **Sem sombras**, exceto no que flutua (menu, popover, folha, diálogo, toast): `0 12px 32px -12px rgb(21 18 14 / .28)` com borda `line`.
- Página a 1200px (formulários simples a 720px), margens de 16px no telemóvel e 32px a partir de 768px; 48px entre secções, 16px entre campos, 6px do rótulo ao campo, painéis com 20px de padding.
- Campos e botões com 40px de altura (44px em ecrãs de toque); campos a 16px no telemóvel (evita o zoom do iOS). Linhas de tabela com 48px.
- Foco: anel de 2px `amber-ink` afastado 2px; na barra escura, anel `amber`.
- Movimento só como resposta: cores a 150ms, botões que encolhem 2% ao carregar, folha do telemóvel a 240ms `cubic-bezier(.32,.72,0,1)`. Nada entra a animar. Com movimento reduzido, só opacidade e cor.

### Componentes

- **PriceTicket, a assinatura do backoffice:** o preço na loja com IVA em grande (28–32px), «sem IVA» por baixo, a decomposição recolhida em «Como se chega a este preço» com guias pontilhadas até ao valor, e à parte, em `surface-alt`, o custo estimado e a margem bruta com «Só para si, o cliente não vê». Serve todos os sítios onde há dinheiro.
- **Botões:** primário âmbar (um por ecrã); secundário branco com borda `line-strong`; ghost; destructive em texto vermelho; `danger` cheio só para confirmar dentro de um diálogo. A carregar, dizem «A guardar…» sem mudar de largura.
- **Confirmações:** em linha (ConfirmButton) para o que se desfaz; diálogo (ConfirmDialog) que diz a consequência para o que não se desfaz ou tem efeito comercial (publicar, IVA, estado de encomenda com email, apagar dados). As ações destrutivas ficam à esquerda ou numa «Zona de perigo», nunca junto de Guardar.
- **Tabelas** sem zebra; linha inteira clicável; abaixo de 768px passam a cartões. **Filtros** em separadores sublinhados, com contagens, na URL. **Avisos** (Notice) com fundo e linha do tom, sem borda esquerda grossa. **Estados vazios** que ensinam e dão a ação.
- **Datas** sempre com `src/lib/format-date.ts` (Lisboa, pt-PT): nas listas o tempo relativo («ontem às 20:46»), nas fichas a data completa («5 nov 2026, 10:53»). Nunca o ano com 2 dígitos.

### Texto e glossário

Português de Portugal, na voz da oficina. Os botões dizem o que fazem («Criar produto», «Publicar na loja», «Passar a produção»). Títulos curtos, uma frase de descrição, a explicação longa num «Como funciona?» recolhido. Os erros dizem o problema e a saída («Escreva um número entre 0 e 30.»); o detalhe técnico vai para «Detalhe para o suporte». O ERP chama-se sempre «ERP».

| Em vez de              | Escrever                                                        |
| ---------------------- | --------------------------------------------------------------- |
| Rascunho               | Em preparação                                                   |
| Validada               | Pronta a publicar                                               |
| Publicada              | Na loja                                                         |
| Criar versão nova      | Fazer alterações                                                |
| Variáveis calculadas   | Contas auxiliares                                               |
| Chave (nome técnico)   | Nome usado nas fórmulas (só em Avançado)                        |
| Artigo do ERP          | Material (do ERP)                                               |
| Sector                 | Secção da oficina                                               |
| Por omissão            | Vem escolhido                                                   |
| Números para a fórmula | Números para as contas                                          |
| Tirar                  | Remover                                                         |
| Margem                 | Margem (% sobre o custo), sempre com o preço com margem ao lado |

---

## Logótipo

Ficheiros em `public/brand/`, redesenhados em SVG a 2026-10-26 a partir do único original que existe (JPEG); **a validar com o Bruno**.

| Ficheiro                      | Uso                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `habinox-logo.svg`            | Logótipo completo, com "Trabalhos e soluções em inox" (documentos, emails, cartazes); só a partir de ~100px de altura, abaixo disso o slogan não se lê |
| `habinox-logo-sem-slogan.svg` | Fundos claros (backoffice, documentos)                                                                                                                 |
| `habinox-simbolo.svg`         | Só o símbolo (favicon = `src/app/icon.svg`, espaços pequenos)                                                                                          |
| `habinox-logo-branco.svg`     | **Loja** (cabeçalho e rodapé, sobre o fundo escuro) e barra do backoffice                                                                              |

- Cores do logótipo: azul `#2005A2` e cinzento `#8D8F8C`. Na loja escura usa-se só a versão branca.
- Altura mínima do logótipo sem slogan: 24px; abaixo disso, usar o símbolo. Não deformar, não recolorir além da versão branca, não pôr sobre fotografia sem fundo liso ou escurecido.

## Contexto

Cliente: **Bruno Miguel Freitas, Lda** (Habinox), serralharia em Esposende (Núcleo Industrial de Antas). Portões, escadas, guardas, chaminés, chapéus de chaminé e caixas de correio, quase tudo por medida, em inox, ferro e alumínio.
