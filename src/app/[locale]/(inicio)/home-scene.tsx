"use client";

/**
 * Cena da página inicial (passada do protótipo docs/site-inicial). A apresentação
 * e a loja são dois estados da mesma página, ligados por uma viagem de câmara:
 * - "loja" (abre por omissão): a câmara pára em frente à escada, os degraus
 *   acendem e fica um vaivém lento em vídeo, que abranda ao fazer scroll;
 * - "inicio" (#inicio, #empresa…): o scroll percorre a casa e conduz os textos.
 * O vídeo da casa é desenhado imagem a imagem num canvas: andar para trás e
 * parar são instantâneos em qualquer browser.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./home.module.css";

const AT = { inicio: 144, fimScroll: 40, loja: 89.6 }; // posições no percurso, em imagens
const FIRST = 40;
const LAST = 144;
const SPAN = AT.inicio - AT.fimScroll;
const STEPS = 15; // luzes dos degraus a acender (a00–a14)
const SWING = { amp: 8, period: 24 }; // vaivém da câmara parada na loja (igual ao vídeo)
const FOCUS = 0.56; // em ecrãs estreitos o corte acompanha a escada
const FADE = 0.015; // entradas e saídas dos textos, em fração do scroll
const HOME_HASHES = ["inicio", "empresa", "servicos", "contactos"];
const SPLASH_MIN_MS = 2500; // o nome fica pelo menos este tempo no centro, a respirar
const DOCK_MS = 2200; // viagem do nome até ao logótipo do cabeçalho

type Route = "inicio" | "loja";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const bez = (a: number, b: number, t: number) =>
  3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
/** cubic-bezier(.77, 0, .175, 1): a mesma curva das transições de cor. */
const easeInOut = (x: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (bez(0.77, 0.175, mid) < x) lo = mid;
    else hi = mid;
  }
  return bez(0, 1, lo);
};
const routeOfHash = (hash: string): Route =>
  HOME_HASHES.includes(hash.replace(/^#/, "")) ? "inicio" : "loja";

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
  const [docked, setDocked] = useState(false);
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (motion) html.dataset.home = "scrolly";
    const scrolly = html.dataset.home === "scrolly";
    const hero = document.querySelector<HTMLElement>("[data-shop-hero]");
    const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
    let stopped = false;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      addEventListener(type, fn, opts);
      cleanups.push(() => removeEventListener(type, fn));
    };

    // ── Estado (loja / início) ────────────────────────────────────────────
    let route: Route = (html.dataset.route as Route | undefined) ?? routeOfHash(location.hash);
    html.dataset.route = route;
    const scrollOf: Record<Route, number> = { inicio: 0, loja: 0 };
    const start = route === "inicio" ? 0 : 1;
    const shot = { T: start, from: start, to: start, t0: 0, dur: 1 };
    let skipWave = false;

    const setHeroIn = (value: boolean) => hero?.toggleAttribute("data-in", value);
    if (!scrolly) {
      // a abertura já está escondida pelo CSS neste modo
      html.dataset.lit = "";
      setHeroIn(route === "loja");
    }

    const show = (next: Route) => {
      const changed = next !== route;
      if (changed) scrollOf[route] = scrollY;
      route = next;
      html.dataset.route = next;
      const target = next === "inicio" ? 0 : 1;
      if (!scrolly) {
        shot.T = shot.to = target;
      } else if (target !== shot.to) {
        shot.from = shot.T;
        shot.to = target;
        shot.t0 = performance.now();
        shot.dur = 2300 * Math.max(0.45, Math.abs(target - shot.T));
        skipWave = true;
      }
      if (next === "inicio" || !scrolly) setHeroIn(next === "loja");
      if (changed) scrollTo({ top: scrollOf[next], behavior: "auto" });
    };

    const scrollToId = (id: string) => {
      const target = id ? document.getElementById(id) : null;
      if (target && !target.hasAttribute("data-block")) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    };

    // ── Blocos da apresentação ────────────────────────────────────────────
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
          const begin = (i / k.items.length) * 0.75;
          const t = smooth(begin, begin + 0.25, local);
          item.style.opacity = t.toFixed(3);
          item.style.transform = `translateX(${((1 - t) * -10).toFixed(1)}px)`;
        });
        k.words.forEach((word, i) => {
          const begin = (i / k.words.length) * 0.4;
          const t = smooth(begin, begin + 0.3, local);
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

    // ── Ligações dentro da página ─────────────────────────────────────────
    const goToBlock = (el: Element, smoothly: boolean) => {
      const k = blocks.find((block) => block.el === el);
      if (!k) return;
      const p = k.b >= 1 ? 1 : (k.a + k.b) / 2;
      scrollTo({ top: p * maxScroll(), behavior: smoothly ? "smooth" : "auto" });
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href")!.slice(1);
      event.preventDefault();
      const next = routeOfHash(hash);
      history.pushState(null, "", `#${hash}`);
      if (next !== route) {
        if (hash === "inicio") scrollOf.inicio = 0;
        show(next);
        if (next === "inicio" && hash !== "inicio") {
          const target = document.getElementById(hash);
          if (target) setTimeout(() => goToBlock(target, false), 30);
        }
      } else if (next === "inicio") {
        const target = document.getElementById(hash);
        if (target?.hasAttribute("data-block")) goToBlock(target, true);
      } else if (hash === "loja") {
        scrollTo({ top: 0, behavior: "smooth" });
      }
      if (next === "loja") scrollToId(hash);
    };
    const onFocus = (event: FocusEvent) => {
      if (route !== "inicio") return;
      const target = (event.target as Element).closest?.("[data-block]");
      if (target && !target.hasAttribute("data-on")) goToBlock(target, false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocus);
    on("popstate", () => show(routeOfHash(location.hash)));
    cleanups.push(() => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
    });
    if (route === "loja") scrollToId(location.hash.slice(1));

    if (!scrolly) {
      // Sem animação: página normal, os dois estados trocam sem viagem.
      return () => cleanups.forEach((fn) => fn());
    }

    // Continuar a descer no fim da apresentação leva à loja, sem clique.
    let push = 0;
    let touchY = 0;
    const atEnd = () => route === "inicio" && scrollY >= maxScroll() - 2;
    const pushOn = (delta: number) => {
      if (!atEnd() || delta <= 0) {
        push = 0;
        return;
      }
      push += delta;
      if (push > 320) {
        push = 0;
        history.pushState(null, "", "#loja");
        show("loja");
      }
    };
    on("wheel", (e) => pushOn(e.deltaY), { passive: true });
    on("touchstart", (e) => (touchY = e.touches[0]?.clientY ?? 0), { passive: true });
    on(
      "touchmove",
      (e) => {
        const y = e.touches[0]?.clientY ?? 0;
        pushOn((touchY - y) * 1.5);
        touchY = y;
      },
      { passive: true },
    );

    // ── Palco ─────────────────────────────────────────────────────────────
    const canvas = canvasRef.current!;
    const cx = canvas.getContext("2d", { alpha: false })!;
    const dir = innerWidth >= 700 ? "/home/1920" : "/home/900";
    const frames: (HTMLImageElement | null)[] = new Array(LAST + 1).fill(null);
    const steps: (HTMLImageElement | null)[] = new Array(STEPS).fill(null);
    const film = document.createElement("video");
    film.muted = true;
    film.loop = true;
    film.playsInline = true;
    film.preload = "auto";
    film.src = `${dir}/balanco.mp4`;
    let filmSynced = false;

    const load = (url: string, put: (image: HTMLImageElement) => void) =>
      new Promise<void>((done) => {
        const image = new window.Image();
        image.decoding = "async";
        image.onload = () => {
          put(image);
          done();
        };
        image.onerror = () => done();
        image.src = url;
      });
    const loadFrame = (i: number) =>
      frames[i]
        ? Promise.resolve()
        : load(`${dir}/f${String(i).padStart(3, "0")}.webp`, (im) => (frames[i] = im));

    let lastKey = "";
    const size = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      lastKey = "";
    };
    const paint = (image: HTMLImageElement | HTMLVideoElement | null, alpha: number) => {
      if (!image) return;
      const iw = image instanceof HTMLVideoElement ? image.videoWidth : image.naturalWidth;
      const ih = image instanceof HTMLVideoElement ? image.videoHeight : image.naturalHeight;
      if (!iw || !ih) return;
      const W = canvas.width;
      const H = canvas.height;
      const s = Math.max(W / iw, H / ih);
      const sw = W / s;
      const sh = H / s;
      cx.imageSmoothingQuality = "high";
      cx.globalAlpha = alpha;
      cx.drawImage(image, (iw - sw) * FOCUS, (ih - sh) / 2, sw, sh, 0, 0, W, H);
      cx.globalAlpha = 1;
    };
    // Funde as duas imagens mais próximas já carregadas.
    const paintPath = (index: number) => {
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

    let p = 0;
    let previous = performance.now();
    let litAt = -1;
    let restT = 0;
    let rest = 1;
    let stillFor = 1;
    let lastY = scrollY;
    let raf = 0;

    const frame = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;

      // viagem início ↔ loja: pode inverter-se a meio, parte sempre de onde está
      if (shot.T !== shot.to) {
        const x = clamp01((now - shot.t0) / shot.dur);
        shot.T = x >= 1 ? shot.to : lerp(shot.from, shot.to, easeInOut(x));
      }
      if (shot.T > 0.6 && route === "loja") setHeroIn(true);
      // a inércia da roda não pode descer a loja enquanto a câmara ainda viaja
      if (route === "loja" && shot.to === 1 && shot.T < 0.75 && scrollY > 0) scrollTo(0, 0);
      // ao descer, o vídeo abranda até parar; volta do mesmo ponto quando a página sossega
      stillFor = Math.abs(scrollY - lastY) > 0.5 ? 0 : stillFor + dt;
      lastY = scrollY;
      rest += ((stillFor > 0.4 ? 1 : 0) - rest) * (1 - Math.exp(-dt * (stillFor > 0.4 ? 1.5 : 7)));
      if (route === "inicio") {
        // assenta sempre numa imagem exata: parar entre duas mostraria a cena em duplicado
        const target = Math.round(clamp01(scrollY / Math.max(1, maxScroll())) * SPAN) / SPAN;
        p += (target - p) * (1 - Math.exp(-dt * 3.2));
      }
      const age = litAt < 0 ? -1 : (now - litAt) / 1000;
      const T = shot.T;
      if (T > 0 || route === "inicio") update(p);
      // longe do herói, a cena fica atrás da loja: não se desenha
      if (T >= 1 && scrollY > innerHeight * 1.45) {
        film.pause();
        return;
      }

      const waving = litAt >= 0 && age < 3.2 && !skipWave && T === 1;
      if (T === 1 && age >= 3.2 - (skipWave ? 99 : 0) && film.readyState >= 2) {
        if (!filmSynced) {
          filmSynced = true;
          film.currentTime = restT;
        }
        if (rest < 0.07) film.pause();
        else {
          film.playbackRate = rest;
          if (film.paused) film.play().catch(() => {});
        }
        if (!film.seeking) {
          restT = film.currentTime;
          paint(film, 1);
          lastKey = "";
          return;
        }
      } else if (filmSynced) {
        filmSynced = false;
        film.pause();
      }

      const base = lerp(lerp(AT.inicio, AT.fimScroll, p), AT.loja, T);
      const swung = base + SWING.amp * Math.sin((2 * Math.PI * restT) / SWING.period) * T;
      const index = T === 1 ? Math.round(swung) : swung; // à espera do vídeo, fica numa imagem exata
      const key = waving ? `w${age.toFixed(2)}` : index.toFixed(2);
      if (key === lastKey) return;
      lastKey = key;
      if (!waving) {
        paintPath(index);
        return;
      }
      // os degraus acendem de baixo para cima e passam ao percurso sem salto
      const k = clamp01((age - 0.25) / 2.2) * (STEPS - 1);
      const a = Math.floor(k);
      const b = Math.min(STEPS - 1, a + 1);
      if (age > 2.8) paintPath(index);
      paint(steps[a] ?? null, age > 2.8 ? 1 - (age - 2.8) / 0.4 : 1);
      if (b !== a && age <= 2.8) paint(steps[b] ?? null, k - a);
    };

    let resizeW = innerWidth;
    let resizeH = innerHeight;
    on("resize", () => {
      if (innerWidth === resizeW && Math.abs(innerHeight - resizeH) < 120) return; // barra do telemóvel
      resizeW = innerWidth;
      resizeH = innerHeight;
      size();
    });
    size();

    // Primeiro o essencial; o resto entra por passagens, de 8 em 8 até estar completo.
    const opening = [88, 96, 80, 144, 136, 40, 48]
      .map(loadFrame)
      .concat(
        steps.map((_, i) =>
          load(`${dir}/a${String(i).padStart(2, "0")}.webp`, (im) => (steps[i] = im)),
        ),
      );
    // O nome do ecrã de abertura viaja até ao logótipo do cabeçalho, letra sobre letra;
    // o cabeçalho e o herói só aparecem quando ele chega.
    const finish = () => {
      html.dataset.lit = "";
      html.dataset.docked = "";
      setDocked(true);
    };
    const dock = () => {
      const word = wordRef.current;
      const logo = document.querySelector<HTMLElement>("[data-logo]");
      const textRect = (el: HTMLElement) => {
        const range = document.createRange();
        range.selectNodeContents(el.firstChild!);
        return range.getBoundingClientRect();
      };
      if (!word?.firstChild || !logo?.firstChild) return finish();
      const box = word.getBoundingClientRect();
      const from = textRect(word);
      const to = textRect(logo);
      const k =
        parseFloat(getComputedStyle(logo).fontSize) / parseFloat(getComputedStyle(word).fontSize);
      const x = to.left - box.left - (from.left - box.left) * k;
      const y = to.top - box.top - (from.top - box.top) * k;
      const glow = getComputedStyle(word).opacity;
      // o cabeçalho e o herói começam a aparecer a meio da viagem
      setTimeout(() => (html.dataset.lit = ""), DOCK_MS * 0.4);
      word
        .animate(
          [
            { opacity: glow, transform: "none", transformOrigin: "0 0" },
            { opacity: 1, offset: 0.3 },
            {
              opacity: 1,
              transform: `translate(${x}px, ${y}px) scale(${k})`,
              transformOrigin: "0 0",
            },
          ],
          { duration: DOCK_MS, easing: "cubic-bezier(.77, 0, .175, 1)", fill: "forwards" },
        )
        .finished.then(finish, finish);
    };

    // Nunca deixar a abertura muito tempo, mesmo que a cena falhe.
    const failsafe = setTimeout(() => {
      setReady(true);
      finish();
      setHeroIn(route === "loja");
    }, 10000);
    const minimum = new Promise((done) => setTimeout(done, SPLASH_MIN_MS));
    void Promise.all([Promise.all(opening), minimum]).then(async () => {
      if (stopped) return;
      clearTimeout(failsafe);
      setReady(true);
      dock();
      litAt = performance.now() + 500;
      raf = requestAnimationFrame(frame);
      for (const step of [8, 4, 2, 1]) {
        const todo: number[] = [];
        for (let i = FIRST; i <= LAST; i += step) todo.push(i);
        for (let i = 0; i < todo.length; i += 6) {
          if (stopped) return;
          await Promise.all(todo.slice(i, i + 6).map(loadFrame));
          lastKey = "";
        }
      }
    });

    return () => {
      stopped = true;
      clearTimeout(failsafe);
      cancelAnimationFrame(raf);
      film.pause();
      film.removeAttribute("src");
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <div className={styles.view} aria-hidden="true">
        <canvas ref={canvasRef} />
        {/* Sem animação (menos movimento pedido): uma imagem fixa da cena. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- fundo decorativo, já otimizado */}
        <img className={styles.poster} src="/home/1920/f090.webp" alt="" />
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
      <div
        className={styles.loading}
        data-ready={ready || undefined}
        data-docked={docked || undefined}
        aria-hidden="true"
      >
        <span ref={wordRef} className={styles.loadingWord}>
          HABINOX<sup>®</sup>
        </span>
      </div>
    </>
  );
}
