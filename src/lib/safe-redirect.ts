/**
 * Valida o parâmetro `next` usado para voltar à página original depois do login.
 * Só aceita caminhos relativos da própria app — evita open redirects
 * (ex.: `?next=https://site-malicioso.com` ou `?next=//site-malicioso.com`).
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}
