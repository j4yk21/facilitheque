// Rend les images de partage 1200×630 (assets/og/*.png) avec Edge ou Chrome en mode headless.
// À lancer après build-seo.mjs : node scripts/build-og.mjs [slug…]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/.og/list.json'), 'utf8'));
const only = process.argv.slice(2);
const BROWSERS = [
  process.env.OG_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);
const browser = BROWSERS.find(b => fs.existsSync(b));
if (!browser) throw new Error('Aucun navigateur Chromium trouvé (définis OG_BROWSER).');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PHASE_COLORS = { avant: '#7FA3C9', ouverture: '#8DB394', production: '#E08A5A', cloture: '#D9AE55', apres: '#D07A76' };

const tpl = o => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=DM+Sans:wght@500;700&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#1A1A1A;color:#F5F0E8;font-family:'DM Sans',sans-serif;position:relative;padding:64px 72px;display:flex;flex-direction:column}
.glow{position:absolute;right:-160px;top:-200px;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,rgba(201,107,58,.38),transparent 64%)}
.ring{position:absolute;right:70px;top:84px;width:230px;height:230px;border-radius:50%;border:34px solid rgba(201,107,58,.85)}
.ring2{position:absolute;right:160px;top:250px;width:90px;height:90px;border-radius:50%;background:#F5F0E8;opacity:.08}
.brand{display:flex;align-items:center;gap:16px;font-family:'Fraunces',serif;font-weight:700;font-size:34px;position:relative}
.mark{width:56px;height:56px;background:#C96B3A;border-radius:50% 50% 50% 16px;display:grid;place-items:center}
.kicker{margin-top:auto;display:flex;align-items:center;gap:14px;font-size:24px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${PHASE_COLORS[o.phase] || '#E08A5A'};position:relative}
.kicker::before{content:'';width:44px;height:4px;background:currentColor;border-radius:2px}
h1{font-family:'Fraunces',serif;font-weight:700;font-size:${o.title.length > 34 ? 66 : o.title.length > 20 ? 84 : 104}px;line-height:1.04;letter-spacing:-.005em;word-spacing:.04em;margin:18px 0 26px;max-width:${o.title.length > 20 ? 960 : 820}px;position:relative}
.meta{font-size:28px;color:rgba(245,240,232,.62);position:relative;max-width:760px}
.url{position:absolute;right:72px;bottom:64px;font-size:22px;color:rgba(245,240,232,.4);font-weight:500}
</style></head><body>
<div class="glow"></div><div class="ring"></div><div class="ring2"></div>
<div class="brand"><span class="mark"><svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="white"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M3.1 12.9l1.1-1.1M11.8 4.2l1.1-1.1" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg></span>Facilithèque</div>
<div class="kicker">${esc(o.kicker)}</div>
<h1>${esc(o.title)}</h1>
<div class="meta">${esc(o.meta)}</div>
<div class="url">facilitheque.vercel.app</div>
</body></html>`;

const tmp = path.join(ROOT, 'scripts/.og');
const out = path.join(ROOT, 'assets/og');
fs.mkdirSync(out, { recursive: true });
const todo = only.length ? list.filter(o => only.includes(o.file)) : list;
// Le navigateur peut rendre la main avant d'avoir écrit l'image : on attend le fichier, taille stable
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function waitFor(file) {
  let last = -1;
  for (let t = 0; t < 200; t++) {
    const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (size > 0 && size === last) return;
    last = size; sleep(100);
  }
  throw new Error(`Image non produite : ${file}`);
}
for (const [i, o] of todo.entries()) {
  const html = path.join(tmp, `${o.file}.html`);
  const png = path.join(out, o.file + '.png');
  fs.writeFileSync(html, tpl(o));
  fs.rmSync(png, { force: true });
  // Profil isolé : sinon le navigateur déjà ouvert récupère la commande et rien n'est capturé
  execFileSync(browser, ['--headless=new', `--user-data-dir=${path.join(tmp, 'profile')}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=5000', `--screenshot=${path.join(out, o.file + '.png')}`,
    pathToFileURL(html).href], { stdio: 'ignore' });
  waitFor(png);
  process.stdout.write(`\r${i + 1}/${todo.length} ${o.file.padEnd(40)}`);
}
console.log(`\n${todo.length} images dans assets/og/`);
