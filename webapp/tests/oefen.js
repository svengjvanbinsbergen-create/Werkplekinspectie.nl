// Werkplekinspectie — tests/oefen.js: de Oefeninspectie (js/oefen.js) helemaal doorlopen als inspecteur.
//
//  - de tip "Nieuw als inspecteur?" staat op Vandaag en Inspecties bij een inspecteur zonder eigen inspecties
//    (niet bij een coördinator); "Niet nu" haalt hem weg, maar alleen voor die gebruiker;
//  - "Oefenen" in het accountmenu opent de oefening; elk oefenscherm toont het label "Oefening", zonder
//    meldingenbalk, bel of accountknop en zonder tabbalk;
//  - scène 1 (pomp, direct gevaar): eerst stoppen, gesprek met positief benoemen, waarneming (aannames worden
//    letterlijk benoemd, "zit vast aan" niet), TRA-Voorstel, zelf oordelen, actievoorstel met "Ter plaatse"
//    en terugkoppeling als urgentie of actie niet bij het gevaar past, "wie doet wat" (verzonnen collega's);
//  - scène 2 (sleuf): taak via het gesprek + Voorstel, welke zinnen tellen, bij A volgt een actievoorstel en
//    daarna positief benoemen zonder "alles was in orde";
//  - scène 3 (schakelkast): open vraag, zelf koppelen, A volgens de TRA, "Niets gedaan" + Planmatig krijgt
//    terugkoppeling, "Direct gecorrigeerd" verbergt de urgentie, positief benoemen;
//  - samenvatting en "Klaar om echt te beginnen"; teksten zonder "!", "≠", "dringendheid" of echte collega's;
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
    ok((await lab.count()) === 1 && (await lab.isVisible()) && /Oefening/.test(await lab.innerText()), naam + ": label ‘Oefening’ zichtbaar");
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
  await knop("Begin met oefenen").click(); await wacht();
  ok(await p.locator(".oef-scene svg[role=img]").count() === 1, "scène 1: tekening (inline SVG met beschrijving)");
  ok(/Twee monteurs/.test(await p.locator(".oef-verhaal").innerText()) && await ev(() => document.querySelectorAll(".oef-svg > g[transform^='translate']").length) === 2, "scène 1: tekst en tekening tonen allebei twee monteurs");
  await scherm("s1-ingrijpen");
  await kies("ingrijpen", 1);
  ok(/eerst stoppen/i.test(await fbTekst()) && await knop("Kies opnieuw").count() === 1, "ingrijpen: eerst een foto → uitleg ‘eerst stoppen’ + opnieuw kiezen");
  await knop("Kies opnieuw").click(); await wacht();
  await kies("ingrijpen", 0);
  const ti = await fbTekst();
  ok(/Goed: eerst stoppen/.test(ti) && /Direct gevaar\? Eerst stoppen/.test(ti), "ingrijpen: werk laten stoppen → regel ‘Direct gevaar? Eerst stoppen’");
  await scherm("s1-ingrijpen-terugkoppeling", 1700);
  await verder();

  ok(/staat weer op de grond/.test(await p.locator(".oef-kaart").first().innerText()), "gesprek: de pomp staat weer op de grond");
  await scherm("s1-gesprek", 1700);
  await kies("gesprek", 2);
  ok(/Probeer het anders/.test(await fbTekst()), "gesprek: ja/nee-vraag → probeer het anders");
  await knop("Kies opnieuw").click(); await wacht();
  await kies("gesprek", 0);
  const tg = await fbTekst();
  ok(/Benoem wat goed gaat/.test(tg) && /Een gesprek, geen afvinklijst/.test(tg), "gesprek: positief beginnen + open vraag → regels positief en gesprek");
  await verder();

  // wat zag je? eerst met een aanname (de zin van de kritiek), dan feitelijk
  ok(await ev(() => document.querySelector(".oef-terug").open), "zie: situatie staat open om nog eens te kijken");
  await p.fill("#oef-f-zie", "De pomp zit vast aan een band die kapot is, ik denk dat ze dit vaker doen");
  await scherm("s1-zie");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  const tz = await fbTekst();
  const let1 = await p.locator(".oef-fb .oef-let").innerText();
  ok(/een deel is een aanname/.test(tz) && !/Goed gezien/.test(tz) && !/alleen wat je zelf zag/.test(tz), "zie: met aanname geen ‘Goed gezien’ maar ‘een deel is een aanname’");
  ok(/ik denk dat ze dit vaker doen/.test(let1) && !/“vast”/.test(let1), "zie: de echte aanname wordt letterlijk benoemd, het feitelijke ‘vast’ niet");
  await scherm("s1-zie-aanname");
  await knop("Pas je waarneming aan").click(); await wacht();
  ok(/ik denk/.test(await p.inputValue("#oef-f-zie")), "zie: eigen tekst blijft staan bij aanpassen");
  await p.fill("#oef-f-zie", "De hijsband is aan één rand uitgerafeld en heeft een snee. De put is afgezet.");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  ok(/Goed gezien/.test(await fbTekst()) && await p.locator(".oef-fb .oef-let").count() === 0, "zie: feitelijk → ‘Goed gezien’, geen aanname-melding");
  await verder();

  ok(/Voorstel/.test(await p.locator(".oef-vs .lbl.vs").innerText()) && await p.locator(".oef-vs .vpick").count() === 1, "koppel: TRA-stap als Voorstel");
  ok(await p.locator(".seg button").count() === 0, "koppel: nog geen oordeel in beeld");
  await scherm("s1-koppel", 1500);
  await p.locator(".oef-vs .vpick").click(); await wacht();
  ok(/altijd een Voorstel/.test(await fbTekst()), "koppel: uitleg ‘een koppeling is altijd een Voorstel’");
  await verder();

  // oordeel: niets voorgekozen, kiezen met het toetsenbord
  const pressed = await ev(() => [...document.querySelectorAll(".oef .seg button")].map((x) => x.getAttribute("aria-pressed") + "|" + x.className));
  ok(pressed.length === 3 && pressed.every((x) => x.startsWith("false") && !/on-/.test(x)), "oordeel: C/A/V aanwezig en niets voorgekozen");
  ok(await p.locator('button[data-args=\'["NVT"]\']').count() === 1, "oordeel: ook ‘Niet van toepassing’");
  await scherm("s1-oordeel", 1500);
  await p.locator(".oef .seg .t-V").focus(); await p.keyboard.press("Enter"); await wacht(300);
  const tv = await fbTekst();
  ok(/kiest nooit voor je/.test(tv) && /Jij beoordeelt/.test(tv) && /schrijf je hierna een actievoorstel/.test(tv), "oordeel V (toetsenbord): jouw keuze telt, actievoorstel volgt");
  await knop("Toch anders kiezen").click(); await wacht();
  await p.locator(".oef .seg .t-A").focus(); await p.keyboard.press("Enter"); await wacht(300);
  ok(/\[A\]/.test(await p.locator(".oef-gekozen").innerText()) && /Klopt met de TRA/.test(await fbTekst()), "oordeel A: klopt met de TRA");
  await scherm("s1-oordeel-terugkoppeling");
  await verder();

  // actievoorstel: de walk van de kritiek (V-achtig ‘later’, niets gedaan, planmatig) krijgt correctie
  const vast = p.locator("#oef-vastleg");
  ok(await vast.isDisabled(), "actie: vastleggen pas als alles is ingevuld");
  ok(await p.locator("#oef-terPlaatse-maatregel").count() === 1 && /hijsen gestopt/.test(await p.locator("#oef-terPlaatse-maatregel").innerText()), "actie: keuze ‘Ter plaatse’ met ‘Maatregel genomen (hijsen gestopt)’");
  ok(!/Winfred|houder|Toetser \(/.test(await p.locator(".oef").innerText()), "actie: de inspecteur kiest geen actiehouder of toetser");
  await p.fill("#oef-f-actie", "Band later eens vervangen");
  await p.click("#oef-terPlaatse-niets"); await wacht();
  await p.click("#oef-prio-planmatig"); await wacht();
  ok((await p.inputValue("#oef-f-actie")) === "Band later eens vervangen", "actie: eigen tekst blijft staan na een keuze");
  await vast.click(); await wacht();
  const tc = await fbTekst();
  ok(/Let op: dit is direct gevaar/.test(tc) && await p.locator(".oef-corr li").count() === 3 && /Kies ‘Direct’/.test(tc) && /‘Later’ past niet/.test(tc) && /Maatregel genomen/.test(tc), "actie: ‘later’ + niets gedaan + planmatig → drie correcties");
  ok(!/Actievoorstel genoteerd/.test(tc), "actie: geen neutrale ‘genoteerd’ bij een onveilig voorstel");
  await scherm("s1-actie-correctie");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  ok(await p.locator("#oef-prio-direct").count() === 0, "actie: bij ‘Direct gecorrigeerd’ geen urgentie te kiezen");
  await p.click("#oef-terPlaatse-maatregel"); await wacht();
  ok(await vast.isDisabled(), "actie: na ‘Maatregel genomen’ weer een urgentie nodig");
  await p.getByRole("button", { name: "Laat de app een actie voorstellen" }).click(); await wacht();
  ok((await p.inputValue("#oef-f-actie")).length > 10 && /Voorstel/.test(await p.locator("#oef-actiekop").innerText()), "actie: app-voorstel staat er als ‘Voorstel’");
  await p.locator("#oef-prio-direct").focus(); await p.keyboard.press("Space"); await wacht();
  ok(!(await vast.isDisabled()), "actie: vastleggen kan (toetsenbord)");
  await scherm("s1-actie");
  await vast.click(); await wacht();
  const ta = await fbTekst();
  ok(/Past bij wat je zag/.test(ta) && await p.locator(".oef-corr").count() === 0 && /Afgerond pas na toetsing/.test(ta), "actie: Direct + maatregel + band afkeuren → past bij het gevaar");
  await scherm("s1-actie-terugkoppeling");
  await verder();

  // wie doet wat (de coördinator kiest; verzonnen collega's)
  const ctrl = knop("Controleer");
  await p.click("#oef-verdeling-0"); await wacht();
  ok(await ctrl.isDisabled(), "rollen: Controleer pas als beide vragen beantwoord zijn (ook bij keuze 0)");
  await p.click("#oef-verdeling-1"); await wacht(); await p.click("#oef-klaar-0"); await wacht();
  await scherm("s1-rollen");
  await ctrl.click(); await wacht();
  ok(/Bijna/.test(await fbTekst()) && await p.locator(".oef-quiz-uit li.mis").count() === 2, "rollen: Sanne/Sanne en ‘na ophangen’ → uitleg");
  await knop("Kies opnieuw").click(); await wacht();
  await p.click("#oef-verdeling-0"); await wacht(); await p.click("#oef-klaar-1"); await wacht();
  await ctrl.click(); await wacht();
  const tr = await fbTekst();
  ok(/Je kent de regels/.test(tr) && /De toetser is niet de actiehouder/.test(tr) && /QHSE-manager is nooit actiehouder/.test(tr) && /Afgerond pas na toetsing/.test(tr) && /coördinator kiest/.test(tr), "rollen: drie actieregels, de coördinator kiest");
  await scherm("s1-rollen-terugkoppeling");
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
  ok(/jij bevestigde/i.test(await fbTekst()), "taak: ‘jij bevestigde het Voorstel’");
  await verder();
  // welke zinnen tellen: eerst niets aantikken, dan met het toetsenbord
  await knop("Controleer").click(); await wacht();
  ok(/Bijna/.test(await fbTekst()), "quiz: niets aangetikt → bijna");
  await knop("Terug").click(); await wacht();
  const chips = p.locator(".oef-keuzes .oef-chip");
  await chips.nth(0).focus(); await p.keyboard.press("Space"); await wacht(100);
  await p.keyboard.press("Tab"); await p.keyboard.press("Space"); await wacht(100);
  ok(await chips.nth(0).getAttribute("aria-pressed") === "true" && await chips.nth(1).getAttribute("aria-pressed") === "true" && await chips.nth(2).getAttribute("aria-pressed") === "false", "quiz (toetsenbord): twee waarnemingen aangetikt, aanname niet");
  await scherm("s2-quiz");
  await knop("Controleer").click(); await wacht();
  ok(/Precies/.test(await fbTekst()), "quiz: alles goed → ‘Precies: alleen wat je ziet’");
  await verder();
  await p.locator(".oef-vs .vpick").click(); await wacht(); await verder();
  // jij beoordeelt: A in de sleuf → er volgt een actievoorstel
  await p.locator(".oef .seg .t-A").click(); await wacht();
  ok(/Jij kiest A/.test(await fbTekst()), "sleuf A: jouw keuze telt");
  await verder();
  ok(/Actievoorstel/.test(await p.locator(".oef h1").innerText()) && await p.locator("#oef-vastleg").count() === 1, "sleuf A: actievoorstel volgt (de app overrulet je oordeel niet)");
  await p.fill("#oef-f-actie", "Gasmeter vóór gebruik laten testen en dat noteren");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-kort"); await wacht();
  await scherm("s2-actie");
  await p.click("#oef-vastleg"); await wacht();
  ok(/Past bij wat je zag/.test(await fbTekst()), "sleuf: actievoorstel genoteerd");
  await verder();
  const vraagPos = await p.locator(".oef-vraag").innerText();
  ok(/Wat gaat hier wél goed/.test(vraagPos) && !/Alles wat je zag was in orde/.test(await p.locator(".oef").innerText()), "positief na A: ‘wat gaat hier wél goed’, niet ‘alles was in orde’");
  await knop("Geef een voorbeeld").click(); await wacht();
  ok((await p.inputValue("#oef-f-positief")).length > 10, "positief: voorbeeld ingevuld (Voorstel)");
  await scherm("s2-positief");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  ok(/Mooi benoemd/.test(await fbTekst()), "positief: mooi benoemd");
  await verder();

  // ================= scène 3: bij de schakelkast =================
  await scherm("s3-gesprek");
  await kies("gesprek", 1);
  ok(/Probeer een open vraag/.test(await fbTekst()), "gesprek: ja/nee-vraag → tip voor een open vraag");
  await knop("Kies opnieuw").click(); await wacht();
  await kies("gesprek", 0);
  ok(/goede open vraag/.test(await fbTekst()), "gesprek: open vraag → goede vraag");
  await verder();
  ok(await p.locator(".oef-vs .vpick").count() === 0 && await ev(() => document.querySelector(".oef .zelfkies").open), "koppel scène 3: geen voorstel, zelf kiezen staat open");
  await p.locator('.zpick[data-args=\'["5.2"]\']').click(); await wacht();
  ok(/zelf gekozen/.test(await p.locator(".oef-gekozen").innerText()), "koppel: zelf gekozen TRA-stap");
  await verder();
  await p.locator(".oef .seg .t-V").click(); await wacht();
  const t3v = await fbTekst();
  ok(/Jouw oordeel telt/.test(t3v) && /Dat is een afwijking/.test(t3v) && !/Goed onderbouwd/.test(t3v), "kast V: uitleg dat een ontbrekend label volgens de TRA een afwijking is");
  await knop("Toch anders kiezen").click(); await wacht();
  await p.locator(".oef .seg .t-A").click(); await wacht();
  ok(/Klopt met de TRA/.test(await fbTekst()), "kast A: klopt met de TRA (slot én label)");
  await verder();
  await p.fill("#oef-f-actie", "Label met naam en datum aan het slot hangen");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t3a = await fbTekst();
  ok(/Let op: hij begint zo/.test(t3a) && await p.locator(".oef-corr li").count() === 2, "kast: niets gedaan + planmatig → terugkoppeling (hij begint zo)");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  ok(await p.locator("#oef-prio-kort").count() === 0, "kast: direct gecorrigeerd → geen urgentie meer");
  await scherm("s3-actie");
  await p.click("#oef-vastleg"); await wacht();
  ok(/jij zag het herstel/i.test(await fbTekst()), "direct gecorrigeerd: alleen afgerond omdat jij het herstel zag (toetsing)");
  await verder();
  ok(/Wat gaat hier goed/.test(await p.locator(".oef-vraag").innerText()), "kast: positief benoemen tegen de monteur");
  await p.fill("#oef-f-positief", "Goed dat je hebt afgeschakeld en rustig werkt met je handschoenen aan.");
  await p.locator('button[data-action="oefFeedback"]').click(); await wacht();
  ok(/Mooi benoemd/.test(await fbTekst()), "kast: positief benoemd");
  await verder();

  // ================= samenvatting =================
  ok(/Oefening afgerond/.test(await p.locator(".oef h1").innerText()), "samenvatting: ‘Oefening afgerond’");
  ok(await p.locator(".oef-regels li").count() === 8, "samenvatting: acht methoderegels");
  const lijst = await p.locator(".oef-lijst").innerText();
  ok(/werk laten stoppen/.test(lijst) && /rollen geoefend/.test(lijst) && /waarneming geoefend/.test(lijst) && (lijst.match(/positief benoemd/g) || []).length === 2 && (lijst.match(/actievoorstel geschreven/g) || []).length === 3, "samenvatting: per scène wat je deed");
  ok(await knop("Klaar om echt te beginnen").count() === 1, "samenvatting: ‘Klaar om echt te beginnen’");
  await scherm("samenvatting");
  const alles = teksten.join("\n");
  for (const [re, wat] of [[/!/, "uitroepteken"], [/≠/, "≠-teken"], [/dringendheid/i, "‘dringendheid’"], [/Winfred|Loerts|Douwe|Björn/, "echte collega"], [/moet opgelost\b/, "‘moet opgelost’"], [/inspreken kan dan ook/, "dubbel ‘ook’"]])
    ok(!re.test(alles), "teksten: geen " + wat);

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
  await ev(() => { const o = App.oefState(); o.s = 0; o.i = 5; o.fb = false; o.a[0].oordeel = "A"; App.oefToon(); }); await wacht();
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
  const stappen = [[-1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 0], [1, 1], [1, 3], [1, 4], [1, 5], [2, 0], [2, 1], [2, 3], [2, 4], [3, 0]];
  for (const [s, i] of stappen) {
    for (const fb of s >= 0 && s < 3 ? [false, true] : [false]) {
      await q.evaluate(([s, i, fb]) => { const o = App.oefState(); o.s = s; o.i = i; o.fb = fb; const a = o.a[s];
        if (a) Object.assign(a, { ingrijpen: 0, gesprek: 0, taak: "leiding aansluiten", gekozenTaak: "Persleiding aansluiten in de sleuf", zie: "hijsband rafelig", regel: s === 2 ? "5.2" : s === 1 ? "4.1" : "2.1", oordeel: "A", actie: "Actie", prio: "direct", terPlaatse: "maatregel", positief: "Goed zo", verdeling: 0, klaar: 1, quiz: [true, true], quizKlaar: true, actieKlaar: true });
        App.oefToon(); }, [s, i, fb]);
      await q.waitForTimeout(200);
      const r = await q.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, lab: !!document.querySelector(".oef-label"), h1: (document.querySelector(".oef h1") || {}).textContent }));
      ok(r.x <= 0 && r.lab && r.h1, `1440 scène ${s} stap ${i}${fb ? " terugkoppeling" : ""} (${r.h1}): label en geen horizontaal scrollen`);
    }
  }
  // bij C in de sleuf geen actievoorstel; samenvatting telt de quiz ook zonder aangetikte zinnen
  const naC = await q.evaluate(() => { const o = App.oefState(); o.s = 1; o.i = 3; o.fb = true; o.a[1].oordeel = "C"; App.oefVerder(); return document.querySelector(".oef h1").textContent; });
  ok(naC === "Benoem wat goed gaat", "sleuf C: na het oordeel meteen positief benoemen (geen actie)");
  const sam = await q.evaluate(() => { const o = App.oefState(); o.a[1].quiz = undefined; o.s = 3; o.i = 0; App.oefToon(); return document.querySelector(".oef-lijst").innerText; });
  ok(/waarneming geoefend/.test(sam), "samenvatting: ‘waarneming geoefend’ ook zonder aangetikte zinnen");
  await q.evaluate(() => { const o = App.oefState(); o.s = 0; o.i = 5; o.fb = false; o.a[0].oordeel = "A"; App.oefToon(); }); await q.waitForTimeout(250);
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
