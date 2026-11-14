// Werkplekinspectie — tests/oefen.js: de Oefeninspectie (js/oefen.js) helemaal doorlopen als inspecteur.
//
//  - de tip "Nieuw als inspecteur?" staat op Vandaag en Inspecties bij wie inspecteert (coördinator, hoofd) en nog
//    geen eigen inspecties heeft (niet bij een QHSE-manager); "Niet nu" haalt hem weg, maar alleen voor die gebruiker;
//  - "Oefenen" in het accountmenu opent de oefening; elk oefenscherm toont het label "Oefening", zonder
//    meldingenbalk, bel of accountknop en zonder tabbalk;
//  - kort: hooguit 12 stappen; elke methoderegel komt bij precies één stap in beeld (één kaartje);
//  - scène 1 (pomp, direct gevaar): eerst stoppen (zonder de goede keuze geen ‘Verder’), gesprek met open vraag,
//    waarneming (aannames worden letterlijk benoemd, "zit vast aan" niet), TRA-Voorstel en zelf oordelen op één
//    scherm (uitleg noemt wat de TRA vraagt, geen verzonnen meerderheid), actievoorstel met "Ter plaatse" en
//    terugkoppeling; bij "Direct gecorrigeerd" één zin over wie toetst (geen tegenstrijdige coördinator-tip);
//  - scène 1: V bij de beschadigde hijsband → één rustige uitleg; de stap daarna heet ‘Actievoorstel’ (‘wat moet er
//    gebeuren’), niet ‘Verbetervoorstel’ (direct gevaar is geen verbeterpunt);
//  - scène 2 (sleuf, in orde volgens de TRA): taak via het gesprek + Voorstel; C en V zijn allebei een goed oordeel:
//    bij C rustige uitleg, bij V alleen de vraag om een concreet verbetervoorstel (geen ‘kijk nog eens’, niet terug
//    naar het oordeel, geen afwijking in de samenvatting, slotvraag zonder ‘wél’); alleen bij A één rustige ‘kijk nog
//    eens’-hint op het oordeelscherm (zonder dubbele instructie); daarna wordt het actievoorstel bij A gewoon
//    aanvaard (geen ‘actie niet nodig’, niet terug naar het oordeel, niet nog eens in de samenvatting);
//    ‘Nog één ding’ / ‘Nog twee dingen’ klopt met het aantal punten; daarna positief benoemen;
//  - scène 3 (schakelkast): open vraag, de inspecteur ziet het label zelf ophangen, zelf koppelen; C noemt de
//    actiestap alleen als iets dat volgt bij A; A volgens de TRA, "Direct gecorrigeerd" is afgerond omdat jij het
//    herstel zag; een leeg actievoorstel (‘niks’) bij A of V wordt ook met ‘Direct gecorrigeerd’ niet aanvaard of
//    afgerond (ook niet in de samenvatting); de kop van de terugkoppeling volgt de soort punten (tekst → ‘concreter’,
//    alleen Ter plaatse → ‘Kijk nog eens bij Ter plaatse’); put C noemt wat er bij A volgt en dat C geen actie geeft;
//  - samenvatting (alleen wat je echt deed) en "Klaar om echt te beginnen"; teksten zonder "!", "≠",
//    "dringendheid", echte collega's of de afgekeurde formuleringen;
//  - afkeuring ronde 4, via de knoppen doorgelopen: sleuf V + ‘Ladder vastbinden’ (kort maar concreet) wordt aanvaard
//    en de samenvatting zegt ‘Goed gedaan’ zonder TRA-afwijking; sleuf V + ‘Direct gecorrigeerd’ → de samenvatting
//    noemt alleen ‘Ter plaatse’ (geen ‘week je af van de TRA’, geen ‘een paar keuzes’); kast V + label + gecorrigeerd →
//    actiescherm én samenvatting ‘afgerond’; kast A + ‘Toolbox over LOTOTO …’ is concreet (preventief; open, ronde 5);
//    alle negen oordelen (put/sleuf/kast × C/A/V): precies één of geen TRA-afwijking, actiescherm = samenvatting over
//    ‘afgerond’, het oordeel van de oefenaar blijft staan; ‘Beter opletten’ blijft vaag (tekstpunt, geen TRA-afwijking);
//  - afkeuring ronde 5, via de knoppen: put A + ‘Band omdraaien en verder hijsen’ → ‘zo blijft het gevaar’ (niet
//    aanvaard, geen ‘de band gaat uit gebruik’, samenvatting geen ‘Goed gedaan’); put A + alleen een toolbox → de band
//    moet nú uit gebruik; put afkeuren + toolbox → aanvaard, de tekst volgt wat je schreef; kast ‘Slot eraf halen en
//    doorwerken’ → niet aanvaard, nooit afgerond; kast toolbox (+ label) met ‘Direct gecorrigeerd’ → concreet maar OPEN
//    (een toolbox die nog gegeven moet worden is niet getoetst), actiescherm = samenvatting; sleuf V + ‘Voorzichtiger
//    werken’ / ‘Gewoon blijven opletten’ → vaag; samenvatting met een TRA-afwijking én andere punten telt en noemt de
//    scènes (geen ‘Daarnaast nog iets’, geen ‘: de urgentie:’);
//  - afkeuring ronde 6, via de knoppen: put ‘Niet meer met deze band hijsen’ → aanvaard (ook met woorden ertussen); put
//    ‘Hijsband afkeuren’, het Voorstel en ‘vervangen door nieuwe gekeurde band’ → aanvaard zonder verzonnen ‘je pakt ook de
//    oorzaak aan’ (afkeuren/gekeurd is geen oorzaak); put ‘Nieuwe band halen’ → niet aanvaard (de kapotte band gaat niet
//    uit gebruik); kast ‘Afspraak …’ / ‘Instructie …’ / ‘Toolbox …’ + ‘Direct gecorrigeerd’ → het invoerscherm zegt al dat
//    de actie open blijft en vraagt een urgentie (vastleggen wacht daarop), de tekst noemt wat de oefenaar schreef;
//    kast ‘Label opgehangen en monteur uitleg gegeven’ (verleden tijd) → afgerond; kast ‘Label ontbreekt aan het slot’
//    (een bevinding) → niet aanvaard; put V onveilig → ‘zo blijft het gevaar bestaan:’ met dát punt eerst;
//  - een deel met het toetsenbord (Tab/Enter/Spatie);
//  - NIETS wordt opgeslagen: alle IndexedDB-stores (inspecties, acties, concept, planning, outbox, …) hebben
//    na afloop evenveel records, er loopt geen inspectie, de acties en meldingen zijn gelijk;
//  - wpi_oefen is per gebruiker en de lopende oefening (met vrije tekst) verdwijnt bij uitloggen;
//  - geen pageerrors, console-errors of CSP-overtredingen; geen horizontaal scrollen op 390 en 1440.
//
//   BASE=http://localhost:8540 node /home/user/Werkplekinspectie.nl/webapp/tests/oefen.js
//
// Schermafbeeldingen (390×844, dsf 2) in OEFEN_SHOTS, anders TESTS_OUT, anders de huidige map.
// Logt in met eigen (verzonnen) profielen, niet met de demo-accounts uit kern.js (die kunnen veranderen).
// Eindigt met "errs [...]" (leeg = alles in orde).
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8540";
const SHOTS = process.env.OEFEN_SHOTS || process.env.TESTS_OUT || process.cwd();
fs.mkdirSync(SHOTS, { recursive: true });
const errs = [];
// eigen verzonnen profiel: de demo-accounts in kern.js kunnen veranderen
// (coördinator = inspecteert; vóór de rollenwijziging herkende de app alleen de rol "inspecteur")
const INSP = { id: "u-oefen-insp", full_name: "Oefen Inspecteur", role: "coordinator", functie: "Montage Coördinator" };
const QHSE = { id: "u-oefen-qhse", full_name: "Oefen Adviseur", role: "qhse", functie: "QHSE-manager" };
const ok = (cond, wat, extra) => { if (!cond) errs.push("OEFEN: " + wat); console.log((cond ? "  ok    " : "  FOUT  ") + wat + (!cond && extra !== undefined ? " · " + JSON.stringify(extra) : "")); };

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
  await ev((u) => App.login(null, u), INSP); await wacht(900);
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
  ok(await p.locator(".oef-hint").count() === 1, "Vandaag: tip ‘Nieuw als inspecteur?’ voor wie inspecteert en nog geen inspecties heeft");
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
  // C bij de beschadigde hijsband: uitleg wat de TRA zegt én wat er volgt (bij A een actievoorstel; bij C geen actie)
  await p.locator(".oef .seg .t-C").click(); await wacht(300);
  const t1c = await fbTekstR();
  ok(/Jouw oordeel: Conform/.test(t1c) && /Kies je A, dan volgt een actievoorstel/.test(t1c) && /hijsen is gestopt/.test(t1c) && /Blijf je bij C, dan wordt er voor de beschadigde band geen actie vastgelegd/.test(t1c) && await knop("Verder").count() === 1,
    "put C: uitleg noemt wat er volgt (bij A een actievoorstel, bij C geen actie); Verder blijft (jij kiest)");
  await knop("Toch anders kiezen").click(); await wacht();
  await p.locator(".oef .seg .t-V").focus(); await p.keyboard.press("Enter"); await wacht(300);
  const tv = await fbTekstR();
  ok(/Jouw oordeel: Verbeterpunt/.test(tv) && /Volgens de TRA mag er met een beschadigde hijsband niet gehesen worden/.test(tv) && /Jij beoordeelt/.test(tv) && /je schrijft hierna wat er moet gebeuren/.test(tv) && !/verbetervoorstel|wat kan er concreet beter/i.test(tv) && await p.locator(".oef-fb.let").count() === 1 && await knop("Verder").count() === 1, "oordeel V bij de hijsband (toetsenbord): rustige uitleg wat de TRA vraagt, ‘je schrijft hierna wat er moet gebeuren’ (geen verbetervoorstel), Verder blijft (jij kiest)");
  await scherm("s1-oordeel-V-terugkoppeling");
  await verder();
  ok(/Actievoorstel/.test(await p.locator(".oef h1").innerText()) && /Wat moet er gebeuren/.test(await p.locator("#oef-actiekop").innerText()) && /Jouw actievoorstel/.test(await p.locator('label[for="oef-f-actie"]').innerText()) && /Actievoorstel vastleggen/.test(await p.locator("#oef-vastleg").innerText()) && !/Verbetervoorstel|Wat kan er beter/.test(await p.locator(".oef").innerText()),
    "put V: de stap heet ‘Actievoorstel’ (‘Wat moet er gebeuren?’), geen ‘Verbetervoorstel’ bij direct gevaar");
  await p.getByRole("button", { name: "Terug" }).click(); await wacht(300);
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
  ok(/stelt iemand uit het team de actie in: wie haar uitvoert en wie toetst/.test(await p.locator("#oef-wie").innerText()), "actie: zonder keuze ‘iemand uit het team stelt de actie in: wie uitvoert en wie toetst’");
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
  ok(!(await p.locator("#oef-prio-direct").isVisible()) && /jij de toetser/.test(wieG) && !/coördinator/.test(wieG) && await p.locator(".oef .oef-wie").count() === 1, "actie: bij ‘Direct gecorrigeerd’ één zin (jij bent de toetser), geen tegenstrijdige coördinator-tip");
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
  // C: in orde volgens de TRA → rustige bevestiging, en V kan ook
  await p.locator(".oef .seg .t-C").click(); await wacht();
  const t2c = await fbTekstR();
  ok(/Jouw oordeel: Conform/.test(t2c) && await p.locator(".oef-fb.let").count() === 0 && /past ook V/.test(t2c) && !/Kijk nog eens/.test(t2c), "sleuf C: goed oordeel, geen bijsturen; uitleg zegt dat V ook kan");
  await knop("Toch anders kiezen").click(); await wacht();
  // A: de enige keuze die een rustige ‘kijk nog eens’ krijgt (één keer, hier); de oefenaar mag erbij blijven
  await p.locator(".oef .seg .t-A").click(); await wacht();
  const t2 = await fbTekstR();
  ok(/Jouw oordeel: Afwijking/.test(t2) && /Kijk nog eens/.test(t2) && /de TRA vraagt een gasmeter/.test(t2) && /dan past V/.test(t2) && await p.locator(".oef-fb.let").count() === 1 && await knop("Verder").count() === 1 && !/inspecteurs kiezen/.test(t2),
    "sleuf A: rustige ‘kijk nog eens’ (i), uitleg noemt wat de TRA vraagt, ‘Verder’ blijft (de app overrulet niet)");
  ok((t2.match(/hierna/g) || []).length === 1 && !/Omdat je A koos/.test(t2) && /blijf je bij A en schrijf je hierna wat er moet gebeuren/.test(t2), "sleuf A: de instructie voor de volgende stap staat er één keer (geen dubbele ‘schrijf je hierna’)");
  await scherm("s2-oordeel-A-terugkoppeling");
  await verder();
  ok(/Actievoorstel/.test(await p.locator(".oef h1").innerText()) && await p.locator("#oef-vastleg").count() === 1, "sleuf A: actievoorstel volgt (de app overrulet je oordeel niet)");
  // A + ‘niks’ → alleen vragen om een concreet voorstel (geen groen vinkje, maar ook niet terug naar het oordeel)
  await p.fill("#oef-f-actie", "niks");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await scherm("s2-actie");
  await p.click("#oef-vastleg"); await wacht();
  const t2a = await fbTekstR();
  ok(!/Past bij wat je zag/.test(t2a) && await p.locator(".oef-fb.let").count() === 1 && await p.locator(".oef-hierna").count() === 0 && /Maak je actievoorstel concreet/.test(t2a) && /Nog één ding:/.test(t2a) && await p.locator(".oef-corr li").count() === 1 && await p.locator(".oef-fb .oef-regel").count() === 0,
    "sleuf A + ‘niks’: rustig vragen om een concreet actievoorstel (één punt, ‘Nog één ding’), geen groen vinkje");
  ok(!/Volgens de TRA was|niet nodig|Wil je je oordeel|nog eens bekijken|dan past V/.test(t2a) && await knop("Bekijk je oordeel opnieuw").count() === 0, "sleuf A + ‘niks’: het oordeel komt niet nog eens terug");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  // concreet voorstel, maar ‘Maatregel genomen’: de kop vraagt niet om ‘concreter’, alleen om ‘Ter plaatse’
  await p.fill("#oef-f-actie", "Gasmeter laten kalibreren voor verder werken in de sleuf.");
  await p.click("#oef-terPlaatse-maatregel"); await wacht(); await p.click("#oef-prio-direct"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t2am = await fbTekstR();
  ok(/Kijk nog eens bij ‘Ter plaatse’/.test(t2am) && !/concreter|concreet/.test(t2am) && /Nog één ding:/.test(t2am) && await p.locator(".oef-corr li").count() === 1 && /Niets gedaan/.test(t2am) && !/Wil je je oordeel|niet nodig/.test(t2am),
    "sleuf A + concreet voorstel + ‘Maatregel genomen’: kop ‘Kijk nog eens bij Ter plaatse’, niet ‘Maak het nog wat concreter’");
  await scherm("s2-actie-A-terplaatse");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  // het scenario van de trainer: een concreet actievoorstel bij A wordt aanvaard
  await p.fill("#oef-f-actie", "Een tweede gasmeter bij de wacht bovenaan de sleuf hangen, zodat hij ook zelf gewaarschuwd wordt.");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t2ak = await fbTekstR();
  ok(/Actievoorstel vastgelegd/.test(t2ak) && /Je oordeel is van jou/.test(t2ak) && await p.locator(".oef-fb.let").count() === 0 && await p.locator(".oef-corr").count() === 0 && await p.locator(".oef-hierna").count() === 1,
    "sleuf A + concreet actievoorstel: aanvaard (vinkje, Hierna)");
  ok(!/Volgens de TRA|niet nodig|Kijk nog eens|Wil je je oordeel|dan past V/.test(t2ak) && await knop("Bekijk je oordeel opnieuw").count() === 0, "sleuf A + concreet actievoorstel: geen tegenspraak (‘actie niet nodig’), niet terug naar het oordeel");
  await scherm("s2-actie-A-aanvaard");
  await verder();
  const vraagPosA = await p.locator(".oef-vraag").innerText();
  ok(/Wat gaat hier wél goed/.test(vraagPosA) && !/Alles wat je zag was in orde/.test(await p.locator(".oef").innerText()), "positief na A: ‘wat gaat hier wél goed’, niet ‘alles was in orde’");
  // terug naar het oordeel (zelf, met Terug) om V te oefenen
  await p.getByRole("button", { name: "Terug" }).click(); await wacht();
  await p.getByRole("button", { name: "Terug" }).click(); await wacht(300);
  ok(/Koppel en beoordeel/.test(await p.locator(".oef h1").innerText()) && await p.locator(".oef .seg button").count() === 3, "sleuf: met Terug zelf terug naar het oordeel");
  // V: in orde maar kan beter — een goed oordeel: alleen vragen om een concreet verbetervoorstel
  await p.locator(".oef .seg .t-V").click(); await wacht(300);
  const t2v = await fbTekstR();
  ok(/Jouw oordeel: Verbeterpunt/.test(t2v) && /Dat kan/.test(t2v) && /Volgens de TRA is het hier in orde/.test(t2v) && /schrijf je hierna een verbetervoorstel/.test(t2v) && await p.locator(".oef-fb.let").count() === 0 && await p.locator(".oef-fb .oef-fb-ic svg").count() === 1,
    "sleuf V: goed oordeel (vinkje, geen i), uitleg ‘dat kan’ + vraag om een verbetervoorstel");
  ok(!/Kijk nog eens|afwijking|niet nodig|nog eens bekijken|Wil je je oordeel/i.test(t2v), "sleuf V: geen ‘kijk nog eens’, geen ‘afwijking’, geen ‘actie niet nodig’");
  await scherm("s2-oordeel-V-terugkoppeling");
  await p.locator(".oef-fb").scrollIntoViewIfNeeded(); await wacht(80);
  await p.screenshot({ path: path.join(SHOTS, "s2-oordeel-V-terugkoppeling-scherm.png") });
  await verder();
  ok(/Verbetervoorstel/.test(await p.locator(".oef h1").innerText()) && /Jouw verbetervoorstel/.test(await p.locator('label[for="oef-f-actie"]').innerText()) && /Wat kan er beter/.test(await p.locator("#oef-actiekop").innerText()) && /Verbetervoorstel vastleggen/.test(await p.locator("#oef-vastleg").innerText()),
    "sleuf V: stap ‘Verbetervoorstel’ (‘Wat kan er beter?’, ‘Verbetervoorstel vastleggen’)");
  await p.fill("#oef-f-actie", "niks");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t2vv = await fbTekstR();
  ok(/Maak het nog wat concreter/.test(t2vv) && /Je oordeel V past hier/.test(t2vv) && /Nog één ding:/.test(t2vv) && await p.locator(".oef-corr li").count() === 1 && /wát kan er beter/.test(t2vv) && !/Volgens de TRA was|niet nodig|Wil je je oordeel|afwijking/i.test(t2vv) && await knop("Bekijk je oordeel opnieuw").count() === 0 && await knop("Pas je verbetervoorstel aan").count() === 1,
    "sleuf V + ‘niks’: alleen vragen om een concreet verbetervoorstel, nooit terug naar het oordeel");
  await knop("Pas je verbetervoorstel aan").click(); await wacht();
  // vaag + ‘Direct gecorrigeerd’: twee punten → ‘Nog twee dingen’, niet ‘Nog één ding’
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t2v2 = await fbTekstR();
  ok(/Bijna: nog even aanvullen/.test(t2v2) && !/Maak het nog wat concreter/.test(t2v2), "sleuf V + ‘niks’ + ‘Direct gecorrigeerd’: gemengde kop (tekst én Ter plaatse)");
  ok(/Nog twee dingen:/.test(t2v2) && !/Nog één ding/.test(t2v2) && await p.locator(".oef-corr li").count() === 2 && /concreet/.test(t2v2) && /Niets gedaan/.test(t2v2), "sleuf V + ‘niks’ + ‘Direct gecorrigeerd’: ‘Nog twee dingen’ met twee punten");
  await knop("Pas je verbetervoorstel aan").click(); await wacht();
  await p.fill("#oef-f-actie", "De ladder bovenaan vastzetten aan de stempel, zodat hij niet kan wegglijden.");
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t2vg = await fbTekstR();
  ok(/Kijk nog eens bij ‘Ter plaatse’/.test(t2vg) && !/concreter|concreet/.test(t2vg) && /Je oordeel V past hier/.test(t2vg), "sleuf V + concreet verbetervoorstel + ‘Direct gecorrigeerd’: kop over Ter plaatse, niet ‘concreter’");
  await scherm("s2-verbetervoorstel-terplaatse");
  ok(/niets veranderd/.test(t2vg) && /Niets gedaan/.test(t2vg) && /Nog één ding:/.test(t2vg) && await p.locator(".oef-corr li").count() === 1 && !/Wil je je oordeel|afwijking/i.test(t2vg) && await knop("Bekijk je oordeel opnieuw").count() === 0, "sleuf V + ‘Direct gecorrigeerd’: je zag geen herstel → ‘Niets gedaan’ (oordeel blijft staan)");
  await knop("Pas je verbetervoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t2vok = await fbTekstR();
  ok(/Verbetervoorstel vastgelegd/.test(t2vok) && /geen afwijking/.test(t2vok) && /mag gewoon doorgaan/.test(t2vok) && await p.locator(".oef-fb.let").count() === 0 && await p.locator(".oef-corr").count() === 0 && await p.locator(".oef-hierna").count() === 1 && !/Volgens de TRA was|niet nodig|Wil je je oordeel/.test(t2vok),
    "sleuf V + concreet verbetervoorstel: geaccepteerd (vinkje, Hierna), geen tegenspraak met de TRA");
  await scherm("s2-verbetervoorstel-terugkoppeling");
  await verder();
  const vraagPos = await p.locator(".oef-vraag").innerText();
  ok(!/wél/.test(vraagPos) && !/aangesproken/.test(vraagPos) && /goed gaat/.test(vraagPos), "positief na V: geen ‘wél’ of ‘aangesproken’ (het werk was in orde) " + JSON.stringify(vraagPos));
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
  await p.locator(".oef .seg .t-C").click(); await wacht();
  const t3c = await fbTekstR();
  ok(/Jouw oordeel: Conform/.test(t3c) && /Kies je A, dan volgt een actievoorstel/.test(t3c) && !/Het herstel leg je vast bij de actie/.test(t3c), "kast C: de actiestap wordt alleen genoemd als iets dat volgt bij A");
  await knop("Toch anders kiezen").click(); await wacht();
  await p.locator(".oef .seg .t-V").click(); await wacht();
  const t3v = await fbTekstR();
  ok(/Jouw oordeel: Verbeterpunt/.test(t3v) && /afwijking, geen verbeterpunt/.test(t3v) && /je schrijft hierna wat er moet gebeuren/.test(t3v) && !/verbetervoorstel/.test(t3v) && !/inspecteurs kiezen/.test(t3v), "kast V: uitleg dat een ontbrekend label volgens de TRA een afwijking is");
  // V + een leeg actievoorstel (‘niks’) + ‘Direct gecorrigeerd’: niet aanvaard, niet afgerond
  await verder();
  await p.fill("#oef-f-actie", "niks");
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t3vn = await fbTekstR();
  ok(/Maak het nog wat concreter/.test(t3vn) && !/Past bij wat je zag|jij de toetser|afgerond/.test(t3vn) && await p.locator(".oef-hierna").count() === 0 && await p.locator(".oef-corr li").count() === 1 && /wat ontbrak er aan het slot/.test(t3vn) && await p.locator(".oef-fb.let").count() === 1,
    "kast V + ‘niks’ + ‘Direct gecorrigeerd’: vraag om een concreet actievoorstel, niet afgerond");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.getByRole("button", { name: "Terug" }).click(); await wacht(300);
  ok(/Koppel en beoordeel/.test(await p.locator(".oef h1").innerText()) && await p.locator(".oef .seg button").count() === 3, "kast: met Terug zelf terug naar het oordeel");
  await p.locator(".oef .seg .t-A").click(); await wacht();
  ok(/Jouw oordeel: Afwijking/.test(await fbTekstR()), "kast A: afwijking (slot én label)");
  await verder();
  ok(/je zag het hangen/.test(await p.locator(".oef-gezien").innerText()), "kast actie: ‘Wat je zag’ staat erbij");
  // A + ‘niks’ + ‘Direct gecorrigeerd’ (de reproductie van de trainer): de tekst telt ook als het herstel gezien is
  await p.fill("#oef-f-actie", "niks");
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t3an = await fbTekstR();
  ok(/Maak het nog wat concreter/.test(t3an) && /Nog één ding:/.test(t3an) && !/Past bij wat je zag|jij de toetser|meteen afgerond/.test(t3an) && await p.locator(".oef-hierna").count() === 0 && await p.locator(".oef-corr li").count() === 1 && await p.locator(".oef-fb .oef-regel").count() === 0,
    "kast A + ‘niks’ + ‘Direct gecorrigeerd’: geen ‘Past bij wat je zag’, niet afgerond, vraag om een concreet actievoorstel");
  await scherm("s3-actie-niks");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  // ‘niks’ + ‘Niets gedaan’: twee punten, de tekst zelf wordt ook bevraagd
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t3an2 = await fbTekstR();
  ok(/Kijk nog eens naar wat je zag/.test(t3an2) && await p.locator(".oef-corr li").count() === 2 && /wat ontbrak er aan het slot/.test(t3an2) && /Direct gecorrigeerd/.test(t3an2), "kast A + ‘niks’ + ‘Niets gedaan’: twee punten (tekst concreet maken én het herstel)");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.fill("#oef-f-actie", "Label met naam en datum aan het slot hangen");
  await p.click("#oef-terPlaatse-niets"); await wacht(); await p.click("#oef-prio-planmatig"); await wacht();
  await p.click("#oef-vastleg"); await wacht();
  const t3a = await fbTekstR();
  ok(/Direct gecorrigeerd/.test(t3a) && await p.locator(".oef-corr li").count() === 1, "kast: niets gedaan → je zag het herstel, kies ‘Direct gecorrigeerd’");
  await knop("Pas je actievoorstel aan").click(); await wacht();
  await p.click("#oef-terPlaatse-gecorrigeerd"); await wacht();
  ok(!(await p.locator("#oef-prio-kort").isVisible()) && !/coördinator/.test(await p.locator("#oef-wie").innerText()), "kast: direct gecorrigeerd → geen urgentie, geen coördinator-tip");
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
  ok(/Goed gedaan/.test(kick), "samenvatting: V in de sleuf is een goed oordeel → ‘Goed gedaan’ (" + kick + ")");
  ok(await p.locator(".oef-regels li").count() === 8 && await p.locator(".oef-regels svg").count() === 0 && await p.locator(".oef-regels .oef-bol").count() === 8, "samenvatting: acht methoderegels met neutrale bolletjes, geen vinkjes");
  const lijst = await p.locator(".oef-lijst").innerText();
  ok(/werk laten stoppen/.test(lijst) && /gesprek begonnen met wat goed gaat/.test(lijst) && /waarneming beschreven/.test(lijst) && /taak gevraagd en bevestigd/.test(lijst) && /open vraag gesteld/.test(lijst) && /herstel gezien, actie afgerond/.test(lijst) && (lijst.match(/positief benoemd/g) || []).length === 1 && (lijst.match(/actievoorstel geschreven/g) || []).length === 1 && (lijst.match(/verbetervoorstel geschreven/g) || []).length === 1, "samenvatting: per scène wat je deed (bij V een verbetervoorstel)");
  ok(await p.locator(".oef-anders").count() === 0 && /\[V\] Verbeterpunt/.test(lijst) && !/Kijk nog eens|jij koos V/.test(lijst), "samenvatting: V in de sleuf staat er als [V] Verbeterpunt, niet als afwijking of ‘kijk nog eens’");
  ok(await knop("Klaar om echt te beginnen").count() === 1, "samenvatting: ‘Klaar om echt te beginnen’");
  await scherm("samenvatting");
  const alles = teksten.join("\n");
  for (const [re, wat] of [[/!/, "uitroepteken"], [/≠/, "≠-teken"], [/dringendheid/i, "‘dringendheid’"], [/Winfred|Loerts|Douwe|Björn/, "echte collega"], [/moet opgelost\b/, "‘moet opgelost’"], [/inspreken kan dan ook/, "dubbel ‘ook’"],
    [/inspecteurs kiezen/, "verzonnen meerderheid"], [/Kies nog eens/, "dubbel ‘Kies nog eens’ boven ‘Kies opnieuw’"], [/niets wordt opgeslagen|er wordt niets opgeslagen/, "‘niets wordt opgeslagen’"], [/Klopt met de TRA/, "‘Klopt met de TRA’"], [/Dit zie je niet nu/, "‘Dit zie je niet nu’"], [/blijft het werk en de controle/, "‘blijft het werk en de controle’"], [/Zeg het hem\./, "‘Zeg het hem.’"], [/helpt je begrijpen/, "‘helpt je begrijpen’"], [/10 minuten/, "‘10 minuten’"], [/Volgens de TRA was dit in orde|Een actie is dan niet nodig/, "‘actie niet nodig’ na een actievoorstel"], [/Wil je je oordeel/, "terugsturen naar het oordeel"]])
    ok(!re.test(alles), "teksten: geen " + wat);
  ok(/±5 minuten/.test(alles), "teksten: ±5 minuten");

  // ---- niets opgeslagen ----
  const na = await tellingen();
  console.log("tellingen na afloop", JSON.stringify(na));
  ok(JSON.stringify(na) === JSON.stringify(voor), "niets opgeslagen: IndexedDB-stores, acties, meldingen en lopende inspectie ongewijzigd");
  const ls = await lsU(INSP.id);
  ok(ls && ls.voortgang && ls.voortgang.s === 3, "voortgang alleen in localStorage ‘wpi_oefen’, per gebruiker");

  await knop("Klaar om echt te beginnen").click(); await wacht(700);
  ok(await ev(() => location.hash) === "#/vandaag", "Klaar → Vandaag");
  ok(!(await ev(() => document.getElementById("tabbar").classList.contains("hidden"))) && await ev(() => getComputedStyle(document.getElementById("acct")).display !== "none"), "tabbalk en accountknop weer zichtbaar");
  ok(await p.locator(".oef-hint").count() === 0, "na de oefening geen tip meer");
  ok((await lsU(INSP.id)).gedaan === true, "wpi_oefen: gedaan (voor deze gebruiker)");
  ok(JSON.stringify(await tellingen()) === JSON.stringify(voor), "ook na afsluiten niets opgeslagen");

  // ---- veld- en zonmodus ----
  await ev(() => { App.pref = { veld: true, zon: true }; App.pasPrefToe(); App._oef = null; App.oefOpen(); }); await wacht(400);
  await p.getByRole("button", { name: /met oefenen/ }).click(); await wacht();
  await scherm("zonmodus-ingrijpen");
  await ev(() => { const o = App.oefState(); o.s = 0; o.i = 4; o.fb = false; o.a[0].oordeel = "A"; o.a[0].regel = "2.1"; App.oefToon(); }); await wacht();
  await scherm("zonmodus-actie");
  await ev(() => { App.pref = { veld: false, zon: false }; App.pasPrefToe(); App.oefOpnieuw(); }); await wacht();
  ok(JSON.stringify(await tellingen()) === JSON.stringify(voor), "veld/zon: niets opgeslagen");
  // ================= afkeuring ronde 4: de herhalingen van de reviewer, via de knoppen (390×844) =================
  // Een volledige ronde met per scène [oordeel, [actietekst | "VS", ter plaatse, urgentie]]. Bewijst: V met een korte,
  // concrete tekst wordt aanvaard; de samenvatting noemt alleen een TRA-afwijking als het oordeel of de TRA-stap echt
  // afweek, en noemt anders letterlijk wat er nog was (bv. alleen ‘Ter plaatse’); actiescherm en samenvatting zeggen
  // hetzelfde over ‘afgerond’; een preventieve actie (toolbox) is concreet; het oordeel blijft altijd dat van de oefenaar.
  console.log("afkeuring ronde 4 (doorlopen via de knoppen)");
  const doorloop = async (plan) => {
    await ev(() => { App.oefOpen(); App.oefOpnieuw(); }); await wacht(300);
    await p.getByRole("button", { name: /met oefenen/ }).click(); await wacht();
    const log = { oordeel: [], actie: [], hierna: [], gekozen: [] };
    for (let guard = 0; guard < 40; guard++) {
      const t = await p.locator(".oef h1").innerText();
      if (/oefening zit erop/.test(t)) break;
      const si = await ev(() => App.oefState().s), [x, act, zi] = plan[si];
      if (/Wat doe je eerst/.test(t)) { await kies("ingrijpen", 0); await verder(); continue; }
      if (/Het gesprek/.test(t)) { await kies("gesprek", 0); await verder(); continue; }
      if (/Wat zag je/.test(t)) { await p.fill("#oef-f-zie", "De hijsband is aan één rand uitgerafeld en heeft een snee."); await p.locator('button[data-action="oefFeedback"]').click(); await wacht(); await verder(); continue; }
      if (/De taak/.test(t)) { await p.fill("#oef-f-taak", "ze sluiten de nieuwe persleiding aan"); await p.locator('button[data-action="oefTaakVs"]').click(); await wacht(); await p.locator(".oef-vs .vpick").first().click(); await wacht(); await verder(); continue; }
      if (/Koppel en beoordeel/.test(t)) {
        if (zi === undefined && await p.locator(".oef-vs .vpick").count()) await p.locator(".oef-vs .vpick").first().click();
        else { if (!(await ev(() => document.querySelector("details.zelfkies").open))) await p.locator("details.zelfkies summary").click(); await p.locator(".zpick").nth(zi || 0).click(); }
        await wacht(300);
        await p.locator(`.oef-odock button[data-args='["${x}"]']`).click(); await wacht(300);
        log.oordeel[si] = await fbTekst(); await verder(); continue;
      }
      if (/voorstel/i.test(t)) {
        const [tx, tp, pr, voorVast] = act;
        if (tx === "VS") await knop("Laat de app een actie voorstellen").click(); else await p.fill("#oef-f-actie", tx);
        await wacht(100);
        await p.locator(`#oef-terPlaatse-${tp}`).click(); await wacht(200);
        if (voorVast) await voorVast();   // ronde 7: het invoerscherm vóór ‘vastleggen’ bekijken (uitleg, urgentie)
        // de urgentie staat er bij elke actie die open blijft (ook ‘Direct gecorrigeerd’ met iets dat nog moet gebeuren)
        if (pr && await p.locator("#oef-prio-blok").isVisible()) { await p.locator(`#oef-prio-${pr}`).click(); await wacht(200); }
        await p.locator("#oef-vastleg").click(); await wacht(300);
        log.actie[si] = await fbTekst();
        log.gekozen[si] = await p.locator(".oef-gekozen").count() ? (await p.locator(".oef-gekozen").innerText()).replace(/\s+/g, " ") : "";
        log.hierna[si] = await p.locator(".oef-hierna").count() ? (await p.locator(".oef-hierna").innerText()).replace(/\s+/g, " ") : "";
        if (await knop("Verder").count()) await verder();
        else { await ev(() => App.oefVerder()); await wacht(); }   // bijsturen: de oefenaar gaat toch door (oordeel blijft van hem)
        continue;
      }
      if (/Benoem wat goed gaat/.test(t)) { await p.fill("#oef-f-positief", "Goed dat de gasmeter bij jou in de sleuf hangt en de ladder als vluchtweg staat."); await p.locator('button[data-action="oefFeedback"]').click(); await wacht(); await verder(); continue; }
      errs.push("OEFEN: doorloop: onbekende stap " + t); break;
    }
    const s = await ev(() => ({ kick: (document.querySelector(".oef-kicker") || {}).textContent || "", intro: (document.querySelector(".oef-kaart .oef-p") || {}).textContent || "",
      rijen: [...document.querySelectorAll(".oef-lijst .row")].map((r) => r.innerText.replace(/\s+/g, " ")), anders: document.querySelectorAll(".oef-anders").length,
      oordelen: App.oefState().a.map((a) => a.oordeel || null) }));
    return Object.assign(log, s);
  };
  const STD = [["A", ["VS", "maatregel", "direct"]], ["C", null], ["A", ["VS", "gecorrigeerd", null]]];
  const met = (i, x, act) => STD.map((d, j) => (j === i ? [x, act] : d));

  // R1 sleuf V + ‘Ladder vastbinden’ (kort maar concreet) → aanvaard; samenvatting ‘Goed gedaan’, geen TRA-afwijking
  const r1 = await doorloop(met(1, "V", ["Ladder vastbinden", "niets", "planmatig"]));
  ok(/Dat kan/.test(r1.oordeel[1]) && /daar is V voor/.test(r1.oordeel[1]), "R1 sleuf V: oordeelscherm ‘Dat kan … daar is V voor’");
  ok(/Verbetervoorstel vastgelegd/.test(r1.actie[1]) && !/concreter|concreet:/.test(r1.actie[1]), "R1 sleuf V + ‘Ladder vastbinden’: aanvaard als concreet (geen minimum aantal woorden)", r1.actie[1]);
  ok(r1.kick === "Goed gedaan" && r1.anders === 0 && !/week je af|TRA aangeeft/.test(r1.intro), "R1 samenvatting: ‘Goed gedaan’, geen ‘week je af van wat de TRA aangeeft’", r1.intro);
  ok(/\[V\] Verbeterpunt/.test(r1.rijen[1]) && /verbetervoorstel geschreven/.test(r1.rijen[1]) && !/niet concreet/.test(r1.rijen.join(" ")), "R1 samenvatting: sleuf [V] Verbeterpunt, verbetervoorstel geschreven");
  ok(JSON.stringify(r1.oordelen) === JSON.stringify(["A", "V", "A"]), "R1 het oordeel van de oefenaar blijft staan (A, V, A)", r1.oordelen);
  await shot("r4-sleufV-kort-samenvatting");

  // R2 sleuf V + concreet, maar ‘Direct gecorrigeerd’ → alleen Ter plaatse; de samenvatting zegt precies dát
  const r2 = await doorloop(met(1, "V", ["Tweede gasmeter voor de wacht", "gecorrigeerd", null]));
  ok(/Kijk nog eens bij ‘Ter plaatse’/.test(r2.actie[1]) && !/concreter/.test(r2.actie[1]), "R2 sleuf V + ‘Direct gecorrigeerd’: actiescherm ‘Kijk nog eens bij Ter plaatse’");
  ok(!/week je af|TRA aangeeft|een paar keuzes/.test(r2.intro) && /Nog één punt om naar te kijken/.test(r2.intro) && /Ter plaatse/.test(r2.intro) && /Werken in de sleuf/.test(r2.intro),
    "R2 samenvatting: geen TRA-afwijking, geen ‘een paar keuzes’; noemt alleen ‘Ter plaatse’ bij Werken in de sleuf", r2.intro);
  ok(r2.anders === 1 && /Ter plaatse/.test(r2.rijen[1]) && !/paste nog niet helemaal|niet concreet|jij koos/.test(r2.rijen[1]), "R2 sleufrij: alleen het punt over ‘Ter plaatse’", r2.rijen[1]);
  ok(r2.kick === "Even terugkijken", "R2 ondertitel ‘Even terugkijken’ (er is één punt)");
  await shot("r4-sleufV-terplaatse-samenvatting");

  // R3 kast V (zelf gekozen TRA-stap) + label, ‘Direct gecorrigeerd’ → afgerond op het actiescherm én in de samenvatting
  const r3 = await doorloop(met(2, "V", ["Label met naam en datum aan het slot hangen", "gecorrigeerd", null]));
  ok(/Past bij wat je zag/.test(r3.actie[2]) && /afgerond/.test(r3.actie[2]) && /Getoetst/.test(r3.hierna[2]), "R3 kast V + label + gecorrigeerd: actiescherm afgerond, Hierna eindigt in Afgerond");
  ok(/herstel gezien, actie afgerond/.test(r3.rijen[2]) && !/actievoorstel geschreven/.test(r3.rijen[2]), "R3 samenvatting kast: ‘herstel gezien, actie afgerond’ (zelfde als het actiescherm)", r3.rijen[2]);
  ok(/jij koos V; volgens de TRA een afwijking \(A\)/.test(r3.rijen[2]) && /Bij één keuze week je af/.test(r3.intro) && !/een paar keuzes/.test(r3.intro) && /je oordeel bij ‘Bij de schakelkast’/.test(r3.intro), "R3 samenvatting: precies één TRA-afwijking (het oordeel bij de schakelkast)", r3.intro);
  ok(r3.oordelen[2] === "V", "R3 het oordeel V blijft staan");

  // R4 kast A + toolbox (preventieve actie) → concreet; sinds ronde 5 NIET afgerond (de toolbox moet nog gebeuren, zie P5)
  const r4 = await doorloop(met(2, "A", ["Toolbox over LOTOTO geven aan de hele ploeg", "gecorrigeerd", "kort"]));
  ok(!/concreter|wat ontbrak/.test(r4.actie[2]) && !/Getoetst/.test(r4.hierna[2]) && /Instellen/.test(r4.hierna[2]), "R4 kast A + ‘Toolbox over LOTOTO geven aan de hele ploeg’: concreet (preventief), open", r4.actie[2]);
  ok(!/actie afgerond/.test(r4.rijen[2]) && r4.kick === "Goed gedaan" && r4.anders === 0 && !/niet concreet/.test(r4.rijen.join(" ")), "R4 samenvatting: open, ‘Goed gedaan’, geen ‘niet concreet’");

  // de negen oordelen (put/sleuf/kast × C/A/V): de samenvatting noemt nooit een TRA-afwijking die er niet was,
  // telt goed (‘één keuze’), en zegt over ‘afgerond’ hetzelfde als het actiescherm
  const ACT = { put: ["VS", "maatregel", "direct"], sleuf: ["Ladder bovenaan vastbinden", "niets", "planmatig"], kast: ["VS", "gecorrigeerd", null] };
  const PAST = { put: ["A"], sleuf: ["C", "V", "A"], kast: ["A"] };
  for (const [i, sid] of [[0, "put"], [1, "sleuf"], [2, "kast"]]) {
    for (const x of ["C", "A", "V"]) {
      const r = await doorloop(met(i, x, x === "C" ? null : ACT[sid]));
      const afw = !PAST[sid].includes(x);
      const naam = sid + " " + x;
      ok(afw ? /Bij één keuze week je af van wat de TRA aangeeft/.test(r.intro) : !/week je af|TRA aangeeft/.test(r.intro), naam + ": samenvatting noemt " + (afw ? "precies één" : "geen") + " TRA-afwijking", r.intro);
      ok(!/een paar keuzes/.test(r.intro), naam + ": geen ‘een paar keuzes’");
      if (r.actie[i]) ok(/is de actie (meteen )?afgerond/.test(r.actie[i]) === /actie afgerond/.test(r.rijen[i]), naam + ": actiescherm en samenvatting zeggen hetzelfde over ‘afgerond’", [r.actie[i], r.rijen[i]]);
      ok(r.oordelen[i] === x, naam + ": het oordeel van de oefenaar blijft " + x);
    }
  }
  // ‘Kort’ is geen eis meer, ‘vaag’ wel: ‘Beter opletten’ en ‘Meer aandacht voor veiligheid’ vragen nog om iets concreets
  const vg = await doorloop(met(1, "V", ["Beter opletten", "niets", "planmatig"]));
  ok(/Maak het nog wat concreter/.test(vg.actie[1]) && /verbetervoorstel was nog niet concreet/.test(vg.rijen[1]) && !/week je af/.test(vg.intro), "vaag ‘Beter opletten’: vraag om iets concreets, in de samenvatting als tekstpunt (geen TRA-afwijking)", vg.intro);

  // ================= afkeuring ronde 5: de herhalingen van de reviewer, via de knoppen (390×844) =================
  console.log("afkeuring ronde 5 (doorlopen via de knoppen)");
  const goedeTekst = (t) => /Past bij wat je zag/.test(t);
  // P1 put A + ‘Band omdraaien en verder hijsen’ + Maatregel + Direct: onveilig, niet aanvaard; geen ‘de band gaat uit gebruik’
  const p1 = await doorloop(met(0, "A", ["Band omdraaien en verder hijsen", "maatregel", "direct"]));
  ok(!goedeTekst(p1.actie[0]) && /zo blijft het gevaar/.test(p1.actie[0]) && /niet verder gehesen/.test(p1.actie[0]) && !/de band gaat uit gebruik\. Dat past/.test(p1.actie[0]),
    "P1 put ‘Band omdraaien en verder hijsen’: niet aanvaard (‘zo blijft het gevaar’), geen bewering dat de band uit gebruik gaat", p1.actie[0]);
  ok(p1.kick === "Even terugkijken" && /verder hijsen met de beschadigde band/.test(p1.rijen[0]) && !/Goed gedaan/.test(p1.kick), "P1 samenvatting: geen ‘Goed gedaan’; de putrij noemt het onveilige voorstel", p1.rijen[0]);
  ok(!/week je af|TRA aangeeft/.test(p1.intro), "P1 samenvatting: geen TRA-afwijking (het oordeel A klopte)", p1.intro);
  await shot("r5-put-omdraaien-samenvatting");
  // P2 put A + alleen een toolbox: voorkomt herhaling, maar de beschadigde band moet nú uit gebruik
  const p2 = await doorloop(met(0, "A", ["Toolbox over hijsmiddelen geven", "maatregel", "direct"]));
  ok(!goedeTekst(p2.actie[0]) && /nú uit gebruik/.test(p2.actie[0]) && !/band gaat uit gebruik/.test(p2.actie[0]), "P2 put alleen ‘Toolbox over hijsmiddelen geven’: vraagt wat er met de band gebeurt; geen ‘band gaat uit gebruik’", p2.actie[0]);
  ok(p2.kick === "Even terugkijken" && /band uit gebruik gaat/.test(p2.rijen[0]), "P2 samenvatting: geen ‘Goed gedaan’; putrij zegt dat de band nog niet uit gebruik ging", p2.rijen[0]);
  // P3 put A + afkeuren én toolbox: aanvaard, en de terugkoppeling zegt wat de oefenaar echt schreef
  const p3 = await doorloop(met(0, "A", ["Band afkeuren en weggooien, daarna toolbox over hijsmiddelen geven", "maatregel", "direct"]));
  ok(goedeTekst(p3.actie[0]) && /volgens je actie gaat de beschadigde band uit gebruik, en je pakt ook de oorzaak aan/.test(p3.actie[0]), "P3 put afkeuren + toolbox: aanvaard; de tekst volgt wat je schreef", p3.actie[0]);
  ok(p3.kick === "Goed gedaan" && /actievoorstel geschreven/.test(p3.rijen[0]), "P3 samenvatting: ‘Goed gedaan’");
  // P4 kast A + ‘Slot eraf halen en doorwerken’ + Direct gecorrigeerd: het omgekeerde van de correctie, nooit afgerond
  const p4 = await doorloop(met(2, "A", ["Slot eraf halen en doorwerken", "gecorrigeerd", null], 0));
  ok(!goedeTekst(p4.actie[2]) && /zo blijft het gevaar/.test(p4.actie[2]) && /slot hoort erop te blijven/.test(p4.actie[2]) && !/afgerond/.test(p4.actie[2]) && !/Getoetst/.test(p4.hierna[2] || ""),
    "P4 kast ‘Slot eraf halen en doorwerken’: niet aanvaard, niet afgerond", p4.actie[2]);
  ok(!/actie afgerond/.test(p4.rijen[2]) && /haalde het slot eraf/.test(p4.rijen[2]) && p4.kick === "Even terugkijken", "P4 samenvatting: geen ‘actie afgerond’, wel ‘haalde het slot eraf’", p4.rijen[2]);
  await shot("r5-kast-sloteraf-samenvatting");
  // P5 kast A + toolbox + Direct gecorrigeerd: concreet (preventief), maar NIET afgerond: de toolbox moet nog gebeuren
  const p5 = await doorloop(met(2, "A", ["Toolbox over LOTOTO geven aan de hele ploeg", "gecorrigeerd", "kort"], 0));
  ok(!/concreter|wat ontbrak/.test(p5.actie[2]) && /blijft de actie open/.test(p5.actie[2]) && !/is de actie (meteen )?afgerond/.test(p5.actie[2]) && !/Getoetst/.test(p5.hierna[2] || "") && /Instellen/.test(p5.hierna[2] || ""),
    "P5 kast ‘Toolbox over LOTOTO …’ + gecorrigeerd: aanvaard als concreet, maar open (geen Afgerond, geen ‘Getoetst jij’)", [p5.actie[2], p5.hierna[2]]);
  ok(!/actie afgerond/.test(p5.rijen[2]) && /blijft open tot de toetser/.test(p5.rijen[2]), "P5 samenvatting: geen ‘herstel gezien, actie afgerond’; ‘blijft open tot de toetser het heeft gezien’ (zelfde als het actiescherm)", p5.rijen[2]);
  await shot("r5-kast-toolbox-open");
  // P6 kast A + label én toolbox + gecorrigeerd: het label is klaar, de toolbox nog niet → open
  const p6 = await doorloop(met(2, "A", ["Label met naam en datum aan het slot gehangen; toolbox LOTOTO geven", "gecorrigeerd", "kort"], 0));
  ok(/label zag je zelf hangen/.test(p6.actie[2]) && /blijft de actie open/.test(p6.actie[2]) && !/Getoetst/.test(p6.hierna[2] || "") && /Instellen/.test(p6.hierna[2] || "") && !/actie afgerond/.test(p6.rijen[2]), "P6 kast label + toolbox: label klaar, actie open (actiescherm = samenvatting)", p6.actie[2]);
  // P7 sleuf V + vage alledaagse varianten: vragen om iets concreets
  for (const vt of ["Voorzichtiger werken", "Gewoon blijven opletten"]) {
    const r = await doorloop(met(1, "V", [vt, "niets", "kort"]));
    ok(/Maak het nog wat concreter/.test(r.actie[1]) && !/Verbetervoorstel vastgelegd/.test(r.actie[1]) && r.kick === "Even terugkijken" && /niet concreet/.test(r.rijen[1]) && !/week je af/.test(r.intro),
      "P7 sleuf V + ‘" + vt + "’: vaag → vraag om iets concreets, samenvatting geen ‘Goed gedaan’ en geen TRA-afwijking", [r.actie[1], r.intro]);
  }
  const vaagT = await ev(() => ["Voorzichtiger werken", "Gewoon blijven opletten", "Extra alert zijn", "Veiliger werken", "Iedereen moet beter uitkijken", "Scherp blijven", "Meer aandacht", "Beter op letten"].filter((x) => !App.oefVaag(x)));
  const concreetT = await ev(() => ["Ladder vastbinden", "Tweede gasmeter voor de wacht", "Toolbox over LOTOTO", "Label met naam en datum", "Beter opletten bij de ladder"].filter((x) => App.oefVaag(x)));
  ok(!vaagT.length && !concreetT.length, "P7 vaag/concreet: alledaagse vage zinnen zijn vaag; korte concrete zinnen niet", { nietVaag: vaagT, welVaag: concreetT });
  // P8 samenvatting rustig: TRA-afwijking + andere punten → tellen en scènes noemen, niet alles herhalen; geen dubbele dubbele punt
  const p8 = await doorloop([["A", ["VS", "niets", "planmatig"]], ["V", ["Tweede gasmeter voor de wacht", "gecorrigeerd", null]], ["A", ["VS", "maatregel", "kort"], 2]]);
  ok(/Bij één keuze week je af van wat de TRA aangeeft \(de TRA-stap bij ‘Bij de schakelkast’\)/.test(p8.intro) && /Daarnaast zijn er nog vier punten om naar te kijken, bij ‘Pomp uit de put’, ‘Werken in de sleuf’ en ‘Bij de schakelkast’\./.test(p8.intro),
    "P8 inleiding: één TRA-afwijking + ‘nog vier punten’ met de scènes", p8.intro);
  ok(!/Daarnaast nog iets/.test(p8.intro) && !/: [^.]*: /.test(p8.intro) && !/koos je|urgentie/.test(p8.intro) && p8.intro.length < 330, "P8 inleiding: kort, geen ‘Daarnaast nog iets’, geen dubbele dubbele punt, punten niet herhaald (" + p8.intro.length + " tekens)", p8.intro);
  ok(/urgentie hoort ‘Direct’ te zijn/.test(p8.rijen[0]) && !/urgentie: /.test(p8.rijen.join(" ")), "P8 putrij: ‘de urgentie hoort Direct te zijn’ (geen ‘de urgentie: …’)", p8.rijen[0]);
  await shot("r5-samenvatting-rustig");

  // ================= afkeuring ronde 6: de herhalingen van de reviewer, via de knoppen (390×844) =================
  console.log("afkeuring ronde 6 (doorlopen via de knoppen)");
  const geenOorzaak = (t) => !/pak[^.]*oorzaak aan/.test(t);
  // Q1 put A + ‘Niet meer met deze band hijsen’: de band gaat uit gebruik (meerdere woorden tussen ‘niet meer’ en ‘hijsen’)
  const q1 = await doorloop(met(0, "A", ["Niet meer met deze band hijsen", "maatregel", "direct"]));
  ok(goedeTekst(q1.actie[0]) && !/concreter|wat gebeurt er met de beschadigde band/.test(q1.actie[0]) && geenOorzaak(q1.actie[0]), "Q1 put ‘Niet meer met deze band hijsen’: aanvaard (de band gaat uit gebruik), geen verzonnen oorzaak", q1.actie[0]);
  ok(!/band uit gebruik gaat|niet concreet/.test(q1.rijen[0]) && !/band uit gebruik/.test(q1.intro) && q1.kick === "Goed gedaan", "Q1 samenvatting: geen ‘zei nog niet dat de band uit gebruik gaat’", [q1.rijen[0], q1.intro]);
  // Q2 put A + afkeuren / Voorstel / vervangen door een gekeurde band: aanvaard, maar NIET ‘je pakt ook de oorzaak aan’
  for (const tx of ["Hijsband afkeuren", "VS", "Band vervangen door nieuwe gekeurde band"]) {
    const r = await doorloop(met(0, "A", [tx, "maatregel", "direct"]));
    ok(goedeTekst(r.actie[0]) && /gaat de beschadigde band uit gebruik\. Dat past/.test(r.actie[0]) && geenOorzaak(r.actie[0]), "Q2 put ‘" + (tx === "VS" ? "Voorstel van de app" : tx) + "’: aanvaard, geen ‘je pakt ook de oorzaak aan’ (afkeuren/gekeurd is geen oorzaak)", r.actie[0]);
  }
  // Q3 put A + ‘Nieuwe band halen’: zegt niet wat er met de beschadigde band gebeurt → niet aanvaard, geen ‘gaat uit gebruik’
  const q3 = await doorloop(met(0, "A", ["Nieuwe band halen", "maatregel", "direct"]));
  ok(!goedeTekst(q3.actie[0]) && /wat er met de beschadigde band gebeurt/.test(q3.actie[0]) && !/volgens je actie gaat de beschadigde band uit gebruik/.test(q3.actie[0]), "Q3 put ‘Nieuwe band halen’: niet aanvaard; vraagt wat er met de beschadigde band gebeurt", q3.actie[0]);
  ok(/band uit gebruik gaat/.test(q3.rijen[0]) && q3.kick === "Even terugkijken", "Q3 samenvatting: ‘zei nog niet dat de beschadigde band uit gebruik gaat’ (klopt hier)", q3.rijen[0]);
  // Q4 kast A + iets dat nog moet gebeuren + ‘Direct gecorrigeerd’: het invoerscherm zegt al dat de actie open blijft,
  // vraagt een urgentie (vastleggen kan pas daarna) en de terugkoppeling noemt wat de oefenaar schreef (nooit een vaste ‘toolbox’)
  const Q4 = [["Afspraak maken met de ploeg over LOTOTO", "de afspraak"], ["Instructie aan de monteur", "de instructie"], ["Toolbox over LOTOTO geven aan de hele ploeg", "de toolbox"]];
  for (const [tx, wat] of Q4) {
    let invoer = null;
    const r = await doorloop(met(2, "A", [tx, "gecorrigeerd", "kort", async () => {
      invoer = await ev(() => ({ wie: document.getElementById("oef-wie").textContent, prio: !document.getElementById("oef-prio-blok").hidden, uit: document.getElementById("oef-vastleg").disabled }));
    }]));
    ok(invoer && /blijft de actie open/.test(invoer.wie) && !/urgentie is niet nodig|is de actie afgerond/.test(invoer.wie) && invoer.wie.includes(wat) && invoer.prio && invoer.uit,
      "Q4 kast ‘" + tx + "’ + gecorrigeerd: invoerscherm zegt ‘blijft open’ (" + wat + "), toont de urgentie en vastleggen wacht daarop", invoer);
    ok(/Vastgelegd, de actie blijft open/.test(r.actie[2]) && r.actie[2].includes("Maar " + wat + " moet nog gebeuren") && /met jouw urgentie \(kort/.test(r.actie[2]) && /urgentie: kort/.test(r.gekozen[2] || "") && /Instellen/.test(r.hierna[2]) && !/Getoetst/.test(r.hierna[2]),
      "Q4 kast ‘" + tx + "’: open, met urgentie Kort; de tekst noemt " + wat, [r.actie[2], r.hierna[2]]);
    if (wat !== "de toolbox") ok(!/toolbox/i.test(r.actie[2]), "Q4 kast ‘" + tx + "’: geen ‘toolbox’ die de oefenaar niet schreef", r.actie[2]);
    ok(/blijft open tot de toetser/.test(r.rijen[2]) && !/actie afgerond/.test(r.rijen[2]), "Q4 samenvatting kast: open (zelfde als het actiescherm)", r.rijen[2]);
  }
  await shot("r6-kast-afspraak-open");
  // Q5 kast A + wat al gebeurd is (verleden tijd): afgerond, geen urgentie nodig, samenvatting ‘herstel gezien, actie afgerond’
  let q5in = null;
  const q5 = await doorloop(met(2, "A", ["Label opgehangen en monteur uitleg gegeven over LOTOTO", "gecorrigeerd", "kort", async () => {
    q5in = await ev(() => ({ wie: document.getElementById("oef-wie").textContent, prio: !document.getElementById("oef-prio-blok").hidden, uit: document.getElementById("oef-vastleg").disabled })); }]));
  ok(q5in && /is de actie afgerond; een urgentie is niet nodig/.test(q5in.wie) && !q5in.prio && !q5in.uit, "Q5 kast ‘Label opgehangen en … uitleg gegeven’: invoerscherm afgerond, geen urgentie", q5in);
  ok(/is de actie meteen afgerond/.test(q5.actie[2]) && /uitleg/.test(q5.actie[2]) && !/moet nog gebeuren|blijft (de actie )?open/.test(q5.actie[2]) && /Getoetst/.test(q5.hierna[2]), "Q5 kast: wat al gebeurd is heet niet ‘nog te doen’; afgerond", q5.actie[2]);
  ok(/herstel gezien, actie afgerond/.test(q5.rijen[2]) && !/blijft open/.test(q5.rijen[2]), "Q5 samenvatting: ‘herstel gezien, actie afgerond’", q5.rijen[2]);
  // Q6 kast A + een bevinding als actie (‘Label ontbreekt aan het slot’): geen actie → niet aanvaard, nooit afgerond
  const q6 = await doorloop(met(2, "A", ["Label ontbreekt aan het slot", "gecorrigeerd", null]));
  ok(!goedeTekst(q6.actie[2]) && /Maak het nog wat concreter/.test(q6.actie[2]) && /Dit is wat je zag/.test(q6.actie[2]) && !/afgerond/.test(q6.actie[2]), "Q6 kast ‘Label ontbreekt aan het slot’: een bevinding, geen actie → niet aanvaard, niet afgerond", q6.actie[2]);
  ok(!/actie afgerond/.test(q6.rijen[2]) && /beschreef wat je zag/.test(q6.rijen[2]), "Q6 samenvatting: geen ‘herstel gezien, actie afgerond’", q6.rijen[2]);
  // Q7 put V + ‘Band omdraaien en verder hijsen’ + Niets gedaan + Kort: ‘zo blijft het gevaar bestaan:’ gaat over het onveilige
  // voorstel zelf (eerste punt); Ter plaatse en urgentie staan apart eronder
  const q7 = await doorloop(met(0, "V", ["Band omdraaien en verder hijsen", "niets", "kort"]));
  ok(/zo blijft het gevaar bestaan: Met een beschadigde hijsband wordt niet verder gehesen/.test(q7.actie[0]) && /Verder nog twee dingen: Er hing een last/.test(q7.actie[0]), "Q7 put V ‘omdraaien en verder hijsen’: eerst het gevaar, daarna apart ‘Verder nog twee dingen’ (Ter plaatse, urgentie)", q7.actie[0]);
  ok(/je actievoorstel liet verder hijsen met de beschadigde band; bij ‘Ter plaatse’/.test(q7.rijen[0]), "Q7 samenvatting: het onveilige voorstel eerst", q7.rijen[0]);
  await shot("r6-put-onveilig-eerst");

  await ev(() => { App.oefOpnieuw(); }); await wacht();
  ok((await ev(() => window.__csp)).length === 0, "390: geen CSP-overtredingen");
  await ctx.close();

  // ================= 1440: computer, coördinator, tip ‘Niet nu’ per gebruiker, uitloggen =================
  const w = await nieuwePagina(b, 1440, 900), q = w.p;
  await q.goto(BASE + "/index.html"); await q.waitForTimeout(900);
  await q.evaluate((u) => App.login(null, u), QHSE); await q.waitForTimeout(800);
  ok(await q.locator(".oef-hint").count() === 0, "QHSE-manager (inspecteert niet): geen tip");
  await q.evaluate(() => App.openAccount()); await q.waitForTimeout(200);
  ok(await q.locator('#mod button[data-action="oefOpen"]').count() === 1, "QHSE-manager: ‘Oefenen’ wel in het accountmenu");
  await q.evaluate(() => App.closeModal());
  await q.evaluate((u) => App.login(null, u), INSP); await q.waitForTimeout(800);
  await q.evaluate(() => App.go("inspecties")); await q.waitForTimeout(800);
  ok(await q.locator(".oef-hint").count() === 1, "Inspecties: tip bij lege lijst");
  await q.locator(".oef-hint .oef-nietnu").click(); await q.waitForTimeout(200);
  const lq = (id) => q.evaluate((id) => { const o = JSON.parse(localStorage.getItem("wpi_oefen") || "{}"); return (o.gebruikers || {})[id] || null; }, id);
  ok(await q.locator(".oef-hint").count() === 0 && (await lq(INSP.id)).verborgen === true, "‘Niet nu’ verbergt de tip (wpi_oefen, per gebruiker)");
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
  // kast: ‘niks’ + ‘Direct gecorrigeerd’ is geen ‘herstel gezien, actie afgerond’
  const sam5 = await q.evaluate(() => { const o = App.oefState(), oud = o.a[2];
    o.a[2] = { gesprek: 0, regel: "5.2", oordeel: "A", actie: "niks", terPlaatse: "gecorrigeerd", actieKlaar: true }; App.oefToon();
    const v = { lijst: document.querySelector(".oef-lijst").innerText, n: document.querySelectorAll(".oef-anders").length }; o.a[2] = oud; App.oefToon(); return v; });
  ok(!/herstel gezien, actie afgerond/.test(sam5.lijst) && /je actievoorstel was nog niet concreet/.test(sam5.lijst) && sam5.n === 1, "samenvatting kast: ‘niks’ + ‘Direct gecorrigeerd’ → niet afgerond, ‘je actievoorstel was nog niet concreet’");
  const sam4 = await q.evaluate(() => { const o = App.oefState();
    o.a[1] = { taak: "leiding aansluiten", gekozenTaak: "Persleiding aansluiten in de sleuf", regel: "4.1", oordeel: "V", actie: "De ladder bovenaan vastzetten aan de stempel", terPlaatse: "niets", prio: "planmatig", actieKlaar: true, positief: "Goed dat de gasmeter bij je hangt" }; App.oefToon();
    const v = { kick: document.querySelector(".oef-kicker").textContent, n: document.querySelectorAll(".oef-anders").length, lijst: document.querySelector(".oef-lijst").innerText };
    o.a[1].oordeel = "A"; App.oefToon();
    v.lijstA = document.querySelector(".oef-lijst").innerText; v.nA = document.querySelectorAll(".oef-anders").length; return v; });
  ok(sam4.kick === "Goed gedaan" && sam4.n === 0 && /verbetervoorstel geschreven/.test(sam4.lijst), "samenvatting sleuf V: goed oordeel, ‘verbetervoorstel geschreven’, geen ‘Kijk nog eens’");
  ok(sam4.nA === 0 && /\[A\] Afwijking/.test(sam4.lijstA) && /actievoorstel geschreven/.test(sam4.lijstA) && !/jij koos A/.test(sam4.lijstA), "samenvatting sleuf A: de hint kwam al op het oordeelscherm; hier niet nog eens als afwijking (oordeel blijft van de inspecteur)");
  await q.evaluate(() => { const o = App.oefState(); o.s = 0; o.i = 4; o.fb = false; o.a[0].oordeel = "A"; App.oefToon(); }); await q.waitForTimeout(250);
  await q.screenshot({ path: path.join(SHOTS, "1440-actie.png"), fullPage: true });
  await q.evaluate(() => { const o = App.oefState(); o.s = 2; o.i = 0; o.fb = false; App.oefToon(); }); await q.waitForTimeout(250);
  await q.screenshot({ path: path.join(SHOTS, "1440-kast.png"), fullPage: true });
  const strook = await q.evaluate(() => { const pl = document.querySelector(".oef-plaat"); return getComputedStyle(pl).backgroundColor; });
  ok(!/234, 241, 250/.test(strook), "1440: geen lichtblauwe stroken naast de tekening (" + strook + ")");
  const v1 = await q.evaluate(async () => { const db = await WPI.DB.open(), u = {}; for (const n of Array.from(db.objectStoreNames)) u[n] = (await WPI.DB.getAll(n)).length; return u; });
  ok(JSON.stringify(v0) === JSON.stringify(v1), "1440: niets opgeslagen in IndexedDB");

  // gedeeld toestel: uitloggen wist de lopende oefening (vrije tekst); de volgende inspecteur krijgt zijn eigen tip
  ok(!!(await lq(INSP.id)).voortgang, "voor uitloggen: lopende oefening bewaard");
  await q.evaluate(() => App.logout()); await q.waitForTimeout(400);
  const naUit = await lq(INSP.id);
  ok(naUit && !naUit.voortgang && naUit.verborgen === true && !/leiding aansluiten|hijsband rafelig/.test(await q.evaluate(() => localStorage.getItem("wpi_oefen") || "")), "na uitloggen: geen voortgang of vrije tekst meer, ‘Niet nu’ blijft voor deze gebruiker");
  await q.evaluate(() => App.login(null, { id: "u-oefen-test", full_name: "Tweede Inspecteur", role: "coordinator", functie: "Montage Coördinator" })); await q.waitForTimeout(900);
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
