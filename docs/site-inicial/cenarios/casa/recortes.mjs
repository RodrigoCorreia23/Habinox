// Gera as máscaras dos recortes das guardas com o mesmo código e as mesmas sementes do site.
// Uso: node recortes.mjs <index.html> <pasta>   (saída em cinzento bruto; converter com ffmpeg)
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8'), out = process.argv[3];
const src = html.match(/id="voronoi-worker">([\s\S]*?)<\/script>/)[1];
const STEPS = 14, RISE = 3.08 / 15, TURN = 150 * Math.PI / 180, DTH = TURN / STEPS, RI = .52, RO = 1.84;
const UP = .95, DN = .32, CUT0 = -.62, CUT_K = 2, PPM = 1200, BAND = .035;
const lineY = th => RISE * (th / DTH + .5);
const specs = [
  { n: 'exterior', seed: 101, r: RO, th0: -.015, th1: TURN + .02, top: th => lineY(th) + UP, bot: th => Math.max(0, lineY(th) - DN) },
  { n: 'interior', seed: 202, r: RI, th0: CUT0 + .1, th1: TURN + .02, top: th => Math.min(lineY(th) + UP, Math.max(0, (th - CUT0) * CUT_K)), bot: th => Math.max(0, lineY(th) - DN) }
];
for (const g of specs) {
  const W = g.r * (g.th1 - g.th0), H = g.top(g.th1) + .05, w = Math.ceil(W * PPM), h = Math.ceil(H * PPM);
  const low = new Float32Array(w), high = new Float32Array(w);
  for (let px = 0; px < w; px++) {
    const th = g.th0 + (px + .5) / PPM / g.r;
    low[px] = Math.max(lineY(th) + .12, g.bot(th) + .12);
    high[px] = g.top(th) - BAND;
    if (high[px] - low[px] < .25) high[px] = low[px];
  }
  let res; const ctx = { postMessage: d => { res = d; } };
  new Function('self', 'postMessage', src + ';return onmessage;')(ctx, ctx.postMessage)({ data: { w, h, ppm: PPM, W, H, seed: g.seed, low, high } });
  const gray = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) gray[i] = res[i * 2];
  writeFileSync(`${out}/${g.n}.gray`, gray); console.log(g.n, w, h);
}
