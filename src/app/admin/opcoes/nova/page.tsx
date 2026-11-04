import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { OptionForm } from "../forms";

export const metadata: Metadata = { title: "Nova opção · Habinox" };

export default async function NewOptionPage() {
  await requireAdmin("/admin/opcoes/nova");
  return (
    <main className="grid gap-6 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">Nova opção</h1>
      <OptionForm
        id={null}
        initial={{ name: "", key: "", type: "choice", unit: "mm", display: "pills", helpText: "" }}
      />
    </main>
  );
}
