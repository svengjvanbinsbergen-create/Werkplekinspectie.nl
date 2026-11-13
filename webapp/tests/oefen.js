// Werkplekinspectie — tests/oefen.js: de Oefeninspectie (js/oefen.js) helemaal doorlopen als inspecteur.
//
//  - de tip "Nieuw als inspecteur?" staat op Vandaag en Inspecties bij een inspecteur zonder eigen inspecties
//    (niet bij een coördinator); "Niet nu" haalt hem weg, maar alleen voor die gebruiker;
//  - "Oefenen" in het accountmenu opent de oefening; elk oefenscherm toont het label "Oefening", zonder
//    meldingenbalk, bel of accountknop en zonder tabbalk;
//  - kort: hooguit 12 stappen; elke methoderegel komt bij precies één stap in beeld (één kaartje);
//  - scène 1 (pomp, direct gevaar): eerst stoppen (zonder de goede keuze geen ‘Verder’), gesprek met open vraag,
//    waarneming (aannames worden letterlijk benoemd, "zit vast aan" niet), TRA-Voorstel en zelf oordelen op één
//    scherm (uitleg noemt wat de TRA vraagt, geen verzonnen meerderheid), actievoorstel met "Ter plaatse" en
//    terugkoppeling; bij "Direct gecorrigeerd" één zin over wie toetst (geen tegenstrijdige coördinator-tip);
//  - scène 2 (sleuf): taak via het gesprek + Voorstel, bij A volgt een actievoorstel en daarna positief benoemen;
//  - scène 3 (schakelkast): open vraag, de inspecteur ziet het label zelf ophangen, zelf koppelen, A volgens de
//    TRA, "Direct gecorrigeerd" is afgerond omdat jij het herstel zag;
//  - samenvatting (alleen wat je echt deed) en "Klaar om echt te beginnen"; teksten zonder "!", "≠",
//    "dringendheid", echte collega's of de afgekeurde formuleringen;
//  - een deel met het toetsenbord (Tab/Enter/Spatie);
//  - NIETS wordt opgeslagen: alle IndexedDB-stores (inspecties, acties, concept, planning, outbox, …) hebben
//    na afloop evenveel records, er loopt geen inspectie, de acties en meldingen zijn gelijk;
//  - wpi_oefen is per gebruiker en de lopende oefening (met vrije tekst) verdwijnt bij uitloggen;
//  - geen pageerrors, console-errors of CSP-overtredingen; geen horizontaal scrollen op 390 en 1440.
//
//   BASE=http://localhost:8540 node /home/user/Werkplekinspectie.nl/webapp/tests/oefen.js
//
// Schermafbeeldingen (390×844, dsf 2) in OEFEN_SHOTS, anders TESTS_OUT, anders de huidige map.
// Eindigt met "errs [...]" (leeg = alles in orde).
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8540";
const SHOTS = process.env.OEFEN_SHOTS || process.env.TESTS_OUT || process.cwd();
fs.mkdirSync(SHOTS, { recursive: true });
const errs = [];
const ok = (cond, wat) => { if (!cond) errs.push("OEFEN: " + wat); console.log((cond ? "  ok    " : "  FOUT  ") + wat); };

async function nieuwePagina(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: "nl-NL" });
  const p = await ctx.newPage();
  await p.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + (e.blockedURI || "") + " " + (e.sourceFile || "") + ":" + (e.lineNumber || ""))); });
  p.on("pageerror", (e) => errs.push("PAGEERR " + w + " " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + w + " " + m.text()); });
  return { ctx, p };
}

(async () => {
  const b = await chromium.launch();
  const { ctx, p } = await nieuwePagina(b, 390, 844);
  const ev = (f, a) => p.evaluate(f, a);
  const wacht = (ms) => p.waitForTimeout(ms || 250);
  const teksten = [];
  let nr = 0;
  const shot = async (naam) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(80); const f = path.join(SHOTS, String(++nr).padStart(2, "0") + "-" + naam + ".png"); await p.screenshot({ path: f, fullPage: true }); return f; };
  const geenScroll = async (wat) => { const x = await ev(() => document.documentElement.scrollWidth - window.innerWidth); ok(x <= 0, wat + ": geen horizontaal scrollen (" + x + "px)"); };
  // elk oefenscherm: label "Oefening" zichtbaar, geen meldingenbalk/bel/account, geen horizontaal scrollen, schermafbeelding
  const scherm = async (naam, maxHoogte) => {
    await wacht(200);
    const lab = await p.locator(".oef-label").first();
    ok((await lab.count()) === 1 && (await lab.isVisible()) && /Oefening/.test(await lab.innerText()) && /niets wordt een echte inspectie/.test(await lab.innerText()) && !/opgeslagen/.test(await lab.innerText()), naam + ": label ‘Oefening · niets wordt een echte inspectie’ zichtbaar");
    const rust = await ev(() => ({ alert: getComputedStyle(document.getElementById("alert")).display, acct: getComputedStyle(document.getElementById("acct")).display, tab: document.getElementById("tabbar").classList.contains("hidden") }));
    ok(rust.alert === "none" && rust.acct === "none" && rust.tab, naam + ": geen meldingenbalk, bel, accountknop of tabbalk");
    await geenScroll(naam);
    if (maxHoogte) { const hgt = await ev(() => document.documentElement.scrollHeight); ok(hgt <= maxHoogte, naam + ": kort scherm (" + hgt + "px ≤ " + maxHoogte + ")"); }
    teksten.push(await p.locator(".oef").innerText());
    await shot(naam);
  };
  const tellingen = () => ev(async () => {
    const db = await WPI.DB.open(), uit = {};
    for (const n of Array.from(db.objectStoreNames)) uit[n] = (await WPI.DB.getAll(n)).length;
    await App.laadActies(); uit._acties = (App.acties || []).length; uit._meldingen = App.meldingen().length;
    uit._inspectie = App.state.inspectie ? 1 : 0; return uit;
  });
  const fbTekst = async () => { const t = (await p.locator(".oef-fb").innerText()).replace(/\s+/g, " "); teksten.push(t); return t; };
  const knop = (naam) => p.getByRole("button", { name: naam, exact: true });
  const verder = async () => { await knop("Verder").click(); await wacht(); };
  const kies = async (st, n) => { await p.locator(`.oef-keuzes button[data-args='["${st}",${n}]']`).click(); await wacht(); };
  const lsU = (id) => ev((id) => { const o = JSON.parse(localStorage.getItem("wpi_oefen") || "{}"); return (o.gebruikers || {})[id] || null; }, id);

  await p.goto(BASE + "/index.html"); await wacht(900);
  await ev(() => App.login("u-insp")); await wacht(900);
  const voor = await tellingen();
  console.log("tellingen vooraf", JSON.stringify(voor));

  // ---- aannames herkennen (regel 1: alleen wat je ziet telt) ----
  const ann = await ev(() => ({
    a: App.oefAannames("De pomp zit vast aan een band die kapot is, ik denk dat ze dit vaker doen"),
    b: App.oefAannames("De hijsband is aan één kant gerafeld met een snee. Dat doen ze vast altijd zo."),
    c: App.oefAannames("De hijsband is gerafeld en heeft een snee. De pomp zit vast aan de band."),
    d: App.oefAannames("Volgens mij is de band niet gekeurd."),
    e: App.oefAannames("De band is kapot en ze zullen wel haast hebben"),
  }));
  ok(JSON.stringify(ann.a) === JSON.stringify(["ik denk dat ze dit vaker doen"]), "aanname: ‘ik denk dat ze dit vaker doen’ (niet het feitelijke ‘zit vast aan’) " + JSON.stringify(ann.a));
  ok(JSON.stringify(ann.b) === JSON.stringify(["Dat doen ze vast altijd zo"]), "aanname: ‘Dat doen ze vast altijd zo’ " + JSON.stringify(ann.b));
  ok(ann.c.length === 0, "geen aanname in een feitelijke zin met ‘zit vast aan’ " + JSON.stringify(ann.c));
  ok(ann.d.length === 1 && ann.e.length === 1 && /zullen wel/.test(ann.e[0]) && !/kapot/.test(ann.e[0]), "aanname: ‘volgens mij …’ en ‘ze zullen wel …’ " + JSON.stringify([ann.d, ann.e]));

  // ---- tip op Vandaag (inspecteur zonder eigen inspecties) ----
  await p.waitForSelector(".oef-hint", { timeout: 4000 }).catch(() => {});
  ok(await p.locator(".oef-hint").count() === 1, "Vandaag: tip ‘Nieuw als inspecteur?’ voor een inspecteur zonder inspecties");
  await geenScroll("Vandaag met tip"); await shot("vandaag-tip");

  // ---- via het accountmenu ----
  await p.click('#acct button[aria-label="Account"]'); await wacht();
  const rij = p.locator('#mod button[data-action="oefOpen"]');
  ok(await rij.count() === 1 && /Oefenen/.test(await rij.innerText()), "accountmenu: regel ‘Oefenen’");
  await shot("accountmenu");
  await rij.click(); await wacht(400);
  ok(await ev(() => location.hash) === "#/oefen", "Oefenen opent #/oefen");
  ok(/Oefeninspectie/.test(await p.locator(".oef h1").innerText()), "intro: kop Oefeninspectie");
  ok(await p.locator(".oef ol").count() === 0 && /gesprek op de werkplek/.test(await p.locator(".oef").innerText()), "intro: een gesprek, geen genummerde procedure");
  await scherm("intro");

  // ================= scène 1: pomp uit de put (direct gevaar) =================
  // methoderegels: per regel bijhouden bij welke stap(pen) hij in beeld kwam (elke regel één stap)
  const regelBij = {};
  const noteerRegels = async () => {
    const r = await ev(() => ({ k: ((document.querySelector(".oef-vg-t") || {}).textContent || "") + " / " + ((document.querySelector(".oef h1") || {}).textContent || ""),
      t: [...document.querySelectorAll(".oef-fb .oef-regel-r b")].map((x) => x.textContent) }));
    ok(await p.locator(".oef-fb .oef-regel").count() <= 1, r.k + ": hooguit één regelkaartje");
    r.t.forEach((t) => { (regelBij[t] = regelBij[t] || new Set()).add(r.k); });
  };
  const fbTekstR = async () => { await noteerRegels(); return fbTekst(); };
  const geenVerder = async (wat) => ok(await knop("Verder").count() === 0, wat + ": geen ‘Verder’ na een verkeerde keuze");

  await knop("Begin met oefenen").click(); await wacht();
  ok(await p.locator(".oef-scene svg[role=img]").count() === 1, "scène 1: tekening (inline SVG met beschrijving)");
  ok(/Twee monteurs/.test(await p.locator(".oef-verhaal").innerText()) && await ev(() => document.querySelectorAll(".oef-svg > g[transform^='translate']").length) === 2, "scène 1: tekst en tekening tonen allebei twee monteurs");
  const totaal = await ev(() => +document.querySelector(".oef-balk").getAttribute("aria-valuemax"));
  ok(totaal <= 12, "kort: hooguit 12 stappen in de hele oefening (" + totaal + ")");
  await scherm("s1-ingrijpen");
  await kies("ingrijpen", 1);
  const tif = await fbTekstR();
  ok(/eerst stoppen/i.test(tif) && await knop("Kies opnieuw").count() === 1 && !/Kies nog eens/.test(tif), "ingrijpen: eerst een foto → uitleg ‘eerst stoppen’ + één knop ‘Kies opnieuw’ (geen dubbel ‘Kies nog eens’)");
  await geenVerder("ingrijpen");
  ok(await p.locator(".oef-fb .oef-regel").count() === 0, "ingrijpen fout: nog geen regelkaartje (dat komt bij de goede keuze)");
  await ev(() => App.oefVerder()); await wacht();
  ok(/Wat doe je eerst/.test(await p.locator(".oef h1").innerText()), "ingrijpen: zonder de goede keuze kom je niet verder (ook niet via oefVerder)");
  await knop("Kies opnieuw").click(); await wacht();
  await kies("ingrijpen", 0);
  const ti = await fbTekstR();
  ok(/Goed: eerst stoppen/.test(ti) && /Direct gevaar\? Eerst stoppen/.test(ti), "ingrijpen: werk laten stoppen → regel ‘Direct gevaar? Eerst stoppen’");
  await scherm("s1-ingrijpen-terugkoppeling", 1700);
  await verder();

  ok(/staat weer op de grond/.test(await p.locator(".oef-kaart").first().innerText()), "gesprek: de pomp staat weer op de grond");
  ok(/Hoe controleren jullie de band normaal voordat jullie gaan hijsen/.test(await p.locator(".oef").innerText()), "gesprek: natuurlijke open vraag");
  await scherm("s1-gesprek", 1700);
  await kies("gesprek", 2);
  ok(/Probeer het anders/.test(await fbTekstR()), "gesprek: ja/nee-vraag → probeer het anders");
  await geenVerder("gesprek");
  await knop("Kies opnieuw").click(); await wacht();
  await kies("gesprek", 0);
  const tg = await fbTekstR();
  ok(/Een gesprek, geen afvinklijst/.test(tg) && /helpt je te begrijpen/.test(tg), "gesprek: open vraag → regel ‘Een gesprek, geen afvinklijst’");
  await verder();

  // wat zag je? eerst met een aanname, dan feitelijk
  ok(await ev(() => document.querySelector(".oef-terug").open), "zie: situatie staat open om nog eens te kijken");
  ok(await p.locator(".oef-terug-plek").isHidden() && (await p.locator(".oef").innerText()).split("Gemaal De Oefenpolder (verzonnen)").length === 2, "zie: plaatsnaam staat één keer in beeld");
  await p.fill("#oef-f-zie", "De pomp zit vast aan een band die kapot is, ik denk dat ze dit vaker doen");
  await scherm("s1-zie");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  const tz = await fbTekstR();
  const let1 = await p.locator(".oef-fb .oef-let").innerText();
  ok(/een deel is een aanname/.test(tz) && !/Goed gezien/.test(tz), "zie: met aanname geen ‘Goed gezien’ maar ‘een deel is een aanname’");
  ok(/Dit zie je nu niet/.test(let1) && /ik denk dat ze dit vaker doen/.test(let1) && !/“vast”/.test(let1), "zie: ‘Dit zie je nu niet’ + de echte aanname letterlijk, het feitelijke ‘vast’ niet");
  await scherm("s1-zie-aanname");
  await knop("Pas je waarneming aan").click(); await wacht();
  ok(/ik denk/.test(await p.inputValue("#oef-f-zie")), "zie: eigen tekst blijft staan bij aanpassen");
  await p.fill("#oef-f-zie", "De hijsband is aan één rand uitgerafeld en heeft een snee. De put is afgezet.");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  ok(/Goed gezien/.test(await fbTekstR()) && await p.locator(".oef-fb .oef-let").count() === 0, "zie: feitelijk → ‘Goed gezien’, geen aanname-melding");
  await verder();

  // koppelen en oordelen op één scherm
  ok(/Koppel en beoordeel/.test(await p.locator(".oef h1").innerText()), "koppel en oordeel: één stap");
  ok(/Voorstel/.test(await p.locator(".oef-vs .lbl.vs").innerText()) && await p.locator(".oef-vs .vpick").count() === 1, "koppel: TRA-stap als Voorstel");
  ok(await p.locator(".seg button").count() === 0, "koppel: nog geen oordeel in beeld zolang de TRA-stap niet bevestigd is");
  await scherm("s1-koppel", 1500);
  await p.locator(".oef-vs .vpick").click(); await wacht(300);
  ok(await p.locator(".oef-fb").count() === 0 && /Voorstel bevestigd/.test(await p.locator(".oef-gekozen").first().innerText()), "koppel: Voorstel bevestigd, geen apart terugkoppelscherm");
  ok(await ev(() => document.activeElement && document.activeElement.id === "oef-oordeel-lab"), "koppel: focus gaat naar ‘Jouw oordeel’");
  const pressed = await ev(() => [...document.querySelectorAll(".oef .seg button")].map((x) => x.getAttribute("aria-pressed") + "|" + x.className));
  ok(pressed.length === 3 && pressed.every((x) => x.startsWith("false") && !/on-/.test(x)), "oordeel: C/A/V aanwezig en niets voorgekozen");
  ok(await p.locator('button[data-args=\'["NVT"]\']').count() === 1, "oordeel: ook ‘Niet van toepassing’");
  await scherm("s1-oordeel", 1700);
  await p.locator(".oef .seg .t-V").focus(); await p.keyboard.press("Enter"); await wacht(300);
  const tv = await fbTekstR();
  ok(/Jouw oordeel: Verbeterpunt/.test(tv) && /Volgens de TRA mag er met een beschadigde hijsband niet gehesen worden/.test(tv) && /Jij beoordeelt/.test(tv) && /schrijf je hierna een actievoorstel/.test(tv), "oordeel V (toetsenbord): uitleg noemt wat de TRA vraagt, actievoorstel volgt");
  await knop("Toch anders kiezen").click(); await wacht();
  await p.locator(".oef .seg .t-A").focus(); await p.keyboard.press("Enter"); await wacht(300);
  const tA = await fbTekstR();
  ok(/\[A\]/.test(await p.locator(".oef-gekozen").last().innerText()) && /Jouw oordeel: Afwijking/.test(tA) && !/Klopt met de TRA/.test(tA), "oordeel A: ‘Jouw oordeel: Afwijking’");
  await scherm("s1-oordeel-terugkoppeling");
  await verder();

  // actievoorstel
  const vast = p.locator("#oef-vastleg");
  ok(await vast.isDisabled(), "actie: vastleggen pas als alles is ingevuld");
  ok(await p.locator("#oef-terPlaatse-maatregel").count() === 1 && /hijsen gestopt/.test(await p.locator("#oef-terPlaatse-maatregel").innerText()), "actie: keuze ‘Ter plaatse’ met ‘Maatregel genomen (hijsen gestopt)’");
  ok(!/Winfred|houder|Toetser \(/.test(await p.locator(".oef").innerText()), "actie: de inspecteur kiest geen actiehouder of toetser");
  ok(/kiest de coördinator wie de actie uitvoert en wie toetst/.test(await p.locator("#oef-wie").innerText()), "actie: zonder keuze ‘de coördinator kiest wie uitvoert en wie toetst’");
  await p.fill("#oef-f-actie", "Band later eens vervangen");
  await p.click("#oef-terPlaatse-niets"); await wacht();
  await p.click("#oef-prio-planmatig"); await wacht();
  ok((await p.inputValue("#oef-f-actie")) === "Band later eens vervangen", "actie: eigen tekst blijft staan na een keuze");
  await vast.click(); await wacht();
  const tc = await fbTekstR();
  ok(/Let op: dit is direct gevaar/.test(tc) && await p.locator(".oef-corr li").count() === 3 && /Kies ‘Direct’/.test(tc) && /‘Later’ past niet/.test(tc) && /Maatregel genomen/.test(tc), "actie: ‘later’ + niets gedaan + planmatig → drie correcties");
  ok(await p.locator(".oef-fb .oef-regel").count() === 0 && !/QHSE-manager|toetser is niet/.test(tc), "actie-correctie: geen regelkaartje over acties (alleen bij het goede pad)");
  await scherm("s1-actie-correctie");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  const wieG = await p.locator("#oef-wie").innerText();
  ok(await p.locator("#oef-prio-direct").count() === 0 && /jij de toetser/.test(wieG) && !/coördinator/.test(wieG) && await p.locator(".oef .oef-wie").count() === 1, "actie: bij ‘Direct gecorrigeerd’ één zin (jij bent de toetser), geen tegenstrijdige coördinator-tip");
  await vast.click(); await wacht();
  ok(/jij hebt geen herstel gezien/.test(await fbTekstR()), "actie put: ‘Direct gecorrigeerd’ zonder gezien herstel → bijsturen");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-maatregel"); await wacht();
  ok(await vast.isDisabled(), "actie: na ‘Maatregel genomen’ weer een urgentie nodig");
  await p.getByRole("button", { name: "Laat de app een actie voorstellen" }).click(); await wacht();
  ok((await p.inputValue("#oef-f-actie")).length > 10 && /Voorstel/.test(await p.locator("#oef-actiekop").innerText()), "actie: app-voorstel staat er als ‘Voorstel’");
  await p.locator("#oef-prio-direct").focus(); await p.keyboard.press("Space"); await wacht();
  ok(!(await vast.isDisabled()), "actie: vastleggen kan (toetsenbord)");
  await scherm("s1-actie");
  await vast.click(); await wacht();
  const ta = await fbTekstR();
  ok(/Past bij wat je zag/.test(ta) && await p.locator(".oef-corr").count() === 0 && /De toetser is niet de actiehouder/.test(ta) && /Afgerond pas na toetsing/.test(ta) && /QHSE-manager is nooit actiehouder/.test(ta) && await p.locator(".oef-fb .oef-regel-r").count() === 3, "actie: past bij het gevaar + de drie actieregels in één kaartje");
  await scherm("s1-actie-terugkoppeling");
  await verder();

  // ================= scène 2: werken in de sleuf =================
  ok(/Scène 2/.test(await p.locator(".oef-vg-t").innerText()), "scène 2 begint");
  ok(/waar zijn jullie mee bezig/.test(await p.locator(".oef-dialoog").innerText()), "taak: je vraagt het de ploeg (gesprek)");
  await p.fill("#oef-f-taak", "ze sluiten de nieuwe persleiding aan");
  await p.locator('button[data-action="oefTaakVs"]').click(); await wacht();
  ok(/Voorstel/.test(await p.locator(".oef-vs .lbl.vs").first().innerText()) && await p.locator(".oef-fb").count() === 0, "taak: Voorstel, nog geen terugkoppeling vóór bevestigen");
  await scherm("s2-taak");
  await p.locator(".oef-vs .vpick").click(); await wacht(300);
  ok(await ev(() => document.activeElement && document.activeElement.classList.contains("oef-fb")), "terugkoppeling krijgt de focus");
  ok(/jij bevestigde/i.test(await fbTekstR()), "taak: ‘jij bevestigde het Voorstel’");
  await verder();
  const vs2 = (await p.locator(".oef-vs").innerText()).replace(/\s+/g, " ");
  ok(/hoort bij deze taak/.test(vs2) && /Waarom: de monteur werkt onderin een sleuf/.test(vs2) && !/je zei/.test(vs2) && !/bij wat je zag/.test(vs2), "koppel sleuf: vraag en Waarom over de taak en de sleuf, geen zwak ‘je zei “leiding”’");
  await p.locator(".oef-vs .vpick").click(); await wacht();
  await p.locator(".oef .seg .t-A").click(); await wacht();
  const t2 = await fbTekstR();
  ok(/Jouw oordeel: Afwijking/.test(t2) && /de TRA vraagt een gasmeter/.test(t2) && !/inspecteurs kiezen/.test(t2), "sleuf A: jouw keuze telt, uitleg noemt wat de TRA vraagt (geen verzonnen meerderheid)");
  await verder();
  ok(/Actievoorstel/.test(await p.locator(".oef h1").innerText()) && await p.locator("#oef-vastleg").count() === 1, "sleuf A: actievoorstel volgt (de app overrulet je oordeel niet)");
  // wat de critici vonden: A + ‘niks’ + niets gedaan + planmatig mag geen groen vinkje ‘Past bij wat je zag’ geven
  await p.fill("#oef-f-actie", "niks");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await scherm("s2-actie");
  await p.click("#oef-vastleg"); await wacht();
  const t2a = await fbTekstR();
  ok(!/Past bij wat je zag/.test(t2a) && await p.locator(".oef-fb.let").count() === 1 && await p.locator(".oef-hierna").count() === 0 && /Volgens de TRA was hier alles in orde/.test(t2a) && /actie is dan niet nodig/.test(t2a) && await p.locator(".oef-fb .oef-regel").count() === 0,
    "sleuf A + actie: rustige i-uitleg ‘volgens de TRA was hier alles in orde’, geen groen vinkje, geen Hierna, geen regelkaartje");
  await scherm("s2-actie-anders");
  await knop("Bekijk je oordeel opnieuw").click(); await wacht(300);
  ok(/Koppel en beoordeel/.test(await p.locator(".oef h1").innerText()) && await p.locator(".oef .seg button").count() === 3 && await ev(() => document.activeElement && document.activeElement.id === "oef-oordeel-lab"), "sleuf: ‘Bekijk je oordeel opnieuw’ → terug naar het oordeel, focus op ‘Jouw oordeel’");
  // de oefenaar houdt vast aan A (het oordeel is van hem) en gaat via ‘Verder’ door
  await p.locator(".oef .seg .t-A").click(); await wacht();
  await verder();
  ok((await p.inputValue("#oef-f-actie")) === "niks", "sleuf: eigen actietekst blijft staan");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  await p.locator('.oef-fb button.linkknop[data-action="oefVerder"]').click(); await wacht();
  const vraagPos = await p.locator(".oef-vraag").innerText();
  ok(/Wat gaat hier wél goed/.test(vraagPos) && !/Alles wat je zag was in orde/.test(await p.locator(".oef").innerText()), "positief na A: ‘wat gaat hier wél goed’, niet ‘alles was in orde’");
  await knop("Geef een voorbeeld").click(); await wacht();
  ok((await p.inputValue("#oef-f-positief")).length > 10, "positief: voorbeeld ingevuld (Voorstel)");
  await scherm("s2-positief");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  const tp2 = await fbTekstR();
  ok(/Mooi benoemd/.test(tp2) && /Benoem wat goed gaat/.test(tp2), "positief: mooi benoemd + regel ‘Benoem wat goed gaat’");
  await verder();

  // ================= scène 3: bij de schakelkast =================
  await scherm("s3-gesprek");
  await kies("gesprek", 1);
  ok(/Probeer een open vraag/.test(await fbTekstR()), "gesprek: ja/nee-vraag → tip voor een open vraag");
  await geenVerder("kast gesprek");
  await knop("Kies opnieuw").click(); await wacht();
  await kies("gesprek", 0);
  ok(/goede open vraag/.test(await fbTekstR()) && await p.locator(".oef-fb .oef-regel").count() === 0, "gesprek: open vraag → goede vraag (regel stond al in scène 1)");
  await verder();
  ok(/Je ziet het hangen/.test(await p.locator(".oef-daarna").innerText()), "kast: je ziet zelf dat het label wordt opgehangen");
  ok(await p.locator(".oef-vs .vpick").count() === 0 && await ev(() => document.querySelector(".oef .zelfkies").open), "koppel scène 3: geen voorstel, zelf kiezen staat open");
  await p.locator('.zpick[data-args=\'["5.2"]\']').click(); await wacht();
  ok(/zelf gekozen/.test(await p.locator(".oef-gekozen").first().innerText()), "koppel: zelf gekozen TRA-stap");
  await scherm("s3-oordeel");
  await p.locator(".oef .seg .t-V").click(); await wacht();
  const t3v = await fbTekstR();
  ok(/Jouw oordeel: Verbeterpunt/.test(t3v) && /afwijking, geen verbeterpunt/.test(t3v) && !/inspecteurs kiezen/.test(t3v), "kast V: uitleg dat een ontbrekend label volgens de TRA een afwijking is");
  await knop("Toch anders kiezen").click(); await wacht();
  await p.locator(".oef .seg .t-A").click(); await wacht();
  ok(/Jouw oordeel: Afwijking/.test(await fbTekstR()), "kast A: afwijking (slot én label)");
  await verder();
  ok(/je zag het hangen/.test(await p.locator(".oef-gezien").innerText()), "kast actie: ‘Wat je zag’ staat erbij");
  await p.fill("#oef-f-actie", "Label met naam en datum aan het slot hangen");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t3a = await fbTekstR();
  ok(/Direct gecorrigeerd/.test(t3a) && await p.locator(".oef-corr li").count() === 1, "kast: niets gedaan → je zag het herstel, kies ‘Direct gecorrigeerd’");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  ok(await p.locator("#oef-prio-kort").count() === 0 && !/coördinator/.test(await p.locator("#oef-wie").innerText()), "kast: direct gecorrigeerd → geen urgentie, geen coördinator-tip");
  await scherm("s3-actie");
  await p.click("#oef-vastleg"); await wacht();
  const t3k = await fbTekstR();
  ok(/Je zag zelf dat het label nu aan het slot hangt/.test(t3k) && /jij de toetser/.test(t3k), "direct gecorrigeerd: afgerond omdat jij het herstel zag (toetsing)");
  await scherm("s3-actie-terugkoppeling");
  await verder();

  // elke methoderegel één keer in beeld (bij één stap), alle acht samen
  const regelTelling = Object.fromEntries(Object.entries(regelBij).map(([t, s]) => [t, s.size]));
  ok(Object.keys(regelTelling).length === 8 && Object.values(regelTelling).every((n) => n === 1), "methoderegels: alle acht, elk bij precies één stap " + JSON.stringify(regelTelling));

  // ================= samenvatting =================
  ok(/De oefening zit erop/.test(await p.locator(".oef h1").innerText()), "samenvatting: ‘De oefening zit erop’");
  const kick = await p.locator(".oef-kicker").innerText();
  ok(/Even terugkijken/.test(kick) && !/Goed gedaan/.test(kick), "samenvatting: neutrale ondertitel als je oordeel afweek (" + kick + ")");
  ok(await p.locator(".oef-regels li").count() === 8 && await p.locator(".oef-regels svg").count() === 0 && await p.locator(".oef-regels .oef-bol").count() === 8, "samenvatting: acht methoderegels met neutrale bolletjes, geen vinkjes");
  const lijst = await p.locator(".oef-lijst").innerText();
  ok(/werk laten stoppen/.test(lijst) && /gesprek begonnen met wat goed gaat/.test(lijst) && /waarneming beschreven/.test(lijst) && /taak gevraagd en bevestigd/.test(lijst) && /open vraag gesteld/.test(lijst) && /herstel gezien, actie afgerond/.test(lijst) && (lijst.match(/positief benoemd/g) || []).length === 1 && (lijst.match(/actievoorstel geschreven/g) || []).length === 2, "samenvatting: per scène wat je deed");
  ok(await p.locator(".oef-anders").count() === 1 && /jij koos A; volgens de TRA conform \(C\)/.test(lijst) && !/Pomp uit de put[\s\S]*Kijk nog eens[\s\S]*Werken in de sleuf/.test(lijst), "samenvatting: alleen bij de sleuf ‘jij koos A; volgens de TRA conform (C)’");
  ok(await knop("Klaar om echt te beginnen").count() === 1, "samenvatting: ‘Klaar om echt te beginnen’");
  await scherm("samenvatting");
  const alles = teksten.join("\n");
  for (const [re, wat] of [[/!/, "uitroepteken"], [/≠/, "≠-teken"], [/dringendheid/i, "‘dringendheid’"], [/Winfred|Loerts|Douwe|Björn/, "echte collega"], [/moet opgelost\b/, "‘moet opgelost’"], [/inspreken kan dan ook/, "dubbel ‘ook’"],
    [/inspecteurs kiezen/, "verzonnen meerderheid"], [/Kies nog eens/, "dubbel ‘Kies nog eens’ boven ‘Kies opnieuw’"], [/niets wordt opgeslagen|er wordt niets opgeslagen/, "‘niets wordt opgeslagen’"], [/Klopt met de TRA/, "‘Klopt met de TRA’"], [/Dit zie je niet nu/, "‘Dit zie je niet nu’"], [/blijft het werk en de controle/, "‘blijft het werk en de controle’"], [/Zeg het hem\./, "‘Zeg het hem.’"], [/helpt je begrijpen/, "‘helpt je begrijpen’"], [/10 minuten/, "‘10 minuten’"]])
    ok(!re.test(alles), "teksten: geen " + wat);
  ok(/±5 minuten/.test(alles), "teksten: ±5 minuten");

  // ---- niets opgeslagen ----
  const na = await tellingen();
  console.log("tellingen na afloop", JSON.stringify(na));
  ok(JSON.stringify(na) === JSON.stringify(voor), "niets opgeslagen: IndexedDB-stores, acties, meldingen en lopende inspectie ongewijzigd");
  const ls = await lsU("u-insp");
  ok(ls && ls.voortgang && ls.voortgang.s === 3, "voortgang alleen in localStorage ‘wpi_oefen’, per gebruiker");

  await knop("Klaar om echt te beginnen").click(); await wacht(700);
  ok(await ev(() => location.hash) === "#/vandaag", "Klaar → Vandaag");
  ok(!(await ev(() => document.getElementById("tabbar").classList.contains("hidden"))) && await ev(() => getComputedStyle(document.getElementById("acct")).display !== "none"), "tabbalk en accountknop weer zichtbaar");
  ok(await p.locator(".oef-hint").count() === 0, "na de oefening geen tip meer");
  ok((await lsU("u-insp")).gedaan === true, "wpi_oefen: gedaan (voor deze gebruiker)");
  ok(JSON.stringify(await tellingen()) === JSON.stringify(voor), "ook na afsluiten niets opgeslagen");

  // ---- veld- en zonmodus ----
  await ev(() => { App.pref = { veld: true, zon: true }; App.pasPrefToe(); App._oef = null; App.oefOpen(); }); await wacht(400);
  await p.getByRole("button", { name: /met oefenen/ }).click(); await wacht();
  await scherm("zonmodus-ingrijpen");
  await ev(() => { const o = App.oefState(); o.s = 0; o.i = 4; o.fb = false; o.a[0].oordeel = "A"; o.a[0].regel = "2.1"; App.oefToon(); }); await wacht();
  await scherm("zonmodus-actie");
  await ev(() => { App.pref = { veld: false, zon: false }; App.pasPrefToe(); App.oefOpnieuw(); }); await wacht();
  ok(JSON.stringify(await tellingen()) === JSON.stringify(voor), "veld/zon: niets opgeslagen");
  ok((await ev(() => window.__csp)).length === 0, "390: geen CSP-overtredingen");
  await ctx.close();

  // ================= 1440: computer, coördinator, tip ‘Niet nu’ per gebruiker, uitloggen =================
  const w = await nieuwePagina(b, 1440, 900), q = w.p;
  await q.goto(BASE + "/index.html"); await q.waitForTimeout(900);
  await q.evaluate(() => App.login("u-winfred")); await q.waitForTimeout(800);
  ok(await q.locator(".oef-hint").count() === 0, "coördinator: geen tip");
  await q.evaluate(() => App.openAccount()); await q.waitForTimeout(200);
  ok(await q.locator('#mod button[data-action="oefOpen"]').count() === 1, "coördinator: ‘Oefenen’ in het accountmenu");
  await q.evaluate(() => App.closeModal());
  await q.evaluate(() => App.login("u-insp")); await q.waitForTimeout(800);
  await q.evaluate(() => App.go("inspecties")); await q.waitForTimeout(800);
  ok(await q.locator(".oef-hint").count() === 1, "Inspecties: tip bij lege lijst");
  await q.locator(".oef-hint .oef-nietnu").click(); await q.waitForTimeout(200);
  const lq = (id) => q.evaluate((id) => { const o = JSON.parse(localStorage.getItem("wpi_oefen") || "{}"); return (o.gebruikers || {})[id] || null; }, id);
  ok(await q.locator(".oef-hint").count() === 0 && (await lq("u-insp")).verborgen === true, "‘Niet nu’ verbergt de tip (wpi_oefen, per gebruiker)");
  await q.evaluate(() => App.go("vandaag")); await q.waitForTimeout(600);
  ok(await q.locator(".oef-hint").count() === 0, "tip blijft weg na ‘Niet nu’");
  const v0 = await q.evaluate(async () => { const db = await WPI.DB.open(), u = {}; for (const n of Array.from(db.objectStoreNames)) u[n] = (await WPI.DB.getAll(n)).length; return u; });
  // elk scherm op 1440: label + geen horizontaal scrollen
  await q.evaluate(() => App.oefOpen()); await q.waitForTimeout(500);
  const stappen = [[-1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [3, 0]];
  for (const [s, i] of stappen) {
    for (const fb of s >= 0 && s < 3 ? [false, true] : [false]) {
      await q.evaluate(([s, i, fb]) => { const o = App.oefState(); o.s = s; o.i = i; o.fb = fb; const a = o.a[s];
        if (a) Object.assign(a, { ingrijpen: 0, gesprek: 0, taak: "leiding aansluiten", gekozenTaak: "Persleiding aansluiten in de sleuf", zie: "hijsband rafelig", regel: s === 2 ? "5.2" : s === 1 ? "4.1" : "2.1", oordeel: "A", actie: "Actie", prio: "direct", terPlaatse: "maatregel", positief: "Goed zo", actieKlaar: true });
        App.oefToon(); }, [s, i, fb]);
      await q.waitForTimeout(200);
      const r = await q.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, lab: !!document.querySelector(".oef-label"), h1: (document.querySelector(".oef h1") || {}).textContent }));
      ok(r.x <= 0 && r.lab && r.h1, `1440 scène ${s} stap ${i}${fb ? " terugkoppeling" : ""} (${r.h1}): label en geen horizontaal scrollen`);
    }
  }
  // bij C in de sleuf geen actievoorstel
  const naC = await q.evaluate(() => { const o = App.oefState(); o.s = 1; o.i = 1; o.fb = true; o.a[1].oordeel = "C"; App.oefVerder(); return document.querySelector(".oef h1").textContent; });
  ok(naC === "Benoem wat goed gaat", "sleuf C: na het oordeel meteen positief benoemen (geen actie)");
  // de samenvatting zegt alleen wat je echt deed: na een verkeerde keuze geen ‘werk laten stoppen’
  const sam = await q.evaluate(() => { const o = App.oefState(); o.a[0].ingrijpen = 1; o.a[2].gesprek = 2; o.s = 3; o.i = 0; App.oefToon(); return document.querySelector(".oef-lijst").innerText; });
  ok(!/werk laten stoppen/.test(sam) && !/open vraag gesteld/.test(sam), "samenvatting: verkeerde keuze → niet ‘werk laten stoppen’ of ‘open vraag gesteld’");
  // de samenvatting zegt rustig waar je oordeel afweek (V/C bij de hijsband) en geeft dan geen ‘Goed gedaan’
  const sam2 = await q.evaluate(() => { const o = App.oefState(); o.a[0].oordeel = "V"; o.a[1].oordeel = "C"; o.a[2].oordeel = "C"; o.a[2].actieKlaar = false; o.s = 3; o.i = 0; App.oefToon();
    return { lijst: document.querySelector(".oef-lijst").innerText, kick: document.querySelector(".oef-kicker").textContent, n: document.querySelectorAll(".oef-anders").length }; });
  ok(/jij koos V; volgens de TRA een afwijking \(A\)/.test(sam2.lijst) && /jij koos C; volgens de TRA een afwijking \(A\)/.test(sam2.lijst) && sam2.n === 2 && !/Goed gedaan/.test(sam2.kick), "samenvatting: ‘jij koos V/C; volgens de TRA een afwijking (A)’, neutrale ondertitel");
  const sam3 = await q.evaluate(() => { const o = App.oefState(); o.a[0] = { ingrijpen: 0, gesprek: 0, zie: "De hijsband is gerafeld.", regel: "2.1", oordeel: "A", actie: "Band afkeuren en vervangen door een gekeurde band", terPlaatse: "maatregel", prio: "direct", actieKlaar: true };
    o.a[1] = { taak: "leiding aansluiten", gekozenTaak: "Persleiding aansluiten in de sleuf", regel: "4.1", oordeel: "C", positief: "Goed dat de gasmeter bij je hangt" };
    o.a[2] = { gesprek: 0, regel: "5.2", oordeel: "A", actie: "Label hangen", terPlaatse: "gecorrigeerd", actieKlaar: true }; o.s = 3; App.oefToon();
    return { kick: document.querySelector(".oef-kicker").textContent, n: document.querySelectorAll(".oef-anders").length }; });
  ok(sam3.kick === "Goed gedaan" && sam3.n === 0, "samenvatting: alles volgens de TRA → ‘Goed gedaan’, geen ‘Kijk nog eens’");
  await q.evaluate(() => { const o = App.oefState(); o.s = 0; o.i = 4; o.fb = false; o.a[0].oordeel = "A"; App.oefToon(); }); await q.waitForTimeout(250);
  await q.screenshot({ path: path.join(SHOTS, "1440-actie.png"), fullPage: true });
  await q.evaluate(() => { const o = App.oefState(); o.s = 2; o.i = 0; o.fb = false; App.oefToon(); }); await q.waitForTimeout(250);
  await q.screenshot({ path: path.join(SHOTS, "1440-kast.png"), fullPage: true });
  const strook = await q.evaluate(() => { const pl = document.querySelector(".oef-plaat"); return getComputedStyle(pl).backgroundColor; });
  ok(!/234, 241, 250/.test(strook), "1440: geen lichtblauwe stroken naast de tekening (" + strook + ")");
  const v1 = await q.evaluate(async () => { const db = await WPI.DB.open(), u = {}; for (const n of Array.from(db.objectStoreNames)) u[n] = (await WPI.DB.getAll(n)).length; return u; });
  ok(JSON.stringify(v0) === JSON.stringify(v1), "1440: niets opgeslagen in IndexedDB");

  // gedeeld toestel: uitloggen wist de lopende oefening (vrije tekst); de volgende inspecteur krijgt zijn eigen tip
  ok(!!(await lq("u-insp")).voortgang, "voor uitloggen: lopende oefening bewaard");
  await q.evaluate(() => App.logout()); await q.waitForTimeout(400);
  const naUit = await lq("u-insp");
  ok(naUit && !naUit.voortgang && naUit.verborgen === true && !/leiding aansluiten|hijsband rafelig/.test(await q.evaluate(() => localStorage.getItem("wpi_oefen") || "")), "na uitloggen: geen voortgang of vrije tekst meer, ‘Niet nu’ blijft voor deze gebruiker");
  await q.evaluate(() => App.login(null, { id: "u-oefen-test", full_name: "Tweede Inspecteur", role: "inspecteur", functie: "Inspecteur op locatie" })); await q.waitForTimeout(900);
  await q.waitForSelector(".oef-hint", { timeout: 3000 }).catch(() => {});
  ok(await q.locator(".oef-hint").count() === 1, "andere inspecteur op hetzelfde toestel: tip wel zichtbaar");
  await q.evaluate(() => App.oefOpen()); await q.waitForTimeout(300);
  ok(/Begin met oefenen/.test(await q.locator(".oef").innerText()), "andere inspecteur: begint met een lege oefening");
  ok((await q.evaluate(() => window.__csp)).length === 0, "1440: geen CSP-overtredingen");
  await w.ctx.close();
  await b.close();
  console.log("schermafbeeldingen in " + SHOTS);
  console.log("errs " + JSON.stringify(errs));
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.log("FOUT " + (e && e.stack || e)); console.log("errs " + JSON.stringify(errs.concat(["EXC " + (e && e.message)]))); process.exit(1); });
