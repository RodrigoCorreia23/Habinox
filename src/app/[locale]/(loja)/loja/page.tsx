import { redirect } from "next/navigation";

// O catálogo vive na página inicial (estado "loja", com as categorias em filas).
export default async function CatalogPage({ params }: PageProps<"/[locale]/loja">) {
  const { locale } = await params;
  redirect(`/${locale}#familias`);
}
