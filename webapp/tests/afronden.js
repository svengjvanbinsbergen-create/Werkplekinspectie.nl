// Werkplekinspectie — tests/afronden.js
// Pauzeren en definitief afronden van een inspectie, het rapport als echt PDF-bestand en "Deel als PDF".
//   1. pauzeren (knop in de kop) → Vandaag bovenaan "Gepauzeerd · Hervatten" → één tik hervat precies waar je was
//      (zelfde stap, zelfde waarnemingen, zelfde tekst); een andere (demo)gebruiker ziet hem niet;
//      meerdere gepauzeerd: één grote kaart + rijen; hervatten terwijl er een andere loopt pauzeert die andere
//   2. definitief afronden: herinneringen + één rustige bevestiging ("Na afronden ligt de inspectie vast …"),
//      voortgang in stappen, App.rapportAfronden precies één keer met een echte PDF (begint met %PDF, pdfinfo: >0
//      pagina's, pdftotext bevat het object), uitkomst "demo"; daarna bevroren: geen lopende of gepauzeerde
//      inspectie meer, een oud tabblad kan hem niet nog eens afronden of bewerken, rapport zonder invoervelden
//   3. "Deel als PDF": navigator.share met één PDF-bestand (stub), zonder deelfunctie een download;
//      staf (QHSE-manager) opent het rapport vanuit de lijst; een coördinator heeft daar geen PDF-knop
//   4. laders: op het inspectiescherm neutraal (--ld = --soft), ook de voortgangsbalk van het afronden
//   5. de PDF: de woorden van de inspecteur exact (≥, →, emoji: geen "?"), rapportnummer, start/eind/duur, score
//      "x van y conform", genummerde foto's met bijschrift, witte pagina's; bij afronden "stand bij afronden";
//      "Deel als PDF" = actuele stand (actiehouder, toetser, plandatum, laatste stap, aanvullingen);
//      "Origineel bij afronden" = precies het bestand van toen; zonder handtekening bovenaan "NIET ONDERTEKEND"
//   6. aanvulling: alleen de inspecteur (of hoofd/QHSE) voegt er een toe; het record zelf blijft gelijk
//   7. oud tweede tabblad: na afronden elders geen bewerkbaar scherm meer, en een verborgen oud tabblad zet geen
//      "lopende" inspectie meer terug (geen "Je inspectie loopt nog" na herladen)
//   8. bewijs van afsluiten: een afwijking die ter plaatse direct is gecorrigeerd (via de UI) staat in de app en in
//      beide PDF's als "Afgerond ter plaatse · getoetst door <inspecteur> op <tijd>", nooit "nog niet ingesteld" of dubbel;
//      uitkomst telt "2 actievoorstellen: 1 klaargezet; 1 ter plaatse afgerond"; inspecteur met functie; getagde PDF;
//      geen pagina met alleen de voetnoot; bij "Deel als PDF" eindigt het ondertekende deel met de handtekening en
//      volgt een bijlage (niet ondertekend) met de acties van nu en de aanvullingen; "heeft geen foto" → foto nasturen
//      als aanvulling; Zoeken vindt het rapport op het rapportnummer (heel of de laatste cijfers); duimrij onderin
// Schermafbeeldingen (390×844, dsf 2) in AFRONDEN_SHOTS (standaard de huidige map); pagina 1 van de PDF als PNG
// (pdftoppm, als dat er is). Eindregel: "ERRS [...]".
"use strict";
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const BASE = process.env.BASE || "http://127.0.0.1:9100";
const OUT = process.env.AFRONDEN_SHOTS || ".";
fs.mkdirSync(OUT, { recursive: true });
const errs = [];
const ok = (c, m) => { if (c) console.log("  ok  " + m); else { console.log("FOUT " + m); errs.push(m); } };
const heeft = (cmd) => { try { execFileSync("which", [cmd], { stdio: "ignore" }); return true; } catch (e) { return false; } };
const tekstVan = (pad) => execFileSync("pdftotext", ["-enc", "UTF-8", pad, "-"]).toString("utf8");
// eerste pixel (linksboven) en een pixel midden-onder van pagina 1, via een kleine PPM (pdftoppm)
function hoekPixel(pad) {
  const b = execFileSync("pdftoppm", ["-r", "20", "-f", "1", "-l", "1", pad]);   // P6 naar stdout
  let i = 0, velden = []; while (velden.length < 4) { while (/\s/.test(String.fromCharCode(b[i]))) i++; let w = ""; while (!/\s/.test(String.fromCharCode(b[i]))) w += String.fromCharCode(b[i++]); velden.push(w); }
  i++; const W = +velden[1], H = +velden[2], px = (x, y) => Array.from(b.slice(i + 3 * (y * W + x), i + 3 * (y * W + x) + 3));
  return { hoek: px(1, 1), onder: px(Math.floor(W / 2), H - 3) };
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
  const ev = (f, a) => p.evaluate(f, a), wacht = (ms) => p.waitForTimeout(ms);
  const S = (n, full) => p.screenshot({ path: path.join(OUT, n + ".png"), fullPage: !!full });
  await p.goto(BASE + "/index.html"); await wacht(900);
  await ev(() => { localStorage.clear(); indexedDB.deleteDatabase("wpi"); indexedDB.deleteDatabase("wpi-rapporten"); });
  await p.reload(); await wacht(900);

  // ===== 1. inspectie met een waarneming (A, met foto) =====
  await ev(() => App.login("u-hoofd2")); await wacht(500);
  await ev(() => App.startInspectie("DAM", "P26-168", "Damwand · RWZI Voorbeeldstad")); await wacht(300);
  await ev(() => App.kiesTaak(App.data.kennisbank.DAM.regels[0].taak)); await wacht(300);
  const ZIE = "hijsband is rafelig → monteur staat onder de last, afzetting ≥ 10 m 🚧";
  await p.fill("#f-zie", ZIE);
  const png = async (k) => Buffer.from(await ev((k) => { const c = document.createElement("canvas"); c.width = 640; c.height = 480; const g = c.getContext("2d"); g.fillStyle = k; g.fillRect(0, 0, 640, 480); g.fillStyle = "#fff"; g.fillRect(200, 150, 240, 180); return c.toDataURL("image/png").split(",")[1]; }, k), "base64");
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.click(".fotogroot")]);
  await fc.setFiles([{ name: "a.png", mimeType: "image/png", buffer: await png("#8a3b2e") }, { name: "b.png", mimeType: "image/png", buffer: await png("#2F5D50") }]);
  await wacht(900);
  ok(await ev(() => App.fotoLijst(App.state.inspectie.cur).length) === 2, "twee foto's bij de waarneming");
  // de laders op het inspectiescherm zijn neutraal (geen groen dat als een "C" leest)
  const kl = await ev(() => { const cs = getComputedStyle(document.body); return [cs.getPropertyValue("--ld").trim(), getComputedStyle(document.documentElement).getPropertyValue("--soft").trim()]; });
  ok(kl[0] && kl[0] === kl[1], "inspectiescherm: laderkleur neutraal (--ld = --soft): " + kl.join(" / "));
  await p.click("text=Volgende: koppel aan de TRA"); await wacht(600);
  await p.locator(".q .pick").first().click(); await wacht(300);
  await p.click(".seg button.t-A"); await wacht(700);
  if (await p.locator("#kv-tp-groep").count()) await p.locator("#kv-tp-groep .kvlak").nth(3).click();
  await p.click("text=Actievoorstel vastleggen"); await wacht(300);
  // nu op "Nog iets gezien?": nog een waarneming beginnen en halverwege pauzeren
  await ev(() => App.waarnemingOver()); await wacht(300);
  await p.fill("#f-zie", "afzetting bij de bouwput staat open");
  await wacht(400);
  const voor = await ev(() => { const i = App.state.inspectie; return JSON.stringify({ id: i.id, stap: i.stap, n: i.waarnemingen.length, cur: i.cur && i.cur.tekst, taak: i.taak, fotos: i.waarnemingen[0] && App.fotoLijst(i.waarnemingen[0]).length }); });

  // ===== 2. pauzeren via de knop in de kop =====
  await p.click(".ih-menu"); await wacht(350);
  ok(await p.locator("#mod .afr-keuze").count() === 2 && /Pauzeren/.test(await p.locator("#mod").innerText()) && /Definitief afronden/.test(await p.locator("#mod").innerText()), "kop van de inspectie: twee duidelijke keuzes (Pauzeren, Definitief afronden)");
  ok(await p.locator("#mod .afr-menu, #mod [data-action*=openWeergave]").count() === 0, "weergave zit niet meer achter de pauzeknop");
  await S("1-inspectie-keuzes");
  await ev(() => App.closeModal()); await wacht(200);
  // de zonknop (weergave) staat weer met één tik in de kop, naast de pauzeknop
  ok(await p.locator('.inshead .ih-rond[aria-label^="Weergave"]').count() === 1, "kop: eigen knop Weergave (zon), één tik");
  await p.locator('.inshead .ih-rond[aria-label^="Weergave"]').click(); await wacht(300);
  ok(/Zonmodus/.test(await p.locator("#mod").innerText()), "zonknop opent meteen Weergave (veldmodus/zonmodus)");
  await ev(() => App.closeModal()); await wacht(200);
  await p.click(".ih-menu"); await wacht(350);
  await p.locator("#mod .afr-keuze", { hasText: "Pauzeren" }).click(); await wacht(900);
  ok(/#\/vandaag$/.test(p.url()), "na pauzeren op Vandaag: " + p.url());
  ok(await ev(() => App.state.inspectie === null), "geen lopende inspectie meer na pauzeren");
  const kaart = p.locator(".vpauze .hero.pauze");
  ok(await kaart.count() === 1, "Vandaag: kaart 'Gepauzeerd · Hervatten'");
  const kt = await kaart.innerText().catch(() => "");
  ok(/Gepauzeerd/.test(kt) && /Hervatten/.test(kt) && /Damwand/.test(kt) && /RWZI Voorbeeldstad/.test(kt) && /Gepauzeerd vandaag \d\d:\d\d/.test(kt), "kaart noemt object, locatie en tijd van pauzeren: " + kt.replace(/\s+/g, " "));
  ok(await ev(() => { const v = document.querySelector("#view .vtop"), k = v && v.querySelector(".hero"); return !!(k && k.classList.contains("pauze")); }), "de gepauzeerde kaart staat bovenaan");
  ok(/op pauze/.test(await p.locator("#view h1").innerText()), "kop Vandaag: inspectie staat op pauze");
  ok(await p.locator(".pauzetoast, #view .toast").count() === 0, "geen tweede melding (toast) naast de grote pauzekaart");
  await S("2-vandaag-gepauzeerd");
  const rec0 = await ev(async () => (await WPI.DB.getAll("concept")).map((c) => c.id));
  ok(rec0.some((i) => /^pauze-u-hoofd2-WPI-/.test(i)) && !rec0.includes("lopend-u-hoofd2"), "op het toestel: alleen een gepauzeerd record, geen lopende: " + rec0.join(","));

  // ===== 3. een andere gebruiker ziet hem niet =====
  await ev(() => App.login("u-coord1")); await wacht(700);
  ok(await p.locator(".vpauze .hero, .vpauze .vrij").count() === 0, "andere gebruiker (u-coord1): geen gepauzeerde kaart");
  ok((await ev(() => App.gepauzeerdeInspecties())).length === 0, "andere gebruiker: gepauzeerdeInspecties() is leeg");
  // ook niet via hervatten met het id van een ander
  const insId = JSON.parse(voor).id;
  await ev((id) => App.hervatInspectie(id), insId); await wacht(400);
  ok(await ev(() => App.state.inspectie === null), "andere gebruiker kan een andermans gepauzeerde inspectie niet hervatten");
  // en de QHSE-manager (inspecteert niet) ziet geen pauzekaart
  await ev(() => App.login("u-qhse")); await wacht(600);
  ok(await p.locator(".vpauze .hero, .vpauze .vrij").count() === 0, "QHSE-manager: geen gepauzeerde kaart");

  // ===== 4. hervatten: één tik, precies waar je was =====
  await ev(() => App.login("u-hoofd2")); await wacht(700);
  await p.locator(".vpauze .hero.pauze").click(); await wacht(800);
  const na = await ev(() => { const i = App.state.inspectie; return i && JSON.stringify({ id: i.id, stap: i.stap, n: i.waarnemingen.length, cur: i.cur && i.cur.tekst, taak: i.taak, fotos: i.waarnemingen[0] && App.fotoLijst(i.waarnemingen[0]).length }); });
  ok(na === voor, "hervatten herstelt de stand exact: " + na);
  ok(/#\/inspectie$/.test(p.url()) && await p.inputValue("#f-zie") === "afzetting bij de bouwput staat open", "hervat op het scherm 'Wat zie je?' met de tekst van toen");
  const rec1 = await ev(async () => (await WPI.DB.getAll("concept")).map((c) => c.id));
  ok(!rec1.some((i) => /^pauze-u-hoofd2-/.test(i)) && rec1.includes("lopend-u-hoofd2"), "na hervatten: weer de lopende, geen gepauzeerd record: " + rec1.join(","));

  // ===== 5. meerdere: pauzeren en nieuw starten; hervatten wisselt =====
  await ev(() => App.startInspectie("SLI", "", "Slibpomp")); await wacht(400);
  ok(/Lopende pauzeren en nieuw starten/.test(await p.locator("#mod").innerText()), "nieuwe starten terwijl er een loopt: keuze 'Lopende pauzeren en nieuw starten'");
  await p.click("#mod >> text=Lopende pauzeren en nieuw starten"); await wacht(700);
  const tweede = await ev(() => App.state.inspectie && App.state.inspectie.titel);
  ok(tweede === "Slibpomp", "nieuwe inspectie loopt: " + tweede);
  await ev(() => App.kiesTaak(App.data.kennisbank.SLI.regels[0].taak)); await wacht(300);
  await ev(() => App.setVeld("zie", "pomp staat open zonder afscherming")); await wacht(300);
  await ev(() => App.go("vandaag")); await wacht(700);
  ok(await p.locator(".vpauze .vrij.pauzerij").count() === 1 && await p.locator(".hero.nu").count() === 1, "Vandaag met een lopende en een gepauzeerde: lopende groot, gepauzeerde als rij");
  // hervatten van de gepauzeerde pauzeert de lopende (geen werk kwijt)
  await p.locator(".vpauze .vrij.pauzerij .startpil").click(); await wacht(900);
  ok(await ev(() => App.state.inspectie && App.state.inspectie.titel) === "Damwand · RWZI Voorbeeldstad", "hervat: Damwand loopt weer");
  const pz = await ev(async () => (await App.gepauzeerdeInspecties()).map((c) => c.ins.titel));
  ok(pz.length === 1 && pz[0] === "Slibpomp", "de andere (Slibpomp) staat nu op pauze: " + JSON.stringify(pz));
  // nog een derde, zodat Vandaag twee gepauzeerde laat zien
  await ev(() => App.pauzeerInspectie()); await wacht(800);
  ok(await p.locator(".vpauze .hero.pauze").count() === 1 && await p.locator(".vpauze .vrij.pauzerij").count() === 1, "twee gepauzeerd: één grote kaart (laatst gepauzeerd) en één rij 'Ook gepauzeerd'");
  ok(/Damwand/.test(await p.locator(".vpauze .hero.pauze").innerText()), "laatst gepauzeerde bovenaan");
  await S("2b-vandaag-twee-gepauzeerd", true);
  await p.locator(".vpauze .hero.pauze").click(); await wacht(800);

  // ===== 5b. algemeen onderwerp F: afwijking, ter plaatse direct gecorrigeerd (door de UI, zoals een inspecteur) =====
  await ev(() => App.waarnemingOver("F")); await wacht(400);
  ok(await p.locator(".dock .duimrij .duimknop").count() === 2, "waarneming: Pauze en Weergave ook onderin (duimzone)");
  await S("1b-waarneming-duimrij");
  await p.fill("#f-zie", "kabelhaspel lag op de looproute; monteur legde hem direct weg");
  await p.click("text=Volgende: beoordelen"); await wacht(700);
  await p.click(".seg button.t-A"); await wacht(1200);
  await p.fill("#f-actie", "Looproute vrijhouden: haspel naast de route leggen");
  await p.click('button:has-text("Direct gecorrigeerd")'); await wacht(300);
  ok(await p.locator(".adock .duimrij .duimknop").count() === 2, "actiescherm: Pauze en Weergave ook onderin");
  await p.click("text=Actievoorstel vastleggen"); await wacht(500);
  const gecorr = await ev(() => App.state.inspectie.waarnemingen.filter((w) => w.actie && w.actie.terPlaatse === "gecorrigeerd" && w.oordeel === "A").length);
  ok(gecorr === 1, "een afwijking die ter plaatse direct is gecorrigeerd (status Afgerond)");
  // de keuzes-kop herhaalt zichzelf niet ("‹ Inspectie" naast de titel "Inspectie")
  await p.click(".ih-menu"); await wacht(350);
  const kopDubbel = await ev(() => { const t = document.querySelector("#modtitel").textContent.trim(), b = document.querySelector("#mod .modterug"); return !b.hidden && b.querySelector(".tn") && b.querySelector(".tn").textContent.trim() === t; });
  ok(!kopDubbel, "venster: terugknop zegt niet hetzelfde als de titel");
  await ev(() => App.closeModal()); await wacht(200);

  // ===== 6. definitief afronden =====
  await ev(() => { App.togMonteur("Henk Voorbeeld"); App.state.inspectie.gesprek = "Afspraak: last nooit boven mensen"; App.state.inspectie.positief = "LOTOTO netjes toegepast"; App.stap("klaar"); }); await wacht(400);
  await ev(() => App.sigNaam()); await wacht(200);
  ok(await p.locator(".afr-dock button", { hasText: "Definitief afronden" }).count() === 1 && await p.locator(".afr-dock button", { hasText: "Pauzeren" }).count() === 1, "afronden-stap: knoppen 'Definitief afronden' en 'Pauzeren'");
  ok(await p.locator("text=Nog even nalopen").count() + await p.locator("text=Alles compleet").count() >= 1 && await p.locator("#sig").count() === 1, "herinneringen en handtekening blijven");
  ok(!/Inspectie vastleggen/.test(await p.locator("#view").innerText()), "de oude tekst 'Inspectie vastleggen' is weg");
  await p.locator(".afr-dock").scrollIntoViewIfNeeded(); await S("3-afronden-knoppen");
  await S("3b-afronden-stap-heel", true);
  // App.rapportAfronden telt mee (en laat de PDF zien); vertraagd, zodat de voortgang te zien is
  await ev(() => {
    const echt = App.rapportAfronden; window.__rap = [];
    App.rapportAfronden = async function (o) {
      const ab = new Uint8Array(await o.pdf.arrayBuffer()); let s = ""; for (let i = 0; i < ab.length; i += 0x8000) s += String.fromCharCode.apply(null, ab.subarray(i, i + 0x8000));
      window.__rap.push({ id: o.inspectieId, naam: o.bestandsnaam, type: o.pdf.type, b64: btoa(s) });
      await new Promise((r) => setTimeout(r, 1600));
      return echt.call(this, o);
    };
  });
  const rid = await ev(() => App.state.inspectie.id);
  await p.click(".afr-dock button.primary"); await wacht(400);
  const bev = await p.locator("#mod").innerText();
  ok(/Na afronden ligt de inspectie vast\. Correcties kunnen alleen nog als aanvulling\./.test(bev), "één rustige bevestiging met de vaste tekst");
  await S("4-bevestiging");
  await p.click('#mod button:has-text("efinitief afronden")');
  await p.waitForSelector("#afr-vg .ld-vg:not([hidden])", { timeout: 8000 }).catch(() => {});
  await wacht(250);
  const vg = await ev(() => { const v = document.querySelector("#afr-vg"), bar = v && v.querySelector("[role=progressbar]"); return v ? { tekst: v.innerText, nu: bar && bar.getAttribute("aria-valuenow"), ld: getComputedStyle(v).getPropertyValue("--ld").trim(), soft: getComputedStyle(document.documentElement).getPropertyValue("--soft").trim() } : null; });
  ok(vg && /In de wachtrij zetten/.test(vg.tekst) && +vg.nu >= 80, "voortgang in stappen (nu: 'In de wachtrij zetten…'): " + (vg && vg.tekst.replace(/\s+/g, " ")));
  ok(vg && vg.ld === vg.soft, "voortgangsbalk bij afronden in de neutrale kleur: " + (vg && vg.ld));
  await S("5-voortgang");
  await p.waitForSelector("#mod .afr-uitkomst", { timeout: 20000 });
  await wacht(500);
  const uit = await p.locator("#mod").innerText();
  ok(/Definitief afgerond/.test(uit) && /demo/i.test(uit) && /Je vindt het ook in de app/.test(uit), "uitkomst: rustig, eerlijk dat het een demo is: " + uit.replace(/\s+/g, " ").slice(0, 200));
  ok(await ev(() => !!document.querySelector("#afr-status svg.ld-vink")), "opgeslagen-status met het vinkje (WPI.laad.vinkje)");
  ok(/2 actievoorstellen: 1 klaargezet om in te stellen.*1 ter plaatse hersteld en door jou getoetst: afgerond/.test(uit.replace(/\s+/g, " ")), "uitkomst: zelfde telling als de kop (2 actievoorstellen = 1 klaargezet + 1 ter plaatse afgerond): " + (uit.replace(/\s+/g, " ").match(/\d+ actievoorstel[^.]*/) || [""])[0]);
  await S("6-uitkomst");
  const rap = await ev(() => window.__rap);
  ok(rap.length === 1 && rap[0].id === rid && rap[0].type === "application/pdf" && /\.pdf$/.test(rap[0].naam), "App.rapportAfronden precies één keer, met een PDF-bestand: " + rap.map((r) => r.naam).join(", "));
  const pdf = Buffer.from(rap[0] ? rap[0].b64 : "", "base64"), pdfPad = path.join(OUT, "rapport.pdf");
  fs.writeFileSync(pdfPad, pdf);
  ok(pdf.slice(0, 5).toString() === "%PDF-" && /%%EOF\s*$/.test(pdf.slice(-16).toString()), "PDF begint met %PDF- en eindigt met %%EOF (" + pdf.length + " bytes)");
  ok(pdf.length < 2.5e6, "PDF blijft klein (foto's verkleind): " + Math.round(pdf.length / 1024) + " kB");
  ok(/\/Type \/Page\b/.test(pdf.toString("latin1")) && /Damwand/.test(pdf.toString("latin1")), "PDF heeft pagina's en de objectnaam (documentinformatie)");
  if (heeft("pdfinfo")) {
    const info = execFileSync("pdfinfo", [pdfPad]).toString(), n = +((info.match(/Pages:\s+(\d+)/) || [])[1] || 0);
    ok(n > 0, "pdfinfo: " + n + " pagina('s), " + (info.match(/Page size:.*/) || [""])[0]);
    const txt = tekstVan(pdfPad), plat = txt.replace(/\s+/g, " ");
    ok(/Damwand/.test(txt) && /RWZI Voorbeeldstad/.test(txt) && /Femke Fictief/.test(txt) && /Henk Voorbeeld/.test(txt), "pdftotext: object, locatie, inspecteur en monteurs staan erin");
    ok(plat.includes(ZIE) && !/\? 10 m/.test(plat) && !/->/.test(plat), "de woorden van de inspecteur exact (≥, →, 🚧), geen '?' of '->': " + (plat.match(/hijsband[^”]*/) || [""])[0]);
    ok(/\[A\] Afwijking/.test(txt) && /\d+% /.test(plat) && /\b\d+ van \d+ conform\b/.test(plat) && !/beoordeeld/.test(plat) && /Ondertekening/.test(txt), "pdftotext: oordeel, score 'x van y conform' (niet 'beoordeeld') en ondertekening");
    ok(/WPI-\d{8}-DAM-FF-\d{4}/.test(plat) && /Rapportnummer WPI-\d{8}-DAM-FF-\d{4}/.test(plat) && /WPI-\d{8}-DAM-FF-\d{4}/.test(rap[0].naam), "rapportnummer te noemen (WPI-JJJJMMDD-DAM-FF-UUMM), ook in de bestandsnaam: " + (plat.match(/WPI-\d{8}-\S+/) || [""])[0]);
    ok(/Tijd \d\d:\d\d gestart – \d\d:\d\d afgerond \(\d+ (min|u)/.test(plat), "start, einde en duur: " + (plat.match(/Tijd [^A-Z]*/) || [""])[0]);
    ok(/Foto 1 · DAM-[\d.]+ · 1\/2/.test(plat) && /Foto 2 · DAM-[\d.]+ · 2\/2/.test(plat), "foto's genummerd met bijschrift (Foto 1 · DAM-… · 1/2)");
    ok(/Acties · stand bij afronden/.test(plat) && /voorstellen van de inspecteur/.test(plat) && /Deel als PDF/.test(plat) && !/nog in te stellen · toetser: nog in te stellen/.test(plat), "PDF bij afronden: zegt eerlijk dat dit de stand bij afronden is (voorstellen), en waar de actuele stand staat");
    ok(/Definitief afgerond · ondertekend · ligt vast/.test(plat) && !/NIET ONDERTEKEND/.test(plat), "ondertekend rapport: 'Definitief afgerond · ondertekend'");
    // bewijs van afsluiten: de ter plaatse gecorrigeerde actie noemt wie toetste en wanneer; nooit "nog niet ingesteld", nooit dubbel
    ok((plat.match(/Afgerond ter plaatse · getoetst door Femke Fictief op \d+ \w+\.? \d{4},? \d\d:\d\d/g) || []).length === 1, "PDF bij afronden: 'Afgerond ter plaatse · getoetst door <inspecteur> op <tijd>': " + (plat.match(/Afgerond ter plaatse[^.]{0,60}/) || [""])[0]);
    ok(!/Ter plaatse (direct )?gecorrigeerd; de inspecteur zag het herstel/.test(plat) && !/Nog niet ingesteld/.test(plat), "PDF bij afronden: geen dubbele regel 'Ter plaatse gecorrigeerd' en geen 'Nog niet ingesteld' bij een afgeronde actie");
    ok(/Bij direct herstel ter plaatse zag de inspecteur het herstel/.test(plat), "PDF: de algemene regel laat ruimte voor herstel ter plaatse (inspecteur = toetser)");
    ok(/Inspecteur: Femke Fictief · Manager Projects/.test(plat), "PDF: inspecteur met functie (Manager Projects) bij de ondertekening");
    ok(/Tagged:\s+yes/.test(info), "PDF is getagd (toegankelijk): " + (info.match(/Tagged:.*/) || [""])[0]);
    { // geen (bijna) lege laatste pagina: de voetnoot staat op dezelfde pagina als de ondertekening
      const n = +((info.match(/Pages:\s+(\d+)/) || [])[1] || 0), laatste = execFileSync("pdftotext", ["-enc", "UTF-8", "-f", String(n), "-l", String(n), pdfPad, "-"]).toString("utf8");
      ok(/Ondertekening/.test(laatste) && /Inspecteur: Femke Fictief/.test(laatste) && /Momentopname: alleen wat/.test(laatste), "laatste pagina: ondertekening en voetnoot samen (geen pagina met alleen de voetnoot)");
    }
    if (heeft("pdftoppm")) { const px = hoekPixel(pdfPad); ok(px.hoek.every((c) => c >= 250) && px.onder.every((c) => c >= 250), "witte pagina's (printvriendelijk): " + JSON.stringify(px)); }
    const imgs = (pdf.toString("latin1").match(/\/Subtype \/Image/g) || []).length;
    ok(imgs >= 3, "PDF bevat de twee foto's en de handtekening als beeld: " + imgs);
    if (heeft("pdftoppm")) { execFileSync("pdftoppm", ["-r", "110", "-png", "-f", "1", "-l", "1", pdfPad, path.join(OUT, "7-pdf")]); ok(fs.readdirSync(OUT).some((f) => /^7-pdf-0*1\.png$/.test(f)), "pagina 1 van de PDF als PNG"); }
  } else console.log("  (pdfinfo niet gevonden: alleen de bytes gecontroleerd)");

  // ===== 7. bevroren =====
  ok(await ev(() => App.state.inspectie === null) && new RegExp("#/rapport/" + rid + "$").test(p.url()), "na afronden: geen lopende inspectie, rapport in beeld");
  const conc = await ev(async () => (await WPI.DB.getAll("concept")).filter((c) => c && c.ins && /u-hoofd2/.test(c.id)).map((c) => c.id + ":" + c.ins.titel));
  ok(!conc.some((c) => /Damwand/.test(c)), "geen concept (lopend of gepauzeerd) van de afgeronde inspectie: " + conc.join(", "));
  await ev(() => App.closeModal()); await wacht(500);
  const rapTxt = await p.locator("#view").innerText();
  ok(/Definitief afgerond · ondertekend · ligt vast/.test(rapTxt), "rapport: 'Definitief afgerond · ondertekend · ligt vast'");
  ok(/\d+%\s+conform\s+\d+ van \d+ beoordeelde punten/.test(rapTxt) && (rapTxt.match(/% conform/g) || []).length === 0, "rapport in de app: score één keer (pct, 'conform', x van y), niet drie keer hetzelfde");
  ok(/Afgerond ter plaatse · getoetst door Femke Fictief op/.test(rapTxt) && !/Actiehouder: nog in te stellen · toetser: Femke Fictief/.test(rapTxt), "rapport in de app: ter plaatse gecorrigeerde actie met wie toetste en wanneer");
  ok(/Inspecteur: Femke Fictief · Manager Projects/.test(rapTxt), "rapport in de app: functie van de inspecteur bij de ondertekening");
  ok(/WPI-\d{8}-DAM-FF-\d{4}/.test(rapTxt) && /gestart – \d\d:\d\d afgerond/.test(rapTxt), "rapport in de app: rapportnummer en start–einde");
  ok(await p.locator("#rap input, #rap textarea, #rap select, #rap [contenteditable]").count() === 0, "rapport heeft geen invoervelden (alleen-lezen)");
  await ev(() => App.go("inspectie")); await wacht(500);
  ok(/#\/vandaag$/.test(p.url()), "#/inspectie zonder lopende inspectie → Vandaag");
  ok(await p.locator(".vpauze .hero.pauze").count() === 0 || !/Damwand/.test(await p.locator(".vpauze").innerText()), "Vandaag toont de afgeronde niet als gepauzeerd");
  // oud tabblad: dezelfde inspectie nog in het geheugen → niet bewerken en niet nog eens afronden
  const n0 = await ev(async () => (await WPI.DB.all()).length);
  await ev((id) => { App.state.inspectie = { id, code: "DAM", project: "P26-168", titel: "Damwand · RWZI Voorbeeldstad", taak: null, taken: ["x"], stap: "klaar", taakTekst: "", waarnemingen: [], cur: null, gesprek: "", positief: "", handtekening: null, keuzes: [], monteurs: [] }; App.goIns(); }, rid);
  await wacht(700);
  ok(/Al definitief afgerond/.test(await p.locator("#mod").innerText().catch(() => "")) && await ev(() => App.state.inspectie === null), "oud tabblad: 'Al definitief afgerond', niet meer te bewerken");
  await ev((id) => { App.closeModal(); App.state.inspectie = { id, code: "DAM", project: "", titel: "Damwand", taak: null, taken: ["x"], stap: "klaar", taakTekst: "", waarnemingen: [], cur: null, gesprek: "", positief: "", handtekening: null, keuzes: [], monteurs: [] }; return App.bewaarInspectie(true); }, rid);
  await wacht(500);
  ok(await ev(async () => (await WPI.DB.all()).length) === n0 && (await ev(() => window.__rap.length)) === 1, "nog eens afronden kan niet: geen tweede record en geen tweede rapport");
  await ev(() => App.closeModal());

  // ===== 8. aanvulling (de momentopname zelf verandert niet) =====
  await ev((id) => App.go("rapport/" + id), rid); await wacht(900);
  ok(/Aanvullingen na afronden/.test(await p.locator("#view").innerText()) && await p.locator('button:has-text("Aanvulling toevoegen")').count() === 1, "rapport: sectie 'Aanvullingen na afronden' met de knop voor de inspecteur");
  const recVoor = await ev(async (id) => JSON.stringify(await WPI.DB.get("inspecties", id)), rid);
  await p.click('button:has-text("Aanvulling toevoegen")'); await wacht(400);
  await p.selectOption("#av-over", { label: "Monteurs" });
  const AANV = "De monteur heet Henk Voorbeeldt (met t) · afzetting ≥ 10 m 🚧";
  await p.fill("#av-tekst", AANV);
  await S("8a-aanvulling-venster");
  await p.click('#mod button:has-text("Aanvulling vastleggen")'); await wacht(900);
  ok(/Aanvulling vastgelegd/.test(await p.locator("#mod").innerText()) && /demo/.test(await p.locator("#mod").innerText()), "aanvulling vastgelegd (demo: op dit toestel)");
  await ev(() => App.closeModal()); await wacht(500);
  const rapA = await p.locator(".rapaanv").innerText();
  ok(rapA.includes(AANV) && /Femke Fictief/.test(rapA) && /over: Monteurs/.test(rapA), "aanvulling staat onder het rapport, met naam, tijd en waarover: " + rapA.replace(/\s+/g, " ").slice(0, 160));
  ok(await ev(async (id) => JSON.stringify(await WPI.DB.get("inspecties", id)), rid) === recVoor, "het vastgelegde record zelf is onveranderd");
  await p.locator(".rapaanv").scrollIntoViewIfNeeded(); await S("8b-aanvulling-in-rapport");
  // de open herinnering "Afwijking bij … heeft geen foto" is na afronden te beantwoorden met een echte foto (aanvulling)
  ok(await p.locator(".rapopen .rapfotona").count() === 1, "rapport: bij 'heeft geen foto' een knop 'Foto toevoegen als aanvulling'");
  const [fc2] = await Promise.all([p.waitForEvent("filechooser", { timeout: 8000 }), p.locator(".rapopen .rapfotona").click()]);
  await fc2.setFiles([{ name: "na.png", mimeType: "image/png", buffer: await png("#C9A227") }]); await wacht(900);
  ok(/Foto nasturen/.test(await p.locator("#modtitel").innerText()) && await p.locator("#av-foto img.aanvfoto").count() === 1, "venster 'Foto nasturen' met de gekozen foto");
  ok(/Waarneming \d+ · .* · \[A\]/.test(await p.locator("#av-over option:checked").innerText()), "de aanvulling staat meteen bij de juiste waarneming: " + await p.locator("#av-over option:checked").innerText());
  await S("8c-foto-nasturen");
  await p.click('#mod button:has-text("Aanvulling vastleggen")'); await wacht(900);
  ok(/Aanvulling vastgelegd/.test(await p.locator("#mod").innerText()), "foto-aanvulling vastgelegd");
  await ev(() => App.closeModal()); await wacht(500);
  ok(await p.locator(".rapaanv img.aanvfoto").count() === 1 && /Nagekomen foto/.test(await p.locator(".rapaanv").innerText()), "rapport: de nagekomen foto staat bij de aanvulling (met naam en tijd)");
  ok(await p.locator(".rapopen .rapfotona").count() === 0 && /Foto nagestuurd als aanvulling/.test(await p.locator(".rapopen").innerText()), "herinnering 'geen foto': nu 'Foto nagestuurd als aanvulling'");
  ok(await ev(async (id) => JSON.stringify(await WPI.DB.get("inspecties", id)), rid) === recVoor, "het vastgelegde record blijft ook nu onveranderd");

  // een actie instellen (coördinator): houder, toetser, plandatum en een aangepaste tekst
  const actId = await ev(async (id) => { const r = await WPI.DB.get("inspecties", id); return r.waarnemingen.find((w) => w.actie && w.actie.actie_id).actie.actie_id; }, rid);
  await ev(() => App.login("u-coord1")); await wacht(500);
  await ev(async () => { App.acties = null; await App.laadActies(); });
  await ev((id) => App.openActie(id), actId); await wacht(400);
  await p.fill("#ai-tekst", "Hijsband vervangen en LMRA aanvullen met hijsmiddelencheck");
  await p.selectOption("#ai-houder", "u-coord2"); await p.selectOption("#ai-toetser", "u-hoofd");
  await ev((id) => App.stelIn(id), actId); await wacht(500);
  ok(await ev((id) => App.acties.find((a) => a.id === id).status, actId) === "Open", "actie ingesteld (status Open)");
  await ev((id) => App.go("rapport/" + id), rid); await wacht(900);
  ok(await p.locator('button:has-text("Aanvulling toevoegen")').count() === 0, "een andere coördinator (niet de inspecteur) krijgt geen knop 'Aanvulling toevoegen'");
  await ev(() => App.login("u-hoofd2")); await wacht(500);

  // ===== 9. Deel als PDF: actuele stand; Origineel bij afronden: het bestand van toen =====
  await ev((id) => App.go("rapport/" + id), rid); await wacht(900);
  ok(await p.locator('button:has-text("Deel als PDF")').count() === 1 && await p.locator('button:has-text("Opslaan als PDF / printen")').count() === 1 && await p.locator('button:has-text("Origineel bij afronden")').count() === 1, "rapport: 'Deel als PDF', 'Opslaan als PDF / printen' en 'Origineel bij afronden'");
  const rapActie = await p.locator("#view").innerText();
  ok(/Voorstel van de inspecteur bij afronden:/.test(rapActie) && /Laatste stap: Ingesteld/.test(rapActie), "rapport in de app: aangepaste actietekst naast het voorstel van toen, met de laatste stap");
  await p.locator(".rapknoppen").scrollIntoViewIfNeeded(); await S("9-rapport-deel-als-pdf");
  await S("9b-rapport-heel", true);
  await ev(() => { window.__deel = []; navigator.canShare = (d) => !!(d && d.files && d.files.length); navigator.share = async (d) => { for (const f of d.files) { const ab = new Uint8Array(await f.arrayBuffer()); let s = ""; for (let i = 0; i < ab.length; i += 0x8000) s += String.fromCharCode.apply(null, ab.subarray(i, i + 0x8000)); window.__deel.push({ naam: f.name, type: f.type, size: f.size, b64: btoa(s) }); } }; });
  await p.click('button:has-text("Deel als PDF")'); await wacht(2500);
  const deel = await ev(() => window.__deel);
  ok(deel.length === 1 && deel[0].type === "application/pdf" && /\.pdf$/.test(deel[0].naam) && deel[0].size > 1000, "Deel als PDF → navigator.share met één PDF: " + JSON.stringify(deel.map((d) => d.naam)));
  if (deel[0] && heeft("pdftotext")) {
    const dp = path.join(OUT, "rapport-actueel.pdf"); fs.writeFileSync(dp, Buffer.from(deel[0].b64, "base64"));
    const t2 = tekstVan(dp).replace(/\s+/g, " ");
    ok(/Acties · actuele stand/.test(t2) && /Actiehouder Dirk Demo/.test(t2) && /Toetser Bram Voorbeeld/.test(t2) && /Plandatum \S+/.test(t2) && /Laatste stap: Ingesteld/.test(t2), "actuele PDF: actiehouder, toetser, plandatum en laatste stap per actie: " + (t2.match(/Actiehouder.{0,120}/) || [""])[0]);
    ok(/Hijsband vervangen/.test(t2) && /Voorstel van de inspecteur bij afronden:/.test(t2), "actuele PDF: aangepaste actietekst, met het voorstel van toen ernaast");
    ok(/Aanvullingen na afronden/.test(t2) && t2.includes(AANV), "actuele PDF: de aanvulling exact (≥, emoji)");
    ok(t2.includes(ZIE) && /actuele stand op/.test(t2) && /Deel 1 \(ondertekend\)/.test(t2) && !/actuele stand van de acties en de aanvullingen, de actuele stand/.test(t2), "actuele PDF: dezelfde momentopname (waarneming exact), met het moment van de stand (niet dubbel)");
    // de handtekening dekt alleen de momentopname: daarna een bijlage, uitdrukkelijk niet ondertekend
    const iO = t2.indexOf("Ondertekening"), iV = t2.indexOf("Momentopname: alleen wat"), iB = t2.indexOf("BIJLAGE · NA DE ONDERTEKENING · NIET ONDERTEKEND"), iA = t2.indexOf("Aanvullingen na afronden"), iAct = t2.indexOf("Acties · actuele stand");
    ok(iO > 0 && iO < iV && iV < iB && iB < iAct && iAct < iA, "actuele PDF: ondertekening (met voetnoot) sluit de momentopname af; daarna de bijlage (acties van nu, aanvullingen): " + [iO, iV, iB, iAct, iA].join(" < "));
    ok(/Acties · stand bij afronden/.test(t2.slice(0, iB)) && (t2.match(/Afgerond ter plaatse · getoetst door Femke Fictief op/g) || []).length === 2 && !/Nog niet ingesteld/.test(t2), "actuele PDF: ondertekend deel gelijk aan het origineel (stand bij afronden); de gecorrigeerde actie noemt in beide delen wie toetste");
    ok(/Nagekomen foto/.test(t2) && /Foto \d+ · aanvulling/.test(t2), "actuele PDF: de nagekomen foto staat in de bijlage, met bijschrift");
    if (heeft("pdfinfo")) ok(/Tagged:\s+yes/.test(execFileSync("pdfinfo", [dp]).toString()), "actuele PDF is ook getagd");
    if (heeft("pdftoppm")) execFileSync("pdftoppm", ["-r", "80", "-png", dp, path.join(OUT, "9c-pdf-actueel")]);
  }
  await ev(() => { navigator.canShare = undefined; navigator.share = undefined; });
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }).catch(() => null), p.click('button:has-text("Deel als PDF")')]);
  ok(dl && /\.pdf$/.test(dl.suggestedFilename()), "zonder deelfunctie: download " + (dl && dl.suggestedFilename()));
  if (dl) { const dp = path.join(OUT, "download.pdf"); await dl.saveAs(dp); ok(fs.readFileSync(dp).slice(0, 5).toString() === "%PDF-", "gedownload bestand is een PDF"); }
  const [dlo] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }).catch(() => null), p.click('button:has-text("Origineel bij afronden")')]);
  if (dlo) { const op = path.join(OUT, "origineel.pdf"); await dlo.saveAs(op); ok(fs.readFileSync(op).equals(pdf), "'Origineel bij afronden' = precies het bestand van het afronden (" + dlo.suggestedFilename() + ")"); }
  else ok(false, "'Origineel bij afronden' gaf geen download");

  // ===== 10. staf opent het rapport vanuit de lijst; coördinator niet daar =====
  await ev(() => App.login("u-qhse")); await wacht(500);
  await ev(() => App.go("inspecties")); await wacht(900);
  ok(await p.locator(".ikaart .pdfknop").count() >= 1, "QHSE-manager: PDF-knop bij de inspectie in de lijst");
  // terugvinden op het rapportnummer dat een auditor voorleest (heel, of alleen de laatste cijfers)
  const nummer = await ev(async (id) => App.rapportNummer(await WPI.DB.get("inspecties", id)), rid);
  await ev(() => App.openSearch()); await wacht(400);
  for (const q of [nummer, nummer.slice(-4), nummer.toLowerCase()]) {
    await p.fill("#zq", q); await wacht(250);
    ok(/Damwand · RWZI Voorbeeldstad/.test(await p.locator("#zr").innerText()) && !/Niets gevonden/.test(await p.locator("#zr").innerText()), "Zoeken vindt het rapport op '" + q + "'");
  }
  await S("10-zoeken-rapportnummer");
  await ev(() => App.closeModal()); await wacht(200);
  await S("9-inspecties-staf");
  const [dl2] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }).catch(() => null), p.locator(".ikaart .pdfknop").first().click()]);
  ok(dl2 && /\.pdf$/.test(dl2.suggestedFilename()), "QHSE-manager opent het bewaarde rapport (PDF): " + (dl2 && dl2.suggestedFilename()));
  ok(/#\/inspecties$/.test(p.url()), "PDF-knop opent niet tegelijk het rapportscherm");
  await p.locator(".ikaart.ik-staf .ik-open").first().click(); await wacht(800);
  ok(/#\/rapport\//.test(p.url()), "staf: tik op de kaart opent nog steeds het rapport");
  await ev(() => App.login("u-coord1")); await wacht(500);
  await ev(() => App.go("inspecties")); await wacht(900);
  ok(await p.locator(".ikaart .pdfknop").count() === 0, "coördinator: geen PDF-knop in de lijst (wel via het rapport)");

  // ===== 11. fout bij het maken van de PDF: inspectie blijft vastgelegd, opnieuw proberen kan =====
  await ev(() => App.login("u-hoofd2")); await wacht(500);
  await ev(() => { App.startInspectie("DAM", "", "Damwand · Foutproef", true); App.kiesTaak(App.data.kennisbank.DAM.regels[0].taak); App.setVeld("zie", "alles netjes"); App.stap("klaar"); });
  await wacht(300);
  await ev(() => { window.__echtMaak = App.maakRapportPdf; App.maakRapportPdf = async () => { throw new Error("proef: geen geheugen"); }; });
  await ev(() => App.bewaarInspectie(true)); await wacht(400);
  const fout = await p.locator("#mod").innerText();
  ok(/Definitief afgerond/.test(fout) && /nog niet gemaakt/.test(fout) && /Rapport opnieuw maken/.test(fout), "PDF mislukt: eerlijk gemeld, inspectie wel vastgelegd, knop 'Rapport opnieuw maken'");
  await ev(() => { App.maakRapportPdf = window.__echtMaak; });
  await p.click('#mod button:has-text("Rapport opnieuw maken")');
  await p.waitForSelector("#mod .afr-uitkomst:not(.fout)", { timeout: 20000 }).catch(() => {});
  ok(/demo/i.test(await p.locator("#mod").innerText()) && (await ev(() => window.__rap.length)) === 2, "opnieuw maken lukt (rapport nu in de wachtrij/demo)");

  // ===== 12. zonder handtekening afgerond: dat staat groot bovenaan, nooit de groene "definitief"-uitstraling =====
  const rap2 = await ev(() => window.__rap[window.__rap.length - 1]);
  if (rap2 && heeft("pdftotext")) {
    const up = path.join(OUT, "rapport-zonder-handtekening.pdf"); fs.writeFileSync(up, Buffer.from(rap2.b64, "base64"));
    const regels = tekstVan(up).split("\n").map((x) => x.trim()).filter(Boolean), boven = regels.slice(0, 12).join(" ");
    ok(/NIET ONDERTEKEND/.test(boven) && /niet ondertekend door de inspecteur/.test(boven), "PDF zonder handtekening: bovenaan 'NIET ONDERTEKEND' en de uitleg: " + boven.slice(0, 200));
    ok(!/ondertekend · ligt vast/.test(regels.join(" ")) && /Afgerond met \d+ open herinnering/.test(regels.slice(0, 30).join(" ")), "PDF zonder handtekening: geen 'ondertekend'-badge; open herinneringen bovenaan (niet in de voetnoot)");
    if (heeft("pdftoppm")) { execFileSync("pdftoppm", ["-r", "110", "-png", "-f", "1", "-l", "1", up, path.join(OUT, "12-pdf-zonder-handtekening")]); }
  } else ok(!!rap2, "rapport zonder handtekening gemaakt");
  await ev(() => App.closeModal());
  await ev(async () => { const a = await WPI.DB.all(); location.hash = "#/rapport/" + a.find((r) => /Foutproef/.test(r.titel)).id; }); await wacht(900);
  ok(await p.locator(".rapvast.niet").count() === 1 && /Niet ondertekend/.test(await p.locator(".rapvast.niet").innerText()), "rapport in de app zonder handtekening: rode melding 'Niet ondertekend' bovenaan");
  await S("12-rapport-zonder-handtekening");
  // "Deel als PDF" van een niet-ondertekend rapport: nergens "ondertekend" of "na de ondertekening" (er is geen handtekening)
  if (heeft("pdftotext")) {
    const b64 = await ev(async () => {
      const r = (await WPI.DB.all()).find((x) => /Foutproef/.test(x.titel));
      await App.aanvullingToevoegen({ inspectieId: r.id, over: "Algemeen", tekst: "Nagekomen: hekwerk alsnog geplaatst" });
      const blob = await App.maakRapportPdf(r, () => {}, "actueel"), ab = new Uint8Array(await blob.arrayBuffer());
      let s = ""; for (let i = 0; i < ab.length; i += 0x8000) s += String.fromCharCode.apply(null, ab.subarray(i, i + 0x8000)); return btoa(s);
    });
    const up2 = path.join(OUT, "rapport-zonder-handtekening-actueel.pdf"); fs.writeFileSync(up2, Buffer.from(b64, "base64"));
    const t3 = tekstVan(up2).replace(/\s+/g, " ");
    ok(/NIET ONDERTEKEND/.test(t3) && /Deel 1 \(niet ondertekend\)/.test(t3) && !/\(ondertekend\)/.test(t3) && !/[Nn]a de ondertekening|NA DE ONDERTEKENING/.test(t3) && !/ondertekende momentopname/.test(t3) && !/onder de handtekening/.test(t3),
      "actuele PDF zonder handtekening: 'Deel 1 (niet ondertekend)', geen tekst over een handtekening die er niet is: " + (t3.match(/Deel 1.{0,220}/) || [""])[0]);
    ok(/BIJLAGE · NA HET AFRONDEN · NIET ONDERTEKEND/.test(t3) && t3.includes("Nagekomen: hekwerk alsnog geplaatst") && (t3.match(/actuele stand op/g) || []).length === 1 && !/de actuele stand van de acties en de aanvullingen, de actuele stand/.test(t3),
      "actuele PDF zonder handtekening: bijlage 'na het afronden' met de aanvulling; 'actuele stand' niet dubbel");
  }

  // ===== 13. oud tweede tabblad (zelfde toestel) na definitief afronden in het eerste =====
  await ev(() => App.login("u-hoofd2")); await wacht(500);
  await ev(() => { App.startInspectie("DAM", "", "Damwand · Stale", true); App.kiesTaak(App.data.kennisbank.DAM.regels[0].taak); }); await wacht(300);
  await ev(() => { const i = App.state.inspectie; App.nieuweWaarneming(); i.cur.tekst = "kabel ligt over het looppad"; i.cur.regel_id = App.data.kennisbank.DAM.regels[0].id; i.cur.oordeel = "V"; i.cur.actie.tekst = "Kabel ophangen"; i.waarnemingen.push(i.cur); i.cur = null; App.stap("klaar"); }); await wacht(400);
  await ev(() => App.sigNaam()); await wacht(500);
  const sid = await ev(() => App.state.inspectie.id);
  const t2 = await ctx.newPage(); t2.on("pageerror", (e) => errs.push("PAGEERR tab2 " + e.message));
  await t2.goto(BASE + "/index.html#/inspectie"); await t2.waitForTimeout(1200);
  ok(await t2.evaluate(() => App.state.inspectie && App.state.inspectie.titel) === "Damwand · Stale", "tabblad 2 laadt dezelfde lopende inspectie");
  await t2.evaluate(() => App.stap("gesprek")); await t2.waitForTimeout(400);
  const stale = await t2.evaluate(() => JSON.stringify(App.state.inspectie));
  await p.bringToFront();
  await p.click(".afr-dock button.primary"); await wacht(400);
  await p.click('#mod button:has-text("efinitief afronden")');
  await p.waitForSelector("#mod .afr-uitkomst", { timeout: 20000 }); await wacht(400);
  // tabblad 2 hoort het meteen (BroadcastChannel): geen bewerkbaar scherm meer
  await t2.waitForTimeout(800);
  ok(/Al definitief afgerond/.test(await t2.locator("#mod").innerText().catch(() => "")) && await t2.evaluate(() => App.state.inspectie === null) && !/#\/inspectie$/.test(t2.url()), "tabblad 2: meteen 'Al definitief afgerond', geen bewerkbaar inspectiescherm meer");
  // en ook als dat bericht gemist is: tabblad 2 heeft de oude stand nog in het geheugen en gaat naar de achtergrond
  await t2.evaluate((s) => { App.closeModal(); App.state.inspectie = JSON.parse(s); }, stale);
  await t2.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await t2.waitForTimeout(800);
  const c2 = await ev(async () => (await WPI.DB.getAll("concept")).filter((c) => c.ins).map((c) => c.id + ":" + c.ins.id));
  ok(!c2.some((c) => c.endsWith(":" + sid)), "verborgen oud tabblad schrijft de afgeronde inspectie niet terug als lopend: " + JSON.stringify(c2));
  // ook bij uitloggen niet (logout bewaart de lopende alleen als hij nog niet vastligt)
  await t2.evaluate((s) => { App.state.inspectie = JSON.parse(s); App._conceptBijUitloggen(App.user, App.state.inspectie, Date.now() + 5000, 0); }, stale);
  await t2.waitForTimeout(500);
  const c3 = await ev(async () => (await WPI.DB.getAll("concept")).filter((c) => c.ins).map((c) => c.id + ":" + c.ins.id));
  ok(!c3.some((c) => c.endsWith(":" + sid)), "uitloggen in het oude tabblad zet hem ook niet terug: " + JSON.stringify(c3));
  await t2.close();
  // stond er tóch nog een oude kopie (bijv. van een oudere versie van de app): herladen ruimt hem op, Vandaag is schoon
  await ev((s) => WPI.DB.put("concept", { id: "lopend-u-hoofd2", ins: JSON.parse(s), t: new Date().toISOString() }), stale);
  await p.reload(); await wacht(1200);
  await ev(() => App.go("vandaag")); await wacht(900);
  ok(!/Je inspectie loopt nog/.test(await p.locator("#view").innerText()) && await ev(() => App.state.inspectie === null), "na herladen: Vandaag zonder 'Je inspectie loopt nog' voor de afgeronde inspectie");
  ok(!(await ev(async () => (await WPI.DB.getAll("concept")).some((c) => c.id === "lopend-u-hoofd2"))), "de oude kopie is van het toestel opgeruimd");
  // Vandaag zelf ruimt ook op als de afgeronde nog in het geheugen van een tabblad zit
  await ev((s) => { App.state.inspectie = JSON.parse(s); App.go("vandaag"); App.route(); }, stale); await wacht(900);
  ok(await ev(() => App.state.inspectie === null) && !/Je inspectie loopt nog/.test(await p.locator("#view").innerText()), "Vandaag: een afgeronde inspectie in het geheugen telt niet als lopend");

  console.log("ERRS", errs);
  await b.close();
})().catch((e) => { console.log("FOUT exceptie: " + (e && e.stack || e)); console.log("ERRS", errs.concat(["exceptie"])); process.exit(1); });
