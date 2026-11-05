import type { Metadata } from "next";
import { RelativeTime } from "@/components/admin/format";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Panel, Section } from "@/components/admin/section";
import { requireAdmin } from "@/server/auth/session";
import { listSettings } from "@/server/settings";
import { type EditableSetting, settingToInput } from "@/server/settings-form";
import { settingInputId } from "./ids";
import { ExpiryForm, NotifyEmailForm, ValidityForm, VatForm } from "./setting-form";
import { priceExample } from "./vat-example";

export const metadata: Metadata = { title: "Parâmetros · Habinox" };

/**
 * Uma linha de definição: à esquerda o rótulo, o que faz e quem mexeu por último;
 * à direita o campo e o Guardar, sempre na mesma coluna.
 */
function SettingRow({
  settingKey,
  label,
  description,
  changed,
  children,
}: {
  settingKey: EditableSetting;
  label: string;
  description: React.ReactNode;
  changed: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-line-soft grid gap-x-6 gap-y-3 border-b py-6 last:border-b-0 md:grid-cols-[280px_minmax(0,1fr)]">
      <div className="max-w-prose">
        <label
          htmlFor={settingInputId(settingKey)}
          className="text-ink block text-sm/5 font-medium"
        >
          {label}
        </label>
        <p className="text-steel mt-1 text-[13px]/[18px]">{description}</p>
        {changed}
      </div>
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  await requireAdmin("/admin/parametros");
  const [rows, example] = await Promise.all([
    listSettings().then((list) => new Map(list.map((row) => [row.key, row]))),
    priceExample(),
  ]);
  const now = new Date();
  const value = (key: EditableSetting) => {
    const row = rows.get(key);
    return row ? settingToInput(key, row.value) : "";
  };
  const changed = (key: EditableSetting) => {
    const row = rows.get(key);
    if (!row?.updatedBy) return null;
    return (
      <p className="text-steel-light mt-2 text-xs">
        Alterado <RelativeTime date={row.updatedAt} now={now} /> por{" "}
        {row.updatedByName || row.updatedBy}
      </p>
    );
  };

  return (
    <PageBody>
      <PageHeader
        title="Parâmetros"
        description="Valores que mudam preços e prazos em toda a loja; cada alteração fica registada com a data e quem a fez."
      />

      <div className="max-w-[880px] space-y-12">
        <Section id="precos" title="Preços">
          <Panel className="py-0">
            <SettingRow
              settingKey="vat_rate"
              label="Taxa de IVA"
              description="Entra nos preços da loja a partir do momento em que guardar."
              changed={changed("vat_rate")}
            >
              <VatForm initial={value("vat_rate")} example={example} />
            </SettingRow>
            <SettingRow
              settingKey="quote_validity_days"
              label="Validade dos orçamentos"
              description="Quanto tempo um produto no carrinho mantém o preço. Depois disso, é recalculado com os custos do momento."
              changed={changed("quote_validity_days")}
            >
              <ValidityForm initial={value("quote_validity_days")} now={now.toISOString()} />
            </SettingRow>
          </Panel>
        </Section>

        <Section id="encomendas" title="Encomendas">
          <Panel className="py-0">
            <SettingRow
              settingKey="order_expiry_days"
              label="Expirar automaticamente as encomendas por pagar"
              description="Uma vez por dia, as que passam do prazo ficam «Expirada». O cliente recebe um email a avisar."
              changed={changed("order_expiry_days")}
            >
              <ExpiryForm initial={value("order_expiry_days")} now={now.toISOString()} />
            </SettingRow>
            <SettingRow
              settingKey="orders_notify_email"
              label="Email para avisos de encomenda nova"
              description="Recebe um email sempre que entra uma encomenda."
              changed={changed("orders_notify_email")}
            >
              <NotifyEmailForm initial={value("orders_notify_email")} />
            </SettingRow>
          </Panel>
        </Section>
      </div>
    </PageBody>
  );
}
