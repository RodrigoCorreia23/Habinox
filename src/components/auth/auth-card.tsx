import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Registo e passwords, no visual da loja: a escada do ponto de login da página
 * inicial (imagem 21 da cena) à esquerda e o formulário à direita, como o
 * "Entrar" sobre a cena. No telemóvel a imagem fica numa faixa por cima.
 */
export function AuthCard({
  title,
  accent,
  image = "/home/1920/f021.webp",
  children,
  footer,
}: {
  title: string;
  /** Imagem da cena (por omissão, o ponto de login). */
  image?: string;
  /** Segunda linha do título, em dourado (como "Entrar / na sua conta."). */
  accent?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="relative h-56 overflow-hidden sm:h-72 lg:h-auto">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 55vw"
          className="object-cover object-[30%_50%]"
        />
        <div
          aria-hidden
          className="from-night absolute inset-0 bg-gradient-to-t to-transparent to-60% lg:bg-gradient-to-l lg:to-40%"
        />
      </div>
      <div className="flex items-center px-5 py-12 md:px-14 lg:py-20">
        <div className="grid w-full max-w-[420px] gap-8">
          <h1 className="font-display text-[clamp(40px,4.4vw,64px)] leading-[1.02]">
            {title}
            {accent && <span className="text-amber block">{accent}</span>}
          </h1>
          {children}
          {footer && <div className="text-night-soft grid gap-1 text-[15px]">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
