# Mockup da loja — v2 (aprovado)

Segunda versão do mockup, feita a 2026-10-27 depois de o Bruno achar a primeira (`docs/mockup/`) "muito simples e quadrada, com muitas caixas". Pediu algo mais apelativo, no estilo de imagens de arquitetura moderna do Pinterest. **Aprovada a 2026-10-27:** "A ideia é mesmo esta com um ar de arquitectura moderna, é este o caminho."

- **Ver online:** https://claude.ai/artifact/SbBGznCFf11VEcdd7YUev3 — privado; partilhar pelo menu _Share_.
- **Estes ficheiros** são a cópia do código do canvas. A fonte de verdade é o canvas online; ao alterar, atualizar aqui também.
- A identidade visual correspondente está no [`DESIGN.md`](../../DESIGN.md).

| Ficheiro                  | Ecrã                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `Main.dc.html`            | Loja — início: herói em fotografia, 5 categorias em mosaico, mais configurados, como comprar |
| `Categoria-Portoes.dc.html` | Categoria Portões, com filtros por tipo (funcionam)                                        |
| `Configurador.dc.html`    | Configurador do portão de correr Linear: preço ao vivo, desenho cotado, opções em linhas      |
| `Configurador-3D.dc.html` | Vista 3D do portão: rodar, aproximar, rodar sozinho, abrir o portão, mudar material e cor    |
| `Mobile-Loja.dc.html`     | Loja — início a 390 px (cópia do `Main`; só mudam o `<title>` e o `$preview`)               |
| `canvas.json`             | Disposição no canvas e notas para o Bruno                                                   |
| `img/`                    | Fotografias usadas (cópia local, ver abaixo)                                                |

Os ficheiros `.dc.html` precisam do runtime do canvas para correr.

## O que mudou em relação à v1

- **A loja é só loja:** produtos, medidas, preço e carrinho. A história da Habinox, a oficina e os contactos ficam na página de apresentação do site.
- **Menos caixas:** fotografias grandes sem moldura; opções do configurador separadas por linhas finas.
- **Escuro com luz quente:** grafite quente + âmbar, como a luz LED das referências do Bruno. O azul do logótipo sai da interface da loja (sobre fundo escuro não tem contraste).
- **Títulos grandes e finos** (Archivo larga, peso 300).

## Imagens

Fotografias do [Unsplash](https://unsplash.com) (licença Unsplash: uso livre, sem atribuição obrigatória), **ilustrativas**: não são obras da Habinox. No site real entram fotografias das obras. Não se usaram imagens do Pinterest (direitos de terceiros).

| Ficheiro em `img/`        | Unsplash (`images.unsplash.com/photo-…`) | `/_blob/` no canvas                |
| ------------------------- | ---------------------------------------- | ---------------------------------- |
| `hero-escada-luz.jpg`     | `1773565181326-a6331eeca84b`             | `f72a7c43315a8e61597e686334d258c5` |
| `portao-geometrico.jpg`   | `1781155922144-21323fb774a0`             | `50205ecb1cee00ee7bd06796adbd524d` |
| `portao-moradia.jpg`      | `1780377816572-e48c80e9e3cd`             | `0e6102f23bdfa3cd6d1aa4461d993c1c` |
| `portao-perfurado.jpg`    | `1602794071963-1c4e57a4a4ee`             | `31491adc8a0d651ab5ab69f7500a6642` |
| `portao-correr-cinza.jpg` | `1788009145769-e278b44782ee`             | `1dc911186af6321cb85719fc4a444f27` |
| `portao-ripas.jpg`        | `1787002973888-dc0b5477ed09`             | `444be6fc7de7c158ca1e6dac2c861618` |
| `portao-pedonal.jpg`      | `1576169510450-fd0392650023`             | `bd354ade49015a76a984257d2ba3384e` |
| `escada-madeira-luz.jpg`  | `1505569546356-cee51978f134`             | `a83d494b95489d767f6dfb2e7d800b6e` |
| `escada-caracol.jpg`      | `1526573059328-179b147e1b42`             | `554b4b04d631052daf4790ce36bc9010` |
| `escada-corrimao-luz.jpg` | `1584259097593-a34c6bc53860`             | `45bee996dccb515a9a8560ad4d7db40d` |
| `guarda-preta.jpg`        | `1761414500563-8fb23838a59a`             | `caea9a8c8c66d7903b6cb44d085d25c5` |
| `guarda-varanda.jpg`      | `1774685110793-e427dfa87467`             | `fa0730aa51c5e9d2a939021cba546b5d` |
| `chamine-chapeus.jpg`     | `1742466997231-5056adc35ec0`             | `aa4da90df129b6bbe334bd716f81a15c` |
| `caixa-correio.jpg`       | `1775470060697-940d621135a5`             | `fdcff9307c1ea7525b548ae24905facb` |
| `casa-noite.jpg`          | `1748063578185-3d68121b11ff`             | `d39e464b6387ef6a4f0db8e088819057` |

Outros ficheiros do canvas: logótipo branco (`public/brand/habinox-logo-branco.svg`) = `2e3bd2009f6755044ea2b243e813c2a3`; three.js r149 (`three/build/three.min.js`, MIT) = `35f8d316ff779cb0c4f3918ed2996646` (não copiado para aqui: vem do npm).

## Vista 3D

- O portão é **desenhado em código** (three.js) só para o mockup. No site, o modelo vem do **GLB exportado do TopSolid**.
- No beta o 3D muda **material e cor**; as medidas entram no preço, não no modelo (`CLAUDE.md`).
- **Abrir o portão** não está escrito no âmbito da fase 1. Estimativa: 8–15 h (nomes das peças, pivô das folhas de batente, validação no backoffice, testes com ficheiros reais). Decidir com o Bruno se entra na fase 1 ou na fase 8.
- Regras de exportação pedidas ao Bruno (email de 2026-10-27):
  - Peças que se mexem: `folha` (correr, pedonal, 1 folha); `folha_esquerda` e `folha_direita` (batente de 2 folhas, vistas da rua).
  - Material das partes que levam a cor do cliente: `acabamento` (`acabamento_2` se houver uma segunda cor). As cores RAL não vão no ficheiro: vêm do backoffice.
  - GLB, peças separadas, portão fechado nas medidas standard, sem muros nem chão, nomes sem acentos nem espaços; nos de batente, origem de cada folha na dobradiça (se não der, corrige-se na importação).
  - Pedidos 2 ficheiros de teste (um de correr, um de batente).
- No site: react-three-fiber, GLB comprimido (gltf-transform com Draco ou Meshopt), carregado só quando o cliente abre a vista 3D. No backoffice, por produto: ficheiro, peça que se mexe, movimento (deslizar/rodar), eixo e quanto; ao carregar, verificar que as peças com esses nomes existem.

## Valores de exemplo

- Nomes dos modelos (Linear, Prisma, Órbita, Horizonte, Ritmo, Passo, Noite, Traço) e preços "desde": inventados.
- Preço do configurador: a mesma fórmula de exemplo da v1 (`docs/mockup/README.md`). Com 4 000 × 1 600 mm, ferro lacado, barras, sem motor: 2 786,43 €.
- Na vista 3D as opções não passam do configurador (cada ecrã do canvas tem o seu estado); no site passam.
