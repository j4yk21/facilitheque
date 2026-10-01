// Mesure d'audience Google Analytics 4, chargée uniquement après accord (exigence CNIL).
// Partagé par l'application et les pages web. Sans identifiant valide, rien n'est chargé.
(function () {
  var GA_ID = 'G-XXXXXXXXXX'; // ← identifiant de mesure GA4 (Admin › Flux de données)
  var KEY = 'fk-consent';
  var ok = /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX';

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // Suivi d'une action : sans effet tant que GA n'est pas chargé
  window.fkTrack = function (name, params) { if (window.gtag) window.gtag('event', name, params || {}); };
  // Lien « Gérer les cookies » : efface le choix et réaffiche le bandeau
  window.fkConsentReset = function () { set(''); location.reload(); };
  if (!ok) return;

  function load() {
    if (window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function banner() {
    var css = '#fk-consent{position:fixed;right:16px;bottom:16px;z-index:2600;max-width:380px;padding:20px 20px 16px;background:#1A1A1A;color:#F5F0E8;border:1px solid rgba(255,255,255,.08);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.35);font:14px/1.5 "DM Sans",system-ui,sans-serif}' +
      '#fk-consent strong{display:block;font-family:Fraunces,Georgia,serif;font-size:17px;margin-bottom:6px}' +
      '#fk-consent p{color:rgba(245,240,232,.72);margin:0 0 14px}' +
      '#fk-consent a{color:#F5F0E8}' +
      '#fk-consent .fk-c-row{display:flex;gap:8px}' +
      '#fk-consent button{flex:1;padding:10px 14px;border-radius:40px;font:600 14px "DM Sans",system-ui,sans-serif;cursor:pointer;border:1.5px solid rgba(255,255,255,.25);background:transparent;color:#F5F0E8}' +
      '#fk-consent button.fk-c-yes{background:#C96B3A;border-color:#C96B3A;color:#fff}' +
      '#fk-consent button:focus-visible{outline:2px solid #F5F0E8;outline-offset:2px}' +
      '@media(max-width:440px){#fk-consent{left:8px;right:8px;bottom:8px;max-width:none}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement('div');
    el.id = 'fk-consent';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', "Mesure d'audience");
    el.innerHTML = "<strong>Mesure d'audience</strong>" +
      "<p>On aimerait utiliser Google Analytics pour savoir quels outils te sont utiles. Le contenu de tes ateliers n'est jamais envoyé. <a href=\"/confidentialite/\">En savoir plus</a></p>" +
      '<div class="fk-c-row"><button type="button" class="fk-c-no">Refuser</button><button type="button" class="fk-c-yes">Accepter</button></div>';
    document.body.appendChild(el);
    el.querySelector('.fk-c-no').onclick = function () { set('no'); el.remove(); };
    el.querySelector('.fk-c-yes').onclick = function () { set('yes'); el.remove(); load(); };
  }

  // Pages web : chaque lien vers l'application compte comme « open_app » (ou le nom donné par data-track)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-track], a[href="/"], a[href^="/#"]');
    if (a) window.fkTrack(a.getAttribute('data-track') || 'open_app', { label: (a.textContent || '').trim().slice(0, 60), page: location.pathname });
  });

  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner);
    else banner();
  }
})();
