import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

const PROTECTED_LOCALE_PATH = /^\/([a-z]{2})\/conta(\/|$)/;

/**
 * Verificação otimista: só confirma que existe cookie de sessão, para redirecionar
 * cedo para o login. A verificação real (sessão válida, papel) é feita no servidor
 * por requireUser/requireAdmin.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const accountMatch = PROTECTED_LOCALE_PATH.exec(pathname);

  if ((isAdmin || accountMatch) && !getSessionCookie(request)) {
    const locale = accountMatch?.[1] ?? routing.defaultLocale;
    const url = new URL(`/${locale}/entrar`, request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (isAdmin) return NextResponse.next();
  return intl(request);
}

export const config = {
  // Tudo exceto API, internos do Next e ficheiros com extensão.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
