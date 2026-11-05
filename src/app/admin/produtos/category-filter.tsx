"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/admin/field";

/** Filtro por categoria (na URL, ?categoria=): muda a lista logo ao escolher. */
export function CategoryFilter({
  categories,
  value,
  hrefFor,
}: {
  categories: { id: string; label: string }[];
  value: string;
  /** Endereço da lista para cada categoria ("" = todas), já com os outros filtros. */
  hrefFor: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <Select
      aria-label="Categoria"
      value={value}
      onChange={(event) => router.push(hrefFor[event.target.value] ?? "/admin/produtos")}
      wrapperClassName="w-full sm:w-64"
    >
      <option value="">Todas as categorias</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.label}
        </option>
      ))}
    </Select>
  );
}
