// Werkplekinspectie — tests/security.js: de beveiligingsmaatregelen van de app zelf, echt uitgeprobeerd.
//
//   cd <scratch> && BASE=http://localhost:8560 node /home/user/Werkplekinspectie.nl/webapp/tests/security.js   → eindigt met "errs []"
//
// 1. CSP: de meta-CSP in index.html is strikt (script-src 'self', script-src-attr 'none', object-src 'none',
//    base-uri, geen 'unsafe-inline'/'unsafe-eval' in script-src, geen wildcard-Supabase) en de browser dwingt hem
//    echt af: een geïnjecteerd onerror-attribuut en een geïnjecteerd inline <script> worden NIET uitgevoerd
//    (securitypolicyviolation). Geen scripts van andere domeinen.
// 2. Geen inline handlers: alle schermen en vensters doorlopen (telefoon: inspecteur; computer: coördinator en
//    hoofd, incl. dashboard, rapportage, beheer, inspectie, oefenen) en na elk scherm de DOM scannen op on*-
//    attributen, inline <script>, javascript:-URL's, <iframe>/<object>/<embed>. Ook geen CSP-meldingen.
// 3. Productie: met een (nep) ingevulde config.js (page.route) is de voorbeeld-login weg en onbereikbaar:
//    geen accountkiezer, geen fictieve accounts, "wpi_user" uit localStorage genegeerd, App.login(…) en een
//    geïnjecteerde data-action="login" doen niets, hash-routes tonen alleen het inlogscherm, geen voorbeeldacties/
//    -planning/-inspecties/-cijfers, geen "Voorbeeld"/"Demo"-label, geen debuguitvoer in de console. Zelfs met een
//    vanuit de console gezette App.user: geen fictieve cijfers op dashboard/rapportage, geen voorbeeld-inspecties.
//    Voorbeeldmodus (lege config): accountkiezer met "Voorbeeld"-uitleg en een rustig "Demo"-label na het inloggen.
//    Ook: geen fictieve monteurs als terugval (lege lijst + uitleg), een concept van een vorige gebruiker kan niet
//    terug op het toestel, en geen echte (voor)namen van medewerkers in de gepubliceerde bestanden (js, css, html, json).
// 4. Uploads: SVG, PDF, een onbekend bestand, een leeg bestand en een foto van 21 MB worden geweigerd met een
//    Nederlandse melding (via de echte bestandskiezer van de na-foto en van de inspectie); een gewone foto wordt
//    een verkleinde JPEG. Invoergrenzen: tekstvelden krijgen de maxlength van de server, datumvelden min/max.
// 5. XSS: in ELK zichtbaar tekstveld van planning, nieuwe actie, actie instellen, zoeken, beheer en de inspectie
//    een payload typen (met Enter), opslaan waar dat kan en de lijsten/rapporten opnieuw tonen: niets wordt
//    uitgevoerd (window.__xss blijft leeg) en er komt geen enkel on*-attribuut of <script> in de DOM, en ook geen
//    ingespoten data-action (via " of ' ): die zou de CSP NIET tegenhouden, dus daar is escaping de enige verdediging.
//    Ook de payload als routeparameter in het adres (#/rapport/<payload> enz., 11 routes): niets uitgevoerd.
//    (tests/xss.js doet dit uitgebreider: 12 payloads × 27 bronnen, ook via de server.)
const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8560').replace(/\/+$/, '');
const errs = [];
const ok = (cond, wat) => { console.log((cond ? 'OK   ' : 'FOUT ') + wat); if (!cond) errs.push(wat); };
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
// vooraan (past ook in korte velden, zoals een monteursnaam van 80 tekens): een poging om via een enkele quote of via
// "> een eigen data-action-knop in de pagina te krijgen. De CSP houdt die NIET tegen (de klikverwerking in kern.js
// roept elke App-functie aan die in data-action staat), dus hier is escaping de enige verdediging en die toetsen we.
const PAYLOAD = (n) => `' data-action='xssActie' '"><b data-action="xssActie" data-args="[${n}]">b</b><img src=x onerror="window.__xss=${n}"><svg onload="window.__xss=${n}"></svg>'-alert(${n})-'</textarea><script>window.__xss=${n}</script>{{${n}*7}}`;
// 1×1 PNG (geldig), om een gewone foto te kiezen
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

async function pagina(b, vp, naam, opt = {}) {
  const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.__console = [];
  p.on('pageerror', (e) => errs.push(naam + ' PAGEERR ' + e.message));
  p.on('console', (m) => { p.__console.push(m.type() + ': ' + m.text()); if (m.type() === 'error' && !opt.consoleFoutMag) errs.push(naam + ' CONSOLE ' + m.text()); });
  await p.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || '')));
  });
  if (opt.init) await p.addInitScript(opt.init);
  if (opt.productie) {
    await p.route('**/js/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body:
      'window.WPI_CONFIG = Object.freeze({ supabaseUrl: "https://project-ref.supabase.co", supabaseAnonKey: "nep-publieke-testsleutel" });' }));
    await p.route('https://project-ref.supabase.co/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"nep: niet ingelogd"}' }));
  }
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(900);
  return p;
}
// DOM-scan: wat er nooit in mag staan
async function scan(p, scherm) {
  const r = await p.evaluate(() => {
    const uit = [];
    document.querySelectorAll('*').forEach((e) => {
      const tag = e.tagName;
      for (const a of e.attributes) {
        if (/^on/i.test(a.name)) uit.push('on*-attribuut ' + a.name + ' op <' + tag.toLowerCase() + '>: ' + e.outerHTML.slice(0, 120));
        if (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) uit.push('javascript:-URL in ' + a.name);
        // alleen de attributen die de klikverwerking (js/kern.js) leest; data-page e.d. zijn onschuldige tekst
        if (/^data-(action|change|input|submit|enter|escape|mic|sluit|(\w+-)?args)$/i.test(a.name) && /xssActie/.test(a.value)) uit.push('ingespoten ' + a.name + '="' + a.value + '" op <' + tag.toLowerCase() + '>');
      }
      if (tag === 'SCRIPT' && (!e.src || e.textContent.trim())) uit.push('inline <script>: ' + e.outerHTML.slice(0, 120));
      if (['IFRAME', 'OBJECT', 'EMBED', 'FRAME'].includes(tag)) uit.push('<' + tag.toLowerCase() + '>');
      if (tag === 'IMG' && e.getAttribute('src') === 'x') uit.push('<img src=x> uit invoer');
    });
    return { uit, xss: window.__xss, csp: window.__csp.slice() };
  });
  ok(!r.uit.length, `${scherm}: geen inline handlers/scripts in de DOM` + (r.uit.length ? ' → ' + r.uit.slice(0, 3).join(' | ') : ''));
  ok(r.xss === undefined, `${scherm}: niets uitgevoerd (window.__xss leeg)` + (r.xss !== undefined ? ' → ' + r.xss : ''));
  ok(!r.csp.length, `${scherm}: geen CSP-overtredingen` + (r.csp.length ? ' → ' + r.csp.slice(0, 3).join(' | ') : ''));
  return r;
}
// elk zichtbaar tekstveld vullen met een payload (input-event), invoervelden ook met Enter
async function vulAlles(p, n, metEnter = true) {
  const velden = await p.$$('input:visible, textarea:visible');
  let aantal = 0;
  for (const v of velden) {
    const t = await v.evaluate((x) => x.tagName === 'TEXTAREA' ? 'textarea' : (x.getAttribute('type') || 'text').toLowerCase());
    if (!['text', 'search', 'email', 'textarea'].includes(t)) continue;
    if (await v.evaluate((x) => x.disabled || x.readOnly)) continue;
    await v.fill(PAYLOAD(n)).catch(() => {});
    if (metEnter && t !== 'textarea') await v.press('Enter').catch(() => {});
    aantal++;
  }
  await p.waitForTimeout(200);
  return aantal;
}

(async () => {
  const b = await chromium.launch();
  const TEL = { width: 390, height: 844 }, WEB = { width: 1280, height: 900 };
  try {
    // ================= 1. CSP =================
    const ruw = await (await fetch(BASE + '/index.html')).text(), html = ruw.replace(/<!--[\s\S]*?-->/g, '');   // commentaar telt niet
    const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
    const d = Object.fromEntries(csp.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [k, ...v] = x.split(/\s+/); return [k, v.join(' ')]; }));
    ok(!!csp, 'CSP: meta-CSP aanwezig in index.html');
    ok(d['script-src'] === "'self'", "CSP: script-src is precies 'self' (" + d['script-src'] + ')');
    ok(d['script-src-elem'] === "'self'", "CSP: script-src-elem 'self'");
    ok(d['script-src-attr'] === "'none'", "CSP: script-src-attr 'none' (geen inline handlers)");
    ok(d['object-src'] === "'none'" && d['base-uri'] === "'self'" && d['form-action'] === "'self'", "CSP: object-src 'none', base-uri 'self', form-action 'self'");
    ok(!/\*/.test(d['connect-src'] || '*') && !/unsafe/.test(d['script-src'] || ''), 'CSP: connect-src zonder wildcard, script-src zonder unsafe-*');
    ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'CSP: de meta-CSP staat vóór het eerste script');
    ok(![...html.matchAll(/<script\b([^>]*)>/g)].some((m) => /src="https?:/.test(m[1]) || !/src=/.test(m[1])), 'geen inline <script> en geen scripts van andere domeinen in index.html');

    const p0 = await pagina(b, TEL, 'csp', { consoleFoutMag: true });   // de geblokkeerde proeven geven terecht CSP-fouten in de console
    const proef = await p0.evaluate(async () => {
      window.__csp = [];
      document.body.insertAdjacentHTML('beforeend', '<img id="cspimg" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onload="window.__cspProef1=1" onerror="window.__cspProef1=1">');
      const s = document.createElement('script'); s.textContent = 'window.__cspProef2 = 1'; document.body.appendChild(s);
      const a = document.createElement('a'); a.href = 'javascript:window.__cspProef3=1'; document.body.appendChild(a); a.click();
      await new Promise((r) => setTimeout(r, 400));
      const uit = { h: window.__cspProef1, s: window.__cspProef2, j: window.__cspProef3, csp: window.__csp.slice() };
      document.getElementById('cspimg').remove(); s.remove(); a.remove(); window.__csp = [];
      return uit;
    });
    ok(proef.h === undefined, 'CSP afgedwongen: geïnjecteerd onload/onerror-attribuut niet uitgevoerd');
    ok(proef.s === undefined, 'CSP afgedwongen: geïnjecteerd inline <script> niet uitgevoerd');
    ok(proef.j === undefined, 'CSP afgedwongen: javascript:-link niet uitgevoerd');
    ok(proef.csp.some((x) => /script-src-attr/.test(x)) && proef.csp.some((x) => /script-src-elem|script-src/.test(x)), 'CSP: de browser meldt de geblokkeerde pogingen (' + proef.csp.length + ' meldingen)');
    await p0.context().close();

    // ================= 3a. voorbeeldmodus: accountkiezer + Demo-label =================
    const dp = await pagina(b, TEL, 'demo');
    const dl = await dp.locator('#view').innerText();
    ok(/Kies je account/.test(dl) && /Voorbeeld/.test(dl), 'voorbeeldmodus: accountkiezer met "Voorbeeld"-uitleg');
    await scan(dp, 'inlogscherm (voorbeeld)');
    await dp.evaluate(() => App.login('u-insp')); await dp.waitForTimeout(500);
    ok(await dp.locator('#acct .demolabel').innerText().then((t) => t.trim() === 'Demo').catch(() => false), 'voorbeeldmodus: rustig "Demo"-label bovenin na het inloggen');
    ok(await dp.evaluate(() => getComputedStyle(document.querySelector('#acct .demolabel')).color === 'rgb(47, 93, 80)'), 'voorbeeldmodus: Demo-label in de groene accentkleur (geen oranje "te laat"-kleur)');

    // ================= 2 + 5. schermen doorlopen (telefoon, inspecteur) met XSS in elk tekstveld =================
    const tel = [
      ['vandaag', () => dp.evaluate(() => App.go('vandaag'))],
      ['planning', () => dp.evaluate(() => App.go('planning'))],
      ['inspecties', () => dp.evaluate(() => App.go('inspecties'))],
      ['acties', () => dp.evaluate(() => App.go('acties'))],
      ['dashboard (telefoon: alleen op de computer)', () => dp.evaluate(() => App.go('dashboard'))],
      ['oefenen', () => dp.evaluate(() => App.go('oefen'))],
      ['account', () => dp.evaluate(() => { App.go('vandaag'); App.openAccount(); })],
      ['weergave', () => dp.evaluate(() => App.openWeergave())],
      ['meldingen', () => dp.evaluate(() => { App.closeModal(); return App.openMeldingen && App.openMeldingen(); })],
    ];
    for (const [naam, f] of tel) { await f(); await dp.waitForTimeout(450); await scan(dp, 'telefoon · ' + naam); }
    await dp.evaluate(() => App.closeModal());
    // zoeken (zq): de zoekterm komt terug in "Niets gevonden voor …"
    await dp.evaluate(() => App.openSearch()); await dp.waitForTimeout(300);
    ok(await vulAlles(dp, 15) >= 1, 'zoeken: tekstveld gevuld met payload');
    await scan(dp, 'telefoon · zoeken met payload');
    await dp.evaluate(() => App.closeModal());
    // inspectie: alle tekstvelden van het gesprek, ook bij het koppelen
    await dp.evaluate(() => App.startInspectie('DAM', 'P26-168', 'Damwand · RWZI Voorbeeldstad')); await dp.waitForTimeout(400);
    await scan(dp, 'telefoon · inspectie gestart');
    await dp.fill('#f-taak', 'ze halen de damwand eruit met de kraan ' + PAYLOAD(4)); await dp.waitForTimeout(250);
    if (await dp.locator('#taakvs .pick').count()) { await dp.locator('#taakvs .pick').first().click(); await dp.waitForTimeout(300); }
    ok(await vulAlles(dp, 5, false) >= 1, 'inspectie: tekstvelden van de stap gevuld met payload');
    await scan(dp, 'telefoon · inspectie met payload');
    // invoergrens in de inspectie
    ok(await dp.evaluate(() => { const x = document.getElementById('f-zie'); if (!x) return true; x.focus(); return x.maxLength === 2000; }), 'invoergrens: "Wat zie je?" krijgt maxlength 2000 (= acties.waarneming op de server)');
    // uploadkeuring via de echte bestandskiezer van de inspectie (js/inspectie.js gebruikt de gekeurde WPI.fotoDataURL)
    if (await dp.evaluate(() => !!(App.state.inspectie && App.state.inspectie.cur))) {
      const [fc] = await Promise.all([dp.waitForEvent('filechooser', { timeout: 4000 }), dp.evaluate(() => App.addFoto())]);
      await fc.setFiles({ name: 'tekening.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="window.__xss=99"/>') });
      await dp.waitForTimeout(500);
      ok(/Foto niet toegevoegd/.test(await dp.locator('#mod').innerText()) && /Alleen foto/.test(await dp.locator('#mod').innerText()), 'upload (inspectie): SVG geweigerd met Nederlandse melding');
      ok(await dp.evaluate(() => App.fotoLijst(App.state.inspectie.cur).length === 0), 'upload (inspectie): geweigerde foto niet bij de waarneming gezet');
      await dp.evaluate(() => App.closeModal());
      const [fc2] = await Promise.all([dp.waitForEvent('filechooser', { timeout: 4000 }), dp.evaluate(() => App.addFoto())]);
      await fc2.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG }); await dp.waitForTimeout(800);
      ok(await dp.evaluate(() => { const l = App.fotoLijst(App.state.inspectie.cur); return l.length === 1 && /^data:image\/jpeg;base64,/.test(l[0]); }), 'upload (inspectie): gewone foto wordt een verkleinde JPEG');
    } else ok(false, 'upload (inspectie): geen lopende waarneming om een foto aan toe te voegen');
    await dp.evaluate(() => { App.state.inspectie = null; App.bewaarConcept(true); App.go('vandaag'); });
    await dp.context().close();

    // ================= computer: coördinator (planning, acties, uploads) =================
    const wp = await pagina(b, WEB, 'coordinator');
    await wp.evaluate(() => App.login('u-coord1')); await wp.waitForTimeout(500);
    for (const [naam, h] of [['vandaag', 'vandaag'], ['planning', 'planning'], ['inspecties', 'inspecties'], ['acties', 'acties'], ['dashboard', 'dashboard'], ['rapportage', 'kwartaal']]) {
      await wp.evaluate((x) => App.go(x), h); await wp.waitForTimeout(600); await scan(wp, 'computer · ' + naam);
    }
    // planning: alle velden met payload, opslaan, lijst opnieuw tonen
    await wp.evaluate(() => { App.go('planning'); }); await wp.waitForTimeout(300);
    await wp.evaluate(() => App.planForm()); await wp.waitForTimeout(300);
    ok(await wp.evaluate(() => { const r = {}; for (const id of ['pl-project', 'pl-loc', 'pl-toel']) { const x = document.getElementById(id); x.focus(); r[id] = x.maxLength; } return r['pl-project'] === 120 && r['pl-loc'] === 200 && r['pl-toel'] === 2000; }), 'invoergrens: planning project/locatie/toelichting = 120/200/2000 (zoals de server)');
    ok(await wp.evaluate(() => { const x = document.getElementById('pl-datum'); x.focus(); return !!x.min && !!x.max && x.min < x.value && x.max > x.value; }), 'invoergrens: plandatum krijgt min/max (2 jaar terug … 5 jaar vooruit, zoals de server)');
    ok(await vulAlles(wp, 1, false) === 3, 'planning: 3 tekstvelden gevuld met payload');
    await wp.selectOption('#pl-code', { index: 1 });
    await wp.click('#mod [data-action="bewaarPlan"]'); await wp.waitForTimeout(600);
    ok(await wp.evaluate(() => (App.planning || []).some((p) => String(p.toelichting).includes('__xss=1'))), 'planning: payload opgeslagen (letterlijk)');
    await scan(wp, 'computer · planning met payload');
    // nieuwe actie
    await wp.evaluate(() => App.go('acties')); await wp.waitForTimeout(400);
    await wp.evaluate(() => App.nieuweActie()); await wp.waitForTimeout(300);
    ok(await vulAlles(wp, 10, false) === 2, 'nieuwe actie: 2 tekstvelden gevuld met payload');
    await wp.selectOption('#ai-houder', 'u-coord2'); await wp.selectOption('#ai-toetser', 'u-hoofd');
    await wp.click('#mod [data-action="maakActie"]'); await wp.waitForTimeout(600);
    const nid = await wp.evaluate(() => ((App.acties || []).find((a) => String(a.tekst).includes('__xss=10')) || {}).id);
    ok(!!nid, 'nieuwe actie: payload opgeslagen');
    await scan(wp, 'computer · acties met payload');
    if (nid) { await wp.evaluate((id) => App.openActie(id), nid); await wp.waitForTimeout(300); await scan(wp, 'computer · actie (payload) geopend'); await wp.evaluate(() => App.closeModal()); }
    // actie instellen (voorstel): tekst + reden met payload
    const vid = await wp.evaluate(() => ((App.acties || []).find((a) => a.status === 'Voorstel') || {}).id);
    if (vid) {
      await wp.evaluate((id) => App.openActie(id), vid); await wp.waitForTimeout(300);
      ok(await vulAlles(wp, 12, false) >= 1, 'actie instellen: tekstvelden gevuld met payload');
      ok(await wp.evaluate(() => { const x = document.getElementById('ai-reden'); if (!x) return true; x.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return x.maxLength === 1800; }), 'invoergrens: reden ≤ 1800 (verloop op de server ≤ 2000)');
      await scan(wp, 'computer · actie instellen met payload');
      await wp.evaluate(() => App.closeModal());
    }
    // uploads via de bestandskiezer van de na-foto (Winfred is actiehouder van ACT-demo1, In uitvoering)
    await wp.evaluate(() => App.openActie('ACT-demo1')); await wp.waitForTimeout(300);
    const naFoto = async (bestand) => {
      await wp.evaluate(() => App.openActie('ACT-demo1')); await wp.waitForTimeout(250);
      const [fc] = await Promise.all([wp.waitForEvent('filechooser', { timeout: 4000 }), wp.click('#mod [data-action="naFoto"]')]);
      await fc.setFiles(bestand); await wp.waitForTimeout(700);
      return { mod: await wp.locator('#ov.on #mod').innerText().catch(() => ''), a: await wp.evaluate(() => { const a = App.acties.find((x) => x.id === 'ACT-demo1'); return { st: a.status, nf: a.nafoto ? String(a.nafoto).slice(0, 30) : null }; }) };
    };
    const GROOT = Buffer.alloc(21 * 1024 * 1024, 0xff);
    for (const [wat, best, re] of [
      ['SVG', { name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') }, /Alleen foto/],
      ['PDF', { name: 'rapport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 nep') }, /Alleen foto/],
      ['onbekend bestand zonder type', { name: 'virus.exe', mimeType: '', buffer: Buffer.from('MZ nep') }, /Alleen foto/],
      ['foto van 21 MB', { name: 'groot.jpg', mimeType: 'image/jpeg', buffer: GROOT }, /te groot/],
      ['leeg bestand', { name: 'leeg.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(0) }, /leeg/],
    ]) {
      const r = await naFoto(best);
      ok(/Foto niet toegevoegd/.test(r.mod) && re.test(r.mod) && r.a.st === 'In uitvoering' && !r.a.nf, `upload (na-foto): ${wat} geweigerd met melding, actie ongewijzigd`);
      await wp.evaluate(() => App.closeModal());
    }
    const goed = await naFoto({ name: 'na.png', mimeType: 'image/png', buffer: PNG });
    ok(goed.a.st === 'Klaar voor toetsing' && /^data:image\/jpeg;base64,/.test(goed.a.nf || ''), 'upload (na-foto): gewone foto geaccepteerd als JPEG, actie klaar voor toetsing');
    ok(await wp.evaluate(() => { const K = WPI.fotoKeuring, G = WPI.FOTO_GRENS; const f = (n, t, s) => K(new File([new Uint8Array(s)], n, { type: t }));
      return G.maxUpload === 5 * 1024 * 1024 && !f('a.jpg', 'image/jpeg', 10) && !f('a.heic', 'image/heic', 10) && !f('a.webp', '', 10)
        && !!f('a.gif', 'image/gif', 10) && !!f('a.html', 'text/html', 10) && !!f('a.jpg', 'image/svg+xml', 10); }), 'upload: keuring per type (jpeg/png/webp/heic ja; gif/html/svg-met-jpg-naam nee)');
    await wp.context().close();

    // ================= computer: hoofd (beheer) =================
    const hp = await pagina(b, WEB, 'hoofd');
    await hp.evaluate(() => App.login('u-hoofd')); await hp.waitForTimeout(500);
    await hp.evaluate(() => App.go('beheer')); await hp.waitForTimeout(500);
    await scan(hp, 'computer · beheer');
    ok(await hp.evaluate(() => { const x = document.getElementById('bh-nieuw'); return !!x && x.maxLength > 0 && x.maxLength <= 120; }), 'invoergrens: monteursnaam ≤ 120 (zoals de server)');
    ok(await vulAlles(hp, 17) >= 1, 'beheer: tekstvelden gevuld met payload (met Enter = toevoegen)');
    await hp.waitForTimeout(400);
    await scan(hp, 'computer · beheer met payload');
    await hp.evaluate(() => App.go('vandaag')); await hp.waitForTimeout(300);
    await hp.evaluate(() => App.openAccount()); await hp.waitForTimeout(300);
    await scan(hp, 'computer · account (hoofd)');
    await hp.evaluate(() => App.closeModal && App.closeModal());
    // weerspiegelde XSS via het adres: payload als routeparameter van elk scherm (#/rapport/<payload> enz.) en
    // routenamen die naar iets anders dan een scherm wijzen (constructor, __proto__): niets uitgevoerd of ingevoegd
    const HP = encodeURIComponent(PAYLOAD(18));
    for (const r of ['rapport/' + HP, 'acties/' + HP, 'inspecties/' + HP, 'planning/' + HP, 'dashboard/' + HP, 'kwartaal/' + HP, 'beheer/' + HP, 'oefen/' + HP, HP, 'constructor', '__proto__']) {
      await hp.evaluate((h) => { location.hash = '#/' + h; }, r); await hp.waitForTimeout(300);
      await scan(hp, 'computer · payload in het adres #/' + r.split('/')[0].slice(0, 12));
    }
    await hp.context().close();

    // ================= 3b. productie: geen voorbeeld-omwegen =================
    const pp = await pagina(b, TEL, 'productie', { productie: true, consoleFoutMag: true, init: () => { try { localStorage.setItem('wpi_user', JSON.stringify({ id: 'u-hoofd' })); } catch (e) {} } });
    const pl = await pp.locator('#view').innerText();
    ok(await pp.locator('#l-mail').count() === 1 && await pp.locator('#l-ww').count() === 1, 'productie: echt inlogscherm (e-mail + wachtwoord)');
    ok(!/Kies je account|Voorbeeld|Björn Sloos|Bram Voorbeeld|Carla Proef|Dirk Demo|Inspecteur \(demo\)/.test(pl), 'productie: geen accountkiezer, geen voorbeeldtekst, geen fictieve namen');
    ok(await pp.evaluate(() => App.user === null), 'productie: "wpi_user" uit localStorage genegeerd (niemand ingelogd)');
    ok(await pp.evaluate(() => localStorage.getItem('wpi_user') === null), 'productie: oude "wpi_user" opgeruimd');
    ok(await pp.evaluate(() => WPI.USERS.length === 0), 'productie: geen fictieve accounts in WPI.USERS');
    ok(await pp.evaluate(() => !/Voorbeeld|Demo/.test(document.getElementById('acct').innerText) && !document.querySelector('.demolabel')), 'productie: geen "Voorbeeld"- of "Demo"-label bovenin');
    await pp.evaluate(() => App.login('u-hoofd')); await pp.waitForTimeout(300);
    ok(await pp.evaluate(() => App.user === null), 'productie: App.login("u-hoofd") vanuit de console doet niets');
    await pp.evaluate(() => App.login('nep', { id: 'nep', full_name: 'Nep', role: 'hoofd', functie: '' })); await pp.waitForTimeout(300);
    ok(await pp.evaluate(() => App.user === null), 'productie: App.login(id, {role:"hoofd"}) met een verzonnen profiel doet niets');
    await pp.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="nepknop" data-action="login" data-args=\'["u-hoofd"]\'>x</button>'); document.getElementById('nepknop').click(); });
    await pp.waitForTimeout(300);
    ok(await pp.evaluate(() => App.user === null), 'productie: geïnjecteerde data-action="login" doet niets');
    for (const h of ['#/dashboard', '#/beheer', '#/acties', '#/rapport/WPI-20260505-POM-C2']) {
      await pp.evaluate((x) => { location.hash = x; }, h); await pp.waitForTimeout(250);
      ok(await pp.locator('#l-mail').count() === 1 && await pp.evaluate(() => App.user === null), 'productie: ' + h + ' toont alleen het inlogscherm');
    }
    ok(await pp.evaluate(() => App.demoActies().length === 0 && App.demoPlanning().length === 0), 'productie: geen voorbeeldacties of -planning');
    ok(await pp.evaluate(() => { const v = App.data.voorbeelddata; return v.productie === true && !v.wpis.length && !v.acties.length && !v.projecten.length && !v.programma.length && App.data.cijfers === null && v.regels.every((r) => !r.wpi && !r.oordeel && !r.datum); }), 'productie: geen fictieve inspecties, acties, projecten of cijfers in het geheugen');
    ok(await pp.evaluate(() => App.onderwerpen().length >= 9), 'productie: de catalogus met algemene onderwerpen (A–I) blijft voor de inspectie');
    ok(await pp.evaluate(() => WPI_CONFIG.debug !== true), 'productie: debug staat uit');
    // console-omweg: App.user zelf zetten (de server geeft zonder token niets; de app toont niets fictiefs)
    await pp.setViewportSize(WEB);
    await pp.evaluate(() => { App.user = { id: '00000000-0000-4000-a000-000000000001', full_name: 'Nep Hoofd', role: 'hoofd', functie: '' }; App.go('dashboard'); });
    await pp.waitForTimeout(600);
    const dash = await pp.locator('#view').innerText();
    ok(/nog met voorbeelddata/.test(dash) && !/%/.test(dash), 'productie (console-omweg): dashboard toont geen fictieve cijfers maar een melding');
    await pp.evaluate(() => App.go('kwartaal')); await pp.waitForTimeout(500);
    ok(/nog met voorbeelddata/.test(await pp.locator('#view').innerText()), 'productie (console-omweg): rapportage toont geen fictief kwartaalrapport');
    await pp.evaluate(() => App.go('inspecties')); await pp.waitForTimeout(600);
    ok(await pp.locator('.ikaart').count() === 0 && !/voorbeeld ·|WPI-2026/.test(await pp.locator('#view').innerText()), 'productie (console-omweg): geen voorbeeld-inspecties in de lijst');
    await pp.evaluate(() => App.go('acties')); await pp.waitForTimeout(600);
    ok(await pp.evaluate(async () => (await WPI.DB.getAll('acties')).every((a) => !a.demo) && (await WPI.DB.getAll('planning')).every((x) => !x.demo)), 'productie (console-omweg): geen voorbeeldacties of -planning in IndexedDB');
    // monteurs: geen fictieve namen als terugval (lege lijst + uitleg), ook niet in Beheer (console-omweg als hoofd)
    ok(await pp.evaluate(() => { try { localStorage.removeItem('wpi_monteurs'); localStorage.removeItem('wpi_monteurs_inactief'); } catch (e) {} return App.monteursLijst().length === 0; }), 'productie: monteurslijst leeg tot de server hem levert (geen Henk Voorbeeld e.d.)');
    await pp.evaluate(() => App.go('beheer')); await pp.waitForTimeout(500);
    const bh = await pp.locator('#view').innerText();
    ok(/0 actief/.test(bh) && !/Voorbeeld|Proef|Fictief|Kees Demo/.test(bh), 'productie (console-omweg): Beheer toont geen fictieve monteurs');
    await pp.setViewportSize(TEL);
    await pp.evaluate(() => { App.startInspectie('DAM', 'p', 't', true); App.state.inspectie.stap = 'monteurs'; App.go('inspectie'); App.route(); }); await pp.waitForTimeout(500);
    const im = await pp.locator('#view').innerText();
    ok(/monteurslijst is nog niet geladen/.test(im) && !/Henk Voorbeeld|Pieter Proef/.test(im), 'productie: inspectie toont "monteurslijst nog niet geladen" in plaats van fictieve namen');
    await pp.evaluate(() => { App.state.inspectie = null; });
    await pp.setViewportSize(WEB);
    // gedeeld toestel: een tabblad van een vorige gebruiker kan zijn concept niet terugzetten nadat een ander eigenaar werd
    const cr = await pp.evaluate(async () => {
      const A = '00000000-0000-4000-a000-0000000000aa', B = '00000000-0000-4000-a000-0000000000bb';
      const n0 = await App.syncAnderWerk(B);
      await App.syncEigenaar(B);
      await WPI.DB.put('concept', { id: 'lopend-' + A, ins: { titel: 'van A' }, t: new Date().toISOString() });
      const weg = !(await WPI.DB.get('concept', 'lopend-' + A));
      await App.syncEigenaar(A);
      await WPI.DB.put('concept', { id: 'lopend-' + A, ins: { titel: 'van A' }, t: new Date().toISOString() });
      const er = !!(await WPI.DB.get('concept', 'lopend-' + A));
      const n = await App.syncAnderWerk(B);
      await App.syncWisAnderen(B);
      const gewist = !(await WPI.DB.get('concept', 'lopend-' + A));
      return { weg, er, extra: n - n0, gewist, rest: await App.syncAnderWerk(B) };
    });
    ok(cr.weg && cr.er && cr.extra === 1 && cr.gewist && cr.rest === 0, 'productie: concept van een vorige gebruiker niet terug te zetten; syncWisAnderen wist het ' + JSON.stringify(cr));
    // geen echte namen in de gepubliceerde code: ook geen voornamen (ook niet als interne id zoals "u-<voornaam>"),
    // in ELK gepubliceerd bestand: alle scripts en stylesheets van index.html, index.html zelf, sw.js, manifest.json
    // en alle data/*.json (de lijst van de service worker, plus wat index.html laadt)
    const bronnen = await pp.evaluate(async () => {
      const sw = await (await fetch('sw.js')).text();
      const shell = ((sw.match(/SHELL\s*=\s*\[([\s\S]*?)\]/) || [])[1] || '').match(/["'][^"']+["']/g) || [];
      const urls = new Set(['index.html', 'sw.js', 'manifest.json', 'data/kennisbank.json', 'data/cijfers.json', 'data/trendacties.json', 'data/voorbeelddata.json',
        ...shell.map((x) => x.slice(1, -1).replace(/^\.\//, '')).filter((x) => x && x !== '/' && !/\.png$/.test(x)),
        ...[...document.scripts].filter((x) => x.src).map((x) => x.src), ...[...document.querySelectorAll('link[rel=stylesheet]')].map((x) => x.href).filter((h) => h.startsWith(location.origin))]
        .map((u) => new URL(u, location.href).pathname));
      return Promise.all([...urls].map(async (u) => { const r = await fetch(u); return [u, r.ok ? await r.text() : '']; }));
    });
    const echt = bronnen.filter(([, t]) => /\b(bj[oö]rn|winfred|douwe|sloos|loerts)\b/i.test(t)).map(([u, t]) => u + ' (' + t.match(/.{0,20}\b(bj[oö]rn|winfred|douwe|sloos|loerts)\b.{0,20}/i)[0] + ')');
    const welJs = bronnen.filter(([u, t]) => /\.js$/.test(u) && t).length, welJson = bronnen.filter(([u, t]) => /\/data\/.*\.json$/.test(u) && t).length;
    ok(welJs >= 10 && welJson >= 4 && bronnen.some(([u, t]) => /index\.html$/.test(u) && t) && !echt.length, 'gepubliceerde bestanden bevatten geen (voor)namen van medewerkers' + (echt.length ? ' → ' + echt.join(', ') : ' (' + bronnen.length + ' bestanden: ' + welJs + ' js, ' + welJson + ' data)'));
    await scan(pp, 'productie · schermen na console-omweg');
    const ruis = pp.__console.filter((m) => /^(log|debug|info|trace|table):/.test(m) || /^warning: \[sync\]/.test(m));
    ok(!ruis.length, 'productie: geen debuguitvoer in de console' + (ruis.length ? ' → ' + ruis.slice(0, 3).join(' | ') : ''));
    await pp.context().close();
  } catch (e) { errs.push('EXC ' + (e.stack || e)); }
  await b.close();
  console.log('errs', errs);
  process.exit(errs.length ? 1 : 0);
})();
