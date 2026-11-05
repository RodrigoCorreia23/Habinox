import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** «Seguinte: acrescentar os valores →», no fim dos ecrãs de criação. */
export function NextStep({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/next text-amber-ink focus-visible:ring-amber-ink inline-flex items-center gap-1.5 rounded-[2px] text-[15px] font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-150 group-hover/next:translate-x-0.5 motion-reduce:group-hover/next:translate-x-0"
        strokeWidth={1.75}
      />
    </Link>
  );
}
