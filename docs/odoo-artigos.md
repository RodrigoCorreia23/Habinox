# Odoo — o que registar em cada artigo

Lista para o Bruno, para os artigos do Odoo servirem o cálculo de preços da loja. Feita a 2026-11-04.

A loja lê do Odoo **só os materiais e os custos**, uma vez por dia (e quando se carrega em "sincronizar agora"). Não escreve nada no Odoo. Tudo o resto (margens, produtos, opções, fotografias) faz-se no backoffice da loja.

## Antes de começar

- **Plano do Odoo:** a loja só consegue ler o Odoo pela API, e no Odoo Online a API só existe no **plano Custom**. Nos planos One App Free e Standard não funciona.
- **Utilizador para a loja:** criar um utilizador só para a loja (ex.: `loja@habinox.pt`) e gerar uma **chave de API** para ele. Enviar ao Rodrigo o endereço do Odoo (`https://….odoo.com`), o nome da base de dados, o utilizador e a chave, por um canal seguro (não por email simples).

## Que artigos

Todos os que entram no fabrico dos produtos vendidos na loja:

- matéria-prima: tubos, barras, varões, chapas, perfis, vidros…;
- serviços externos cobrados por quantidade: lacagem, decapagem, galvanização…;
- componentes comprados: motores, comandos, kits de rodas, fechaduras, LED…

Pôr todos numa **categoria de produto própria** (ex.: `Loja / Materiais`, com subcategorias à vontade). A loja lê só essa categoria; o resto do Odoo não lhe interessa.

## Campos de cada artigo

| Campo no Odoo          | Obrigatório                       | Para que serve                                                           | Exemplo               |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| **Nome**               | sim                               | Aparece no backoffice da loja para escolher o artigo nas fórmulas        | Tubo inox 304 40×40×2 |
| **Referência interna** | sim, única e **sem mudar depois** | É a ligação entre a loja e o Odoo. Se mudar, a loja perde o artigo       | TI4040                |
| **Unidade de medida**  | sim                               | A unidade em que o artigo **entra no fabrico**: metro, m², unidade, kg   | m                     |
| **Custo**              | sim                               | Custo **por essa unidade**, sem IVA, atualizado                          | 12,40 €               |
| **Peso**               | recomendado                       | Peso **por unidade** (kg/m, kg/m², kg/un.). Vai servir para o transporte | 2,32                  |
| **Ativo**              | —                                 | Arquivar em vez de apagar                                                | —                     |

### Regras importantes

1. **O custo tem de estar na mesma unidade em que se gasta.** Se o tubo se compra ao kg mas se gasta ao metro, registar em **metros** com o custo **por metro** (kg/m × €/kg). Exemplo: 2,8 kg/m a 4,00 €/kg → custo 11,20 €/m, peso 2,8.
2. **Um artigo por variante de material.** O mesmo tubo em ferro, inox 304 e inox 316 são três artigos, com três referências. A loja escolhe o artigo conforme o material que o cliente escolhe.
3. **Não reutilizar referências.** Um artigo que deixe de existir arquiva-se; um novo leva uma referência nova.
4. **Não apagar artigos que a loja usa.** Se um artigo desaparecer, a loja mantém o último custo e avisa no backoffice para alguém rever. Os preços não caem para zero, mas o artigo fica a precisar de atenção.

## O que não se regista no Odoo

- **Margens.** Cada material, acabamento, componente e tipo de mão de obra tem a sua margem, definida no backoffice da loja.
- **Custo/hora da mão de obra** (serralharia, corte laser, instalação): no backoffice da loja.
- **Produtos à venda** (portões, guardas…), opções, fotografias e modelos 3D: no backoffice da loja.

## Quando está pronto

Avisar o Rodrigo quando houver alguns artigos registados (bastam 10 a 20 para começar). A ligação testa-se com esses; o resto pode ser registado aos poucos.
