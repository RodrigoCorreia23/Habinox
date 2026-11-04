import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { listLeafCategories } from "@/server/catalog/products";
import { ProductForm } from "../forms";

export const metadata: Metadata = { title: "Novo produto · Habinox" };

export default async function NewProductPage() {
  await requireAdmin("/admin/produtos/novo");
  const categories = await listLeafCategories();

  return (
    <main className="grid gap-6 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">Novo produto</h1>
      {categories.length === 0 ? (
        <p className="text-steel text-sm">
          Primeiro crie uma{" "}
          <Link
            href="/admin/categorias/nova"
            className="text-brand underline-offset-4 hover:underline"
          >
            categoria
          </Link>
          .
        </p>
      ) : (
        <ProductForm
          id={null}
          initial={{ name: "", slug: "", categoryId: "", description: "" }}
          categories={categories}
        />
      )}
    </main>
  );
}
