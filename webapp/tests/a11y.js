// Werkplekinspectie — tests/a11y.js: toegankelijkheidsscan met axe-core op alle hoofdschermen,
// op telefoon (390×844) en computer (1440×900). Toont de overtredingen per regel (impact, aantal,
// schermen, selectors), schrijft het volledige resultaat als JSON weg en vergelijkt met de nulmeting
// tests/a11y-baseline.json. Zo vangt run-all.js een toegankelijkheidsregressie, ook al staan er nog
// bekende (geaccepteerde) bevindingen open.
//
// Regressiepoort (ZONDER marge, in beide richtingen): per regel × scherm bewaart de nulmeting de
// selectors, genormaliseerd tot een "vorm" (:nth-child(3) → :nth-child(n), lange getallen zoals
// ACT-1731…-ids → #) met het aantal ELEMENTEN per vorm. Elk element telt, ook als meerdere elementen
// dezelfde selector hebben (de eigen controle klik-zonder-toetsenbord maakt geen unieke selectors: tien
// rijen div.row.prodrij[data-action="startInspectie"] tellen als 10, niet als 1; een interne
// controle bewaakt dat de nulmeting precies evenveel elementen telt als er gevonden zijn).
// Regressie = een regel × scherm die er nog niet was, een vorm die er nog niet was (bijv. een nieuw
// invoerveld #sab1 zonder label), of MEER elementen van een bestaande vorm (bijv. een extra klikbare rij
// zonder toetsenbordbediening). Eén nieuw element is genoeg → exitcode 1.
// Andersom ook rood: MINDER elementen dan de nulmeting ("verdwenen", bijv. na een verbetering) betekent
// dat de nulmeting te ruim is geworden en evenveel elementen ongemerkt zouden kunnen terugkomen. Dan de
// nulmeting aanscherpen (A11Y_BASELINE=bijwerken). Alleen A11Y_VERDWENEN=toestaan maakt dat bewust een
// waarschuwing.
// Om dat zonder ruis te kunnen doen, is de meting deterministisch gemaakt: de browserklok start op een
// vaste datum (A11Y_DATUM, standaard vrijdag 13-11-2026 10:00 Amsterdam; de klok loopt daarna gewoon
// door), tijdzone Europe/Amsterdam en locale nl-NL vast, en vóór elke scan wordt gewacht tot eindige
// CSS-animaties/-overgangen klaar zijn. De voorbeelddata hangen van "vandaag" af (WPI.plusDagen); met
// een vaste datum zijn agenda, te-laat-acties en kwartaal elke dag gelijk.
//
//   BASE=http://localhost:8416 node /home/user/Werkplekinspectie.nl/webapp/tests/a11y.js
//
// axe-core (vaste versie AXE_VERSIE hieronder) wordt gezocht in: AXE_PATH, node_modules naast de
// tests/repo, /tmp/claude-0/tests/node_modules. Ontbreekt hij, dan installeert het script hem zelf
// (npm install axe-core@AXE_VERSIE in AXE_DIR, standaard /tmp/claude-0/tests; niet in de repo).
// Omgeving: TESTS_OUT (map voor a11y-resultaat.json; standaard de huidige map),
//   A11Y_BASELINE=bijwerken → de nulmeting overschrijven met deze meting (na een bewuste verbetering
//     of een geaccepteerde nieuwe bevinding; commit dan ook tests/a11y-baseline.json),
//   A11Y_BASELINE=uit → niet vergelijken (alleen rapport),
//   A11Y_VERDWENEN=toestaan → verdwenen elementen (nulmeting te ruim) alleen melden, niet laten falen,
//   A11Y_STRICT=1 → daarnaast exitcode 1 bij ELKE critical/serious-overtreding (doel voor later),
//   A11Y_DATUM=2026-11-13T10:00:00+01:00 → startdatum van de browserklok ("nu" = echte klok; vergelijk
//     dan niet met de nulmeting, de voorbeelddata verschuiven met de datum).
// Eindigt met "errs [...]": regressies t.o.v. de nulmeting en fouten in de app of in de scan zelf.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://localhost:8140";
const OUT = process.env.TESTS_OUT || process.cwd();
const AXE_VERSIE = "4.14.0";
const AXE_DIR = process.env.AXE_DIR || "/tmp/claude-0/tests";
const BASELINE = process.env.A11Y_BASELINE_FILE || path.join(__dirname, "a11y-baseline.json");
const BASELINE_MODUS = process.env.A11Y_BASELINE || "vergelijk";
const DATUM = process.env.A11Y_DATUM || "2026-11-13T10:00:00+01:00";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
function zoekAxe() {
  const kand = [process.env.AXE_PATH];
  for (const basis of [__dirname, path.resolve(__dirname, "../.."), process.cwd(), AXE_DIR]) {
    try { kand.push(require.resolve("axe-core/axe.min.js", { paths: [basis] })); } catch (e) {}
  }
  kand.push(path.join(AXE_DIR, "node_modules/axe-core/axe.min.js"));
  return kand.find((f) => f && fs.existsSync(f));
}
let AXE = zoekAxe();
if (!AXE) {
  console.log("axe-core niet gevonden; installeren in " + AXE_DIR + " (npm install axe-core@" + AXE_VERSIE + ") …");
  try {
    fs.mkdirSync(AXE_DIR, { recursive: true });
    execFileSync("npm", ["install", "--no-audit", "--no-fund", "--prefix", AXE_DIR, "axe-core@" + AXE_VERSIE], { stdio: "inherit", timeout: 180000 });
  } catch (e) { console.error("Installeren mislukt: " + e.message.split("\n")[0]); }
  AXE = zoekAxe();
}
if (!AXE) { console.error("axe-core niet beschikbaar. Installeer handmatig: mkdir -p " + AXE_DIR + " && cd " + AXE_DIR + " && npm install axe-core@" + AXE_VERSIE + "  (of zet AXE_PATH)"); console.log("errs [ 'axe-core ontbreekt' ]"); process.exit(2); }
const AXE_SRC = fs.readFileSync(AXE, "utf8");

const errs = [];
const VP = { tel: { width: 390, height: 844 }, web: { width: 1440, height: 900 } };
const wacht = (p, ms) => p.waitForTimeout(ms || 400);
const ev = (p, f, a) => p.evaluate(f, a);

// Elk scherm: [naam, async (p) => klaarzetten]. De pagina is ingelogd als Winfred (coördinator) tenzij anders.
const login = (id) => async (p) => { await ev(p, (u) => { App.closeModal(); return App.login(u); }, id); await wacht(p, 700); };
const ga = (h) => async (p) => { await ev(p, (h) => { App.closeModal(); App.go(h); }, h); await wacht(p, 700); };
const EIGEN = {
  "klik-zonder-toetsenbord": "Klikbaar element (div/tr/g/span met data-action) zonder role=button en tabindex: niet met toetsenbord of schakelaar te bedienen (WCAG 2.1.1)",
  "modal-zonder-dialog-rol": "Modal heeft geen role=\"dialog\" en aria-modal=\"true\" (WCAG 4.1.2)",
  "modal-focus-niet-in-dialoog": "Bij openen van de modal gaat de focus niet naar de dialoog (WCAG 2.4.3)",
  "sluitknop-zonder-naam": "Sluitknop \"×\" heeft geen aria-label (schermlezer leest \"maal\")",
  "modal-esc-sluit-niet": "Escape sluit de modal niet (WCAG 2.1.2 / gangbaar dialoogpatroon)",
};
const SCHERMEN = [
  ["login", async (p) => { await ev(p, () => { App.closeModal(); App.logout(); }); await wacht(p, 300); }],
  ["vandaag", async (p) => { await login("u-winfred")(p); }],
  ["planning", ga("planning")],
  ["plan-modal", async (p) => { await ev(p, () => App.planForm()); await wacht(p, 250); }],
  ["inspecties", ga("inspecties")],
  ["acties", async (p) => { await ev(p, () => { App.closeModal(); App.actFilter = "alle"; App.go("acties"); }); await wacht(p, 700); }],
  ["actie-modal-voorstel", async (p) => { await ev(p, () => App.openActie("ACT-demo4")); await wacht(p, 250); }],
  ["actie-modal-open", async (p) => { await ev(p, () => { App.closeModal(); App.openActie("ACT-demo2"); }); await wacht(p, 250); }],
  ["nieuwe-actie-modal", async (p) => { await ev(p, () => { App.closeModal(); App.nieuweActie(); }); await wacht(p, 250); }],
  ["meldingen-modal", async (p) => { await ev(p, () => { App.closeModal(); return App.openMeldingen(); }); await wacht(p, 300); }],
  ["zoeken-modal", async (p) => { await ev(p, () => { App.closeModal(); return App.openSearch(); }); await p.fill("#zq", "dam"); await wacht(p, 250); }],
  ["account-modal", async (p) => { await ev(p, () => { App.closeModal(); App.openAccount(); }); await wacht(p, 200); }],
  ["weergave-modal", async (p) => { await ev(p, () => { App.closeModal(); App.openWeergave(); }); await wacht(p, 200); }],
  ["product-kiezen-modal", async (p) => { await ev(p, () => { App.closeModal(); App.kiesProduct(); }); await wacht(p, 200); }],
  ["dashboard", ga("dashboard")],
  ["kwartaal", ga("kwartaal")],
  // inspectie-stappen (begeleid gesprek)
  ["ins-taak", async (p) => { await ev(p, () => { App.closeModal(); App.startInspectie("DAM", "P26-168", "Damwand · RWZI Voorbeeldstad", true); }); await wacht(p, 500);
    await p.fill("#f-taak", "ze halen de damwand eruit met de kraan"); await wacht(p, 300); }],
  ["ins-zie", async (p) => { await ev(p, () => { const t = App.data.kennisbank.DAM.regels[0].taak; App.kiesTaak(t); }); await wacht(p, 400);
    await p.fill("#f-zie", "hijsband is rafelig en monteur staat onder de last"); await wacht(p, 300); }],
  ["ins-koppel", async (p) => { await ev(p, () => App.koppel()); await wacht(p, 900); }],
  ["ins-oordeel", async (p) => { await ev(p, () => App.kiesRegel(App.state.inspectie.voorstel.ids[0] || App.data.kennisbank.DAM.regels[0].id)); await wacht(p, 400); }],
  ["ins-actie", async (p) => { await ev(p, () => App.oordeel("A")); await wacht(p, 900); }],
  ["ins-meer", async (p) => { await ev(p, () => { if (!App.state.inspectie.cur.actie.tekst) App.state.inspectie.cur.actie.tekst = "Hijsband vervangen"; App.bevestigActie(); }); await wacht(p, 400); }],
  ["ins-algemeen", async (p) => { await ev(p, () => App.stap("algemeen")); await wacht(p, 400); }],
  ["ins-monteurs", async (p) => { await ev(p, () => App.stap("monteurs")); await wacht(p, 400); }],
  ["ins-klaar", async (p) => { await ev(p, () => App.stap("klaar")); await wacht(p, 400); }],
  ["ins-controle-modal", async (p) => { await ev(p, () => App.bewaarInspectie()); await wacht(p, 300); }],
  ["rapport", async (p) => { await ev(p, () => { App.closeModal(); return App.bewaarInspectie(true); }); await wacht(p, 600);
    await ev(p, async () => { App.closeModal(); const a = await WPI.DB.all(); location.hash = "#/rapport/" + a[a.length - 1].id; }); await wacht(p, 800); }],
  ["vandaag-zonmodus", async (p) => { await ev(p, () => { App.pref = { veld: true, zon: true }; App.pasPrefToe(); App.go("vandaag"); }); await wacht(p, 700); }],
  ["ins-zie-zonmodus", async (p) => { await ev(p, () => { App.startInspectie("DAM", "x", "Damwand test", true); App.kiesTaak(App.data.kennisbank.DAM.regels[0].taak); }); await wacht(p, 500); }],
  ["beheer", async (p) => { await ev(p, () => { App.pref = { veld: false, zon: false }; App.pasPrefToe(); App.state.inspectie = null; App.bewaarConcept(true); }); await login("u-bjorn")(p); await ga("beheer")(p); }],
];

// Eigen controles die axe niet doet: klikbare elementen zonder toetsenbordbediening en modal-semantiek.
async function eigen(p) {
  return p.evaluate(() => {
    const uit = [];
    const interactief = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "OPTION"]);
    const sel = (e) => e.id ? "#" + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + (e.getAttribute("data-action") ? '[data-action="' + e.getAttribute("data-action").replace(/"/g, "'") + '"]' : "");
    // klikbaar = data-action (event-delegatie in js/kern.js; inline onclick-attributen bestaan niet meer)
    document.querySelectorAll("[data-action]").forEach((e) => {
      if (interactief.has(e.tagName) || e.id === "ov") return;
      if (e.closest("#ov") && !document.getElementById("ov").classList.contains("on")) return;
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) return;
      if (e.getAttribute("role") === "button" && e.hasAttribute("tabindex")) return;
      uit.push({ id: "klik-zonder-toetsenbord", target: sel(e), html: e.outerHTML.slice(0, 140) });
    });
    const ov = document.getElementById("ov"), mod = document.getElementById("mod");
    if (ov.classList.contains("on")) {
      if (!mod.matches('[role="dialog"],[role="alertdialog"]') && !ov.matches('[role="dialog"]')) uit.push({ id: "modal-zonder-dialog-rol", target: "#mod", html: "geen role=dialog / aria-modal" });
      if (!mod.contains(document.activeElement)) uit.push({ id: "modal-focus-niet-in-dialoog", target: "#mod", html: "focus staat op " + (document.activeElement ? document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? "#" + document.activeElement.id : "") : "–") });
      const x = [...mod.querySelectorAll("button")].find((b) => b.textContent.trim() === "×");
      if (x && !x.getAttribute("aria-label")) uit.push({ id: "sluitknop-zonder-naam", target: '#mod button "×"', html: x.outerHTML.slice(0, 140) });
    }
    return uit;
  });
}
async function escSluit(p) {
  if (!(await p.evaluate(() => document.getElementById("ov").classList.contains("on")))) return null;
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  const dicht = await p.evaluate(() => !document.getElementById("ov").classList.contains("on"));
  return dicht;
}

// een vastgelopen stap mag de hele run niet laten hangen: na ms een fout (en door naar het volgende scherm)
const binnen = (pr, ms) => Promise.race([pr, new Promise((_, nee) => setTimeout(() => nee(new Error("time-out na " + ms / 1000 + " s")), ms))]);
async function axe(p) {
  return p.evaluate(async ({ src, tags }) => {
    // eerst eindige animaties/overgangen laten aflopen (anders meet color-contrast een tussenstand)
    const eindig = document.getAnimations().filter((a) => { try { return a.effect.getComputedTiming().endTime !== Infinity; } catch (e) { return false; } });
    await Promise.race([Promise.all(eindig.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
    if (!window.axe) (0, eval)(src);
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags,
      nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 160), summary: (n.failureSummary || "").split("\n").slice(1, 3).join(" ").trim().slice(0, 200) })) }));
  }, { src: AXE_SRC, tags: TAGS });
}

(async () => {
  const b = await chromium.launch();
  // id → { impact, help, url, n, schermen:Set, sel: Map(selector → { schermen: Map(scherm → AANTAL elementen), … }) }
  // Per selector en scherm wordt het aantal ELEMENTEN geteld, niet alleen of de selector voorkomt: twee
  // elementen met dezelfde (niet-unieke) selector, zoals rijen div.row.prodrij[data-action="…"] in de
  // productkiezer, tellen dus als 2. Zo ziet de nulmeting elk extra element (zie de kop van dit bestand).
  const regels = new Map();
  const perScherm = [];
  for (const [vpNaam, vp] of Object.entries(VP)) {
    const ctx = await b.newContext({ viewport: vp, bypassCSP: true, timezoneId: "Europe/Amsterdam", locale: "nl-NL" });
    const p = await ctx.newPage();
    if (DATUM !== "nu") await p.clock.install({ time: new Date(DATUM) });   // vaste startdatum, klok loopt door
    p.on("pageerror", (e) => errs.push(vpNaam + " PAGEERR " + e.message));
    await p.goto(BASE + "/index.html"); await wacht(p, 900);
    for (const [naam, zet] of SCHERMEN) {
      const scherm = naam + "@" + vp.width;
      if (process.env.A11Y_DEBUG) console.log("  scan " + scherm + " " + new Date().toISOString().slice(11, 19));
      try { await binnen(zet(p), 30000); } catch (e) { errs.push(scherm + " opzetten: " + e.message.split("\n")[0]); continue; }
      let v; try { v = await binnen(axe(p), 60000); } catch (e) { errs.push(scherm + " axe: " + e.message.split("\n")[0]); continue; }
      try {
        for (const x of await eigen(p)) v.push({ id: x.id, impact: x.id.startsWith("klik") ? "serious" : "moderate", help: EIGEN[x.id], helpUrl: "(eigen controle)", tags: ["eigen"], nodes: [{ target: x.target, html: x.html, summary: "" }] });
        if (/modal/.test(naam)) { const d = await escSluit(p); if (d === false) v.push({ id: "modal-esc-sluit-niet", impact: "moderate", help: EIGEN["modal-esc-sluit-niet"], helpUrl: "(eigen controle)", tags: ["eigen"], nodes: [{ target: "#ov", html: "Escape laat de modal open", summary: "" }] });
          if (d) { try { await zet(p); } catch (e) {} } }
      } catch (e) { errs.push(scherm + " eigen controles: " + e.message.split("\n")[0]); }
      const page = await ev(p, () => document.getElementById("view").dataset.page + (document.getElementById("ov").classList.contains("on") ? "+modal" : ""));
      perScherm.push({ scherm, page, n: v.reduce((t, x) => t + x.nodes.length, 0), regels: [...new Set(v.map((x) => x.id))] });
      for (const x of v) {
        const r = regels.get(x.id) || { id: x.id, impact: x.impact, help: x.help, url: x.helpUrl, tags: x.tags, n: 0, schermen: new Set(), sel: new Map(), voorbeeld: x.nodes[0] };
        r.n += x.nodes.length; r.schermen.add(scherm);
        for (const n of x.nodes) { if (!r.sel.has(n.target)) r.sel.set(n.target, { schermen: new Map(), html: n.html, summary: n.summary }); const sm = r.sel.get(n.target).schermen; sm.set(scherm, (sm.get(scherm) || 0) + 1); }
        regels.set(x.id, r);
      }
    }
    await ctx.close();
  }
  await b.close();

  const ORDE = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const lijst = [...regels.values()].sort((a, b) => (ORDE[a.impact] - ORDE[b.impact]) || b.n - a.n);
  console.log("\n=== Toegankelijkheid (axe-core " + (AXE_SRC.match(/axe v([\d.]+)/) || [, "?"])[1] + ", " + TAGS.join(", ") + ") ===");
  console.log("Schermen gescand: " + perScherm.length + "\n");
  console.log("Per scherm (aantal elementen met een overtreding):");
  for (const s of perScherm) console.log("  " + s.scherm.padEnd(30) + String(s.n).padStart(4) + "  " + (s.page || "") + (s.regels.length ? "  [" + s.regels.join(", ") + "]" : ""));
  console.log("\nPer regel (ernstigste eerst):");
  for (const r of lijst) {
    const tel = r.schermen.size, tels = [...r.schermen].filter((s) => s.endsWith("@390")).length, webs = tel - tels;
    console.log(`\n[${r.impact}] ${r.id} — ${r.help}`);
    console.log(`  ${r.n} elementen · ${tel} schermen (${tels} telefoon, ${webs} computer) · ${r.url}`);
    const sels = [...r.sel.entries()].sort((a, b) => b[1].schermen.size - a[1].schermen.size);
    for (const [sel, info] of sels.slice(0, 10)) { const tot = [...info.schermen.values()].reduce((t, n) => t + n, 0);
      console.log(`  - ${sel.slice(0, 110)}  (${tot > info.schermen.size ? tot + " elementen op " : ""}${[...info.schermen.keys()].slice(0, 4).join(", ")}${info.schermen.size > 4 ? ", +" + (info.schermen.size - 4) : ""})\n      ${info.html.replace(/\s+/g, " ").slice(0, 140)}`); }
    if (sels.length > 10) console.log(`  … en nog ${sels.length - 10} andere selectors`);
    if (r.voorbeeld && r.voorbeeld.summary) console.log(`  Waarom: ${r.voorbeeld.summary}`);
  }
  const kp = new Map();
  const cc = regels.get("color-contrast");
  if (cc) for (const [, info] of cc.sel) { const m = info.summary.match(/contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+)/); if (m) { const k = m[2] + " op " + m[3] + " (" + m[1] + ":1)"; kp.set(k, (kp.get(k) || 0) + 1); } }
  if (kp.size) { console.log("\nKleurparen met te weinig contrast (aantal selectors):"); [...kp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, n]) => console.log("  " + String(n).padStart(4) + "  " + k)); }
  const json = { datum: new Date().toISOString(), base: BASE, tags: TAGS, schermen: perScherm,
    regels: lijst.map((r) => ({ id: r.id, impact: r.impact, help: r.help, url: r.url, elementen: r.n, schermen: [...r.schermen],
      selectors: [...r.sel.entries()].map(([s, i]) => ({ selector: s, schermen: [...i.schermen.keys()], aantal: Object.fromEntries(i.schermen), html: i.html, summary: i.summary })) })) };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "a11y-resultaat.json"), JSON.stringify(json, null, 1));
  const ernstig = lijst.filter((r) => r.impact === "critical" || r.impact === "serious");
  console.log(`\nSamenvatting: ${lijst.length} regels geschonden · ${ernstig.length} critical/serious · JSON: ${path.join(OUT, "a11y-resultaat.json")}`);
  if (process.env.A11Y_STRICT === "1" && ernstig.length) errs.push(ernstig.length + " critical/serious a11y-regels: " + ernstig.map((r) => r.id).join(", "));

  // ---------- nulmeting (regressiepoort, zonder marge) ----------
  // sleutel "regel|scherm" → { impact, vormen: { vorm → aantal elementen } }. Zie de kop van dit bestand.
  const vorm = (sel) => sel.replace(/:nth-(child|of-type|last-child|last-of-type)\(\d+\)/g, ":nth-$1(n)").replace(/\d{6,}/g, "#");
  const meting = {}, perVorm = {};
  for (const r of lijst) for (const [sel, info] of r.sel) for (const [sch, aantal] of info.schermen) {
    const k = r.id + "|" + sch, v = vorm(sel);
    const m = meting[k] || (meting[k] = { impact: r.impact, vormen: {} });
    m.vormen[v] = (m.vormen[v] || 0) + aantal;
    ((perVorm[k + "|" + v]) || (perVorm[k + "|" + v] = [])).push(sel);
  }
  // controle op de telling zelf: elk gevonden element telt precies één keer mee in de nulmeting
  const telAllesM = Object.values(meting).reduce((t, m) => t + Object.values(m.vormen).reduce((u, n) => u + n, 0), 0);
  const telNodes = lijst.reduce((t, r) => t + r.n, 0);
  if (telAllesM !== telNodes) errs.push("interne fout a11y.js: nulmeting telt " + telAllesM + " elementen, gevonden " + telNodes);
  const axeVersie = (AXE_SRC.match(/axe v([\d.]+)/) || [, "?"])[1];
  const gescand = perScherm.map((s) => s.scherm);
  const telAlles = (o) => Object.values(o.vormen).reduce((t, n) => t + n, 0);
  if (BASELINE_MODUS === "bijwerken") {
    if (errs.length) { console.log("\nNulmeting NIET bijgewerkt: er zijn fouten in de scan (zie errs)."); }
    else {
      const sorteer = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
      const ov = {}; for (const k of Object.keys(meting).sort()) ov[k] = { impact: meting[k].impact, vormen: sorteer(meting[k].vormen) };
      fs.writeFileSync(BASELINE, JSON.stringify({ toelichting: "Nulmeting voor tests/a11y.js: bekende overtredingen per regel|scherm, per selector-vorm het aantal ELEMENTEN (elk element telt, ook als selectors gelijk zijn). Poort zonder marge in beide richtingen: meer elementen = regressie, minder = nulmeting te ruim (aanscherpen). Bijwerken met A11Y_BASELINE=bijwerken, alleen na een bewuste keuze.", formaat: 3, datum: new Date().toISOString().slice(0, 10), klok: DATUM, axe: axeVersie, schermen: gescand, overtredingen: ov }, null, 1) + "\n");
      console.log("\nNulmeting bijgewerkt: " + BASELINE + " (" + Object.keys(meting).length + " regel×scherm)");
    }
  } else if (BASELINE_MODUS !== "uit") {
    let base = null; try { base = JSON.parse(fs.readFileSync(BASELINE, "utf8")); } catch (e) { errs.push("nulmeting " + BASELINE + " ontbreekt of is ongeldig (maak hem met A11Y_BASELINE=bijwerken)"); }
    if (base && base.formaat !== 3) { errs.push("nulmeting heeft een oud formaat (" + base.formaat + "; formaat 2 telde elementen met dezelfde selector als één); maak hem opnieuw met A11Y_BASELINE=bijwerken"); base = null; }
    if (base) {
      if (base.axe !== axeVersie) console.log("\nLet op: nulmeting gemaakt met axe " + base.axe + ", nu " + axeVersie + " (regels kunnen verschillen)");
      if (base.klok !== DATUM) errs.push("nulmeting gemaakt met browserklok " + base.klok + ", deze meting met " + DATUM + ": niet vergelijkbaar (zet A11Y_DATUM gelijk of werk de nulmeting bij)");
      const nieuw = [], meer = [], weg = [];
      for (const [k, m] of Object.entries(meting)) {
        const b0 = base.overtredingen[k];
        if (!b0) { nieuw.push(`[${m.impact}] ${k}: ${telAlles(m)} element(en): ` + Object.keys(m.vormen).flatMap((v) => perVorm[k + "|" + v]).slice(0, 4).join(" ; ")); continue; }
        for (const [v, n] of Object.entries(m.vormen)) {
          const n0 = b0.vormen[v] || 0;
          if (n > n0) meer.push(`[${m.impact}] ${k}: ${n0 ? "meer elementen (" + n0 + "→" + n + ")" : "nieuw element (" + n + ")"} ${v}` + (perVorm[k + "|" + v].length <= 3 ? "" : ""));
        }
      }
      for (const [k, b0] of Object.entries(base.overtredingen)) {
        if (!gescand.includes(k.split("|")[1])) continue;
        const m = meting[k];
        for (const [v, n0] of Object.entries(b0.vormen)) { const n = m ? m.vormen[v] || 0 : 0; if (n < n0) weg.push(`${k}: ${v} (${n0}→${n})`); }
      }
      const missend = (base.schermen || []).filter((s) => !gescand.includes(s));
      console.log("\n=== Vergelijking met de nulmeting (" + path.basename(BASELINE) + ", " + base.datum + ", klok " + base.klok + "; poort zonder marge, beide richtingen) ===");
      console.log("  nieuw (regel × scherm): " + (nieuw.length ? "\n    " + nieuw.join("\n    ") : "geen"));
      console.log("  nieuwe of extra elementen: " + (meer.length ? "\n    " + meer.join("\n    ") : "geen"));
      console.log("  verdwenen (verbeterd of scherm veranderd): " + (weg.length ? weg.length + "\n    " + weg.slice(0, 30).join("\n    ") + (weg.length > 30 ? "\n    … +" + (weg.length - 30) : "") + "\n    → nulmeting te ruim: werk hem bij met A11Y_BASELINE=bijwerken (anders kunnen evenveel elementen ongemerkt terugkomen)" : "geen"));
      if (missend.length) { console.log("  niet gescand (opzetten mislukt?): " + missend.join(", ")); errs.push("schermen uit de nulmeting niet gescand: " + missend.join(", ")); }
      for (const x of nieuw) errs.push("a11y-regressie, nieuw: " + x.slice(0, 200));
      for (const x of meer) errs.push("a11y-regressie: " + x.slice(0, 200));
      // Verdwenen elementen laten de nulmeting ruimer dan de werkelijkheid: evenveel elementen zouden
      // ongemerkt kunnen terugkomen. Daarom ook rood (ratel): na een verbetering de nulmeting aanscherpen.
      // Alleen met A11Y_VERDWENEN=toestaan (bewust, bijv. tijdelijk tijdens parallel werk) is dit een waarschuwing.
      if (weg.length) {
        if (process.env.A11Y_VERDWENEN === "toestaan") console.log("  LET OP: " + weg.length + " verdwenen vorm(en) toegestaan (A11Y_VERDWENEN=toestaan): de poort heeft nu tijdelijk marge");
        else errs.push("a11y-nulmeting te ruim: " + weg.length + " vorm(en) met minder elementen dan de nulmeting (o.a. " + weg.slice(0, 3).join(" ; ").slice(0, 200) + "); aanscherpen met A11Y_BASELINE=bijwerken");
      }
    }
  }
  console.log("errs", errs);
  process.exit(errs.length ? 1 : 0);
})();
