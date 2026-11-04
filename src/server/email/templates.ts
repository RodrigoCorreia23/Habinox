import { formatEuros } from "@/lib/money";
import type { EmailMessage } from "./send";

// Textos simples por agora; templates HTML com a identidade da Habinox mais tarde.

export function verifyEmailMessage(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirme o seu email — Habinox",
    text: `Olá,\n\nPara ativar a sua conta na Habinox, confirme o seu email:\n${url}\n\nSe não criou esta conta, ignore este email.`,
  };
}

export function resetPasswordMessage(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Recuperar password — Habinox",
    text: `Olá,\n\nRecebemos um pedido para alterar a password da sua conta:\n${url}\n\nSe não fez este pedido, ignore este email. A password atual mantém-se.`,
  };
}

interface OrderForEmail {
  number: string;
  email: string;
  phone: string;
  netCents: number;
  vatCents: number;
  totalCents: number;
  shippingAddress: { name: string; line1: string; line2: string; postalCode: string; city: string };
  notes: string | null;
}

interface OrderItemForEmail {
  quantity: number;
  unitNetCents: number;
  snapshot: unknown;
}

function itemLines(items: OrderItemForEmail[]) {
  return items
    .map((item) => {
      const snapshot = item.snapshot as {
        productName: string;
        summary: { name: string; value: string }[];
      };
      const choices = snapshot.summary
        .map((choice) => `   ${choice.name}: ${choice.value}`)
        .join("\n");
      return `- ${item.quantity} × ${snapshot.productName} (${formatEuros(item.unitNetCents)} sem IVA cada)\n${choices}`;
    })
    .join("\n");
}

function totals(order: OrderForEmail) {
  return [
    `Subtotal sem IVA: ${formatEuros(order.netCents)}`,
    `IVA: ${formatEuros(order.vatCents)}`,
    `Total: ${formatEuros(order.totalCents)}`,
  ].join("\n");
}

export function orderConfirmationMessage(
  order: OrderForEmail,
  items: OrderItemForEmail[],
): EmailMessage {
  const address = order.shippingAddress;
  return {
    to: order.email,
    subject: `Recebemos a sua encomenda ${order.number} — Habinox`,
    text: [
      "Olá,",
      "",
      `Recebemos a sua encomenda ${order.number}. Obrigado.`,
      "",
      itemLines(items),
      "",
      totals(order),
      "",
      "Transporte e instalação: a Habinox confirma-os consigo antes do pagamento.",
      "",
      `Entrega: ${address.name}, ${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.postalCode} ${address.city}`,
      "",
      "As medidas indicadas são da sua responsabilidade, como confirmou ao encomendar.",
      "Entraremos em contacto em breve para confirmar os detalhes e o pagamento.",
      "",
      "Habinox",
    ].join("\n"),
  };
}

export function newOrderNoticeMessage(
  to: string,
  order: OrderForEmail,
  items: OrderItemForEmail[],
): EmailMessage {
  return {
    to,
    subject: `Encomenda nova ${order.number} — ${formatEuros(order.totalCents)}`,
    text: [
      `Encomenda ${order.number}`,
      `Cliente: ${order.email} · ${order.phone}`,
      "",
      itemLines(items),
      "",
      totals(order),
      order.notes ? `\nNotas do cliente: ${order.notes}` : "",
      "",
      "Ver no backoffice: /admin/encomendas",
    ].join("\n"),
  };
}
