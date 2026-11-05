"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useToast } from "@/components/admin/toaster";
import { Button } from "@/components/ui/button";
import { translateNowAction } from "./actions";

/** «Traduzir o que falta»: corre já a tradução automática e diz o resultado num aviso. */
export function TranslateNow() {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      type="button"
      pending={pending}
      pendingLabel="A traduzir…"
      onClick={() =>
        startTransition(async () => {
          const result = await translateNowAction();
          if (result) toast({ tone: result.ok ? "ok" : "danger", message: result.message });
        })
      }
    >
      <Languages aria-hidden strokeWidth={1.75} />
      Traduzir o que falta
    </Button>
  );
}
