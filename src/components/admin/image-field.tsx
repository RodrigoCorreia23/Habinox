"use client";

/**
 * Imagem de uma categoria ou de um produto: escolher o ficheiro, ver o recorte
 * em cada formato onde a imagem aparece e clicar na imagem para marcar o ponto
 * de foco (o que fica sempre visível quando o recorte é estreito, ex. no telemóvel).
 */
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_IMAGE_TYPES,
  CENTER,
  checkImageSize,
  type Focus,
  IMAGE_SLOTS,
  type ImageSlotKey,
  MAX_IMAGE_BYTES,
  objectPosition,
} from "@/lib/images";

export function ImageField({
  slot,
  id,
  initialUrl,
  initialFocus,
}: {
  slot: ImageSlotKey;
  id: string;
  initialUrl: string | null;
  initialFocus: Focus | null;
}) {
  const router = useRouter();
  const { minWidth, minHeight, crops } = IMAGE_SLOTS[slot];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [focus, setFocus] = useState<Focus>(initialFocus ?? CENTER);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const changed =
    file !== null ||
    focus.x !== (initialFocus ?? CENTER).x ||
    focus.y !== (initialFocus ?? CENTER).y;

  // O URL temporário do ficheiro escolhido liberta-se quando deixa de ser usado.
  useEffect(() => {
    if (!preview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(chosen: File | undefined) {
    setStatus(null);
    setError(null);
    if (!chosen) return;
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(chosen.type)) {
      setError("Formato não aceite: use JPEG, PNG ou WebP.");
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      setError("A imagem tem mais de 10 MB.");
      return;
    }
    const url = URL.createObjectURL(chosen);
    const image = new window.Image();
    image.onload = () => {
      const tooSmall = checkImageSize(slot, image.naturalWidth, image.naturalHeight);
      if (tooSmall) {
        URL.revokeObjectURL(url);
        setError(tooSmall);
        return;
      }
      setFile(chosen);
      setPreview(url);
      setFocus(CENTER);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("O ficheiro não é uma imagem válida.");
    };
    image.src = url;
  }

  function pickFocus(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setFocus({
      x: Math.round(((event.clientX - box.left) / box.width) * 1000) / 10,
      y: Math.round(((event.clientY - box.top) / box.height) * 1000) / 10,
    });
    setStatus(null);
  }

  async function send(action: "save" | "remove") {
    setPending(true);
    setError(null);
    setStatus(null);
    const form = new FormData();
    form.set("slot", slot);
    form.set("id", id);
    form.set("action", action);
    form.set("focusX", String(focus.x));
    form.set("focusY", String(focus.y));
    if (action === "save" && file) form.set("file", file);
    const response = await fetch("/admin/imagens", { method: "POST", body: form }).catch(
      () => null,
    );
    const result = (await response?.json().catch(() => null)) as {
      ok: boolean;
      message?: string;
      url?: string;
    } | null;
    setPending(false);
    if (!result?.ok) {
      setError(result?.message ?? "Não foi possível guardar a imagem.");
      return;
    }
    setFile(null);
    if (action === "remove") {
      setPreview(null);
      setFocus(CENTER);
      setStatus("Imagem removida.");
    } else {
      setPreview(result.url ?? preview);
      setStatus("Imagem guardada.");
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <p className="text-steel text-sm">
        Mínimo {minWidth} × {minHeight} px; JPEG, PNG ou WebP até 10 MB.{" "}
        {preview && "Clique na imagem para marcar o ponto de foco."}
      </p>

      {preview && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <button
            type="button"
            onClick={pickFocus}
            className="relative block w-full cursor-crosshair overflow-hidden rounded-[2px] bg-black"
            aria-label="Marcar o ponto de foco"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização de um ficheiro local */}
            <img src={preview} alt="" className="block h-auto w-full" />
            <span
              aria-hidden
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgb(0_0_0/0.5)]"
              style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            />
          </button>
          <div className="grid content-start gap-3">
            {crops.map((crop) => (
              <figure key={crop.label} className="grid gap-1">
                <div
                  className="overflow-hidden rounded-[2px] bg-black"
                  style={{ aspectRatio: String(crop.ratio) }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização do recorte */}
                  <img
                    src={preview}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: objectPosition(focus) }}
                  />
                </div>
                <figcaption className="text-steel text-xs">{crop.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="border-line-strong hover:bg-surface-alt inline-flex h-8 cursor-pointer items-center rounded-[2px] border bg-white px-3 text-sm">
          {preview ? "Trocar imagem" : "Escolher imagem"}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {preview && (
          <Button
            type="button"
            size="sm"
            disabled={pending || !changed}
            onClick={() => send("save")}
          >
            {pending ? "A guardar…" : file ? "Guardar imagem" : "Guardar foco"}
          </Button>
        )}
        {initialUrl && !file && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => send("remove")}
          >
            Remover imagem
          </Button>
        )}
        <span role="status" className={`text-xs ${error ? "text-error" : "text-steel"}`}>
          {error ?? status}
        </span>
      </div>
    </div>
  );
}
