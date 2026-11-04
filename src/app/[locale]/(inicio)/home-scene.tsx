"use client";

/**
 * Cena da página inicial: o vídeo da casa desenhado imagem a imagem num canvas,
 * conforme o scroll (imagens em vez de <video>: andar para trás e parar são
 * instantâneos em qualquer browser). Também conduz os blocos de texto.
 * Passado do protótipo docs/site-inicial (troço "início": imagens 144 → 40).
 */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./home.module.css";

const FIRST = 40;
const LAST = 144;
const SPAN = LAST - FIRST;
const FOCUS = 0.56; // em ecrãs estreitos o corte acompanha a escada
const FADE = 0.015; // duração das entradas e saídas, em fração do scroll

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface Block {
  el: HTMLElement;
  a: number;
  b: number;
  side: "left" | "right";
  words: HTMLElement[];
  items: HTMLElement[];
  counters: HTMLElement[];
}

export function HomeScene({ labels }: { labels: { text: string; at: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrimLeft = useRef<HTMLDivElement>(null);
  const scrimRight = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const labelsRef = useRef<HTMLOListElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // O script do layout já o decidiu antes de pintar; isto cobre mudanças da preferência.
    if (!reduce) html.dataset.home = "scrolly";
    if (html.dataset.home !== "scrolly") return;

    const canvas = canvasRef.current!;
    const cx = canvas.getContext("2d", { alpha: false })!;
    const dir = innerWidth >= 700 ? "/home/1920" : "/home/900";
    const frames: (HTMLImageElement | null)[] = new Array(LAST + 1).fill(null);
    const mobile = matchMedia("(max-width: 760px)");
    const blocks: Block[] = [...document.querySelectorAll<HTMLElement>("[data-block]")].map(
      (el) => ({
        el,
        a: Number(el.dataset.in),
        b: Number(el.dataset.out),
        side: el.dataset.side === "right" ? "right" : "left",
        words: [...el.querySelectorAll<HTMLElement>("[data-word]")],
        items: [...el.querySelectorAll<HTMLElement>("[data-item]")],
        counters: [...el.querySelectorAll<HTMLElement>("[data-to]")],
      }),
    );
    const labelEls = [...(labelsRef.current?.children ?? [])] as HTMLElement[];
    const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
    let stopped = false;

    const load = (i: number) =>
      frames[i]
        ? Promise.resolve()
        : new Promise<void>((done) => {
            const image = new window.Image();
            image.decoding = "async";
            image.onload = () => {
              frames[i] = image;
              done();
            };
            image.onerror = () => done();
            image.src = `${dir}/f${String(i).padStart(3, "0")}.webp`;
          });

    const size = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      lastKey = "";
    };

    const paint = (image: HTMLImageElement | null, alpha: number) => {
      if (!image) return;
      const W = canvas.width;
      const H = canvas.height;
      const s = Math.max(W / image.naturalWidth, H / image.naturalHeight);
      const sw = W / s;
      const sh = H / s;
      cx.imageSmoothingQuality = "high";
      cx.globalAlpha = alpha;
      cx.drawImage(
        image,
        (image.naturalWidth - sw) * FOCUS,
        (image.naturalHeight - sh) / 2,
        sw,
        sh,
        0,
        0,
        W,
        H,
      );
      cx.globalAlpha = 1;
    };

    // Funde as duas imagens mais próximas já carregadas.
    const paintAt = (index: number) => {
      const f = Math.min(LAST, Math.max(FIRST, index));
      let a = Math.floor(f);
      let b = Math.ceil(f);
      while (a > FIRST && !frames[a]) a--;
      while (b < LAST && !frames[b]) b++;
      if (!frames[a]) a = b;
      if (!frames[b]) b = a;
      paint(frames[a] ?? null, 1);
      if (b !== a) paint(frames[b] ?? null, (f - a) / (b - a));
    };

    const update = (p: number) => {
      const shade = { left: 0, right: 0 };
      for (const k of blocks) {
        const vin = k.a <= 0 ? 1 : smooth(k.a - FADE, k.a, p);
        const vout = k.b >= 1 ? 0 : smooth(k.b, k.b + FADE, p);
        const v = vin * (1 - vout);
        const dy = (1 - vin) * 18 - vout * 14;
        k.el.style.opacity = v.toFixed(3);
        k.el.style.transform = mobile.matches
          ? `translateY(${dy}px)`
          : `translateY(calc(-50% + ${dy}px))`;
        k.el.toggleAttribute("data-on", v > 0.5);
        shade[k.side] = Math.max(shade[k.side], v);
        const local = clamp01((p - k.a) / ((k.b - k.a) * 0.55));
        k.items.forEach((item, i) => {
          const start = (i / k.items.length) * 0.75;
          const t = smooth(start, start + 0.25, local);
          item.style.opacity = t.toFixed(3);
          item.style.transform = `translateX(${((1 - t) * -10).toFixed(1)}px)`;
        });
        k.words.forEach((word, i) => {
          const start = (i / k.words.length) * 0.4;
          const t = smooth(start, start + 0.3, local);
          word.style.opacity = t.toFixed(3);
          word.style.transform = `translateY(${((1 - t) * 16).toFixed(1)}px)`;
        });
        k.counters.forEach((counter) => {
          counter.textContent = `${Math.round(Number(counter.dataset.to) * smooth(0, 1, local))}${counter.dataset.suffix ?? ""}`;
        });
      }
      if (scrimLeft.current) scrimLeft.current.style.opacity = shade.left.toFixed(3);
      if (scrimRight.current) scrimRight.current.style.opacity = shade.right.toFixed(3);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      let current = 0;
      labelEls.forEach((label, i) => {
        if (p >= Number(label.dataset.at) - 0.001) current = i;
      });
      labelEls.forEach((label, i) => label.toggleAttribute("data-on", i === current));
    };

    // Ligações e foco do teclado saltam para o momento em que o bloco está no ecrã.
    const go = (el: Element, smoothly: boolean) => {
      const k = blocks.find((block) => block.el === el);
      if (!k) return;
      const p = k.b >= 1 ? 1 : (k.a + k.b) / 2;
      scrollTo({ top: p * maxScroll(), behavior: smoothly ? "smooth" : "auto" });
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.('a[href^="#"]');
      const target = link && document.getElementById(link.getAttribute("href")!.slice(1));
      if (target?.hasAttribute("data-block")) {
        event.preventDefault();
        go(target, true);
      }
    };
    const onFocus = (event: FocusEvent) => {
      const target = (event.target as Element).closest?.("[data-block]");
      if (target && !target.hasAttribute("data-on")) go(target, false);
    };

    let p = 0;
    let lastKey = "";
    let previous = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      // Assenta sempre numa imagem exata: parar entre duas mostraria a cena em duplicado.
      const target = Math.round(clamp01(scrollY / Math.max(1, maxScroll())) * SPAN) / SPAN;
      p += (target - p) * (1 - Math.exp(-dt * 3.2));
      const index = LAST + (FIRST - LAST) * p;
      const key = index.toFixed(2);
      update(p);
      if (key === lastKey) return;
      lastKey = key;
      paintAt(index);
    };

    let resizeW = innerWidth;
    let resizeH = innerHeight;
    const onResize = () => {
      if (innerWidth === resizeW && Math.abs(innerHeight - resizeH) < 120) return; // barra do telemóvel
      resizeW = innerWidth;
      resizeH = innerHeight;
      size();
    };

    size();
    addEventListener("resize", onResize);
    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocus);

    // Primeiro o essencial (o início e o fim do percurso); depois o resto, por passagens.
    const opening = [144, 136, 128, 120, 40, 48].map(load);
    void Promise.all(opening).then(async () => {
      if (stopped) return;
      setReady(true);
      raf = requestAnimationFrame(frame);
      for (const step of [8, 4, 2, 1]) {
        const todo: number[] = [];
        for (let i = FIRST; i <= LAST; i += step) todo.push(i);
        for (let i = 0; i < todo.length; i += 6) {
          if (stopped) return;
          await Promise.all(todo.slice(i, i + 6).map(load));
          lastKey = "";
        }
      }
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <>
      <div className={styles.view} aria-hidden="true">
        <canvas ref={canvasRef} />
        {/* Sem animação (menos movimento pedido): uma imagem fixa da cena. */}
        <Image
          className={styles.poster}
          src="/home/1920/f090.webp"
          alt=""
          fill
          sizes="100vw"
          priority={false}
        />
      </div>
      <div ref={scrimLeft} className={`${styles.scrim} ${styles.scrimLeft}`} aria-hidden="true" />
      <div ref={scrimRight} className={`${styles.scrim} ${styles.scrimRight}`} aria-hidden="true" />
      <div className={styles.progress} aria-hidden="true">
        <ol ref={labelsRef}>
          {labels.map((label) => (
            <li key={label.text} data-at={label.at}>
              {label.text}
            </li>
          ))}
        </ol>
        <div className={styles.bar}>
          <i ref={barRef} />
        </div>
      </div>
      <div className={styles.loading} data-ready={ready || undefined} aria-hidden="true">
        <Image src="/brand/habinox-logo-branco.svg" alt="" width={220} height={42} priority />
      </div>
    </>
  );
}
