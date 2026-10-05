import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { routing } from "@/i18n/routing";
import { auth } from "./auth";

/** Sessão do pedido atual (memoizada por pedido). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

function loginPath(next: string, locale: string = routing.defaultLocale) {
  return `/${locale}/entrar?next=${encodeURIComponent(next)}`;
}

/** Exige utilizador autenticado; senão redireciona para o login. */
export async function requireUser(next: string, locale?: string) {
  const session = await getSession();
  if (!session) redirect(loginPath(next, locale));
  return session;
}

/**
 * Exige admin. Chamar em cada página, server action e route handler do backoffice:
 * o proxy só faz uma verificação otimista (existência do cookie).
 * A quem não é admin devolve 404, para não revelar a existência do backoffice.
 */
export async function requireAdmin(next = "/admin") {
  const session = await requireUser(next);
  if (session.user.role !== "admin") notFound();
  return session;
}
