// Werkplekinspectie — tests/methode.js: BEWAAKT DE METHODEREGELS (WPI "momentopname", VCA 2026/6.1 eis 7.1/7.2).
// De andere scenariotests (e2e, meld, plan, mont, kw) laten vooral zien wat er gebeurt; deze test
// faalt (exitcode 1, "errs [...]" niet leeg) zodra een van deze regels gebroken wordt:
//
//  M1  Het oordeel (C/A/V/NVT) kiest ALTIJD de inspecteur; de AI oordeelt nooit. De AI-koppeling wordt
//      hier nagebootst met een "brutale" AI die óók een oordeel teruggeeft: dat mag nergens landen. Na
//      de koppeling is niets voorgekozen, het scherm wacht op de inspecteur, en in de prompts staat
//      dat de AI geen oordeel geeft.
//  M2  AI-voorstellen heten "Voorstel" en gelden pas na bevestiging: de TRA-koppeling wordt pas gezet
//      als de inspecteur hem aantikt; de actietekst draagt het label Voorstel en er ontstaat pas een
//      actie (status "Voorstel", nog zonder actiehouder/toetser) na "Actievoorstel vastleggen" en het
//      vastleggen van de inspectie.
//  M3  Toetser ≠ actiehouder: bij instellen (actie-modal) en bij een nieuwe actie geweigerd met een
//      foutmelding; een (beschadigde) actie met toetser = actiehouder kan niet worden afgerond.
//  M4  De QHSE-manager is nooit actiehouder: niet te kiezen in de actie-modal en bij een nieuwe actie,
//      en een toch ingevoerde QHSE-actiehouder wordt bij instellen geweigerd. (De lokale demo heeft
//      geen QHSE-gebruiker; de test voegt er één toe aan WPI.USERS, zoals de Supabase-profielen doen.)
//  M5  Een actie is pas "Afgerond" na toetsing door de toetser: "klaar voor toetsing" maakt hem niet
//      af; de actiehouder en een ander (ook het hoofd) kunnen niet afronden, ook niet via App.akkoord();
//      "niet akkoord" vraagt een reden en zet hem terug (niet afgerond); alleen "Akkoord na toetsing"
//      door de toetser zet "Afgerond", met een logregel van de toetser.
//      Uitzondering volgens de methode: "Direct gecorrigeerd" ter plaatse = afgerond met de inspecteur
//      als toetser (hij zag het herstel) en zonder actiehouder.
//  M6  Eindcontrole op ALLE acties in de database: elke afgeronde actie heeft een toetser, toetser ≠
//      actiehouder, en een logregel van de toetser die de toetsing vastlegt; geen enkele actie heeft
//      de QHSE-manager als actiehouder.
//
//   BASE=http://localhost:8416 node /home/user/Werkplekinspectie.nl/webapp/tests/methode.js
//
// Eindigt met "errs [...]" (leeg = alle regels gehouden). Schermafbeeldingen in de huidige map.
"use strict";
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8140";
const errs = [];
const ok = (cond, wat) => { if (!cond) errs.push("METHODE: " + wat); console.log((cond ? "  ok    " : "  FOUT  ") + wat); };
const QHSE = { id: "u-qhse", full_name: "Quinten QHSE (test)", role: "qhse", functie: "QHSE-manager" };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
  const ev = (f, a) => p.evaluate(f, a);
  const wacht = (ms) => p.waitForTimeout(ms || 300);
  const actie = (id) => ev(async (id) => { await App.laadActies(); const a = App.acties.find((x) => x.id === id); return a ? JSON.parse(JSON.stringify(a)) : null; }, id);
  const login = async (id) => { await ev((id) => { App.closeModal(); return App.login(id); }, id); await wacht(500);
    await ev((q) => { if (!WPI.USERS.some((u) => u.id === q.id)) WPI.USERS.push(q); }, QHSE); };
  const open = async (id) => { await ev(async (id) => { App.closeModal(); await App.laadActies(); App.openActie(id); }, id); await wacht(250); };
  const knoppen = () => ev(() => [...document.querySelectorAll("#mod button")].map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  const fout = () => ev(() => (document.getElementById("ai-fout") || {}).textContent || "");
  const opties = (sel) => ev((sel) => [...document.querySelectorAll(sel + " option")].map((o) => o.value), sel);

  await p.goto(BASE + "/index.html"); await wacht(900);

  // ---------------- M1 + M2: begeleid gesprek met een AI die probeert te oordelen ----------------
  console.log("M1/M2 oordeel door de inspecteur, AI alleen Voorstel");
  await login("u-insp");
  await ev(() => {
    window.__prompts = [];
    App.caps.sample = { json: async (prompt) => {
      window.__prompts.push(prompt);
      await new Promise((r) => setTimeout(r, 50));
      if (/Koppel zijn waarneming/.test(prompt)) {
        const kand = App.kandidaten(App.state.inspectie).map((k) => k.id), id = kand.find((x) => !/^ALG-/.test(x)) || kand[0];
        return { regels: [id], vraag: "Was de hijsband afgekeurd?", oordeel: "C", conform: true };
      }
      return { actie: "Hijsband afkeuren en vervangen", oordeel: "C", status: "Afgerond", houder: "u-qhse" };
    } };
  });
  await ev(() => App.startInspectie("DAM", "P26-168", "Damwand · RWZI Voorbeeldstad")); await wacht(300);
  await p.fill("#f-taak", "ze halen de damwand eruit met de kraan"); await wacht(200);
  await p.locator("#taakvs .pick").first().click(); await wacht(300);
  await p.fill("#f-zie", "hijsband is rafelig en monteur staat onder de last"); await wacht(300);
  await p.click("text=Volgende: koppel aan de TRA"); await wacht(900);
  const k = await ev(() => { const i = App.state.inspectie; return { stap: i.stap, regel: i.cur.regel_id || null, oordeel: i.cur.oordeel, ids: i.voorstel.ids, bron: i.voorstel.bron,
    label: [...document.querySelectorAll(".vskaart .lbl.vs")].map((x) => x.textContent.trim()), picks: document.querySelectorAll(".vskaart .pick").length }; });
  ok(k.ids.length === 1 && k.bron === "Claude", "AI-koppeling gebruikt (nagebootst): " + JSON.stringify(k.ids) + " via " + k.bron);
  ok(k.label.includes("Voorstel"), "koppeling staat onder het label Voorstel (" + JSON.stringify(k.label) + ")");
  ok(k.stap === "koppel" && !k.regel, "koppeling NIET automatisch overgenomen: stap " + k.stap + ", regel " + k.regel);
  ok(k.oordeel == null, "na de AI-koppeling is er geen oordeel (" + k.oordeel + ")");
  ok(__promptsBevatGeenOordeel(await ev(() => window.__prompts)), "de koppel-prompt zegt dat de AI geen oordeel geeft");
  await p.locator(".vskaart .pick").first().click(); await wacht(600);
  const o = await ev(() => { const i = App.state.inspectie; return { stap: i.stap, regel: i.cur.regel_id, oordeel: i.cur.oordeel,
    knoppen: [...document.querySelectorAll(".seg.stapel button")].map((x) => x.className + "|" + x.getAttribute("aria-pressed")), nvt: !!document.querySelector("button.nvt") }; });
  ok(o.stap === "oordeel" && o.regel === k.ids[0], "na aantikken van het Voorstel: TRA-regel gezet, scherm 'oordeel'");
  ok(o.oordeel == null, "oordeel na koppelen nog leeg (de AI zei 'C'): " + o.oordeel);
  ok(o.knoppen.length === 3 && o.knoppen.every((x) => /\|false$/.test(x) && !/on-/.test(x)) && o.nvt, "C/A/V + NVT aangeboden, niets voorgekozen: " + o.knoppen.join(", "));
  await p.click(".seg.stapel button.t-A"); await wacht(900);
  const a1 = await ev(() => { const c = App.state.inspectie.cur; return { stap: App.state.inspectie.stap, oordeel: c.oordeel, tekst: c.actie.tekst, herkomst: c.actie.herkomst,
    label: [...document.querySelectorAll(".arij .lbl.vs")].map((x) => x.textContent.trim()), veld: (document.getElementById("f-actie") || {}).value }; });
  ok(a1.oordeel === "A", "oordeel is wat de inspecteur koos (A), niet wat de AI zei (C): " + a1.oordeel);
  ok(a1.herkomst === "Voorstel" && a1.label.includes("Voorstel") && a1.veld === "Hijsband afkeuren en vervangen", "actietekst van de AI staat als Voorstel in het veld (" + a1.herkomst + ", " + JSON.stringify(a1.label) + ")");
  ok(__promptsBevatGeenOordeel(await ev(() => window.__prompts.slice(1)), true), "de actie-prompt zegt dat de AI geen oordeel geeft");
  ok(!(await ev(async () => (await WPI.DB.getAll("acties")).some((a) => !a.demo && a.tekst === "Hijsband afkeuren en vervangen"))), "vóór bevestigen bestaat er nog geen actie");
  await p.click("text=Actievoorstel vastleggen"); await wacht(300);
  // tweede waarneming: direct gecorrigeerd ter plaatse (toegestane uitzondering in M5/M6)
  await ev(() => { App.caps.sample = null; });
  await p.click("text=Ja, volgende waarneming").catch(() => {}); await wacht(300);
  const verder = await ev(() => App.state.inspectie.stap);
  if (verder === "zie") {
    await p.fill("#f-zie", "afzetting bij de bouwput stond open, ploeg heeft hem direct dichtgezet"); await wacht(300);
    await p.click("text=Volgende: koppel aan de TRA"); await wacht(700);
    await p.locator(".zelfkies summary").click(); await wacht(200);
    await p.locator(".zlijst .zpick").first().click(); await wacht(400);
    await p.click(".seg.stapel button.t-V"); await wacht(700);
    await ev(() => { App.state.inspectie.cur.actie.tekst = "Afzetting rond de bouwput dicht houden"; App.state.inspectie.cur.actie.herkomst = "Jij"; App.zetActie("terPlaatse", "gecorrigeerd"); }); await wacht(300);
    await p.click("text=Actievoorstel vastleggen"); await wacht(300);
  } else ok(false, "tweede waarneming starten lukte niet (stap " + verder + ")");
  await ev(() => App.stap("klaar")); await wacht(300);
  await ev(() => App.bewaarInspectie(true)); await wacht(800);
  const na = await ev(async () => { const ins = await WPI.DB.getAll("inspecties"), ac = await WPI.DB.getAll("acties");
    return { w: ins.length ? ins[ins.length - 1].waarnemingen.map((w) => w.oordeel) : [], acties: ac.filter((a) => !a.demo).map((a) => ({ id: a.id, tekst: a.tekst, status: a.status, houder: a.houder, toetser: a.toetser, log: a.log })) }; });
  ok(JSON.stringify(na.w) === '["A","V"]', "in de vastgelegde inspectie staan de oordelen van de inspecteur: " + JSON.stringify(na.w));
  const vs = na.acties.find((a) => a.tekst === "Hijsband afkeuren en vervangen");
  ok(vs && vs.status === "Voorstel" && !vs.houder && !vs.toetser, "AI-actietekst werd een actie met status Voorstel, zonder actiehouder/toetser: " + JSON.stringify(vs && { status: vs.status, houder: vs.houder, toetser: vs.toetser }));
  const gc = na.acties.find((a) => a.tekst === "Afzetting rond de bouwput dicht houden");
  ok(gc && gc.status === "Afgerond" && gc.toetser === "u-insp" && !gc.houder, "direct gecorrigeerd: afgerond met de inspecteur als toetser, zonder actiehouder: " + JSON.stringify(gc && { status: gc.status, houder: gc.houder, toetser: gc.toetser }));
  const id = vs ? vs.id : null;
  if (!id) { console.log("errs", errs); await b.close(); process.exit(1); }

  // ---------------- M3 + M4: instellen ----------------
  console.log("M3/M4 instellen: toetser ≠ actiehouder, QHSE-manager nooit actiehouder");
  await login("u-winfred");
  await open(id);
  const oh = await opties("#ai-houder"), ot = await opties("#ai-toetser");
  ok(oh.length > 2 && !oh.includes(QHSE.id), "actie-modal: QHSE-manager niet te kiezen als actiehouder (" + oh.join(",") + ")");
  ok(ot.length > 2, "actie-modal: toetserlijst gevuld (" + ot.join(",") + ")");
  // QHSE toch als actiehouder (bijv. via aangepaste HTML of oude lijst) → geweigerd
  await ev((q) => { const s = document.getElementById("ai-houder"); const o = document.createElement("option"); o.value = q.id; o.textContent = q.full_name; s.appendChild(o); s.value = q.id; }, QHSE);
  await p.selectOption("#ai-toetser", "u-winfred");
  await p.click("text=Actie instellen"); await wacht(300);
  ok((await fout()).length > 0, "QHSE-manager als actiehouder geweigerd met melding: '" + (await fout()) + "'");
  ok((await actie(id)).status === "Voorstel", "na weigering QHSE: status nog Voorstel");
  await open(id);
  await p.selectOption("#ai-houder", "u-douwe"); await p.selectOption("#ai-toetser", "u-douwe");
  await p.click("text=Actie instellen"); await wacht(300);
  ok((await fout()).length > 0, "toetser = actiehouder geweigerd met melding: '" + (await fout()) + "'");
  ok((await actie(id)).status === "Voorstel", "na weigering toetser=actiehouder: status nog Voorstel");
  await p.selectOption("#ai-toetser", "u-winfred"); await p.click("text=Actie instellen"); await wacht(400);
  let a = await actie(id);
  ok(a.status === "Open" && a.houder === "u-douwe" && a.toetser === "u-winfred", "geldig ingesteld: Open, actiehouder Douwe, toetser Winfred (" + a.status + ")");
  // nieuwe actie (telefoon)
  await ev(() => { App.closeModal(); App.nieuweActie(); }); await wacht(250);
  const nh = await opties("#ai-houder");
  ok(nh.length > 2 && !nh.includes(QHSE.id), "nieuwe actie: QHSE-manager niet te kiezen als actiehouder (" + nh.join(",") + ")");
  const voor = (await ev(async () => (await WPI.DB.getAll("acties")).length));
  await p.fill("#na-tekst", "Methodetest: toetser gelijk aan actiehouder");
  await p.selectOption("#ai-houder", "u-douwe"); await p.selectOption("#ai-toetser", "u-douwe");
  await p.click("text=Actie aanmaken"); await wacht(300);
  ok((await fout()).length > 0 && (await ev(async () => (await WPI.DB.getAll("acties")).length)) === voor, "nieuwe actie met toetser = actiehouder geweigerd, niets bewaard ('" + (await fout()) + "')");

  // ---------------- M5: alleen afgerond na toetsing door de toetser ----------------
  console.log("M5 afgerond alleen na toetsing door de toetser");
  await login("u-douwe");
  await open(id);
  let kn = await knoppen();
  ok(!kn.some((t) => /akkoord|afronden/i.test(t)), "actiehouder ziet geen knop om af te ronden (" + kn.join(" | ") + ")");
  await ev((id) => App.akkoord(id), id); await wacht(200);
  ok((await actie(id)).status === "Open", "App.akkoord() door de actiehouder verandert niets");
  await p.click("text=Klaar voor toetsing, zonder foto"); await wacht(400);
  a = await actie(id);
  ok(a.status === "Klaar voor toetsing", "klaar gemeld → 'Klaar voor toetsing', niet afgerond (" + a.status + ")");
  await open(id);
  kn = await knoppen();
  ok(!kn.some((t) => /akkoord|afronden/i.test(t)), "actiehouder kan na klaar melden nog steeds niet afronden");
  await ev((id) => App.akkoord(id), id); await wacht(200);
  ok((await actie(id)).status === "Klaar voor toetsing", "App.akkoord() door de actiehouder bij 'Klaar voor toetsing' verandert niets");
  await login("u-bjorn");
  await open(id);
  kn = await knoppen();
  ok(!kn.some((t) => /akkoord|afronden/i.test(t)), "hoofd (niet de toetser) ziet geen afrondknop");
  await ev((id) => App.akkoord(id), id); await wacht(200);
  ok((await actie(id)).status === "Klaar voor toetsing", "App.akkoord() door het hoofd (niet de toetser) verandert niets");
  await login("u-winfred");
  await open(id);
  kn = await knoppen();
  ok(kn.some((t) => /Akkoord na toetsing/.test(t)) && kn.some((t) => /Niet akkoord/.test(t)), "toetser ziet akkoord en niet akkoord");
  await p.click("text=Niet akkoord · terug naar actiehouder"); await wacht(250);
  ok((await fout()).length > 0 && (await actie(id)).status === "Klaar voor toetsing", "niet akkoord zonder reden geweigerd");
  await p.fill("#ai-reden", "Oude hijsband ligt nog in de bus"); await p.click("text=Niet akkoord · terug naar actiehouder"); await wacht(400);
  a = await actie(id);
  ok(a.status === "In uitvoering", "niet akkoord met reden → terug naar de actiehouder (" + a.status + "), niet afgerond");
  await login("u-douwe"); await open(id);
  await p.click("text=Klaar voor toetsing, zonder foto"); await wacht(400);
  await login("u-winfred"); await open(id);
  await p.click("text=Akkoord na toetsing · afronden"); await wacht(500);
  a = await actie(id);
  const laatste = a.log[a.log.length - 1] || {};
  ok(a.status === "Afgerond", "akkoord door de toetser → Afgerond (" + a.status + ")");
  ok(laatste.wie === "Winfred Loerts" && /getoetst/i.test(laatste.wat), "laatste logregel is de toetsing door de toetser: " + laatste.wie + " · " + laatste.wat);
  // beschadigde actie: toetser = actiehouder → afronden kan niet
  await ev(async () => { await App.laadActies(); const x = { id: "ACT-methode-zelf", tekst: "Methodetest: zelf getoetst", ref: "Handmatig", oordeel: "–", waarneming: "",
    status: "Klaar voor toetsing", houder: "u-winfred", toetser: "u-winfred", plandatum: WPI.plusDagen ? WPI.plusDagen(3) : null, log: [] };
    App.acties.push(x); await WPI.DB.put("acties", x); });
  await open("ACT-methode-zelf");
  await ev(() => App.akkoord("ACT-methode-zelf")); await wacht(300);
  ok((await actie("ACT-methode-zelf")).status !== "Afgerond", "actie met toetser = actiehouder kan niet worden afgerond");
  await ev(async () => { await WPI.DB.del("acties", "ACT-methode-zelf"); App.acties = App.acties.filter((a) => a.id !== "ACT-methode-zelf"); });

  // ---------------- M6: eindcontrole op alle acties ----------------
  console.log("M6 eindcontrole op alle acties in de database");
  const alle = await ev(async () => (await WPI.DB.getAll("acties")).map((a) => ({ id: a.id, status: a.status, houder: a.houder, toetser: a.toetser, log: a.log || [] })));
  const naamVan = await ev(() => Object.fromEntries(WPI.USERS.map((u) => [u.id, u.full_name])));
  const rolVan = await ev(() => Object.fromEntries(WPI.USERS.map((u) => [u.id, u.role])));
  for (const x of alle) {
    if (x.houder && rolVan[x.houder] === "qhse") ok(false, x.id + ": QHSE-manager is actiehouder");
    if (x.status !== "Afgerond" || x.id === "ACT-methode-zelf") continue;
    const toets = x.log.filter((l) => /Getoetst en akkoord|Ter plaatse gecorrigeerd en door de inspecteur gezien/.test(l.wat || ""));
    ok(!!x.toetser && x.houder !== x.toetser && toets.length > 0 && toets.every((l) => l.wie === naamVan[x.toetser]),
      x.id + " afgerond met toetsing door de toetser (" + (naamVan[x.toetser] || x.toetser) + "; houder " + (x.houder || "–") + "; log: " + x.log.map((l) => l.wie + "·" + l.wat).join(" / ").slice(0, 160) + ")");
  }
  ok(alle.filter((x) => x.status === "Afgerond").length >= 2, "eindcontrole zag minstens 2 afgeronde acties");
  await p.screenshot({ path: "methode-eind.png" });
  console.log("errs", errs);
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.log("errs", [String(e && e.stack || e).split("\n").slice(0, 3).join(" ")]); process.exit(1); });

function __promptsBevatGeenOordeel(prompts, actie) {
  const lijst = (prompts || []).filter((t) => actie ? /verbeteractie/.test(t) : /Koppel zijn waarneming/.test(t));
  return lijst.length > 0 && lijst.every((t) => /(GEEN|geen) oordeel/.test(t));
}
