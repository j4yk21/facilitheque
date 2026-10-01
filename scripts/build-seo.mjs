// Génère les pages web indexables de Facilithèque à partir des données de l'application.
// Source unique : le tableau TOOLS de facilitheque-app.html. Lancer : node scripts/build-seo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://facilitheque.vercel.app';
const BRAND = 'Facilithèque';
const TODAY = new Date().toISOString().slice(0, 10);

// ── Données extraites de l'application ──
const app = fs.readFileSync(path.join(ROOT, 'facilitheque-app.html'), 'utf8');
const grab = (re, label) => {
  const m = app.match(re);
  if (!m) throw new Error(`Impossible de trouver ${label} dans facilitheque-app.html`);
  return new Function(`return ${m[1]}`)();
};
const TOOLS = grab(/const TOOLS = (\[[\s\S]*?\n\]);/, 'TOOLS');

const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const minDur = t => { const m = String(t.dur).match(/½|\d+/); if (!m) return 15; const n = m[0] === '½' ? .5 : parseInt(m[0]); return Math.round(/jour/.test(t.dur) ? n * 480 : n); };
const clip = (s, n) => s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…';
TOOLS.forEach(t => { t.slug = slugify(t.name); t.minDur = minDur(t); t.url = `/outils/${t.slug}/`; });

// ── Catégories : moments de l'atelier et besoins ──
const PHASES = {
  avant: { slug: 'avant-atelier', label: "Avant l'atelier", where: "avant l'atelier",
    h1: 'Préparer un atelier : outils de cadrage et de diagnostic',
    intro: "Un atelier réussi se joue souvent avant d'entrer dans la salle. Ces outils t'aident à clarifier l'objectif, à comprendre les participants et à anticiper les tensions, pour concevoir un déroulé qui tient la route." },
  ouverture: { slug: 'ouverture', label: 'Ouverture', where: "en ouverture d'atelier",
    h1: "Ouvrir un atelier : brise-glaces et rituels d'inclusion",
    intro: "Les premières minutes donnent le ton. Ces outils créent de la présence, de la confiance et de l'énergie, pour que chacun ose prendre la parole dès le début." },
  production: { slug: 'production', label: 'Production', where: 'au cœur de l\'atelier',
    h1: 'Faire travailler un groupe : outils de production collective',
    intro: "Le cœur de l'atelier : générer des idées, explorer un sujet sous plusieurs angles et faire émerger l'intelligence du groupe, sans que les mêmes voix dominent." },
  cloture: { slug: 'cloture', label: 'Clôture', where: "en clôture d'atelier",
    h1: "Clôturer un atelier : décider, prioriser et s'engager",
    intro: "Un atelier sans clôture laisse un goût d'inachevé. Ces outils transforment les échanges en décisions, en priorités claires et en engagements concrets." },
  apres: { slug: 'apres-atelier', label: "Après l'atelier", where: "après l'atelier",
    h1: "Après l'atelier : débriefer et apprendre",
    intro: "Prendre du recul sur ce qui s'est passé, recueillir les retours et en tirer des enseignements pour la prochaine fois." },
};
const NEEDS = {
  lien: { slug: 'creer-du-lien', label: 'Créer du lien', verb: 'créer du lien',
    h1: 'Créer du lien dans un groupe : outils de facilitation',
    intro: "Pour qu'un groupe travaille bien, ses membres doivent se connaître et se faire confiance. Ces outils favorisent l'écoute, la connexion et le sentiment d'appartenance." },
  idees: { slug: 'generer-des-idees', label: 'Générer des idées', verb: 'générer des idées',
    h1: 'Générer des idées en groupe : outils de créativité',
    intro: "Du brainstorming silencieux aux méthodes structurées, ces outils produisent beaucoup d'idées, et des idées plus originales, sans laisser les plus bavards monopoliser la parole." },
  decision: { slug: 'prioriser-decider', label: 'Prioriser et décider', verb: 'prioriser et décider',
    h1: 'Prioriser et décider en groupe : outils de facilitation',
    intro: "Voter, trier, arbitrer, obtenir un accord : ces outils aident un groupe à converger vers une décision légitime, comprise et assumée par tous." },
  conflits: { slug: 'gerer-les-conflits', label: 'Gérer les conflits', verb: 'gérer les tensions',
    h1: 'Gérer les conflits et les tensions en atelier',
    intro: "Quand le sujet est sensible ou que les désaccords s'installent, ces outils créent un cadre sûr pour exprimer les tensions et les transformer en avancées." },
  energie: { slug: 'maintenir-energie', label: "Maintenir l'énergie", verb: "maintenir l'énergie du groupe",
    h1: "Maintenir l'énergie d'un groupe en atelier",
    intro: "Coup de mou après le déjeuner, visio qui s'étire : ces outils remettent du mouvement, du rythme et de la légèreté dans la session." },
};
const phaseUrl = k => `/outils/moment/${PHASES[k].slug}/`;
const needUrl = k => `/outils/besoin/${NEEDS[k].slug}/`;

// ── Gabarit commun ──
const SUN = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="white"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M3.1 12.9l1.1-1.1M11.8 4.2l1.1-1.1" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg>';
export const LIVE_LINKS = [];   // complété par les pages outils live (partie 2)

function header(current) {
  const nav = [['/outils/', 'Fiches outils', true], ...LIVE_LINKS.slice(0, 3).map(l => [l.url, l.short])];
  return `<header class="site-top"><div class="wrap top-in">
  <a class="brand" href="/"><span class="brand-mark">${SUN}</span>${BRAND}</a>
  <nav class="top-nav" aria-label="Navigation principale">${nav.map(([u, l, keep]) => `<a href="${u}"${keep ? ' class="keep"' : ''}${current === u ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>
  <a class="btn btn-primary" href="/">Ouvrir l'app</a>
</div></header>`;
}
function footer() {
  const list = items => `<ul>${items.map(([u, l]) => `<li><a href="${u}">${esc(l)}</a></li>`).join('')}</ul>`;
  return `<footer class="site-foot"><div class="wrap">
  <div class="foot-grid">
    <div><a class="brand" href="/"><span class="brand-mark">${SUN}</span>${BRAND}</a>
      <p>La boîte à outils libre des facilitateurs : minuteurs, tirage au sort, temps de parole et ${TOOLS.length} fiches méthodes. Gratuit, sans compte, et même hors ligne.</p></div>
    <div><h2>Par moment</h2>${list(Object.keys(PHASES).map(k => [phaseUrl(k), PHASES[k].label]))}</div>
    <div><h2>Par besoin</h2>${list(Object.keys(NEEDS).map(k => [needUrl(k), NEEDS[k].label]))}</div>
    <div><h2>Outils live</h2>${list(LIVE_LINKS.length ? LIVE_LINKS.map(l => [l.url, l.short]) : [['/', "Ouvrir l'application"]])}</div>
  </div>
  <p class="foot-bottom">${BRAND} est un projet open source · <a href="https://github.com/j4yk21/facilitheque">Code sur GitHub</a></p>
</div></footer>`;
}
function page({ path: p, title, description, h = '', body, jsonld = [], current, image = '/assets/og/default.png' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${p}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1A1A1A">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}${p}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${BRAND}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script>try{document.documentElement.dataset.theme=localStorage.getItem('fk-theme')||'';document.documentElement.dataset.palette=localStorage.getItem('fk-palette')||''}catch(e){}</script>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}${h}
</head>
<body>
${header(current)}
<main>
${body}
</main>
${footer()}
</body>
</html>
`;
}
const crumbs = items => `<ol class="crumbs wrap">${items.map(([u, l]) => `<li>${u ? `<a href="${u}">${esc(l)}</a>` : `<span aria-current="page">${esc(l)}</span>`}</li>`).join('')}</ol>`;
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([u, l], i) => ({ '@type': 'ListItem', position: i + 1, name: l, ...(u ? { item: SITE + u } : {}) })) });
const card = t => `<a class="card" href="${t.url}" data-phase="${t.phase}">
  <span class="badge ph-${t.phase}">${esc(t.phaseLabel)}</span>
  <h3>${esc(t.name)}</h3>
  <span class="card-meta"><span>⏱ ${esc(t.dur)}</span><span>👥 ${esc(t.grp)}</span></span>
  <p>${esc(clip(t.desc, 130))}</p>
</a>`;

// ── Écriture ──
const written = [];
function write(urlPath, html) {
  const file = path.join(ROOT, urlPath, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.push(urlPath);
}

// ── Pages fiche ──
const andList = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a.at(-1);
function summaryOf(t) {
  const dur = t.dur.replace('–', ' à ').replace('min / pers.', 'minutes par personne').replace(/\bmin\b/, 'minutes');
  const when = /jour/.test(t.dur) ? `sur ${dur}` : `en ${dur}`;
  const grp = t.grp.replace('pers. / table', 'personnes par table').replace('pers.', 'personnes');
  return `Cet outil se déroule ${when} et convient à un groupe de ${grp}. On l'utilise ${PHASES[t.phase].where}, pour ${andList(t.needs.map(n => NEEDS[n].verb))}.`;
}
function related(t) {
  return TOOLS.filter(o => o !== t)
    .map(o => ({ o, s: o.needs.filter(n => t.needs.includes(n)).length * 2 + (o.phase === t.phase ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || a.o.id - b.o.id).slice(0, 3).map(x => x.o);
}
for (const t of TOOLS) {
  const trail = [['/', 'Accueil'], ['/outils/', 'Fiches outils'], [phaseUrl(t.phase), PHASES[t.phase].label], [null, t.name]];
  const body = `${crumbs(trail)}
<div class="wrap">
<article class="fiche">
  <div>
    <header class="hero">
      <a class="badge ph-${t.phase}" href="${phaseUrl(t.phase)}">${esc(t.phaseLabel)}</a>
      <h1>${esc(t.name)}</h1>
      <p class="lede">${esc(t.desc)}</p>
      <dl class="facts">
        <div><dt>Durée</dt><dd>${esc(t.dur)}</dd></div>
        <div><dt>Groupe</dt><dd>${esc(t.grp)}</dd></div>
        <div><dt>Pour</dt><dd>${t.needs.map(n => `<a href="${needUrl(n)}">${esc(NEEDS[n].label)}</a>`).join(', ')}</dd></div>
      </dl>
      <p class="summary">${esc(summaryOf(t))}</p>
    </header>
    <section class="sec" aria-labelledby="deroule">
      <h2 id="deroule">Déroulé en pratique</h2>
      <ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    </section>
    <aside class="tip"><h2>Conseil du praticien</h2><p>${esc(t.tip)}</p></aside>
    <section class="sec"><h2 class="sr-only">Mots-clés</h2><div class="tags">${t.tags.map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div></section>
  </div>
  <aside class="side">
    <div class="side-card">
      <h2>Anime-le avec ${BRAND}</h2>
      <p>Minuteur plein écran, ajout à ton déroulé, fiche PDF. Gratuit, sans compte.</p>
      <a class="btn btn-primary" href="/#minuteur/${t.minDur}">⏱ Minuteur de ${t.minDur} min</a>
      <a class="btn btn-ghost" href="/#outil/${t.slug}">＋ Ajouter à mon plan</a>
    </div>
    <p class="side-note">La fiche s'ouvre dans l'application : bouton « Ajouter au plan » et téléchargement en PDF.</p>
  </aside>
</article>
</div>
<section class="block" style="background:var(--cream-dark)"><div class="wrap">
  <div class="block-head"><h2>Outils proches</h2><a class="chip" href="/outils/">Voir les ${TOOLS.length} fiches</a></div>
  <div class="cards">${related(t).map(card).join('')}</div>
</div></section>`;
  const howto = { '@context': 'https://schema.org', '@type': 'HowTo', name: t.name, description: t.desc, inLanguage: 'fr-FR',
    totalTime: `PT${t.minDur}M`, url: SITE + t.url,
    step: t.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) };
  write(t.url, page({ path: t.url, current: '/outils/',
    title: `${t.name} : déroulé, durée et conseils | ${BRAND}`,
    description: clip(`${t.name} (${t.dur}, ${t.grp}) : ${t.desc}`, 158),
    image: `/assets/og/${t.slug}.png`, body, jsonld: [howto, crumbsLd(trail)] }));
}

// ── Page index des fiches ──
{
  const trail = [['/', 'Accueil'], [null, 'Fiches outils']];
  const body = `${crumbs(trail)}
<header class="hero wrap">
  <span class="kicker">Bibliothèque libre</span>
  <h1>${TOOLS.length} outils de facilitation, prêts à animer</h1>
  <p class="lede">Brise-glaces, méthodes de créativité, outils de décision et de clôture : chaque fiche donne la durée, la taille de groupe, le déroulé pas à pas et le conseil d'un praticien. Gratuit et sans inscription.</p>
  <div class="hero-cta"><a class="btn btn-primary btn-lg" href="/#bibliotheque">Chercher dans l'application</a></div>
</header>
<div class="wrap" style="padding-bottom:8px">
  <h2 class="sr-only">Par besoin</h2>
  <div class="chips">${Object.keys(NEEDS).map(k => `<a class="chip" href="${needUrl(k)}">${esc(NEEDS[k].label)}</a>`).join('')}</div>
</div>
${Object.keys(PHASES).map(k => `<section class="block"><div class="wrap">
  <div class="block-head"><div><h2>${esc(PHASES[k].label)}</h2><p>${esc(PHASES[k].intro)}</p></div><a class="chip" href="${phaseUrl(k)}">Tout voir</a></div>
  <div class="cards">${TOOLS.filter(t => t.phase === k).map(card).join('')}</div>
</div></section>`).join('')}`;
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Fiches outils de facilitation',
    itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + t.url, name: t.name })) };
  write('/outils/', page({ path: '/outils/', current: '/outils/',
    title: `${TOOLS.length} outils de facilitation : fiches pratiques gratuites | ${BRAND}`,
    description: `Brise-glaces, World Café, 1-2-4-All, Dot Voting… ${TOOLS.length} fiches de facilitation avec durée, taille de groupe, déroulé pas à pas et conseils. Gratuit, sans inscription.`,
    body, jsonld: [list, crumbsLd(trail)] }));
}

// ── Pages catégories ──
function categoryPage(kind, key, def, tools) {
  const url = kind === 'moment' ? phaseUrl(key) : needUrl(key);
  const trail = [['/', 'Accueil'], ['/outils/', 'Fiches outils'], [null, def.label]];
  const siblings = kind === 'moment'
    ? Object.keys(PHASES).map(k => [phaseUrl(k), PHASES[k].label])
    : Object.keys(NEEDS).map(k => [needUrl(k), NEEDS[k].label]);
  const body = `${crumbs(trail)}
<header class="hero wrap">
  <span class="kicker">${kind === 'moment' ? 'Par moment' : 'Par besoin'} · ${tools.length} fiches</span>
  <h1>${esc(def.h1)}</h1>
  <p class="lede">${esc(def.intro)}</p>
</header>
<div class="wrap"><div class="chips">${siblings.map(([u, l]) => `<a class="chip" href="${u}"${u === url ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</div></div>
<section class="block"><div class="wrap"><h2 class="sr-only">Les fiches</h2><div class="cards">${tools.map(card).join('')}</div></div></section>
<div class="wrap"><div class="band"><div><h2>Prépare ton déroulé en quelques minutes</h2><p>Ajoute ces outils à ton plan, puis lance-le en séquence minutée.</p></div><a class="btn btn-primary btn-lg" href="/#planificateur">Ouvrir le planificateur</a></div></div>`;
  write(url, page({ path: url, current: '/outils/', title: `${def.h1} | ${BRAND}`,
    description: clip(`${def.intro} ${tools.length} fiches gratuites : ${tools.slice(0, 4).map(t => t.name).join(', ')}…`, 158),
    body, jsonld: [crumbsLd(trail)] }));
}
for (const k of Object.keys(PHASES)) categoryPage('moment', k, PHASES[k], TOOLS.filter(t => t.phase === k));
for (const k of Object.keys(NEEDS)) categoryPage('besoin', k, NEEDS[k], TOOLS.filter(t => t.needs.includes(k)));

// ── Sitemap ──
const urls = ['/', ...written];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod><priority>${u === '/' ? '1.0' : u === '/outils/' ? '0.9' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`);
console.log(`${written.length} pages générées, sitemap : ${urls.length} adresses.`);
