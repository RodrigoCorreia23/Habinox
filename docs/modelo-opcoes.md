# Modelo de opções reutilizáveis

Desenho fechado a 2026-10-27, a partir da proposta em `docs/fase-0.md` (secção "Opções configuráveis") e testado contra os 4 orçamentos reais (`docs/orcamentos-analise.md`) e o portão do mockup v2. Desbloqueia o schema da fase 1.

**Em resumo:** o Bruno define cada opção **uma vez**, numa biblioteca. Cada produto escolhe as opções que usa e os valores que permite, com os seus limites. As regras "se… então…" dizem que combinações existem. O preço liga-se às opções por três vias: um valor de opção pode trazer um componente com preço, pode ativar linhas da fórmula, e pode dar números às expressões.

---

## 1. Conceitos

| Conceito               | O que é                                                                                             | Exemplo                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Opção** (biblioteca) | Uma pergunta ao cliente, definida uma vez                                                           | "Motorização", "Material", "Largura"                           |
| **Valor** (biblioteca) | Uma resposta possível de uma opção de escolha                                                       | "Sem motor", "Motor e 2 comandos"                              |
| **Opção do produto**   | A opção, tal como um produto a usa: limites, valores permitidos, valor por omissão, nome na fórmula | Largura do portão de correr: 1 000–6 000 mm, variável `L`      |
| **Regra**              | "Se [condições] então [efeito]"                                                                     | Se Material = Inox → Acabamento só pode ser Escovado ou Polido |
| **Variável calculada** | Um número intermédio da fórmula, com nome                                                           | `degraus = ceil(H / 0,18)`                                     |
| **Linha de custo**     | Material, mão de obra, serviço externo ou componente, com quantidade em função das opções           | Tubo 40×40, `qtd = 2 × (L + H)`                                |

### Tipos de opção

| Tipo        | O cliente vê                                             | Guarda-se                | Na fórmula                                |
| ----------- | -------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| `dimension` | Campo numérico com unidade (mm, cm ou m)                 | inteiro em **mm**        | em **metros** (`L = 4,0`)                 |
| `number`    | Campo numérico sem conversão (quantidade, n.º de cantos) | número                   | o próprio número                          |
| `choice`    | Pílulas, lista ou amostras de cor (`display`)            | chave do valor escolhido | os números do valor (`espacamento.valor`) |
| `boolean`   | Sim/não (interruptor)                                    | `true`/`false`           | `1` ou `0`                                |

Cores RAL são uma `choice` com `display: swatches`; cada valor tem `ral_code` e `swatch_hex`. Um valor pode pedir texto ao cliente (`asks_text`), como "Outra cor RAL → qual?".

### Chaves e nomes

- Cada opção e cada valor têm uma **chave** técnica (`motorizacao`, `motor_2_comandos`): minúsculas, sem acentos nem espaços. **Depois de usada num orçamento, a chave não muda.** O nome que o cliente vê muda à vontade.
- Valores e opções **não se apagam, arquivam-se** (`archived_at`): orçamentos e encomendas antigos continuam a apontar para eles.

---

## 2. Como as opções mexem no preço

Há três vias, que se combinam:

1. **Componente:** o valor traz um componente comprado, a preço de venda (entra depois da margem). Exemplo: "Motor e 2 comandos" → componente "Kit motor correr 400 kg" a 535 €.
2. **Condição numa linha:** a linha só conta se as condições se cumprirem (coluna "Aplica-se" do wireframe das fórmulas). Exemplo: a linha "Chapa lisa" só se aplica se `enchimento = chapa`. Exemplo: a linha "Lacagem (serviço externo)" só se aplica se `acabamento = lacado`.
3. **Números nas expressões:**
   - medidas (`L`, `H`) e opções `number`;
   - **parâmetros dos valores**: cada valor de escolha pode ter números com nome (`params`), usados como `opcao.parametro`. Exemplo: "Espaçamento 12 cm" tem `{ "valor": 0.12 }` → `ceil(L / espacamento.valor)`;
   - booleanos (`1`/`0`): `horas = 2 + 0,5 × L + 1,5 × iluminacao`.

E o **artigo** de uma linha de material pode depender de uma escolha: a linha "Tubo 40×40" aponta para o papel "tubo 40×40" e o artigo PHC resolve-se pelo valor escolhido em `material` (ferro → `TF4040`, inox → `TI4040`). Generaliza o `formula_line_materials` que já estava decidido: em vez de "por material", é "por valor de qualquer opção de escolha" (serve também para o tipo de vidro de uma guarda). Valor sem artigo associado = combinação "não é possível".

### Expressões

Só nas quantidades e nas variáveis calculadas. Parser próprio, **nunca `eval`**:

- números, variáveis, `+ − × ÷`, parênteses;
- funções: `min`, `max`, `ceil`, `floor`, `round`, `sqrt` (acrescento a `floor`, `round` e `sqrt` em relação ao `CLAUDE.md`: a escada precisa de `sqrt` para o comprimento das vigas);
- sem comparações nem `if` dentro da expressão: o "só se" é a condição da linha (estruturada, igual às regras).

---

## 3. Regras

Uma regra é `se [condições, todas] então [efeito]`. Condições sobre opções de escolha (`=`, `≠`, `é um de`), booleanas (`é sim`/`é não`) ou numéricas (`>`, `<`, `≥`, `≤`, em mm para medidas).

| Efeito     | No configurador                            | Exemplo                                                                                      |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `restrict` | A opção só mostra esses valores            | Se Material = Alumínio → Acabamento só pode ser Lacado                                       |
| `hide`     | A opção desaparece (não se aplica)         | Se Acabamento ≠ Lacado → Cor RAL não se aplica                                               |
| `require`  | A opção passa a obrigatória (sem "nenhum") | Se Largura > 4 000 mm → Motorização é obrigatória                                            |
| `forbid`   | A combinação é impossível, com mensagem    | Se Material = Inox e Enchimento = Chapa perfurada → "Não fabricamos chapa perfurada em inox" |

Os quatro efeitos são os do wireframe "Produto e opções".

- **Regras da biblioteca** (sem produto): valem em todos os produtos que usem as opções envolvidas. Exemplo: "Inox → Escovado ou Polido" escreve-se uma vez. **Regras do produto** juntam-se às da biblioteca.
- **Sem ciclos:** uma regra só pode depender de opções que aparecem **antes** da opção que afeta (na ordem do produto). O backoffice recusa o resto. Assim avalia-se tudo numa passagem, de cima para baixo, como o cliente preenche.
- Quando uma regra tira o valor escolhido, o configurador passa ao valor por omissão (ou ao primeiro permitido) e avisa. No servidor, uma configuração com valores não permitidos é **recusada**, nunca corrigida em silêncio.

---

## 4. Versões e histórico

- A configuração de um produto (opções, limites, regras do produto, variáveis, linhas, margem, consumíveis) fica numa **versão do produto**: rascunho → validada → publicada, como o wireframe já mostra ("Publicar alterações"). Proposta: `formula_versions` passa a `product_versions`, porque as linhas dependem das opções e têm de ser publicadas juntas.
- A **biblioteca** (opções, valores, componentes, regras gerais) **não tem versões**: mudar um nome ou o preço de um componente vale logo para todos os produtos, tal como um custo do PHC. O aviso "afeta todos os produtos que o usam" já está no wireframe.
- Orçamentos e encomendas guardam `config` (chaves) **e** o snapshot (nomes, números, artigos, custos, componentes, versão do produto). Dentro dos 30 dias mostra-se o snapshot. Depois recalcula-se; se um valor estiver arquivado ou já não for permitido, o orçamento aparece como "esta configuração já não está disponível".

---

## 5. Schema (proposta para a fase 1)

```
option_definitions  (id, key UNIQUE, name, type: dimension|number|choice|boolean,
                     unit, display: pills|list|swatches, help_text, archived_at)
option_values       (id, option_id, key, label, position, params jsonb,
                     ral_code, swatch_hex, component_id NULL, asks_text bool, archived_at)
                     UNIQUE (option_id, key)
components          (id, name, price_cents, active)                -- preço de venda s/ IVA
sectors             (id, name, hourly_rate_cents)                   -- serralharia, corte laser, instalação…

products            (id, category_id, slug, name, model_glb_url, published_version_id)
product_versions    (id, product_id, version, status: draft|validated|published,
                     margin, consumables_pct, created_by, created_at, published_at)
product_options     (id, product_version_id, option_id, position, var, required,
                     min, max, step, default jsonb)                 -- min/max/step em mm nas medidas
                     UNIQUE (product_version_id, option_id), UNIQUE (product_version_id, var)
product_option_values (product_option_id, option_value_id, position, is_default)
option_rules        (id, product_version_id NULL, position, conditions jsonb, effect jsonb, message)
                                                                    -- NULL = regra da biblioteca
formula_variables   (id, product_version_id, name, expr, position, label, show_to_customer)
formula_lines       (id, product_version_id, position, label,
                     kind: material|labour|external|component, quantity_expr, unit,
                     conditions jsonb, material_id NULL, article_option_id NULL,
                     sector_id NULL, component_id NULL)
formula_line_materials (formula_line_id, option_value_id, material_id)
                     -- artigo pelo valor escolhido na opção article_option_id
```

- `conditions` e `effect` são JSON **estruturado**, validado com Zod (o mesmo formato nas regras e nas linhas): `[{ "option": "material", "op": "in", "values": ["inox"] }]`. Nada de texto livre.
- `config` em orçamentos e encomendas: `{ "largura": 4000, "material": "ferro", "cor": "7016", "motorizacao": "sem" }` (chaves de opção → chave de valor, mm ou número).

## 6. Onde fica o código

- `src/lib/options/` (puro, sem BD): tipos, avaliação de condições, `resolveConfig(versão, escolhas)` → opções visíveis, valores permitidos, obrigatórias, erros. Usado **no configurador e no servidor**.
- `src/lib/pricing/`: parser de expressões, variáveis calculadas, linhas, consumíveis, margem, componentes, IVA. Recebe a configuração já validada por `lib/options`.
- O servidor **recalcula sempre** o preço a partir de `config`; o preço que vem do browser é ignorado.
- Testes: os 5 produtos da secção 7 como casos de teste.

---

## 7. Teste contra produtos reais

Cada produto descrito só com este modelo. Números de exemplo; a estrutura é o que se testa.

### Portão de correr (mockup v2)

- Medidas: `largura` (L, 1 000–6 000 mm), `altura` (H, 800–2 200 mm).
- Escolhas: `material` (ferro, inox, alumínio); `acabamento` (lacado, galvanizado, escovado, polido); `cor` (RAL, swatches, + "Outra cor RAL" com `asks_text`); `enchimento` (barras, chapa); `lado_recolha` (esquerda, direita: sem efeito no preço, vai para a produção); `motorizacao` (sem, motor, motor_2_comandos → componentes).
- Regras da biblioteca: inox → escovado/polido; alumínio → lacado; acabamento ≠ lacado → esconde `cor`.
- Linhas:
  - "Tubo do quadro", `qtd = 2 × (L + H)`, artigo por `material`;
  - "Barras", `qtd = ceil(L / 0,12) × H`, **só se** enchimento = barras;
  - "Chapa", `qtd = L × H × 1,05`, só se enchimento = chapa, artigo por `material`;
  - "Lacagem" (serviço externo, m²), `qtd = L × H`, só se acabamento = lacado (e uma segunda linha × 2 só se enchimento = chapa);
  - "Kit calha e rodas", componente;
  - "Serralharia", horas `= 6 + 2,4 × L + 0,9 × L × H`.
- ✅ Encaixa. É o caso do configurador do mockup.

### Guarda em inox (orçamentos C e D)

- Medidas: `comprimento` (L, total em metros lineares), `altura` (H, 900–1 100 mm).
- Escolhas: `material` (inox 304, inox 316: artigos diferentes, o D é 316); `tipo_enchimento` (barras verticais, varões horizontais, vidro); `espacamento` (10 cm, 12 cm → `params.valor`); `tipo_vidro` (laminado 8+8, laminado 10+10; só visível se tipo = vidro); `fixacao` (lateral, topo); `acabamento` (escovado, polido).
- Número: `n_varoes` (3–6), só visível se tipo = varões (`hide`); `n_cantos` (0–10).
- Linhas:
  - "Corrimão", `qtd = L`;
  - "Travessa inferior", `qtd = L`;
  - "Prumos", `qtd = ceil(L / espacamento.valor) × H`, só se barras;
  - "Varões", `qtd = n_varoes × L`, só se varões;
  - "Vidro" (m²), `qtd = L × H`, só se vidro, artigo pelo valor de `tipo_vidro`;
  - "Montagem", horas `= a + b × L + c × n_cantos`.
- Custo ao kg no PHC (orçamento C: `kg/m × €/kg`): resolve-se no **material** (fator de conversão kg/m por artigo), não nas opções.
- ✅ Encaixa. Mostrou que é preciso o tipo `number`, os `params` dos valores e o artigo escolhido por uma opção que não é o material.

### Escada (orçamento B)

- Medidas: `altura_pisos` (H), `largura` (W), `projecao` (P, comprimento disponível no chão).
- Escolhas: `degrau` (chapa, madeira: a madeira é componente por degrau); `corrimao` (um lado, dois lados → `params.lados` 1/2); `acabamento` (lacado) + `cor`.
- Variáveis calculadas:
  - `degraus = ceil(H / 0,18)`, mostrada ao cliente ("14 degraus");
  - `viga = sqrt(H² + P²)`.
- Linhas:
  - "Viga 150×150", `qtd = 2 × viga`;
  - "Degraus em chapa", `qtd = degraus × W × 0,30`, só se chapa;
  - "Corrimão", `qtd = corrimao.lados × viga`;
  - "Serralharia", horas `= 8 + 0,6 × degraus`.
- Regra: se `projecao` < `altura_pisos` × 0,8 → `forbid` "A escada fica demasiado inclinada; contacte-nos". Isto compara duas medidas: a condição aceita outra opção do lado direito, e não só um número.
- ✅ Encaixa. Mostrou que são precisas variáveis calculadas, `sqrt` e condições entre duas medidas. Escada reta, em L e de caracol: **produtos diferentes**, não uma opção (a fórmula é outra).

### Chaminé / hotte (orçamento A)

- Medidas: `largura` (W), `profundidade` (D), `altura` (H).
- Escolhas: `material` (inox 304); `acabamento` (escovado).
- Booleanos: `motor` (→ componente motor + regulador), `iluminacao` (→ componente projetores LED).
- Linhas:
  - "Chapa inox", `qtd = 2 × (W + D) × H + W × D`;
  - "Metal distendido" (filtro), `qtd = W × D`;
  - "Corte laser" (sector a 120 €/h);
  - "Serralharia", horas `= 3 + 1,5 × iluminacao`.
- ✅ Encaixa. Os componentes do Excel (motor, regulador, LED) passam a valores de opção com componente, como decidido. O erro da linha 10 do Excel não se repete: aqui as linhas são uma lista, não um intervalo de células.

### Caixa de correio (produto-piloto proposto)

- Escolhas: `tamanho` (S, M, L → `params` `{ "largura": 0.30, "altura": 0.40 }`); `montagem` (parede, pé → componente pé); `cor`.
- Linhas: "Chapa", `qtd = 2 × (tamanho.largura × tamanho.altura) + …`.
- ✅ Encaixa. Tamanhos fixos sem medidas livres: os `params` dos valores fazem o papel das medidas.

### O que o teste mudou na proposta inicial

1. Tipos `number` e `boolean`, além de medidas e escolhas.
2. `params` nos valores (números com nome usados nas expressões).
3. Artigo da linha escolhido por **qualquer** opção de escolha, não só pelo material.
4. Variáveis calculadas (`degraus`, `viga`), com opção de as mostrar ao cliente.
5. Funções `floor`, `round` e `sqrt`.
6. Condições que comparam duas medidas.
7. Regras ao nível da biblioteca, para não repetir "inox → escovado/polido" em cada produto.
8. Opções e linhas publicadas juntas numa versão do produto.

## 8. Fora do beta (anotado, não desenhado)

- Preço de um valor diferente por produto (ex.: o mesmo motor mais caro num portão maior): no beta faz-se com dois valores ou com uma linha condicionada.
- Opções que dependem do grupo de desconto Pro.
- Opções com várias escolhas ao mesmo tempo (multi-seleção); no beta, vários booleanos.

## 9. A validar com o Bruno

Nada bloqueia o schema. Quando o backoffice existir, confirmar com ele:

- se as escadas reta, em L e de caracol são mesmo produtos separados;
- o espaçamento das barras: opção do cliente ou fixo por produto;
- se "Outra cor RAL" tem acréscimo de preço.
