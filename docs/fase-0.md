# Fase 0 — Definição

Objetivo: fechar a lista de produtos e campos, as regras de preço e os wireframes antes de escrever lógica de negócio.

Legenda: ✅ decidido · ❓ perguntar ao Bruno · 📝 nota técnica para analisar mais tarde · 🔴 bloqueia trabalho

---

## 1. Decisões já tomadas

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
- 📝 **Por desenhar** — proposta inicial para discutir:
  - **Biblioteca de opções** (`option_definitions`): definida uma vez no backoffice. Ex.: "Motorização" com valores _Sem / Batente / Correr_; "Largura" numérica.
  - **Ligação ao produto** (`product_options`): cada produto escolhe que opções usa e pode **sobrepor** limites e valores permitidos (ex.: largura de 1–6 m num portão de correr, 0,8–1,2 m numa porta).
  - **Regras de compatibilidade** (`option_rules`): "se material = inox, acabamento ≠ lacado"; "motorização de correr só em portões de correr". Combinação inválida = "não é possível".
  - Cada valor de opção pode alimentar a fórmula de preço (ex.: motorização acrescenta um custo fixo; enchimento muda o material e as horas).
  - Rever este desenho quando houver 2–3 produtos reais descritos.

### Preço e responsabilidade

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
- ✅ **Domínio:** o Bruno dá acesso. O site atual está alojado por um **privado** (terceiro), que tem de ser contactado.

---

## 2. Perguntas para o Bruno

> Sugestão: reunião de 1–2 h sobre os blocos A–C, fazendo **um orçamento real do portão de correr do princípio ao fim**. O resto pode ir por email.

### A. Produtos 🔴

1. Que categorias e subcategorias entram no **beta**? (Recomendação: 3–5 subcategorias, não o catálogo todo.)
2. Para cada uma: que **medidas** o cliente escolhe e com que **mínimo e máximo**?
3. Que **opções** existem (motorização, fechadura, enchimento, perfis…) e que valores tem cada uma?
4. Que **materiais e cores** são possíveis por produto? Lista fechada de RAL ou qualquer RAL?
5. Que **combinações não são possíveis**? (Ex.: inox lacado; motorização em portão de batente de 1 folha.)

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

## 3. Entregáveis da fase 0

- [ ] Lista de categorias/subcategorias do beta
- [ ] Por subcategoria: medidas (mín./máx.), opções e valores, materiais, cores, combinações impossíveis
- [ ] Desenho final do modelo de opções reutilizáveis (ver proposta acima)
- [ ] Fórmula de preço por produto, validada contra orçamentos reais
- [ ] Regras de instalação, portes, pagamento (sinal/total) e validade de orçamentos
- [ ] Wireframes das páginas principais (ver `docs/wireframes/`):
  - [x] Configurador (portão de correr)
  - [x] Carrinho, checkout e confirmação
  - [ ] Home e página de categoria
  - [ ] Área de cliente (encomendas, orçamentos guardados)
  - [ ] Backoffice: produtos/opções, fórmulas com pré-visualização, encomendas, sincronização PHC
- [ ] Mockup visual a partir dos wireframes e do logótipo
