/**
 * Envio de imagens do backoffice (categorias e produtos). Rota e não server
 * action: as server actions estão limitadas a 1 MB por pedido.
 */
import { z } from "zod";
import { focusSchema } from "@/lib/images";
import { log } from "@/lib/log";
import { getSession } from "@/server/auth/session";
import { removeImage, setImage } from "@/server/catalog/images";

const fieldsSchema = z.object({
  slot: z.enum(["category", "product"]),
  id: z.uuid(),
  action: z.enum(["save", "remove"]),
  focusX: z.coerce.number(),
  focusY: z.coerce.number(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.user.role !== "admin")
    return Response.json({ ok: false, message: "Sem acesso." }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, message: "Pedido inválido." }, { status: 400 });
  }
  const parsed = fieldsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return Response.json({ ok: false, message: "Pedido inválido." }, { status: 400 });
  const { slot, id, action, focusX, focusY } = parsed.data;

  try {
    if (action === "remove") {
      const result = await removeImage(slot, id);
      log.info("image.removed", { slot, id, userId: session.user.id });
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }
    const focus = focusSchema.safeParse({ x: focusX, y: focusY });
    if (!focus.success)
      return Response.json({ ok: false, message: "Ponto de foco inválido." }, { status: 400 });
    const file = form.get("file");
    const result = await setImage(
      slot,
      id,
      file instanceof File && file.size > 0 ? file : null,
      focus.data,
    );
    if (result.ok) log.info("image.saved", { slot, id, userId: session.user.id, url: result.url });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    log.error("image.failed", { slot, id, error });
    return Response.json(
      { ok: false, message: "Não foi possível guardar a imagem." },
      { status: 500 },
    );
  }
}
