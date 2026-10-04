import { defineRouting } from "next-intl/routing";

// Por agora só PT. Para ativar ES/FR: acrescentar aqui e criar messages/<locale>.json.
export const routing = defineRouting({
  locales: ["pt"],
  defaultLocale: "pt",
});
