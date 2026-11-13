// Werkplekinspectie — tests/koppel.js: TRA-KOPPELING EN URGENTIE BIJ DIRECT GEVAAR (js/koppel.js + js/inspectie.js)
//
//  K1  Gevaarzinnen wegen zwaarder dan losse woorden: "monteur staat onder de hangende damwandplank, hijsband
//      rafelig" geeft DAM-2.03 (vallen van de last) als eerste, als STERKE match; DAM-2.08 (damwand verschuift
//      bij loskoppelen, matchte eerder op "onder" en "damwandplank") staat niet bovenaan.
//  K2  Werkwoorden van de bouwplaats naar de taak: "ze slaan de planken erin" → Plaatsen damwand,
//      "ze trekken de damwand eruit" → Verwijderen damwand.
//  K3  Tabel met realistische zinnen over de producten in data/kennisbank.json: de verwachte regel staat in de
//      top 3 (≥ 90% moet slagen; missers worden eerlijk getoond als "  mis   …"). Ook de taak uit de
//      werkzin staat in de top 2.
//  K4  Scherm: altijd drie regels van de taak, elk met de VOLLEDIGE risicozin (niet afgekapt), aanraakdoelen
//      ≥ 56 px. Sterke match: één tik op C/A/V bevestigt de regel (de kop noemt hem). Zwakke match (één woord):
//      label "Zwakke match", C/A/V staat uit tot de inspecteur de regel zelf aantikt; de AI/trefwoorden
//      oordelen nooit en er is niets voorgekozen.
//  K5  Direct gevaar: A op DAM-2.03 ("staat onder de hangende last") → actievoorstel met prioriteit Direct (als
//      Voorstel, aan te passen) en eerst de vraag "Wat heb je ter plaatse gedaan?" (Werk stilgelegd / Direct
//      verholpen / Maatregel genomen / Nog niets), niets voorgekozen. Een gewoon risico (fysieke belasting)
//      houdt Kort/Niets gedaan. "Werk stilgelegd" blijft een open actie (Voorstel), "Direct verholpen" volgt de
//      bestaande regel (afgerond, inspecteur is toetser).
//
//   BASE=http://localhost:8872 node /home/user/Werkplekinspectie.nl/webapp/tests/koppel.js
//
// Schermafbeeldingen (390×844, dsf 2): KOPPEL_SHOTS (standaard /tmp/claude-0/koppel/shots). Eindigt met "errs [...]".
"use strict";

// ---- K3: [product, wat de monteurs doen (werkzin), verwachte taak (begin van de naam), waarneming, verwachte regel] ----
const CASES = [
  ["DAM", "ze halen de damwand eruit met de kraan", "Verwijderen damwand", "monteur staat onder de hangende damwandplank, hijsband rafelig", "DAM-2.03"],
  ["DAM", "ze slaan de planken erin", "Plaatsen damwand", "de plank zwaait heen en weer, er zit geen stuurlijn aan", "DAM-3.05"],
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "bouten zijn los maar de damwand is niet geborgd", "DAM-2.08"],
  ["DAM", "ze trekken de oude planken eruit", "Verwijderen damwand", "monteur werkt in de put zonder gasmeter", "DAM-2.07"],
  ["DAM", "ze heien de nieuwe damwand erin", "Plaatsen damwand", "jongen staat op de rand van het kanaal zonder valbeveiliging", "DAM-3.01"],
  ["DAM", "ze zetten de damwand in de geleiding", "Plaatsen damwand", "hij duwt de plank met zijn handen op zijn plek", "DAM-3.06"],
  ["DAM", "ze boren de gaten voor de beugels en plaatsen de damwand", "Plaatsen damwand", "ze boren in beton zonder stofmasker", "DAM-3.10"],
  ["DAM", "de kraan wordt opgesteld naast het kanaal", "Situatie Kraanopstelling", "kraan staat op slappe grond zonder rijplaten", "DAM-1.08"],
  ["DAM", "ze schakelen de damwand af bij de kast", "Afschakelprotocol", "hij pakt de kabel vast zonder eerst met de duspol te meten", "DAM-1.03"],
  ["POM", "ze halen de oude pomp uit de put", "Demontage van de pomp", "pomp hangt aan een gerafelde hijsband boven de put", "POM-2.02"],
  ["POM", "ze zetten de nieuwe pomp erin", "Montage van de Pomp", "zijn vingers zitten tussen de pomp en de geleidestang", "POM-3.03"],
  ["POM", "ze schakelen de pomp af", "Afschakelprotocol", "er hangt geen slot op de werkschakelaar", "POM-1.03"],
  ["POM", "ze demonteren de pomp", "Demontage van de pomp", "monteur heeft slib op zijn handen en eet een broodje", "POM-2.04"],
  ["NBT", "ze halen de ruimerbrug eraf", "Verwijderen ruimerbrug", "de brug is opgetild maar niet gestut, kan terugzakken", "NBT-4.05"],
  ["NBT", "ze bouwen de inlooptrommel in", "Monteren onderwaterwerk", "ze lassen de flenzen zonder brandblusser in de buurt", "NBT-6.11"],
  ["NBT", "we controleren of de tank schoon en droog is opgeleverd", "Controleren of nabezinktank", "monteur stapt de tank in zonder gasmeting", "NBT-1.01"],
  ["DBL", "ze leggen de beluchter te water", "Tewaterlating", "monteur staat op het drijvende platform zonder reddingsvest", "DBL-4.02"],
  ["DBL", "ze lossen de vrachtwagen en zetten de delen in elkaar", "Aankomst, lossen en assemblage", "monteur draait bouten vast onder de hangende beluchter", "DBL-3.05"],
  ["DBL", "ze halen de oude beluchter uit het water", "Demonteren bestaande drijvende", "flinke wind, de last slingert boven het water", "DBL-2.05"],
  ["ROO", "ze demonteren de roosterreiniger", "Demontage Roosterreiniger", "de hoogwerker staat op zachte grond en zakt weg", "ROO-2.05"],
  ["ROO", "ze monteren de nieuwe roosterreiniger", "Montage roosterreiniger", "ze werken met cementmortel zonder handschoenen", "ROO-3.03"],
  ["IDV", "ze draaien de vijzel in met de reductor", "Indraaireductor monteren", "monteur staat op de vijzel terwijl de reductor wordt aangesloten", "IDV-4.04"],
  ["IDV", "ze draaien de vijzel in met de reductor", "Indraaireductor monteren", "de noodstop zit achter de container, niet bereikbaar", "IDV-4.07"],
  ["IDV", "ze monteren de indraaireductor", "Indraaireductor monteren", "de V-snaar draait zonder afscherming", "IDV-4.05"],
  ["BAN", "ze bouwen de nieuwe bandscreen in", "Installatie bandscreen", "ze lassen de ankerbouten, lasrook hangt in het kanaal", "BAN-3.04"],
  ["BAN", "ze halen de oude bandscreen eruit", "Demonteren bestaande bandscreen", "zeefpanelen hebben scherpe randen en hij werkt zonder handschoenen", "BAN-2.05"],
  ["MIC", "ze plaatsen het microfilter", "Monteren Microfilter", "de trommel kan draaien terwijl ze de bouten erin zetten", "MIC-3.09"],
  // blind: geschreven nádat de woordenlijst in js/koppel.js af was en daarna niet meer op afgestemd (eerlijke controle)
  ["KET", "ze halen de kettingreiniger eruit", "Demonteren kettingreiniger", "de ketting staat nog op spanning en ze draaien de spanner los", "KET-2.04", "blind"],
  ["KET", "ze monteren de kettingreiniger", "Monteren kettingreiniger", "hij leunt over het hek van het bassin om de bout te pakken", "KET-3.01", "blind"],
  ["TRF", "ze demonteren het trommelfilter", "Demonteren van trommelfilter", "de trommel draait een stukje door als ze een bout losmaken", "TRF-2.01", "blind"],
  ["TRF", "ze monteren het trommelfilter", "Monteren van trommelfilter", "de rolsteiger in de put heeft aan één kant geen leuning", "TRF-3.02", "blind"],
  ["CHV", "ze storten beton rond de vijzel", "Betonwerkzaamheden", "monteur staat met blote handen in de natte cement", "CHV-4.02", "blind"],
  ["CHV", "ze hijsen de vijzel eruit", "Demonteren van de Compact Hydrovijzel", "iemand staat in de vijzel terwijl die nog kan draaien", "CHV-2.06", "blind"],
  ["BBL", "ze monteren de borstelbeluchter", "Monteren borstelbeluchter", "rooster ligt eruit, open gat in het dek naast de beluchter", "BBL-3.01", "blind"],
  ["LDX", "ze zetten het stromingsprofiel in het droge bassin", "Monteren stromingsprofiel", "monteur werkt op de bassinrand zonder valbeveiliging", "LDX-4.01", "blind"],
  ["SLI", "ze halen de slibindikker uit elkaar", "Demonteren (slibindikker", "hij klimt de ladder af in de tank met gereedschap in zijn hand", "SLI-2.10", "blind"],
  ["SLI", "ze monteren de nieuwe slibindikker", "Monteren (bovenlager, slibindikker", "de slibindikker raakt de wand tijdens het zakken", "SLI-3.07", "blind"],
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "geen afzetting rond het hijsgebied, collega's lopen er zo onderdoor", "DAM-2.03", "blind"],
  ["POM", "ze laten de nieuwe pomp zakken", "Montage van de Pomp", "de pomp botst tegen de putwand bij het zakken", "POM-3.05", "blind"],
  ["NBT", "ze plaatsen de nieuwe brug", "Plaatsen nieuwe ruimerbrug", "ze boren de ankergaten zonder stofmasker en zonder bril", "NBT-5.01", "blind"],
  ["ROO", "ze demonteren de roosterreiniger", "Demontage Roosterreiniger", "monteur zit in het inlaatkanaal zonder gasmeter", "ROO-2.08", "blind"],
];
if (require.main !== module) { module.exports = { CASES }; return; }

const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:8140";
const SHOTS = process.env.KOPPEL_SHOTS || "/tmp/claude-0/koppel/shots";
const errs = [];
const ok = (cond, wat, extra) => { if (!cond) errs.push("KOPPEL: " + wat + (extra !== undefined ? " · " + JSON.stringify(extra) : "")); console.log((cond ? "  ok    " : "  FOUT  ") + wat + (!cond && extra !== undefined ? " · " + JSON.stringify(extra) : "")); };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
  const ev = (f, a) => p.evaluate(f, a);
  const wacht = (ms) => p.waitForTimeout(ms || 300);
  await p.goto(BASE + "/index.html"); await wacht(900);
  // een inspecteur uit de demo-gebruikers (rollen: js/kern.js; vroeger u-insp, nu hoofd/coördinator)
  const uid = await ev(() => (WPI.USERS.find((u) => u.id === "u-insp") || WPI.USERS.find((u) => WPI.mag && WPI.mag("inspecteert", u)) || {}).id);
  await ev((id) => App.login(id), uid); await wacht(500);
  ok(await ev(() => !!App.user && (!WPI.mag || WPI.mag("inspecteert"))), "ingelogd als inspecteur (" + uid + ")");
  ok(await ev(() => !!(window.WPI && WPI.koppel && WPI.koppel.rangschik)), "js/koppel.js geladen (WPI.koppel)");

  // ---------------- K1 + K2 + K3: de rangschikking zelf ----------------
  console.log("K1–K3 rangschikking");
  const res = await ev((CASES) => {
    const kb = App.data.kennisbank, alg = App.onderwerpen();
    return CASES.map(([code, werk, taakBegin, zin, regel]) => {
      const regels = kb[code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      const taak = taken.find((t) => t.startsWith(taakBegin));
      const tv = WPI.koppel.taakRang(werk, taken, regels, [kb[code].naam]).slice(0, 2).map((x) => x.id);
      const r = WPI.koppel.rangschik(zin, { regels: regels.filter((x) => x.taak === taak), alg, generiek: [kb[code].naam, taak || ""] });
      const top3 = r.lijst.slice(0, 3).map((x) => x.id);
      return { code, werk, zin, regel, taak, taakOk: !!taak && tv.includes(taak), tv, top3, rang: top3.indexOf(regel), sterk: r.sterk, reden: r.reden };
    });
  }, CASES);
  const eerste = res[0];
  ok(eerste.top3[0] === "DAM-2.03" && eerste.sterk, "K1 hijsband-zin: DAM-2.03 eerst en sterk", eerste);
  ok(eerste.top3[0] !== "DAM-2.08", "K1 DAM-2.08 (verschuift bij loskoppelen) niet bovenaan");
  const slaan = await ev(() => { const kb = App.data.kennisbank.DAM, taken = [...new Set(kb.regels.map((r) => r.taak))];
    return { in: WPI.koppel.taakRang("ze slaan de planken erin", taken, kb.regels, [kb.naam]).map((x) => x.id),
      uit: WPI.koppel.taakRang("ze trekken de damwand eruit", taken, kb.regels, [kb.naam]).map((x) => x.id) }; });
  ok(slaan.in[0] === "Plaatsen damwand", "K2 'ze slaan de planken erin' → Plaatsen damwand", slaan.in);
  ok(slaan.uit[0] === "Verwijderen damwand", "K2 'ze trekken de damwand eruit' → Verwijderen damwand", slaan.uit);
  const goed = res.filter((x) => x.rang >= 0), taakGoed = res.filter((x) => x.taakOk);
  console.log("  tabel (" + res.length + " zinnen):");
  res.forEach((x) => console.log("  " + (x.rang >= 0 ? "ok    " : "mis   ") + x.code + " · “" + x.zin + "” → verwacht " + x.regel + (x.rang >= 0 ? " (plek " + (x.rang + 1) + (x.rang === 0 ? (x.sterk ? ", sterk" : ", zwak: " + x.reden) : "") + ")" : " · kreeg " + JSON.stringify(x.top3))
    + (x.taakOk ? "" : " · taak: verwacht " + x.taak + ", kreeg " + JSON.stringify(x.tv))));
  const pct = Math.round((goed.length / res.length) * 100), pctT = Math.round((taakGoed.length / res.length) * 100);
  console.log(`  regel in top 3: ${goed.length}/${res.length} (${pct}%) · taak in top 2: ${taakGoed.length}/${res.length} (${pctT}%)`);
  ok(res.length >= 15, "K3 tabel heeft ≥ 15 zinnen (" + res.length + ")");
  ok(pct >= 90, "K3 ≥ 90% van de zinnen heeft de verwachte regel in de top 3 (" + pct + "%)");
  ok(pctT >= 90, "K3 ≥ 90% van de werkzinnen geeft de verwachte taak in de top 2 (" + pctT + "%)");

  // ---------------- K4: het koppelscherm ----------------
  console.log("K4 koppelscherm");
  const naarKoppel = async (werk, zin) => {
    await ev(() => { App.closeModal(); App.caps.sample = null; App.startInspectie("DAM", "P26-168", "Damwand · RWZI Voorbeeldstad", true); }); await wacht(300);
    await p.fill("#f-taak", werk); await wacht(250);
    await p.locator("#taakvs .pick").first().click(); await wacht(300);
    await p.fill("#f-zie", zin); await wacht(250);
    await p.click("text=Volgende: koppel aan de TRA"); await wacht(700);
  };
  await naarKoppel("ze halen de damwand eruit met de kraan", "monteur staat onder de hangende damwandplank, hijsband rafelig");
  const k = await ev(() => {
    const vs = App.state.inspectie.voorstel, cards = [...document.querySelectorAll(".kpick")];
    return { stap: App.state.inspectie.stap, sterk: vs.sterk, ids: vs.ids, n: cards.length,
      refs: cards.map((c) => c.querySelector(".vp-ref").textContent.trim()), teksten: cards.map((c) => c.querySelector(".t").textContent.trim()),
      hoogtes: cards.map((c) => Math.round(c.getBoundingClientRect().height)), breedtes: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
      label: (document.querySelector(".kmatch") || {}).textContent || "", kop: (document.getElementById("oordeel-lab") || {}).textContent || "",
      uit: [...document.querySelectorAll(".seg.stapel button")].map((x) => x.disabled), oordeel: App.state.inspectie.cur.oordeel,
      clamp: cards.map((c) => getComputedStyle(c.querySelector(".t")).webkitLineClamp) };
  });
  const r203 = await ev(() => App.data.kennisbank.DAM.regels.find((r) => r.id === "DAM-2.03").risico);
  ok(k.stap === "koppel" && k.ids[0] === "DAM-2.03" && k.sterk === true, "K4 sterk voorstel DAM-2.03, nog niets vastgelegd", { stap: k.stap, ids: k.ids, sterk: k.sterk });
  ok(k.n === 3 && new Set(k.refs).size === 3, "K4 drie regels van de taak in beeld", k.refs);
  ok(k.teksten[0] === r203 && !k.teksten.some((t) => /…$/.test(t)), "K4 volledige risicozin, niet afgekapt", k.teksten);
  ok(k.clamp.every((c) => c === "none" || c === "" || c === "unset"), "K4 geen regelafkapping (line-clamp) op de risicozin", k.clamp);
  ok(k.hoogtes.every((h) => h >= 56) && k.breedtes.every((w) => w >= 300), "K4 aanraakdoelen ≥ 56 px hoog en schermbreed (handschoenen)", { h: k.hoogtes, w: k.breedtes });
  ok(/Sterke match/.test(k.label), "K4 label ‘Sterke match’", k.label);
  ok(/DAM-2\.03/.test(k.kop) && /Vallen van de last/.test(k.kop), "K4 oordeelkop noemt regel én risico (DAM-2.03 Vallen van de last)", k.kop);
  ok(k.uit.every((x) => !x) && k.oordeel == null, "K4 sterk: C/A/V aan, niets voorgekozen", k);
  await p.screenshot({ path: SHOTS + "/koppel-hijsband-sterk.png", fullPage: false });
  await p.screenshot({ path: SHOTS + "/koppel-hijsband-sterk-heel.png", fullPage: true });

  // zwakke match: één woord
  await naarKoppel("ze halen de damwand eruit met de kraan", "monteur staat onder de damwand");
  const z = await ev(() => { const vs = App.state.inspectie.voorstel;
    return { sterk: vs.sterk, ids: vs.ids, label: (document.querySelector(".kmatch") || {}).textContent || "", kop: (document.getElementById("oordeel-lab") || {}).textContent || "",
      uit: [...document.querySelectorAll(".seg.stapel button")].map((x) => x.disabled), n: document.querySelectorAll(".kpick").length }; });
  ok(z.sterk !== true, "K4 ‘monteur staat onder de damwand’: geen sterke match", z);
  ok(z.n === 3, "K4 zwak: toch drie regels van de taak", z.n);
  if (z.ids.length) {
    ok(/Zwakke match/.test(z.label), "K4 label ‘Zwakke match’", z.label);
    ok(z.uit.every((x) => x) && /tik eerst/i.test(z.kop), "K4 zwak: C/A/V uit tot je de regel aantikt", { uit: z.uit, kop: z.kop });
    // een (gemanipuleerde) oordeeltik bevestigt een zwakke match niet
    await ev(() => App.bevestigOordeel("A")); await wacht(300);
    const na = await ev(() => ({ stap: App.state.inspectie.stap, regel: App.state.inspectie.cur.regel_id, o: App.state.inspectie.cur.oordeel }));
    ok(na.stap === "koppel" && !na.regel && !na.o, "K4 zwak: bevestigOordeel zet geen regel en geen oordeel", na);
    await p.screenshot({ path: SHOTS + "/koppel-zwak.png" });
    await p.locator(".kpick").first().click(); await wacht(400);
    const na2 = await ev(() => ({ stap: App.state.inspectie.stap, regel: App.state.inspectie.cur.regel_id, o: App.state.inspectie.cur.oordeel }));
    ok(na2.stap === "oordeel" && na2.regel === z.ids[0] && !na2.o, "K4 zwak: tik op de regel = bevestigd, daarna kies je zelf het oordeel", na2);
  } else ok(z.label === "" || /geen/i.test(z.label), "K4 zonder aanwijzing: geen voorstel", z.label);

  // ---------------- K5: direct gevaar ----------------
  console.log("K5 direct gevaar");
  await naarKoppel("ze halen de damwand eruit met de kraan", "monteur staat onder de hangende last, hijsband rafelig");
  await p.click(".seg.stapel button.t-A"); await wacht(900);
  const a = await ev(() => { const c = App.state.inspectie.cur;
    const vr = [...document.querySelectorAll(".otitel")].map((x) => x.textContent.trim());
    return { stap: App.state.inspectie.stap, regel: c.regel_id, oordeel: c.oordeel, prio: c.actie.prio, tp: c.actie.terPlaatse, gevaar: c.actie.gevaar,
      vragen: vr, tpKnoppen: [...document.querySelectorAll("#kv-tp-groep .kvlak")].map((x) => x.textContent.replace(/\s+/g, " ").trim() + "|" + x.getAttribute("aria-pressed")),
      prioOn: (document.querySelector("[aria-labelledby=kv-prio] .kvlak.on") || {}).textContent || "", vsPrio: (document.querySelector(".kv-vs") || {}).textContent || "",
      balk: (document.querySelector(".akaart2 .gevaarbalk, .akaart2 .kgevaar") || {}).textContent || "" }; });
  ok(a.stap === "actie" && a.regel === "DAM-2.03" && a.oordeel === "A", "K5 één tik op A bevestigt DAM-2.03 (sterk) met oordeel A van de inspecteur", a);
  ok(a.prio === "direct" && /Direct/.test(a.prioOn), "K5 prioriteit staat op Direct", { prio: a.prio, on: a.prioOn });
  ok(/Voorstel/.test(a.vsPrio), "K5 prioriteit is een Voorstel (aan te passen)", a.vsPrio);
  ok(a.vragen[0] === "Wat heb je ter plaatse gedaan?", "K5 eerste vraag: ‘Wat heb je ter plaatse gedaan?’", a.vragen);
  ok(a.tpKnoppen.length === 4 && /Werk stilgelegd/.test(a.tpKnoppen[0]) && /Direct verholpen/.test(a.tpKnoppen[1]) && a.tpKnoppen.every((x) => /\|false$/.test(x)), "K5 keuzes Werk stilgelegd / Direct verholpen / Maatregel genomen / Nog niets, niets voorgekozen", a.tpKnoppen);
  ok(!a.tp, "K5 ter plaatse nog niet ingevuld (geen ‘Niets gedaan’ als standaard)", a.tp);
  ok(/direct gevaar/i.test(a.balk), "K5 direct gevaar zichtbaar benoemd", a.balk);
  await p.screenshot({ path: SHOTS + "/actie-direct-gevaar.png" });
  await p.screenshot({ path: SHOTS + "/actie-direct-gevaar-heel.png", fullPage: true });
  await ev(() => { const e = document.getElementById("kv-prio"); if (e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 360); }); await wacht(200);
  await p.screenshot({ path: SHOTS + "/actie-direct-gevaar-prioriteit.png" });
  await ev(() => window.scrollTo(0, 0)); await wacht(100);
  await p.locator("#kv-tp-groep .kvlak").first().click(); await wacht(300);
  await p.locator("[aria-labelledby=kv-prio] .kvlak").nth(1).click(); await wacht(300);   // inspecteur past de prioriteit aan
  const a2 = await ev(() => { const c = App.state.inspectie.cur; return { tp: c.actie.terPlaatse, stil: c.actie.stilgelegd, prio: c.actie.prio, vs: (document.querySelector(".kv-vs") || {}).textContent || "" }; });
  ok(a2.tp === "maatregel" && a2.stil === true, "K5 ‘Werk stilgelegd’ = maatregel genomen (actie blijft open)", a2);
  ok(a2.prio === "kort" && !/Voorstel/.test(a2.vs), "K5 de inspecteur kan de prioriteit veranderen; dan is het geen Voorstel meer", a2);
  await p.screenshot({ path: SHOTS + "/actie-direct-gevaar-gekozen.png" });
  if (!(await ev(() => App.state.inspectie.cur.actie.tekst.trim()))) await ev(() => { App.state.inspectie.cur.actie.tekst = "Hijsband afkeuren; niemand onder de last"; });
  await p.click("text=Actievoorstel vastleggen"); await wacht(300);
  const w = await ev(() => { const w = App.state.inspectie.waarnemingen.slice(-1)[0]; return { tp: w.actie.terPlaatse, st: w.actie.status, stil: w.actie.stilgelegd, prio: w.actie.prio }; });
  ok(w.tp === "maatregel" && w.st === "Voorstel" && w.stil, "K5 vastgelegd: open actievoorstel, werk stilgelegd", w);

  // gewoon risico: geen directe urgentie
  await naarKoppel("ze halen de damwand eruit met de kraan", "monteur tilt in zijn eentje zware delen met een kromme rug");
  const f = await ev(() => App.state.inspectie.voorstel.ids[0]);
  await p.locator(".kpick").first().click(); await wacht(300);
  await p.click(".seg.stapel button.t-A"); await wacht(800);
  const g = await ev(() => { const c = App.state.inspectie.cur; return { regel: c.regel_id, prio: c.actie.prio, tp: c.actie.terPlaatse, gevaar: c.actie.gevaar, eerste: ([...document.querySelectorAll(".otitel")][0] || {}).textContent }; });
  ok(f === "DAM-2.02" && g.prio === "kort" && g.tp === "niets" && !g.gevaar, "K5 fysieke belasting (geen direct gevaar): Kort en Niets gedaan zoals altijd", g);

  // direct verholpen → bestaande regel: afgerond, inspecteur is toetser (pas bij vastleggen inspectie)
  await naarKoppel("ze halen de damwand eruit met de kraan", "monteur stond onder de hangende last, ploeg heeft hem direct weggestuurd");
  await p.click(".seg.stapel button.t-A"); await wacht(800);
  await p.locator("#kv-tp-groep .kvlak").nth(1).click(); await wacht(300);
  const h = await ev(() => ({ tp: App.state.inspectie.cur.actie.terPlaatse, uitleg: (document.querySelector(".kvuitleg") || {}).textContent || "" }));
  ok(h.tp === "gecorrigeerd" && /toetser/.test(h.uitleg), "K5 ‘Direct verholpen’ = direct gecorrigeerd (jij bent toetser)", h);

  await b.close();
  console.log("errs", errs);
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.log("FOUT " + (e && e.stack || e)); console.log("errs", ["EXC " + e.message]); process.exit(1); });
