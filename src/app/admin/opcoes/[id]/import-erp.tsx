"use client";

/**
 * «Importar do Odoo»: escolher uma família de artigos (ex.: Cores RAL), marcar
 * os que entram e importá-los como valores desta opção. Os que já existem na
 * opção aparecem marcados como tal e não se importam outra vez.
 */
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Select } from "@/components/admin/field";
import { useToast } from "@/components/admin/toaster";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importFromErpAction } from "../actions";

export interface ErpFamily {
  name: string;
  articles: {
    id: string;
    name: string;
    erpCode: string;
    unit: string;
    cost: string;
    hasMargin: boolean;
  }[];
}

export function ImportFromErp({
  optionId,
  families,
  existingMaterialIds,
}: {
  optionId: string;
  families: ErpFamily[];
  existingMaterialIds: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [family, setFamily] = useState(
    families.find((f) => /cor/i.test(f.name))?.name ?? families[0]?.name ?? "",
  );
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [link, setLink] = useState(true);
  const [pending, startTransition] = useTransition();
  const existing = useMemo(() => new Set(existingMaterialIds), [existingMaterialIds]);
  const articles = families.find((f) => f.name === family)?.articles ?? [];
  const available = articles.filter((article) => !existing.has(article.id));
  const missingMargin = articles.filter((a) => chosen.has(a.id) && !a.hasMargin).length;

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () =>
    startTransition(async () => {
      const result = await importFromErpAction(optionId, [...chosen], link);
      toast({ tone: result.ok ? "ok" : "info", message: result.message });
      if (result.ok) {
        setOpen(false);
        setChosen(new Set());
        router.refresh();
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Download aria-hidden className="size-4" strokeWidth={1.75} />
          Importar do Odoo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar valores do Odoo</DialogTitle>
          <DialogDescription>
            Escolha a família de artigos e marque os que o cliente pode escolher. O nome e o código
            RAL vêm do Odoo; pode mudar o nome depois.
          </DialogDescription>
        </DialogHeader>

        {families.length === 0 ? (
          <p className="text-steel text-sm">
            Ainda não há artigos do Odoo. Sincronize em Materiais e custos.
          </p>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Família no Odoo</span>
              <Select
                value={family}
                onChange={(event) => {
                  setFamily(event.target.value);
                  setChosen(new Set());
                }}
              >
                {families.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.articles.length})
                  </option>
                ))}
              </Select>
            </label>

            <fieldset className="grid gap-1">
              <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
                Artigos
                {available.length > 0 && (
                  <button
                    type="button"
                    className="link-admin text-[13px] font-normal"
                    onClick={() =>
                      setChosen(
                        chosen.size === available.length
                          ? new Set()
                          : new Set(available.map((a) => a.id)),
                      )
                    }
                  >
                    {chosen.size === available.length ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                )}
              </legend>
              <ul className="border-line divide-line-soft max-h-72 divide-y overflow-y-auto rounded-[2px] border">
                {articles.map((article) => {
                  const already = existing.has(article.id);
                  return (
                    <li key={article.id}>
                      <label
                        className={`flex min-h-11 items-center gap-3 px-3 py-2 text-sm ${already ? "text-steel" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          disabled={already}
                          checked={already || chosen.has(article.id)}
                          onChange={() => toggle(article.id)}
                          className="size-4"
                        />
                        <span className="min-w-0 flex-1">
                          {article.name}
                          <span className="text-steel block text-xs">
                            {article.erpCode}
                            {already && " · já está nesta opção"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={link}
                onChange={(event) => setLink(event.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                Ligar ao artigo do Odoo (o custo do artigo entra no preço)
                <span className="text-steel block text-[13px]">
                  Sozinho, conta uma vez por encomenda. Para contar por m² (ex.: a lacagem), use no
                  produto uma linha de custo «artigo conforme esta opção»: os artigos vêm já
                  escolhidos e não contam duas vezes.
                </span>
              </span>
            </label>
            {link && missingMargin > 0 && (
              <p className="text-warn text-[13px]">
                {missingMargin === 1
                  ? "1 artigo escolhido ainda não tem"
                  : `${missingMargin} artigos escolhidos ainda não têm`}{" "}
                margem: defina-a em Materiais e custos antes de publicar um produto que o use.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={chosen.size === 0 || pending}
            pending={pending}
            pendingLabel="A importar…"
          >
            Importar {chosen.size > 0 ? chosen.size : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
