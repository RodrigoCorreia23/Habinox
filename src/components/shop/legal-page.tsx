import type { LegalDocument } from "@/content/legal/pt";

/** Página de texto legal na loja (tipografia de leitura, sem caixas). */
export function LegalPage({
  document,
  updatedLabel,
  portugueseOnly,
}: {
  document: LegalDocument;
  updatedLabel: string;
  /** Noutras línguas: aviso de que o texto só existe em português (o que vale). */
  portugueseOnly?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pt-12 pb-24 md:px-14 md:pt-16 md:pb-36">
      {portugueseOnly && (
        <p className="border-night-line-strong text-night-soft mb-10 max-w-[68ch] border-l pl-4 text-base">
          {portugueseOnly}
        </p>
      )}
      <h1
        lang={portugueseOnly ? "pt" : undefined}
        className="font-display text-[clamp(44px,7vw,96px)] leading-none"
      >
        {document.title}
      </h1>
      <p className="text-night-faint mt-6 font-mono text-xs">{updatedLabel}</p>
      <div
        lang={portugueseOnly ? "pt" : undefined}
        className="text-night-soft mt-12 max-w-[68ch] text-base leading-relaxed [&_a]:underline [&_a]:decoration-night-line-strong [&_a]:underline-offset-4 [&_a:hover]:text-amber [&_a:hover]:decoration-amber [&_code]:font-mono [&_code]:text-sm [&_h2]:font-display [&_h2]:text-night-text [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-8 [&_h2]:text-2xl [&_li]:mt-2 [&_p]:mt-4 [&_strong]:text-night-text [&_strong]:font-medium [&_table]:mt-6 [&_table]:w-full [&_table]:text-sm [&_td]:border-night-line [&_td]:border-t [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top [&_th]:text-night-faint [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-normal [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
      >
        {document.body}
      </div>
    </main>
  );
}
