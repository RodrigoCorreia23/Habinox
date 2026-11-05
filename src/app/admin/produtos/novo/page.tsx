import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { PageBody } from "@/components/admin/page-body";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/section";
import { StepList } from "@/components/admin/step-list";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/session";
import { listLeafCategories } from "@/server/catalog/products";
import { ProductForm } from "../forms";

export const metadata: Metadata = { title: "Novo produto · Habinox" };

/** O que vem depois de criar, a cinzento: o Bruno vê o caminho todo antes de começar. */
const NEXT_STEPS = [
  { title: "Imagem", detail: "A fotografia que aparece na loja." },
  { title: "Opções", detail: "Medidas e escolhas que o cliente preenche." },
  { title: "Regras", detail: "Combinações que não se fazem (se houver)." },
  { title: "Preço", detail: "As linhas de custo: materiais e horas de oficina." },
  { title: "Publicar", detail: "Só então aparece na loja." },
];

export default async function NewProductPage() {
  await requireAdmin("/admin/produtos/novo");
  const categories = await listLeafCategories();

  return (
    <PageBody width="narrow">
      <PageHeader
        crumbs={[{ href: "/admin/produtos", label: "Produtos" }]}
        title="Novo produto"
        description="Depois de criar, vai acrescentar imagem, opções e o preço. O produto só aparece na loja quando o publicar."
      />
      {categories.length === 0 ? (
        <EmptyState
          title="Primeiro, uma categoria"
          action={
            <Button asChild>
              <Link href="/admin/categorias/nova">Criar categoria</Link>
            </Button>
          }
        >
          Cada produto vive numa categoria da loja (ex.: Portões › Portões de correr).
        </EmptyState>
      ) : (
        <div className="grid gap-10">
          <Panel>
            <ProductForm
              id={null}
              initial={{ name: "", slug: "", categoryId: "", description: "" }}
              categories={categories}
            />
          </Panel>
          <section aria-labelledby="depois-de-criar" className="grid gap-3">
            <div>
              <h2 id="depois-de-criar" className="text-ink text-[15px]/[22px] font-semibold">
                A seguir
              </h2>
              <p className="text-steel text-[13px]">Disponível depois de criar.</p>
            </div>
            <StepList
              label="Passos depois de criar o produto"
              steps={NEXT_STEPS.map((step) => ({ ...step, status: "todo" as const }))}
              className="opacity-70"
            />
          </section>
        </div>
      )}
    </PageBody>
  );
}
