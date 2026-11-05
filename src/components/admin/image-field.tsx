"use client";

/**
 * Imagem de uma categoria ou de um produto: escolher o ficheiro, ver o recorte
 * em cada formato onde a imagem aparece e clicar na imagem para marcar o ponto
 * de foco (o que fica sempre visível quando o recorte é estreito, ex. no telemóvel).
 */
import { useRouter } from "next/navigation";
import { type DragEvent, type MouseEvent, useEffect, useState } from "react";
import { cn } from "cn";
import { ImagePlus } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { useToast } from "@/components/admin/toaster";
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

/** Legenda de cada recorte, na linguagem de quem vê a loja. */
function cropCaption(label: string) {
  if (label.startsWith("Mosaico")) return "Como aparece no mosaico";
  if (label.startsWith("Capa")) return "Como aparece no topo";
  if (label.startsWith("Cartão")) return "Como aparece na grelha da loja";
  return label;
}

export function ImageField({
  slot,
  id,
  initialUrl,
  initialFocus,
  layout = "full",
}: {
  slot: ImageSlotKey;
  id: string;
  initialUrl: string | null;
  initialFocus: Focus | null;
  /** full: imagem e recortes lado a lado (lg); aside: tudo numa coluna estreita. */
  layout?: "full" | "aside";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { minWidth, minHeight, crops } = IMAGE_SLOTS[slot];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [focus, setFocus] = useState<Focus>(initialFocus ?? CENTER);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const focusChanged =
    focus.x !== (initialFocus ?? CENTER).x || focus.y !== (initialFocus ?? CENTER).y;
  const changed = file !== null || focusChanged;

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
      setError("Formato não aceite: use uma fotografia JPEG, PNG ou WebP.");
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      setError("A imagem tem mais de 10 MB. Exporte-a mais leve e tente de novo.");
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

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
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
      setError(result?.message ?? "Não foi possível guardar a imagem. Tente de novo.");
      return;
    }
    setFile(null);
    if (action === "remove") {
      setPreview(null);
      setFocus(CENTER);
      setStatus("Imagem removida.");
      toast({ tone: "ok", message: "Imagem removida." });
    } else {
      setPreview(result.url ?? preview);
      setStatus(file ? "Imagem guardada." : "Foco guardado.");
      toast({ tone: "ok", message: file ? "Imagem guardada." : "Foco guardado." });
    }
    router.refresh();
  }

  const fileInput = (
    <input
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      className="sr-only"
      onChange={(event) => {
        choose(event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  );

  return (
    <div className="grid gap-4">
      {preview ? (
        <div
          className={cn(
            "grid gap-4",
            layout === "full" && "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div
            className={cn(
              "bg-surface-alt flex justify-center rounded-[2px] p-3",
              dragging && "outline-amber-ink outline-2 outline-dashed",
            )}
          >
            <button
              type="button"
              onClick={pickFocus}
              className="focus-visible:ring-amber-ink relative inline-block cursor-crosshair rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label="Escolher o ponto que nunca é cortado"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização de um ficheiro local */}
              <img src={preview} alt="" className="block max-h-[360px] w-auto max-w-full" />
              <span
                aria-hidden
                className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgb(0_0_0/0.5)]"
                style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
              />
            </button>
          </div>
          <div className="flex flex-wrap content-start gap-3">
            {crops.map((crop) => (
              <figure key={crop.label} className="grid w-40 gap-1">
                <div
                  className="bg-surface-alt overflow-hidden rounded-[2px]"
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
                <figcaption className="text-steel text-xs">{cropCaption(crop.label)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "border-line-strong hover:bg-surface-alt/50 has-[input:focus-visible]:ring-amber-ink flex cursor-pointer flex-col items-start gap-2 rounded-[2px] border border-dashed bg-white p-6 text-sm transition-colors duration-150 has-[input:focus-visible]:ring-2",
            dragging && "border-amber-ink bg-amber-wash",
          )}
        >
          <ImagePlus aria-hidden className="text-steel size-5" strokeWidth={1.5} />
          <span className="text-ink">
            Arraste uma fotografia ou{" "}
            <span className="text-amber-ink underline underline-offset-4">escolha um ficheiro</span>
          </span>
          <span className="text-steel text-[13px]">
            Mínimo {minWidth} × {minHeight} px · JPEG, PNG ou WebP até 10 MB
          </span>
          {fileInput}
        </label>
      )}

      {preview && !focusChanged && !file && (
        <p className="text-steel text-[13px]">
          Clique na imagem para escolher o ponto que nunca é cortado.
        </p>
      )}

      {error && (
        <p role="alert" className="text-danger text-[13px]">
          {error}
        </p>
      )}

      {preview && (
        <div className="flex flex-wrap items-center gap-3">
          {changed && (
            <Button type="button" pending={pending} onClick={() => send("save")}>
              {file ? "Guardar imagem" : "Guardar foco"}
            </Button>
          )}
          <label className="border-line-strong text-ink hover:bg-surface-alt has-[input:focus-visible]:ring-amber-ink inline-flex h-10 cursor-pointer items-center rounded-[2px] border bg-white px-4 text-sm font-medium transition-colors duration-150 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-offset-2 pointer-coarse:h-11">
            Trocar imagem
            {fileInput}
          </label>
          {initialUrl && !file && (
            <ConfirmButton
              type="button"
              label="Remover imagem"
              question="Remover a imagem?"
              consequence="Deixa de aparecer na loja até carregar outra."
              confirmLabel="Remover"
              onConfirm={() => send("remove")}
              pending={pending && !changed}
            />
          )}
          <span role="status" className="text-ok text-[13px]">
            {!pending && !error ? status : null}
          </span>
        </div>
      )}
    </div>
  );
}
