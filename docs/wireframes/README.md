# Wireframes da loja

Protótipos clicáveis da fase 0, para validar com o Bruno antes de programar.

- **Ver online (canvas com notas e perguntas):** https://claude.ai/artifact/Vi61zk6137BkzVVcppTCc6 — privado; partilhar pelo menu *Share* para outras pessoas o abrirem.
- **Estes ficheiros** são a cópia do código do canvas, para estarem disponíveis noutras máquinas. A fonte de verdade é o canvas online; ao alterar, atualizar aqui também.

| Ficheiro | Ecrã |
|---|---|
| **Loja** | |
| `Home.dc.html` | Página inicial: escolher produto e medidas e ir direto ao preço, categorias, como funciona, oficina, Área Pro |
| `Categoria.dc.html` | Categoria Portões: subcategorias com desenho, correr vs batente, pedido especial |
| `Main.dc.html` | Configurador do portão de correr (desenho com medidas, material, opções, instalação, preço) |
| `Carrinho.dc.html` | Carrinho (ficha de cada artigo, quantidade, remover, carrinho vazio) |
| `Checkout.dc.html` | Dados, entrega/levantamento, faturação com NIF, pagamento (cartão, MB WAY, Multibanco), consentimentos |
| `Confirmacao.dc.html` | Confirmação: pago na hora ou referência Multibanco por pagar |
| `Conta.dc.html` | Área de cliente: encomendas com progresso, orçamentos guardados (válido / a expirar / expirado), dados e privacidade (RGPD) |
| `Mobile-Configurador.dc.html`, `Mobile-Checkout.dc.html`, `Mobile-Confirmacao.dc.html` | Os mesmos ecrãs a 390 px (cópias; ao alterar a versão desktop, atualizar também) |
| **Backoffice** | |
| `Produto.dc.html` | Produto: estado, medidas em mm, opções da biblioteca com valores permitidos, regras de combinação |
| `Formulas.dc.html` | Fórmula de preço: linhas de custo com expressões (L, H), condições por opção, teste ao vivo, comparação com orçamentos reais, rascunho → validada → publicada |
| `Encomendas.dc.html` | Encomendas: filtros por estado, detalhe com snapshot de preço e histórico, só transições permitidas, caso "pago depois de expirar" |
| `Materiais.dc.html` | Materiais e sincronização PHC: estado da última sync, caso de falha, sincronizar agora, artigos para rever, histórico de custos e de sincronizações |
| `canvas.json` | Disposição no canvas e notas com as perguntas para o Bruno |

Os ficheiros `.dc.html` são do formato *Design Component* do canvas (precisam do runtime do canvas para correr; não abrem diretamente no browser).

> **Atenção:** a direção visual abaixo foi **substituída** pela identidade do [`DESIGN.md`](../../DESIGN.md) (catálogo técnico: acento `#B8461A`, Archivo + IBM Plex, raio de 2px). Os wireframes valem pela **estrutura, fluxos e regras**; o aspeto final segue o `DESIGN.md`.

## Direção visual antiga ("ficha de fabrico")

- Fundo `#F2F3F2`, superfícies `#FFFFFF`, texto `#22262A`, secundário `#5D656A`, acento único `#2238A8` (azul de traçagem), erro `#B3261E`.
- Tipografia: Archivo (largura variável): títulos e preços comprimidos e pesados; algarismos tabulares nas medidas.
- Elemento principal: desenho cotado do portão gerado a partir das medidas (o 3D do beta não muda de tamanho).

Revisão de UX e acessibilidade: ver `docs/revisao-wireframes.md`.

Tudo o que é número, regra ou opção nos wireframes é **exemplo** até o Bruno confirmar; preços aparecem como `[preço]`.
