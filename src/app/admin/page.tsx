import { requireAdmin } from "@/server/auth/session";

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <main className="px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Painel</h1>
    </main>
  );
}
