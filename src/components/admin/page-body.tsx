import { cn } from "cn";

/**
 * Contentor de cada página do backoffice: 1200px (ou 720px nos formulários simples).
 * O pb-24 deixa lugar à SaveBar fixa em baixo.
 */
export function PageBody({
  width = "default",
  className,
  children,
}: {
  width?: "default" | "narrow";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      id="conteudo"
      className={cn(
        "mx-auto w-full px-4 pt-6 pb-24 md:px-8 md:pt-8",
        width === "narrow" ? "max-w-[720px]" : "max-w-[1200px]",
        className,
      )}
    >
      {children}
    </main>
  );
}
