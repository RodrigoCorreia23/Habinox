# Mockup final da loja

Mockup de alta fidelidade da fase 0, feito a 2026-10-26 a partir dos wireframes (`docs/wireframes/`), do `DESIGN.md` e do logótipo em SVG. Serve para validar o aspeto final com o Bruno.

- **Ver online:** https://claude.ai/artifact/Lr38BFXy4aW4uXqiTbG64a — privado; partilhar pelo menu _Share_ para outras pessoas o abrirem.
- **Estes ficheiros** são a cópia do código do canvas. A fonte de verdade é o canvas online; ao alterar, atualizar aqui também.

| Ficheiro                                                             | Ecrã                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Versão clara** (paleta atual do `DESIGN.md`)                       |                                                            |
| `Main.dc.html`                                                       | Página inicial                                             |
| `Configurador.dc.html`                                               | Configurador do portão de correr, com preço ao vivo        |
| `Mobile-Inicio.dc.html`, `Mobile-Configurador.dc.html`               | Os mesmos ecrãs a 390 px                                   |
| **Versão escura** (regra 60/30/10, pedido do Bruno)                  |                                                            |
| `Escuro-Inicio.dc.html`, `Escuro-Configurador.dc.html`               | Página inicial e configurador                              |
| `Escuro-Mobile-Inicio.dc.html`, `Escuro-Mobile-Configurador.dc.html` | Os mesmos ecrãs a 390 px                                   |
| `canvas.json`                                                        | Disposição no canvas e notas para o Bruno                  |
| `img/`                                                               | Fotografias usadas (cópia local, ver abaixo)               |

As cópias de telemóvel são geradas a partir das de desktop: só mudam o `<title>` e o `$preview` (390 px). Os ficheiros `.dc.html` precisam do runtime do canvas para correr.

## Versão escura (60/30/10)

- **60% grafite `#1F2225`**: fundo, cabeçalho, barra de categorias, rodapé (`#171A1C`).
- **30% pedra `#E4E1DA`**: cartões de produto (área do desenho `#D6D2CA`), painéis do configurador, faixa Área Pro, cartão de contactos.
- **10% azul `#2005A2`**: só dentro da pedra (botões Configurar, cotas, preço). Sobre o grafite o contraste é 1,37:1, por isso o logótipo fica em branco e o botão principal do topo é cor de pedra.
- Texto sobre grafite: `#F2F0EB` (principal), `#B9BDC2` (secundário), `#9AA0A6` (apoio). Linhas `#33373D`.

Se for a escolhida, a paleta do `DESIGN.md` e o tema em `src/app/globals.css` têm de ser atualizados.

## Imagens

As fotografias são obras reais da Habinox, tiradas do site atual (habinox.pt, galeria de 2010–2015), recortadas e comprimidas. No canvas estão carregadas como ficheiros do artifact (`/_blob/<id>`); a correspondência é:

| Ficheiro em `img/`          | `/_blob/`                          |
| --------------------------- | ---------------------------------- |
| `hero-portao-correr.jpg`    | `7d32345dadda073ee271c5f4a99d07b2` |
| `portao-inox.jpg`           | `d0792322cbc7a8d0c52a6aebc896e22b` |
| `portao-correr-preto.jpg`   | `eee6e51229fecb850f401da3c77a8edd` |
| `portao-lacado-moradia.jpg` | `be29ecea02f0c324a30a94f7be7f61a7` |
| `escada-caracol.jpg`        | `eaf109247e753c5ae323bd4006762199` |
| `escada-reta.jpg`           | `ea1ac8be6e5cc36387ea286df2753f3a` |
| `hotte-inox.jpg`            | `8da9eb71bee51a26d490c138275585a9` |
| `soldadura.jpg`             | `0f9942acf314d1269148d91d7d0f2c86` |
| `oficina.jpg`               | `de360302b7e4f926a6adc1de1556e010` |
| `fachada.jpg`               | `9133f8a40e82c376c6398f3c162f701f` |
| `portao-batente-lacado.jpg` | `529c8754c3e48399327feec5102c99da` |
| `portao-vidro.jpg`          | `63f64fd504410926dc39c226fce67f71` |

Logótipo: `public/brand/habinox-logo-sem-slogan.svg` = `3b0ce8b547e11738f50d7c85d3613cfd`; `habinox-logo-branco.svg` = `8ea8da606b3ba2bba359eb9ae50b3951`.

Pedir ao Bruno fotografias recentes e de maior resolução, sobretudo de guardas, chaminés e caixas de correio (não há nenhuma).

## Valores de exemplo

- **Preço do configurador:** fórmula de exemplo no modelo do Bruno (materiais + consumíveis 10% + horas × 25 €/h, ÷ (1 − 45%), + componentes a preço de venda + instalação; IVA 23% no total, ao cêntimo). **Não são os custos da Habinox.** Com 4 000 × 1 600 mm, ferro lacado, barras, sem motor: 2 786,43 €.
- Prazo de fabrico (5 semanas), limites de medidas e preço da instalação: exemplos.
- Textos da empresa (desde 2005, equipamento, Núcleo Industrial de Antas, contactos) adaptados do site atual.
- Texto da exclusão de devolução: a validar por jurista.

## Nota técnica

O runtime do canvas embrulha o texto interpolado (`{{…}}`) num `<span>` e, dentro de um `<text>` de SVG, o browser não o desenha. Por isso as cotas do desenho do configurador são texto HTML posicionado por cima do SVG. O configurador dos wireframes (`docs/wireframes/Main.dc.html`) ainda tem este problema: as cotas não aparecem.
