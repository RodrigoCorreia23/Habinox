import { costToInput } from "@/lib/money";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { CircleCheck, Plus } from "lucide-react";
import { type Column, DataTable } from "@/components/admin/data-table";
import { Money, RelativeTime } from "@/components/admin/format";
import { Notice } from "@/components/admin/notice";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Panel, Section } from "@/components/admin/section";
import { ORDER_STATUS } from "@/components/admin/status";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { type Step, StepList } from "@/components/admin/step-list";
import { Button } from "@/components/ui/button";
import { isOrderStatus } from "@/lib/orders/state";
import { syncHealth } from "@/lib/sync-health";
import { requireAdmin } from "@/server/auth/session";
import { ACTIVE_ORDER_STATUSES, getDashboard } from "@/server/dashboard";

export const metadata: Metadata = { title: "Painel · Habinox" };

type ActiveStatus = (typeof ACTIVE_ORDER_STATUSES)[number];
type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
type RecentOrder = Dashboard["recentOrders"][number];

/** O que cada estado pede à Habinox (o painel mostra trabalho, não só números). */
const NEXT_STEP: Record<ActiveStatus, string> = {
  pending_payment: "Contactar o cliente para combinar pagamento e transporte",
  paid: "Pôr em produção",
  in_production: "Em fabrico",
  ready: "Combinar a entrega ou a instalação",
};

/** «1 artigo» / «2 artigos». */
function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// ── Montar a loja ───────────────────────────────────────────────────────────

/** Os 6 passos reais para ter um produto com preço na loja, com o estado de cada um. */
function setupSteps(data: Dashboard): Step[] {
  const { setup, materials, catalog } = data;
  const draft = setup.productInPreparation;
  const materialsWithMargin = materials.total - materials.noMargin;
  const optionsDone = setup.options.dimensions > 0 && setup.options.choices > 0;

  let optionsDetail = "Ainda não há opções";
  if (setup.options.total > 0) {
    optionsDetail = plural(setup.options.total, "criada", "criadas");
    if (setup.options.dimensions === 0) optionsDetail += " · falta uma medida";
    else if (setup.options.choices === 0) optionsDetail += " · falta uma escolha";
  }

  const raw: (Omit<Step, "status"> & { done: boolean })[] = [
    {
      title: "Categorias",
      done: setup.categories > 0,
      detail:
        setup.categories > 0
          ? plural(setup.categories, "criada", "criadas")
          : "Ainda não há categorias",
      href: setup.categories > 0 ? "/admin/categorias" : "/admin/categorias/nova",
    },
    {
      title: "Opções: medidas, material, cor",
      done: optionsDone,
      detail: optionsDetail,
      href: optionsDone ? "/admin/opcoes" : "/admin/opcoes/nova",
    },
    {
      title: "Margens dos materiais",
      done: materials.total > 0 && materials.noMargin === 0,
      detail:
        materials.total === 0
          ? "Ainda não chegaram materiais do ERP"
          : `${materialsWithMargin} de ${materials.total} com margem`,
      href: materials.noMargin > 0 ? "/admin/materiais?filtro=sem-margem" : "/admin/materiais",
    },
    {
      title: "Mão de obra com margem",
      done: setup.sectors.total > 0 && setup.sectors.withMargin === setup.sectors.total,
      detail:
        setup.sectors.total === 0
          ? "Ainda não há secções da oficina"
          : `${setup.sectors.withMargin} de ${plural(setup.sectors.total, "secção", "secções")} com margem`,
      href: "/admin/mao-de-obra",
    },
    {
      title: "Produto com preço",
      done: setup.productsWithLines > 0,
      detail:
        setup.productsWithLines > 0
          ? `${plural(setup.productsWithLines, "produto", "produtos")} com custos definidos`
          : draft
            ? `${draft.name}: falta definir o preço`
            : "Ainda não há produtos",
      href:
        setup.productsWithLines > 0
          ? "/admin/produtos"
          : draft
            ? `/admin/produtos/${draft.id}`
            : "/admin/produtos/novo",
    },
    {
      title: "Publicar",
      done: catalog.published > 0,
      detail:
        catalog.published > 0
          ? `${plural(catalog.published, "produto", "produtos")} na loja`
          : draft
            ? `${draft.name} ainda não está na loja`
            : "Ainda não há produtos na loja",
      href: draft ? `/admin/produtos/${draft.id}` : "/admin/produtos",
    },
  ];

  const firstOpen = raw.findIndex((step) => !step.done);
  return raw.map(({ done, ...step }, index) => ({
    ...step,
    status: done ? "done" : index === firstOpen ? "current" : "todo",
  }));
}

function SetupPanel({ steps }: { steps: Step[] }) {
  const done = steps.filter((step) => step.status === "done").length;
  const percent = Math.round((done / steps.length) * 100);
  return (
    <Section
      id="montar"
      title="Montar a loja"
      description="Os passos para pôr o primeiro produto à venda. Este bloco desaparece quando houver um produto na loja."
    >
      <Panel>
        <div className="mb-5 flex items-center gap-4">
          <div
            role="progressbar"
            aria-label="Loja montada"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="bg-line h-1 flex-1 overflow-hidden rounded-full"
          >
            <div className="bg-amber h-full" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-ink-soft shrink-0 text-sm tabular-nums">
            {done} de {steps.length} feitos · {percent} %
          </p>
        </div>
        <StepList
          label="Passos para montar a loja"
          steps={steps}
          className="gap-y-4 md:grid-flow-col md:grid-cols-2 md:grid-rows-3 md:gap-x-10"
        />
      </Panel>
    </Section>
  );
}

// ── O que precisa de si ────────────────────────────────────────────────────

type Attention = {
  key: string;
  tone: "danger" | "warn" | "info";
  title: string;
  body: string;
  href: string;
  action: string;
};

/** Por ordem de urgência: o que impede de vender primeiro, depois trabalho por fazer. */
function attentionItems(data: Dashboard, health: ReturnType<typeof syncHealth>): Attention[] {
  const items: Attention[] = [];
  const { materials, catalog, setup, orderCounts } = data;
  if (health.level !== "ok") {
    items.push({
      key: "erp",
      tone: health.level === "critical" ? "danger" : "warn",
      title:
        health.level === "critical" ? "Os custos do ERP estão parados" : "Atenção à ligação ao ERP",
      body: health.message,
      href: "/admin/materiais",
      action: "Ver custos",
    });
  }
  const paid = orderCounts.paid ?? 0;
  if (paid > 0) {
    items.push({
      key: "pagas",
      tone: "info",
      title: `${plural(paid, "encomenda paga", "encomendas pagas")} à espera de produção`,
      body: "O cliente já pagou: pode passar a produção.",
      href: "/admin/encomendas?estado=paid",
      action: "Ver encomendas pagas",
    });
  }
  if (materials.noMargin > 0) {
    items.push({
      key: "margens",
      tone: "warn",
      title: "Falta definir margens",
      body: `${plural(materials.noMargin, "artigo do ERP ainda não tem", "artigos do ERP ainda não têm")} margem: os produtos que os usam não se publicam.`,
      href: "/admin/materiais?filtro=sem-margem",
      action: "Definir margens",
    });
  }
  const sectorsWithoutMargin = setup.sectors.total - setup.sectors.withMargin;
  if (sectorsWithoutMargin > 0) {
    items.push({
      key: "mao-de-obra",
      tone: "warn",
      title: "Falta a margem da mão de obra",
      body: `${plural(sectorsWithoutMargin, "secção da oficina está", "secções da oficina estão")} sem margem: os produtos que as usam não se publicam.`,
      href: "/admin/mao-de-obra",
      action: "Abrir mão de obra",
    });
  }
  if (data.staleCosts.length > 0) {
    const first = data.staleCosts[0]!;
    const products = [...new Set(data.staleCosts.map((row) => row.productName))];
    items.push({
      key: "custos-proprios",
      tone: "warn",
      title: `O Odoo mudou ${plural(data.staleCosts.length, "custo fixado num produto", "custos fixados em produtos")}`,
      body: `${products.join(", ")}: ${data.staleCosts
        .slice(0, 3)
        .map(
          (row) =>
            `${row.materialName} está fixado em ${costToInput(row.ownCost)} € e o Odoo tem agora ${costToInput(row.erpCost)} €`,
        )
        .join(
          "; ",
        )}${data.staleCosts.length > 3 ? "…" : ""}. Confirme se o custo deste produto continua certo.`,
      href: `/admin/produtos/${first.productId}#custos`,
      action: products.length === 1 ? "Rever custos do produto" : "Rever o primeiro",
    });
  }
  if (materials.missing > 0) {
    items.push({
      key: "desaparecidos",
      tone: "warn",
      title: `${plural(materials.missing, "artigo deixou", "artigos deixaram")} de existir no ERP`,
      body: "Mantêm o último custo conhecido. Confirme se os produtos que os usam continuam certos.",
      href: "/admin/materiais?filtro=desaparecidos",
      action: "Rever artigos",
    });
  }
  if (catalog.pendingChanges > 0) {
    items.push({
      key: "alteracoes",
      tone: "info",
      title: `${plural(catalog.pendingChanges, "produto tem", "produtos têm")} alterações por publicar`,
      body: "A loja continua a mostrar a versão anterior até publicar.",
      href: "/admin/produtos?estado=alteracoes",
      action: "Ver produtos",
    });
  }
  if (catalog.noImage > 0) {
    items.push({
      key: "sem-imagem",
      tone: "warn",
      title: `${plural(catalog.noImage, "produto", "produtos")} sem imagem`,
      body: "Carregue uma fotografia para aparecerem com imagem no catálogo.",
      href: "/admin/produtos?estado=sem-imagem",
      action: "Ver produtos sem imagem",
    });
  }
  return items;
}

// ── Números ────────────────────────────────────────────────────────────────

/**
 * Faixa de números (um painel dividido): 0 fica a cinzento e sem ligação; acima
 * de 0, em tinta e com ligação para a lista filtrada.
 */
function NumberStrip({
  label,
  items,
}: {
  label: string;
  items: { key: string; label: string; value: number; href: string }[];
}) {
  return (
    <ul
      aria-label={label}
      className="bg-line border-line grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border md:grid-cols-4"
    >
      {items.map((item) => {
        const content = (
          <>
            <span className="text-steel block text-[13px]/[18px]">{item.label}</span>
            <span
              className={cn(
                "mt-1 block text-2xl/8 font-semibold tabular-nums",
                item.value === 0 ? "text-steel-light" : "text-ink",
              )}
            >
              {item.value}
            </span>
          </>
        );
        return (
          <li key={item.key} className="bg-surface">
            {item.value > 0 ? (
              <Link
                href={item.href}
                className="hover:bg-surface-alt/60 focus-visible:ring-amber-ink block h-full px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset"
              >
                {content}
              </Link>
            ) : (
              <div className="px-4 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ORDER_COLUMNS: Column<RecentOrder>[] = [
  {
    key: "cliente",
    header: "Cliente",
    primary: true,
    cell: (order) => order.billingAddress.name,
  },
  {
    key: "estado",
    header: "Estado",
    mobile: "title",
    cell: (order) =>
      isOrderStatus(order.status) ? <OrderStatusBadge status={order.status} /> : order.status,
  },
  {
    key: "seguinte",
    header: "O que fazer",
    className: "text-ink-soft",
    cell: (order) => NEXT_STEP[order.status as ActiveStatus] ?? "—",
  },
  {
    key: "numero",
    header: "Encomenda",
    className: "text-steel",
    cell: (order) => <span className="font-mono text-[13px]">{order.number}</span>,
  },
  {
    key: "data",
    header: "Feita",
    className: "text-steel whitespace-nowrap",
    cell: (order) => <RelativeTime date={order.createdAt} />,
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    cell: (order) => <Money cents={order.totalCents} />,
  },
];

export default async function AdminHomePage() {
  await requireAdmin();
  const data = await getDashboard();
  const health = syncHealth({
    lastRunStatus: data.sync.lastRun?.status ?? null,
    lastSuccessAt: data.sync.lastSuccess,
    now: new Date(),
  });

  const steps = setupSteps(data);
  // Guia de arranque: só até haver um produto na loja. Depois disso, o que faltar
  // (margens, mão de obra) aparece apenas em «O que precisa de si».
  const setupOpen = data.catalog.published === 0;
  const attention = attentionItems(data, health);
  const activeTotal = ACTIVE_ORDER_STATUSES.reduce((sum, s) => sum + (data.orderCounts[s] ?? 0), 0);

  return (
    <PageBody>
      <PageHeader
        title="Painel"
        description={
          data.sync.lastSuccess ? (
            <>
              Custos do ERP atualizados <RelativeTime date={data.sync.lastSuccess} />.
            </>
          ) : (
            "Os custos do ERP ainda não foram sincronizados."
          )
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/encomendas">Ver encomendas</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/produtos/novo">
                <Plus aria-hidden strokeWidth={2} />
                Novo produto
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-12">
        {setupOpen && <SetupPanel steps={steps} />}

        <Section
          id="atencao"
          title="O que precisa de si"
          count={attention.length > 0 ? attention.length : undefined}
        >
          {attention.length > 0 ? (
            <ul className="grid gap-2">
              {attention.map((item) => (
                <li key={item.key}>
                  <Notice
                    tone={item.tone}
                    title={item.title}
                    action={
                      <Button asChild variant="outline" size="sm">
                        <Link href={item.href}>{item.action}</Link>
                      </Button>
                    }
                  >
                    {item.body}
                  </Notice>
                </li>
              ))}
            </ul>
          ) : (
            <Panel className="flex items-center gap-2.5 text-sm">
              <CircleCheck aria-hidden className="text-ok size-4 shrink-0" strokeWidth={1.75} />
              Está tudo em dia.
            </Panel>
          )}
        </Section>

        <Section id="encomendas" title="Encomendas por tratar" count={activeTotal}>
          {activeTotal === 0 ? (
            <Panel className="text-ink-soft text-sm">
              Nenhuma encomenda por tratar. As novas chegam também por email.
            </Panel>
          ) : (
            <div className="space-y-4">
              <NumberStrip
                label="Encomendas por estado"
                items={ACTIVE_ORDER_STATUSES.map((status) => ({
                  key: status,
                  label: ORDER_STATUS[status].label,
                  value: data.orderCounts[status] ?? 0,
                  href: `/admin/encomendas?estado=${status}`,
                }))}
              />
              <DataTable
                caption="Encomendas por tratar mais recentes"
                columns={ORDER_COLUMNS}
                rows={data.recentOrders}
                rowKey={(order) => order.id}
                rowHref={(order) => `/admin/encomendas/${order.id}`}
                summary={
                  activeTotal > data.recentOrders.length
                    ? `As ${data.recentOrders.length} mais recentes de ${activeTotal}`
                    : undefined
                }
                empty={null}
              />
            </div>
          )}
        </Section>

        <Section
          id="catalogo"
          title="Catálogo"
          actions={
            <Link href="/admin/produtos" className="link-admin text-sm">
              Todos os produtos
            </Link>
          }
        >
          <NumberStrip
            label="Produtos por estado"
            items={[
              {
                key: "na-loja",
                label: "Na loja",
                value: data.catalog.inStore,
                href: "/admin/produtos?estado=na-loja",
              },
              {
                key: "por-publicar",
                label: "Ainda não publicados",
                value: data.catalog.unpublished,
                href: "/admin/produtos?estado=por-publicar",
              },
              {
                key: "alteracoes",
                label: "Alterações por publicar",
                value: data.catalog.pendingChanges,
                href: "/admin/produtos?estado=alteracoes",
              },
              {
                key: "sem-imagem",
                label: "Sem imagem",
                value: data.catalog.noImage,
                href: "/admin/produtos?estado=sem-imagem",
              },
            ]}
          />
        </Section>
      </div>
    </PageBody>
  );
}
