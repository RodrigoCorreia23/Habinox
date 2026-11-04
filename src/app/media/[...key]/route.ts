import { getStorage, KEY_PATTERN } from "@/server/storage";

// Serve as imagens guardadas. As chaves são únicas (um ficheiro novo por envio),
// por isso podem ficar em cache para sempre.
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!KEY_PATTERN.test(key)) return new Response("Não encontrado", { status: 404 });
  const object = await getStorage().get(key);
  if (!object) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
