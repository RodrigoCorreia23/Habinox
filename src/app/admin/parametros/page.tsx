import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { listSettings } from "@/server/settings";
import { type EditableSetting, settingToInput } from "@/server/settings-form";
import { SettingForm } from "./setting-form";

export const metadata: Metadata = { title: "Parâmetros · Habinox" };

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

export default async function SettingsPage() {
  await requireAdmin("/admin/parametros");
  const rows = new Map((await listSettings()).map((row) => [row.key, row]));
  const value = (key: EditableSetting) => {
    const row = rows.get(key);
    return row ? settingToInput(key, row.value) : "";
  };
  const changed = (key: EditableSetting) => {
    const row = rows.get(key);
    if (!row?.updatedBy) return null;
    return (
      <p className="text-steel text-xs">
        Alterado a {dateFormat.format(row.updatedAt)} por {row.updatedBy}.
      </p>
    );
  };

  return (
    <main className="grid gap-8 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Parâmetros</h1>
        <p className="text-steel mt-1 max-w-3xl text-sm">
          Valores que mudam preços e prazos em toda a loja. Cada alteração fica registada com a data
          e quem a fez.
        </p>
      </header>

      <section aria-labelledby="precos" className="grid max-w-3xl gap-3">
        <h2 id="precos" className="font-semibold">
          Preços
        </h2>
        <div className="border-line bg-surface divide-line-soft divide-y border">
          <div className="grid gap-2 px-4 py-4">
            <SettingForm
              settingKey="vat_rate"
              label="Taxa de IVA"
              initial={value("vat_rate")}
              unit="%"
            />
            <p className="text-steel text-sm">
              Aplica-se aos preços calculados a partir de agora. Orçamentos já guardados e
              encomendas mantêm a taxa com que foram feitos (até o orçamento expirar).
            </p>
            {changed("vat_rate")}
          </div>
          <div className="grid gap-2 px-4 py-4">
            <SettingForm
              settingKey="quote_validity_days"
              label="Validade dos orçamentos"
              initial={value("quote_validity_days")}
              unit="dias"
            />
            <p className="text-steel text-sm">
              Durante quanto tempo um produto no carrinho mantém o preço. Depois disso é recalculado
              com os custos do momento. Muda só os orçamentos novos.
            </p>
            {changed("quote_validity_days")}
          </div>
        </div>
      </section>

      <section aria-labelledby="encomendas" className="grid max-w-3xl gap-3">
        <h2 id="encomendas" className="font-semibold">
          Encomendas
        </h2>
        <div className="border-line bg-surface divide-line-soft divide-y border">
          <div className="grid gap-2 px-4 py-4">
            <SettingForm
              settingKey="order_expiry_days"
              label="Expirar encomendas por pagar ao fim de"
              initial={value("order_expiry_days")}
              unit="dias"
              placeholder="desligado"
            />
            <p className="text-steel text-sm">
              Uma vez por dia, as encomendas à espera de pagamento há mais dias do que isto passam a
              “Expirada” e o cliente recebe um email. Deixe vazio para nunca expirarem (enquanto o
              pagamento é combinado à parte).
            </p>
            {changed("order_expiry_days")}
          </div>
          <div className="grid gap-2 px-4 py-4">
            <SettingForm
              settingKey="orders_notify_email"
              label="Email para avisos de encomenda nova"
              initial={value("orders_notify_email")}
              type="email"
              wide
            />
            {changed("orders_notify_email")}
          </div>
        </div>
      </section>
    </main>
  );
}
