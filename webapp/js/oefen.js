/* Werkplekinspectie — js/oefen.js
   Oefeninspectie voor nieuwe inspecteurs: een korte, begeleide oefenronde van de WPI-momentopname op een
   verzonnen werkplek (drie scènes met een eenvoudige tekening, verzonnen collega's). De momentopname is een
   gesprek: de oefenaar grijpt in bij direct gevaar, praat met de ploeg (open vragen, positief benoemen), zegt
   wat hij ziet, bevestigt het Voorstel voor de taak en de TRA-stap, kiest zelf C/A/V/NVT en schrijft bij A
   (of V) wat er moet gebeuren; bij V waar de TRA zegt dat het in orde is, is dat een verbetervoorstel.
   De uitleg legt naast de TRA, maar overrulet het oordeel nooit: waar de TRA zegt dat het in orde is, zijn C én V
   allebei een goed oordeel (passend: ["C", "V"]). Past een oordeel niet bij de TRA, dan volgt één rustige hint, op
   het oordeelscherm; de stap daarna beoordeelt alleen het voorstel zelf en stuurt niet terug naar het oordeel.
   Na elke keuze volgt korte uitleg; elke methoderegel komt één keer in beeld, op het moment dat hij er toe doet.

   NIETS uit de oefening wordt een echte inspectie, actie of melding: geen IndexedDB, geen concept, geen
   wachtrij. De voortgang staat in het geheugen (App._oef) en in een eigen localStorage-sleutel "wpi_oefen",
   per gebruiker: { v: 2, gebruikers: { <id>: { voortgang, gedaan, verborgen } } }. Bij uitloggen wordt de
   lopende voortgang (met vrije tekst) van die gebruiker gewist.

   Registreert zichzelf: route #/oefen (App.view_oefen), een regel "Oefenen" in het accountmenu
   (App.openAccount omwikkeld), een rustige tip voor wie inspecteert (recht "inspecteert": hoofd, coördinator)
   en nog geen eigen inspecties heeft (App.view_vandaag en App.view_inspecties omwikkeld) en opruimen bij in-/uitloggen (App.login en App.logout omwikkeld).
   Geen inline handlers: alles via data-action (kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, IC, tril, eigenWoorden, act, actSluit, op, WAARDE, ELEMENT } = window.WPI;
  const App = window.App;
  IC.oefen = IC.oefen || '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.2V16c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.8"/><path d="M21 9v5"/>';
  const SLEUTEL = "wpi_oefen";

  // ---------------- methoderegels (terugkoppeling en samenvatting) ----------------
  const REGEL = {
    zien: ["Alleen wat je ziet telt", "Je legt vast wat je nú op de werkplek ziet. Aannames, verhalen en ‘meestal’ horen er niet in."],
    stop: ["Direct gevaar? Eerst stoppen", "Kan er nu iets misgaan, dan laat je het werk rustig stoppen. Vastleggen komt daarna."],
    jij: ["Jij beoordeelt, de app stelt voor", "C, A, V of NVT kies jij altijd zelf. De app doet hooguit een Voorstel, en dat telt pas als jij het bevestigt."],
    gesprek: ["Een gesprek, geen afvinklijst", "Je kijkt mee, stelt open vragen en luistert. Je loopt geen lijst af."],
    positief: ["Benoem wat goed gaat", "In elk gesprek, ook als er iets mis is. Zeg concreet wat goed gaat, dan weet de ploeg wat ze moet vasthouden."],
    toetser: ["De toetser is niet de actiehouder", "Wie de actie uitvoert, controleert niet zijn eigen werk. Iemand anders toetst."],
    afgerond: ["Afgerond pas na toetsing", "Een actie is pas afgerond als de toetser heeft gezien dat het echt is opgelost."],
    qhse: ["De QHSE-manager is nooit actiehouder", "De QHSE-manager adviseert en bewaakt, maar voert de actie niet zelf uit."],
  };
  const OORDEEL = { C: ["Conform", "In orde, zoals het hoort"], A: ["Afwijking", "Niet in orde, moet worden opgelost"], V: ["Verbeterpunt", "In orde, maar kan beter"], NVT: ["Niet van toepassing", ""] };

  // ---------------- aannames herkennen in "Wat zag je?" ----------------
  // Signaalwoorden als hele woorden; "vast" alleen als het "vast wel/altijd/…" of "doen ze vast" is,
  // niet als het "zit vast aan" (feitelijk: bevestigd) betekent.
  const AANNAME = [
    /\b(ik denk|denk ik|ik gok|ik vermoed|ik neem aan|ik ga ervan uit|volgens mij|lijkt me|lijkt mij)\b/,
    /\b(waarschijnlijk|vermoedelijk|misschien|wellicht|zal wel|zullen wel|vast wel)\b/,
    /\b(altijd|nooit|meestal|vaak|vaker|regelmatig|telkens|elke keer|iedere keer)\b/,
    /\b(gisteren|vanochtend|vorige week|al jaren|al weken)\b/,
    /\bvast (altijd|nooit|vaker|niet|ook|zo|al)\b/,
    /\b(doen|hebben|zijn|zullen|gaan|weten|deden|hadden|is|was) (ze|hij|zij|het|dat|die) vast\b/,
  ];
  const GRENS = /(,\s*|\s+(?:en|maar|want|dus|omdat)\s+)/g;
  function aannames(tekst) {
    const uit = [];
    String(tekst || "").split(/(?<=[.!?;])\s+|\n+/).map((z) => z.trim()).filter(Boolean).forEach((zin) => {
      const laag = zin.toLowerCase();
      let eerste = -1;
      AANNAME.forEach((re) => { const m = re.exec(laag); if (m && (eerste < 0 || m.index < eerste)) eerste = m.index; });
      if (eerste < 0) return;
      // het deel van de zin vanaf de laatste grens (komma, en, maar, want, dus, omdat) vóór het signaalwoord
      let start = 0, g; GRENS.lastIndex = 0;
      while ((g = GRENS.exec(laag.slice(0, eerste)))) start = g.index + g[0].length;
      const deel = zin.slice(start).replace(/[.!?;,\s]+$/, "");
      if (deel) uit.push(deel);
    });
    return uit;
  }

  // ---------------- tekeningen (inline SVG, geen externe afbeeldingen) ----------------
  // eenvoudig poppetje: helm, hoofd, hesje; x/y = voeten midden
  const pop = (x, y, s, extra) => `<g transform="translate(${x} ${y}) scale(${s || 1})">
    <rect x="-9" y="-30" width="7" height="30" rx="3" fill="#4A4038"/><rect x="2" y="-30" width="7" height="30" rx="3" fill="#4A4038"/>
    <rect x="-13" y="-62" width="26" height="36" rx="9" fill="#2F5D50"/><rect x="-13" y="-50" width="26" height="5" fill="#E8F0C8"/>
    <circle cx="0" cy="-73" r="10" fill="#E9C9A8"/><path d="M-12 -76a12 12 0 0 1 24 0z" fill="#FFFFFF" stroke="#C9BBA6" stroke-width="1.5"/>
    ${extra || ""}</g>`;
  const loep = (cx, cy, r, inhoud, lx, ly) => `<line x1="${cx}" y1="${cy}" x2="${lx}" y2="${ly}" stroke="#6E6255" stroke-width="1.5" stroke-dasharray="3 3"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="#FFFFFF" stroke="#6E6255" stroke-width="2"/>
    <clipPath id="lp${cx}${cy}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><g clip-path="url(#lp${cx}${cy})">${inhoud}</g>`;
  const TEKEN = {
    put: `<rect width="320" height="190" fill="#EAF1FA"/><rect y="132" width="320" height="58" fill="#E3D5C0"/>
      <rect x="128" y="132" width="76" height="58" fill="#5E544A"/><rect x="128" y="132" width="76" height="6" fill="#4A4038"/>
      <rect x="40" y="52" width="10" height="80" rx="2" fill="#2F5D50"/><rect x="30" y="126" width="30" height="8" rx="2" fill="#2F5D50"/>
      <path d="M45 56 L172 40" stroke="#2F5D50" stroke-width="7" stroke-linecap="round"/>
      <line x1="166" y1="42" x2="166" y2="78" stroke="#2A2622" stroke-width="2"/>
      <path d="M161 78h10v5a6 6 0 1 1-10 3" fill="none" stroke="#2A2622" stroke-width="2.5"/>
      <path d="M166 88 L152 108 M166 88 L180 108" stroke="#8E7CC3" stroke-width="6" stroke-linecap="round"/>
      <path d="M155 99 l-7 -3 M154 102 l-8 1 M153 105 l-6 4" stroke="#8E7CC3" stroke-width="1.6"/>
      <rect x="146" y="106" width="40" height="40" rx="7" fill="#9AA2AE"/><rect x="152" y="114" width="28" height="5" rx="2" fill="#C9CED6"/>
      <line x1="96" y1="122" x2="236" y2="122" stroke="#FFFFFF" stroke-width="4"/><line x1="96" y1="122" x2="236" y2="122" stroke="#C8463B" stroke-width="4" stroke-dasharray="9 9"/>
      <rect x="93" y="112" width="5" height="22" fill="#6E6255"/><rect x="234" y="112" width="5" height="22" fill="#6E6255"/>
      ${pop(76, 156, 0.82)}
      ${pop(268, 150, 0.9, '<rect x="10" y="-52" width="9" height="13" rx="2" fill="#2A2622"/>')}
      ${loep(76, 40, 27, '<rect x="40" y="0" width="80" height="80" fill="#F3EFFA"/><path d="M62 70 L86 14" stroke="#8E7CC3" stroke-width="14"/><path d="M60 52 l-10 -3 M63 45 l-11 0 M58 60 l-9 2 M66 38 l-10 -4" stroke="#8E7CC3" stroke-width="2.2"/><path d="M71 40 l7 4 l-4 4z" fill="#F3EFFA"/>', 152, 100)}`,
    sleuf: `<rect width="320" height="190" fill="#EAF1FA"/><rect y="104" width="320" height="86" fill="#E3D5C0"/>
      <rect x="112" y="104" width="104" height="86" fill="#8B7A66"/><rect x="112" y="104" width="104" height="86" fill="url(#oefgrond)" opacity=".25"/>
      <rect x="112" y="104" width="8" height="86" fill="#B98F5A"/><rect x="208" y="104" width="8" height="86" fill="#B98F5A"/>
      <rect x="120" y="126" width="88" height="6" rx="2" fill="#B98F5A"/><rect x="120" y="160" width="88" height="6" rx="2" fill="#B98F5A"/>
      <rect x="190" y="70" width="4" height="118" fill="#D7DBE0"/><rect x="204" y="70" width="4" height="118" fill="#D7DBE0"/>
      ${[80, 96, 112, 128, 144, 160, 176].map((y) => `<rect x="190" y="${y}" width="18" height="3" fill="#D7DBE0"/>`).join("")}
      <rect x="128" y="178" width="58" height="8" rx="4" fill="#5E544A"/>
      ${pop(154, 186, 0.78, '<rect x="-5" y="-60" width="10" height="13" rx="2" fill="#E2B33C" stroke="#2A2622" stroke-width="1.2"/><circle cx="0" cy="-55" r="2" fill="#2F5D50"/>')}
      ${pop(62, 120, 0.9)}
      ${loep(262, 52, 26, '<rect x="230" y="20" width="70" height="70" fill="#F7F1E6"/><rect x="250" y="36" width="24" height="32" rx="4" fill="#E2B33C" stroke="#2A2622" stroke-width="2"/><rect x="255" y="42" width="14" height="9" rx="2" fill="#DCEBE3"/><circle cx="262" cy="60" r="3" fill="#2F5D50"/>', 154, 125)}
      <defs><pattern id="oefgrond" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="#2A2622"/></pattern></defs>`,
    kast: `<rect width="320" height="190" fill="#F4EDE3"/><rect y="150" width="320" height="40" fill="#D9CBB6"/>
      <rect x="40" y="30" width="104" height="120" rx="6" fill="#C9CED6" stroke="#6E6255" stroke-width="2"/>
      <path d="M144 30 L186 40 L186 140 L144 150z" fill="#DDE1E6" stroke="#6E6255" stroke-width="2"/>
      <rect x="54" y="44" width="76" height="34" rx="4" fill="#9AA2AE"/><rect x="62" y="50" width="10" height="22" rx="2" fill="#5E544A"/><rect x="80" y="50" width="10" height="22" rx="2" fill="#5E544A"/><rect x="98" y="50" width="10" height="22" rx="2" fill="#5E544A"/>
      <rect x="70" y="92" width="44" height="40" rx="6" fill="#FFFFFF" stroke="#6E6255" stroke-width="2"/><rect x="88" y="98" width="8" height="22" rx="3" fill="#B42318" transform="rotate(-35 92 109)"/>
      <path d="M100 118 v-6 a5 5 0 0 1 10 0 v6" fill="none" stroke="#2A2622" stroke-width="2.5"/><rect x="97" y="117" width="16" height="13" rx="3" fill="#2F5D50"/>
      <path d="M150 166 C 180 156, 200 178, 230 168 S 280 160, 320 170" fill="none" stroke="#2A2622" stroke-width="3"/>
      <circle cx="160" cy="88" r="4" fill="#E2B33C"/>
      ${pop(232, 150, 0.95, '<rect x="-17" y="-40" width="8" height="9" rx="3" fill="#E2B33C"/><rect x="9" y="-40" width="8" height="9" rx="3" fill="#E2B33C"/>')}
      ${loep(270, 50, 27, '<rect x="236" y="16" width="70" height="70" fill="#FFFFFF"/><path d="M258 52 v-9 a12 12 0 0 1 24 0 v9" fill="none" stroke="#2A2622" stroke-width="4"/><rect x="253" y="51" width="34" height="26" rx="5" fill="#2F5D50"/><circle cx="270" cy="62" r="3" fill="#FFFFFF"/>', 108, 120)}`,
  };
  const tekening = (k, alt) => `<svg class="oef-svg" viewBox="0 0 320 190" role="img" aria-label="${esc(alt)}" preserveAspectRatio="xMidYMid meet">${TEKEN[k]}</svg>`;


  // ---------------- de drie scènes ----------------
  // stappen: ingrijpen/gesprek = keuze uit wat je doet of zegt (sc.keuzes), zie = vrije waarneming, taak = taak
  // met Voorstel, oordeel = TRA-stap koppelen (Voorstel) en zelf C/A/V/NVT kiezen op één scherm, actie =
  // actievoorstel (alleen bij A/V), positief = afsluiten met wat goed gaat.
  // regels: per stap welke methoderegel in de terugkoppeling staat. Elke regel komt één keer in beeld, op het
  // moment dat hij er voor het eerst toe doet; de samenvatting zet ze aan het eind nog eens op een rij.
  const SC = [
    { id: "put", titel: "Pomp uit de put", plek: "Gemaal De Oefenpolder (verzonnen)", leer: "Wat doe je bij direct gevaar?",
      alt: "Tekening: een kraantje hijst een pomp uit een put. De paarse hijsband is aan één kant uitgerafeld. Rood-wit lint zet de put af. Eén monteur staat bij het kraantje, de ander met de afstandsbediening naast de put.",
      tekst: ["Je komt aan bij het gemaal. Twee monteurs hijsen met een kraantje een dompelpomp uit de pompput: de een staat bij het kraantje, de ander bedient het met de afstandsbediening.",
        "De put is afgezet met rood-wit lint. Niemand staat onder de last.",
        "Je kijkt naar de paarse hijsband waar de pomp aan hangt: aan één rand zijn de vezels uitgerafeld en er zit een snee in."],
      stappen: ["ingrijpen", "gesprek", "zie", "oordeel", "actie"],
      regels: { ingrijpen: ["stop"], gesprek: ["gesprek"], zie: ["zien"], oordeel: ["jij"], actie: ["toetser", "afgerond", "qhse"] },
      keuzes: {
        ingrijpen: { vraag: "De pomp hangt nog aan de beschadigde band. Wat doe je als eerste?",
          opties: [
            ["Ik loop naar de monteurs en zeg rustig: ‘Stop even. Laat de pomp zakken, ik wil met jullie naar deze band kijken.’", true,
              "Bij direct gevaar laat je het werk stoppen, rustig en zonder verwijt. De monteurs laten de pomp zakken; hij staat weer op de grond."],
            ["Ik maak eerst een foto en leg de waarneming vast in de app.", false,
              "Vastleggen kan straks. Zolang de pomp aan deze band hangt, kan de last vallen. Bij direct gevaar gaat veiligheid voor: eerst stoppen, dan pas de app."],
            ["Ik wacht tot de pomp boven is en bespreek het daarna.", false,
              "Dan hangt de last al die tijd aan een beschadigde band. Bij direct gevaar laat je het werk meteen stoppen."]],
          goedTitel: "Goed: eerst stoppen", misTitel: "Bij direct gevaar: eerst stoppen", samen: "werk laten stoppen" },
        gesprek: { intro: "De pomp staat weer op de grond. Een nieuwe band hebben de monteurs niet bij zich.",
          vraag: "Hoe begin je het gesprek met de ploeg?",
          opties: [
            ["‘Goed dat jullie de put hebben afgezet en dat niemand onder de last stond. Deze band is wel beschadigd. Hoe controleren jullie de band normaal voordat jullie gaan hijsen?’", true,
              "Je begint met wat goed gaat, zegt feitelijk wat je zag en stelt een open vraag. De monteur vertelt: ‘Eerlijk gezegd keken we er vandaag niet naar. Er ligt geen reserveband in de bus.’ Wat de ploeg vertelt, helpt je te begrijpen waarom het gebeurde."],
            ["‘Deze band is afgekeurd. Dit had nooit mogen gebeuren.’", false,
              "Dit klinkt als een verwijt. De monteurs gaan zich verdedigen in plaats van meedenken, en wat wél goed ging, blijft onbenoemd."],
            ["‘Hebben jullie de band voor gebruik gecontroleerd? Ja of nee.’", false,
              "Een ja/nee-vraag voelt als afvinken. Je krijgt een kort antwoord en mist het verhaal. En wat goed ging, benoem je niet."]],
          goedTitel: "Een goed begin van het gesprek", misTitel: "Probeer het anders", samen: "gesprek begonnen met wat goed gaat" },
      },
      zieWoorden: ["hijsband", "band", "rafel", "uitgeraf", "snee", "kapot", "beschadig", "stuk", "vezel", "scheur", "ingesneden"],
      zieVoorbeeld: "De hijsband is aan één rand uitgerafeld en heeft een snee. De put is afgezet en niemand staat onder de last.",
      koppel: { voorstel: ["2.1"], goed: ["2.1"], opties: [["2.1", "Oefen-TRA 2.1", "Hijsen: hijsmiddel beschadigd of niet gekeurd, last valt"], ["2.2", "Oefen-TRA 2.2", "Hijsen: iemand staat onder de hangende last"], ["ALG-F", "Algemeen F", "Orde en netheid, afzetting van de werkplek"]],
        doc: "hijsband hijsmiddel band beschadigd rafelig snee gekeurd keuring last hijsen" },
      passend: ["A"], traTekst: "een afwijking (A)",
      uitleg: { A: "Volgens de TRA mag er met een beschadigde hijsband niet gehesen worden. Wat je zag, wijkt daarvan af: dat is een afwijking.",
        V: "Volgens de TRA mag er met een beschadigde hijsband niet gehesen worden. Wat je zag, is dus niet in orde: dat is een afwijking, geen verbeterpunt. V is voor iets dat in orde is maar beter kan.",
        C: "Volgens de TRA mag er met een beschadigde hijsband niet gehesen worden. Wat je zag, is dus niet in orde: dat is een afwijking. Kies je A, dan volgt een actievoorstel: daar leg je vast dat het hijsen is gestopt en wat er met de band moet gebeuren. Blijf je bij C, dan wordt er voor de beschadigde band geen actie vastgelegd.",
        NVT: "Er wordt hier echt gehesen, dus deze TRA-stap is van toepassing. Volgens de TRA mag er met een beschadigde hijsband niet gehesen worden. Kies je A, dan volgt een actievoorstel: daar leg je vast dat het hijsen is gestopt en wat er met de band moet gebeuren." },
      actie: { vs: "Beschadigde hijsband afkeuren en uit gebruik nemen. Pas verder hijsen met een gekeurde band.", ph: "Bijv. hijsband afkeuren en …",
        maatregel: "bijv. hijsen gestopt", verwachtTp: "maatregel" } },   // de terugkoppeling volgt wat de oefenaar schreef (oef_actie)
    { id: "sleuf", titel: "Werken in de sleuf", plek: "Persleiding naast het gemaal (verzonnen)", leer: "Wat doen ze, en wat gaat goed?",
      alt: "Tekening: een gestutte sleuf met een ladder die boven de rand uitsteekt. Onderin werkt een monteur met een gele gasmeter op zijn borst; bovenaan staat een collega als wacht.",
      tekst: ["Even verderop ligt een open sleuf van ongeveer anderhalve meter diep. Onderin werkt een monteur aan een leiding.",
        "De sleuf is gestut en er staat een ladder in die boven de rand uitsteekt. De gasmeter hangt op de borst van de monteur in de sleuf.",
        "Zijn collega staat bovenaan de sleuf en houdt hem in het oog."],
      stappen: ["taak", "oordeel", "actie", "positief"],
      regels: { positief: ["positief"] },
      taakGesprek: { vraag: "Vertel eens, waar zijn jullie mee bezig?", wie: "De collega bovenaan", antwoord: "We sluiten de nieuwe persleiding aan op de oude. Nog een uurtje werk." },
      taak: "Persleiding aansluiten in de sleuf", taken: ["Persleiding aansluiten in de sleuf", "Pomp uit de pompput hijsen", "Graven met de minigraver"],
      taakDoc: "persleiding leiding aansluiten koppelen sleuf nieuwe oude",
      koppel: { vraag: "Welke stap uit de TRA hoort bij deze taak?", waarom: "de monteur werkt onderin een sleuf van ongeveer anderhalve meter diep",
        voorstel: ["4.1"], goed: ["4.1"], opties: [["4.1", "Oefen-TRA 4.1", "Werken in een sleuf: gasmeting bij de werknemer, stempels, vluchtweg"], ["2.2", "Oefen-TRA 2.2", "Hijsen: iemand staat onder de hangende last"], ["ALG-C", "Algemeen C", "Persoonlijke beschermingsmiddelen"]],
        doc: "sleuf gasmeter gasmeting gestut stempels ladder vluchtweg wacht persleiding leiding" },
      // in orde volgens de TRA: C (zoals het hoort) en V (in orde, maar kan beter) zijn allebei een goed oordeel
      passend: ["C", "V"], traTekst: "in orde (C, of V als het beter kan)",
      uitleg: { C: "De TRA vraagt een gasmeter bij de werknemer in de sleuf, stempels en een vluchtweg. Dat zag je allemaal. Een conforme waarneming is net zo waardevol als een afwijking. Zie je iets dat nog beter kan, dan past ook V.",
        A: "Kijk nog eens: de TRA vraagt een gasmeter bij de werknemer, stempels en een vluchtweg, en dat zag je allemaal. Volgens de TRA is het hier dus in orde. Kan het alleen beter, dan past V. Zag je toch iets dat niet in orde is, dan blijf je bij A en schrijf je hierna wat er moet gebeuren.",
        V: "Dat kan. Volgens de TRA is het hier in orde: een gasmeter bij de werknemer, stempels en een vluchtweg. Jij ziet iets dat nog beter kan, en daar is V voor.",
        NVT: "Er wordt hier echt in een sleuf gewerkt, dus deze TRA-stap is van toepassing. De TRA vraagt een gasmeter bij de werknemer, stempels en een vluchtweg. Zag je dat zo, dan past C; kan het nog beter, dan V." },
      // bij A kreeg de oefenaar op het oordeelscherm al één rustige hint; hier telt alleen het voorstel zelf
      actie: { vs: "", ph: "Wat moet er volgens jou gebeuren?", phV: "Wat kan er beter, en hoe?",
        okTekst: "Je oordeel is van jou: je zag iets dat volgens jou niet in orde is, en je schreef op wat er moet gebeuren. In het echt wordt dit een actie met status Voorstel. Daarna stelt iemand uit het team de actie in: wie haar uitvoert en wie toetst.",
        okTekstV: "Een verbeterpunt is geen afwijking: het werk was in orde en mag gewoon doorgaan. In het echt wordt je verbetervoorstel een actie met status Voorstel. Daarna stelt iemand uit het team de actie in: wie haar uitvoert en wie toetst." },
      positief: { vraag: "Rond het gesprek af. Wat gaat hier goed? Zeg het tegen de ploeg.",
        vraagV: "Rond het gesprek af. Je gaf een verbeterpunt mee; zeg ook wat hier goed gaat.",
        vraagA: "Je hebt iets aangesproken. Wat gaat hier wél goed? Zeg dat ook tegen de ploeg.",
        vs: "Fijn dat de gasmeter bij jou in de sleuf hangt: zo meet hij waar het telt. En de ladder staat goed als vluchtweg.", ph: "Bijv. goed dat de gasmeter …",
        woorden: ["gasmeter", "meter", "ladder", "gestut", "stempel", "vluchtweg", "wacht", "collega", "oog"] } },
    { id: "kast", titel: "Bij de schakelkast", plek: "Pompgebouw (verzonnen)", leer: "Doorvragen met een open vraag",
      alt: "Tekening: een geopende schakelkast. De hoofdschakelaar staat uit en er hangt een groen slot aan, zonder label. Over de vloer loopt een snoer; een monteur met gele handschoenen staat ernaast.",
      tekst: ["In het pompgebouw staat een monteur bij een geopende schakelkast. Hij gaat zo een motor losmaken.",
        "De hoofdschakelaar staat uit en er hangt een slot aan. Aan het slot hangt geen label met naam en datum.",
        "Je ziet dat de monteur rustig werkt en zijn handschoenen draagt."],
      stappen: ["gesprek", "oordeel", "actie"],
      regels: {},
      keuzes: {
        gesprek: { vraag: "Je wilt weten hoe de monteur zijn werk veilig heeft gemaakt. Wat vraag je?",
          opties: [
            ["Hoe weet een collega dat jij hier aan het werk bent?", true,
              "Een open vraag: de monteur denkt zelf na en vertelt. ‘Eh… eigenlijk alleen aan het slot. Mijn naam staat er niet op. De labels liggen in de bus, ik pak er een.’"],
            ["Heb je LOTOTO toegepast? Ja of nee.", false,
              "Een ja/nee-vraag voelt als afvinken. Je krijgt ‘ja’ te horen en mist het verhaal achter het slot."],
            ["Waarom hangt er geen label aan? Dat is toch verplicht?", false,
              "Dit klinkt als een verwijt. De monteur gaat zich verdedigen in plaats van meedenken."]],
          citaat: true, goedTitel: "Een goede open vraag", misTitel: "Probeer een open vraag", samen: "open vraag gesteld" },
      },
      // wat de inspecteur daarna zelf ziet gebeuren: alleen daardoor mag het "direct gecorrigeerd" en afgerond zijn
      daarna: "De monteur haalt een label uit de bus, schrijft zijn naam en de datum erop en hangt het aan het slot. Je ziet het hangen.",
      gezien: "Toen je aankwam, hing er geen label aan het slot. Na jullie gesprek hing de monteur er een label aan met zijn naam en de datum; je zag het hangen.",
      koppel: { voorstel: [], goed: ["5.2", "ALG-B"], opties: [["5.2", "Oefen-TRA 5.2", "Afschakelen en vergrendelen (LOTOTO): slot én label met naam en datum"], ["ALG-B", "Algemeen B", "Afschakelen, vergrendelen, spanningsvrij maken"], ["ALG-D", "Algemeen D", "Gereedschap en arbeidsmiddelen"]] },
      passend: ["A"], traTekst: "een afwijking (A)",
      uitleg: { A: "Volgens de TRA hoort aan het slot een label met naam en datum. Toen je aankwam, ontbrak dat: dat is een afwijking. Dat het label nu hangt, leg je zo vast bij ‘Ter plaatse’.",
        V: "Volgens de TRA hoort aan het slot een label met naam en datum. Toen je aankwam, ontbrak dat: dat is een afwijking, geen verbeterpunt. V is voor iets dat in orde is maar beter kan.",
        C: "Het label hangt nu, maar toen je aankwam ontbrak het, en de TRA vraagt slot én label. Je legt vast wat je zag toen je aankwam: dat was een afwijking. Kies je A, dan volgt een actievoorstel en leg je het herstel daar vast als ‘Direct gecorrigeerd’.",
        NVT: "Er wordt hier echt afgeschakeld, dus deze TRA-stap is van toepassing. Volgens de TRA hoort aan het slot een label met naam en datum; dat ontbrak toen je aankwam. Kies je A, dan volgt een actievoorstel en leg je het herstel daar vast als ‘Direct gecorrigeerd’." },
      actie: { vs: "Label met naam en datum aan het slot hangen vóór het werk begint.", ph: "Bijv. label met naam en datum …",
        verwachtTp: "gecorrigeerd",
        okTekst: "Je zag zelf dat het label nu aan het slot hangt. Dan ben jij de toetser en is de actie meteen afgerond. Sluit af met wat goed ging: ‘Goed dat je hebt afgeschakeld en je slot erop hebt gedaan.’" } },
  ];
  const STAPNAAM = { ingrijpen: "Wat doe je eerst?", gesprek: "Het gesprek", zie: "Wat zag je?", taak: "De taak",
    oordeel: "Koppel en beoordeel", actie: "Actievoorstel", positief: "Benoem wat goed gaat" };
  const isAV = (x) => x === "A" || x === "V";
  const past = (sc, x) => (sc.passend || []).includes(x);   // past dit oordeel bij wat de TRA zegt?
  // V waar de TRA zegt dat het in orde is: een verbetervoorstel. V bij een afwijking (bijv. direct gevaar): de oefenaar
  // houdt zijn V, maar de app spreekt niet van "verbeteren"; hij schrijft wat er moet gebeuren (actievoorstel).
  const isVerbeter = (sc, a) => !!(a && a.oordeel === "V" && past(sc, "V"));
  const voorstelNaam = (sc, a) => (isVerbeter(sc, a) ? "verbetervoorstel" : "actievoorstel");
  const TEL = ["", "één ding", "twee dingen", "drie dingen", "vier dingen"];
  // een voorstel zonder inhoud ("niks", "-", "niks aan de hand", "alles in orde") vraagt om iets concreets, in élke scène
  const woorden = (t) => String(t || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const leeg = (t) => { const w = woorden(t);
    return !w.length || /^(niks|niets|nvt|n v t|nee|geen (idee|actie|verbetering|verbeterpunt)|weet (ik )?niet|prima|ok|oke)\b/.test(w.join(" ")) ||
      w.every((x) => /^(niks|niets|geen|nvt|weet|niet|ok|oke|prima|goed|zo|laten|alles|is|het|in|orde|aan|de|hand|nodig|doen|gewoon|verder|hoor|dit|dat|er|hier|al|ja|nee)$/.test(x)); };
  // vaag = geen enkel woord met inhoud ("beter opletten", "meer aandacht", "kan beter"). Kort mag: "Ladder vastbinden"
  // zegt wát en hoe. Concreet betekent niet lang (eerder: minstens drie woorden, dat wees goede korte voorstellen af).
  const VAAG = new Set(("beter beetje goed goede netjes veilig veiliger veiligheid opletten oppassen letten aandacht meer minder extra " +
    "voortaan moet moeten kan kunnen zou zouden doen gedaan zorgen zorg verbeteren verbeterd verbetering verbeterpunt even iets alles " +
    "altijd nooit voor punt punten graag mensen ploeg monteur monteurs hun zijn zich daar hier deze werk werken").split(" "));
  // ronde 5: ook de alledaagse varianten ("voorzichtiger werken", "gewoon blijven opletten", "extra alert zijn") zijn vaag
  const VAAG_STAM = /^(voorzichtig|oplet|opgelet|oppas|uitkijk|uitkijken|aandacht|alert|scherp|zorgvuldig|bewust|nauwkeurig|secuur|rustig|attent|serieus|nadenk|denken|blijven|blijf|gewoon|letten|zijn|wordt|worden|houden|gaan|elkaar|iedereen|wat|eens|keer|zaken|dingen|situatie|omgeving|rekening|focus|beter|veilig|goed|netter|netjes|extra)/;
  const vaag = (t) => leeg(t) || !woorden(t).some((w) => w.length >= 4 && !VAAG.has(w) && !VAAG_STAM.test(w));
  // een preventieve actie (toolbox, instructie, afspraak, controle vooraf) is ook concreet: ze pakt de oorzaak aan
  const PREVENTIEF = /(toolbox|instructie|uitleg|uitleggen|bespre\w*|voorlicht\w*|afspra\w*|procedure|werkwijze|checklist|(controle\w*|controler\w*|check\w*|nakijk\w*|\binspect\w*) (\w+ ){0,4}(voor (het |elk |ieder )?(gebruik|hijs\w*)|vooraf|altijd|elke|iedere|dagelijks|wekelijks)|(voor (het |elk |ieder )?gebruik|vooraf|altijd|elke keer) (\w+ ){0,4}(controle\w*|controler\w*|check\w*|nakijk\w*|inspect\w*)|\blmra|voorraad|in de bus|herinner\w*|training|cursus|aanspre\w*|startwerkoverleg|werkoverleg|\bkeuring\w* (\w+ ){0,3}(regel\w*|plann\w*|bijhoud\w*|controle\w*|controler\w*|nalop\w*|check\w*|op orde)|(controle|check|nalopen) (\w+ ){0,3}(van )?(de )?keuring\w*|reserve\w* (\w+ ){0,3}(in de bus|op voorraad|bijhouden|meenemen)|voortaan|volgende keer|kantbescherm\w*|hoekbescherm\w*|beschermhoes\w*)/;
  // ronde 7: "keur" alleen als eigen woord (keuring, keuren): "afkeuren" en "een gekeurde band" pakken de oorzaak niet aan
  // een actie die nog moet gebeuren (toolbox, instructie, afspraak …): die kan niet ter plaatse al gezien en afgerond zijn
  const TOEKOMST = /(toolbox|instructie|uitleg|uitleggen|bespre\w*|voorlicht\w*|afspra\w*|procedure|werkwijze|checklist|training|cursus|startwerkoverleg|werkoverleg|herinner\w*|voortaan|volgende keer|in de toekomst|aanspre\w*|voorraad|in de bus|\blmra|\bkeuring\w*|\binspectie\w*)/;
  // ronde 7: wat al gebeurd is ("uitleg gegeven", "toolbox gehouden", "besproken", "afgesproken") moet niet meer gebeuren:
  // per zinsdeel telt een voltooid deelwoord als gedaan (de inspecteur schreef dat het ter plaatse gebeurde)
  const GEDAAN = /\b(gegeven|gehouden|gedaan|uitgelegd|besproken|afgesproken|doorgenomen|verteld|gedeeld|aangesproken|geinstrueerd|geïnstrueerd|herinnerd|gecontroleerd|geregeld|aangevuld|gelegd|gepakt|gebeurd|geweest|meteen|direct (gedaan|gegeven|besproken|uitgelegd))\b/;
  // wat er nog moet gebeuren, in de woorden van de inspecteur: "de toolbox", "de afspraak", "de instructie" …
  const NOG_NAAM = [[/toolbox/, "de toolbox"], [/instructie|ge[iï]nstrueerd/, "de instructie"], [/uitleg|uitgelegd/, "de uitleg"], [/afspra|afgesproken/, "de afspraak"], [/bespre|besproken/, "het gesprek"],
    [/voorlicht/, "de voorlichting"], [/procedure|werkwijze/, "de nieuwe werkwijze"], [/checklist/, "de checklist"], [/training|cursus/, "de training"],
    [/werkoverleg/, "het werkoverleg"], [/herinner/, "de herinnering"], [/aanspre/, "het aanspreken"], [/voorraad|in de bus/, "de voorraad in de bus"],
    [/lmra/, "de LMRA"], [/keuring|inspectie/, "de keuring"], [/voortaan|volgende keer|in de toekomst/, "wat er voortaan moet gebeuren"]];
  const opsomNl = (arr) => (!arr.length ? "dat deel" : arr.length === 1 ? arr[0] : arr.slice(0, -1).join(", ") + " en " + arr[arr.length - 1]);
  const PRIO_NAAM = { direct: "direct", kort: "kort, ±2 weken", planmatig: "planmatig, ±8 weken" };
  const zinsdelen = (t) => String(t || "").toLowerCase().split(/[,.;:!?]+|\s+(?:en|maar|daarna|ook)\s+/).map((x) => x.trim()).filter(Boolean);
  // de zinsdelen die nog moeten gebeuren (een toekomstwoord zonder "gegeven/gedaan/besproken" erbij)
  const nogTeDoen = (t) => zinsdelen(t).filter((d) => TOEKOMST.test(d) && !GEDAAN.test(d));
  const gedaanNaam = (t) => { const d = zinsdelen(t).filter((x) => TOEKOMST.test(x) && GEDAAN.test(x)).join(" "); return [...new Set(NOG_NAAM.filter(([re]) => re.test(d)).map((x) => x[1]))].filter((x) => !/voortaan/.test(x)); };
  const nogNaam = (t) => { const d = nogTeDoen(t).join(" "); const n = NOG_NAAM.filter(([re]) => re.test(d)).map((x) => x[1]); return [...new Set(n)]; };
  // staat een woord in de tekst zonder "niet/nooit/geen" er vlak voor ("niet verder hijsen" is juist veilig)
  const zegt = (t, re, neg) => { const g = new RegExp(re.source, "g"); let m; while ((m = g.exec(t))) { if (!(neg || /\b(niet|nooit|geen|pas|alleen|daarna|eerst)\s+(\S+\s+){0,2}$/).test(t.slice(Math.max(0, m.index - 30), m.index))) return true; } return false; };
  // een preventieve actie zonder ontkenning ervoor ("geen toolbox nodig" telt niet; "daarna toolbox geven" wel)
  const preventief = (t) => zegt(t, PREVENTIEF, /\b(niet|nooit|geen|zonder)\s+(\S+\s+){0,2}$/);
  // put: wat de beschadigde band echt uit gebruik neemt; en wat het gevaar laat bestaan (doorhijsen, omdraaien, plakken)
  const BAND_UIT = /(vervang\w*|afkeur\w*|afgekeurd\w*|weggooi\w*|weg ?gooi\w*|uit (het )?gebruik|niet meer (\w+ ){0,4}(gebruik|hijs|werk)\w*|nooit meer (\w+ ){0,4}(gebruik|hijs)\w*|(beschadigde|kapotte|oude|rafelige|gerafelde|deze) (hijs)?band (\w+ ){0,3}(weg|eruit)\b|(door|kapot|stuk) ?knip\w*|in de container|weg ?doen|apart (leggen|gelegd)|retour|terug ?sturen|uit de roulatie|onbruikbaar|niet (meer )?mee (hijsen|werken))/;
  const DOORHIJSEN = /(omdraai\w*|om ?draaien|andere kant|\bknoop\w*|\btape\w*|plak\w*|repar\w*|naai\w*|lijm\w*|(verder|door|toch|gewoon) (\w+ ){0,2}(hijs\w*|werk\w*|gaan|takel\w*)|doorhijs\w*|doorwerk\w*|doorgaan|verder ?hijs\w*|dezelfde band)/;
  const NIEUWE_BAND = /(nieuwe|andere|gekeurde|reserve|goede) ?(hijs)?band/;
  // kast: het slot eraf of zonder slot werken is het omgekeerde van de correctie
  const SLOT_ERAF = /((hang)?slot|sloten|vergrendeling|lototo)\w* (\w+ ){0,2}(eraf|weg|af ?halen|weghalen|verwijder\w*|losmaken|open ?maken|eraf ?halen)|(zonder|geen) (\w+ )?((hang)?slot|vergrendeling|lototo)\b (\w+ ){0,2}(werk\w*|verder|door)|((hang)?slot|lototo)\w* (\w+ ){0,3}(niet nodig|overbodig|hoeft niet)/;
  const LABEL = /(label|naam|datum|kaart\w*|\btag\b)/;
  // kast: een bevinding (wat ontbrak) tegenover een herstel of handeling (wat er gedaan is of moet gebeuren)
  const BEVINDING = /(ontbr\w*|\bmist(e|en)?\b|vergeten|(hing|hangt|zat|zit|was|is) (er )?geen|^ ?geen label|zonder label|niet (aanwezig|aan het slot|op het slot))/;
  const HERSTEL = /(hang\w*|gehangen|opgehangen|aangebracht|aanbreng\w*|bevestig\w*|plaats\w*|geplaatst|schrijf\w*|geschreven|invul\w*|ingevuld|toegevoeg\w*|toevoeg\w*|meeneem\w*|meenemen|\bpak\w*|gepakt|herstel\w*|\bmaak\w*|gemaakt|\bzorg\w*|geregeld|\bregel(en|t)\b|\bvul\w*|erbij|\berop\b|\bnu\b (\w+ ){0,2}(wel|er)|alsnog)/;
  const keuzeGoed = (sc, a, st) => { const K = sc.keuzes && sc.keuzes[st]; return !!(K && typeof a[st] === "number" && K.opties[a[st]] && K.opties[a[st]][1]); };
  const VERSIE = 3;   // opbouw van de voortgang; een oudere voortgang (andere stappen) begint opnieuw

  // ---------------- opslag: alleen eigen sleutel, per gebruiker, nooit IndexedDB ----------------
  const uid = () => (App.user && App.user.id) || null;
  const leesAlles = () => {
    try { const o = JSON.parse(localStorage.getItem(SLEUTEL) || "{}"); if (o && o.v === 2 && o.gebruikers && typeof o.gebruikers === "object") return o; } catch (e) {}
    return { v: 2, gebruikers: {} };   // ook: oud formaat zonder gebruiker → weg (niet van iemand te herleiden)
  };
  const schrijfAlles = (o) => { try { localStorage.setItem(SLEUTEL, JSON.stringify(o)); } catch (e) {} };
  const leesLS = () => { const id = uid(), g = id && leesAlles().gebruikers[id]; return g && typeof g === "object" ? g : {}; };
  const schrijfLS = (g) => { const id = uid(); if (!id) return; const o = leesAlles(); o.gebruikers[id] = g; schrijfAlles(o); };
  const nieuw = () => ({ ver: VERSIE, s: -1, i: 0, fb: false, a: SC.map(() => ({})) });
  const gevuld = (x) => x !== undefined && x !== null && String(x).trim() !== "";
  const geldig = (v) => v && v.ver === VERSIE && Array.isArray(v.a) && v.a.length === SC.length && v.a.every((x) => x && typeof x === "object") &&
    Number.isInteger(v.s) && Number.isInteger(v.i) && v.s >= -1 && v.s <= SC.length && (v.s < 0 || v.s >= SC.length || (v.i >= 0 && v.i < SC[v.s].stappen.length));

  Object.assign(App, {
    _oef: null,
    oefAannames: aannames,
    oefVaag: vaag,   // voor de test: is een voorstel vaag ("voorzichtiger werken") of concreet ("ladder vastbinden")
    oefState() {
      if (!this._oef || this._oefVan !== uid()) {
        const v = leesLS().voortgang; this._oefVan = uid();
        this._oef = geldig(v) ? v : nieuw();
      }
      return this._oef;
    },
    oefBewaar() { if (!uid() || !this._oef) return; const g = leesLS(); g.voortgang = this._oef; schrijfLS(g); },
    oefOpen() { this._oefFocus = true; this.go("oefen"); },
    oefOpnieuw() { this._oef = nieuw(); this._oefVan = uid(); this.oefBewaar(); this.oefToon(); },
    oefStop() { this.oefBewaar(); this.go("vandaag"); },
    oefToon() { this._oefFocus = true; this.oefBewaar(); if (location.hash === "#/oefen") this.route(); else this.go("oefen"); },
    oefStart() { const o = this.oefState(); if (o.s < 0) { o.s = 0; o.i = 0; } o.fb = false; tril(15); this.oefToon(); },
    oefKlaar() { const g = leesLS(); g.gedaan = true; delete g.voortgang; schrijfLS(g); this._oef = null; this.go("vandaag"); },
    oefNietNu() { const g = leesLS(); g.verborgen = true; schrijfLS(g); document.querySelectorAll(".oef-hint").forEach((x) => x.remove()); },

    // ---- navigatie tussen de stappen (actievoorstel alleen bij A/V, zoals in het echt) ----
    oefOverslaan(sc, i, a) { return sc.stappen[i] === "actie" && !isAV(a.oordeel); },
    oefVerder() {
      const o = this.oefState(); if (o.s < 0 || o.s >= SC.length) return;
      const sc = SC[o.s], a = o.a[o.s], st = sc.stappen[o.i];
      if (sc.keuzes && sc.keuzes[st] && !keuzeGoed(sc, a, st)) return;   // bij een keuze ga je pas verder met de goede
      let i = o.i + 1;
      if (this.oefOverslaan(sc, i, a)) i++;
      if (i < sc.stappen.length) { o.i = i; } else { o.s++; o.i = 0; }
      o.fb = false; tril(12); this.oefToon();
    },
    oefTerug() {
      const o = this.oefState();
      if (o.s < 0) return this.oefStop();
      if (o.fb) { o.fb = false; return this.oefToon(); }
      if (o.s >= SC.length) { o.s = SC.length - 1; o.i = SC[o.s].stappen.length - 1; }
      else if (o.i > 0) o.i--;
      else if (o.s > 0) { o.s--; o.i = SC[o.s].stappen.length - 1; }
      else { o.s = -1; o.i = 0; }
      const sc = SC[o.s];
      if (sc && this.oefOverslaan(sc, o.i, o.a[o.s])) o.i--;
      o.fb = false; this.oefToon();
    },
    oefFeedback() { const o = this.oefState(); o.fb = true; tril(15); this.oefToon(); },
    // terug naar de invoer van deze stap (bijv. om het actievoorstel aan te passen); wat je invulde blijft staan
    oefAanpassen() { const o = this.oefState(), a = o.a[o.s], sc = SC[o.s]; if (a && sc && sc.stappen[o.i] === "actie") a.actieKlaar = false; o.fb = false; this.oefToon(); },

    // ---- invoer ----
    oefVeld(k, v) {
      const o = this.oefState(), a = o.a[o.s]; if (!a) return;
      a[k] = v; if (k === "actie") a.actieHerkomst = a.actieVs && v.trim() === a.actieVs ? "Voorstel" : "Jij";
      this.oefKnoppen(); clearTimeout(this._oefT); this._oefT = setTimeout(() => this.oefBewaar(), 400);
    },
    oefKnoppen() {
      const o = this.oefState(), a = o.a[o.s] || {};
      document.querySelectorAll("[data-oef-need]").forEach((b) => { b.disabled = !b.getAttribute("data-oef-need").split(",").every((k) => gevuld(a[k])); });
      const v = $("oef-vastleg"); if (v) v.disabled = !this.oefActieOk(a, SC[o.s]);
      // actiescherm: urgentie tonen zodra de actie open blijft, en de uitleg over wie toetst volgt wat je schrijft
      const pb = $("oef-prio-blok"), w = $("oef-wie");
      if (pb) pb.hidden = a.terPlaatse === "gecorrigeerd" && !this.oefActieNog(a);
      if (w) { const t = this.oefWie(a); if (w.textContent !== t) w.textContent = t; }
    },
    oefTaakVs() { const a = this.oefState().a[this._oef.s]; if (!gevuld(a.taak)) return; a.taakVs = true; this.oefToon(); },
    oefKiesTaak(t) { const o = this.oefState(), a = o.a[o.s]; a.gekozenTaak = t; a.taakUitVs = t === SC[o.s].taak; this.oefFeedback(); },
    // TRA-stap gekozen: op hetzelfde scherm verschijnt het oordeel (geen apart terugkoppelscherm)
    oefKiesRegel(id) {
      const o = this.oefState(), a = o.a[o.s]; a.regel = id; a.regelUitVs = (SC[o.s].koppel.voorstel || []).includes(id); a.oordeel = null;
      tril(12); this.oefBewaar(); this._oefFocusId = "oef-oordeel-lab"; this.route();
    },
    oefRegelOpnieuw() { const o = this.oefState(), a = o.a[o.s]; a.regel = null; a.regelUitVs = null; a.oordeel = null; this.oefToon(); },
    oefOordeel(x) { const o = this.oefState(), a = o.a[o.s]; if (!a.regel) return; a.oordeel = x; if (!isAV(x)) a.actieKlaar = false; tril(x === "C" ? 25 : [25, 60, 25]); this.oefFeedback(); },
    oefOordeelOpnieuw() { const o = this.oefState(); o.a[o.s].oordeel = null; o.fb = false; this.oefToon(); },
    oefKies(st, n) { const o = this.oefState(); o.a[o.s][st] = n; this.oefFeedback(); },
    oefActieVoorstel() {
      const o = this.oefState(), a = o.a[o.s], sc = SC[o.s];
      if (!sc.actie.vs) return;
      a.actie = sc.actie.vs; a.actieVs = sc.actie.vs; a.actieHerkomst = "Voorstel";
      const t = $("oef-f-actie"); if (t) t.value = a.actie;
      const k = $("oef-actiekop"); if (k) k.innerHTML = `<span class="lbl vs">Voorstel</span><span class="s oef-s">pas gerust aan; het telt pas als jij het vastlegt</span>`;
      this.oefKnoppen(); this.oefBewaar();
    },
    oefPositiefVoorstel() {
      const o = this.oefState(), a = o.a[o.s], sc = SC[o.s];
      a.positief = sc.positief.vs; a.positiefVs = true;
      const t = $("oef-f-positief"); if (t) t.value = a.positief;
      const k = $("oef-poskop"); if (k) k.innerHTML = `<span class="lbl vs">Voorstel</span><span class="s oef-s">zeg het in je eigen woorden</span>`;
      this.oefKnoppen(); this.oefBewaar();
    },
    // een keuze (ter plaatse, urgentie): opnieuw tekenen, scrollpositie en focus blijven
    oefZet(k, val) {
      const o = this.oefState(), a = o.a[o.s]; if (!a) return;
      a[k] = val;
      if (k === "terPlaatse" && val === "gecorrigeerd") a.prio = null;   // al opgelost en gezien: geen urgentie meer
      tril(12); this.oefBewaar();
      const y = window.scrollY; this._oefFocusId = "oef-" + k + "-" + val; this.route(); window.scrollTo(0, y);
    },
    // urgentie: nodig voor elke actie die open blijft; alleen een gezien herstel zonder iets dat nog moet gebeuren is afgerond
    oefActieOk(a, sc) {
      if (!sc || !gevuld(a.actie) || !a.terPlaatse) return false;
      return (a.terPlaatse === "gecorrigeerd" && !this.oefActieNog(a)) || !!a.prio;
    },
    oefVastleggen() {
      const o = this.oefState(), a = o.a[o.s]; if (!this.oefActieOk(a, SC[o.s])) return;
      if (a.terPlaatse === "gecorrigeerd" && !this.oefActieNog(a)) a.prio = null;   // afgerond: geen urgentie
      a.actieKlaar = true; this.oefFeedback();
    },
    oefWie(a) {
      if (a.terPlaatse === "maatregel") return "Een maatregel maakt alleen het lopende werk veilig. De actie blijft open; daarna stelt iemand uit het team de actie in: wie haar uitvoert en wie toetst.";
      if (a.terPlaatse === "gecorrigeerd") return this.oefActieNog(a)
        ? "Direct gecorrigeerd: het herstel zag je zelf. Maar je actie vraagt ook " + opsomNl(nogNaam(a.actie)) + ", en dat moet nog gebeuren. Daarom blijft de actie open tot een toetser het heeft gezien: kies hoe dringend het is."
        : "Direct gecorrigeerd: de ploeg heeft het ter plaatse opgelost en jij hebt het herstel zelf gezien. Dan ben jij de toetser en is de actie afgerond; een urgentie is niet nodig.";
      return "Jij schrijft alleen het voorstel. Daarna stelt iemand uit het team de actie in: wie haar uitvoert en wie toetst.";
    },
    // past het actievoorstel bij wat je zag? (alleen uitleg; het voorstel blijft van jou)
    // elk punt heeft een soort: "concreet" (de tekst zelf) of "zag" (ter plaatse / urgentie past niet bij wat je zag);
    // de kop en de samenvatting volgen die soort, zodat ze nooit iets anders vragen dan de punten zelf
    oefActieCheck(sc, a) {
      const c = [], t = String(a.actie || "").toLowerCase(), gecorr = a.terPlaatse === "gecorrigeerd", naam = voorstelNaam(sc, a);
      // t = de uitleg op het actiescherm; kort = precies dat punt in de samenvatting (zodat die nooit iets anders zegt)
      const zag = (x, kort) => c.push({ soort: "zag", t: x, kort }), concreet = (x, kort) => c.push({ soort: "concreet", t: x, kort: kort || "je " + naam + " was nog niet concreet" });
      // onveilig: het voorstel laat het gevaar bestaan of maakt het erger (verder hijsen met de kapotte band, slot eraf)
      const onveilig = (x, kort) => c.push({ soort: "onveilig", t: x, kort });
      const tpNaam = { niets: "Niets gedaan", maatregel: "Maatregel genomen", gecorrigeerd: "Direct gecorrigeerd" }[a.terPlaatse] || "";
      // het oordeel zelf komt hier niet meer terug: dat kreeg op het oordeelscherm al zijn (ene) uitleg
      if (sc.id === "sleuf") {
        // in orde volgens de TRA; bij V (een goed oordeel) en bij A alleen vragen om een concreet voorstel
        if (vaag(a.actie)) concreet(a.oordeel === "V" ? "Maak je verbetervoorstel concreet: wát kan er beter, en hoe? Dan weet het team wat het kan oppakken."
          : "Maak je actievoorstel concreet: wát moet er gebeuren, en waarom? Dan weet het team wat het kan oppakken.");
        if (a.terPlaatse === "gecorrigeerd" || a.terPlaatse === "maatregel") zag("Ter plaatse is in deze scène niets veranderd: je zag geen maatregel en geen herstel. Kies ‘Niets gedaan’; je voorstel gaat naar het team.",
          "bij ‘Ter plaatse’ koos je ‘" + tpNaam + "’, maar ter plaatse veranderde niets (‘Niets gedaan’)");
      } else if (sc.id === "put") {
        if (a.terPlaatse === "niets") zag("Er hing een last aan een beschadigde band. Dan laat je het werk niet doorgaan. Het hijsen is gestopt: dat leg je vast als ‘Maatregel genomen’.",
          "bij ‘Ter plaatse’ koos je ‘Niets gedaan’, maar het hijsen werd gestopt (‘Maatregel genomen’)");
        if (gecorr) zag("Er hangt nog geen nieuwe band en jij hebt geen herstel gezien. Kies ‘Maatregel genomen’: het hijsen is gestopt, en de actie blijft open tot een toetser de nieuwe band heeft gezien.",
          "bij ‘Ter plaatse’ koos je ‘Direct gecorrigeerd’, maar je zag geen herstel (‘Maatregel genomen’)");
        if (!gecorr && a.prio && a.prio !== "direct") zag("Een beschadigde hijsband is direct gevaar. Kies ‘Direct’: de band gaat nu uit gebruik, niet over een paar weken.",
          "de urgentie hoort ‘Direct’ te zijn, want een beschadigde hijsband is direct gevaar");
        // het voorstel zelf: neemt het de band uit gebruik? laat het het gevaar bestaan? een toolbox alleen is niet genoeg
        const herstelWoord = /(omdraai\w*|om ?draaien|andere kant|\bknoop\w*|\btape\w*|plak\w*|repar\w*|naai\w*|lijm\w*|dezelfde band)/;
        const doorhijsen = zegt(t, DOORHIJSEN) && (zegt(t, herstelWoord) || !NIEUWE_BAND.test(t));
        if (doorhijsen) onveilig("Met een beschadigde hijsband wordt niet verder gehesen, ook niet als je hem omdraait, knoopt of plakt. De band gaat uit gebruik; er wordt pas weer gehesen met een gekeurde band.",
          "je actievoorstel liet verder hijsen met de beschadigde band");
        else if (/\b(later|ooit|binnenkort|op termijn|volgende week|na de klus|t\.z\.t)\b/.test(t)) zag("‘Later’ past niet bij direct gevaar. De band gaat nu uit gebruik, en er wordt pas weer gehesen met een gekeurde band.",
          "‘later’ in je actievoorstel past niet bij direct gevaar");
        else if (vaag(a.actie)) concreet("Maak je actie concreet: wat gebeurt er met de beschadigde band, en wanneer mag er weer gehesen worden?");
        else if (!zegt(t, BAND_UIT)) concreet(preventief(t) ? "Dat voorkomt herhaling, en dat is goed. Maar de beschadigde band moet nú uit gebruik. Schrijf er ook bij wat er met de band gebeurt (bijvoorbeeld afkeuren) en dat er pas weer gehesen wordt met een gekeurde band."
            // ronde 7: een nieuwe band halen is goed, maar zegt niet dat de kapotte band uit gebruik gaat (die kan terug de bus in)
            : NIEUWE_BAND.test(t) ? "Een nieuwe band is goed. Schrijf er ook bij wat er met de beschadigde band gebeurt (bijvoorbeeld afkeuren en doorknippen), anders kan hij later terug in de bus belanden."
            : "Maak je actie concreet: wat gebeurt er met de beschadigde band, en wanneer mag er weer gehesen worden?",
          "je actievoorstel zei nog niet dat de beschadigde band uit gebruik gaat");
      } else if (sc.id === "kast") {
        // ook als het herstel al gezien is: de actie zegt wát er hersteld is; ‘Direct gecorrigeerd’ maakt een lege tekst niet goed
        // het herstel (label met naam en datum) én een preventieve actie (toolbox over LOTOTO, labels in de bus) zijn concreet
        const naWerk = /\b(als|wanneer|nadat|na) (het |de )?(werk|klus|klaar)\w*( \w+)?( (klaar|af|gedaan|is))?|na afloop|na het werk/.test(t);
        if (zegt(t, SLOT_ERAF) && !naWerk) onveilig("Het slot hoort erop te blijven zolang er aan de installatie gewerkt wordt; het slot eraf halen is het omgekeerde van wat hier nodig is. Wat ontbrak, was het label met naam en datum.",
          "je actievoorstel haalde het slot eraf");
        else if (vaag(a.actie)) concreet("Maak je actie concreet: wat ontbrak er aan het slot, en wat hangt er voortaan aan? Ook als het al hersteld is, lees je in de actie wát er hersteld is.");
        // ronde 7: een bevinding ("Label ontbreekt aan het slot") is geen actie: wat is er gedaan of wat moet er gebeuren?
        else if (BEVINDING.test(t) && !HERSTEL.test(t) && !preventief(t)) concreet("Dit is wat je zag (het label ontbrak), nog niet wat er gedaan is of moet gebeuren. Schrijf wat er hersteld is, bijvoorbeeld ‘Label met naam en datum aan het slot gehangen’, of hoe je voorkomt dat het weer ontbreekt.",
          "je actievoorstel beschreef wat je zag, niet wat er gedaan is of moet gebeuren");
        else if (!LABEL.test(t) && !PREVENTIEF.test(t)) concreet("Je actie gaat nog niet over wat je zag: het label met naam en datum aan het slot. Schrijf wat er hersteld is, of hoe je voorkomt dat het weer ontbreekt.",
          "je actievoorstel ging nog niet over het ontbrekende label");
        if (a.terPlaatse === "niets") zag("Je zag de monteur het label ophangen. Dat herstel leg je vast als ‘Direct gecorrigeerd’.",
          "bij ‘Ter plaatse’ koos je ‘Niets gedaan’, maar je zag het label ophangen (‘Direct gecorrigeerd’)");
        if (a.terPlaatse === "maatregel") zag("Het label hangt er nu en jij zag het: het is dus niet alleen veilig gemaakt, het is hersteld. Kies ‘Direct gecorrigeerd’.",
          "bij ‘Ter plaatse’ koos je ‘Maatregel genomen’, maar je zag het herstel (‘Direct gecorrigeerd’)");
      }
      // ronde 7: wat het gevaar laat bestaan eerst, zodat "zo blijft het gevaar bestaan:" over dát punt gaat
      return c.filter((x) => x.soort === "onveilig").concat(c.filter((x) => x.soort !== "onveilig"));
    },
    // afgerond = jij zag het herstel (‘Direct gecorrigeerd’) en het voorstel is in orde; het oordeel speelt hier geen rol.
    // Actiescherm en samenvatting gebruiken allebei deze ene regel, zodat ze nooit iets anders zeggen.
    // Een actie die (ook) nog moet gebeuren (toolbox, instructie, afspraak) kan niet ter plaatse gezien zijn: die blijft open
    // tot een toetser heeft gezien dat ze gebeurd is, ook als het herstel (het label) al hangt.
    oefActieAfgerond(sc, a) { return !!(a && isAV(a.oordeel) && a.terPlaatse === "gecorrigeerd" && !this.oefActieCheck(sc, a).length && !this.oefActieNog(a)); },
    // per zinsdeel: "Label opgehangen en monteur uitleg gegeven" is al gebeurd; "toolbox geven" moet nog gebeuren
    oefActieNog(a) { return nogTeDoen((a && a.actie) || "").length > 0; },
    // gecorrigeerd én iets dat nog moet gebeuren: dan blijft de actie open en is een urgentie nodig
    oefOpenNaHerstel(a) { return !!(a && a.terPlaatse === "gecorrigeerd" && this.oefActieNog(a)); },

    // ---------------- weergave ----------------
    view_oefen() {
      const v = $("view"), o = this.oefState();
      $("tabbar").classList.add("hidden"); $("app").classList.add("nonav");   // focus, zoals tijdens een echte inspectie
      let h;
      if (o.s < 0) h = this.oefIntro();
      else if (o.s >= SC.length) h = this.oefSamenvatting();
      else h = this.oefStapHtml(o);
      v.appendChild(el(`<div class="oef">${h}</div>`));
      this.oefKnoppen();
      const focus = this._oefFocus, fid = this._oefFocusId; this._oefFocus = false; this._oefFocusId = null;
      requestAnimationFrame(() => {
        if (fid) { const f = document.getElementById(fid); if (f) { f.focus({ preventScroll: true }); if (fid === "oef-oordeel-lab") f.scrollIntoView({ block: "nearest" }); return; } }
        if (!focus) return;
        const fb = v.querySelector(".oef-fb");
        if (fb) { fb.focus({ preventScroll: true }); fb.scrollIntoView({ block: "nearest" }); }
        else { const t = v.querySelector("h1"); if (t) t.focus({ preventScroll: true }); }
      });
    },
    oefKop(titel, sub, vg) {
      return `<div class="oef-kop">
        <div class="oef-rij"><button class="ih-rond oef-rond"${act("oefTerug")} aria-label="Terug">${svg("back", 22)}</button>
          <div class="oef-label" role="note"><span class="oef-stip" aria-hidden="true"></span><span><b>Oefening</b> · niets wordt een echte inspectie</span></div>
          <button class="oef-stop"${act("oefStop")}>Stoppen</button></div>
        ${vg ? `<div class="oef-vg"><div class="oef-vg-t">${esc(vg.t)}</div><div class="oef-balk" role="progressbar" aria-label="Voortgang van de oefening" aria-valuemin="0" aria-valuemax="${vg.n}" aria-valuenow="${vg.nu}"><span style="width:${Math.round((vg.nu / vg.n) * 100)}%"></span></div></div>` : ""}
        ${sub ? `<div class="kicker oef-kicker">${esc(sub)}</div>` : ""}<h1 tabindex="-1">${esc(titel)}</h1></div>`;
    },
    oefVoortgang(o) {
      let n = 0, nu = 0;
      SC.forEach((sc, si) => sc.stappen.forEach((st, i) => { n++; if (si < o.s || (si === o.s && i <= o.i)) nu++; }));
      return { n, nu, t: `Scène ${o.s + 1} van ${SC.length} · ${SC[o.s].titel}` };
    },
    oefIntro() {
      const ls = leesLS(), o = this.oefState(), bezig = o.a.some((x) => Object.keys(x).length);
      const scene = (sc) => `<li><span class="oef-nr" aria-hidden="true">${svg("pin", 15)}</span><span><b>${esc(sc.titel)}</b><span class="oef-s">${esc(sc.leer)}</span></span></li>`;
      return `${this.oefKop("Oefeninspectie", "Voor nieuwe inspecteurs · ±5 minuten")}
        <div class="q oef-kaart">
          <p class="oef-p">Een momentopname is een gesprek op de werkplek. Je kijkt mee, praat met de ploeg, benoemt wat goed gaat en spreekt af wat beter moet. De app helpt je daarna met vastleggen.</p>
          <p class="oef-p oef-p2">Je oefent dat in drie korte scènes op een verzonnen werkplek, met verzonnen collega's. Na elke keuze krijg je kort uitleg.</p>
          <ul class="oef-stappen" aria-label="De drie scènes">${SC.map(scene).join("")}</ul>
          <div class="oef-veilig">${svg("check", 18, 2.6)}<span>Er ontstaat geen echte inspectie, actie of melding. Je kunt altijd stoppen.</span></div>
        </div>
        <button class="btn primary oef-hoofd"${act("oefStart")}>${bezig ? "Verder met oefenen" : "Begin met oefenen"}</button>
        ${bezig ? `<button class="linkknop"${act("oefOpnieuw")}>Opnieuw beginnen</button>` : ""}
        ${ls.gedaan ? `<div class="s oef-s oef-midden">Je hebt de oefening al eens gedaan. Nog een keer kan altijd.</div>` : ""}`;
    },
    // de situatie: groot bij de eerste stap van een scène, daarna ingeklapt (rustig en kort scherm)
    oefScene(sc, modus) {
      const tekst = sc.tekst.map((t) => `<p>${esc(t)}</p>`).join("");
      const blok = `<section class="oef-scene oef-sc-${sc.id}" aria-label="De situatie">
        <div class="oef-plaat">${tekening(sc.id, sc.alt)}</div>
        <div class="oef-verhaal"><div class="oef-plek">${svg("pin", 15)}${esc(sc.plek)}</div>${tekst}</div></section>`;
      if (modus === "vol") return blok;
      // de plaatsnaam staat in het ingeklapte kopje; uitgeklapt staat hij al in het verhaal (niet dubbel)
      return `<details class="oef-terug"${modus === "open" ? " open" : ""}><summary><span class="oef-terug-ic" aria-hidden="true">${svg("pin", 15)}</span><span class="grow">Bekijk de situatie nog eens<span class="oef-s oef-terug-plek">${esc(sc.plek)}</span></span></summary>${blok}</details>`;
    },
    oefStapHtml(o) {
      const sc = SC[o.s], st = sc.stappen[o.i], a = o.a[o.s];
      const kop = this.oefKop(st === "actie" && isVerbeter(sc, a) ? "Verbetervoorstel" : STAPNAAM[st], null, this.oefVoortgang(o));
      const scene = this.oefScene(sc, o.i === 0 && !o.fb ? "vol" : st === "zie" && !o.fb ? "open" : "terug");
      const body = sc.keuzes && sc.keuzes[st] ? this.oefKeuze(sc, a, o.fb, st) : this["oef_" + st] ? this["oef_" + st](sc, a, o.fb) : "";
      return kop + scene + body;
    },
    // de methoderegels van deze stap (één kaartje; elke regel komt maar één keer in de oefening voor)
    oefRegels(sc, st) { return (sc.regels && sc.regels[st]) || []; },
    // terugkoppeling na een stap
    oefFb(titel, tekst, regels, extra, knoppen, bijsturen) {
      const r = (regels || []).filter((x) => REGEL[x]);
      return `<section class="oef-fb${bijsturen ? " let" : ""}" tabindex="-1" aria-label="Terugkoppeling">
        <div class="oef-fb-kop"><span class="oef-fb-ic">${bijsturen ? '<span aria-hidden="true">i</span>' : svg("check", 16, 3)}</span>${esc(titel)}</div>
        <p>${tekst}</p>${extra || ""}
        ${r.length ? `<div class="oef-regel">${r.map((x) => `<div class="oef-regel-r"><b>${esc(REGEL[x][0])}</b><span>${esc(REGEL[x][1])}</span></div>`).join("")}</div>` : ""}
        ${knoppen || `<button class="btn primary oef-verder"${act("oefVerder")}>Verder</button>`}</section>`;
    },
    oefJij(t) { return `<div class="oef-jij"><span class="lbl jij">Jij</span><span>${t}</span></div>`; },
    oefInvoer(k, ph, label, waarde) {
      return `<label class="oef-lab" for="oef-f-${k}">${esc(label)}</label>
        <div class="inbox"><textarea id="oef-f-${k}" class="oef-ta" placeholder="${esc(ph)}"${op("input", "oefVeld", k, WAARDE)}>${esc(waarde || "")}</textarea></div>`;
    },
    // opnieuw proberen; "Verder" ernaast alleen waar je eigen tekst de keuze blijft (waarneming, actievoorstel)
    oefKnoppenOpnieuw(label, actie, metVerder) {
      return `<div class="oef-knoppen"><button class="btn primary oef-verder"${act(actie)}>${esc(label)}</button>${metVerder ? `<button class="linkknop"${act("oefVerder")}>Verder</button>` : ""}</div>`;
    },

    // --- stap: een keuze uit wat je doet of zegt (ingrijpen, gesprek): verder gaat pas met de goede keuze ---
    oefKeuze(sc, a, fb, st) {
      const K = sc.keuzes[st];
      if (fb) {
        const n = typeof a[st] === "number" ? a[st] : 0, x = K.opties[n] || K.opties[0], goed = x[1];
        const zeg = K.citaat ? "“" + esc(x[0]) + "”" : esc(x[0]);
        return `<div class="q oef-kaart">${this.oefJij(zeg)}</div>` +
          this.oefFb(goed ? K.goedTitel : K.misTitel, esc(x[2]),
            goed ? this.oefRegels(sc, st) : [], "", goed ? null : this.oefKnoppenOpnieuw("Kies opnieuw", "oefTerug"), !goed);
      }
      return `<div class="q oef-kaart">${K.intro ? `<p class="oef-p oef-intro">${esc(K.intro)}</p>` : ""}<p class="oef-vraag" id="oef-k-${st}">${esc(K.vraag)}</p>
        <div class="oef-keuzes kolom" role="group" aria-labelledby="oef-k-${st}">${K.opties.map((x, n) => `<button class="chipb oef-chip oef-groot"${act("oefKies", st, n)}>${K.citaat ? "“" + esc(x[0]) + "”" : esc(x[0])}</button>`).join("")}</div></div>`;
    },
    // --- stap: de taak (je vraagt het de ploeg; de app doet een Voorstel) ---
    oef_taak(sc, a, fb) {
      if (fb) {
        const goed = a.gekozenTaak === sc.taak;
        return `<div class="q oef-kaart">${this.oefJij("“" + esc(String(a.taak || "").trim()) + "”")}<div class="oef-gekozen">Taak: <b>${esc(a.gekozenTaak)}</b> ${a.taakUitVs ? '<span class="lbl vs">Voorstel bevestigd</span>' : '<span class="lbl jij">zelf gekozen</span>'}</div></div>` +
          this.oefFb(goed ? "Goed: dit is de taak" : "Kijk nog eens naar de taak",
            goed ? "Je vroeg het de ploeg en zei het in je eigen woorden. De app zocht de taak erbij en jij bevestigde het Voorstel. In het echt kun je de taak ook inspreken."
              : "Hier sluit de ploeg een persleiding aan; luister nog eens naar wat ze zeiden. In het echt kies jij welke taak je bekijkt.",
            this.oefRegels(sc, "taak"), "", goed ? null : this.oefKnoppenOpnieuw("Kies opnieuw", "oefTerug", true), !goed);
      }
      const G = sc.taakGesprek, w = eigenWoorden(a.taak || "", sc.taak + " " + (sc.taakDoc || ""));
      const vs = a.taakVs ? `<div class="q vskaart oef-vs" aria-live="polite"><div class="vskop"><span class="lbl vs">Voorstel</span><span class="s oef-s">· is dit de taak?</span></div>
          <button class="pick vpick"${act("oefKiesTaak", sc.taak)}><span class="t">${esc(sc.taak)}</span>${w.length ? `<span class="waarom">Waarom: je zei ${w.map((x) => "“" + esc(x) + "”").join(", ")}</span>` : ""}<span class="gebruik">${svg("check", 18)}Ja, dit klopt</span></button>
          <details class="zelfkies"><summary>Zelf kiezen <span class="n">${sc.taken.length}</span></summary><div class="zlijst">${sc.taken.map((t) => `<button class="zpick"${act("oefKiesTaak", t)}><span class="t">${esc(t)}</span></button>`).join("")}</div></details></div>` : "";
      return `<div class="q oef-kaart">
          <div class="oef-dialoog">${this.oefJij("“" + esc(G.vraag) + "”")}<div class="oef-zij"><span class="lbl oef-ploeg">${esc(G.wie)}</span><span>“${esc(G.antwoord)}”</span></div></div>
          <p class="oef-vraag">Wat is de taak? Zeg het in je eigen woorden.</p>
          ${this.oefInvoer("taak", "Bijv. ze sluiten de leiding aan", "De taak in je eigen woorden", a.taak)}
          ${a.taakVs ? "" : `<button class="btn primary oef-verder" data-oef-need="taak"${act("oefTaakVs")}>Volgende</button>`}</div>
        <div id="oef-taakvs">${vs}</div>`;
    },
    // --- stap: wat zag je? (alleen wat je ziet telt; aannames worden letterlijk benoemd) ---
    oef_zie(sc, a, fb) {
      if (fb) {
        const tekst = String(a.zie || "").trim(), ann = aannames(tekst);
        let rest = tekst.toLowerCase(); ann.forEach((x) => { rest = rest.split(x.toLowerCase()).join(" "); });
        const raak = sc.zieWoorden.some((x) => rest.includes(x));
        const extra = (ann.length ? `<div class="oef-let"><b>Dit zie je nu niet:</b> ${ann.map((x) => "“" + esc(x) + "”").join(", ")}. Laat het weg, of vraag het de ploeg in het gesprek.</div>` : "") +
          `<div class="oef-vb"><div class="oef-vb-t">Zo zou een ervaren inspecteur het zeggen</div>“${esc(sc.zieVoorbeeld)}”</div>`;
        const titel = raak ? (ann.length ? "Bijna: een deel is een aanname" : "Goed gezien") : "Kijk nog eens naar de hijsband";
        const p = raak ? (ann.length ? "Wat je over de band zegt, zag je zelf: dat is een waarneming. Maar niet alles in je zin heb je gezien."
            : "Je beschreef wat je zelf zag. Kort en feitelijk is genoeg.")
          : "Je beschrijving is van jou, maar het belangrijkste in deze situatie is de beschadigde hijsband. Beschrijf feitelijk wat je zag.";
        return `<div class="q oef-kaart">${this.oefJij("“" + esc(tekst) + "”")}</div>` +
          this.oefFb(titel, p, this.oefRegels(sc, "zie"), extra, ann.length || !raak ? this.oefKnoppenOpnieuw("Pas je waarneming aan", "oefAanpassen", true) : null, ann.length > 0 || !raak);
      }
      return `<div class="q oef-kaart"><p class="oef-vraag">De pomp staat veilig. Wat zag je? Beschrijf het kort, zoals je het in het echt zou inspreken.</p>
        ${this.oefInvoer("zie", "Bijv. de hijsband is …", "Wat zag je?", a.zie)}
        <div class="s oef-s oef-tip">In de app kun je ook inspreken of een foto maken. Hier typ je.</div>
        <button class="btn primary oef-verder" data-oef-need="zie"${act("oefFeedback")}>Volgende</button></div>`;
    },
    // --- stap: koppel aan de TRA (Voorstel of zelf kiezen) en kies zelf C/A/V/NVT, op één scherm ---
    oef_oordeel(sc, a, fb) {
      const k = sc.koppel, info = (id) => k.opties.find((x) => x[0] === id) || [id, id, id];
      const daarna = sc.daarna ? `<div class="q oef-kaart oef-daarna"><p class="oef-p">${esc(sc.daarna)}</p></div>` : "";
      const gekozenRegel = () => { const i = info(a.regel);
        return `<div class="koppelrij"><span class="vp-ref">${esc(i[1])}</span><div class="t">${esc(i[2])}</div></div>
          <div class="oef-gekozen">${a.regelUitVs ? '<span class="lbl vs">Voorstel bevestigd</span>' : '<span class="lbl jij">zelf gekozen</span>'}${fb ? "" : `<button class="linkknop oef-klein"${act("oefRegelOpnieuw")}>Andere TRA-stap</button>`}</div>`; };
      if (fb && a.regel && a.oordeel) {
        const x = a.oordeel, zelfde = past(sc, x), regelGoed = (k.goed || []).includes(a.regel);
        const koppelTekst = regelGoed ? "" : ` Let ook op de koppeling: bij deze situatie past ${esc(info(k.goed[0])[1])} het best.`;
        // wat er hierna komt, één keer en passend bij wat je zag (bij A die niet bij de TRA past, staat het al in de uitleg)
        const volgt = x === "A" ? (zelfde ? " Omdat je A koos, schrijf je hierna een actievoorstel." : "")
          : x === "V" ? (zelfde ? " Omdat je V koos, schrijf je hierna een verbetervoorstel: wat kan er concreet beter?" : " Je koos V; je schrijft hierna wat er moet gebeuren.") : "";
        return `<div class="q oef-kaart">${gekozenRegel()}<div class="oef-gekozen">Jouw oordeel: <span class="badge b-${x === "NVT" ? "N" : x}">[${x}] ${OORDEEL[x][0]}</span></div></div>` +
          this.oefFb("Jouw oordeel: " + OORDEEL[x][0], esc(sc.uitleg[x]) + koppelTekst + volgt,
            this.oefRegels(sc, "oordeel"), "",
            `<div class="oef-knoppen"><button class="btn primary oef-verder"${act("oefVerder")}>Verder</button><button class="linkknop"${act("oefOordeelOpnieuw")}>Toch anders kiezen</button></div>`,
            !zelfde || !regelGoed);
      }
      if (!a.regel) {
        // het Waarom van het Voorstel: wat de scène laat zien (k.waarom), of anders de eigen woorden uit "Wat zag je?"
        const w = () => { if (k.waarom) return esc(k.waarom); const ww = eigenWoorden(String(a.zie || ""), k.doc || ""); return ww.length ? "je zei " + ww.map((x) => "“" + esc(x) + "”").join(", ") : ""; };
        const pick = (id) => { const i = info(id), wa = w(); return `<button class="pick vpick"${act("oefKiesRegel", id)}><span class="vp-ref">${esc(i[1])}</span><span class="t">${esc(i[2])}</span>${wa ? `<span class="waarom">Waarom: ${wa}</span>` : ""}<span class="gebruik">${svg("check", 18)}Ja, dit klopt</span></button>`; };
        const zelf = k.opties.map((x) => `<button class="zpick"${act("oefKiesRegel", x[0])}><span class="vp-ref">${esc(x[1])}</span><span class="t">${esc(x[2])}</span></button>`).join("");
        return `${daarna}<div class="q vskaart oef-vs"><p class="oef-vraag">${esc(k.vraag || "Welke stap uit de TRA hoort bij wat je zag?")}</p>${k.voorstel.length ? `<div class="vskop"><span class="lbl vs">Voorstel</span><span class="s oef-s">· klopt dit?</span></div>${k.voorstel.map(pick).join("")}`
            : `<div class="vskop"><span class="lbl vs">Voorstel</span><span class="s oef-s">· geen duidelijke stap gevonden</span></div><div class="vs-geen">Kies hieronder zelf uit de TRA.</div>`}</div>
          <details class="zelfkies"${k.voorstel.length ? "" : " open"}><summary>Zelf kiezen uit de TRA <span class="n">${k.opties.length}</span></summary><div class="zlijst">${zelf}</div></details>`;
      }
      return `${daarna}<div class="q okaart oef-kaart">${gekozenRegel()}</div>
        <div class="oef-odock"><div class="otitel" id="oef-oordeel-lab" tabindex="-1">Jouw oordeel</div>
          <div class="seg stapel" role="group" aria-labelledby="oef-oordeel-lab">${["C", "A", "V"].map((x) => `<button class="t-${x}"${act("oefOordeel", x)} aria-pressed="false"><span class="l">${x}</span><span class="w">${OORDEEL[x][0]}</span><span class="u">${OORDEEL[x][1]}</span></button>`).join("")}</div>
          <button class="linkknop nvt"${act("oefOordeel", "NVT")}>Niet van toepassing</button></div>`;
    },
    // --- stap: actievoorstel (bij A of V) ---
    oef_actie(sc, a, fb) {
      const A = sc.actie, gecorr = a.terPlaatse === "gecorrigeerd", isV = isVerbeter(sc, a), naam = voorstelNaam(sc, a);
      const gezien = sc.gezien ? `<div class="oef-gezien"><b>Wat je zag:</b> ${esc(sc.gezien)}</div>` : "";
      if (fb) {
        // alleen het voorstel zelf telt hier; het oordeel kreeg op het oordeelscherm al zijn uitleg (niet terugsturen)
        const corr = this.oefActieCheck(sc, a), nogTel = "Nog " + (TEL[corr.length] || corr.length + " dingen") + ":";
        const alleenConcreet = corr.length > 0 && corr.every((c) => c.soort === "concreet"), geenConcreet = corr.every((c) => c.soort !== "concreet");
        const afgerond = this.oefActieAfgerond(sc, a);
        const stappen = this.actieStappen ? this.actieStappen({ status: afgerond ? "Afgerond" : "Voorstel" }, { gecorr: afgerond }) : "";
        const tp = { niets: "niets gedaan", maatregel: "maatregel genomen", gecorrigeerd: "direct gecorrigeerd" }[a.terPlaatse] || "–";
        // wat de terugkoppeling zegt, volgt wat de oefenaar zelf schreef: nooit "de band gaat uit gebruik" als dat er niet
        // staat, en nooit "afgerond" voor iets dat nog moet gebeuren (een toolbox die nog gegeven wordt)
        const nog = this.oefActieNog(a), ta = String(a.actie || "").toLowerCase();
        const ok = corr.length ? "" : a.terPlaatse === "maatregel" && A.verwachtTp !== "maatregel"
          ? "Een maatregel maakt het lopende werk veilig. De actie blijft open tot ze is uitgevoerd en getoetst."
          // ronde 7: de tekst noemt wát nog moet gebeuren, in de woorden van de oefenaar (nooit een vaste "toolbox")
          : gecorr && nog ? (LABEL.test(ta) && HERSTEL.test(ta) ? "Het label zag je zelf hangen; dat herstel is klaar. " : "‘Direct gecorrigeerd’ zegt dat het label ter plaatse is hersteld; dat zag je zelf. ") +
              "Maar " + opsomNl(nogNaam(ta)) + " moet nog gebeuren, en dat heb je niet zien gebeuren. Daarom blijft de actie open, met jouw urgentie (" + (PRIO_NAAM[a.prio] || "–") + "), tot een toetser heeft gezien dat het gebeurd is." +
              (LABEL.test(ta) && HERSTEL.test(ta) ? " In het echt leg je dat liefst vast als een aparte actie." : "")
          : gecorr && A.verwachtTp !== "gecorrigeerd" ? "Jij zag het herstel: dan ben jij de toetser en is de actie afgerond. Zonder dat te zien, blijft ze open."
          : sc.id === "put" ? "Het hijsen is gestopt (‘Maatregel genomen’) en volgens je actie gaat de beschadigde band uit gebruik" + (preventief(ta) ? ", en je pakt ook de oorzaak aan" : "") + ". Dat past bij het gevaar. Daarna stelt iemand uit het team de actie in: wie haar uitvoert en wie toetst."
          // ronde 7: wat al gebeurd is ("monteur uitleg gegeven") noemt de terugkoppeling ook, in de woorden van de oefenaar
          : sc.id === "kast" && gecorr && gedaanNaam(ta).length ? "Je zag zelf dat het label nu aan het slot hangt, en volgens je actie gebeurde " + opsomNl(gedaanNaam(ta)) + " ook al ter plaatse. Dan ben jij de toetser en is de actie meteen afgerond. Sluit af met wat goed ging: ‘Goed dat je hebt afgeschakeld en je slot erop hebt gedaan.’"
          : isV && A.okTekstV ? A.okTekstV : A.okTekst;
        // de kop vraagt precies wat de punten vragen: alleen de tekst → concreter; alleen ter plaatse/urgentie → kijk naar wat je zag
        const onv = corr.some((c) => c.soort === "onveilig");
        const kop = !corr.length ? (sc.id === "sleuf" ? (isV ? "Verbetervoorstel vastgelegd" : "Actievoorstel vastgelegd") : nog && gecorr ? "Vastgelegd, de actie blijft open" : "Past bij wat je zag")
          : onv ? "Let op: zo blijft het gevaar"
          : alleenConcreet ? "Maak het nog wat concreter"
          : sc.id === "put" ? "Let op: dit is direct gevaar"
          : sc.id === "kast" ? "Kijk nog eens naar wat je zag"
          : geenConcreet ? "Kijk nog eens bij ‘Ter plaatse’" : "Bijna: nog even aanvullen";
        // bij een onveilig voorstel: eerst het gevaar (bij de kop en de inleiding), de andere punten apart eronder
        const li = (l) => `<ul class="oef-corr">${l.map((c) => `<li>${esc(c.t)}</li>`).join("")}</ul>`;
        const onvL = corr.filter((c) => c.soort === "onveilig"), restL = corr.filter((c) => c.soort !== "onveilig");
        const lijstHtml = onvL.length && restL.length ? li(onvL) + `<p class="oef-p oef-ook">Verder nog ${esc(TEL[restL.length] || restL.length + " dingen")}:</p>` + li(restL) : li(corr);
        const intro = !corr.length ? esc(ok)
          : isV ? "Je oordeel V past hier, en je verbetervoorstel is van jou. " + nogTel
          : sc.id === "sleuf" ? "Je oordeel en je actievoorstel zijn van jou. " + nogTel
          : onv ? "Het " + naam + " is van jou, maar zo blijft het gevaar bestaan:"
          : alleenConcreet ? "Het " + naam + " is van jou. " + nogTel
          : "Het " + naam + " is van jou. Toch past het nog niet bij wat je zag:";
        return `<div class="q oef-kaart">${this.oefJij("“" + esc(String(a.actie || "").trim()) + "”")}
          <div class="oef-gekozen">${a.actieHerkomst === "Voorstel" ? '<span class="lbl vs">Voorstel gebruikt</span>' : '<span class="lbl jij">zelf geschreven</span>'} · ter plaatse: <b>${esc(tp)}</b>${gecorr && !nog ? "" : ` · urgentie: <b>${esc({ direct: "direct", kort: "kort (±2 weken)", planmatig: "planmatig (±8 weken)" }[a.prio] || "–")}</b>`}</div></div>` +
          this.oefFb(kop, intro,
            corr.length ? [] : this.oefRegels(sc, "actie"), (corr.length ? lijstHtml : "") +
              (stappen && !corr.length ? `<div class="hierna oef-hierna"><div class="hierna-t">Hierna</div>${stappen}</div>` : ""),
            corr.length ? this.oefKnoppenOpnieuw("Pas je " + naam + " aan", "oefAanpassen", true) : null, corr.length > 0);
      }
      const keus = (k, val, w, u) => `<button class="kvlak${a[k] === val ? " on" : ""}" id="oef-${k}-${val}"${act("oefZet", k, val)} aria-pressed="${a[k] === val}"><span class="w">${w}</span>${u ? `<span class="u">${esc(u)}</span>` : ""}</button>`;
      // één duidelijke zin over wie toetst, passend bij wat je kiest (nooit twee tegenstrijdige)
      // één duidelijke zin over wie toetst, passend bij wat je kiest én schrijft (nooit twee tegenstrijdige); bij typen
      // werkt oefKnoppen hem bij, en ook of de urgentie nodig is
      const wie = this.oefWie(a), prioUit = gecorr && !this.oefActieNog(a);
      return `<div class="q akaart2 oef-kaart">${gezien}
          <div class="arij"><span id="oef-actiekop" class="oef-arijkop">${a.actieHerkomst === "Voorstel" ? `<span class="lbl vs">Voorstel</span><span class="s oef-s">pas gerust aan; het telt pas als jij het vastlegt</span>` : `<span class="arij-t">${isV ? "Wat kan er beter?" : "Wat moet er gebeuren?"}</span>`}</span>
            ${A.vs ? `<button class="wijzig arij-k"${act("oefActieVoorstel")}>Laat de app een actie voorstellen</button>` : ""}</div>
          ${this.oefInvoer("actie", isV && A.phV ? A.phV : A.ph, "Jouw " + naam, a.actie)}
          <div class="otitel" id="oef-tp-lab">Ter plaatse</div>
          <div class="kvlakken" role="group" aria-labelledby="oef-tp-lab">${keus("terPlaatse", "niets", "Niets gedaan")}${keus("terPlaatse", "maatregel", "Maatregel genomen", A.maatregel)}${keus("terPlaatse", "gecorrigeerd", "Direct gecorrigeerd")}</div>
          <div id="oef-prio-blok"${prioUit ? " hidden" : ""}><div class="otitel" id="oef-prio-lab">Hoe dringend vind jij het?</div>
          <div class="kvlakken" role="group" aria-labelledby="oef-prio-lab">${keus("prio", "direct", "Direct", "meteen")}${keus("prio", "kort", "Kort", "±2 weken")}${keus("prio", "planmatig", "Planmatig", "±8 weken")}</div></div>
          <div class="kvuitleg oef-wie" id="oef-wie" aria-live="polite">${esc(wie)}</div>
        </div>
        <button class="btn primary oef-verder" id="oef-vastleg"${act("oefVastleggen")}>${svg("check", 20)} ${isV ? "Verbetervoorstel" : "Actievoorstel"} vastleggen (oefening)</button>`;
    },
    // --- stap: afsluiten met wat goed gaat ---
    oef_positief(sc, a, fb) {
      const P = sc.positief;
      if (fb) {
        const t = String(a.positief || "").toLowerCase(), concreet = P.woorden.some((x) => t.includes(x));
        return `<div class="q oef-kaart">${this.oefJij("“" + esc(String(a.positief || "").trim()) + "”")}</div>` +
          this.oefFb(concreet ? "Mooi benoemd" : "Maak het concreet",
            concreet ? "Je zei concreet wát er goed gaat. Dan weet de ploeg wat ze moet vasthouden."
              : "Een algemeen ‘goed bezig’ is aardig, maar zeg ook wát er goed gaat. Dan weet de ploeg wat ze moet vasthouden.",
            this.oefRegels(sc, "positief"), "", concreet ? null : this.oefKnoppenOpnieuw("Maak het concreter", "oefAanpassen", true), !concreet);
      }
      return `<div class="q oef-kaart"><p class="oef-vraag">${esc(a.oordeel === "A" ? P.vraagA : a.oordeel === "V" ? P.vraagV : P.vraag)}</p>
        <div class="arij"><span id="oef-poskop" class="oef-arijkop"><span class="arij-t">Jouw woorden</span></span><button class="wijzig arij-k"${act("oefPositiefVoorstel")}>Geef een voorbeeld</button></div>
        ${this.oefInvoer("positief", P.ph, "Wat zeg je?", a.positief)}
        <button class="btn primary oef-verder" data-oef-need="positief"${act("oefFeedback")}>Volgende</button></div>`;
    },
    // --- samenvatting: alleen wat je echt deed, en rustig waar je afweek van wat de TRA aangeeft ---
    // geen vinkjes: de methoderegels zijn wat je meeneemt, geen afvinklijst van wat je "gedaan" hebt.
    // A waar de TRA zegt dat het in orde is: die oefenaar kreeg op het oordeelscherm één rustige hint en bleef bewust
    // bij zijn oordeel; dat wordt hier niet nog eens als afwijking aangestreept (het oordeel is van de inspecteur).
    // elk punt: { soort: "tra" (oordeel of TRA-stap wijkt af van wat de TRA aangeeft) | "concreet" | "zag" | "aanname", t }.
    // Alleen "tra" telt als afwijking van de TRA; de tekst van een voorstel, ‘Ter plaatse’ of een aanname zijn andere punten.
    oefVerschillen(sc, a) {
      const uit = [], x = a.oordeel;
      if (x && !past(sc, x) && !(x === "A" && past(sc, "C"))) uit.push({ soort: "tra", t: "jij koos " + x + "; volgens de TRA " + sc.traTekst, kort: "je oordeel" });
      if (a.regel && sc.koppel.goed.length && !sc.koppel.goed.includes(a.regel)) {
        const g = sc.koppel.opties.find((o) => o[0] === sc.koppel.goed[0]);
        uit.push({ soort: "tra", t: "TRA-stap: hier past " + (g ? g[1] : sc.koppel.goed[0]) + " het best", kort: "de TRA-stap" });
      }
      const corr = a.actieKlaar && isAV(x) ? this.oefActieCheck(sc, a) : [];
      corr.forEach((c) => { if (!uit.some((u) => u.t === c.kort)) uit.push({ soort: c.soort, t: c.kort }); });
      if (sc.stappen.includes("zie") && a.zie && aannames(a.zie).length) uit.push({ soort: "aanname", t: "in je waarneming stond een aanname" });
      return uit;
    },
    oefSamenvatting() {
      const o = this.oefState();
      const regel = (r) => `<li><span class="oef-bol" aria-hidden="true"></span><span><b>${esc(REGEL[r][0])}</b><span class="oef-s">${esc(REGEL[r][1])}</span></span></li>`;
      const verschil = SC.map((sc, i) => this.oefVerschillen(sc, o.a[i] || {}));
      const anders = verschil.some((v) => v.length);
      // de inleiding zegt precies wat er afweek: alleen een oordeel of TRA-stap is "afwijken van de TRA"; een punt over
      // de tekst, ‘Ter plaatse’ of een aanname wordt letterlijk genoemd (met de scène), nooit als TRA-afwijking
      const tra = [], overig = [];
      verschil.forEach((v, i) => v.forEach((x) => (x.soort === "tra" ? tra : overig).push({ x, sc: SC[i] })));
      // rustig en kort: de punten zelf staan per scène hieronder; de inleiding telt ze en noemt de scènes (alleen één
      // los punt staat er letterlijk in). Nooit "week je af van de TRA" voor iets anders dan het oordeel of de TRA-stap.
      const KEUZES = ["", "één keuze", "twee keuzes", "drie keuzes", "vier keuzes", "vijf keuzes", "zes keuzes"];
      const PUNT = ["", "één punt", "twee punten", "drie punten", "vier punten", "vijf punten", "zes punten", "zeven punten", "acht punten", "negen punten"];
      const opsom = (arr) => (arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " en " + arr[arr.length - 1]);
      const scenesVan = (l) => opsom([...new Set(l.map((y) => "‘" + y.sc.titel + "’"))]);
      const traZin = tra.length ? "Bij " + (KEUZES[tra.length] || tra.length + " keuzes") + " week je af van wat de TRA aangeeft (" + opsom(tra.map((y) => y.x.kort + " bij ‘" + y.sc.titel + "’")) + ")." : "";
      const nPunt = PUNT[overig.length] || overig.length + " punten";
      const overigZin = !overig.length ? "" : !tra.length && overig.length === 1 ? "Nog één punt om naar te kijken (‘" + overig[0].sc.titel + "’): " + overig[0].x.t + "."
        : (tra.length ? " Daarnaast " + (overig.length === 1 ? "is er nog één punt" : "zijn er nog " + nPunt) : "Nog " + nPunt) + " om naar te kijken, bij " + scenesVan(overig) + ".";
      const inleiding = anders ? traZin + overigZin + " Hieronder zie je per scène wat er was." : "Hieronder zie je per scène wat je deed.";
      const scRij = (sc, i) => { const a = o.a[i] || {}, x = a.oordeel;
        const keuzes = Object.keys(sc.keuzes || {}).map((st) => keuzeGoed(sc, a, st) ? sc.keuzes[st].samen : "");
        const delen = keuzes.concat([a.zie ? "waarneming beschreven" : "", a.gekozenTaak ? "taak gevraagd en bevestigd" : "", a.regel ? "TRA-stap gekoppeld" : "",
          a.actieKlaar && isAV(x) ? (this.oefActieAfgerond(sc, a) ? "herstel gezien, actie afgerond"
            : voorstelNaam(sc, a) + " geschreven" + (a.terPlaatse === "gecorrigeerd" && this.oefActieNog(a) && !this.oefActieCheck(sc, a).length ? " (blijft open tot de toetser het heeft gezien)" : "")) : isAV(x) ? voorstelNaam(sc, a) + " nog niet vastgelegd" : "",
          a.positief ? "positief benoemd" : ""]);
        const tekst = delen.filter(Boolean).join(" · ") || "nog niet gedaan";
        const v = verschil[i].length ? `<div class="oef-anders"><span class="oef-anders-ic" aria-hidden="true">i</span><span>Kijk nog eens: ${esc(verschil[i].map((x) => x.t).join("; "))}.</span></div>` : "";
        return `<div class="row"><span class="grow"><span class="t">${esc(sc.titel)}</span><div class="s oef-s">${esc(tekst)}</div>${v}</span>
          ${x ? `<span class="badge b-${x === "NVT" ? "N" : x}">[${x}] ${OORDEEL[x][0]}</span>` : ""}</div>`; };
      return `${this.oefKop("De oefening zit erop", anders ? "Even terugkijken" : "Goed gedaan")}
        <div class="q oef-kaart"><p class="oef-p">Je hebt drie momentopnames geoefend. ${esc(inleiding)}</p></div>
        <div class="listcard oef-lijst">${SC.map(scRij).join("")}</div>
        <div class="q oef-kaart"><p class="oef-p">Dit neem je mee naar de echte inspectie:</p>
          <ul class="oef-regels">${["stop", "gesprek", "positief", "zien", "jij", "toetser", "afgerond", "qhse"].map(regel).join("")}</ul></div>
        <div class="oef-veilig">${svg("check", 18, 2.6)}<span>Niets van deze oefening is een echte inspectie, actie of melding geworden.</span></div>
        <button class="btn primary oef-hoofd"${act("oefKlaar")}>Klaar om echt te beginnen</button>
        <button class="linkknop"${act("oefOpnieuw")}>Nog een keer oefenen</button>`;
    },

    // ---- tip voor wie inspecteert en nog geen eigen inspecties heeft (rustig: geen tweede donkergroene knop) ----
    async oefTipNodig() {
      const inspecteert = typeof window.WPI.mag === "function" && window.WPI.mag("inspecteert", this.user);
      if (!this.user || !inspecteert) return false;
      const ls = leesLS(); if (ls.gedaan || ls.verborgen) return false;
      try { const alle = await DB.all(); return !alle.some((r) => r.inspecteur_id === this.user.id); } catch (e) { return false; }
    },
    oefTipHtml() {
      return `<div class="oef-hint"><span class="oef-hint-ic" aria-hidden="true">${svg("oefen", 22)}</span>
        <div class="grow"><div class="t">Nieuw als inspecteur?</div><div class="oef-s">Oefen de methode eerst op een verzonnen werkplek. ±5 minuten, het wordt geen echte inspectie.</div>
          <div class="oef-hint-knop"><button class="btn sm ghost oef-hint-start"${act("oefOpen")}>Oefenen</button><button class="oef-nietnu"${act("oefNietNu")}>Niet nu</button></div></div></div>`;
    },
  });

  // ---------------- zelfregistratie (omwikkelen, kern.js blijft ongewijzigd) ----------------
  const acct0 = App.openAccount;
  App.openAccount = function () {
    const r = acct0.apply(this, arguments);
    const lc = document.querySelector("#mod .listcard");
    if (lc && !lc.querySelector('[data-action="oefOpen"]')) {
      const rij = `<button class="row prefrow"${actSluit("oefOpen")}><span class="cirkel">${svg("oefen", 18)}</span><span class="grow"><span class="t">Oefenen</span><div class="s oef-s">Oefeninspectie op een verzonnen werkplek</div></span><span class="s">${svg("chev", 16)}</span></button>`;
      const na = lc.querySelector('[data-action="openWeergave"]');
      if (na) na.insertAdjacentHTML("afterend", rij); else lc.insertAdjacentHTML("afterbegin", rij);
    }
    return r;
  };
  const vandaag0 = App.view_vandaag;
  App.view_vandaag = function () {
    const r = vandaag0.apply(this, arguments);
    const plek = document.createElement("div"); plek.className = "oef-tipplek";
    const v = $("view"), voor = $("mijnact"); if (voor && voor.parentNode && v.contains(voor)) voor.parentNode.insertBefore(plek, voor); else v.appendChild(plek);   // vlak boven de acties (ook in de rechterkolom op een groot scherm)
    const tip = this.oefTipNodig().then((ja) => { if (ja && document.body.contains(plek)) plek.innerHTML = this.oefTipHtml(); });
    if (window.WPI.laad && window.WPI.laad.opstartHoud) window.WPI.laad.opstartHoud([tip]);   // bij het openen: de tip komt mee in de eerste opbouw
    return r;
  };
  const inspecties0 = App.view_inspecties;
  App.view_inspecties = async function () {
    const r = await inspecties0.apply(this, arguments);
    if (await this.oefTipNodig()) { const v = $("view"); if (this._page === "inspecties" && v && !v.querySelector(".oef-hint")) v.insertAdjacentHTML("beforeend", this.oefTipHtml()); }
    return r;
  };
  // gedeeld toestel: bij uitloggen de lopende oefening (met vrije tekst) van deze gebruiker wissen;
  // "gedaan" en "Niet nu" blijven, maar alleen voor deze gebruiker
  const logout0 = App.logout;
  App.logout = function () {
    clearTimeout(this._oefT);
    const id = uid();
    if (id) { const o = leesAlles(), g = o.gebruikers[id]; if (g) { delete g.voortgang; if (!Object.keys(g).length) delete o.gebruikers[id]; schrijfAlles(o); } }
    this._oef = null; this._oefVan = null;
    return logout0.apply(this, arguments);
  };
  const login0 = App.login;
  App.login = function () { clearTimeout(this._oefT); this._oef = null; this._oefVan = null; return login0.apply(this, arguments); };
})();
