"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

/**
 * Cabeçalho que fica preso no topo (abaixo da barra de 56px no telemóvel) e só
 * ganha a linha de baixo quando o conteúdo passa por trás dele.
 */
export function StickyHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !header.current) return;
    // A linha aparece quando o marcador passa por baixo do topo onde o cabeçalho prende
    // (56px no telemóvel, 0 a partir de 1024px).
    const top = Number.parseFloat(getComputedStyle(header.current).top) || 0;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry!.isIntersecting), {
      rootMargin: `-${top + 1}px 0px 0px 0px`,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={sentinel} aria-hidden className="h-0" />
      <header
        ref={header}
        data-stuck={stuck || undefined}
        className={cn(
          "bg-canvas/95 sticky top-14 z-30 -mx-4 border-b border-transparent px-4 pt-3 pb-4 backdrop-blur-sm transition-colors duration-150 data-stuck:border-line md:-mx-8 md:px-8 lg:top-0",
          className,
        )}
      >
        {children}
      </header>
    </>
  );
}
