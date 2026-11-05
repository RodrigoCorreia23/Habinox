/**
 * HTML dos emails transacionais, no visual da loja (DESIGN.md): fundo grafite
 * de ponta a ponta, título grande e fino com a segunda linha em âmbar, números
 * em monoespaçada, linhas de 1px e um só bloco claro (`paper`) para as medidas.
 *
 * Regras de email, não de browser: tabelas para o layout, estilos em linha,
 * cores também em `bgcolor`, nada de SVG nem de JavaScript, imagens com URL
 * absoluto e texto alternativo. Tudo o que vem de fora (nomes, moradas, notas)
 * passa por `escapeHtml`.
 */
import { env } from "@/env";

export const C = {
  ground: "#0F0E0D",
  surface: "#181715",
  line: "#2A2724",
  lineStrong: "#706960",
  text: "#EEE9E2",
  soft: "#C9C2B8",
  muted: "#A8A095",
  faint: "#8E867B",
  amber: "#D6A25E",
  onAmber: "#15120E",
  paper: "#E9E4DC",
  dim: "#8A5A1E",
  ink: "#15120E",
} as const;

const DISPLAY = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BODY = "'IBM Plex Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO = "'IBM Plex Mono', Menlo, Consolas, 'Courier New', monospace";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** URL absoluto da app (os emails abrem fora do site). */
export function appUrl(path: string): string {
  return new URL(path, env.BETTER_AUTH_URL).toString();
}

/** Título em duas linhas, como na loja: "Recebemos / a sua encomenda." */
export function heading(first: string, accent?: string): string {
  return `<h1 style="margin:0;font-family:${DISPLAY};font-stretch:115%;font-weight:300;font-size:40px;line-height:1.04;letter-spacing:-0.01em;color:${C.text};">${escapeHtml(first)}${
    accent ? `<br><span style="color:${C.amber};">${escapeHtml(accent)}</span>` : ""
  }</h1>`;
}

export function paragraph(
  html: string,
  { color = C.soft as string, size = 16 }: { color?: string; size?: number } = {},
): string {
  return `<p style="margin:0 0 16px;font-family:${BODY};font-size:${size}px;line-height:1.6;color:${color};">${html}</p>`;
}

/** Botão principal: retangular, âmbar, um por email. Funciona no Outlook (célula com bgcolor). */
export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
<tr><td bgcolor="${C.amber}" style="background:${C.amber};">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:18px 32px;font-family:${BODY};font-size:16px;font-weight:500;line-height:1;color:${C.onAmber};text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

/** O link do botão também por extenso, para quem não vê o botão (ou copia). */
export function fallbackLink(href: string, label: string): string {
  return `<p style="margin:24px 0 0;font-family:${BODY};font-size:13px;line-height:1.6;color:${C.faint};">${escapeHtml(label)}<br><a href="${escapeHtml(href)}" style="font-family:${MONO};font-size:12px;color:${C.soft};word-break:break-all;">${escapeHtml(href)}</a></p>`;
}

export function rule(margin = 32): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${margin}px 0;"><tr><td height="1" bgcolor="${C.line}" style="height:1px;line-height:1px;font-size:1px;background:${C.line};">&nbsp;</td></tr></table>`;
}

/** Linhas etiqueta → valor, separadas por 1px (sem caixas). */
export function rows(
  entries: { label: string; value: string; mono?: boolean; strong?: boolean }[],
): string {
  const cells = entries
    .map(
      (entry, index) => `<tr>
<td valign="top" style="padding:12px 16px 12px 0;${index ? `border-top:1px solid ${C.line};` : ""}font-family:${BODY};font-size:14px;line-height:1.5;color:${C.muted};">${escapeHtml(entry.label)}</td>
<td valign="top" align="right" style="padding:12px 0;${index ? `border-top:1px solid ${C.line};` : ""}font-family:${entry.mono ? MONO : BODY};font-size:${entry.strong ? 18 : 14}px;line-height:1.5;color:${entry.strong ? C.text : C.soft};${entry.strong ? "font-weight:500;" : ""}">${entry.value}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table>`;
}

/**
 * Página completa: fundo grafite de ponta a ponta, coluna de 600px, logótipo
 * branco, conteúdo e rodapé com quem envia e porquê. `preheader` é a linha
 * que aparece ao lado do assunto na caixa de entrada.
 */
export function emailDocument({
  locale,
  title,
  preheader,
  body,
  footerNote,
}: {
  locale: string;
  title: string;
  preheader: string;
  body: string;
  footerNote: string;
}): string {
  return `<!doctype html>
<html lang="${escapeHtml(locale)}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
<link href="${FONTS_HREF}" rel="stylesheet">
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; background:${C.ground}; }
  a { color:${C.text}; }
  @media (max-width: 620px) {
    .px { padding-left:20px !important; padding-right:20px !important; }
    h1 { font-size:32px !important; }
    .stage { font-size:8px !important; letter-spacing:0.02em !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.ground};" bgcolor="${C.ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.ground};font-size:1px;line-height:1px;">${escapeHtml(preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ground}" style="background:${C.ground};">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td class="px" style="padding:40px 40px 0;">
<a href="${appUrl(`/${locale}`)}" style="text-decoration:none;"><img src="${appUrl("/brand/habinox-logo-email.png")}" width="135" height="26" alt="HABINOX" style="display:block;border:0;color:${C.text};font-family:${DISPLAY};font-size:20px;font-weight:700;"></a>
</td></tr>
<tr><td class="px" style="padding:56px 40px 0;">
${body}
</td></tr>
<tr><td class="px" style="padding:56px 40px 48px;">
${rule(0)}
<p style="margin:24px 0 0;font-family:${BODY};font-size:12px;line-height:1.7;color:${C.faint};">${footerNote}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
