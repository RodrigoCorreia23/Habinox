import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Usar estes em vez dos de next/link e next/navigation nas páginas com locale.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
