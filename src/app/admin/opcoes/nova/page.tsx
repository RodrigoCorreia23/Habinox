import type { Metadata } from "next";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getProduct } from "@/server/catalog/products";
import { NewOptionForm } from "../forms";

export const metadata: Metadata = { title: "Nova opção · Habinox" };

export default async function NewOptionPage({ searchParams }: PageProps<"/admin/opcoes/nova">) {
  await requireAdmin("/admin/opcoes/nova");
  const { produto } = await searchParams;
  const product =
    typeof produto === "string" && z.uuid().safeParse(produto).success
      ? await getProduct(produto)
      : null;
  return (
    <PageBody width="narrow">
      <PageHeader
        crumbs={[{ href: "/admin/opcoes", label: "Opções" }]}
        title="Nova opção"
        description={
          product
            ? `Uma pergunta ao cliente. Fica guardada nas Opções (pode reaproveitá-la noutros produtos) e é acrescentada a «${product.product.name.pt}».`
            : "Uma pergunta ao cliente, que depois pode usar em vários produtos."
        }
      />
      <NewOptionForm
        productId={product?.working ? product.product.id : undefined}
        initial={{ name: "", key: "", type: "choice", unit: "mm", display: "pills", helpText: "" }}
      />
    </PageBody>
  );
}
