# Fase 0 — Definição

Objetivo: fechar a lista de produtos e campos, as regras de preço e os wireframes antes de escrever lógica de negócio.

Legenda: ✅ decidido · ❓ perguntar ao Bruno · 📝 nota técnica para analisar mais tarde · 🔴 bloqueia trabalho

---

## 1. Decisões já tomadas

### Princípio geral

- ✅ **O Bruno cria o que quiser no backoffice:** categorias, subcategorias, produtos, opções, materiais, cores, limites de medidas e regras de compatibilidade. A plataforma não fixa nenhuma lista; nada disto fica no código. As perguntas ao Bruno são sobre **como calcula o preço**, não sobre que catálogo vai ter.

### Catálogo

- ✅ **Categorias com subcategorias.** Ex.: categoria _Portões_ → subcategorias _Portão de 2 folhas_, _Portão de correr_. O produto configurável vive na subcategoria.
  - Implicação: `categories` passa a ter `parent_id` (árvore). Começar com 2 níveis; não limitar o modelo a 2.
- ✅ **Lista de materiais e acabamentos** vem do site atual (levantar a partir dele).
- ✅ **Fora dos limites / combinação impossível:** o configurador mostra que **não é possível** (sem preço).
  - 📝 Considerar mostrar também um contacto ("fale connosco") para não perder o lead. Decidir com o Bruno.

### Medidas

- ✅ O cliente pode alternar a unidade de entrada entre **mm, cm e m**.
- ✅ Precisão mínima: **1 cm** (provisório).
- 📝 **Analisar depois:** se 1 cm chega para todos os produtos (ex.: caixas de correio, chapéus de chaminé podem precisar de mm).
- 📝 Proposta técnica: guardar **sempre em mm (inteiros)** na BD e no motor de preços; a unidade é só apresentação. Evita erros de arredondamento e conversões espalhadas pelo código. Mínimo/máximo/passo por opção também em mm.

### Opções configuráveis

- ✅ As opções (motorização, fechadura, enchimento, perfil, …) **repetem-se entre categorias** (portões, portas, …). Têm de ser definidas uma vez e reutilizadas.
- ✅ **O Bruno cria as opções e os valores que quiser** (biblioteca de opções no backoffice); não há opções pré-definidas.
- ✅ **Componentes comprados** (motores, reguladores, iluminação, fechaduras, …): o Bruno cria-os numa zona própria do backoffice e indica o preço de cada um. Não são perguntas da fase 0.
  - ✅ O preço indicado é **preço de venda (sem IVA)**: entra no total **depois** da margem, sem margem por cima.
  - 📝 Tabela `components (id, name, price_cents, active)`, usada por valores de opção ou por linhas da fórmula com quantidade fixa. No motor: `preço = custo / (1 − margem) + Σ componentes`. O snapshot guarda o preço de cada componente usado.
- ✅ **IVA no fim:** todas as linhas, margem, componentes, instalação e portes são **sem IVA**; o IVA aplica-se **uma vez ao total** do orçamento/encomenda (taxa em `settings`, com snapshot).
  - 📝 `total s/ IVA = custo / (1 − margem) + Σ componentes + instalação + portes`; `IVA = round(total s/ IVA × taxa)` em cêntimos; `total c/ IVA = total s/ IVA + IVA`. Os preços por linha na loja mostram-se com IVA só para apresentação.
- 📝 **Por desenhar** — proposta inicial para discutir:
  - **Biblioteca de opções** (`option_definitions`): definida uma vez no backoffice. Ex.: "Motorização" com valores _Sem / Batente / Correr_; "Largura" numérica.
  - **Ligação ao produto** (`product_options`): cada produto escolhe que opções usa e pode **sobrepor** limites e valores permitidos (ex.: largura de 1–6 m num portão de correr, 0,8–1,2 m numa porta).
  - **Regras de compatibilidade** (`option_rules`): "se material = inox, acabamento ≠ lacado"; "motorização de correr só em portões de correr". Combinação inválida = "não é possível".
  - Cada valor de opção pode alimentar a fórmula de preço (ex.: motorização acrescenta um custo fixo; enchimento muda o material e as horas).
  - Rever este desenho quando houver 2–3 produtos reais descritos.

### Preço e responsabilidade

- ✅ **O custo depende do material escolhido.** Uma linha de custo (ex.: "tubo 40×40") não aponta para um artigo fixo: aponta para um **papel** ("tubo 40×40") e o artigo PHC (e o custo) resolve-se pelo material que o cliente escolheu (ferro, inox, alumínio).
  - 📝 Proposta técnica: `formula_lines` deixa de ter `material_id` único; nova tabela `formula_line_materials (formula_line_id, material_option_value, material_id)`. Material sem artigo associado = combinação "não é possível". O snapshot guarda o artigo e o custo efetivamente usados.

- ✅ O preço mostrado online **é final**. Antes de um produto ficar visível, a fórmula tem de ser **validada pelo Bruno** com orçamentos reais.
- ✅ **O cliente é responsável pelas medidas** que indica. Tem de estar **escrito nos termos** e ser **aceite explicitamente** na encomenda (checkbox com registo de data/hora).
- ✅ **Instalação é opcional e tem preço adicional.**
- 📝 Implicação técnica: produtos com estado _rascunho → validado → publicado_; só o Bruno (admin) publica. Cada encomenda guarda o snapshot do preço e a aceitação das medidas.

### Responsabilidades

- ✅ **Bruno** valida as entregas, mantém os custos no PHC e exporta os GLB do TopSolid.
- ✅ **Logótipo** existe.
- ✅ **Mockup não existe** — construí-lo faz parte da fase 0 (wireframes → mockup).
- ✅ **Staging** é necessário (ambiente para o Bruno testar antes de cada lançamento).
- ✅ **Stack, alojamento e serviços:** escolha do prestador (Vercel, Neon, Cloudflare R2, Resend, Sentry — ver CLAUDE.md). Contas em nome da Abinox.
- ✅ **Domínio:** `habinox.pt` (site atual em https://habinox.pt/pt/, WordPress). O Bruno dá acesso. O site atual está alojado por um **privado** (terceiro), que tem de ser contactado.
  - O email da empresa (`geral@habinox.pt`) usa o domínio → ao mudar o DNS, os registos MX têm de se manter (pergunta 35).

### Respostas do Bruno (email de 2026-10-14)

- ✅ **Marca: HABINOX®** (logótipo recebido em JPEG: azul `#2005A2` e cinzento `#8D8F8C`; falta o vetor). Morada no site: Núcleo Industrial de Antas, 4740-016 Antas, **Esposende**.
- ✅ **Medidas:** o cliente é responsável e fica escrito nos termos (perguntas 11 e 40-J).
- ✅ **Além das medidas:** o cliente envia **uma foto do espaço ou um rascunho**.
  - 📝 Upload de ficheiros no configurador/checkout (imagens e PDF, para R2, com limite de tamanho). Obrigatório ou opcional: decidir.
- ✅ **Instalação:** preço da **zona** + **horas** (as horas vêm da fórmula do produto).
  - 📝 Tabela de zonas (por código postal ou distrito) com preço fixo + taxa horária. Falta: lista de zonas e preços.
- ✅ **Validade dos orçamentos: 30 dias** (em `settings`).
- ✅ **Pagamento:**
  - acima de **1 000 €**: **40% na encomenda e 60% no despacho**;
  - até 1 000 €: pagamento total na encomenda;
  - o cliente acompanha o estado da encomenda na área de cliente.
  - 📝 Grande impacto na fase 1B e na máquina de estados: uma encomenda pode ter **dois pagamentos**; o segundo é pedido quando a encomenda fica pronta e o despacho só acontece depois de pago. Limiar (1 000 €) e percentagens em `settings`. Falta: o limiar é com ou sem IVA? E a instalação conta?
- ✅ **Transporte, três modos:** transporte próprio, transportadora (preço **por km ou por zona**) ou por conta do cliente (levantamento).
  - 📝 Recomendação para o beta: **por zona** (código postal/distrito). Por km obriga a um serviço de distâncias (custo e dependência externa).
- ✅ **Prazo de produção pela capacidade:** ex.: capacidade de 8 portões/mês; o site conta as encomendas em produção e calcula o prazo.
  - 📝 Capacidade por categoria/mês no backoffice; prazo estimado = fila em produção ÷ capacidade. **Não estava no âmbito original** → estimar horas e confirmar com o Bruno antes de prometer.
- ✅ **Orçamentos reais:** chegaram 4 em Excel (chaminé, escada, 2 guardas). Análise em `docs/orcamentos-analise.md`. Os produtos-piloto passam a ser estes.
- ✅ **Fatura da fase 0** (50%) para `geral@habinox.pt`; contrato assinado pessoalmente.

---

## 2. Perguntas para o Bruno

> Sugestão: reunião de 1–2 h sobre os blocos A–C, fazendo **um orçamento real do portão de correr do princípio ao fim**. O resto pode ir por email.

### A. Produtos

> O catálogo (categorias, opções, materiais, cores, limites, combinações impossíveis) é o Bruno que o cria no backoffice — não é pergunta. Basta escolher **por que produto começamos** a fechar fórmulas (proposta: portão de correr, guarda, caixa de correio).

1. Concorda com os produtos-piloto para validar as fórmulas primeiro?

### B. Preço 🔴

6. **Como faz hoje um orçamento?** Explicação passo a passo, com um exemplo real.
7. **3–5 orçamentos antigos por produto** (medidas, material, opções e preço final). Servem para confirmar que a fórmula dá o mesmo valor e para os testes automáticos.
8. Por produto: quantidade de material em função das medidas; **desperdício**; **horas** por tipo de trabalho (corte, soldadura, pintura, montagem); **custo/hora**; custos fixos (consumíveis, embalagem); **margem**; regra de **arredondamento**.
9. Quanto tempo vale um orçamento guardado? (15 ou 30 dias?)
10. Descontos por quantidade? Valor mínimo de encomenda?

### C. Responsabilidade e instalação 🔴

11. Confirmar: **o cliente assume as medidas** que introduz (vai para os termos).
12. **Instalação:** como se calcula o preço? (Fixo por produto? Por zona/distância? Por hora?) Em que zonas faz instalação?
13. Há serviço de **medição no local**? Com custo?
14. Fora dos limites: mostrar só "não é possível" ou também um contacto para pedido especial?

### D. Encomenda, pagamento e entrega

15. **Pagamento total ou sinal** (ex.: 50% na encomenda, resto antes da entrega)?
16. Que **banco** usa? (Ajuda a escolher entre Stripe, IfthenPay, Eupago — ainda não há conta em nenhum.)
17. **Zona de entrega:** Portugal continental? Ilhas? Espanha já no beta?
18. **Portes:** transporte próprio ou transportadora? Por peso, volume ou zona? Pode-se **levantar nas instalações**?
19. **Prazos de produção** típicos por produto (para mostrar ao cliente).
20. **Faturação no PHC:** automática quando o pagamento entra, ou manual?

### E. PHC GO 🔴 (para a fase 1)

21. **AppID, token e ambiente de testes** da Simple API.
22. Que **artigos** do PHC são os materiais usados nos produtos, e em que **unidade** (kg, m, m²)?
23. O custo no PHC é o **preço de compra atualizado**? Com que frequência muda?

### F. Legal (antes de lançar)

24. Dados da empresa: NIF, morada, registo comercial.
25. **Termos e condições e política de privacidade:** quem redige? (Recomendação: advogado.)
26. Informar o Bruno: bens **feitos por medida** podem estar excluídos do direito de livre resolução de 14 dias — **confirmar com jurista** e escrever nos termos.
27. Informar o Bruno: são obrigatórios o **Livro de Reclamações Eletrónico** e a indicação de uma **entidade de resolução alternativa de litígios**.
28. Assinar **contrato de subcontratação RGPD** (Abinox responsável, prestador subcontratante).

### G. Conteúdo

29. Enviar o **logótipo em vetor** (SVG/AI/PDF) e as cores da marca.
30. **Fotos** dos produtos (existem? com que qualidade?).
31. Que **GLB** já existem? Prazo para exportar os dos produtos do beta?
32. Que endereço **envia** os emails da loja e quem **recebe** os avisos de nova encomenda?
33. Quem mais vai usar o **backoffice**?

### H. Domínio e site atual (perguntar ao privado que aloja o site)

34. Onde está **registado** o domínio e quem gere o **DNS**?
35. 🔴 O **email da empresa** usa o domínio? Se sim, que serviço (Google, Microsoft, o próprio alojamento)? Ao mudar o DNS os registos de email (MX) têm de se manter, senão o email deixa de funcionar.
36. Exportar o **conteúdo** do site atual (textos, imagens, lista de materiais/acabamentos) e a **lista de URLs** (para redirecionamentos 301 e não perder posição no Google).
37. O site atual mantém-se online até ao lançamento? Até quando está pago o alojamento?

### I. Contas a criar (em nome da Abinox)

38. **Cartão da empresa** para os serviços pagos. Dar ao Bruno uma estimativa de custo mensal antes de criar (confirmar preços atuais de Vercel, Neon, Cloudflare, Resend, Sentry).
39. Criar contas e adicionar o Rodrigo como admin: Vercel, Neon, Cloudflare, Resend, Sentry, gateway de pagamento.

---

### J. Novas perguntas da revisão dos wireframes (ver `docs/revisao-wireframes.md`)

40. 🔴 **Medição:** o cliente indica o **lado de recolha** do portão de correr? Que espaço livre é preciso desse lado (a largura do vão + quanto)? Há mais medidas a pedir?
41. 🔴 **Guia "Como medir":** texto e ilustrações — onde medir a largura e a altura, o que fazer com chão desnivelado.
42. **Medição no local:** a Abinox faz? Em que zonas? Com que preço, e é descontado na encomenda?
43. 🔴 **Artigos PHC por material:** para cada linha de custo dos produtos-piloto, qual é o artigo PHC em ferro, em inox e em alumínio? (Já decidido que o custo muda com o material; falta a lista.)
44. **Tolerância de validação:** que diferença aceita entre a fórmula e os orçamentos reais (±3%? ±5%)? Quantos orçamentos reais por produto?
45. **Variações de custo do PHC:** acima de que percentagem uma subida/descida de custo deve esperar aprovação antes de mudar os preços da loja?
46. **Multibanco não pago:** quantos dias para pagar? Passado o prazo, a encomenda cancela ou fica para revisão? (Hoje a confirmação diz "[a definir]".)
47. **Pagamento falhado:** durante quanto tempo se guarda a encomenda e o preço para tentar de novo?
48. **Cancelamentos:** que motivos quer registar? Quem pode cancelar e devolver?
49. **Contacto visível no site:** telefone, email e horário para os momentos de dúvida.
50. 🔴 **Jurista:** redação da exclusão do direito de devolução nos produtos feitos por medida e da confirmação de medidas.

## 3. Entregáveis da fase 0

- [ ] Lista de categorias/subcategorias do beta
- [ ] Por subcategoria: medidas (mín./máx.), opções e valores, materiais, cores, combinações impossíveis
- [ ] Desenho final do modelo de opções reutilizáveis (ver proposta acima)
- [ ] Fórmula de preço por produto, validada contra orçamentos reais
- [x] Regras de instalação, portes, pagamento (sinal/total) e validade de orçamentos (princípios; faltam zonas e preços)
- [x] Orçamentos reais recebidos (4) — faltam as medidas de cada um para escrever as fórmulas
- [ ] Wireframes das páginas principais (ver `docs/wireframes/`):
  - [x] Configurador (portão de correr)
  - [x] Carrinho, checkout e confirmação
  - [x] Home e página de categoria
  - [x] Área de cliente (encomendas, orçamentos guardados, privacidade)
  - [x] Backoffice: fórmula de preço com pré-visualização
  - [x] Backoffice: produtos/opções, encomendas, materiais e sincronização PHC
  - [ ] Validar todos os wireframes com o Bruno
- [ ] Mockup visual a partir dos wireframes e do logótipo
