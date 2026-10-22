# Análise dos orçamentos reais — 2026-10-14

O Bruno enviou 4 orçamentos em Excel (`MODELOS ORÇAMENTOS.7z`). **Os ficheiros não entram no repositório**: têm nomes de clientes e custos internos. Ficam com o Rodrigo; aqui só a estrutura e os números necessários para o motor de preços. Os orçamentos são identificados por letra.

| Ref. | Produto                                   | Total s/ IVA |
| ---- | ----------------------------------------- | -----------: |
| A    | Chaminé / hotte (inox 304, motor, LED)    |   1 187,64 € |
| B    | Escada (tubo 150×150 e 120×120, lacada)   |   2 526,96 € |
| C    | Guarda em inox 304 (barras e varão)       |  15 577,46 € |
| D    | Guarda em inox 316 (tubo, com instalação) |  12 958,35 € |

## Como o Bruno calcula hoje

Todos seguem o mesmo modelo, que encaixa no nosso desenho de "linhas de custo":

```
1. Materiais        Σ (quantidade × preço unitário)          unidades: und., ml, m²
2. Consumíveis      % sobre os materiais                     10% ou 15%
3. Mão de obra      Σ (horas × taxa) por sector              23,50 €/h; corte laser 120 €/h
   ─────────────────────────────────────────────
   Custo direto  =  1 + 2 + 3
4. Preço s/ IVA  =  custo direto / (1 − margem)              margem 50% → preço = 2 × custo
```

Conclusões para o `lib/pricing`:

- **A margem é sobre o preço de venda, não sobre o custo.** Com 50%, o preço é o dobro do custo (não 1,5×). A fórmula tem de ser `custo / (1 − margem)`, e o backoffice tem de dizer isto claramente.
- **Taxa horária por sector**, não uma única: a mão de obra normal é 23,50 €/h, o corte laser 120 €/h. → tabela de sectores/postos de trabalho com taxa própria (em `settings` ou tabela dedicada), referida pelas linhas de mão de obra.
- **Consumíveis em % dos materiais**, como linha própria da fórmula (parâmetro por produto, com valor por omissão).
- **Serviços externos ao m²** (lacagem 22 €/m², decapagem 9,50 €/m²) entram como linhas de "material" com quantidade em m² → a área a tratar tem de ser uma expressão das medidas.
- **Preço por kg convertido em ml**: em C o preço unitário é `kg/m × €/kg` (ex.: `4 × 2,8`). Se o PHC tiver o custo ao kg, a linha precisa de um **fator de conversão** (peso por metro) por artigo.
- **Arredondamento:** nenhum orçamento arredonda. Perguntar se quer arredondar no site.
- **Instalação** aparece como mais uma linha de horas (A: 4 h; D: 32 h), com margem por cima. O Bruno respondeu "preço da zona + horas": a instalação passa a ser **opcional** com taxa por zona + horas da fórmula.

## O que falta para passar a fórmulas

Os Excel têm as **quantidades totais**, mas **não as medidas** da peça. Para escrever `quantidade = f(L, H, …)` é preciso saber as medidas de cada orçamento (ou um desenho). Exemplo com a guarda D (78 ml de corrimão e travessa, 576 ml de tubo redondo):

```
corrimão   tubo 50×30   qtd = L
travessa   tubo 40×20   qtd = L
prumos     tubo Ø16     qtd = ceil(L / espaçamento) × H     → com L = 78 m, H ≈ 0,9 m, espaçamento ≈ 0,12 m
horas      montagem     = a + b × L
```

Sem as medidas reais, os coeficientes são palpites. **Pedir ao Bruno: comprimento, altura e desenho/fotos de cada orçamento.**

Nenhum dos 4 é um portão; os produtos-piloto passam a ser os destes orçamentos (guarda, escada, chaminé), conforme decidido ("testamos com os produtos de que ele mandar orçamento").

## Inconsistências nas folhas (avisar o Bruno)

São erros pequenos, mas o site vai reproduzir a fórmula à letra e a validação compara com estes valores.

1. **A:** o total de materiais é `SUM(E5:E9)` e deixa de fora a linha 10 (metal distendido, 13,80 €). Com a margem, o orçamento sai **27,60 € abaixo**. O mesmo intervalo existe nas 4 folhas: qualquer material na linha 10 é ignorado.
2. **A e B:** o resumo diz "Material consumível (15%)" mas a fórmula usa **10%**. Em D usa 15%. Em C o valor está **escrito à mão** (352,51 €, ≈ 7,6%). → Qual é a regra: 10%, 15%, ou depende do produto?
3. **Todas:** o resumo diz "Mão de obra total (5 sectores)" mas A, B e C têm 4.
4. **A:** a lista inclui motor, regulador e projetores LED — componentes comprados, não matéria-prima. No site são **opções com preço fixo** (ou artigos PHC), não quantidades em função das medidas.
