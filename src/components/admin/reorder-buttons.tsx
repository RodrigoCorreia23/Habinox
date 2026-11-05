import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Subir e descer um item (sem arrastar). Cada seta é um formulário com a sua
 * action; sem action, o botão fica desativado (primeiro ou último da lista).
 */
export function ReorderButtons({
  itemLabel,
  upAction,
  downAction,
}: {
  itemLabel: string;
  upAction?: () => Promise<void>;
  downAction?: () => Promise<void>;
}) {
  return (
    <span className="inline-flex items-center">
      <form action={upAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={!upAction}
          aria-label={`Mover «${itemLabel}» para cima`}
          title="Mover para cima"
        >
          <ArrowUp strokeWidth={1.75} />
        </Button>
      </form>
      <form action={downAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={!downAction}
          aria-label={`Mover «${itemLabel}» para baixo`}
          title="Mover para baixo"
        >
          <ArrowDown strokeWidth={1.75} />
        </Button>
      </form>
    </span>
  );
}
