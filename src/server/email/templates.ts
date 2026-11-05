/**
 * Emails transacionais: cada um tem HTML (visual da loja, ver html.ts) e texto
 * simples (clientes que não mostram HTML e filtros de spam). Os textos estão em
 * messages/<língua>.json (grupo `Email`) e saem na língua do cliente; o aviso
 * de encomenda nova é para a Habinox e vai sempre em português.
 */
import { createTranslator } from "next-intl";
import { COMPANY } from "@/content/legal/company";
import { intlLocale } from "@/i18n/locales";
import type { Address } from "@/lib/address";
import { type ContentLocale, isContentLocale } from "@/lib/localized";
import { formatEuros } from "@/lib/money";
import { fractionToPercent } from "@/lib/percent";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import it from "../../../messages/it.json";
import nl from "../../../messages/nl.json";
import pt from "../../../messages/pt.json";
import {
  appUrl,
  button,
  C,
  emailDocument,
  escapeHtml,
  fallbackLink,
  heading,
  MONO,
  paragraph,
  rows,
  rule,
} from "./html";
import type { EmailMessage } from "./send";

/** Validade dos links (o auth.ts usa os mesmos valores). */
export const VERIFY_LINK_HOURS = 24;
export const RESET_LINK_HOURS = 1;

const MESSAGES: Record<ContentLocale, typeof pt> = { pt, en, de, fr, it, es, nl };

const BODY = "'IBM Plex Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const DISPLAY = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const SENDER = `${COMPANY.brand} · ${COMPANY.name} · ${COMPANY.address} · <a href="mailto:${COMPANY.email}" style="color:${C.faint};">${COMPANY.email}</a> · ${COMPANY.phone}`;

function translator(locale: string) {
  const lang: ContentLocale = isContentLocale(locale) ? locale : "pt";
  return {
    lang,
    t: createTranslator({ locale: lang, messages: MESSAGES[lang], namespace: "Email" }),
    money: (cents: number) => formatEuros(cents, intlLocale(lang)),
  };
}

type Tr = ReturnType<typeof translator>;

/**
 * A língua de um email de conta vem do link (callbackURL=/en/conta,
 * /de/nova-password…), porque o Better Auth não a passa ao enviar.
 */
export function localeFromAuthUrl(url: string): ContentLocale {
  try {
    const parsed = new URL(url);
    const target = parsed.searchParams.get("callbackURL") ?? parsed.searchParams.get("redirectTo");
    const first = target?.split("/").filter(Boolean)[0] ?? "";
    return isContentLocale(first) ? first : "pt";
  } catch {
    return "pt";
  }
}

function footer(reason: string) {
  return `${escapeHtml(reason)}<br>${SENDER}`;
}

const spacer = (px: number) => `<div style="height:${px}px;line-height:${px}px;">&nbsp;</div>`;

// ── Conta ──────────────────────────────────────────────────────────────────

export function verifyEmailMessage(to: string, url: string, locale = localeFromAuthUrl(url)) {
  const { lang, t } = translator(locale);
  const validity = t("common.hours", { count: VERIFY_LINK_HOURS });
  return {
    to,
    subject: t("verify.subject"),
    text: [
      t("common.hello"),
      "",
      t("verify.text", { validity }),
      url,
      "",
      t("verify.reason"),
      "",
      t("common.signature"),
    ].join("\n"),
    html: emailDocument({
      locale: lang,
      title: t("verify.subject"),
      preheader: t("verify.preheader", { validity }),
      body: [
        heading(t("verify.title"), t("verify.accent")),
        spacer(24),
        paragraph(
          escapeHtml(t("verify.body")).replace(
            "&lt;email&gt;&lt;/email&gt;",
            `<span style="color:${C.text};">${escapeHtml(to)}</span>`,
          ),
        ),
        button(t("verify.button"), url),
        spacer(16),
        paragraph(escapeHtml(t("verify.validity", { validity })), { color: C.faint, size: 13 }),
        fallbackLink(url, t("common.fallback")),
      ].join("\n"),
      footerNote: footer(t("verify.reason")),
    }),
  } satisfies EmailMessage;
}

export function resetPasswordMessage(to: string, url: string, locale = localeFromAuthUrl(url)) {
  const { lang, t } = translator(locale);
  const validity = t("common.hours", { count: RESET_LINK_HOURS });
  return {
    to,
    subject: t("reset.subject"),
    text: [
      t("common.hello"),
      "",
      t("reset.text", { validity }),
      url,
      "",
      t("reset.ignore"),
      "",
      t("common.signature"),
    ].join("\n"),
    html: emailDocument({
      locale: lang,
      title: t("reset.subject"),
      preheader: t("reset.preheader", { validity }),
      body: [
        heading(t("reset.title"), t("reset.accent")),
        spacer(24),
        paragraph(escapeHtml(t("reset.body"))),
        button(t("reset.button"), url),
        spacer(16),
        paragraph(escapeHtml(t("reset.validity", { validity })), { color: C.faint, size: 13 }),
        fallbackLink(url, t("common.fallback")),
      ].join("\n"),
      footerNote: footer(t("reset.reason")),
    }),
  } satisfies EmailMessage;
}

// ── Encomendas ─────────────────────────────────────────────────────────────

interface OrderForEmail {
  id: string;
  number: string;
  email: string;
  phone: string;
  nif: string | null;
  netCents: number;
  vatCents: number;
  totalCents: number;
  vatRate: string;
  billingAddress: Address;
  shippingAddress: Address;
  notes: string | null;
  locale: string;
}

interface OrderItemForEmail {
  quantity: number;
  unitNetCents: number;
  snapshot: unknown;
}

interface ItemSnapshot {
  productName: string;
  summary: { name: string; value: string }[];
}

const snapshotOf = (item: OrderItemForEmail) => item.snapshot as ItemSnapshot;

/** "0.2300" → "23 %" na forma de cada língua (a vírgula do português vem de fractionToPercent). */
function vatPercent(rate: string, lang: ContentLocale) {
  const percent = fractionToPercent(rate);
  return `${lang === "en" ? percent.replace(",", ".") : percent}%`;
}

function addressLines(address: Address) {
  return [
    address.name,
    address.line1,
    address.line2,
    `${address.postalCode} ${address.city}`,
  ].filter(Boolean);
}

const addressText = (address: Address) => addressLines(address).join(", ");
const addressHtml = (address: Address) =>
  addressLines(address)
    .map((line) => escapeHtml(line))
    .join("<br>");

/** Um número (medida, quantidade, código) vai em mono e na cor das cotas. */
const hasDigit = /\d/;

/**
 * Cada artigo: nome grande, quantidade e preço em mono; por baixo, as escolhas
 * num bloco `paper`, como o desenho cotado do configurador. Os nomes e as
 * escolhas já vêm na língua da encomenda (ficaram assim no orçamento).
 */
function itemsHtml(items: OrderItemForEmail[], { t, money }: Tr) {
  return items
    .map((item, index) => {
      const snapshot = snapshotOf(item);
      const choices = snapshot.summary
        .map(
          (choice, i) => `<tr>
<td valign="top" style="padding:8px 12px 8px 0;${i ? `border-top:1px solid #D6CFC4;` : ""}font-family:${BODY};font-size:13px;line-height:1.5;color:#4A4339;">${escapeHtml(choice.name)}</td>
<td valign="top" align="right" style="padding:8px 0;${i ? `border-top:1px solid #D6CFC4;` : ""}font-family:${hasDigit.test(choice.value) ? MONO : BODY};font-size:13px;line-height:1.5;color:${hasDigit.test(choice.value) ? C.dim : C.ink};">${escapeHtml(choice.value)}</td>
</tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${index ? "margin-top:32px;" : ""}">
<tr>
<td valign="bottom" style="padding:0 16px 12px 0;font-family:${DISPLAY};font-stretch:110%;font-weight:400;font-size:22px;line-height:1.2;color:${C.text};">${escapeHtml(snapshot.productName)}</td>
<td valign="bottom" align="right" style="padding:0 0 12px;font-family:${MONO};font-size:13px;line-height:1.5;color:${C.muted};white-space:nowrap;">${item.quantity} × ${money(item.unitNetCents)}<br><span style="color:${C.faint};font-size:11px;">${escapeHtml(t("common.withoutVat"))}</span></td>
</tr>
${choices ? `<tr><td colspan="2" bgcolor="${C.paper}" style="background:${C.paper};padding:8px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${choices}</table></td></tr>` : ""}
</table>`;
    })
    .join("\n");
}

function totalsHtml(order: OrderForEmail, { t, money, lang }: Tr) {
  return rows([
    { label: t("order.subtotal"), value: money(order.netCents), mono: true },
    {
      label: t("order.vat", { rate: vatPercent(order.vatRate, lang) }),
      value: money(order.vatCents),
      mono: true,
    },
    { label: t("order.transport"), value: escapeHtml(t("order.transportValue")) },
    { label: t("order.total"), value: money(order.totalCents), mono: true, strong: true },
  ]);
}

function itemsText(items: OrderItemForEmail[], { t, money }: Tr) {
  return items
    .map((item) => {
      const snapshot = snapshotOf(item);
      const choices = snapshot.summary
        .map((choice) => `   ${choice.name}: ${choice.value}`)
        .join("\n");
      const price = t("order.unitPrice", {
        quantity: item.quantity,
        price: money(item.unitNetCents),
        withoutVat: t("common.withoutVat"),
      });
      return `- ${snapshot.productName}: ${price}\n${choices}`;
    })
    .join("\n");
}

function totalsText(order: OrderForEmail, { t, money, lang }: Tr) {
  return [
    `${t("order.subtotal")}: ${money(order.netCents)}`,
    `${t("order.vat", { rate: vatPercent(order.vatRate, lang) })}: ${money(order.vatCents)}`,
    `${t("order.total")}: ${money(order.totalCents)}`,
  ].join("\n");
}

function orderNumberHtml(number: string, { t }: Tr) {
  return `<p style="margin:24px 0 32px;font-family:${MONO};font-size:15px;line-height:1.4;color:${C.muted};">${escapeHtml(t("common.orderLabel"))} <span style="color:${C.text};font-size:18px;">${escapeHtml(number)}</span></p>`;
}

function sectionTitle(text: string) {
  return `<h2 style="margin:0 0 16px;font-family:${DISPLAY};font-stretch:115%;font-weight:300;font-size:24px;line-height:1.2;color:${C.text};">${escapeHtml(text)}</h2>`;
}

function orderUrl(order: { number: string }, lang: ContentLocale) {
  return appUrl(`/${lang}/encomenda/${encodeURIComponent(order.number)}`);
}

export function orderConfirmationMessage(
  order: OrderForEmail,
  items: OrderItemForEmail[],
): EmailMessage {
  const tr = translator(order.locale);
  const { lang, t, money } = tr;
  const url = orderUrl(order, lang);
  return {
    to: order.email,
    subject: t("order.subject", { number: order.number }),
    text: [
      t("common.hello"),
      "",
      t("order.textReceived", { number: order.number }),
      "",
      itemsText(items, tr),
      "",
      totalsText(order, tr),
      "",
      t("order.textTransport"),
      "",
      t("order.textDelivery", { address: addressText(order.shippingAddress) }),
      "",
      t("order.textMeasures"),
      t("order.textContact"),
      "",
      t("common.viewOrderText", { url }),
      "",
      t("common.signature"),
    ].join("\n"),
    html: emailDocument({
      locale: lang,
      title: `${t("common.orderLabel")} ${order.number}`,
      preheader: t("order.preheader", { total: money(order.totalCents) }),
      body: [
        heading(t("order.title"), t("order.accent")),
        orderNumberHtml(order.number, tr),
        paragraph(escapeHtml(t("order.thanks"))),
        rule(),
        itemsHtml(items, tr),
        spacer(24),
        totalsHtml(order, tr),
        rule(),
        sectionTitle(t("order.delivery")),
        paragraph(addressHtml(order.shippingAddress)),
        paragraph(escapeHtml(t("order.measures")), { color: C.faint, size: 13 }),
        button(t("common.viewOrder"), url),
      ].join("\n"),
      footerNote: footer(t("common.orderReason", { number: order.number })),
    }),
  };
}

/** Aviso à Habinox (sempre em português): o que é preciso para ligar ao cliente. */
export function newOrderNoticeMessage(
  to: string,
  order: OrderForEmail,
  items: OrderItemForEmail[],
): EmailMessage {
  const tr = translator("pt");
  const { money } = tr;
  const url = appUrl(`/admin/encomendas/${order.id}`);
  const client = order.billingAddress.name;
  const language = order.locale !== "pt" ? ` · encomendou em ${order.locale.toUpperCase()}` : "";
  return {
    to,
    subject: `Encomenda nova ${order.number} — ${money(order.totalCents)}`,
    text: [
      `Encomenda ${order.number}${language}`,
      `Cliente: ${client} · ${order.email} · ${order.phone}${order.nif ? ` · NIF ${order.nif}` : ""}`,
      "",
      itemsText(items, tr),
      "",
      totalsText(order, tr),
      order.notes ? `\nNotas do cliente: ${order.notes}` : "",
      "",
      `Faturação: ${addressText(order.billingAddress)}`,
      `Entrega: ${addressText(order.shippingAddress)}`,
      "",
      `Ver no backoffice: ${url}`,
    ].join("\n"),
    html: emailDocument({
      locale: "pt",
      title: `Encomenda nova ${order.number}`,
      preheader: `${client} · ${money(order.totalCents)} · ${items.length} ${items.length === 1 ? "artigo" : "artigos"}${language}`,
      body: [
        heading("Encomenda nova", order.number),
        spacer(32),
        rows([
          { label: "Cliente", value: escapeHtml(client) },
          {
            label: "Telefone",
            value: `<a href="tel:${escapeHtml(order.phone.replace(/\s+/g, ""))}" style="color:${C.text};font-family:${MONO};">${escapeHtml(order.phone)}</a>`,
          },
          {
            label: "Email",
            value: `<a href="mailto:${escapeHtml(order.email)}" style="color:${C.text};">${escapeHtml(order.email)}</a>`,
          },
          ...(order.nif ? [{ label: "NIF", value: escapeHtml(order.nif), mono: true }] : []),
          ...(order.locale !== "pt"
            ? [
                {
                  label: "Língua do cliente",
                  value: escapeHtml(order.locale.toUpperCase()),
                  mono: true,
                },
              ]
            : []),
          { label: "Total com IVA", value: money(order.totalCents), mono: true, strong: true },
        ]),
        order.notes
          ? `<div style="margin:24px 0 0;padding:4px 0 4px 16px;border-left:1px solid ${C.amber};">${paragraph(
              `<span style="color:${C.faint};font-size:13px;">Notas do cliente</span><br>${escapeHtml(order.notes).replaceAll("\n", "<br>")}`,
              { color: C.text, size: 15 },
            )}</div>`
          : "",
        rule(),
        itemsHtml(items, tr),
        spacer(24),
        totalsHtml(order, tr),
        rule(),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" width="50%" style="padding-right:12px;">${sectionTitle("Faturação")}${paragraph(addressHtml(order.billingAddress), { size: 14 })}</td>
<td valign="top" width="50%" style="padding-left:12px;">${sectionTitle("Entrega")}${paragraph(addressHtml(order.shippingAddress), { size: 14 })}</td>
</tr></table>`,
        button("Abrir no backoffice", url),
      ].join("\n"),
      footerNote: footer(
        "Aviso automático da loja: chega ao email definido em Backoffice › Parâmetros.",
      ),
    }),
  };
}

// ── Estados ────────────────────────────────────────────────────────────────

/** A linha de fabrico que o cliente vê: as etapas por onde passa a encomenda. */
const STAGES = [
  "pending_payment",
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
] as const;

const STATUS_WITH_COPY = [
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
] as const;

function productionLine(status: string, { t }: Tr) {
  const current = STAGES.findIndex((stage) => stage === status);
  if (current < 0) return "";
  const cells = STAGES.map((stage, index) => {
    const color = index === current ? C.amber : index < current ? C.text : C.line;
    const label = index === current ? C.amber : index < current ? C.soft : C.faint;
    return `<td valign="top" width="16%" style="padding:0 6px 0 0;">
<div style="height:2px;line-height:2px;font-size:2px;background:${color};">&nbsp;</div>
<p class="stage" style="margin:10px 0 0;font-family:${MONO};font-size:10px;line-height:1.3;letter-spacing:0.08em;text-transform:uppercase;color:${label};">${escapeHtml(t(`status.stages.${stage}`))}</p>
</td>`;
  }).join("");
  const label = t("status.stateLabel", { stage: t(`status.stages.${STAGES[current]!}`) });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 32px;" aria-label="${escapeHtml(label)}"><tr>${cells}</tr></table>`;
}

export function orderStatusMessage(
  order: { number: string; email: string; locale: string },
  status: string,
  note: string,
): EmailMessage {
  const tr = translator(order.locale);
  const { lang, t } = tr;
  const key = (STATUS_WITH_COPY as readonly string[]).includes(status)
    ? (status as (typeof STATUS_WITH_COPY)[number])
    : "other";
  const text = t(`status.${key}.text`);
  const url = orderUrl(order, lang);
  return {
    to: order.email,
    subject: t("status.subject", { number: order.number, summary: text.split(".")[0] ?? text }),
    text: [
      t("common.hello"),
      "",
      text,
      note ? `\n${note}` : "",
      "",
      `${t("common.orderLabel")}: ${order.number}`,
      t("common.viewOrderText", { url }),
      "",
      t("common.signature"),
    ].join("\n"),
    html: emailDocument({
      locale: lang,
      title: `${t("common.orderLabel")} ${order.number}`,
      preheader: text,
      body: [
        heading(t(`status.${key}.title`), t(`status.${key}.accent`)),
        orderNumberHtml(order.number, tr),
        productionLine(status, tr),
        paragraph(escapeHtml(text)),
        note
          ? `<div style="margin:8px 0 16px;padding:4px 0 4px 16px;border-left:1px solid ${C.lineStrong};">${paragraph(
              `<span style="color:${C.faint};font-size:13px;">${escapeHtml(t("status.note"))}</span><br>${escapeHtml(note).replaceAll("\n", "<br>")}`,
              { color: C.text, size: 15 },
            )}</div>`
          : "",
        button(t("common.viewOrder"), url),
      ].join("\n"),
      footerNote: footer(t("common.orderReason", { number: order.number })),
    }),
  };
}
