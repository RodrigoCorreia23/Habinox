import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/server/email/html";
import {
  localeFromAuthUrl,
  newOrderNoticeMessage,
  orderConfirmationMessage,
  orderStatusMessage,
  resetPasswordMessage,
  verifyEmailMessage,
} from "@/server/email/templates";

const address = {
  name: "Maria <b>Silva</b>",
  line1: "Rua da Ribeira, 12",
  line2: "",
  postalCode: "4740-011",
  city: "Esposende",
  country: "PT" as const,
};
const order = {
  id: "0b3c6a1e-5f2d-4c1a-9e7b-2d4f6a8c0e11",
  number: "HAB-2026-00042",
  email: "maria@exemplo.pt",
  phone: "912 345 678",
  nif: null,
  netCents: 89548,
  vatCents: 20596,
  totalCents: 110144,
  vatRate: "0.2300",
  billingAddress: address,
  shippingAddress: address,
  notes: '<script>alert("x")</script>',
  locale: "pt",
};
const items = [
  {
    quantity: 1,
    unitNetCents: 89548,
    snapshot: {
      productName: "Portão <i>de correr</i>",
      summary: [{ name: "Largura", value: "400 cm" }],
    },
  },
];

describe("escapeHtml", () => {
  it("escapa os cinco caracteres perigosos", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("emails de encomenda", () => {
  it("nunca deixa passar HTML vindo do cliente", () => {
    for (const message of [
      orderConfirmationMessage(order, items),
      newOrderNoticeMessage("geral@habinox.pt", order, items),
    ]) {
      expect(message.html).not.toContain("<script>");
      expect(message.html).not.toContain("<b>Silva</b>");
      expect(message.html).not.toContain("<i>de correr</i>");
      expect(message.html).toContain("Maria &lt;b&gt;Silva&lt;/b&gt;");
    }
  });

  it("tem HTML e texto, com o número, o total e a taxa de IVA", () => {
    const message = orderConfirmationMessage(order, items);
    for (const body of [message.html!, message.text]) {
      expect(body).toContain("HAB-2026-00042");
      expect(body).toMatch(/1\s101,44\s€/);
      expect(body).toContain("IVA (23%)");
    }
  });

  it("os links são absolutos (o email abre fora do site)", () => {
    expect(orderConfirmationMessage(order, items).html).toContain(
      'href="http://localhost:3000/pt/encomenda/HAB-2026-00042"',
    );
    const notice = newOrderNoticeMessage("geral@habinox.pt", order, items);
    expect(notice.html).toContain(`http://localhost:3000/admin/encomendas/${order.id}`);
    expect(notice.text).toContain(`http://localhost:3000/admin/encomendas/${order.id}`);
    expect(notice.html).toContain('src="http://localhost:3000/brand/habinox-logo-email.png"');
  });
});

describe("email de mudança de estado", () => {
  it("mostra a linha de fabrico com a etapa atual", () => {
    const html = orderStatusMessage(order, "in_production", "").html!;
    expect(html).toContain('aria-label="Estado: Em produção"');
  });

  it("cancelada não mostra a linha e escapa a nota", () => {
    const message = orderStatusMessage(order, "cancelled", "A pedido <do cliente>");
    expect(message.html).not.toContain("Estado:");
    expect(message.html).toContain("A pedido &lt;do cliente&gt;");
    expect(message.subject).toBe(
      "Encomenda HAB-2026-00042: A sua encomenda foi cancelada — Habinox",
    );
  });
});

describe("emails de conta", () => {
  it("dizem a validade do link e escapam o URL", () => {
    const verify = verifyEmailMessage("a@b.pt", "http://x/verify?token=1&cb=/pt");
    expect(verify.html).toContain("24 horas");
    expect(verify.html).toContain("token=1&amp;cb=/pt");
    expect(resetPasswordMessage("a@b.pt", "http://x/r").html).toContain("1 hora");
  });
});

describe("emails noutras línguas", () => {
  it("a encomenda sai na língua em que foi feita, com o link certo", () => {
    const message = orderConfirmationMessage({ ...order, locale: "de" }, items);
    expect(message.subject).toBe("Wir haben Ihre Bestellung HAB-2026-00042 erhalten — Habinox");
    expect(message.html).toContain('lang="de"');
    expect(message.html).toContain("http://localhost:3000/de/encomenda/HAB-2026-00042");
    expect(message.html).toContain("MwSt. (23%)");
  });

  it("em inglês o preço vem no formato inglês", () => {
    const message = orderConfirmationMessage({ ...order, locale: "en" }, items);
    expect(message.text).toContain("€1,101.44");
  });

  it("uma língua desconhecida cai no português", () => {
    expect(orderStatusMessage({ ...order, locale: "xx" }, "paid", "").subject).toContain(
      "O pagamento foi confirmado",
    );
  });

  it("o aviso à Habinox é sempre em português e diz a língua do cliente", () => {
    const notice = newOrderNoticeMessage("geral@habinox.pt", { ...order, locale: "fr" }, items);
    expect(notice.subject).toContain("Encomenda nova");
    expect(notice.html).toContain("Língua do cliente");
  });

  it("os emails de conta tiram a língua do link", () => {
    expect(localeFromAuthUrl("http://x/api/auth/verify-email?token=1&callbackURL=/nl/conta")).toBe(
      "nl",
    );
    expect(localeFromAuthUrl("http://x/reset/abc?callbackURL=%2Fes%2Fnova-password")).toBe("es");
    expect(localeFromAuthUrl("http://x/verify?token=1")).toBe("pt");
    expect(verifyEmailMessage("a@b.pt", "http://x/v?callbackURL=/fr/conta").subject).toBe(
      "Confirmez votre e-mail — Habinox",
    );
  });
});
