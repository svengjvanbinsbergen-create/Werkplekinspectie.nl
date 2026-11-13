// Bouwt Handleiding-Werkplekinspectie-app.docx (docx-js). Beelden: emb/ (screenshots met dunne rand).
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, HeadingLevel, Header, Footer, PageNumber, ShadingType, LevelFormat, VerticalAlign, PageBreak,
} = require("docx");

const EMB = process.env.EMB || path.join(__dirname, "emb");
const OUT = process.env.OUT || path.join(__dirname, "..", "..", "Handleiding-Werkplekinspectie-app.docx");

const FONT = "Arial";
const KLEUR = "1F3A44";      // rustig donker blauwgrijs voor koppen
const GRIJS = "5F6B70";
const LIJN = "D5DADC";
const VLAK = "F2F4F5";

// A4, marges 0,75"
const PAGE_W = 11906, MARGE = 1080, CONTENT = PAGE_W - 2 * MARGE; // 9746

// ---------- helpers ----------
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
// tekst met **vet**-markering
function runs(s, o = {}) {
  const out = [];
  s.split(/(\*\*[^*]+\*\*)/).forEach((p) => {
    if (!p) return;
    if (p.startsWith("**")) out.push(t(p.slice(2, -2), { ...o, bold: true }));
    else out.push(t(p, o));
  });
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: runs(s, o.run || {}), spacing: { after: o.after ?? 100, before: o.before ?? 0, line: 276 }, alignment: o.align, keepNext: o.keepNext });
const H1 = (s, nieuw) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(s)], pageBreakBefore: !!nieuw });
const H2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(s)] });

let lijstNr = 0;
const numCfg = [];
function nieuweLijst() {
  const ref = "lijst" + (++lijstNr);
  numCfg.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 340, hanging: 340 } }, run: { font: FONT, bold: true, color: KLEUR } } }] });
  return ref;
}
const NUM = (items, size) => { const ref = nieuweLijst(); return items.map((s) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(s, size ? { size } : {}), spacing: { after: 60, line: 264 } })); };
const BUL = (items, size) => items.map((s) => new Paragraph({ numbering: { reference: "bol", level: 0 }, children: runs(s, size ? { size } : {}), spacing: { after: 50, line: 264 } }));

const geen = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const geenRand = { top: geen, bottom: geen, left: geen, right: geen, insideHorizontal: geen, insideVertical: geen };
const dun = { style: BorderStyle.SINGLE, size: 4, color: LIJN };
const dunRand = { top: dun, bottom: dun, left: dun, right: dun };

function beeld(naam, breedteInch) {
  const f = path.join(EMB, naam + ".png");
  const buf = fs.readFileSync(f);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const bw = Math.round(breedteInch * 96), bh = Math.round(bw * h / w);
  return new ImageRun({ type: "png", data: buf, transformation: { width: bw, height: bh }, altText: { title: naam, description: naam, name: naam } });
}
const beeldPar = (naam, inch) => new Paragraph({ children: [beeld(naam, inch)], alignment: AlignmentType.CENTER, spacing: { after: 80 } });

// cel met screenshot + korte uitleg
function stapCel(naam, kop, tekst, breedte, inch = 1.7) {
  const kids = [beeldPar(naam, inch)];
  if (kop) kids.push(new Paragraph({ children: runs(kop, { bold: true, size: 19, color: KLEUR }), spacing: { after: 40 } }));
  (Array.isArray(tekst) ? tekst : tekst ? [tekst] : []).forEach((s) => kids.push(new Paragraph({ children: runs(s, { size: 17 }), spacing: { after: 40, line: 252 } })));
  return new TableCell({ children: kids, width: { size: breedte, type: WidthType.DXA }, margins: { top: 60, bottom: 120, left: 90, right: 90 }, verticalAlign: VerticalAlign.TOP, borders: { top: geen, bottom: geen, left: geen, right: geen } });
}
const tekstCel = (kids, breedte, o = {}) => new TableCell({ children: kids, width: { size: breedte, type: WidthType.DXA }, margins: { top: 60, bottom: 100, left: o.left ?? 120, right: o.right ?? 120 }, verticalAlign: VerticalAlign.TOP, borders: { top: geen, bottom: geen, left: geen, right: geen } });

function rij(cellen, breedtes) {
  return new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: breedtes, borders: geenRand, rows: [new TableRow({ children: cellen, cantSplit: true })] });
}
const DRIE = [3248, 3249, 3249];

// kader met lichte achtergrond
function kader(kids) {
  return new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [CONTENT], rows: [new TableRow({ cantSplit: true, children: [
    new TableCell({ children: kids, width: { size: CONTENT, type: WidthType.DXA }, shading: { fill: VLAK, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 140, bottom: 120, left: 200, right: 200 }, borders: { top: geen, bottom: geen, left: { style: BorderStyle.SINGLE, size: 18, color: KLEUR }, right: geen } })] })] });
}
const ruimte = (n = 120) => new Paragraph({ children: [], spacing: { after: n } });

// ---------- inhoud ----------
const body = [];

// Titel
body.push(new Paragraph({ children: [t("[Organisatie]", { size: 20, color: GRIJS })], spacing: { after: 60 } }));
body.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [t("Werkplekinspectie doen met de app")] }));
body.push(P("Handleiding voor inspecteurs, met een kort deel voor coördinatoren over het opvolgen van acties.", { run: { size: 22, color: GRIJS }, after: 240 }));
body.push(P("Deze handleiding laat zien hoe je met de app een werkplekinspectie (momentopname) doet en hoe acties daarna worden opgevolgd. De schermafbeeldingen komen uit de voorbeeldversie met fictieve gegevens. Jouw scherm kan er iets anders uitzien.", { after: 200 }));

body.push(kader([
  new Paragraph({ children: [t("Zo werken we: de vaste regels", { bold: true, size: 24, color: KLEUR })], spacing: { after: 100 } }),
  ...NUM([
    "**Alleen wat je ziet telt.** Leg vast wat je nu op de werkplek ziet. Geen aannames, verhalen of ‘meestal’.",
    "**Jij beoordeelt.** Jij kiest C, A, V of NVT. De app (AI) doet alleen een **Voorstel**, en dat telt pas als jij het bevestigt.",
    "**Een gesprek, geen afvinklijst.** Kijk mee, stel open vragen, luister en benoem ook wat goed gaat.",
    "**Direct gevaar? Eerst stoppen.** Laat het werk stilleggen. Vastleggen komt daarna.",
    "**Toetser ≠ actiehouder.** Een actie is pas **Afgerond** na toetsing door de toetser. De QHSE-manager is nooit actiehouder.",
    "**Foto’s.** Herkenbare personen mogen op de foto. Tip: fotografeer gericht de situatie (de last, de afzetting, het gereedschap) en niet de persoon.",
  ]),
]));
body.push(ruimte(200));

body.push(new Paragraph({ children: [t("Inhoud", { bold: true, size: 24, color: KLEUR })], spacing: { after: 80 } }));
[["1", "Installeren en inloggen"], ["2", "Het scherm Vandaag"], ["3", "Een inspectie doen, stap voor stap"], ["4", "Tips voor op locatie"], ["5", "Acties: van Voorstel naar Afgerond (coördinatoren)"], ["6", "Oefeninspectie"]]
  .forEach(([n, s]) => body.push(new Paragraph({ children: [t(n + "   ", { bold: true, color: KLEUR }), t(s)], spacing: { after: 50 }, indent: { left: 200 } })));

// ---------- 1 ----------
body.push(H1("1  Installeren en inloggen", true));
body.push(P("De app is een webapp die je op je beginscherm zet. Je hebt geen appwinkel nodig. Je krijgt de link van [Organisatie]."));
const LINKS = 6346, RECHTS = CONTENT - LINKS;
body.push(rij([
  tekstCel([
    new Paragraph({ children: [t("Android (Chrome)", { bold: true, color: KLEUR, size: 21 })], spacing: { after: 60 } }),
    ...NUM(["Open de link in **Chrome**.", "Tik rechtsboven op de **drie puntjes**.", "Kies **App installeren** of **Toevoegen aan startscherm**.", "Bevestig. Het icoon **WPI** staat nu op je beginscherm."]),
    new Paragraph({ children: [t("iPhone (Safari)", { bold: true, color: KLEUR, size: 21 })], spacing: { before: 120, after: 60 } }),
    ...NUM(["Open de link in **Safari** (niet vanuit de mail-app of een andere browser).", "Tik onderin op de **deelknop** (vierkant met pijl omhoog).", "Kies **Zet op beginscherm**.", "Tik op **Voeg toe**."]),
    new Paragraph({ children: [t("Inloggen", { bold: true, color: KLEUR, size: 21 })], spacing: { before: 120, after: 60 } }),
    ...NUM([
      "Open de app via het icoon en vul je **werk-e-mailadres** en **wachtwoord** in.",
      "**Ingelogd blijven op dit toestel**: alleen aanzetten op je eigen telefoon. Dan opent de app ook zonder bereik. Nooit op een gedeeld toestel.",
      "Tik op **Inloggen**. Wachtwoord kwijt? Tik op **Wachtwoord vergeten?** en volg de mail.",
    ]),
    P("Geen account? Vraag het aan de beheerder van de app bij [Organisatie].", { run: { size: 18, color: GRIJS }, before: 60 }),
  ], LINKS, { left: 0 }),
  stapCel("01-inloggen", "", "Inloggen met je werk-e-mailadres.", RECHTS, 1.7),
], [LINKS, RECHTS]));

// ---------- 2 ----------
body.push(H1("2  Het scherm Vandaag"));
body.push(rij([
  stapCel("02-vandaag", "", "Vandaag: één blik, wat moet ik doen?", RECHTS, 1.7),
  tekstCel([
    P("Na het inloggen zie je **Vandaag**. Van boven naar beneden:"),
    ...NUM([
      "**De grote kaart** is je inspectie van vandaag. Tik ergens op de kaart om te starten. Loopt er al een inspectie, dan staat hier **Verder met de inspectie**.",
      "**Nieuw als inspecteur?** Hier start je de oefeninspectie (zie hoofdstuk 6).",
      "**Acties**: hoeveel acties op jou wachten (in te stellen, te toetsen, lopend). Oranje betekent te laat.",
      "**Meer**: een inspectie inplannen of een andere, spontane inspectie starten.",
      "**Bovenin**: de bel (meldingen) en het rondje met je initiaal (menu met Zoeken, Weergave, Oefenen en Uitloggen).",
      "**Onderin**: Vandaag, Planning, Inspecties en Acties.",
    ]),
  ], LINKS, { right: 0 }),
], [RECHTS, LINKS]));

// ---------- 3 ----------
body.push(H1("3  Een inspectie doen, stap voor stap", true));
body.push(P("De app leidt je door de momentopname: elke stap is één vraag. Alles wordt direct op je telefoon bewaard (**Veilig op dit toestel**). Word je gestoord, dan ga je later gewoon verder."));
body.push(kader([P("**Het is een gesprek, geen afvinklijst.** Kijk mee met de monteurs en stel open vragen, zoals ‘Wat is hier het grootste risico?’, ‘Wat doen jullie ertegen?’ en ‘Wanneer leggen jullie het werk stil?’. Benoem concreet wat goed gaat. De app gebruik je tussendoor of direct erna.", { after: 0 })]));
body.push(ruimte(80));
body.push(rij([
  stapCel("04-taak", "1  Taak", "**Wat doen de monteurs nu?** Vertel het in je eigen woorden. De app stelt de taak voor: tik **Gebruik dit** als het klopt, of kies zelf uit alle taken.", DRIE[0]),
  stapCel("05-wat-zie-je", "2  Wat zie je?", ["Houd **Inspreken** vast en praat; loslaten is klaar. Of typ. Tik **Foto** voor een of meer foto’s, bijvoorbeeld overzicht én detail.", "**Alleen wat je nu ziet telt.**"], DRIE[1]),
  stapCel("06-direct-gevaar", "Direct gevaar? Eerst stoppen", "Tik **Direct gevaar**. Laat het werk eerst stilleggen en tik dan **Werk is stilgelegd**. De actie krijgt prioriteit Direct; het oordeel kies je zelf.", DRIE[2]),
], DRIE));
body.push(rij([
  stapCel("07-koppelen-tra", "3  Koppelen aan de TRA", "De app doet een **Voorstel** voor de TRA-regel en laat zien waarom. Het telt pas als jij het bevestigt. Klopt het niet: kies een andere regel of **Staat niet in de TRA**.", DRIE[0]),
  stapCel("08-oordeel", "4  Oordeel", ["Jij kiest: **C** Conform, **A** Afwijking, **V** Verbeterpunt of **Niet van toepassing**. Niets is voorgekozen.", "Met je oordeel bevestig je ook het Voorstel."], DRIE[1]),
  stapCel("09-actievoorstel", "5  Actievoorstel", "Bij A of V: **Wat moet er gebeuren?** Pas de voorgestelde tekst aan of spreek in. Kies hoe dringend en wat er ter plaatse is gedaan. Tik **Actievoorstel vastleggen**.", DRIE[2]),
], DRIE));
body.push(P("Daarna vraagt de app **Nog iets gezien?** Kies een volgende waarneming, de algemene onderwerpen, een andere taak of **Nee, naar het gesprek met de monteurs**. Een fout gemaakt? Tik **Ongedaan maken**.", { run: { size: 18 }, after: 120 }));
body.push(rij([
  stapCel("11-monteurs", "6  Monteurs", "Tik aan wie er aan het werk was (alleen de naam). Noteer wat jullie bespraken, hun ideeën en **wat opvallend goed ging**.", DRIE[0]),
  stapCel("12-controle", "7  Controle", "**Klopt dit?** toont de telling. Het gele vak is een herinnering, geen blokkade: vul aan, of leg toch vast.", DRIE[1]),
  stapCel("14-vastgelegd", "8  Vastleggen", "Zet je handtekening in het vak en tik **Inspectie vastleggen**. Actievoorstellen gaan naar **Acties › In te stellen**.", DRIE[2]),
], DRIE));
body.push(rij([
  stapCel("15-rapport-deel1", "", "", DRIE[0], 1.5),
  stapCel("16-rapport-deel2", "", "", DRIE[1], 1.5),
  tekstCel([
    new Paragraph({ children: runs("9  Rapport", { bold: true, size: 19, color: KLEUR }), spacing: { after: 60 } }),
    P("Het rapport opent direct na het vastleggen. Je vindt het later terug onder **Inspecties**.", { run: { size: 17 } }),
    P("Erin staan:", { run: { size: 17 }, after: 40 }),
    ...BUL(["getoetste taken en monteurs;", "waarnemingen met jouw oordeel;", "acties met hun status;", "het gesprek en wat goed ging;", "foto’s en je handtekening."], 17),
    P("Tik **Opslaan als PDF / printen** om het rapport te delen.", { run: { size: 17 }, before: 60 }),
  ], DRIE[2]),
], DRIE));

// ---------- 4 ----------
body.push(H1("4  Tips voor op locatie"));
body.push(rij([
  stapCel("17-weergave", "Weergave", "Tik tijdens de inspectie rechtsboven op het **zonnetje** (of via het menu › **Weergave**).", DRIE[0]),
  stapCel("18-veld-zonmodus", "Veld- en zonmodus aan", "Grotere knoppen, dikke randen en hoog contrast. De keuze blijft bewaard op je telefoon.", DRIE[1]),
  tekstCel([
    new Paragraph({ children: runs("Veldmodus en zonmodus", { bold: true, size: 19, color: KLEUR }), spacing: { after: 60 } }),
    ...BUL([
      "**Veldmodus**: grotere knoppen en microfoon, voor werken met handschoenen.",
      "**Zonmodus**: zwart op wit met dikke randen, leesbaar in fel licht.",
      "Tijdens een inspectie blijft het scherm vanzelf aan.",
    ], 17),
  ], DRIE[2]),
], DRIE));
body.push(H2("Met handschoenen"));
body.push(...BUL([
  "Zet **Veldmodus** aan. De grote kaart op Vandaag is in zijn geheel één knop.",
  "**Inspreken** gaat sneller dan typen: knop vasthouden en praten, loslaten is klaar. Of tik kort voor aan en uit.",
  "Werkt inspreken niet? Tik in het tekstvak en gebruik het **microfoontje van je toetsenbord**.",
]));
body.push(H2("Offline werken"));
body.push(...BUL([
  "De app werkt **zonder bereik**. Alles wat je vastlegt, staat direct veilig op je telefoon.",
  "Zodra er weer verbinding is, verstuurt de app je werk vanzelf. Je ziet de stand in het menu bij **Synchronisatie**.",
  "Open de app minstens één keer **met bereik** voordat je naar de locatie gaat.",
  "Wil je de app zonder bereik opnieuw kunnen openen? Zet bij het inloggen **Ingelogd blijven** aan (alleen op je eigen telefoon).",
  "App weggeklikt of gebeld? Open de app en tik op **Verder met de inspectie**. Er gaat niets verloren.",
]));

// ---------- 5 ----------
body.push(H1("5  Acties: van Voorstel naar Afgerond"));
body.push(P("Voor coördinatoren, actiehouders en toetsers. Elke A of V uit een inspectie wordt een **Voorstel**. Daarna doorloopt de actie deze statussen:"));
// statusbalk
const ST = ["Voorstel", "Open", "In uitvoering", "Klaar voor toetsing", "Afgerond"];
const stW = Math.floor(CONTENT / ST.length);
const stBreedtes = ST.map((_, i) => (i === ST.length - 1 ? CONTENT - stW * (ST.length - 1) : stW));
body.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: stBreedtes, rows: [new TableRow({ children: ST.map((s, i) => new TableCell({
  width: { size: stBreedtes[i], type: WidthType.DXA }, shading: { fill: i === ST.length - 1 ? "DCE8E3" : VLAK, type: ShadingType.CLEAR, color: "auto" },
  borders: { top: geen, bottom: geen, left: geen, right: { style: BorderStyle.SINGLE, size: 12, color: "FFFFFF" } }, margins: { top: 80, bottom: 80, left: 60, right: 60 },
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t((i ? "› " : "") + s, { bold: true, size: 18, color: KLEUR })] })] })) })] }));
body.push(ruimte(100));

// wie doet wat
const KOL = [1700, 2000, CONTENT - 3700];
const kopCel = (s, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: { fill: KLEUR, type: ShadingType.CLEAR, color: "auto" }, borders: dunRand, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [t(s, { bold: true, color: "FFFFFF", size: 18 })] })] });
const cel = (s, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: dunRand, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: runs(s, { size: 18 }), spacing: { line: 252 } })] });
const WIE = [
  ["Voorstel", "Inspecteur", "Legt het actievoorstel vast tijdens de inspectie, met prioriteit."],
  ["Instellen", "Coördinator", "**Acties › In te stellen**: tekst controleren, **actiehouder**, **toetser** (een andere persoon) en **plandatum** kiezen, **Actie instellen**. Geen actie nodig? **Voorstel laten vervallen**, met reden."],
  ["Uitvoeren", "Actiehouder", "**Start uitvoering**. Klaar? **Klaar · na-foto maken** of **Klaar voor toetsing, zonder foto**. De actiehouder kan niet zelf afronden."],
  ["Toetsen", "Toetser", "Kijkt of het echt is opgelost. **Akkoord na toetsing · afronden** maakt de actie Afgerond. **Niet akkoord** (met reden) stuurt hem terug naar de actiehouder."],
];
body.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: KOL, rows: [
  new TableRow({ tableHeader: true, children: [kopCel("Stap", KOL[0]), kopCel("Wie", KOL[1]), kopCel("Wat", KOL[2])] }),
  ...WIE.map((r) => new TableRow({ cantSplit: true, children: r.map((s, i) => cel(s, KOL[i])) })),
] }));
body.push(P("Koos de inspecteur ter plaatse **Direct gecorrigeerd**, dan heeft de ploeg het al opgelost en zag de inspecteur het herstel. De actie staat dan meteen op Afgerond, met de inspecteur als toetser.", { run: { size: 18, color: GRIJS }, before: 100 }));
body.push(kader([
  new Paragraph({ children: [t("Regels die de app bewaakt", { bold: true, color: KLEUR, size: 20 })], spacing: { after: 60 } }),
  ...BUL([
    "**Toetser ≠ actiehouder.** Kies je dezelfde persoon, dan weigert de app: ‘De toetser mag niet de actiehouder zijn.’",
    "**Afgerond pas na toetsing** door de toetser. Niemand anders kan afronden.",
    "**De QHSE-manager is nooit actiehouder.**",
  ], 18),
]));
body.push(ruimte(100));
body.push(rij([
  stapCel("19-acties-in-te-stellen", "Acties › In te stellen", "Tabbladen: Te laat, Gepland, Te toetsen, In te stellen en Alle. Met **Nieuwe actie** maak je een actie los van een inspectie.", DRIE[0]),
  stapCel("20-actie-instellen", "Instellen", "Kies actiehouder, toetser en plandatum. De plandatum staat al voorgesteld op basis van de prioriteit.", DRIE[1]),
  stapCel("22-actiehouder", "Actiehouder", "Ziet **Jouw stap: uitvoeren** en meldt het klaar voor toetsing.", DRIE[2]),
], DRIE));
body.push(rij([
  stapCel("23-toetsen", "Toetser", "Ziet **Jouw stap: toetsen**. Akkoord rondt af; niet akkoord gaat terug naar de actiehouder.", DRIE[0]),
  stapCel("25-meldingen", "Meldingen", "De **bel** bovenin toont wat aandacht vraagt. Tik **Meldingen op dit toestel aanzetten** voor meldingen op je telefoon.", DRIE[1]),
  tekstCel([
    new Paragraph({ children: runs("Wanneer krijg je een melding?", { bold: true, size: 19, color: KLEUR }), spacing: { after: 60 } }),
    ...BUL([
      "**Acties**: een week vóór de plandatum.",
      "**Te laat**: daarna elke 2 dagen, voor het hele team, tot de actie klaar is.",
      "**Gemiste inspectie**: de dag erna, daarna elke 2 dagen.",
      "Zolang iets over datum is, staat er een **oranje balk** bovenin het scherm.",
    ], 17),
  ], DRIE[2]),
], DRIE));

// ---------- 6 ----------
body.push(H1("6  Oefeninspectie"));
body.push(P("Nieuw als inspecteur? Oefen de methode eerst op een verzonnen werkplek. Het duurt ongeveer 10 minuten. **Er wordt niets opgeslagen**: er ontstaat geen echte inspectie, actie of melding."));
body.push(rij([
  stapCel("03-menu", "Starten", "Tik op het rondje rechtsboven › **Oefenen**, of op **Oefenen** in de tip op Vandaag.", DRIE[0]),
  stapCel("26-oefenen", "Drie korte scènes", "Direct gevaar, wat zie je echt en wat gaat goed, en doorvragen met een open vraag.", DRIE[1]),
  stapCel("27-oefenen-scene", "Uitleg na elke keuze", "Na elke keuze lees je welke methoderegel erbij hoort. Je kunt altijd **Stoppen**.", DRIE[2]),
], DRIE));

// ---------- document ----------
const doc = new Document({
  creator: "[Organisatie]",
  title: "Werkplekinspectie doen met de app",
  description: "Handleiding voor inspecteurs en coördinatoren",
  styles: {
    default: { document: { run: { font: FONT, size: 20, color: "222222" } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 44, bold: true, color: KLEUR }, paragraph: { spacing: { before: 0, after: 120 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true, color: KLEUR }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 22, bold: true, color: KLEUR }, paragraph: { spacing: { before: 160, after: 60 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bol", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } }, run: { color: KLEUR } } }] },
    ...numCfg,
  ] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 1000, bottom: 1000, left: MARGE, right: MARGE, header: 500, footer: 500 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("[Organisatie] · Handleiding Werkplekinspectie-app", { size: 16, color: GRIJS })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Pagina ", { size: 16, color: GRIJS }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GRIJS }), t(" · schermafbeeldingen uit de voorbeeldversie (fictieve gegevens)", { size: 16, color: GRIJS })] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("geschreven", OUT, b.length); });
