import { notFound } from "next/navigation";

// Endereços que não existem dentro de /[locale]: mostram o 404 da loja (com cabeçalho e rodapé).
export default function CatchAll() {
  notFound();
}
