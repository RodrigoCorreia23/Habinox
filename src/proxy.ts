import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tudo exceto API, backoffice, internos do Next e ficheiros com extensão.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
