// Werkplekinspectie — tests/xss.js: opgeslagen en weerspiegelde XSS.
// Typt XSS-payloads in ELK invoerveld van de app (voorbeeldmodus), slaat op, toont elk scherm dat de
// tekst laat zien opnieuw (lijsten, kaarten, rapport, modals, kwartaal, dashboard; telefoon én computer)
// en toont daarna ALLE schermen nog eens na herladen (alles uit IndexedDB/localStorage) en nog eens
// met namen/functies zoals ze uit Supabase-profielen komen (profiles.full_name en functie → USERS).
// "Alle schermen" begint telkens met het inlogscherm (accountlijst met naam en functie uit USERS).
// Na elke weergave wordt gecontroleerd:
//   - window.__xss is nooit gezet (geen enkele payload is uitgevoerd);
//   - er zijn geen geïnjecteerde handlers (onerror/onload/onmouseover/ontoggle/... met "__xss"),
//     geen invoer als actienaam (data-action) of uit de JSON van data-args gebroken, geen javascript:-links,
//     geen <script>/<iframe>/<object>/<embed> en geen <img src=x> die uit de invoer komen.
// Geïnjecteerde handlers worden daarna ook echt afgevuurd (mouseover/focus/...) als bewijs.
// Apart (GEEN XSS, telt niet als fout): invoer die ongevalideerd in een <img src> belandt. Dat is
// een invoervalidatie-kwestie (foto/handtekening), begrensd door CSP img-src; esc() voorkomt de
// uitbraak al. Wordt getoond als "VALIDATIE"; XSS_SRC_STRIKT=1 maakt er wel een fout van.
//
//   BASE=http://localhost:8417 node /home/user/Werkplekinspectie.nl/webapp/tests/xss.js     → eindigt met "errs []"
// Omgeving: XSS_PAYLOADS=1,3 (alleen deze payloads), XSS_PAR=4 (payloads tegelijk, elk in een eigen context),
// XSS_SRC_STRIKT=1 (ongevalideerde img-src ook als fout).
// Niet-tekstvelden (keuzelijsten, datums, id's, tijden: oordeel, plandatum, status, prio, …) krijgen de payloads
// rechtstreeks via IndexedDB (stap 8b, velden 28–29), ook in de lopende inspectie (concept).
// Niet gedekt (alleen met Supabase, zie tests/security.js en sync.js): l-mail, l-ww, v-mail, n-ww, n-ww2, m-code.
"use strict";
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8140";
const PAR = Math.max(1, +(process.env.XSS_PAR || 4));
const SRC_STRIKT = process.env.XSS_SRC_STRIKT === "1";

// N = veldnummer; de payload zet window.__xss = N, zodat een treffer naar het veld wijst
const PAYLOADS = [
  ["img-onerror", (N) => `<img src=x onerror=window.__xss=${N}>`],
  ["svg-onload", (N) => `"><svg onload=window.__xss=${N}>`],
  ["enkel-quote-attr", (N) => `x' onmouseover='window.__xss=${N}//`],
  ["dubbel-quote-attr", (N) => `x" onmouseover="window.__xss=${N}//`],
  ["js-string-uitbraak", (N) => `');window.__xss=${N};//`],
  ["js-dq-uitbraak", (N) => `");window.__xss=${N};//`],
  ["javascript-url", (N) => `javascript:window.__xss=${N}//`],
  ["script-tag", (N) => `</textarea><script>window.__xss=${N}</script>`],
  ["details-ontoggle", (N) => `<details open ontoggle=window.__xss=${N}>`],
  ["iframe-srcdoc", (N) => `<iframe srcdoc="<script>parent.__xss=${N}</script>">`],
  // een eigen klikactie in de pagina krijgen (de CSP houdt dit NIET tegen; alleen escaping, zie js/kern.js esc/roep)
  ["data-action-element", (N) => `"><b data-action="__xss=${N}" data-args="[1]">b</b>`],
  ["data-action-enkel-quote", (N) => `x' data-action='__xss=${N}' data-x='`],
];
const VELDEN = {
  1: "pl-project (planning)", 2: "pl-loc (planning)", 3: "pl-toel (planning)", 4: "f-taak", 5: "f-zie", 6: "f-actie",
  7: "nieuwe-monteur", 8: "f-gesprek", 9: "f-positief", 10: "na-tekst (nieuwe actie)", 11: "na-aanl (nieuwe actie)",
  12: "ai-tekst (actie instellen)", 13: "ai-reden (voorstel vervallen)", 14: "ai-reden (niet akkoord)",
  15: "zq (zoeken)", 16: "zoek (product kiezen)", 17: "bh-nieuw (beheer)", 18: "bh-hernoem (beheer)",
  19: "pl-project (2e planning, verleden)", 20: "pl-loc (2e planning, verleden)",
  21: "record.handtekening (via sync)", 22: "record.waarnemingen[].foto (via sync)", 23: "record-tekstvelden (via sync)",
  24: "actie-log wie/wat (via sync)", 25: "record.monteurs (via sync)",
  26: "profiles.full_name (Supabase → USERS)", 27: "profiles.functie (Supabase → USERS)",
  28: "niet-tekstvelden via IndexedDB (oordeel, plandatum, datum, status, prio, terPlaatse, id's, tijden)",
  29: "lopende inspectie (concept): oordeel van een waarneming",
};

// ---------- in de pagina: scanner ----------
function installeer() {
  window.__xssVond = [];
  // De app zelf zet geen inline handler-attributen meer (event-delegatie met data-action, zie js/kern.js;
  // CSP script-src-attr 'none'): elk on*-attribuut met "__xss" is dus geïnjecteerd.
  const APP_HANDLERS = new Set();
  const zonderStrings = (c) => c.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  const veld = (s) => { const m = String(s).match(/__xss=(\d+)/); return m ? +m[1] : null; };
  window.__xssScan = (scherm) => {
    const uit = [], vuur = [];
    document.querySelectorAll("*").forEach((e) => {
      const tag = e.tagName.toUpperCase();
      if (["SCRIPT", "IFRAME", "OBJECT", "EMBED", "FRAME"].includes(tag) && !(tag === "SCRIPT" && e.src && !e.textContent.trim()))
        uit.push({ soort: "element <" + tag.toLowerCase() + ">", veld: veld(e.outerHTML), html: e.outerHTML.slice(0, 180) });
      if (tag === "IMG" && e.getAttribute("src") === "x") uit.push({ soort: "element <img src=x>", veld: veld(e.outerHTML), html: e.outerHTML.slice(0, 180) });
      for (const a of [...e.attributes]) {
        const n = a.name.toLowerCase(), v = a.value; if (!v.includes("__xss")) continue;
        if (n.startsWith("on")) {
          if (!APP_HANDLERS.has(n)) { uit.push({ soort: "geïnjecteerde handler " + n, veld: veld(v), html: e.outerHTML.slice(0, 180) }); vuur.push([e, n.slice(2)]); }
          else if (zonderStrings(v).includes("__xss")) uit.push({ soort: "JS-uitbraak in " + n, veld: veld(v), html: e.outerHTML.slice(0, 180) });
        } else if (/^data-(action|change|input|submit|enter|escape|mic)$/.test(n))
          // invoer mag nooit de NAAM van een actie worden (delegatie in js/kern.js roept App[naam] aan)
          uit.push({ soort: "invoer als actienaam in " + n, veld: veld(v), html: e.outerHTML.slice(0, 180) });
        else if (/^data-(\w+-)?args$/.test(n) && (() => { try { return !Array.isArray(JSON.parse(v)); } catch (x) { return true; } })())
          // data-args is altijd een JSON-array (WPI.act/op); iets anders = uit de JSON gebroken
          uit.push({ soort: "ongeldige JSON in " + n, veld: veld(v), html: e.outerHTML.slice(0, 180) });
        else if (n === "src" && ["IMG", "SOURCE", "VIDEO", "AUDIO"].includes(tag) && !/^\s*javascript:/i.test(v))
          // geen scriptuitvoering (esc() houdt de waarde in het attribuut), wel ongevalideerde invoer
          uit.push({ soort: "VALIDATIE: ongevalideerde invoer in <" + tag.toLowerCase() + " src>", validatie: true, veld: veld(v), html: e.outerHTML.slice(0, 180) });
        else if (["src", "srcdoc", "action", "formaction", "xlink:href", "data"].includes(n) || (n === "href" && /^\s*javascript:/i.test(v)))
          uit.push({ soort: "gevaarlijk attribuut " + n, veld: veld(v), html: e.outerHTML.slice(0, 180) });
      }
    });
    // bewijs: geïnjecteerde handlers echt afvuren
    for (const [e, type] of vuur) {
      try { const ev = /mouse|pointer|click/.test(type) ? new MouseEvent(type, { bubbles: true }) : new Event(type); e.dispatchEvent(ev); } catch (x) {}
    }
    uit.forEach((u) => (u.scherm = scherm));
    window.__xssVond.push(...uit);
    return uit;
  };
}

async function scenario(b, [pnaam, pf]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const log = [], pageErr = [], gevuld = new Set(), gemist = [];
  p.on("pageerror", (e) => pageErr.push(e.message));
  p.on("dialog", (d) => { log.push({ scherm: "dialog", soort: "dialoog " + d.type() + ": " + d.message().slice(0, 80) }); d.dismiss().catch(() => {}); });
  await p.addInitScript(installeer);
  const wacht = (ms) => p.waitForTimeout(ms || 350);
  const ev = (f, a) => p.evaluate(f, a);
  const P = (N) => pf(N);
  const scan = async (scherm) => {
    await wacht(250);   // img onerror/svg onload zijn asynchroon
    const x0 = await ev(() => { const x = window.__xss; delete window.__xss; return x; });
    if (x0 !== undefined) log.push({ scherm, soort: "UITGEVOERD vanzelf (bij tonen): window.__xss = " + x0, veld: +x0 });
    const vond = await ev((s) => window.__xssScan(s), scherm);   // vuurt geïnjecteerde handlers af als bewijs
    await wacht(60);
    const x1 = await ev(() => { const x = window.__xss; delete window.__xss; return x; });
    if (x1 !== undefined) log.push({ scherm, soort: "UITGEVOERD na gebruikersactie (mouseover/focus/...): window.__xss = " + x1, veld: +x1 });
    for (const v of vond) log.push(v);
  };
  const vul = async (sel, N, opts) => {
    try { await p.fill(sel, P(N), { timeout: 3000 }); gevuld.add(N); return true; }
    catch (e) { if (!(opts && opts.optioneel)) gemist.push(VELDEN[N] + " (" + sel + "): " + e.message.split("\n")[0].slice(0, 80)); return false; }
  };
  const klik = async (sel) => { await p.click(sel, { timeout: 4000 }); await wacht(); };
  const route = async (h, ms) => { await ev((h) => { App.closeModal(); if (location.hash === "#/" + h) App.route(); else App.go(h); }, h); await wacht(ms || 700); };
  const stap = async (naam, fn) => { try { await fn(); } catch (e) { gemist.push("stap " + naam + ": " + e.message.split("\n")[0].slice(0, 120)); } };

  await p.goto(BASE + "/index.html"); await wacht(900);
  await ev(() => App.login("u-coord1")); await wacht(800);

  // ===== 1. planning: twee inspecties (vandaag en gisteren = gemist) =====
  await stap("planning", async () => {
    await ev(() => App.planForm()); await wacht(250);
    await p.selectOption("#pl-code", "DAM"); await vul("#pl-project", 1); await vul("#pl-loc", 2); await vul("#pl-toel", 3);
    await p.click('.chipb:has-text("Vandaag")'); await p.selectOption("#pl-insp", "u-coord1");
    await scan("plan-modal (ingevuld)");
    await klik("#mod button.primary"); await wacht(400);
    await scan("planning (na inplannen)");
    await ev(() => App.planForm()); await wacht(250);
    await p.selectOption("#pl-code", "POM"); await vul("#pl-project", 19); await vul("#pl-loc", 20);
    await ev(() => { document.getElementById("pl-datum").value = WPI.plusDagen(-2); }); await p.selectOption("#pl-insp", "u-hoofd2");
    await klik("#mod button.primary"); await wacht(400);
    await route("planning"); await scan("planning");
    const id = await ev(() => App.planning.find((x) => !x.demo && x.code === "DAM").id);
    await ev((id) => App.planForm(id), id); await wacht(250); await scan("plan-modal (wijzigen)");
    await route("vandaag"); await scan("vandaag (gepland)");
  });

  const ids = {};
  // ===== 2. inspectie (begeleid gesprek) =====
  let planId = null;
  await stap("inspectie", async () => {
    planId = await ev(() => App.planning.find((x) => !x.demo && x.code === "DAM").id);
    await ev((id) => App.startGepland(id), planId); await wacht(500);
    await vul("#f-taak", 4); await wacht(300); await scan("ins-taak");
    await ev(() => { const t = App.data.kennisbank.DAM.regels[0].taak; App.kiesTaak(t); }); await wacht(400);
    await vul("#f-zie", 5); await wacht(300); await scan("ins-zie");
    await ev(() => App.koppel()); await wacht(900); await scan("ins-koppel");
    await ev(() => { const ins = App.state.inspectie; App.kiesRegel((ins.voorstel && ins.voorstel.ids[0]) || App.regelsVanTaak(ins)[0].id); }); await wacht(400);
    await scan("ins-oordeel");
    await klik(".seg button.t-A"); await wacht(500);
    await vul("#f-actie", 6); await wacht(200); await scan("ins-actie");
    // bij direct gevaar (bijv. spanning; js/koppel.js) vraagt de app eerst "Wat heb je ter plaatse gedaan?" (niets voorgekozen)
    if (await p.locator("#kv-tp-groep").count()) await klik('#kv-tp-groep button:has-text("Werk stilgelegd")');
    await klik("text=Actievoorstel vastleggen"); await scan("ins-meer");
    await klik("text=Nee, naar het gesprek met de monteurs");
    await vul("#nieuwe-monteur", 7); await klik('button:has-text("Toevoegen")'); await scan("ins-monteurs (na toevoegen)");
    await vul("#f-gesprek", 8); await vul("#f-positief", 9); await wacht(400);
    await ev(() => App.route()); await wacht(300); await scan("ins-monteurs (opnieuw getoond)");
    await klik("text=Naar afronden"); await scan("ins-klaar");
    await route("vandaag"); await scan("vandaag (lopende inspectie)");
    await ev((id) => App.startGepland(id), planId); await wacht(300); await scan("modal 'Er loopt nog een inspectie'");
    await ev(() => { App.closeModal(); App.goIns(); }); await wacht(400);
    await klik("text=Inspectie vastleggen"); await scan("controle-modal");
    await klik('button:has-text("Toch vastleggen")'); await wacht(500); await scan("modal 'Vastgelegd'");
  });

  // ===== 3. acties =====
  await stap("acties", async () => {
    await ev(() => { App.closeModal(); App.actFilter = "instellen"; App.go("acties"); }); await wacht(700); await scan("acties (in te stellen)");
    const nid = await ev(() => App.acties.find((a) => a.status === "Voorstel" && !a.demo).id);
    ids.nid = nid;
    await ev((id) => App.openActie(id), nid); await wacht(250); await scan("actie-modal (voorstel)");
    await vul("#ai-tekst", 12); await p.selectOption("#ai-houder", "u-coord2"); await p.selectOption("#ai-toetser", "u-coord1");
    await ev(() => { document.getElementById("ai-plan").value = WPI.plusDagen(0); });
    await klik("text=Actie instellen"); await wacht(300);
    await ev((id) => App.openActie(id), nid); await wacht(250); await scan("actie-modal (open)");
    // voorbeeldvoorstel laten vervallen met een reden
    await ev(() => { App.closeModal(); App.openActie("ACT-demo4"); }); await wacht(250);
    await p.click("#mod details summary"); await vul("#ai-reden", 13); await klik("text=Voorstel laten vervallen");
    await ev(() => App.openActie("ACT-demo4")); await wacht(250); await scan("actie-modal (vervallen, verloop)");
    // handmatige actie, plandatum in het verleden (te laat → alertbalk en Vandaag)
    await ev(() => { App.closeModal(); App.nieuweActie(); }); await wacht(250);
    await vul("#na-tekst", 10); await vul("#na-aanl", 11); await p.selectOption("#ai-houder", "u-coord2"); await p.selectOption("#ai-toetser", "u-coord1");
    await ev(() => { document.getElementById("ai-plan").value = WPI.plusDagen(-3); });
    await scan("nieuwe-actie-modal (ingevuld)");
    await klik("text=Actie aanmaken"); await wacht(400); await scan("acties (gepland)");
    const hid = await ev(() => App.acties.find((a) => a.handmatig).id);
    ids.hid = hid;
    await ev(() => { App.actFilter = "alle"; App.route(); }); await wacht(500); await scan("acties (alle)");
    await ev(() => { App.actFilter = "telaat"; App.route(); }); await wacht(500); await scan("acties (te laat) + alertbalk");
    // Douwe meldt klaar, Winfred keurt af met een reden
    await ev(() => App.login("u-coord2")); await wacht(700);
    await ev((id) => { App.go("acties"); App.openActie(id); }, hid); await wacht(400); await scan("actie-modal (actiehouder)");
    await klik("text=Klaar voor toetsing, zonder foto");
    await ev(() => App.login("u-coord1")); await wacht(700);
    await ev((id) => { App.go("acties"); App.openActie(id); }, hid); await wacht(400);
    await vul("#ai-reden", 14); await klik("text=Niet akkoord · terug naar actiehouder");
    await ev((id) => App.openActie(id), hid); await wacht(250); await scan("actie-modal (na niet akkoord, verloop)");
    await ev(() => { App.closeModal(); return App.openMeldingen(); }); await wacht(400); await scan("meldingen-modal");
    await route("vandaag"); await scan("vandaag (acties)");
  });

  // ===== 4. zoeken en product kiezen (weerspiegeld) =====
  await stap("zoeken", async () => {
    await ev(() => { App.closeModal(); return App.openSearch(); }); await wacht(250);
    await vul("#zq", 15); await wacht(200); await scan("zoeken (payload)");
    await p.fill("#zq", "__xss"); await wacht(200); await scan("zoeken (treffers uit opgeslagen inspecties)");
    await ev(() => { App.closeModal(); App.kiesProduct(); }); await wacht(250);
    await vul("#zoek", 16); await wacht(200); await scan("product kiezen");
    await ev(() => App.closeModal());
  });

  // ===== 5. overzichten en rapport =====
  await stap("overzichten", async () => {
    await route("inspecties"); await scan("inspecties");
    // (geen filter per monteur meer; filter per inspecteur blijft: de monteurnamen staan wel op de kaarten)
    const opt = await ev(() => { const s = document.querySelector("select.filtersel"); return s ? [...s.options].map((o) => o.value).find(Boolean) || null : null; });
    if (opt) { await p.selectOption("select.filtersel", opt); await wacht(500); await scan("inspecties (filter op inspecteur)"); await ev(() => { App.inspFilter = { insp: "" }; }); }
    const rid = await ev(async () => { const a = await WPI.DB.all(); return a[a.length - 1].id; });
    await ev((id) => { location.hash = "#/rapport/" + id; }, rid); await wacht(700); await scan("rapport");
    await route("planning"); await scan("planning (uitgevoerd)");
  });

  // ===== 6. computer (1440): tabellen, dashboard, kwartaal =====
  await stap("web", async () => {
    await p.setViewportSize({ width: 1440, height: 900 }); await wacht(300);
    for (const h of ["vandaag", "planning", "inspecties", "dashboard", "kwartaal"]) { await route(h); await scan(h + "@1440"); }
    await ev(() => { App.actFilter = "alle"; }); await route("acties"); await scan("acties-tabel@1440");
    const rid = await ev(async () => { const a = await WPI.DB.all(); return a[a.length - 1].id; });
    await ev((id) => { location.hash = "#/rapport/" + id; }, rid); await wacht(700); await scan("rapport@1440");
    await ev(() => App.openMeldingen()); await wacht(300); await scan("meldingen@1440");
    await ev(() => App.closeModal());
    await p.setViewportSize({ width: 390, height: 844 }); await wacht(300);
  });

  // ===== 7. beheer (hoofd) en de monteurslijst in een nieuwe inspectie =====
  await stap("beheer", async () => {
    await ev(() => App.login("u-hoofd")); await wacht(700);
    await route("beheer"); await vul("#bh-nieuw", 17); await klik('#view button:has-text("Toevoegen")'); await scan("beheer (toegevoegd)");
    await p.locator(".bhrij", { hasText: "Kees Demo" }).locator('button:has-text("Hernoemen")').click(); await wacht();
    await vul("#bh-hernoem", 18); await klik('.bhrij.bewerk button:has-text("Opslaan")'); await scan("beheer (hernoemd)");
    await ev(() => { App.startInspectie("DAM", "x", "t", true); App.state.inspectie.stap = "monteurs"; App.route(); }); await wacht(400);
    await scan("ins-monteurs (lijst uit beheer)");
    await ev(() => { App.state.inspectie = null; App.bewaarConcept(true); });
  });

  // ===== 8. records zoals ze via de synchronisatie (js/sync.js) van de server kunnen komen =====
  // Velden zonder invoerveld in de app, maar wel vrij te schrijven via de REST-API (record is jsonb):
  // handtekening, waarnemingen[].foto, monteurs, actie-log.
  await stap("sync-records", async () => {
    await ev(async (P) => {
      const w = { id: "w1", taak: "Damwand trekken", tekst: P[23], foto: P[22], regel_id: null, buiten: true, maatregelen: [P[23]], oordeel: "A",
        actie: { tekst: P[23], herkomst: "Jij", prio: "kort", terPlaatse: "niets", actie_id: "ACT-sync1" } };
      await WPI.DB.put("inspecties", { id: "WPI-sync1", versie: 3, titel: P[23], code: "DAM", project: P[23], taken: [P[23]], taak: P[23], waarnemingen: [w],
        gesprek: P[23], positief: P[23], handtekening: P[21], keuzes: [], monteurs: [P[25]], open_punten: [P[23]], inspecteur: P[23], inspecteur_id: "u-hoofd2",
        start: new Date().toISOString(), opgeslagen: new Date().toISOString() });
      await WPI.DB.put("acties", { id: "ACT-sync1", inspectie_id: "WPI-sync1", inspectie_titel: P[23], inspecteur: P[23], ref: P[23], waarneming: P[23], foto: P[22],
        oordeel: "A", tekst: P[23], prio: "kort", status: "Open", houder: "u-coord2", toetser: "u-coord1", plandatum: WPI.plusDagen(-1), log: [{ t: new Date().toISOString(), wie: P[24], wat: P[24] }] });
      App.acties = null;
    }, { 21: P(21), 22: P(22), 23: P(23), 24: P(24), 25: P(25) });
    [21, 22, 23, 24, 25].forEach((n) => gevuld.add(n));
    await ev(() => { location.hash = "#/rapport/WPI-sync1"; }); await wacht(800); await scan("rapport (sync-record)");
    await route("inspecties"); await scan("inspecties (sync-record)");
    await ev(() => { App.actFilter = "alle"; }); await route("acties"); await scan("acties (sync-record)");
    await ev(() => App.openActie("ACT-sync1")); await wacht(250); await scan("actie-modal (sync-record)");
    await ev(() => App.openMeldingen()); await wacht(300); await scan("meldingen (sync-record)");
  });

  // ===== 8b. NIET-tekstvelden (keuzelijsten, datums, id's, tijden) rechtstreeks in IndexedDB =====
  // De server en sync.js (schoon/vEnum/vDatum) laten hier alleen geldige waarden door, maar een oud,
  // gemanipuleerd of toekomstig record mag nóg niet uit een attribuut of klasse breken (verdediging in de
  // diepte; aanvalstest: oordeel in class="b-…", plandatum in value="…"). Elk record heeft één of enkele
  // vreemde velden, zodat de rest van het scherm gewoon wordt opgebouwd.
  await stap("niet-tekstvelden", async () => {
    await ev(async (X) => {
      const nu = new Date().toISOString(), ww = (n, extra) => Object.assign({ id: "wnt" + n, taak: "Damwand trekken", tekst: "waarneming " + n, foto: null, regel_id: null, buiten: true,
        maatregelen: [], oordeel: "A", actie: { tekst: "actie " + n, herkomst: "Jij", prio: "kort", terPlaatse: "niets", actie_id: "ACT-nt" + n } }, extra);
      const ins = (id, ws, extra) => WPI.DB.put("inspecties", Object.assign({ id, versie: 3, titel: "Niet-tekst " + id, code: "DAM", project: "p", taken: ["Damwand trekken"], taak: "Damwand trekken",
        waarnemingen: ws, gesprek: "", positief: "", handtekening: null, keuzes: [], monteurs: [], open_punten: [], inspecteur: "Femke Fictief", inspecteur_id: "u-hoofd2", start: nu, opgeslagen: nu }, extra));
      await ins("WPI-nt1", [ww(1, { oordeel: X }), ww(2, { actie: { tekst: "a", herkomst: "Jij", prio: X, terPlaatse: X, actie_id: "ACT-nt2" } }), ww(3, { regel_id: X, buiten: false })]);
      await ins("WPI-nt2", [ww(4)], { inspecteur_id: X, plan_id: X, start: X, opgeslagen: X, versie: X });
      const act = (id, extra) => WPI.DB.put("acties", Object.assign({ id, inspectie_id: "WPI-nt1", inspectie_titel: "nt", inspecteur: "x", ref: "r", waarneming: "w", foto: null, oordeel: "A", tekst: "t " + id,
        prio: "kort", status: "Open", houder: "u-coord2", toetser: "u-coord1", plandatum: WPI.plusDagen(-1), log: [{ t: nu, wie: "u-coord2", wat: "x" }] }, extra));
      await act("ACT-nt1", { plandatum: X, oordeel: X, prio: X });
      await act("ACT-nt2", { status: X, houder: X, toetser: X });
      await act("ACT-nt3", { inspectie_id: X, log: [{ t: X, wie: X, wat: "x", status: X }], afgerond_op: X, created_at: X });
      await act("ACT-nt4", { status: "Klaar voor toetsing", plandatum: X, klaar_op: X });
      const pl = (id, extra) => WPI.DB.put("planning", Object.assign({ id, datum: WPI.plusDagen(1), code: "DAM", project: "p", locatie: "l", monteurs: 2, inspecteur: "u-coord1", toelichting: "", status: "gepland" }, extra));
      await pl("PL-nt1", { status: X, inspecteur: X, monteurs: X, inspectie_id: X });
      await pl("PL-nt2", { datum: X });
      await pl("PL-nt3", { status: "uitgevoerd", datum: WPI.plusDagen(-1), inspectie_id: X });
      await pl("PL-nt4", { monteurs: X });
      App.acties = null; App.planning = null;
    }, P(28));
    gevuld.add(28);
    await ev(() => App.login("u-hoofd")); await wacht(700);   // hoofd: ziet alles, ook "Plandatum wijzigen"
    for (const id of ["WPI-nt1", "WPI-nt2"]) { await ev((id) => { App.closeModal(); location.hash = "#/rapport/" + id; }, id); await wacht(700); await scan("rapport " + id + " (niet-tekst)"); }
    for (const h of ["inspecties", "planning", "vandaag"]) { await route(h); await scan(h + " (niet-tekst)"); }
    await ev(() => { App.actFilter = "alle"; }); await route("acties"); await scan("acties (niet-tekst)");
    for (const id of ["ACT-nt1", "ACT-nt2", "ACT-nt3", "ACT-nt4"]) {
      await ev((id) => { App.closeModal(); App.openActie(id); }, id); await wacht(250);
      await ev(() => document.querySelectorAll("#mod details").forEach((d) => { d.open = true; }));
      await scan("actie-modal " + id + " (niet-tekst)");
    }
    for (const id of ["PL-nt1", "PL-nt2", "PL-nt3", "PL-nt4"]) { await ev((id) => { App.closeModal(); App.planForm(id); }, id); await wacht(250); await scan("plan-modal " + id + " (niet-tekst)"); }
    await ev(() => { App.closeModal(); return App.openMeldingen(); }); await wacht(300); await scan("meldingen (niet-tekst)");
    await ev(() => App.closeModal());
    await p.setViewportSize({ width: 1440, height: 900 }); await wacht(300);
    for (const h of ["planning", "inspecties", "acties", "dashboard"]) { await route(h); await scan(h + "@1440 (niet-tekst)"); }
    await p.setViewportSize({ width: 390, height: 844 }); await wacht(300);
    // de lopende inspectie (concept) met een vreemd oordeel: algemene onderwerpen, "vastgelegd"-melding, afronden
    await ev((X) => {
      App.startInspectie("DAM", "x", "t", true);
      const ins = App.state.inspectie;
      ins.waarnemingen.push({ id: "wc1", taak: "Damwand trekken", tekst: "c", foto: null, extraFotos: [], regel_id: "ALG-A", onderwerp: "A", buiten: false, maatregelen: [], oordeel: X, actie: { tekst: "" } });
      ins.laatste = "wc1"; ins.stap = "algemeen"; App.route();
    }, P(29));
    gevuld.add(29); await wacht(400); await scan("ins-algemeen (concept, niet-tekst)");
    await ev(() => { App.state.inspectie.stap = "klaar"; App.route(); }); await wacht(400); await scan("ins-klaar (concept, niet-tekst)");
    await ev(() => { App.state.inspectie = null; App.bewaarConcept(true); });
    await ev(() => App.login("u-coord1")); await wacht(500);
  });

  // Alle schermen die opgeslagen tekst tonen, nog eens (telefoon én computer). Elk onderdeel apart,
  // zodat één mislukte stap de rest niet overslaat (een mislukte stap telt wel als fout).
  async function alleSchermen(tag) {
    // het inlogscherm toont de accountlijst (USERS: full_name, functie): eerst uitloggen en scannen
    await stap("alles " + tag + ": inlogscherm", async () => {
      await ev(() => { App.closeModal(); App.logout(); }); await wacht(400);
      const n = await ev(() => document.querySelectorAll("#view .listcard .row").length);
      if (!n) throw new Error("inlogscherm toont geen accounts");
      await scan("login " + tag);
    });
    await stap("alles " + tag + ": inloggen", async () => { await ev(() => { App.closeModal(); return App.login("u-coord1"); }); await wacht(700); await p.setViewportSize({ width: 390, height: 844 }); await wacht(200); });
    for (const h of ["vandaag", "planning", "inspecties"]) await stap("alles " + tag + ": " + h, async () => { await route(h); await scan(h + " " + tag); });
    await stap("alles " + tag + ": plan-modal", async () => {
      const id = await ev(() => (App.planning || []).filter((x) => !x.demo).map((x) => x.id)[0]);
      await ev((id) => App.planForm(id || undefined), id); await wacht(250); await scan("plan-modal " + tag);
    });
    for (const f of ["instellen", "alle", "telaat"]) await stap("alles " + tag + ": acties " + f, async () => { await ev((f) => { App.closeModal(); App.actFilter = f; }, f); await route("acties"); await scan("acties (" + f + ") " + tag); });
    for (const id of [ids.nid, ids.hid, "ACT-demo4", "ACT-sync1"].filter(Boolean)) await stap("alles " + tag + ": actie " + id, async () => { await ev((id) => { App.closeModal(); App.openActie(id); }, id); await wacht(250); await scan("actie-modal " + id + " " + tag); });
    await stap("alles " + tag + ": nieuwe actie", async () => { await ev(() => { App.closeModal(); App.nieuweActie(); }); await wacht(250); await scan("nieuwe-actie-modal " + tag); });
    await stap("alles " + tag + ": meldingen", async () => { await ev(() => { App.closeModal(); return App.openMeldingen(); }); await wacht(300); await scan("meldingen " + tag); });
    await stap("alles " + tag + ": account", async () => { await ev(() => { App.closeModal(); App.openAccount(); }); await wacht(200); await scan("account-modal " + tag); });
    await stap("alles " + tag + ": zoeken", async () => { await ev(() => { App.closeModal(); return App.openSearch(); }); await wacht(250); await p.fill("#zq", "__xss"); await wacht(250); await scan("zoeken " + tag); await ev(() => App.closeModal()); });
    const rids = await ev(async () => (await WPI.DB.all()).map((r) => r.id));
    for (const rid of rids) await stap("alles " + tag + ": rapport " + rid, async () => { await ev((id) => { App.closeModal(); location.hash = "#/rapport/" + id; }, rid); await wacht(700); await scan("rapport " + rid + " " + tag); });
    await stap("alles " + tag + ": computer", async () => {
      await p.setViewportSize({ width: 1440, height: 900 }); await wacht(300);
      for (const h of ["vandaag", "planning", "inspecties", "dashboard", "kwartaal"]) { await route(h); await scan(h + "@1440 " + tag); }
      await ev(() => { App.actFilter = "alle"; }); await route("acties"); await scan("acties-tabel@1440 " + tag);
      await ev((id) => { location.hash = "#/rapport/" + id; }, rids[rids.length - 1]); await wacht(700); await scan("rapport@1440 " + tag);
      await p.setViewportSize({ width: 390, height: 844 }); await wacht(300);
    });
    await stap("alles " + tag + ": beheer en monteurslijst", async () => {
      await ev(() => App.login("u-hoofd")); await wacht(700);
      await route("beheer"); await scan("beheer " + tag);
      await ev(() => { App.startInspectie("DAM", "x", "t", true); App.state.inspectie.stap = "monteurs"; App.route(); }); await wacht(400);
      await scan("ins-monteurs " + tag);
      await ev(() => { App.state.inspectie = null; App.bewaarConcept(true); App.closeModal(); });
    });
    // beheerder (inspecteert niet): Vandaag als overzicht van het team, Beheer met team en rollen
    await stap("alles " + tag + ": overzicht en team (beheerder)", async () => {
      await ev(() => { App.closeModal(); return App.login("u-beheer"); }); await wacht(700);
      await route("vandaag"); await scan("overzicht-beheerder " + tag);
      await route("beheer"); await scan("beheer-beheerder " + tag);
    });
  }

  // ===== 9. na herladen (alles uit IndexedDB/localStorage) =====
  await stap("herladen", async () => { await ev(() => App.login("u-coord1")); await wacht(400); await p.reload(); await wacht(1000); });
  await alleSchermen("(na herladen)");

  // ===== 10. namen en functies uit Supabase-profielen =====
  // auth.js zet profiles.full_name/functie (door de gebruiker zelf te wijzigen, of door een beheerder)
  // ongefilterd in WPI.USERS. In de voorbeeldmodus vullen we USERS op dezelfde manier.
  await stap("profielen", async () => {
    await ev((P) => {
      const U = WPI.USERS;
      for (const id of ["u-hoofd", "u-coord2", "u-coord1", "u-hoofd2", "u-qhse", "u-beheer"]) { const u = U.find((x) => x.id === id); if (u) { u.full_name = P[26] + " " + id; u.functie = P[27]; } }
      U.push({ id: "u-xssprof", full_name: P[26], role: "coordinator", functie: P[27] });
    }, { 26: P(26), 27: P(27) });
    gevuld.add(26); gevuld.add(27);
  });
  await alleSchermen("(Supabase-profielen)");

  await ctx.close();
  return { pnaam, log, pageErr, gevuld, gemist };
}

(async () => {
  const b = await chromium.launch();
  const keuze = process.env.XSS_PAYLOADS ? process.env.XSS_PAYLOADS.split(",").map((x) => PAYLOADS[+x - 1]).filter(Boolean) : PAYLOADS;
  const res = [], rij = keuze.slice();
  await Promise.all(Array.from({ length: Math.min(PAR, rij.length) }, async () => { while (rij.length) { const pl = rij.shift(); const t = Date.now(); const r = await scenario(b, pl); r.tijd = (Date.now() - t) / 1000; res.push(r); console.log(`  klaar: ${pl[0]} (${r.tijd.toFixed(0)} s, ${r.log.length} bevindingen)`); } }));
  await b.close();
  res.sort((a, b) => keuze.findIndex((k) => k[0] === a.pnaam) - keuze.findIndex((k) => k[0] === b.pnaam));

  const errs = [], uniek = new Map(), validatie = new Map();
  console.log("\n=== XSS-resultaat per payload ===");
  for (const r of res) {
    const alle = Object.keys(VELDEN).map(Number), niet = alle.filter((n) => !r.gevuld.has(n));
    console.log(`\n[${r.pnaam}] velden gevuld: ${r.gevuld.size}/${alle.length}${niet.length ? " · NIET gevuld: " + niet.map((n) => VELDEN[n]).join(", ") : ""}`);
    for (const g of r.gemist) { console.log("  ! " + g); errs.push(r.pnaam + ": " + g); }
    for (const e of r.pageErr) console.log("  pageerror: " + e.slice(0, 140));
    if (!r.log.some((v) => !v.validatie)) console.log("  geen injectie gevonden");
    for (const v of r.log) {
      const vn = v.veld ? VELDEN[v.veld] || "veld " + v.veld : "?";
      console.log(`  ${v.validatie ? "VAL " : "LEK "} ${v.scherm} · ${v.soort} · veld: ${vn}${v.html ? "\n       " + v.html.replace(/\s+/g, " ").slice(0, 170) : ""}`);
      const k = r.pnaam + " | " + v.soort.replace(/ = \d+$/, "") + " | " + vn;
      const doel = v.validatie && !SRC_STRIKT ? validatie : uniek;
      doel.set(k, (doel.get(k) || new Set()).add(v.scherm));
    }
  }
  console.log("\n=== Samenvatting (payload | soort | veld → schermen) ===");
  if (!uniek.size) console.log("  Geen enkele payload uitgevoerd of als HTML/handler ingevoegd.");
  for (const [k, s] of uniek) { console.log("  " + k + " → " + [...s].join("; ")); errs.push("XSS " + k); }
  console.log("\n=== Invoervalidatie (geen XSS; telt " + (SRC_STRIKT ? "WEL" : "niet") + " als fout) ===");
  if (!validatie.size) console.log("  Geen ongevalideerde invoer in <img src>.");
  for (const [k, s] of validatie) console.log("  " + k + " → " + [...s].slice(0, 6).join("; ") + (s.size > 6 ? " (+" + (s.size - 6) + ")" : ""));
  console.log("errs", errs);
  process.exit(errs.length ? 1 : 0);
})();
