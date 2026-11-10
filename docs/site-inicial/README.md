# Apresentação inicial da Habinox

- `index.html`: protótipo original, com percurso de câmara renderizado em Blender.
- **`realista.html`: variante fotorrealista**, com a mesma estrutura, catálogo, configurador demonstrativo e navegação.

## Abrir

Para ver a animação, servir esta pasta por HTTP:

```sh
python3 -m http.server 4173 --directory docs/site-inicial
```

Visitar `http://localhost:4173/realista.html`. A primeira vista é a loja; `#inicio` abre a apresentação da empresa.
O botão **Entrar** mostra a transição para o formulário; `#entrar` abre diretamente o enquadramento final.

## Direção da variante

A escada helicoidal da Habinox continua a organizar o espaço. A imagem foi transformada num estudo de casa habitada: chão de carvalho, linho, livros, chá, plantas, luz quente e jardim ao fim do dia. Mantêm-se a composição da página e as fontes existentes; não foi sorteada uma identidade alternativa porque o pedido foi reproduzir a página com maior realismo.

A variante usa **duas imagens geradas**, uma horizontal e outra vertical, projetadas numa malha com profundidade em WebGL. As máscaras de iluminação dos degraus usam as coordenadas da fotografia e acompanham o movimento. Trata-se de uma reprojeção 2.5D para uma órbita pequena, não de uma nova renderização do percurso 3D de 160 fotogramas. O original continua disponível em `index.html` e os seus assets não foram alterados.

- `realista.css`: enquadramento, legibilidade, estados e comportamento responsivo.
- `realista.js`: movimento do ambiente e ligação à navegação existente.
- `realista-renderer.js`: malha de profundidade, máscaras dos LEDs e shaders WebGL.
- `cenarios/realista.mjs`: gera `realista.html` a partir do original e das alterações da variante; falha se as âncoras da origem mudarem.
- `img/casa-realista/`: imagens, originais e prompts completos em [`PROMPT.md`](img/casa-realista/PROMPT.md) e [`PROMPT-PORTRAIT.md`](img/casa-realista/PROMPT-PORTRAIT.md).

Depois de mudar o CSS, basta atualizar o navegador. Depois de mudar o JavaScript ou o original:

```sh
node docs/site-inicial/cenarios/realista.mjs
```

## Movimento e carregamento

As imagens WebP são locais. Até 900 px usa-se uma composição vertical própria. A imagem HTML serve de alternativa estática se não houver JavaScript/WebGL ou se o contexto gráfico se perder. Abrir por `file://` pode impedir o uso de texturas WebGL; usar o servidor local para a experiência animada.

- **Abertura:** as fitas dos degraus visíveis acendem de baixo para cima, com 2,2 s entre o início do primeiro e do último degrau e uma transição suave por degrau. A sequência termina cerca dos 2,8 s. O texto entra a partir de 1,1 s e o movimento da câmara começa aos 3,2 s, seguindo os tempos do original.
- **Repouso:** vaivém sinusoidal de 24 s, com amplitude de cerca de 1,6° para cada lado. A escada e a sala têm profundidades diferentes; já não é uma ampliação CSS da imagem inteira.
- **Entrar:** aproximação e deslocamento lateral da mesma imagem, com a curva `cubic-bezier(.77,0,.175,1)` e os 2,3 s da transição original. A escada fica à esquerda e o formulário conserva a entrada sequencial original. O percurso é menor no telemóvel. Voltar à loja inverte o movimento a partir da posição atual, mesmo durante uma transição; o vaivém retoma a fase guardada.
- **Scroll:** o ciclo abranda quando se desloca a página e retoma a partir da mesma fase. Suspende fora do herói, noutras páginas da loja e com o separador oculto.
- **Controlos:** “Pausar ambiente” congela a iluminação e o vaivém; a navegação para Entrar continua a responder. “Repetir luzes” reinicia a abertura. Movimento reduzido mostra a fotografia estática e iluminada.
- **Custo:** desenho limitado a 30 fps e densidade de píxeis a 1,5, sem bibliotecas novas ou carregamento dos 160 fotogramas originais.

## Limites do protótipo

As imagens representam um estudo de ambiente, **não fotografias de obras realizadas**. A legenda foi corrigida e os números provisórios de clientes e toneladas não aparecem nesta variante. Preços, modelos, autenticação e carrinho continuam a ser demonstrações herdadas do protótipo. Esta alteração não implementa o catálogo de produção nem altera a página da app Next.js.

Para percursos largos e novos ângulos com ocultações fisicamente corretas, é necessário levar a direção visual para a cena Blender e voltar a renderizar a sequência completa. A malha atual suporta o pequeno vaivém e o reenquadramento do login; não contém a geometria completa da casa nem reproduz o novo ponto de vista 3D do original.
