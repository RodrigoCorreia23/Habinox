/**
 * Textos legais em português.
 *
 * RASCUNHO preparado pelo programador a partir da lei portuguesa e das regras
 * já decididas com a Habinox (docs/fase-0.md). Tem de ser revisto por um
 * jurista antes de a loja abrir ao público. Ao alterar, mudar `updated`.
 */
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ADR, COMPANY, COMPLAINTS_BOOK_URL } from "./company";

export interface LegalDocument {
  title: string;
  updated: string;
  body: ReactNode;
}

const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export const terms: LegalDocument = {
  title: "Termos e condições",
  updated: "4 de novembro de 2026",
  body: (
    <>
      <h2 id="empresa">1. Quem somos</h2>
      <p>
        A loja online em habinox.pt é explorada por {COMPANY.name}, com a marca {COMPANY.brand},
        sede em {COMPANY.address}, NIPC {COMPANY.nipc}, matriculada na {COMPANY.registry}, com o
        capital social de {COMPANY.capital}. Contactos:{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, telefone {COMPANY.phone} ou
        telemóvel {COMPANY.mobile} ({COMPANY.hours}; chamada para a rede fixa ou móvel nacional).
      </p>

      <h2 id="ambito">2. Âmbito</h2>
      <p>
        Estes termos aplicam-se às encomendas feitas na loja online. No beta, a loja vende apenas
        para entrega em Portugal continental e ilhas. Ao encomendar, o cliente declara ter lido e
        aceitado estes termos e a <Link href="/privacidade">política de privacidade</Link>.
      </p>

      <h2 id="produtos">3. Produtos feitos por medida</h2>
      <p>
        Os produtos são fabricados por medida, de acordo com as medidas e opções escolhidas pelo
        cliente no configurador. As imagens, desenhos e modelos 3D são ilustrativos: a aparência
        real pode variar ligeiramente, sobretudo em acabamentos e cores.
      </p>
      <p>
        <strong>As medidas são da responsabilidade do cliente.</strong> O cliente confirma-as
        expressamente ao encomendar. Um produto fabricado com as medidas indicadas pelo cliente está
        conforme, mesmo que depois não sirva no local. Em caso de dúvida, contacte-nos antes de
        encomendar: fazemos aconselhamento e levantamento de medidas na obra, mediante marcação.
      </p>

      <h2 id="precos">4. Preços e orçamentos</h2>
      <p>
        Os preços são em euros e incluem IVA à taxa em vigor. O preço calculado no configurador fica
        garantido durante 30 dias depois de o produto ser adicionado ao carrinho. Passado esse
        prazo, o preço é recalculado com os custos do dia e o cliente vê o novo valor antes de
        encomendar.
      </p>
      <p>
        <strong>O transporte e a instalação não estão incluídos</strong> no preço dos produtos. São
        orçamentados e confirmados com o cliente antes do pagamento, e o cliente pode recusá-los sem
        custos, desistindo da encomenda nessa altura.
      </p>

      <h2 id="encomenda">5. Encomenda e confirmação</h2>
      <p>
        A encomenda é feita depois de o cliente criar conta e entrar nela, indicar os dados de
        faturação e entrega e confirmar as medidas e estes termos. Recebe por email a confirmação da
        receção da encomenda. O contrato fica concluído quando a Habinox confirma a encomenda, o
        transporte ou a instalação e o pagamento, e o cliente faz o pagamento indicado no ponto 6.
      </p>

      <h2 id="pagamento">6. Pagamento</h2>
      <p>
        Encomendas até 1 000 € (com IVA) pagam-se na totalidade na confirmação. Acima de 1 000 €,
        paga-se 50% na confirmação e 50% antes da expedição. A Habinox indica ao cliente os meios de
        pagamento disponíveis. Não é cobrada qualquer taxa pelo meio de pagamento escolhido.
      </p>

      <h2 id="prazos">7. Prazos de fabrico e entrega</h2>
      <p>
        O prazo de fabrico e entrega é indicado na confirmação da encomenda e conta a partir do
        pagamento. Se não puder ser cumprido, a Habinox informa o cliente; o cliente pode fixar um
        prazo adicional adequado e, se este também não for cumprido, resolver o contrato com
        reembolso do que tiver pago, nos termos da lei.
      </p>

      <h2 id="livre-resolucao">8. Direito de livre resolução</h2>
      <p>
        Nos contratos celebrados à distância, o consumidor tem em regra 14 dias para desistir sem
        indicar motivo.{" "}
        <strong>
          Este direito não se aplica aos produtos fabricados de acordo com as especificações do
          consumidor ou claramente personalizados
        </strong>{" "}
        (artigo 17.º, n.º 1, alínea c), do Decreto-Lei n.º 24/2014), como os produtos por medida
        desta loja. O cliente é informado disto e confirma-o antes de encomendar.
      </p>
      <p>
        Até ao início do fabrico, o cliente pode pedir o cancelamento da encomenda; a Habinox
        reembolsa o valor pago, deduzido de custos já incorridos que tenham sido comunicados ao
        cliente.
      </p>

      <h2 id="garantia">9. Garantia</h2>
      <p>
        Os produtos têm a garantia legal de conformidade de 3 anos a contar da entrega (Decreto-Lei
        n.º 84/2021). Em caso de falta de conformidade, o cliente tem direito à reparação ou
        substituição do produto, à redução do preço ou à resolução do contrato, nos termos da lei.
        Para acionar a garantia, contacte <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>,
        com o número da encomenda e fotografias do problema.
      </p>
      <p>
        A garantia não cobre danos causados por instalação feita por terceiros sem seguir as
        indicações da Habinox, uso indevido, falta da manutenção normal ou medidas erradas indicadas
        pelo cliente.
      </p>

      <h2 id="reclamacoes">10. Reclamações</h2>
      <p>
        Pode reclamar diretamente para <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou no{" "}
        <Ext href={COMPLAINTS_BOOK_URL}>Livro de Reclamações Eletrónico</Ext>.
      </p>

      <h2 id="litigios">11. Resolução alternativa de litígios</h2>
      <p>
        Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de resolução
        alternativa de litígios de consumo (Lei n.º 144/2015). A entidade competente é o {ADR.name},{" "}
        {ADR.address}, telefone {ADR.phone}, <a href={`mailto:${ADR.email}`}>{ADR.email}</a>,{" "}
        <Ext href={ADR.url}>{ADR.url.replace("https://", "")}</Ext>. Mais informação no{" "}
        <Ext href="https://www.consumidor.gov.pt">Portal do Consumidor</Ext>.
      </p>

      <h2 id="lei">12. Lei aplicável</h2>
      <p>
        Estes termos regem-se pela lei portuguesa, sem prejuízo das normas imperativas de proteção
        do consumidor do país da sua residência habitual.
      </p>
    </>
  ),
};

export const privacy: LegalDocument = {
  title: "Política de privacidade",
  updated: "5 de novembro de 2026",
  body: (
    <>
      <h2 id="responsavel">1. Responsável pelo tratamento</h2>
      <p>
        {COMPANY.name} ({COMPANY.brand}), NIPC {COMPANY.nipc}, {COMPANY.address}. Para qualquer
        questão sobre os seus dados: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>

      <h2 id="dados">2. Que dados tratamos e porquê</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome, email e palavra-passe (guardada cifrada, nunca em claro),
          para criar e gerir a sua conta. Base legal: execução do contrato.
        </li>
        <li>
          <strong>Encomendas:</strong> produtos e medidas escolhidos, telefone, NIF (se o indicar),
          moradas de faturação e entrega e notas, para processar, faturar, entregar e dar garantia à
          encomenda. Base legal: execução do contrato e cumprimento de obrigações legais
          (faturação).
        </li>
        <li>
          <strong>Contacto comercial (opcional):</strong> se o autorizar ao criar a conta, usamos o
          seu nome, email e os produtos que configurou para o contactar sobre os seus orçamentos e
          novidades da Habinox. Base legal: consentimento, que pode retirar a qualquer momento (na
          sua conta, em “Privacidade”, ou pedindo-nos).
        </li>
        <li>
          <strong>Confirmações:</strong> a data em que aceitou estes termos (ao criar conta e em
          cada encomenda), a sua resposta ao contacto comercial e a responsabilidade pelas medidas,
          como prova do que foi acordado. Base legal: interesse legítimo e cumprimento de obrigações
          legais.
        </li>
        <li>
          <strong>Carrinho:</strong> os produtos que juntou ao carrinho, ligados a um código
          aleatório guardado num cookie (ver a <Link href="/cookies">política de cookies</Link>).
        </li>
        <li>
          <strong>Registos técnicos e de segurança:</strong> endereço IP e dados técnicos do pedido,
          para proteger a conta contra abusos e corrigir erros. Base legal: interesse legítimo.
        </li>
      </ul>
      <p>Não vendemos os seus dados nem os usamos para publicidade de terceiros.</p>

      <h2 id="prazos">3. Durante quanto tempo</h2>
      <ul>
        <li>
          Conta: enquanto a mantiver; pode pedir para a apagar a qualquer momento. Ao apagar,
          retiramos o nome, o email e a palavra-passe; as encomendas ficam pelo prazo legal.
        </li>
        <li>
          Encomendas e faturação: 10 anos, por obrigação legal (documentos fiscais e
          contabilísticos).
        </li>
        <li>Carrinhos sem encomenda: são apagados ao fim de 60 dias sem uso.</li>
        <li>Registos técnicos: até 12 meses.</li>
      </ul>

      <h2 id="subcontratantes">4. Quem trata os dados por nossa conta</h2>
      <p>
        Usamos prestadores de serviços que tratam os dados apenas segundo as nossas instruções, com
        contrato de subcontratação: alojamento da aplicação e da base de dados, envio de emails,
        monitorização de erros, o programa de gestão da empresa (Odoo) e, quando existir pagamento
        online, o prestador de pagamentos. A lista atualizada dos prestadores está disponível a
        pedido.
      </p>
      <p>
        Alguns destes prestadores podem tratar dados fora do Espaço Económico Europeu. Nesses casos,
        a transferência faz-se com as garantias previstas no RGPD, como decisões de adequação ou
        cláusulas contratuais-tipo aprovadas pela Comissão Europeia.
      </p>

      <h2 id="direitos">5. Os seus direitos</h2>
      <p>
        Pode pedir o acesso aos seus dados, a retificação, o apagamento, a limitação do tratamento,
        a portabilidade e opor-se ao tratamento baseado em interesse legítimo, escrevendo para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Respondemos no prazo de um mês. Os
        dados que a lei nos obriga a guardar (faturação) não podem ser apagados antes do fim do
        prazo legal.
      </p>
      <p>
        Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados (
        <Ext href="https://www.cnpd.pt">cnpd.pt</Ext>).
      </p>

      <h2 id="seguranca">6. Segurança</h2>
      <p>
        As ligações ao site são cifradas, as palavras-passe guardam-se cifradas e o acesso aos dados
        está limitado a quem precisa deles para tratar a sua encomenda. Os dados de cartões de
        pagamento nunca passam pela loja: são tratados apenas pelo prestador de pagamentos.
      </p>

      <h2 id="alteracoes">7. Alterações</h2>
      <p>
        Se esta política mudar, a data no topo é atualizada; alterações importantes são comunicadas
        por email aos clientes com conta.
      </p>
    </>
  ),
};

export const cookies: LegalDocument = {
  title: "Política de cookies",
  updated: "4 de novembro de 2026",
  body: (
    <>
      <p>
        Um cookie é um pequeno ficheiro que o site guarda no seu browser. Neste momento a loja usa{" "}
        <strong>apenas cookies estritamente necessários</strong> para funcionar, que não precisam de
        consentimento. Não usamos cookies de publicidade nem de análise.
      </p>

      <h2 id="lista">Cookies que usamos</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Para quê</th>
            <th>Duração</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>habinox_cart</code>
            </td>
            <td>Guardar o seu carrinho enquanto não entrou na conta (um código aleatório).</td>
            <td>60 dias</td>
          </tr>
          <tr>
            <td>
              <code>better-auth.session_token</code>
            </td>
            <td>
              Manter a sessão iniciada na sua conta (em ligações seguras o nome começa por{" "}
              <code>__Secure-</code>).
            </td>
            <td>7 dias, renovados enquanto usar o site; apagado ao terminar a sessão</td>
          </tr>
          <tr>
            <td>
              <code>NEXT_LOCALE</code>
            </td>
            <td>Lembrar a língua do site.</td>
            <td>Até fechar o browser</td>
          </tr>
        </tbody>
      </table>

      <h2 id="gerir">Como gerir</h2>
      <p>
        Pode apagar ou bloquear cookies nas definições do seu browser. Se bloquear estes cookies, o
        carrinho e a sessão deixam de funcionar.
      </p>
      <p>
        Se no futuro usarmos cookies de análise (por exemplo, para medir as visitas), pediremos o
        seu consentimento antes de os usar e esta página será atualizada.
      </p>
    </>
  ),
};
