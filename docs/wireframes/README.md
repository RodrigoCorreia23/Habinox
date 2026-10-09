# Wireframes da loja

Protótipos clicáveis da fase 0, para validar com o Bruno antes de programar.

- **Ver online (canvas com notas e perguntas):** https://claude.ai/artifact/Vi61zk6137BkzVVcppTCc6 — privado; partilhar pelo menu *Share* para outras pessoas o abrirem.
- **Estes ficheiros** são a cópia do código do canvas, para estarem disponíveis noutras máquinas. A fonte de verdade é o canvas online; ao alterar, atualizar aqui também.

| Ficheiro | Ecrã |
|---|---|
| `Main.dc.html` | Configurador do portão de correr (desenho com medidas, material, opções, instalação, preço) |
| `Carrinho.dc.html` | Carrinho (ficha de cada artigo, quantidade, remover, carrinho vazio) |
| `Checkout.dc.html` | Dados, entrega/levantamento, faturação com NIF, pagamento (cartão, MB WAY, Multibanco), consentimentos |
| `Confirmacao.dc.html` | Confirmação: pago na hora ou referência Multibanco por pagar |
| `Formulas.dc.html` | Backoffice: fórmula de preço (linhas de custo com expressões, condições por opção, teste ao vivo, comparação com orçamentos reais, rascunho → validada → publicada) |
| `canvas.json` | Disposição no canvas e notas com as perguntas para o Bruno |

Os ficheiros `.dc.html` são do formato *Design Component* do canvas (precisam do runtime do canvas para correr; não abrem diretamente no browser).

## Direção visual ("ficha de fabrico")

- Fundo `#F2F3F2`, superfícies `#FFFFFF`, texto `#22262A`, secundário `#5D656A`, acento único `#2238A8` (azul de traçagem), erro `#B3261E`.
- Tipografia: Archivo (largura variável): títulos e preços comprimidos e pesados; algarismos tabulares nas medidas.
- Elemento principal: desenho cotado do portão gerado a partir das medidas (o 3D do beta não muda de tamanho).

Tudo o que é número, regra ou opção nos wireframes é **exemplo** até o Bruno confirmar; preços aparecem como `[preço]`.
