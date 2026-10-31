// Cenários 3D das categorias da loja: uma cena por imagem, todas com a mesma luz de fim de dia.
// Ilustrativos, até haver fotografias das obras. Render: `node render.mjs` (ver esse ficheiro).
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const V3 = THREE.Vector3;
const WARM = '#ffc690', WARM2 = '#ffe4c8';   // luz quente mas pouco saturada: o betão tem de continuar cinzento
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function concreteCanvas(seed = 5, base = 128, boards = 0) {
  const S = 1024, [c, x] = cv(S, S), r = rng(seed); x.fillStyle = `rgb(${base},${base - 2},${base - 5})`; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { const a = r() * 40 + 4, g = base + (r() - .5) * 26; x.fillStyle = `rgba(${g},${g - 2},${g - 5},.09)`; x.beginPath(); x.ellipse(r() * S, r() * S, a * (1 + r() * 2), a, r() * 3, 0, 7); x.fill(); }
  for (let i = 0; i < 9000; i++) { const g = r() < .5 ? 40 : 200; x.fillStyle = `rgba(${g},${g},${g},${r() * .12})`; x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
  if (boards) for (let j = 0; j < boards; j++) { const y = j * S / boards, g = r() * 16 - 8; x.fillStyle = `rgba(${g > 0 ? 255 : 0},${g > 0 ? 255 : 0},${g > 0 ? 255 : 0},${Math.abs(g) / 170})`; x.fillRect(0, y, S, S / boards); x.fillStyle = 'rgba(20,20,20,.45)'; x.fillRect(0, y, S, 2); }
  return c;
}
function woodCanvas(seed = 3, tone = [120, 74, 42]) {
  const S = 1024, [c, x] = cv(S, S), r = rng(seed); x.fillStyle = `rgb(${tone})`; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) { const y = r() * S, k = r() < .5 ? 0 : 255; x.strokeStyle = `rgba(${k},${k * .8},${k * .6},${r() * .09})`; x.lineWidth = .5 + r() * 2.5; x.beginPath(); x.moveTo(0, y); const d = (r() - .5) * 24; x.bezierCurveTo(S / 3, y + d, S * 2 / 3, y - d, S, y); x.stroke(); }
  return c;
}
function skyCanvas() {
  const [c, x] = cv(1024, 512), g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#10151d'); g.addColorStop(.5, '#2a323c'); g.addColorStop(.8, '#6a6660'); g.addColorStop(1, '#a98f70');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  const r = rng(9); x.fillStyle = '#0d0f12'; x.beginPath(); x.moveTo(0, 512);
  for (let i = 0; i <= 1024; i += 6) x.lineTo(i, 440 - 26 * Math.sin(i * .011 + 1) - 14 * Math.sin(i * .037) - r() * 7); x.lineTo(1024, 512); x.fill();
  return c;
}

let C;   // materiais partilhados de cada cena
function mats() {
  const conc = concreteCanvas(5, 128, 0), board = concreteCanvas(8, 118, 9);
  return {
    wall: new THREE.MeshStandardMaterial({ map: tex(conc, 2, 1), bumpMap: tex(conc, 2, 1, false), bumpScale: .4, roughness: .86 }),
    board: new THREE.MeshStandardMaterial({ map: tex(board, 1.5, 1), bumpMap: tex(board, 1.5, 1, false), bumpScale: 1, roughness: .9 }),
    floor: new THREE.MeshStandardMaterial({ map: tex(concreteCanvas(11, 98), 5, 5), roughness: .5 }),
    lacquer: new THREE.MeshStandardMaterial({ color: '#1f2224', roughness: .42, metalness: .55 }),
    black: new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: .5, metalness: .4 }),
    inox: new THREE.MeshStandardMaterial({ color: '#c9cbcc', roughness: .24, metalness: 1 }),
    oak: new THREE.MeshStandardMaterial({ map: tex(woodCanvas(3), 1, 1), roughness: .5 }),
    walnut: new THREE.MeshStandardMaterial({ map: tex(woodCanvas(7, [78, 46, 28]), 1, 1), roughness: .42 }),
    stone: new THREE.MeshStandardMaterial({ map: tex(concreteCanvas(4, 196), 1, 1), roughness: .4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#b9c6c6', transparent: true, opacity: .16, roughness: .04, metalness: .1, depthWrite: false, side: THREE.DoubleSide })
  };
}
function glow(k = 3, col = WARM2) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) }); }

class Stage {
  constructor(scene) { this.s = scene; this.lights = []; this.mirror = null; }
  add(m, shadow = true) { m.castShadow = m.receiveShadow = shadow; this.s.add(m); return m; }
  box(w, h, d, mat, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; return this.add(m); }
  emit(w, h, d, x, y, z, k = 3, col) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glow(k, col)); m.position.set(x, y, z); this.s.add(m); return m; }
  cyl(r0, r1, h, mat, x, y, z, seg = 40) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); return this.add(m); }
  // luz de área: em cada amostra a fonte salta dentro de um volume, o que dá sombras e reflexos suaves
  spot(col, power, p, t, spread = [.05, .05, .05], angle = .7, shadow = true) {
    const l = new THREE.SpotLight(col, power, 0, angle, 1, 1.7); l.position.set(...p); l.target.position.set(...t);
    l.castShadow = shadow; if (shadow) { l.shadow.mapSize.setScalar(1024); l.shadow.bias = -.0006; l.shadow.normalBias = .012; l.shadow.camera.near = .05; l.shadow.camera.far = 30; }
    this.s.add(l, l.target); this.lights.push({ l, p: new V3(...p), spread: new V3(...spread) }); return l;
  }
  point(col, power, p, spread = [.05, .05, .05]) { const l = new THREE.PointLight(col, power, 0, 1.8); l.position.set(...p); this.s.add(l); this.lights.push({ l, p: new V3(...p), spread: new V3(...spread) }); return l; }
  floor(strength = 1, size = 40, mat = C.floor) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; this.s.add(f);
    this.mirror = new Reflector(new THREE.PlaneGeometry(size, size), {
      textureWidth: 1024, textureHeight: 1024, clipBias: .003, multisample: 0,
      shader: { name: 'Sheen', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, jit: { value: new THREE.Vector2() }, amt: { value: strength } },
        vertexShader: 'uniform mat4 textureMatrix; varying vec4 vP; varying vec3 vW; void main(){ vP = textureMatrix * vec4(position,1.); vW = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform sampler2D tDiffuse; uniform vec2 jit; uniform float amt; varying vec4 vP; varying vec3 vW; void main(){ vec3 V = normalize(cameraPosition - vW); float f = (.05 + .6 * pow(1. - clamp(V.y,0.,1.), 3.5)) * amt; vec2 uv = vP.xy / vP.w + jit; gl_FragColor = vec4(texture2D(tDiffuse, uv).rgb * f, 1.); }' } });
    Object.assign(this.mirror.material, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mirror.rotation.x = -Math.PI / 2; this.mirror.position.y = .002; this.s.add(this.mirror);
  }
  sky(z = -26) { const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 34), new THREE.MeshBasicMaterial({ map: tex(skyCanvas()) })); m.position.set(0, 11, z); this.s.add(m); }
  // pátio exterior: muro de betão, pilares, casa ao fundo com janelas acesas
  yard(openW, wallH = 2.5, ledK = 1.8) {
    this.sky(); this.floor(.9);
    const side = (openW / 2 + .35);
    for (const s of [-1, 1]) {
      this.box(14, wallH, .3, C.board, s * (side + .3 + 7), wallH / 2, 0);
      this.box(.6, wallH + .25, .5, C.wall, s * side, (wallH + .25) / 2, 0);
      this.emit(13.8, .02, .02, s * (side + .3 + 7), wallH - .01, .17, ledK);        // LED sob o capeamento
      this.box(14, .06, .4, C.black, s * (side + .3 + 7), wallH + .03, 0);
    }
    // casa
    this.box(13, 3, 9, C.wall, 1, 1.5, -11); this.box(14, .22, 10, C.black, 1, 3.1, -10.8);
    this.emit(3, 2.2, .04, -1.8, 1.2, -6.48, 1.3, WARM); this.emit(1.4, 2.2, .04, 2.6, 1.2, -6.48, .9, WARM);
    this.point(WARM, 16, [-1.8, 1.4, -5.2], [.6, .3, .3]);
    this.point(WARM, 7, [2.6, 1.4, -5.2], [.3, .3, .3]);
    return side;
  }
  graze(x, z = .32, h = 2.5, power = 26, tz = 0) {   // luz rasante no chão, a subir pela parede
    this.emit(.09, .012, .09, x, .006, z, 4);
    this.spot(WARM, power * .75, [x, .04, z], [x, h, tz], [.05, .01, .05], .78, true);
  }
  // caixilho de um portão visto de frente (z = 0)
  frame(w, h, x = 0, z = 0, mat = C.lacquer, t = .07) {
    this.box(w, t, t, mat, x, .09 + t / 2, z); this.box(w, t, t, mat, x, h - t / 2, z);
    for (const s of [-1, 1]) this.box(t, h - .09, t, mat, x + s * (w - t) / 2, .09 + (h - .09) / 2, z);
  }
  bars(w, h, step, x = 0, z = 0, mat = C.lacquer, t = .03) {
    const n = Math.floor(w / step);
    for (let i = 1; i < n; i++) this.box(t, h - .2, t, mat, x - w / 2 + i * w / n, .09 + (h - .09) / 2, z);
  }
  // degraus entre dois pontos; f(i, x, y) permite acrescentar detalhes por degrau
  flight(n, run, rise, width, mat, x0, z, thick = .06, f) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * run, y = (i + 1) * rise;
      this.box(run + .03, thick, width, mat, x, y - thick / 2, z);
      if (f) f(i, x, y);
    }
  }
  tube(pts, r, mat) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new V3(...p))), Math.max(40, pts.length * 6), r, 10), mat); return this.add(m); }
}

function pyramids(st, w, h, cols, rows, x, y, z, mat, even = false) {   // chapa com relevo em pirâmides
  const pos = [], cw = w / cols, ch = h / rows, depth = .07, r = rng(4);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = [x - w / 2 + i * cw, y + j * ch], b = [a[0] + cw, a[1] + ch], ax = a[0] + cw * (even ? .5 : .32 + r() * .36), ay = a[1] + ch * (even ? .5 : .32 + r() * .36), Z = z + depth;
    const P = [[a[0], a[1], z], [b[0], a[1], z], [b[0], b[1], z], [a[0], b[1], z]], T = [ax, ay, Z];
    for (let k = 0; k < 4; k++) pos.push(...P[k], ...P[(k + 1) % 4], ...T);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return st.add(new THREE.Mesh(g, mat));
}

const SCENES = {
  'portao-geometrico': st => {
    const W = 4.6, H = 2.3; st.yard(W);
    const m = new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: .36, metalness: .7, flatShading: true });
    for (const s of [-1, 1]) { pyramids(st, W / 2 - .05, H - .1, 5, 5, s * W / 4, .1, 0, m); st.box(W / 2 - .05, H - .1, .03, C.black, s * W / 4, H / 2 + .05, -.02); }
    st.graze(-2.3, 1.2, 2.3, 34, .05); st.graze(2.3, 1.2, 2.3, 34, .05);
    st.spot(WARM2, 42, [0, 4.6, 4.2], [0, 1, 0], [1, .1, .3], .62);
    return { pos: [1.6, 1.15, 7.2], tgt: [.2, 1.25, 0], fov: 38, hemi: .28 };
  },
  'portoes-capa': st => {   // capa panorâmica da categoria: portão à direita, muro comprido à esquerda para o título
    const W = 5, H = 2.35; st.yard(W, 2.6, .55);
    const m = new THREE.MeshStandardMaterial({ color: '#34363a', roughness: .42, metalness: .4, flatShading: true });
    for (const s of [-1, 1]) { pyramids(st, W / 2 - .04, H - .1, 6, 6, s * W / 4, .1, 0, m, true); st.box(W / 2 - .04, H - .1, .03, C.black, s * W / 4, H / 2 + .05, -.02); }
    st.spot(WARM2, 210, [-6.5, 1, 3.4], [.2, 1.2, 0], [.5, .4, .4], .46);   // luz rasante, igual em todas as pirâmides
    st.spot(WARM2, 10, [1, 4.8, 5], [0, 1, 0], [1.5, .1, .4], .6, false);
    for (const x of [-11.5, -8.5, -5.5, 4.4]) { st.emit(.09, .012, .09, x, .006, .34, 4); st.spot(WARM, 34, [x, .04, .34], [x, 2.6, 0], [.05, .01, .05], .75, false); }
    return { pos: [-2.5, 1.1, 11], tgt: [-2.5, 1.72, 0], fov: 30, hemi: .24 };
  },
  'portao-correr-cinza': st => {   // Linear: barras verticais, a deslizar sobre calha, entreaberto
    const W = 4.2, H = 1.9, side = st.yard(W, 2.3);
    st.frame(W, H, -.85); st.bars(W, H, .13, -.85);
    st.box(W + 2.2, .025, .06, C.inox, -.3, .012, 0);   // calha
    for (const x of [-2.4, .7]) st.cyl(.05, .05, .03, C.inox, x, .05, 0);
    st.graze(1.7, 1.3, 1.9, 26); st.graze(-3, 1.3, 1.9, 26);
    st.spot(WARM2, 15, [1.5, 4.2, 3.4], [0, .8, 0], [.5, .1, .2], .6);
    return { pos: [3.5, 1, 6.4], tgt: [-.2, 1.1, 0], fov: 38, hemi: .28 };
  },
  'portao-ripas': st => {   // lâminas horizontais em alumínio, com luz por trás
    const W = 4.4, H = 2.1; st.yard(W, 2.4);
    st.frame(W, H);
    const n = 14, gap = (H - .2) / n; for (let i = 0; i < n; i++) st.box(W - .1, gap * .84, .05, new THREE.MeshStandardMaterial({ color: '#2b2520', roughness: .5, metalness: .45 }), 0, .14 + (i + .5) * gap, 0);
    st.emit(W - .15, H - .3, .02, 0, H / 2, -.5, 1.4, WARM); st.point(WARM, 9, [0, 1, -.28], [1.6, .6, .05]);
    st.graze(-2.6, 1.3, 2.3, 22); st.spot(WARM2, 12, [-1, 4.2, 3.5], [0, 1, 0], [.4, .1, .2], .6);
    return { pos: [-2.2, 1, 6.6], tgt: [.2, 1.15, 0], fov: 38, hemi: .25 };
  },
  'portao-perfurado': st => {   // chapa perfurada: as aberturas brilham com a luz de trás
    const W = 4.6, H = 2.2; st.yard(W, 2.4);
    const [c, x] = cv(1024, 512), r = rng(12); x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 512); x.fillStyle = '#000';
    for (let j = 0; j < 17; j++) for (let i = 0; i < 37; i++) { const px = 16 + i * 27.5 + (j % 2) * 13, py = 16 + j * 28.5, d = .5 + .5 * Math.sin(px * .012 + 1) * Math.cos(py * .017); x.beginPath(); x.arc(px, py, 2 + 9.5 * d * d + r() * .6, 0, 7); x.fill(); }
    const a = new THREE.CanvasTexture(c); a.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({ color: '#1f2123', roughness: .4, metalness: .6, alphaMap: a, alphaTest: .5, side: THREE.DoubleSide });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W - .1, H - .12), m); sheet.position.set(0, H / 2 + .06, 0); st.add(sheet); st.frame(W, H);
    st.emit(W, H, .02, 0, H / 2, -.6, 1.5, WARM); st.point(WARM, 8, [0, 1, -.3], [1.6, .6, .05]);
    st.spot(WARM2, 12, [1, 4.2, 3.5], [0, 1, 0], [.4, .1, .2], .6);
    return { pos: [1.9, 1.05, 6.8], tgt: [.1, 1.2, 0], fov: 38, hemi: .24 };
  },
  'portao-moradia': st => {   // portão de duas folhas diante da moradia
    const W = 4, H = 1.85; st.sky(); st.floor(.8);
    for (const s of [-1, 1]) { st.box(9, 1.9, .28, C.board, s * (W / 2 + .6 + 4.5), .95, 2); st.box(.5, 2.1, .45, C.wall, s * (W / 2 + .25), 1.05, 2); }
    for (const s of [-1, 1]) { st.frame(W / 2 - .03, H, s * W / 4, 2); st.bars(W / 2 - .03, H, .15, s * W / 4, 2); }
    // moradia: volume de betão suspenso sobre vidro quente, com ripado de madeira
    st.box(10, 3.1, .35, C.wall, -.3, 4.7, -3); st.box(10.6, .25, 5, C.black, -.3, 6.3, -4.8);
    st.box(10, .35, 5, C.wall, -.3, 3, -5);
    st.emit(5.4, 2.7, .05, 1.7, 1.35, -5.5, 1.5, WARM); for (let i = 0; i < 5; i++) st.box(.05, 2.8, .08, C.black, -1 + i * 1.35, 1.4, -5.4);
    st.box(3.4, 2.85, 2, C.wall, -3.5, 1.42, -5.5);
    for (let i = 0; i < 22; i++) st.box(.07, 2.8, .1, C.walnut, -4.9 + i * .135, 4.75, -2.75);
    st.point(WARM, 26, [1.7, 1.8, -3.8], [2, .4, .3]); st.spot(WARM, 18, [-3.4, .05, -2.2], [-3.4, 3, -3], [.05, 0, .05], .7);
    st.emit(10, .025, .03, -.3, 3.14, -2.5, 2); st.spot(WARM2, 20, [-1, 3, -1.8], [-1, 0, 1], [1.8, .05, .1], 1);
    return { pos: [2.4, 1.1, 11.5], tgt: [-.1, 2.35, -1], fov: 34, hemi: .3 };
  },
  'portao-pedonal': st => {   // porta de entrada pivotante, entreaberta para a luz
    st.floor(.9); st.box(4, 3.4, .35, C.board, -3.4, 1.7, 0); st.box(4, 3.4, .35, C.board, 3.4, 1.7, 0); st.box(3, .7, .35, C.board, 0, 3.05, 0);
    st.box(12, .2, 2, C.black, 0, 3.5, .7);
    st.emit(2.8, 2.65, .02, 0, 1.35, -1.4, .8, WARM); st.box(1.2, 1, .5, C.walnut, .55, .5, -1.1); st.emit(.05, 1.8, .05, .55, 1.9, -1.05, 2.4); st.point(WARM, 14, [0, 1.6, -.5], [.6, .6, .3]);
    const d = st.box(1.25, 2.66, .07, C.walnut, 0, 1.34, 0); d.rotation.y = -.42; d.position.set(-.5, 1.34, .28);
    st.box(.03, 1.3, .05, C.inox, -.05, 1.3, .55);
    st.box(.14, 2.7, .4, C.black, -1.45 + .46, 1.35, 0); st.box(.14, 2.7, .4, C.black, 1.0, 1.35, 0); st.box(2.3, .14, .4, C.black, 0, 2.7, 0);
    st.box(1.6, .05, .9, C.stone, 0, .03, .95); st.spot(WARM2, 20, [0, 3.35, 1], [0, 0, .6], [.5, .02, .3], .85);
    st.emit(.05, .05, .05, 0, 3.39, 1, 4); st.graze(-2.4, .3, 3.4, 22, 0);
    return { pos: [1.6, 1.12, 6], tgt: [0, 1.45, 0], fov: 36, hemi: .22 };
  },
  'escada-corrimao-luz': st => {   // escada reta, corrimão com LED
    st.floor(.8); st.box(34, 7, .3, C.board, 0, 3.5, -.85);
    const n = 13, run = .29, rise = .18, x0 = -1.8;
    st.flight(n, run, rise, 1.1, C.stone, x0, 0, .07, (i, x, y) => { st.emit(.26, .012, 1.04, x, y - .075, 0, 1.3); });
    const g = new THREE.BoxGeometry(run * n + .3, .3, .02);
    for (const z of [-.56, .56]) { const m = new THREE.Mesh(g, C.lacquer); m.position.set(x0 + run * n / 2 - .1, rise * n / 2 - .1, z); m.rotation.z = Math.atan2(rise, run); st.add(m); }
    const y = i => (i + 1) * rise; const top = i => [x0 + i * run, y(i) + .92, .56];
    for (let i = 0; i < n; i += 2) st.box(.022, .92, .022, C.black, x0 + i * run, y(i) + .46, .56);
    st.tube([top(-1), top(n / 2), top(n)], .022, C.inox); st.tube([top(-1), top(n / 2), top(n)].map(p => [p[0], p[1] - .03, p[2]]), .007, glow(5));
    st.point(WARM, 15, [.2, 1.3, .2], [1.6, 1, .25]); st.spot(WARM2, 14, [-3, 5, 2], [0, 1, -.8], [.5, .1, .2], .7);
    st.box(5, .2, 2, C.wall, 4.25, rise * n - .1, .1); st.box(.22, rise * n, 1.1, C.wall, 1.95, rise * n / 2, 0);
    return { pos: [-3.3, .9, 5.2], tgt: [.25, 1.65, -.2], fov: 42, hemi: .16 };
  },
  'escada-madeira-luz': st => {   // degraus flutuantes em carvalho, com luz na parede
    st.floor(.75); st.box(34, 7, .3, C.wall, 0, 3.5, -.72);
    const n = 13, run = .3, rise = .185, x0 = -1.7;
    st.flight(n, run, rise, 1.08, C.oak, x0, 0, .08, (i, x, y) => { st.emit(run - .05, .012, .02, x, y - .09, -.55, 3); st.point(WARM, 1.1, [x, y - .15, -.48], [.08, .01, .01]); });
    st.spot(WARM2, 10, [-2.5, 5, 3], [.2, 1, 0], [.5, .1, .2], .65); st.graze(-3.2, -.45, 5, 15, -.6);
    return { pos: [-3, .95, 4.7], tgt: [.2, 1.45, -.15], fov: 44, hemi: .12 };
  },
  'guarda-preta': st => {   // gradeamento de barras em silhueta contra a parede iluminada
    st.floor(.7); st.box(16, 7, .3, C.wall, 0, 3.5, -1);
    const n = 13, run = .3, rise = .18, x0 = -2;
    st.flight(n, run, rise, .95, C.black, x0, 0, .09);
    for (let i = 0; i < 2 * n; i++) { const x = x0 - .1 + i * run / 2, b = (i / 2 + .6) * rise; st.box(.024, 1, .024, C.black, x, b + .5, .47); }
    const p = i => [x0 - .25 + i * run, (i + .6) * rise + 1.02, .47]; st.tube([p(0), p(n / 2), p(n + .5)], .03, C.black); st.tube([[p(0)[0], p(0)[1] - 1, .47], [p(n / 2)[0], p(n / 2)[1] - 1, .47], [p(n + .5)[0], p(n + .5)[1] - 1, .47]], .017, C.black);
    st.spot(WARM, 34, [1, -.05, 1.2], [1, 3.4, -.85], [1.6, 0, .1], 1.05, false);
    st.spot(WARM2, 6, [-3, 4.4, 3.5], [0, 1, 0], [.4, .1, .2], .6);
    return { pos: [-.4, 1.15, 5], tgt: [.15, 1.75, 0], fov: 40, hemi: .1 };
  },
  'escada-caracol': st => {   // escada de caracol em inox
    st.floor(.9); st.box(34, 8, .3, C.wall, 0, 4, -3.3); const R = 1.05, r0 = .1, n = 18, rise = .185, turn = Math.PI * 1.75;
    st.cyl(.07, .07, n * rise + 1.1, C.inox, 0, (n * rise + 1.1) / 2, 0);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a0 = i * turn / n, a1 = a0 + turn / n * 1.04, s = new THREE.Shape(); s.absarc(0, 0, R, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2), C.oak); m.position.y = (i + 1) * rise - .05; st.add(m);
      const mid = (a0 + a1) / 2; const px = Math.cos(mid), pz = -Math.sin(mid);
      st.box(.016, .95, .016, C.black, px * (R - .03), (i + 1) * rise + .47, pz * (R - .03));
      st.emit(.5, .01, .018, px * .62, (i + 1) * rise - .058, pz * .62, 3, WARM2).rotation.y = mid;
      pts.push([px * (R - .03), (i + 1) * rise + .95, pz * (R - .03)]);
    }
    st.tube(pts, .021, C.walnut); st.tube(pts.map(p => [p[0], p[1] - .34, p[2]]), .008, C.inox);
    st.point(WARM, 9, [0, 1.3, .1], [.5, 1, .5]); st.point(WARM, 6, [0, 2.8, .1], [.5, .5, .5]);
    st.spot(WARM2, 40, [-3.2, 6, 2.4], [0, 1.2, -.4], [.5, .1, .4], .55); st.emit(.06, 6.8, .02, 2.6, 3.4, -3.13, 1.6, WARM); st.point(WARM, 8, [2.6, 2.6, -2.6], [.1, 2, .1]);
    return { pos: [-2.3, 1.1, 5.1], tgt: [.3, 2.05, -.3], fov: 40, hemi: .13 };
  },
  'guarda-varanda': st => {   // terraço com guarda de vidro, ao fim do dia
    st.sky(-32);
    const deck = C.oak.clone(); deck.map = deck.map.clone(); deck.map.repeat.set(8, 8); st.floor(.4, 30, deck);
    for (const x of [-4.5, -2.25, 0, 2.25, 4.5]) { st.box(2.2, 1.08, .014, C.glass, x, .56, -2).castShadow = false; st.box(.03, 1.1, .05, C.black, x + 1.125, .55, -2); }
    st.box(11.5, .08, .08, C.black, 0, .03, -2); st.box(11.5, .03, .07, C.inox, 0, 1.11, -2);
    st.box(.4, 4, 9, C.wall, -5.2, 2, 1.5); st.box(9, .25, 9, C.black, -1.6, 3.8, 1.5); st.emit(8.5, .02, .03, -1.5, 3.67, -2.55, 1.6);
    st.spot(WARM2, 30, [-2, 3.6, -.8], [-1.6, 0, -1.2], [1.5, .03, .4], 1); st.spot(WARM, 22, [-4.9, 3.5, -.5], [-4.9, 0, -.8], [.05, .02, .4], .8);
    st.box(1.9, .4, .85, C.lacquer, -3, .3, .1); st.box(1.9, .5, .15, C.lacquer, -3, .55, .46);
    st.box(.8, .04, .8, C.walnut, -1, .34, .2); st.cyl(.02, .02, .32, C.black, -1, .16, .2);
    return { pos: [1.7, 1.25, 3.5], tgt: [-1.2, 1, -2], fov: 50, hemi: .2 };
  },
  'chamine-chapeus': st => {   // chaminés em inox sobre cobertura de zinco
    st.sky(-30); const zinc = new THREE.MeshStandardMaterial({ color: '#2b2d2f', roughness: .52, metalness: .7 });
    const roof = st.box(30, .14, 16, zinc, 0, .2, -3); roof.rotation.x = .24;
    for (let i = -14; i < 15; i++) { const s = st.box(.04, .06, 16, zinc, i * .55, .3, -3); s.rotation.x = .24; }
    const stack = (x, z, h, r) => {
      const b = .2 + (z + 3) * -.245 - .1;
      st.cyl(r, r, h, C.inox, x, b + h / 2, z); st.cyl(r * 1.8, r * 1.8, .03, zinc, x, b + .03, z);
      const y = b + h + .13; const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 2.3, r * 1.15, 44), C.inox); cap.position.set(x, y + r * .55, z); st.add(cap);
      for (let k = 0; k < 3; k++) { const a = k * 2.09; st.box(.012, .15, .012, C.black, x + Math.cos(a) * r * .9, y - .05, z + Math.sin(a) * r * .9); }
    };
    stack(-1.15, -1.2, 1.5, .17); stack(-.2, -2, 2, .21); stack(.85, -1.4, 1.6, .17);
    st.spot(WARM, 90, [-7, .7, 3], [0, 1.5, -2], [.8, .4, .8], .55); st.spot('#8fa2b8', 18, [6, 6, 2], [0, 1, -2], [1, 1, 1], .6);
    return { pos: [.6, 1.1, 3.9], tgt: [-.1, 1.3, -1.6], fov: 40, hemi: .55 };
  },
  'caixa-correio': st => {   // caixa de correio em inox numa parede de betão
    st.floor(.7); st.box(10, 6, .3, C.board, 0, 3, -.15);
    st.box(.42, .56, .15, new THREE.MeshStandardMaterial({ color: '#8f9193', roughness: .38, metalness: 1 }), .15, 1.15, .07); st.box(.32, .018, .02, C.black, .15, 1.3, .15); st.box(.34, .03, .016, C.inox, .15, 1.33, .15);
    const mk = (d, x) => { const [c, g] = cv(128, 128); g.fillStyle = '#d8b06a'; g.font = '300 96px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d, 64, 68); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(.13, .13), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(x, 1.04, .147); st.s.add(m); }; mk('4', .1); mk('7', .19);
    st.spot(WARM, 22, [.15, 2.7, 1.5], [.15, .9, 0], [.25, .05, .2], .55); st.spot(WARM, 8, [.15, 2.6, .22], [.15, .9, -.02], [.1, .02, .02], .7, false); st.emit(.14, .02, .08, .15, 2.61, .08, 4);
    st.box(.04, .01, 3.2, C.black, 2, .01, 1.5); st.graze(-2, .25, 3.4, 14, -.1);
    const pl = (x, h) => { for (let i = 0; i < 26; i++) { const a = i * 2.4, g = new THREE.ConeGeometry(.012, h * (.6 + .4 * Math.sin(i)), 5); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#30311f', roughness: .8 })); m.position.set(x + Math.cos(a) * .14 * Math.sqrt(i) / 2, h / 2, .55 + Math.sin(a) * .1); m.rotation.z = Math.cos(a) * .22; m.rotation.x = Math.sin(a) * .2; st.add(m); } };
    pl(1.25, .75); pl(1.7, .55); pl(-1.3, .6);
    return { pos: [-.7, 1.05, 2.75], tgt: [.1, 1.08, 0], fov: 36, hemi: .13 };
  }
};
SCENES['hero-escada-luz'] = SCENES['escada-caracol'];
window.SCENE_NAMES = Object.keys(SCENES);

window.renderScene = async (name, W, H, samples) => {
  C = mats();
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const R = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  R.setSize(W, H, false); R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0a0b0d');
  const st = new Stage(scene), info = SCENES[name](st);
  // ambiente discreto: céu frio em cima e painel quente, só para os metais terem o que refletir
  const es = new THREE.Scene(); es.background = new THREE.Color('#14181d');
  const pan = (c, k, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  pan('#8d949c', 1.5, 0, 12, 0, 22, 22); pan(WARM, 1.5, -9, 2, 7, 8, 7); pan('#c9cdd2', 1.4, 10, 3, 6, 5, 8);
  const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(es, .05).texture; scene.environmentIntensity = 1.05;
  scene.add(new THREE.HemisphereLight('#aab2bb', '#3a3632', info.hemi * 2.2));

  const cam = new THREE.PerspectiveCamera(info.fov, W / H, .05, 120), P = new V3(...info.pos), T = new V3(...info.tgt);
  const buf = new Float32Array(W * H * 3), px = new Uint8Array(W * H * 4), gl = R.getContext(), r = rng(99);
  for (let n = 0; n < samples; n++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * .014;        // abertura: leve profundidade de campo
    cam.position.set(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, P.z); cam.lookAt(T);
    cam.setViewOffset(W, H, r() - .5, r() - .5, W, H); cam.updateMatrixWorld();
    for (const L of st.lights) L.l.position.set(L.p.x + (r() - .5) * 2 * L.spread.x, L.p.y + (r() - .5) * 2 * L.spread.y, L.p.z + (r() - .5) * 2 * L.spread.z);
    if (st.mirror) st.mirror.material.uniforms.jit.value.set((r() - .5) * .012, (r() - .5) * .012);
    R.render(scene, cam);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let i = 0, j = 0; i < px.length; i += 4, j += 3) { buf[j] += px[i]; buf[j + 1] += px[i + 1]; buf[j + 2] += px[i + 2]; }
    await new Promise(q => setTimeout(q));
  }
  const [out, x] = cv(W, H), id = x.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    const s = ((H - 1 - y) * W + i) * 3, t = (y * W + i) * 4, gr = (r() - .5) * 3.2;
    for (let c = 0; c < 3; c++) id.data[t + c] = buf[s + c] / samples + gr; id.data[t + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  // brilho das fontes de luz
  x.globalCompositeOperation = 'screen'; x.globalAlpha = .35; x.filter = `blur(${W / 60}px) brightness(.6) contrast(2.6)`; x.drawImage(out, 0, 0); x.filter = 'none'; x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  R.dispose(); return out.toDataURL('image/jpeg', .87);
};
