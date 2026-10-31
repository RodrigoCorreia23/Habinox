// node render.mjs <pasta de saída> <largura> <altura> <amostras> [nomes separados por vírgula]
import { createRequire } from 'module';
const here = new URL('.', import.meta.url).pathname;
const require = createRequire('/mnt/c/Users/Rodrigo/Desktop/dev/Habinox/package.json');
const { chromium } = require('@playwright/test');
const http = require('http'), fs = require('fs');
const [out, W, H, S, only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const page = `<!doctype html><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script><script type="module" src="/cenas.js"></script>`;
const srv = http.createServer((q, r) => { if (q.url === '/cenas.js') { r.writeHead(200, { 'content-type': 'text/javascript' }); r.end(fs.readFileSync(here + 'cenas.js')); } else { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page); } }).listen(8770);
const b = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage(); pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto('http://localhost:8770/'); await pg.waitForFunction('window.renderScene');
const names = only ? only.split(',') : await pg.evaluate('window.SCENE_NAMES');
for (const n of names) { const t = Date.now(); const u = await pg.evaluate(([n, W, H, S]) => window.renderScene(n, +W, +H, +S), [n, W, H, S]); fs.writeFileSync(`${out}/${n}.jpg`, Buffer.from(u.split(',')[1], 'base64')); console.log(n, Math.round((Date.now() - t) / 1000) + 's'); }
const sheet = names.map(n => `<img style="width:100%;height:280px;object-fit:cover;display:block" src="data:image/jpeg;base64,${fs.readFileSync(`${out}/${n}.jpg`).toString('base64')}">`).join('');
await pg.setViewportSize({ width: 1500, height: 1160 }); await pg.setContent(`<body style="margin:0;background:#0F0E0D;display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${sheet}</body>`); await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}/_folha.png` });
await b.close(); srv.close();
