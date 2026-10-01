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
// ── Outils live : une page d'atterrissage par outil de l'application ──
const LIVE = [
  { slug: 'minuteur-atelier', short: 'Minuteur', app: '#minuteur', cta: 'Lancer le minuteur',
    title: 'Minuteur atelier en ligne gratuit, en plein écran',
    h1: "Un minuteur d'atelier visible depuis le fond de la salle",
    lede: "Anneau de progression coloré, durées prêtes à l'emploi, plein écran pour projeter et alarme de fin. Lance un décompte en un clic, sans compte ni installation.",
    description: "Minuteur visuel pour animer ateliers et réunions : anneau coloré, durées de 2 à 30 min, plein écran pour projeter, alarme. Gratuit, sans compte, hors ligne.",
    steps: ['Choisis une durée : 2, 5, 10, 15, 20, 30 minutes ou une durée libre.', "Ajoute un libellé si tu veux, par exemple « Travail en sous-groupes ».", 'Lance le décompte avec le bouton Démarrer ou la barre Espace.', 'Passe en plein écran avec la touche F pour projeter le décompte.'],
    features: [['Un code couleur lisible', "L'anneau passe du vert à l'or, puis au terracotta et au rouge à l'approche de la fin."], ['Exact en arrière-plan', 'Le décompte reste juste même quand tu bascules sur tes slides ou ta visio.'], ['Écran toujours allumé', "L'ordinateur ne se met pas en veille pendant le décompte."], ['Reprise après rechargement', 'Une fausse manipulation ? Le minuteur reprend exactement où il en était.']],
    faq: [['Le minuteur fonctionne-t-il hors ligne ?', 'Oui. Une fois le site ouvert une première fois, il fonctionne sans connexion.'], ['Faut-il créer un compte ?', "Non. Tout fonctionne directement dans ton navigateur, sans inscription."], ['Peut-on l\'utiliser en visio ?', "Oui : passe en plein écran et partage cette fenêtre. Les participants voient le décompte et sa couleur."]],
    related: ['1-2-4-all', 'crazy-8s', 'brainwriting-6-3-5'] },
  { slug: 'tirage-au-sort-participants', short: 'Tirage au sort', app: '#roulette', cta: 'Lancer la roulette',
    title: 'Tirage au sort de participants : roulette en ligne gratuite',
    h1: 'Tirer au sort un participant, sans biais et sans débat',
    lede: "Colle la liste du groupe, lance la roulette et laisse le hasard désigner qui commence, qui rapporte ou qui pose la première question. Mode projection inclus.",
    description: "Roulette en ligne pour tirer au sort un participant : liste collée en un clic, retrait après tirage, historique, mode projection. Gratuit, sans compte.",
    steps: ['Ajoute les prénoms un par un ou colle une liste, un nom par ligne.', 'Lance la roulette : le nom tiré s\'affiche en grand.', 'Coche « Retirer après le tirage » pour ne jamais tirer deux fois la même personne.', 'Passe en mode projection pour que tout le groupe suive le tirage.'],
    features: [['Équitable', 'Chaque participant a exactement la même chance d\'être tiré.'], ['Historique', 'Les derniers tirages restent affichés et sont conservés.'], ['Pensé pour la salle', 'Le mode projection affiche le nom en très grand, la barre Espace relance.'], ['Confidentiel', 'Les noms restent dans ton navigateur, rien n\'est envoyé.']],
    faq: [['À quoi sert un tirage au sort en atelier ?', "À désigner qui commence un tour de table, choisir des rapporteurs ou former des groupes sans que le facilitateur paraisse favoriser quelqu'un."], ['Les noms sont-ils enregistrés en ligne ?', 'Non. Ils restent uniquement dans ton navigateur.'], ['Peut-on tirer plusieurs personnes à la suite ?', 'Oui. Active le retrait après tirage et relance autant de fois que nécessaire.']],
    related: ['check-in-meteo', 'cercle-d-inclusion', 'deux-verites-un-mensonge'] },
  { slug: 'temps-de-parole', short: 'Temps de parole', app: '#parole', cta: 'Mesurer le temps de parole',
    title: 'Mesurer le temps de parole en réunion : outil gratuit',
    h1: 'Rendre visible qui parle, et combien de temps',
    lede: "Un chrono par participant, la part de chacun en temps réel et une alerte quand une voix dépasse 40 %. Pour réguler sans avoir à couper la parole.",
    description: "Mesure le temps de parole de chaque participant en réunion : chrono individuel, pourcentage en direct, raccourcis clavier, projection et export PDF. Gratuit.",
    steps: ['Ajoute les participants.', 'Quand quelqu\'un parle, clique sur sa carte ou appuie sur son numéro (1 à 9).', 'Appuie sur 0 pour tout arrêter pendant un silence ou une pause.', 'Exporte le bilan en PDF à la fin de la réunion.'],
    features: [['En direct', 'Temps et pourcentage de chacun se mettent à jour à chaque seconde.'], ['Alerte de déséquilibre', 'Une carte passe en terracotta quand une personne dépasse 40 % du temps total.'], ['Au clavier', 'Les touches 1 à 9 suffisent pour suivre la discussion sans quitter le groupe des yeux.'], ['Projection et PDF', 'Affiche les temps à tout le groupe, puis garde une trace du bilan.']],
    faq: [['Pourquoi mesurer le temps de parole ?', "Parce que les déséquilibres sont presque toujours invisibles pour ceux qui parlent le plus. Les rendre visibles suffit souvent à les corriger."], ['Faut-il le montrer aux participants ?', "C'est un choix : affiché, il pousse à l'autorégulation ; gardé pour toi, il t'aide à distribuer la parole."], ['Le suivi est-il perdu si je recharge la page ?', 'Non. Les temps sont conservés et le chrono en cours reprend.']],
    related: ['fishbowl', 'cercle-d-inclusion', '1-2-4-all'] },
  { slug: 'sequence-de-timers', short: 'Séquence', app: '#sequence', cta: 'Créer une séquence',
    title: 'Séquence de timers : enchaîne les phases de ton atelier',
    h1: "Toutes les phases de ton atelier, minutées et enchaînées",
    lede: "Construis la suite de tes activités, lance-la, et la séquence passe d'elle-même à la phase suivante avec une alerte sonore. Tu animes, elle garde le temps.",
    description: "Enchaîne automatiquement les phases minutées d'un atelier : modèles prêts (rétro, brainstorming, réunion), alerte sonore, projection avec phase suivante. Gratuit.",
    steps: ['Pars d\'un modèle (rétrospective, brainstorming, réunion, ouverture) ou crée tes phases.', 'Réorganise-les par glisser-déposer et ajuste les durées.', 'Lance la séquence : chaque phase démarre à la fin de la précédente.', 'Projette-la : le groupe voit la phase en cours et celle qui suit.'],
    features: [['Modèles prêts', 'Quatre déroulés classiques à lancer en un clic.'], ['Passage automatique', 'Alerte sonore et phase suivante, sans intervention.'], ['Depuis ton plan', 'Le planificateur transforme ton déroulé en séquence en un clic.'], ['Fiable', 'Rattrapage exact si l\'ordinateur se met en veille ou si la page est rechargée.']],
    faq: [['Quelle différence avec un simple minuteur ?', 'Le minuteur gère une durée ; la séquence gère tout le déroulé et enchaîne les phases sans que tu aies à y penser.'], ['Peut-on mettre en pause ?', 'Oui, et passer directement à la phase suivante si le groupe a fini plus tôt.']],
    related: ['world-cafe', 'start-stop-continue', 'retrospective-4l'] },
  { slug: 'planificateur-atelier', short: 'Planificateur', app: '#planificateur', cta: 'Préparer mon atelier',
    title: "Planificateur d'atelier : construis ton déroulé et exporte-le en PDF",
    h1: 'Construis le déroulé de ton atelier, phase par phase',
    lede: "Nom, date, phases, durées et outils : prépare ton atelier, vois l'horaire se calculer, exporte un PDF propre ou partage un lien. Puis lance-le en séquence minutée.",
    description: "Prépare le déroulé de ton atelier : phases, durées, outils issus de 48 fiches, export PDF, lien de partage et lancement en séquence minutée. Gratuit, sans compte.",
    steps: ['Donne un nom, une date et un lieu à ton atelier.', 'Ajoute les phases, leur durée et l\'outil utilisé (suggestions parmi 48 fiches).', 'Réorganise par glisser-déposer : la durée totale se met à jour.', 'Exporte en PDF, partage un lien, ou lance le déroulé en séquence.'],
    features: [['Plusieurs plans', 'Garde, duplique et retrouve tous tes déroulés.'], ['Export PDF', 'Un document avec horaires cumulés, prêt à envoyer à ton commanditaire.'], ['Lien de partage', 'Ton plan s\'ouvre chez ton co-animateur, sans compte.'], ['Préparer puis animer', 'Un clic transforme le plan en séquence minutée.']],
    faq: [['Mes plans sont-ils sauvegardés ?', 'Oui, automatiquement dans ton navigateur. Tu peux en garder plusieurs.'], ['Comment partager un plan ?', 'Le bouton « Partager le lien » copie une adresse qui contient tout le plan. La personne qui l\'ouvre le retrouve dans ses propres plans.']],
    related: ['canvas-des-7p', 'cartographie-des-parties-prenantes', 'plan-d-action-post'] },
  { slug: 'chronometre-atelier', short: 'Chronomètre', app: '#chronometre', cta: 'Lancer le chronomètre',
    title: 'Chronomètre en ligne avec tours, pour ateliers et réunions',
    h1: 'Un chronomètre avec tours pour mesurer chaque prise de parole',
    lede: "Mesure une durée libre au centième, enregistre des tours et garde l'historique : pratique pour les pitchs, les tours de table et le co-développement.",
    description: "Chronomètre en ligne au centième avec tours et historique : idéal pour tours de table, pitchs et co-développement. Raccourcis clavier, gratuit, sans compte.",
    steps: ['Lance le chronomètre avec Démarrer ou la barre Espace.', 'Appuie sur Tour (touche L) à chaque changement d\'intervenant.', 'Consulte le temps de chaque tour et le temps cumulé.', 'Remets à zéro avec la touche R.'],
    features: [['Au centième', 'Une mesure précise, affichée en grand.'], ['Tours enregistrés', 'Temps de chaque tour et temps cumulé, du plus récent au plus ancien.'], ['Au clavier', 'Espace, L et R : tout se pilote sans souris.']],
    faq: [['Chronomètre ou minuteur ?', 'Le chronomètre mesure une durée qui s\'écoule ; le minuteur décompte une durée fixée à l\'avance.']],
    related: ['troika-consulting', 'wise-crowds', 'impromptu-networking'] },
  { slug: 'parking-a-idees', short: "Parking à idées", app: '#parking', cta: 'Ouvrir le parking',
    title: 'Parking à idées : capture les sujets hors sujet en atelier',
    h1: 'Le parking : accueillir chaque idée sans perdre le fil',
    lede: "Une remarque intéressante mais hors sujet ? Gare-la au parking. Idées, questions, actions et blocages restent visibles, puis s'exportent en PDF en fin de séance.",
    description: "Parking à idées pour atelier : capture idées, questions, actions et blocages hors sujet sans couper le fil, puis exporte-les en PDF. Gratuit, sans compte.",
    steps: ['Note l\'idée en une phrase.', 'Choisis sa catégorie : idée, question, action ou blocage.', 'Reviens-y en fin d\'atelier pour décider de leur suite.', 'Exporte le parking en PDF pour le compte rendu.'],
    features: [['Quatre catégories', 'Chaque note a sa couleur pour un tri immédiat.'], ['Horodaté', 'Chaque note garde l\'heure à laquelle elle a été garée.'], ['Export PDF', 'Le parking complet, prêt à joindre au compte rendu.']],
    faq: [['Pourquoi un parking en atelier ?', "Il permet de reconnaître une contribution sans dévier de l'objectif. La personne se sent entendue, et le groupe garde son cap."]],
    related: ['diagramme-d-affinites', 'plan-d-action-post', 'what-so-what-now-what'] },
];
LIVE.forEach(l => { l.url = `/${l.slug}/`; });
const LIVE_LINKS = LIVE;

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

// ── Pages outils live ──
const bySlug = Object.fromEntries(TOOLS.map(t => [t.slug, t]));
for (const l of LIVE) {
  const rel = l.related.map(s => { if (!bySlug[s]) throw new Error(`Fiche inconnue dans ${l.slug} : ${s}`); return bySlug[s]; });
  const trail = [['/', 'Accueil'], [null, l.short]];
  const body = `${crumbs(trail)}
<header class="hero wrap">
  <span class="kicker">Outil gratuit · sans compte · hors ligne</span>
  <h1>${esc(l.h1)}</h1>
  <p class="lede">${esc(l.lede)}</p>
  <div class="hero-cta"><a class="btn btn-primary btn-lg" href="/${l.app}">${esc(l.cta)}</a><a class="btn btn-ghost btn-lg" href="/outils/">Voir les ${TOOLS.length} fiches</a></div>
</header>
<section class="block"><div class="wrap">
  <div class="block-head"><h2>Comment ça marche</h2></div>
  <ol class="howto">${l.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
</div></section>
<section class="block" style="padding-top:0"><div class="wrap">
  <div class="block-head"><h2>Pensé pour l'animation</h2></div>
  <div class="feature-grid">${l.features.map(([h, p]) => `<div class="feature"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
</div></section>
<section class="block" style="padding-top:0"><div class="wrap">
  <div class="block-head"><h2>Questions fréquentes</h2></div>
  <div class="faq">${l.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</div></section>
<section class="block" style="background:var(--cream-dark)"><div class="wrap">
  <div class="block-head"><h2>Des fiches pour aller avec</h2><div class="chips">${LIVE.filter(o => o !== l).map(o => `<a class="chip" href="${o.url}">${esc(o.short)}</a>`).join('')}</div></div>
  <div class="cards">${rel.map(card).join('')}</div>
</div></section>
<div class="wrap"><div class="band"><div><h2>${esc(l.cta)} maintenant</h2><p>Gratuit, sans inscription, et ça marche même hors ligne.</p></div><a class="btn btn-primary btn-lg" href="/${l.app}">${esc(l.cta)}</a></div></div>`;
  const appLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${l.short} · ${BRAND}`, url: SITE + l.url,
    description: l.description, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', inLanguage: 'fr-FR',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } };
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: l.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  write(l.url, page({ path: l.url, current: l.url, title: `${l.title} | ${BRAND}`, description: l.description,
    image: `/assets/og/${l.slug}.png`, body, jsonld: [appLd, faqLd, crumbsLd(trail)] }));
}

// ── Sitemap ──
const urls = ['/', ...written];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod><priority>${u === '/' ? '1.0' : u === '/outils/' ? '0.9' : LIVE.some(l => l.url === u) ? '0.8' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`);
console.log(`${written.length} pages générées, sitemap : ${urls.length} adresses.`);
