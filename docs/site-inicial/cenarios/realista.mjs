// Gera uma variante independente, partilhando catálogo e navegação com index.html.
// Executar a partir de qualquer diretório: node docs/site-inicial/cenarios/realista.mjs
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('../', import.meta.url);
let html = await readFile(new URL('index.html', base), 'utf8');
function replace(before, after) {
  if (!html.includes(before)) throw new Error(`A origem mudou; rever substituição: ${before.slice(0, 70)}`);
  html = html.replace(before, after);
}
replace('<title>Habinox Início e Loja</title>', '<title>Habinox — Uma casa vivida</title>');
replace('</head>', `<link rel="preload" as="image" href="img/casa-realista/casa-portrait.webp" media="(max-width: 900px)">
<link rel="preload" as="image" href="img/casa-realista/casa.webp" media="(min-width: 901px)">
<link rel="stylesheet" href="realista.css">
</head>`);
replace('<canvas id="c"></canvas>', `<div class="house-camera">
    <picture class="house-picture">
      <source media="(max-width: 900px)" type="image/webp" srcset="img/casa-realista/casa-portrait.webp">
      <img class="house-photo" src="img/casa-realista/casa.webp" width="1672" height="941" fetchpriority="high" decoding="async" alt="">
    </picture>
  </div><canvas class="house-scene" aria-hidden="true"></canvas>`);
replace('<div class="s-hero" id="shopHero"><div class="wrap">', `<div class="s-hero" id="shopHero"><div class="house-controls"><button class="house-replay" type="button" aria-label="Repetir iluminação">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5a5 5 0 1 1-.5 5M3 1v4h4"/></svg><span>Repetir luzes</span>
    </button><button class="house-control" type="button" aria-pressed="false">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path class="pause-icon" d="M5 3v10M11 3v10"/><path class="play-icon" d="m5 2 8 6-8 6Z"/></svg>
      <span>Pausar ambiente</span>
    </button></div><div class="wrap">`);
const start = html.indexOf('<script type="text/x-scene" id="scene">');
const end = html.indexOf('</script>', start);
if (start < 0 || end < 0) throw new Error('Cena original não encontrada.');
const scene = await readFile(new URL('realista-renderer.js', base), 'utf8') + '\n' + await readFile(new URL('realista.js', base), 'utf8');
html = html.slice(0, start) + '<script type="text/x-scene" id="scene">\n' + scene + '\n' + html.slice(end);
replace("{ value: 1998, suffix: '',  label: 'clientes' },                 // PROVISÓRIO\n  { value: 780,  suffix: '',  label: 'toneladas de inox' }         // PROVISÓRIO", '');
replace('img/casa/f090.jpg" width="1200" height="1600"', 'img/casa-realista/casa.webp" width="1672" height="941"');
replace('Escada helicoidal em obra, com guardas em aço recortadas por CNC e degraus iluminados', 'Estudo de ambiente com escada helicoidal, guardas recortadas e iluminação quente');
replace('Obra real Habinox — guardas em corte CNC', 'Estudo de ambiente · guarda em corte CNC');
replace('https://habinox.pt/img/casa/f090.jpg', 'https://habinox.pt/img/casa-realista/casa.webp');
await writeFile(new URL('realista.html', base), html.replace(/[ \t]+$/gm, ''));
console.log('Variante criada: docs/site-inicial/realista.html');
