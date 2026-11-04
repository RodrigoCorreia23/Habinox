"use client";

/**
 * Categorias em duas filas que passam sozinhas, em sentidos opostos e em ciclo
 * contínuo. Cada fila pode ser arrastada (com inércia ao largar), para ao passar
 * o rato e com o teclado mostra sempre a categoria em foco. Passado do protótipo.
 */
import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./home.module.css";

export interface RailTile {
  key: string;
  href: string;
  name: string;
  sub: string;
  image: string;
  /** object-position do recorte (ponto de foco marcado no backoffice). */
  position: string;
}

/** Repete as peças até a fila encher bem o ecrã (com poucas categorias o ciclo teria buracos). */
function fill(tiles: RailTile[]): RailTile[] {
  if (tiles.length === 0) return tiles;
  const out: RailTile[] = [];
  while (out.length < 6) out.push(...tiles);
  return out;
}

export function CategoryRails({
  id,
  head,
  rows,
  labels,
}: {
  id: string;
  head: ReactNode;
  rows: RailTile[][];
  labels: { pause: string; resume: string; heading: string };
}) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const moving = document.documentElement.dataset.home === "scrolly";
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let dragged = false;
    let onScreen = true;
    let lastT = performance.now();
    let raf = 0;
    const cleanups: (() => void)[] = [];

    const state = rowRefs.current.flatMap((el, i) => {
      const rail = el?.firstElementChild as HTMLElement | null;
      if (!el || !rail) return [];
      return [
        {
          el,
          rail,
          x: 0,
          v: 0,
          drift: moving ? (i ? 1 / 86 : -1 / 72) : 0,
          drag: false,
          hover: false,
          focus: false,
        },
      ];
    });

    for (const r of state) {
      let id: number | null = null;
      let sx = 0;
      let px = 0;
      let pt = 0;
      const down = (e: PointerEvent) => {
        if (e.button !== 0) return;
        id = e.pointerId;
        sx = px = e.clientX;
        pt = e.timeStamp;
        dragged = false;
        r.v = 0;
      };
      const move = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        if (!r.drag) {
          if (Math.abs(e.clientX - sx) < 6) return;
          r.drag = dragged = true;
          px = e.clientX;
          r.el.setPointerCapture(id);
          r.el.toggleAttribute("data-dragging", true);
        }
        const dx = e.clientX - px;
        const dt = Math.max(1, e.timeStamp - pt);
        r.x += dx;
        r.v = r.v * 0.7 + (dx / dt) * 1000 * 0.3;
        px = e.clientX;
        pt = e.timeStamp;
      };
      const end = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        id = null;
        r.drag = false;
        r.el.toggleAttribute("data-dragging", false);
        if (e.timeStamp - pt > 90) r.v = 0; // parou antes de largar: sem inércia
      };
      const wheel = (e: WheelEvent) => {
        // deslizar na horizontal com o trackpad
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        r.x -= e.deltaX;
        r.v = 0;
      };
      const enter = () => (r.hover = true);
      const leave = () => (r.hover = false);
      const focusIn = (e: FocusEvent) => {
        r.el.scrollLeft = 0;
        const target = e.target as HTMLElement;
        if (!target.matches(":focus-visible")) return;
        r.focus = true;
        r.v = 0;
        r.x = Math.min(0, 20 - target.offsetLeft);
      };
      const focusOut = () => (r.focus = false);
      r.el.addEventListener("pointerdown", down);
      r.el.addEventListener("pointermove", move);
      r.el.addEventListener("pointerup", end);
      r.el.addEventListener("pointercancel", end);
      r.el.addEventListener("wheel", wheel, { passive: false });
      r.el.addEventListener("focusin", focusIn);
      r.el.addEventListener("focusout", focusOut);
      if (fine) {
        r.el.addEventListener("pointerenter", enter);
        r.el.addEventListener("pointerleave", leave);
      }
      cleanups.push(() => {
        r.el.removeEventListener("pointerdown", down);
        r.el.removeEventListener("pointermove", move);
        r.el.removeEventListener("pointerup", end);
        r.el.removeEventListener("pointercancel", end);
        r.el.removeEventListener("wheel", wheel);
        r.el.removeEventListener("focusin", focusIn);
        r.el.removeEventListener("focusout", focusOut);
        r.el.removeEventListener("pointerenter", enter);
        r.el.removeEventListener("pointerleave", leave);
      });
    }

    // Um arrasto não abre a categoria em que começou.
    const container = rowRefs.current[0]?.parentElement;
    const blockClick = (e: MouseEvent) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    };
    container?.addEventListener("click", blockClick, true);
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
    });
    if (container) observer.observe(container);

    const run = (now: number) => {
      raf = requestAnimationFrame(run);
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      if (!onScreen) return;
      for (const r of state) {
        const w = (r.rail.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
        if (!w) continue;
        if (!r.drag) {
          const rest = pausedRef.current || r.hover || r.focus ? 0 : r.drift * w;
          r.v += (rest - r.v) * (1 - Math.exp(-dt * 2.6));
          r.x += r.v * dt;
        }
        if (!r.focus) {
          while (r.x <= -w) r.x += w;
          while (r.x > 0) r.x -= w;
        }
        r.rail.style.transform = `translate3d(${r.x.toFixed(2)}px, 0, 0)`;
      }
    };
    raf = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      container?.removeEventListener("click", blockClick, true);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  const tile = (item: RailTile, index: number, copy: boolean) => (
    <Link
      key={`${item.key}-${index}`}
      href={item.href}
      className={styles.tile}
      draggable={false}
      // a segunda cópia só serve para o ciclo não ter emenda: fora do teclado e dos leitores
      tabIndex={copy ? -1 : undefined}
    >
      <Image
        src={item.image}
        alt=""
        fill
        sizes="(max-width: 760px) 68vw, 28vw"
        draggable={false}
        style={{ objectPosition: item.position }}
      />
      <div>
        <b>{item.name}</b>
        <span>{item.sub}</span>
      </div>
    </Link>
  );

  return (
    <>
      <div id={id} className={`${styles.wrap} ${styles.catHead}`}>
        {head}
        <button
          type="button"
          className={styles.catPause}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? labels.resume : labels.pause}
        </button>
      </div>
      <div className={styles.catRows} role="region" aria-label={labels.heading}>
        {rows.map((items, i) => {
          const set = fill(items);
          return (
            <div
              key={i}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={styles.catRow}
            >
              <div className={styles.rail}>
                <div className={styles.set}>
                  {set.map((item, k) => tile(item, k, k >= items.length))}
                </div>
                <div className={styles.set} aria-hidden="true">
                  {set.map((item, k) => tile(item, k, true))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
