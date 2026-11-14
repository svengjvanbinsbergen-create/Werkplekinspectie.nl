// Werkplekinspectie — tests/koppel.js: TRA-KOPPELING EN URGENTIE BIJ DIRECT GEVAAR (js/koppel.js + js/inspectie.js)
//
//  K1  Gevaarzinnen wegen zwaarder dan losse woorden: "monteur staat onder de hangende damwandplank, hijsband
//      rafelig" geeft DAM-2.03 (vallen van de last) als eerste, als STERKE match; DAM-2.08 (damwand verschuift
//      bij loskoppelen, matchte eerder op "onder" en "damwandplank") staat niet bovenaan.
//  K2  Werkwoorden van de bouwplaats naar de taak: "ze slaan de planken erin" → Plaatsen damwand,
//      "ze trekken de damwand eruit" → Verwijderen damwand.
//  K3  Tabel met realistische zinnen over de producten in data/kennisbank.json: de verwachte regel staat in de
//      top 3 van de TAAKREGELS (≥ 90% moet slagen; missers worden eerlijk getoond als "  mis   …", per set).
//      De taak uit de werkzin is de EERSTE taakchip (≥ 90%). Geen enkele foute STERKE match (een sterke match
//      bevestigt de inspecteur met één tik, dus die moet kloppen).
//  K3b Afkeuring ronde 2: "geen hangslot op de hoofdschakelaar … elektricien" → SCV-1.02 (LOTOTO), niet SCV-1.01;
//      een functienaam (elektricien) is geen gevaarwoord. Taakchips: plaatsen/inbouwen nooit eerst "Demonteren"/
//      "Inbedrijfstelling"; "laten zakken", "klemmen aan", "spanningsloos", "d'r uit" worden herkend.
//      Spreektaal voor de hangende last ("hangen aan een verroeste ketting", "pal onder … aan de haak") is een
//      gevaarzin. Direct gevaar ook voor de draaiende vijzel (gevarenzone, ongewenst draaien).
//  K4  Scherm: altijd drie regels van de TAAK (een algemeen onderwerp alleen apart, als .kalg), elk met de VOLLEDIGE
//      risicozin (niet afgekapt), aanraakdoelen ≥ 56 px. C/A/V staan op 390×844 boven de vouw (sterke match, ook
//      in de veldmodus en bij de langste risicozin; zwakke match: na de tik op de regel op de oordeelstap).
//      Sterke match: één tik op C/A/V bevestigt de regel (de kop noemt hem). Zwakke match (één woord):
//      label "Zwakke match", C/A/V staat uit tot de inspecteur de regel zelf aantikt; de AI/trefwoorden
//      oordelen nooit en er is niets voorgekozen.
//  K5  Direct gevaar: A op DAM-2.03 ("staat onder de hangende last") → actievoorstel met prioriteit Direct (als
//      Voorstel, aan te passen) en eerst de vraag "Wat heb je ter plaatse gedaan?" (Werk stilgelegd / Direct
//      verholpen / Maatregel genomen / Nog niets), niets voorgekozen. Vastleggen zonder antwoord kan NIET ("Nog
//      niets" alleen als eigen keuze). Ook BUV-5.03 (persoon in de gevarenzone van de draaiende vijzel) is direct gevaar. Een gewoon risico (fysieke belasting)
//      houdt Kort/Niets gedaan. "Werk stilgelegd" blijft een open actie (Voorstel), "Direct verholpen" volgt de
//      bestaande regel (afgerond, inspecteur is toetser).
//
//  K6  Afkeuring ronde 3 (scherm): SCV "hijsband … hangt over een scherpe rand" → SCV-2.03, niet SCV-2.01 (een hijsband
//      over een rand is geen persoon over de putrand); twee gevaren in één zin → zwakke match. Gescheiden werkwoorden
//      voor de taakchip ("draaien … proef", "zetten … aan", "veilig zetten", "onder stroom zetten"). TRF "gozer staat
//      onder de trommel die aan de kraan bungelt" → TRF-2.04 sterk, Direct. IDV-4.08, KET-2.04, DBL-4.02 zijn direct
//      gevaar. BBL "in de goot bij de rotor als ze hem aanzetten" → BBL-5.02; ROO "meetkastje staat te piepen" → ROO-2.08;
//      NBT "takel kraakt, strop half doorgesleten" → NBT-3.03 sterk.
//
//  K7  Afkeuring ronde 4: SHV "geen touw … draait helemaal rond aan de haak" → SHV-2.05 (zwaaiende last), geen foute
//      sterke match op vallen van de last; BAN "met z'n kop onder de bandscreen terwijl die omhoog gaat" → BAN-2.03 sterk;
//      NBT "zonder meter de tank in, ruikt raar" → NBT-1.01; LDX "dekplaat ligt eruit … achteruit richting het gat" →
//      LDX-2.01; SLI "ladder niet vastgezet" → SLI-2.10 (val van ladder) boven SLI-2.08; ‘Waarom’ zonder overlappende
//      stukken; een zwakke match wordt nooit stil bevestigd; twee gevaren met elk een eigen gevaarzin → nooit sterk.
//      Eisen op de hele tabel: regel in de top 3 ≥ 95%, als eerste ≥ 85%, 0 foute sterke matches (ook niet bij direct gevaar).
//  K8  Afkeuring ronde 5: MIC "trommel is niet geblokkeerd … arm tussen de spaken" → MIC-3.09 (onverwacht draaien) eerst,
//      nooit een sterke MIC-3.04; na de tik op de regel en A: Direct, ter plaatse leeg, eerst "Wat heb je ter plaatse gedaan?",
//      rode balk. ROO "rolsteiger … losse stelconplaten … wiebelt" → ROO-3.05; LDX "rooster … ligt ernaast … achteruit met
//      de stuurlijn" → LDX-3.01; BAN "motor bijdraait … tandwiel" → BAN-3.07; CPV "meet niks na, zegt dat ie dood is" →
//      CPV-1.03; MIC demontage "kan zo omdraaien" → MIC-2.09. Vangnet: is de eerste regel geen direct gevaar terwijl een
//      regel mét direct gevaar ook een gevaarzin heeft, of de zin zelf direct gevaar noemt, dan nooit sterk. Negatieve
//      zinnen ("alles netjes … gekeurd", gevaar zonder passende regel bij de taak) zijn nooit sterk. Ronde 5 eist ook
//      ≥ 20 eigen nieuwe zinnen over ≥ 15 producten (blind9 + blind10) en alle zinnen van de reviewer (kritiek5).
//
//  K9  Afkeuring ronde 6: ITV/SMV "op de vijzelbladen … boren … niet/niks geblokkeerd", ITV "boort in de stuwkant … vijzel
//      kan zo wegdraaien" → ITV-4.05/SMV-5.06 eerst, nooit een sterke stof-regel; NBT "opgekrikt … kruipt eronder zonder
//      bokken of stempels" → NBT-4.05 eerst, nooit een sterke NBT-4.01 (kraan); CHV "afscherming … op de grond … mouw vlak
//      naast" → CHV-6.02. Via het scherm: zwak = C/A/V uit en een oordeeltik legt niets vast; na de tik op de regel en A:
//      Direct, ter plaatse leeg, eerst "Wat heb je ter plaatse gedaan?", rode balk. De vier zwakkere zinnen van de reviewer
//      (NBT spatbril, SHV half uit de trog, IDV koppeling losmaakt, POM niveausturing) staan nu eerst; zijn negatieve zinnen
//      nooit sterk; DBL "in het bassin"/"het water in" → Tewaterlating. In de tabel: kritiek6 (alle 37 gelabelde zinnen van de
//      reviewer) en blind11 (24 eigen nieuwe zinnen, 21 producten; eerste meting staat bij de set). Een 7e kolom noemt een
//      regel die óók goed is.
//
//  Eerlijk over de cijfers: de sets "ronde 1", "kritiek", "vers", "blind", "blind2", "blind3", "kritiek3", "blind4" en
//  "blind5" zijn (na hun eerste meting) gebruikt om de woordenlijst bij te stellen; ze zeggen dus vooral dat er niets
//  terugvalt. Alleen "blind6" is nooit op afgestemd. Eerste metingen op zinnen die de woordenlijst nog niet kende:
//  blind3 top 3 10/12 · blind4 25/30 (1 foute sterke match) · blind5 29/30 (2 foute sterke matches) · blind6 14/16
//  (0 fout). Samen voor blind4-6: 68/76 = 89% in de top 3 en 3 foute sterke matches op 48 sterke (6%).
//  Ronde 4: de reviewer mat op 38 eigen zinnen 82% eerste / 92% top 3 en 1 foute sterke match op 27. Eerste meting op
//  blind7 (33 nieuwe zinnen, 21 producten, vóór het bijstellen): top 3 30/33 (91%), eerste 26/33 (79%), 2 foute sterke
//  matches op 23 (beide "draait/tolt rond aan de haak"). blind8 (22 zinnen ná het bijstellen, niet op afgestemd): 22/22
//  eerste, 0 fout; dat is een zachte toets (zelfde schrijver). Reken op nieuwe bouwplaatstaal dus eerder op ~80% eerste en
//  ~90% top 3: daarom blijft een zwakke match altijd een tik op de regel zelf.
//  Ronde 5: de reviewer mat op 30 eigen zinnen (19 producten) 93% top 3 / 80% eerste en 1 foute sterke match op 19, bij
//  direct gevaar. Eerste meting op blind9 (26 eigen zinnen, 21 producten, vóór het bijstellen): top 3 25/26 (96%), eerste
//  21/26 (81%), 17 sterk, 0 fout. blind10 (11 zinnen ná het bijstellen, gemeten vóór elke verdere aanpassing): top 3 10/11,
//  eerste 10/11, 9 sterk, 0 fout. Nieuw: een vangnet dat een sterke match blokkeert als de eerste regel geen direct gevaar
//  is terwijl er direct gevaar in het spel is. Reken op nieuwe bouwplaatstaal nog steeds op ~80-90% eerste.
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
  // ---- tweede ronde (na afkeuring door een kritische reviewer) ----
  // kritiek: de gevallen uit de afkeuring (taakzin van de reviewer, waarneming in dezelfde trant).
  // vers:   geschreven vóór het bijstellen van de woordenlijst. Eerste meting (eerlijk): regel in top 3 20/23, eerste
  //         19/23, taakchip eerste 19/23, 2 FOUTE STERKE matches (ITV beton → biologisch; LDX handen aan de last). Daarna
  //         bijgesteld; nu regressieset.
  // blind2: geschreven na die bijstelling. Eerste meting: top 3 21/21, eerste 19/21, taakchip 19/21, 1 foute sterke
  //         match (SHV "glijdt weg uit de trog" → vallen van de last). Daarna bijgesteld; nu regressieset.
  // blind3: geschreven ná de bijstellingen van ronde 2 (eerste meting: top 3 10/12, taakchip 12/12, 0 foute sterke
  //         matches; beide missers waren zwakke matches). In ronde 3 zijn die twee woordgaten gedicht; nu regressieset.
  ["SCV", "ze schakelen de vijzel af", "Afschakelprotocol", "kast staat open, geen hangslot op de hoofdschakelaar en de elektricien zit al te sleutelen", "SCV-1.02", "kritiek"],
  ["BUV", "de buisvijzel wordt erin gehesen", "Monteren (Buisvijzel", "de vijzel draait aan de kraan rond en niemand heeft een stuurlijn vast", "BUV-3.05", "kritiek"],
  ["SCV", "ze bouwen de vijzelunit in", "Monteren (Vijzelunit", "jongen staat zonder harnas op de rand van de put", "SCV-3.01", "kritiek"],
  ["POM", "ze hangen de nieuwe pomp erin", "Montage van de Pomp", "pomp stoot tegen de putwand tijdens het zakken", "POM-3.05", "kritiek"],
  ["SMV", "ze laten de vijzel in de stortmal zakken", "Monteren stortmal", "hij staat met z'n handen tussen de trog en de vijzel", "SMV-2.01", "kritiek"],
  ["CPV", "ze klemmen de motor aan", "Inschakelen", "kabel ligt open en bloot met blanke draden", "CPV-4.01", "kritiek"],
  ["SCV", "ze zetten hem spanningsloos bij de kast", "Afschakelprotocol", "ze meten niet of hij echt spanningsvrij is", "SCV-1.03", "kritiek"],
  ["POM", "pomp gaat d'r uit", "Demontage van de pomp", "ze hangen die pomp aan een verroeste ketting zonder keuringslabel", "POM-2.02", "kritiek"],
  ["BEL", "ze halen de oude beluchter eruit", "Demonteren bestaande", "gast loopt pal onder dat ding door terwijl ie aan de haak hangt", "BEL-2.03", "kritiek"],
  ["BUV", "ze laten de vijzel proefdraaien", "Inbedrijfstelling", "er staat nog een monteur in de put als ze de vijzel laten lopen", "BUV-5.03", "kritiek"],
  ["BUV", "ze takelen de vijzelunit eruit", "Demonteren (Aandrijving", "man onder zwevende last", "BUV-2.03", "kritiek"],
  ["CPV", "ze halen de compactvijzel eruit", "Demonteren (compactvijzel", "hij leunt over de putrand zonder lijn", "CPV-2.01", "kritiek"],
  ["SMV", "ze laten de vijzel in de stortmal zakken", "Monteren stortmal", "monteur zit onderin de vijzelput en er is geen gasmeting gedaan", "SMV-2.05", "kritiek"],
  ["BEL", "ze monteren de nieuwe beluchter", "Monteren nieuwe", "het luik in het dek staat open en er staat geen hek omheen", "BEL-3.05", "vers"],
  ["BEL", "ze slopen de oude beluchter eruit", "Demonteren bestaande", "hij staat al een uur met de slagmoersleutel zonder oordoppen", "BEL-2.01", "vers"],
  ["BUV", "ze trekken de vijzel uit de buis", "Demonteren (Aandrijving", "onderin de put stinkt het en niemand heeft een gasmeter bij zich", "BUV-2.07", "vers"],
  ["BUV", "ze schuiven de nieuwe vijzel de buis in", "Monteren (Buisvijzel", "de vijzel glijdt bijna uit de buis bij het invoeren", "BUV-3.10", "vers"],
  ["CPV", "de compactvijzel gaat erin", "Monteren (Compactvijzel", "iemand staat op de vijzel en de aandrijving is niet geblokkeerd", "CPV-3.06", "vers"],
  ["CPV", "ze zetten de spanning erop", "Inschakelen", "de deur van de schakelkast staat open en er hangen losse draden", "CPV-4.01", "vers"],
  ["ITV", "ze hijsen de trog met de vijzel erin", "Monteren instorttrog", "de trog hangt scheef aan de kraan, één strop zit los", "ITV-2.02", "vers"],
  ["ITV", "ze storten de trog in", "Betonwerkzaamheden", "hij werkt met zijn blote handen in de betonspecie", "ITV-3.02", "vers"],
  ["ITV", "ze maken de vijzelafdekking dicht", "Afmonteren", "er staat iemand op de vijzel terwijl die niet vastgezet is", "ITV-4.05", "vers"],
  ["SMV", "ze storten de stortmal vol", "Betonwerkzaamheden", "monteur tilt de trilnaald de hele dag in zijn eentje met een kromme rug", "SMV-3.01", "vers"],
  ["SCV", "ze halen de aandrijving en de vijzelunit eruit", "Demonteren (Aandrijving", "de bouten zijn los maar de vijzel is nergens mee geborgd", "SCV-2.08", "vers"],
  ["SCV", "ze laten de vijzel voor het eerst draaien", "Inbedrijfstelling", "de afscherming zit er nog niet op en hij staat er met zijn handen bij", "SCV-5.02", "vers"],
  ["SHV", "ze takelen de hydrovijzel eruit", "Demonteren Semi", "de vijzel slingert heen en weer aan de kraan door de wind", "SHV-2.05", "vers"],
  ["SHV", "ze zetten de nieuwe hydrovijzel in de trog", "Monteren Semi", "ze boren de ankers zonder stofkap en zonder mondkapje", "SHV-3.10", "vers"],
  ["SHV", "ze storten beton onder de trog", "Betonwerkzaamheden", "jongen zit onder in de put zonder gasmeter en zonder mangatwacht", "SHV-4.04", "vers"],
  ["POM", "ze schakelen de pompen uit", "Afschakelprotocol", "de vlotter staat nog op automatisch, pomp kan zo aanslaan", "POM-1.01", "vers"],
  ["POM", "ze testen de nieuwe pomp", "Inbedrijfstelling", "de pomp slaat ineens aan terwijl hij nog aan de leiding zit", "POM-5.03", "vers"],
  ["BBL", "ze bouwen de borstelbeluchter af", "Demonteren aandrijving", "ze lopen over het natte dek naast een open gat zonder hekwerk", "BBL-2.01", "vers"],
  ["BBL", "ze laten de borstelbeluchter draaien", "Inbedrijfstelling", "hij grijpt bij de draaiende borstel om een lap weg te halen", "BBL-5.02", "vers"],
  ["LDX", "ze hijsen de flowbooster eruit", "Demonteren aandrijving", "monteur duwt de flowbooster met zijn handen weg terwijl hij aan de kraan hangt", "LDX-2.05", "vers"],
  ["MIC", "ze nemen het microfilter weg", "Demonteren Microfilter", "trommel draait vanzelf door als ze de laatste bout eruit halen", "MIC-2.09", "vers"],
  ["MIC", "ze hijsen het nieuwe microfilter in de put", "Monteren Microfilter", "het filter tikt tegen de putwand bij het laten zakken", "MIC-3.07", "vers"],
  ["KET", "ze schakelen de kettingreiniger af", "Afschakelprotocol", "er zit geen slot op de werkschakelaar en het label ontbreekt", "KET-1.03", "vers"],
  ["BAN", "ze trekken de oude bandscreen eruit", "Demonteren bestaande bandscreen", "ze tillen met z'n tweeën een zeefpaneel van 40 kilo uit het kanaal", "BAN-2.02", "blind2"],
  ["BAN", "ze zetten de spanning op de bandscreen", "Inschakelen", "de kabel naar de motor is half doorgesneden en ligt in het water", "BAN-4.01", "blind2"],
  ["BUV", "ze hangen de tandwielkast eraan", "Monteren (Buisvijzel", "hij staat met zijn vingers tussen de flens en de tandwielkast", "BUV-3.04", "blind2"],
  ["BUV", "ze gaan de vijzel spanningsvrij maken", "Afschakelprotocol", "hoofdschakelaar staat uit maar er hangt geen slot of kaartje aan", "BUV-1.02", "blind2"],
  ["CHV", "ze takelen de hydrovijzel d'r uit", "Demonteren van de Compact", "de strop is gerafeld en zit om een scherpe rand", "CHV-2.03", "blind2"],
  ["CHV", "ze storten de vijzel in", "Betonwerkzaamheden", "monteur staat zonder laarzen en handschoenen in de cement", "CHV-4.02", "blind2"],
  ["CPV", "ze halen de compactvijzel eruit", "Demonteren (compactvijzel", "de man onderin de put staat precies onder de vijzel die aan de kraan hangt", "CPV-2.03", "blind2"],
  ["DAM", "ze heien de planken erin", "Plaatsen damwand", "de damwand draait rond aan de kraan, geen touw eraan", "DAM-3.05", "blind2"],
  ["IDV", "ze draaien de vijzel er weer in", "Indraaireductor monteren", "jongen staat in de put terwijl ze de vijzel indraaien", "IDV-4.04", "blind2"],
  ["ITV", "ze hijsen de instorttrog in de put", "Monteren instorttrog", "hij loopt over de natte bekisting terwijl hij de trog bijstuurt met zijn hand", "ITV-2.06", "blind2"],
  ["LDX", "ze zetten het stromingsprofiel in het lege bassin", "Monteren stromingsprofiel", "geen leuning langs de bassinrand en hij werkt vlak bij de kant", "LDX-4.01", "blind2"],
  ["MIC", "ze zetten het microfilter erin", "Monteren Microfilter", "ze slijpen de bouten af zonder bril en stofmasker", "MIC-3.10", "blind2"],
  ["NBT", "ze tillen de brug op om de lagers te wisselen", "Verwijderen ruimerbrug", "de brug hangt op de vijzels zonder stempels eronder en hij ligt eronder", "NBT-4.05", "blind2"],
  ["POM", "de pomp gaat eruit", "Demontage van de pomp", "hij staat in de pompput zonder gasmeter, het ruikt naar rotte eieren", "POM-2.05", "blind2"],
  ["POM", "ze zetten de pomp weer aan", "Inschakelen", "de aansluitkast is open en er steken blanke aders uit", "POM-4.01", "blind2"],
  ["ROO", "ze slopen de roosterreiniger", "Demontage Roosterreiniger", "hij werkt op de bovenste trede van de ladder zonder dat iemand hem vasthoudt", "ROO-2.02", "blind2"],
  ["SCV", "ze laten de vijzel eruit zakken", "Demonteren (Aandrijving", "ze lopen met de vijzel aan de haak boven de put en niemand houdt afstand", "SCV-2.03", "blind2"],
  ["SHV", "ze hangen de nieuwe vijzel in de trog", "Monteren Semi", "de vijzel glijdt weg uit de trog als ze de strop vieren", "SHV-3.09", "blind2"],
  ["SLI", "ze demonteren de slibindikker", "Demonteren (slibindikker", "zijn handen zitten onder het lager als ze het laten zakken", "SLI-2.04", "blind2"],
  ["SMV", "ze halen de vijzel uit de trog", "Demonteren (vijzel uit trog", "hij staat met zijn hand tussen de vijzel en de trogrand als ze hem optillen", "SMV-4.03", "blind2"],
  ["TRF", "ze laten het trommelfilter voor het eerst draaien", "Inbedrijfstelling", "hij reikt met zijn arm naar binnen terwijl de trommel draait", "TRF-5.03", "blind2"],
  ["BUV", "ze maken de buisvijzel los van de tandwielkast", "Demonteren (Aandrijving", "de vijzel hangt nog half aan de bouten en niemand heeft hem gezekerd", "BUV-2.08", "blind3"],
  ["CPV", "ze zetten de compactvijzel in de put", "Monteren (Compactvijzel", "ze boren gaten in de putwand en er hangt een wolk stof", "CPV-3.10", "blind3"],
  ["ITV", "ze hijsen de combinatie de put in", "Monteren instorttrog", "de last hangt boven de put en twee man staan er recht onder", "ITV-2.02", "blind3"],
  ["SMV", "ze takelen de vijzel uit de trog", "Demonteren (vijzel uit trog", "hij loopt achteruit over een glibberige rand terwijl hij de vijzel stuurt", "SMV-4.02", "blind3"],
  ["SCV", "ze sluiten de motor aan", "Inschakelen", "de kabels hangen er nog bloot bij en ze zetten er spanning op", "SCV-4.01", "blind3"],
  ["SHV", "ze storten de trog in", "Betonwerkzaamheden", "cement zit op zijn onderarmen en hij heeft geen handschoenen aan", "SHV-4.02", "blind3"],
  ["POM", "ze draaien de pomp voor het eerst proef", "Inbedrijfstelling", "de pomp start vanzelf door de vlotter terwijl er nog iemand in de put staat", "POM-5.04", "blind3"],
  ["BEL", "ze monteren de nieuwe beluchter", "Monteren nieuwe", "hij slijpt een flens zonder stofmasker", "BEL-3.01", "blind3"],
  ["BBL", "ze halen de tandwielkast eraf", "Demonteren aandrijving", "hij draagt de tandwielkast in zijn eentje over het dek", "BBL-2.03", "blind3"],
  ["MIC", "ze laten het microfilter draaien", "Inbedrijfstelling", "er zit nog een hand in de trommel als ze hem aanzetten", "MIC-5.03", "blind3"],
  ["KET", "ze halen de kettingreiniger eruit", "Demonteren kettingreiniger", "kettingdelen hangen aan een strop zonder sluiting op de haak", "KET-2.03", "blind3"],
  ["NBT", "ze halen de schraperarmen eruit", "Demonteren onderwaterwerk", "hij staat in de tank onder de schraperarm die aan de kraan hangt", "NBT-3.03", "blind3"],
  // ---- derde ronde (na afkeuring 3) ----
  // kritiek3: de gevallen uit afkeuring 3 (taakzin en waarneming van de reviewer, of in dezelfde trant). Op bijgesteld; regressie.
  ["SCV", "ze takelen de vijzel uit de put", "Demonteren", "de hijsband is niet gekeurd en hangt over een scherpe rand", "SCV-2.03", "kritiek3"],
  ["MIC", "ze draaien het microfilter proef", "Inbedrijfstelling", "hij grijpt in de draaiende trommel om een doek eruit te trekken", "MIC-5.03", "kritiek3"],
  ["BAN", "ze zetten het bandfilter weer onder stroom", "Inschakelen", "de klemmenkast staat open en er steken blanke draden uit", "BAN-4.01", "kritiek3"],
  ["SLI", "ze zetten de slibindikker veilig", "Afschakelprotocol", "er hangt geen slot op de werkschakelaar", "SLI-1.02", "kritiek3"],
  ["CPV", "ze zetten de compactvijzel aan", "Inschakelen", "de kabel in de kast ligt open en bloot", "CPV-4.01", "kritiek3"],
  ["TRF", "ze takelen de trommel d'r uit", "Demonteren", "gozer staat onder de trommel die aan de kraan bungelt", "TRF-2.04", "kritiek3"],
  ["IDV", "ze draaien de vijzel er weer in", "Indraaireductor", "de vijzel is niet vergrendeld en hij kruipt eronder om de bout te pakken", "IDV-4.08", "kritiek3"],
  ["BBL", "ze gaan de borstelbeluchter testdraaien", "Inbedrijfstelling", "collega staat nog in de goot bij de rotor als ze hem aanzetten", "BBL-5.02", "kritiek3"],
  ["CPV", "ze draaien de compactvijzel voor het eerst", "Inbedrijfstelling", "er wordt aangezet terwijl de kap er nog af is en iemand er met z'n poten bovenop staat", "CPV-5.03", "kritiek3"],
  ["ROO", "ze demonteren de roosterreiniger", "Demontage", "hij zit beneden in het kanaal en zijn meetkastje staat te piepen", "ROO-2.08", "kritiek3"],
  ["NBT", "ze halen de schraperarmen eruit", "Demonteren onderwaterwerk", "de kettingtakel kraakt en de strop is half doorgesleten, onderdeel hangt boven zijn kop", "NBT-3.03", "kritiek3"],
  ["KET", "ze halen de kettingreiniger eruit", "Demonteren kettingreiniger", "de ketting zit nog op spanning en hij staat er pal voor", "KET-2.04", "kritiek3"],
  ["DBL", "ze leggen de beluchter te water", "Tewaterlating", "hij staat op het drijvende platform zonder reddingsvest, het water is ruw", "DBL-4.02", "kritiek3"],
  // blind4: geschreven vóór het bijstellen in ronde 3. Eerste meting (eerlijk): regel in top 3 25/30, eerste 23/30,
  //         taakchip eerste 25/30, 15 sterk waarvan 1 FOUT (TRF “draait en zwiept rond aan de kraan” → onverwacht draaien).
  //         Daarna bijgesteld; nu regressieset.
  ["KET", "ze trekken de kettingreiniger uit het bassin", "Demonteren kettingreiniger", "de veer van de kettingspanner staat nog strak en hij zit er met zijn hoofd vlak voor", "KET-2.04", "blind4"],
  ["KET", "ze bouwen de nieuwe kettingreiniger in", "Monteren kettingreiniger", "die jongen staat op de rand van het bassin zonder lijn, nat en glad", "KET-3.01", "blind4"],
  ["LDX", "ze takelen de flowbooster omhoog", "Demonteren aandrijving", "hij staat recht onder de flowbooster terwijl die omhoog gaat", "LDX-2.02", "blind4"],
  ["LDX", "ze hangen de nieuwe flowbooster op z'n plek", "Monteren flowbooster", "zijn vingers zitten klem tussen de flowbooster en de steun", "LDX-3.04", "blind4"],
  ["BEL", "beluchter gaat eruit", "Demonteren bestaande", "het dekluik staat open en hij loopt er achteruit naartoe", "BEL-2.05", "blind4"],
  ["BEL", "ze zetten de nieuwe beluchter erop", "Monteren nieuwe", "boren in het beton, hele wolk stof en geen masker", "BEL-3.01", "blind4"],
  ["DBL", "ze gaan het platform op om de ankers vast te maken", "Tewaterlating", "geen zwemvest aan, het platform wiebelt flink", "DBL-4.02", "blind4"],
  ["DBL", "ze halen de drijvende beluchter uit het water", "Demonteren bestaande drijvende", "hand tussen de ankerketting en de beugel bij het losmaken", "DBL-2.02", "blind4"],
  ["BAN", "ze slopen de oude bandscreen", "Demonteren bestaande bandscreen", "hij staat op de rand van het kanaal zonder harnas", "BAN-2.04", "blind4"],
  ["BAN", "ze proefdraaien de bandscreen", "Inbedrijfstelling", "hij zit met zijn hand bij de lopende ketting om een paneel recht te duwen", "BAN-5.02", "blind4"],
  ["SHV", "ze takelen de hydrovijzel eruit", "Demonteren Semi", "die vijzel schiet bijna uit de trog bij het optrekken", "SHV-2.09", "blind4"],
  ["SHV", "ze storten de trog vol", "Betonwerkzaamheden", "hij staat de hele middag krom met de trilnaald", "SHV-4.01", "blind4"],
  ["TRF", "ze hijsen het trommelfilter de put in", "Monteren van trommelfilter", "het trommelfilter draait en zwiept rond aan de kraan, geen lijnen eraan", "TRF-3.06", "blind4"],
  ["POM", "ze hijsen de pomp uit de put", "Demontage", "de sluiting van de haak is kapot, de strop kan er zo afglippen", "POM-2.02", "blind4"],
  ["POM", "ze schakelen de pompen af in de kast", "Afschakelprotocol", "ze beginnen al te sleutelen zonder te checken of er nog spanning op staat", "POM-1.04", "blind4"],
  ["CHV", "ze storten beton rond de hydrovijzel", "Betonwerkzaamheden", "de put is diep en niemand meet het gas voor hij erin gaat", "CHV-4.04", "blind4"],
  ["SCV", "ze bouwen de vijzelunit in", "Monteren", "de vijzel klapt tegen de putwand bij het laten zakken", "SCV-3.07", "blind4"],
  ["IDV", "ze halen de vijzelafdekking eraf", "Demonteren (vijzelafdekking", "hij hangt half over de leuning boven de vijzelput", "IDV-2.01", "blind4"],
  ["ITV", "ze lijnen de trog uit in de put", "Monteren instorttrog", "hij staat met zijn voet onder de trog als ze die laten zakken", "ITV-2.01", "blind4"],
  ["SMV", "ze hijsen de vijzel uit de stortmal", "Demonteren (vijzel uit trog", "de strop zit om een scherpe hoek van de trog zonder bescherming", "SMV-4.01", "blind4"],
  ["NBT", "ze plaatsen de nieuwe ruimerbrug", "Plaatsen nieuwe ruimerbrug", "hij staat op de brug aan de buitenkant zonder hekje of lijn", "NBT-5.06", "blind4"],
  ["ROO", "ze monteren de roosterreiniger", "Montage", "hij staat in de hoogwerker en die staat scheef op de stoeprand", "ROO-3.05", "blind4"],
  ["CPV", "ze laten de compactvijzel voor het eerst draaien", "Inbedrijfstelling", "de kap zit er niet op en hij steekt zijn arm erin", "CPV-5.02", "blind4"],
  ["MIC", "ze schakelen het microfilter af", "Afschakelprotocol", "er hangt geen slot aan de schakelaar, iedereen kan hem aanzetten", "MIC-1.02", "blind4"],
  ["BBL", "ze halen de borstelbeluchter eraf", "Demonteren aandrijving", "de borstelbeluchter bungelt aan de kraan en hij staat eronder", "BBL-2.02", "blind4"],
  ["SLI", "ze zetten de slibindikker in elkaar", "Monteren (bovenlager", "hij staat met zijn vingers tussen het lager en de flens", "SLI-3.04", "blind4"],
  ["DAM", "ze trekken de planken eruit", "Verwijderen damwand", "die plank gaat heen en weer aan de kraan en hij pakt hem met zijn handen", "DAM-2.05", "blind4"],
  ["BUV", "ze zetten de buisvijzel weer aan", "Inschakelen", "kabels liggen bloot in de kast als ze de spanning erop zetten", "BUV-4.01", "blind4"],
  ["KET", "ze zetten de kettingreiniger aan voor de test", "Inbedrijfstelling", "hij staat nog met zijn hand aan de ketting als die gaat lopen", "KET-5.02", "blind4"],
  ["TRF", "ze schakelen de trommel af", "Afschakelprotocol", "de vlotter staat nog op automaat, kan zomaar aanslaan", "TRF-1.02", "blind4"],
  // blind5: geschreven ná het bijstellen van ronde 3. Eerste meting (eerlijk): top 3 29/30, eerste 25/30, taakchip
  //         28/30, 24 sterk waarvan 2 FOUT (SCV “glipt bijna uit de trog” → vallen van de last i.p.v. uit de trog glijden;
  //         MIC “trekken de trommel met de hand rond … aandrijving nog aangesloten” → begeleiden i.p.v. onverwacht draaien).
  //         Die twee woordgaten zijn daarna gedicht; nu regressieset.
  ["DAM", "ze trekken de damwand met de kraan omhoog", "Verwijderen damwand", "bovenop de damwand staat een man zonder harnas om de haak los te maken", "DAM-2.01", "blind5"],
  ["POM", "pomp moet eruit, ze hangen hem aan de kraan", "Demontage", "de jongen kijkt recht onder de pomp in de put terwijl die omhoog komt", "POM-2.02", "blind5"],
  ["POM", "ze gaan de pomp proefdraaien", "Inbedrijfstelling", "hij hangt met zijn arm in de put bij de waaier terwijl ze hem starten", "POM-5.02", "blind5"],
  ["BUV", "de buisvijzel wordt eruit getakeld", "Demonteren (Aandrijving", "de takelketting is roestig en er hangt geen keuringsplaatje aan", "BUV-2.03", "blind5"],
  ["BUV", "ze sluiten de motor van de buisvijzel aan", "Inschakelen", "de elektricien werkt aan de klemmen terwijl er nog spanning op staat", "BUV-4.01", "blind5"],
  ["CHV", "ze trekken de hydrovijzel eruit", "Demonteren van de Compact", "die vijzel tikt steeds tegen de wand van de put bij het omhoog halen", "CHV-2.08", "blind5"],
  ["CHV", "ze storten de vijzel in", "Betonwerkzaamheden", "zijn broek en handen zitten onder de cementspecie", "CHV-4.02", "blind5"],
  ["IDV", "ze draaien de vijzel er weer in", "Indraaireductor", "de V-snaar loopt zonder kap en hij zit er met zijn vingers vlakbij", "IDV-4.05", "blind5"],
  ["IDV", "ze halen het bovenlager eraf", "Demonteren (vijzelafdekking", "het lager hangt in een strop met een knoop erin", "IDV-2.03", "blind5"],
  ["ITV", "ze storten de instorttrog in", "Betonwerkzaamheden", "hij staat diep in de put zonder dat er gemeten is", "ITV-3.04", "blind5"],
  ["KET", "ze halen de oude ketting eruit", "Demonteren kettingreiniger", "hij draait de spanner los terwijl de ketting nog strak staat", "KET-2.04", "blind5"],
  ["LDX", "ze leggen het stromingsprofiel in het lege bassin", "Monteren stromingsprofiel", "hij klimt via een losse ladder naar beneden zonder dat iemand die vasthoudt", "LDX-4.01", "blind5"],
  ["MIC", "het microfilter gaat eruit", "Demonteren Microfilter", "het filter is losgemaakt maar hangt nog niet aan de kraan, kan zo omvallen", "MIC-2.08", "blind5"],
  ["NBT", "ze tillen de ruimerbrug eraf", "Verwijderen ruimerbrug", "de brug hangt aan twee stroppen en er lopen mensen onderdoor", "NBT-4.08", "blind5"],
  ["NBT", "ze lassen de flenzen aan de afvoerbuis", "Monteren onderwaterwerk", "geen afzuiging, hij staat met zijn hoofd in de rook", "NBT-6.10", "blind5"],
  ["ROO", "de roosterreiniger wordt uit elkaar gehaald", "Demontage", "hij staat op het rooster boven het kanaal en er zit geen hek", "ROO-2.02", "blind5"],
  ["SCV", "ze zetten de vijzelunit in de put", "Monteren (Vijzelunit", "de vijzel glipt bijna uit de trog bij het neerlaten", "SCV-3.10", "blind5"],
  ["SCV", "ze gaan de vijzel voor het eerst aanzetten", "Inbedrijfstelling", "er ligt nog gereedschap in de trog en er staat iemand in de put", "SCV-5.03", "blind5"],
  ["SHV", "ze bouwen de semi hydrovijzel in", "Monteren Semi", "hij stuurt de vijzel met zijn hand bij terwijl hij op de natte rand staat", "SHV-3.06", "blind5"],
  ["SLI", "ze schakelen de slibindikker uit", "Afschakelprotocol", "de kast is open en hij pakt de draden zonder te meten", "SLI-1.03", "blind5"],
  ["SMV", "ze leggen de stortmal en zetten de vijzel erin", "Monteren stortmal", "de stortmal hangt scheef aan de kraan want de haak zit niet in het midden", "SMV-2.02", "blind5"],
  ["TRF", "ze laten het drumscreen draaien", "Inbedrijfstelling", "hij staat met zijn hand in het filter terwijl het draait", "TRF-5.03", "blind5"],
  ["TRF", "ze bouwen het trommelfilter in", "Monteren van trommelfilter", "de steiger staat op losse planken en wiebelt", "TRF-3.02", "blind5"],
  ["BAN", "ze installeren de nieuwe geleiders", "Installatie bandscreen", "ze grouten de voet met blote handen", "BAN-3.06", "blind5"],
  ["BBL", "ze zetten de nieuwe borstelbeluchter erop", "Monteren borstelbeluchter", "de tandwielkast hangt boven de goot en hij werkt eronder aan de bouten", "BBL-3.02", "blind5"],
  ["BEL", "de beluchter wordt eruit gehesen", "Demonteren bestaande", "hij staat op het natte rooster, het luik ernaast is open", "BEL-2.05", "blind5"],
  ["DBL", "ze lossen de vrachtwagen", "Aankomst", "de beluchter hangt in de lucht en hij zit eronder om de bouten van onderen vast te draaien", "DBL-3.05", "blind5"],
  ["CPV", "ze schakelen de compactvijzel af", "Afschakelprotocol", "er zit niemand bij de kast en er is geen slot, iedereen kan hem weer aanzetten", "CPV-1.02", "blind5"],
  ["DAM", "ze heien de damwand de grond in", "Plaatsen damwand", "de man die de plank in de geleiding duwt staat tussen de plank en de wand", "DAM-3.04", "blind5"],
  ["MIC", "ze zetten het microfilter op z'n plek", "Monteren Microfilter", "ze trekken de trommel met de hand rond terwijl de aandrijving nog aangesloten is", "MIC-3.09", "blind5"],
  // blind6: geschreven ná de laatste bijstelling en NIET op afgestemd. Meting: top 3 14/16, eerste 14/16, taakchip
  //         16/16, 9 sterk, 0 fout. De twee missers hieronder zijn echt (geen sterke match, de inspecteur kiest zelf).
  ["BEL", "ze takelen de oude beluchter uit het bassin", "Demonteren bestaande", "de hijsogen zijn verbogen en ze hangen hem er toch aan", "BEL-2.03", "blind6"],
  ["SHV", "ze hijsen de nieuwe vijzel erin", "Monteren Semi", "hij hangt over de putrand om de vijzel bij te sturen, zonder lijn", "SHV-3.01", "blind6"],
  ["CPV", "compactvijzel gaat eruit", "Demonteren (compactvijzel", "hij staat met zijn voet tussen de vijzel en de putrand als ze hem optrekken", "CPV-2.04", "blind6"],
  ["BAN", "ze gaan de bandscreen voor het eerst laten lopen", "Inbedrijfstelling", "de panelen lopen al terwijl hij er met een stok tussen zit te porren", "BAN-5.02", "blind6"],
  ["DAM", "ze zetten de damwand in het rek", "Plaatsen damwand", "het rek staat scheef en de planken staan los erin", "DAM-3.07", "blind6"],
  ["POM", "ze schakelen de pomp af", "Afschakelprotocol", "de pomp staat nog op automaat via de vlotter, ze zitten al aan de leiding", "POM-1.01", "blind6"],
  ["NBT", "ze monteren het hangende schraperwerk", "Monteren onderwaterwerk", "de inlooptrommel staat los rechtop naast de tank zonder steun, kan zo omvallen", "NBT-6.04", "blind6"],
  ["KET", "ze bouwen de kettingreiniger op", "Monteren kettingreiniger", "ze boren in de wand zonder stofzuiger, alles is wit van het stof", "KET-3.06", "blind6"],
  ["LDX", "ze halen de flowbooster eruit", "Demonteren aandrijving", "zijn handen zitten tussen de haak en de flowbooster als de kraan aantrekt", "LDX-2.04", "blind6"],
  ["ITV", "ze laten de trog met vijzel in de put zakken", "Monteren instorttrog", "monteur loopt achteruit op de natte rand en duwt de trog met zijn hand", "ITV-2.06", "blind6"],
  ["SLI", "ze slopen de slibindikker", "Demonteren (slibindikker", "hij staat zonder harnas op de rand van de tank", "SLI-2.09", "blind6"],
  ["TRF", "ze schakelen het trommelfilter af", "Afschakelprotocol", "hij gaat aan de kabels zitten zonder met de spanningzoeker te kijken", "TRF-1.03", "blind6"],
  ["BBL", "ze laten de borstelbeluchter voor het eerst lopen", "Inbedrijfstelling", "hij staat vlak naast de draaiende borstels op het natte dek", "BBL-5.02", "blind6"],
  ["DBL", "ze halen de drijvende beluchter met de kraan uit het water", "Demonteren bestaande drijvende", "het waait hard en het ding zwaait richting de oever", "DBL-2.05", "blind6"],
  ["SMV", "ze storten de stortmal vol beton", "Betonwerkzaamheden", "hij heeft beton tot in zijn laarzen en geen handschoenen", "SMV-3.02", "blind6"],
  ["ROO", "ze plaatsen de roosterreiniger", "Montage", "ze tillen met z'n tweeën een zware kolom met de hand", "ROO-3.01", "blind6"],
  // ---- vierde ronde (na afkeuring 4) ----
  // kritiek4: de zinnen uit afkeuring 4, letterlijk (taakzin + waarneming van de reviewer). Eerste meting (eerlijk):
  //           top 3 4/7, eerste 1/7, 1 FOUTE sterke match (SHV "draait helemaal rond aan de haak" → vallen van de last),
  //           3× geen voorstel bij direct gevaar (BAN kop onder de last, NBT zonder meter/ruikt raar, LDX richting het gat).
  //           Daarna bijgesteld; nu regressie.
  ["SHV", "ze halen de semi hydrovijzel eruit", "Demonteren Semi", "er zit geen touw aan, dat ding draait helemaal rond aan de haak", "SHV-2.05", "kritiek4"],
  ["BAN", "ze trekken de bandscreen eruit", "Demonteren bestaande bandscreen", "die vent staat met z'n kop onder de bandscreen terwijl die omhoog gaat", "BAN-2.03", "kritiek4"],
  ["NBT", "we controleren of de tank schoon is", "Controleren of nabezinktank", "hij gaat zonder meter de tank in, ruikt een beetje raar daar beneden", "NBT-1.01", "kritiek4"],
  ["LDX", "ze takelen de flowbooster eruit", "Demonteren aandrijving", "dekplaat ligt eruit en hij loopt achteruit met de takel richting het gat", "LDX-2.01", "kritiek4"],
  ["SLI", "ze bouwen de slibindikker uit", "Demonteren (slibindikker", "hij klimt de ladder af de tank in met een rugzak gereedschap, ladder niet vastgezet", "SLI-2.10", "kritiek4"],
  ["SHV", "ze hijsen de nieuwe semi hydrovijzel erin", "Monteren Semi", "vijzel schuift tijdens het hijsen uit de trog naar beneden", "SHV-3.09", "kritiek4"],
  ["CHV", "ze halen de compact hydrovijzel eruit", "Demonteren van de Compact", "die knakker loopt gewoon onder de vijzel door terwijl die aan de kraan hangt", "CHV-2.03", "kritiek4"],
  // blind7: 33 eigen zinnen over alle 21 producten (veel bouwplaatstaal, vooral direct gevaar), geschreven VÓÓR het
  //         bijstellen van ronde 4. Eerste meting (eerlijk): top 3 30/33 (91%), eerste 26/33 (79%), taakchip 32/33,
  //         23 sterk waarvan 2 FOUT (BUV "tolt rond aan de haak", MIC "draait rond aan de haak" → vallen van de last).
  //         Missers: SCV "omkiepen", TRF "kan nog ronddraaien", LDX "hakken aan het gat". Daarna bijgesteld; nu regressie.
  //         De taakchip-misser (SMV "ze zetten de vijzel erin": stortmal of vijzellichaam) is echt dubbelzinnig en blijft staan.
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "die plank hangt nog aan de kraan en de knakker staat er pal onder om de sluiting los te peuteren", "DAM-2.03", "blind7"],
  ["POM", "ze takelen de pomp uit de put", "Demontage van de pomp", "hij gaat zonder meter de pompput in, het stinkt daar", "POM-2.05", "blind7"],
  ["BUV", "ze takelen de vijzelunit eruit", "Demonteren (Aandrijving", "die vijzelunit bungelt boven de put en hij staat er met z'n hele lijf onder te kijken", "BUV-2.03", "blind7"],
  ["BUV", "ze hijsen de buisvijzel erin", "Monteren (Buisvijzel", "het ding tolt rond aan de haak en er hangt geen lijn aan", "BUV-3.05", "blind7"],
  ["CPV", "ze halen de compactvijzel eruit", "Demonteren (compactvijzel", "hij staat aan de rand van de put zonder lijn en buigt voorover om de stroppen te pakken", "CPV-2.01", "blind7"],
  ["CPV", "ze laten de compactvijzel proefdraaien", "Inbedrijfstelling", "er staat nog een gast onderin de put als ze de vijzel opstarten", "CPV-5.03", "blind7"],
  ["SCV", "ze takelen de vijzelunit uit de put", "Demonteren (Aandrijving", "de unit is los van de bouten en staat nergens tegen, kan zo omkiepen", "SCV-2.08", "blind7"],
  ["SMV", "ze hijsen de vijzel met de stortmal de put in", "Monteren stortmal", "hij kruipt onder de stortmal door terwijl die aan de kraan hangt", "SMV-2.02", "blind7"],
  ["SMV", "ze zetten de vijzel erin", "Monteren (bovenlager", "hij zit boven op de vijzel en die is niet geblokkeerd", "SMV-5.06", "blind7"],
  ["IDV", "ze draaien de vijzel in", "Indraaireductor", "de elektricien staat nog in de put en ze gaan al indraaien", "IDV-4.04", "blind7"],
  ["ITV", "ze hijsen de instorttrog de put in", "Monteren instorttrog", "de trog hangt boven de put en die jongen staat er gewoon onder met z'n handen omhoog", "ITV-2.02", "blind7"],
  ["KET", "ze trekken de kettingreiniger eruit", "Demonteren kettingreiniger", "het frame zwaait alle kanten op aan de kraan, geen touw eraan", "KET-2.05", "blind7"],
  ["KET", "ze schakelen de kettingreiniger af", "Afschakelprotocol", "hij staat op automatisch, kan zomaar weer gaan lopen", "KET-1.01", "blind7"],
  ["MIC", "ze hijsen het microfilter uit de put", "Demonteren Microfilter", "hij gaat zonder gasmeter de microfilterput in, het ruikt muf", "MIC-2.07", "blind7"],
  ["MIC", "ze hangen het nieuwe microfilter erin", "Monteren Microfilter", "het filter draait rond aan de haak en ze hebben geen stuurlijn", "MIC-3.05", "blind7"],
  ["ROO", "ze halen de roosterreiniger uit elkaar", "Demontage", "hij loopt achteruit over het dek richting het open kanaal, er staat geen hek", "ROO-2.09", "blind7"],
  ["ROO", "ze bouwen de roosterreiniger op", "Montage", "hij klimt via een losse ladder die niet vastgebonden is naar het bordes", "ROO-3.04", "blind7"],
  ["TRF", "ze takelen het trommelfilter uit de put", "Demonteren van trommelfilter", "die trommel hangt aan de kraan en de jongen staat met z'n kop eronder", "TRF-2.04", "blind7"],
  ["TRF", "ze zetten het trommelfilter erin", "Monteren van trommelfilter", "de trommel kan nog ronddraaien terwijl hij de zeefplaten vastzet", "TRF-3.01", "blind7"],
  ["DBL", "ze takelen de drijvende beluchter uit het water", "Demonteren bestaande drijvende", "hij staat op de drijver zonder zwemvest, het ding wiebelt", "DBL-2.03", "blind7"],
  ["SHV", "ze takelen de semi hydrovijzel eruit", "Demonteren Semi", "die vijzel komt omhoog en die vent kijkt er recht onder in de put", "SHV-2.03", "blind7"],
  ["SHV", "ze hijsen de nieuwe hydrovijzel erin", "Monteren Semi", "vijzel glijdt langzaam uit de trog weg als ze de kraan laten vieren", "SHV-3.09", "blind7"],
  ["LDX", "ze takelen de flowbooster omhoog", "Demonteren aandrijving", "de dekplaat ligt eraf en hij staat met z'n hakken aan het gat", "LDX-2.01", "blind7"],
  ["NBT", "we controleren of de tank schoon is", "Controleren of nabezinktank", "de mannen lopen de tank in zonder dat iemand gemeten heeft, er ligt nog slib", "NBT-1.01", "blind7"],
  ["SLI", "ze slopen de slibindikker", "Demonteren (slibindikker", "hij gaat de tank in via de ladder maar die ladder staat los en schuift", "SLI-2.10", "blind7"],
  ["BAN", "ze tillen het frame van de bandscreen uit het kanaal", "Demonteren bestaande bandscreen", "frame hangt aan de kraan en hij duikt eronder om een pen los te slaan", "BAN-2.03", "blind7"],
  ["CHV", "ze hijsen de compact hydrovijzel eruit", "Demonteren van de Compact", "hij gaat met z'n hoofd onder de vijzel kijken terwijl die nog aan de haak hangt", "CHV-2.03", "blind7"],
  ["BBL", "ze halen de tandwielkast eraf", "Demonteren aandrijving", "het luik ligt eruit en hij stapt achteruit met de tandwielkast in z'n handen naar het gat", "BBL-2.01", "blind7"],
  ["BEL", "ze takelen de oude beluchter uit het bassin", "Demonteren bestaande", "die beluchter hangt aan één strop en de gast staat eronder met z'n telefoon", "BEL-2.03", "blind7"],
  ["POM", "ze laten de nieuwe pomp zakken", "Montage van de Pomp", "de pomp hangt aan de ketting boven het putgat en hij steekt z'n hoofd eronder om te kijken", "POM-3.02", "blind7"],
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "ze stappen het inlaatkanaal in zonder gasmeting, het stinkt er", "DAM-2.07", "blind7"],
  ["BAN", "ze halen de oude bandscreen eruit", "Demonteren bestaande bandscreen", "hij trekt de zeefpanelen eruit zonder handschoenen en die randen zijn vlijmscherp", "BAN-2.05", "blind7"],
  ["KET", "ze bouwen de kettingreiniger in", "Monteren kettingreiniger", "ze boren de ankergaten en de hele put staat blauw van het stof", "KET-3.06", "blind7"],
  // blind8: 22 zinnen over alle 21 producten, geschreven NA het bijstellen en NIET op afgestemd. Meting: top 3 22/22,
  //         eerste 22/22, 21 sterk, 0 fout, taakchip 22/22. Eerlijk: dezelfde schrijver kende de patronen al; met de
  //         matcher van vóór ronde 4 scoorde deze set ook al 21/22. Het harde getal is de eerste meting van blind7.
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "de damwandplank bungelt aan de kraan en die maat staat er met z'n neus onder", "DAM-2.03", "blind8"],
  ["POM", "ze takelen de pomp uit de put", "Demontage van de pomp", "de strop is zo te zien versleten en ze hijsen gewoon door", "POM-2.02", "blind8"],
  ["BUV", "ze takelen de vijzelunit eruit", "Demonteren (Aandrijving", "hij daalt af in de vijzelput zonder gasmeter, daar beneden stinkt het naar riool", "BUV-2.07", "blind8"],
  ["CPV", "ze hijsen de compactvijzel erin", "Monteren (Compactvijzel", "de vijzel zwiept heen en weer boven de put en niemand houdt een touwtje vast", "CPV-3.05", "blind8"],
  ["SCV", "ze takelen de vijzelunit uit de put", "Demonteren (Aandrijving", "ze lopen onder de unit door terwijl die aan de takel hangt", "SCV-2.03", "blind8"],
  ["SMV", "ze halen de vijzel uit de trog", "Demonteren (vijzel uit trog", "de vijzel hangt boven de trog en die knakker staat er met z'n hele lijf onder te wijzen", "SMV-4.01", "blind8"],
  ["IDV", "ze halen de vijzelafdekking eraf", "Demonteren (vijzelafdekking", "de afdekplaat ligt eraf en hij loopt achterstevoren richting het gat", "IDV-2.01", "blind8"],
  ["ITV", "ze laten de trog in de put zakken", "Monteren instorttrog", "hij gaat de put in om de trog uit te lijnen, niemand heeft gemeten", "ITV-2.05", "blind8"],
  ["KET", "ze trekken de kettingreiniger uit het bassin", "Demonteren kettingreiniger", "hij hangt ver over de reling zonder harnas om de ketting te pakken", "KET-2.01", "blind8"],
  ["MIC", "ze hijsen het microfilter uit de put", "Demonteren Microfilter", "het microfilter hangt aan de kraan en hij kruipt eronder om een bout los te draaien", "MIC-2.03", "blind8"],
  ["ROO", "ze slopen de roosterreiniger", "Demontage", "hij staat boven in de hoogwerker en die wiebelt op de zachte grond", "ROO-2.05", "blind8"],
  ["TRF", "ze halen het trommelfilter uit elkaar", "Demonteren van trommelfilter", "de trommel draait opeens een slag door als ze de laatste bout eruit halen", "TRF-2.01", "blind8"],
  ["BBL", "ze hijsen de borstelbeluchter eraf", "Demonteren aandrijving", "de tandwielkast hangt aan de haak en de jongen staat er pal onder met z'n telefoon", "BBL-2.02", "blind8"],
  ["BEL", "ze monteren de nieuwe beluchter", "Monteren nieuwe", "het mangat in het dek ligt open en hij loopt er met de rug naartoe", "BEL-3.05", "blind8"],
  ["DBL", "ze leggen de beluchter te water", "Tewaterlating", "hij springt van de kant op het platform zonder zwemvest", "DBL-4.02", "blind8"],
  ["SHV", "ze hijsen de nieuwe hydrovijzel erin", "Monteren Semi", "de vijzel tolt aan de kraan en er zit geen lijntje aan", "SHV-3.05", "blind8"],
  ["LDX", "ze zetten de nieuwe flowbooster erin", "Monteren flowbooster", "het luik staat open en hij stapt achteruit met de kabel in z'n handen", "LDX-3.01", "blind8"],
  ["NBT", "ze halen de schraperarmen eruit", "Demonteren onderwaterwerk", "de schraperarm hangt aan de kettingtakel en hij staat er in de tank recht onder", "NBT-3.03", "blind8"],
  ["SLI", "ze monteren de nieuwe slibindikker", "Monteren (bovenlager", "hij gaat de ladder af naar de tankbodem en de ladder staat niet vast", "SLI-3.11", "blind8"],
  ["BAN", "ze bouwen de nieuwe bandscreen in", "Installatie bandscreen", "het frame hangt boven het kanaal en hij staat eronder de geleiders uit te lijnen", "BAN-3.01", "blind8"],
  ["CHV", "ze hijsen de nieuwe hydrovijzel erin", "Monteren van de Compact", "de vijzel slingert alle kanten op aan de kraan, geen stuurlijnen", "CHV-3.05", "blind8"],
  ["SCV", "ze laten de vijzel voor het eerst draaien", "Inbedrijfstelling", "die gast staat nog onderin de put als ze hem starten", "SCV-5.03", "blind8"],
  // ---- vijfde ronde (na afkeuring 5) ----
  // kritiek5: de 31 zinnen van de reviewer van ronde 5, letterlijk (25 + 6 extra, 19 producten). Zijn meting: top 3 28/30,
  //           eerste 24/30, 19 sterk waarvan 1 FOUT bij direct gevaar (MIC “arm tussen de spaken” → beknelling i.p.v.
  //           onverwacht draaien). Mijn eerste meting erop: top 3 28/30, eerste 24/30, 1 foute sterke match. Daarna
  //           bijgesteld; nu regressie. (Zijn negatieve zin “alles netjes … hijsband is gekeurd” staat apart in K8.)
  ["BUV", "ze takelen de oude buisvijzel eruit", "Demonteren", "die knul hangt met z'n halve lijf over de rand van de put zonder lijn", "BUV-2.01", "kritiek5"],
  ["KET", "ze bouwen de kettingreiniger af", "Demonteren kettingreiniger", "de spanner staat nog vol op de ketting en hij gaat de pen eruit tikken", "KET-2.04", "kritiek5"],
  ["MIC", "ze zetten de trommel van het microfilter in elkaar", "Monteren Microfilter", "trommel is niet geblokkeerd en hij zit met z'n arm tussen de spaken", "MIC-3.09", "kritiek5"],
  ["ROO", "ze bouwen de roosterreiniger op", "Montage", "rolsteiger staat op losse stelconplaten en wiebelt als je erop klimt", "ROO-3.05", "kritiek5"],
  ["SLI", "ze slopen de oude slibindikker", "Demonteren", "jongen klimt de tank in via een ladder die alleen tegen de rand geleund staat", "SLI-2.10", "kritiek5"],
  ["ITV", "ze storten beton onder de trog", "Betonwerkzaamheden", "ze staan tot hun enkels in de natte specie op gympen zonder handschoenen", "ITV-3.02", "kritiek5"],
  ["LDX", "ze hijsen de flowbooster het bassin in", "Monteren flowbooster", "rooster van het dek ligt ernaast en hij loopt achteruit met de stuurlijn in z'n hand", "LDX-3.01", "kritiek5"],
  ["TRF", "ze halen het trommelfilter eruit", "Demonteren", "de halve trommel is niet geborgd en kan zo doorrollen als ze de laatste bout eruit draaien", "TRF-2.01", "kritiek5"],
  ["NBT", "ze slijpen de oude drijflaagafvoerput los", "Demonteren onderwaterwerk", "het stinkt naar rotte eieren in die put en ze slijpen gewoon door zonder masker", "NBT-3.08", "kritiek5"],
  ["POM", "ze testen de nieuwe pomp", "Inbedrijfstelling", "vlotter staat nog op automaat, dat ding kan elk moment aanslaan terwijl hij met z'n hand bij de waaier zit", "POM-5.04", "kritiek5"],
  ["DBL", "ze leggen de drijvende beluchter te water", "Tewaterlating", "hij springt van de kade op de drijver terwijl dat ding nog ligt te deinen, geen vest aan", "DBL-4.02", "kritiek5"],
  ["SMV", "ze hijsen de stortmal de put in", "Monteren stortmal", "die maat staat onder de stortmal te wijzen terwijl hij nog aan de kraan hangt", "SMV-2.02", "kritiek5"],
  ["CPV", "ze zetten de compactvijzel spanningsloos", "Afschakelprotocol", "hij zet de werkschakelaar om maar meet niks na, zegt dat ie dood is", "CPV-1.03", "kritiek5"],
  ["BBL", "ze trekken de borstelbeluchter eruit", "Demonteren", "deksel van het mangat ligt open, geen hek eromheen en het dek is spekglad", "BBL-2.01", "kritiek5"],
  ["SHV", "ze laten de vijzel in de trog zakken", "Monteren Semi", "het vijzellichaam glipt onderaan weg uit de trog zodra de kraan aantrekt", "SHV-3.09", "kritiek5"],
  ["IDV", "ze draaien de vijzel in met de reductor", "Indraaireductor", "er staat er nog eentje beneden op de schroef als ze de reductor aanzetten", "IDV-4.04", "kritiek5"],
  ["CHV", "ze storten de bodem van de vijzelput", "Betonwerkzaamheden", "geen ventilator en geen gasmeter beneden, twee man diep in de put aan het trillen", "CHV-4.04", "kritiek5"],
  ["BAN", "ze zetten de bandscreen weer in elkaar", "Installatie", "ze voeren de ketting in terwijl de motor bijdraait, z'n handschoen zit bijna tussen het tandwiel", "BAN-3.07", "kritiek5"],
  ["KET", "ze testen de kettingreiniger", "Inbedrijfstelling", "reiniger staat nog op tijdsturing en kan zomaar gaan lopen terwijl er een gast in het bassin staat", "KET-5.03", "kritiek5"],
  ["ROO", "ze halen de grijper van de roosterreiniger eruit", "Demontage", "hij pakt de afgedankte harken vast met blote handen, die tanden zijn vlijmscherp", "ROO-2.06", "kritiek5"],
  ["SCV", "ze takelen de vijzelunit eruit", "Demonteren", "bouten zijn al los maar er zit nog niks aan de kraan, dat ding kan zo wegglijden", "SCV-2.08", "kritiek5"],
  ["NBT", "ze tillen de ruimerbrug op", "Verwijderen ruimerbrug", "brug hangt op twee vijzels zonder stempels en hij ligt eronder met z'n kop", "NBT-4.05", "kritiek5"],
  ["MIC", "ze zetten het microfilter op z'n plek", "Monteren Microfilter", "de kraan trekt aan en die unit knalt bijna tegen de putwand", "MIC-3.07", "kritiek5"],
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "gast staat vol in de stront zonder handschoenen en veegt z'n gezicht af", "DAM-2.06", "kritiek5"],
  ["LDX", "ze monteren het stromingsprofiel in de droge put", "Monteren stromingsprofiel", "hij gaat via een gammel laddertje het droge bassin in, niks vastgezet", "LDX-4.01", "kritiek5"],
  ["MIC", "ze zetten de trommel van het microfilter in elkaar", "Monteren Microfilter", "de trommel kan nog vrij ronddraaien en hij zet de zeeframen erin", "MIC-3.09", "kritiek5"],
  ["MIC", "ze bouwen het microfilter uit", "Demonteren Microfilter", "trommel zit niet vast, die kan zo omdraaien terwijl hij de bouten eruit haalt", "MIC-2.09", "kritiek5"],
  ["BUV", "ze takelen de oude buisvijzel eruit", "Demonteren", "hijsband is rafelig en die knul staat ook nog op de rand zonder lijn", "BUV-2.01", "kritiek5"],
  ["ROO", "ze bouwen de roosterreiniger op", "Montage", "de hoogwerker staat scheef op de stelcon en schommelt", "ROO-3.05", "kritiek5"],
  ["TRF", "ze zetten het trommelfilter in elkaar", "Monteren van trommelfilter", "halve trommel kan zo doordraaien, er zit geen blokkering op en z'n hand zit ertussen", "TRF-3.01", "kritiek5"],
  // blind9: 26 eigen zinnen over alle 21 producten, geschreven VÓÓR het bijstellen van ronde 5. Eerste meting (eerlijk):
  //         top 3 25/26 (96%), eerste 21/26 (81%), 17 sterk, 0 fout. Missers toen: ROO “rolsteiger … helt over” (geen
  //         voorstel), IDV/SMV/TRF/BAN tweede. Daarna bijgesteld (TRF en SMV ook ná die meting); nu regressie.
  ["DAM", "ze trekken de damwand eruit", "Verwijderen damwand", "de plank hangt nog in de klauw en die gozer loopt er gewoon onderlangs met een kruiwagen", "DAM-2.03", "blind9"],
  ["POM", "ze takelen de pomp uit de put", "Demontage van de pomp", "de ketting van de pomp zit vol knikken en roest, ze hijsen er gewoon mee door", "POM-2.02", "blind9"],
  ["NBT", "ze halen de schraperarmen eruit", "Demonteren onderwaterwerk", "hij slijpt in de lege tank en z'n gasmeter ligt nog in de bus", "NBT-3.08", "blind9"],
  ["DBL", "ze leggen de beluchter te water", "Tewaterlating", "hij stapt van de steiger op het ponton zonder reddingsvest, dat ding beweegt flink", "DBL-4.02", "blind9"],
  ["BUV", "ze takelen de oude buisvijzel eruit", "Demonteren", "de buisvijzel hangt boven de put en die jongen staat eronder te kijken of hij vrijkomt", "BUV-2.03", "blind9"],
  ["CHV", "ze hijsen de nieuwe hydrovijzel erin", "Monteren van de Compact", "de vijzel draait aan de kraan alle kanten op en niemand heeft een stuurtouw vast", "CHV-3.05", "blind9"],
  ["IDV", "ze draaien de vijzel er weer in", "Indraaireductor monteren", "ze laten de reductor draaien terwijl er nog een man in de vijzelput tussen de schroefbladen zit", "IDV-4.04", "blind9"],
  ["ITV", "ze hijsen de instorttrog in de put", "Monteren instorttrog", "de trog bungelt boven de put en hij steekt z'n hoofd eronder om te kijken", "ITV-2.02", "blind9"],
  ["KET", "ze halen de kettingreiniger eruit", "Demonteren kettingreiniger", "die spanner zit nog strak op de ketting en hij slaat met een hamer de pen eruit", "KET-2.04", "blind9"],
  ["LDX", "ze zetten de nieuwe flowbooster erin", "Monteren flowbooster", "het roostervloertje ligt opzij en hij loopt achterwaarts met de last naar het gat", "LDX-3.01", "blind9"],
  ["MIC", "ze zetten het microfilter in elkaar", "Monteren Microfilter", "trommel staat niet vast en hij draait de zeeframen erin terwijl die trommel kan gaan lopen", "MIC-3.09", "blind9"],
  ["ROO", "ze bouwen de roosterreiniger op", "Montage", "de rolsteiger staat met één wiel op een losse plaat en helt over", "ROO-3.05", "blind9"],
  ["SCV", "ze schakelen de vijzel af", "Afschakelprotocol", "hij hangt er geen slot op, zegt dat het maar vijf minuten duurt", "SCV-1.02", "blind9"],
  ["SHV", "ze halen de semi hydrovijzel eruit", "Demonteren Semi", "de strop zit om de scherpe kant van de trog en is al half ingesleten", "SHV-2.03", "blind9"],
  ["SLI", "ze slopen de slibindikker", "Demonteren", "hij gaat de put in, er hangt een vieze lucht en niemand heeft gemeten", "SLI-2.07", "blind9"],
  ["SMV", "ze hangen het vijzellichaam in de trog", "Monteren (bovenlager", "het vijzellichaam zwiept rond aan de haak en de maat staat ernaast met z'n handen eraan", "SMV-5.05", "blind9"],
  ["TRF", "ze laten het trommelfilter voor het eerst draaien", "Inbedrijfstelling", "hij steekt z'n hand door het luikje terwijl de trommel loopt", "TRF-5.03", "blind9"],
  ["BBL", "ze trekken de borstelbeluchter eruit", "Demonteren", "het rooster van de loopbrug is weggehaald en er staat geen hek omheen", "BBL-2.01", "blind9"],
  ["BEL", "ze monteren de nieuwe beluchter", "Monteren nieuwe", "het dekluik staat wagenwijd open en hij stapt achteruit om de kabel te trekken", "BEL-3.05", "blind9"],
  ["BAN", "ze bouwen de nieuwe bandscreen in", "Installatie bandscreen", "ze draaien de motor bij om de ketting erop te krijgen en z'n vingers zitten bij het kettingwiel", "BAN-3.07", "blind9"],
  ["CPV", "ze schakelen de compactvijzel af", "Afschakelprotocol", "hij zet de schakelaar uit en begint meteen te sleutelen zonder na te meten", "CPV-1.03", "blind9"],
  ["POM", "ze zetten de nieuwe pomp erin", "Montage van de Pomp", "de pomp hangt aan een strop zonder keuringslabel boven de put en hij staat er recht onder", "POM-3.02", "blind9"],
  ["DAM", "ze heien de nieuwe damwand erin", "Plaatsen damwand", "hij staat op de kademuur zonder hekje en leunt over het water om de plank te pakken", "DAM-3.01", "blind9"],
  ["MIC", "ze bouwen het microfilter uit", "Demonteren Microfilter", "hij zit in de put en z'n meter geeft alarm maar hij werkt door", "MIC-2.07", "blind9"],
  ["NBT", "ze tillen de ruimerbrug op", "Verwijderen ruimerbrug", "de brug staat op de vijzels zonder onderstopping en hij kruipt eronder met een sleutel", "NBT-4.04", "blind9", ["NBT-4.05"]],
  ["BUV", "ze maken de buisvijzel los van de tandwielkast", "Demonteren", "de laatste bouten zijn eruit en de vijzel staat nergens meer op, kan zo wegzakken", "BUV-2.08", "blind9"],
  // blind10: 11 zinnen geschreven NA het bijstellen van ronde 5, gemeten vóór elke verdere aanpassing. Eerste meting:
  //          top 3 10/11, eerste 10/11, 9 sterk, 0 fout (TRF “geen borgpen” miste; daarna gedicht). Eerlijk: ik had
  //          twee verwachte regels eerst fout gelabeld (NBT plaatsen: vallen van de last; een KET-zin zonder passende
  //          regel bij die taak staat nu als negatieve zin in K8).
  ["CPV", "ze hijsen de compactvijzel eruit", "Demonteren (compactvijzel", "de vijzel komt omhoog en die peer bukt eronder om de kabel los te trekken", "CPV-2.03", "blind10"],
  ["SCV", "ze takelen de vijzelunit uit de put", "Demonteren (Aandrijving", "het ding hangt aan één strop en draait als een tol, iedereen staat er vlak naast", "SCV-2.03", "blind10"],
  ["ITV", "ze laten de trog in de put zakken", "Monteren instorttrog", "hij klimt zo de vijzelput in, z'n meter ligt nog in de keet", "ITV-2.05", "blind10"],
  ["BBL", "ze monteren de borstelbeluchter", "Monteren borstelbeluchter", "de loopplaat ligt aan de kant en hij stapt achterwaarts met de kettingtakel", "BBL-3.01", "blind10"],
  ["SLI", "ze monteren de nieuwe slibindikker", "Monteren (bovenlager", "die ladder staat los op de bodem en wiebelt als hij naar beneden gaat", "SLI-3.11", "blind10"],
  ["TRF", "ze zetten het trommelfilter in elkaar", "Monteren van trommelfilter", "de trommel heeft geen borgpen en hij hangt met z'n bovenlijf in het frame", "TRF-3.01", "blind10"],
  ["DAM", "ze trekken de oude planken eruit", "Verwijderen damwand", "beneden in de put stinkt het als de pest en niemand heeft een gasmeter bij zich", "DAM-2.07", "blind10"],
  ["NBT", "ze plaatsen de nieuwe brug", "Plaatsen nieuwe ruimerbrug", "de brug hangt in de stroppen boven de tank en de knul staat er pal onder te wijzen", "NBT-5.05", "blind10"],
  ["BEL", "beluchter gaat eruit", "Demonteren bestaande", "de last bungelt aan de kraan en hij duikt eronderdoor naar de andere kant", "BEL-2.03", "blind10"],
  ["ROO", "ze slopen de roosterreiniger", "Demontage", "de rolsteiger staat op de natte klinkers zonder dat de remmen erop zitten en helt", "ROO-2.05", "blind10"],
  ["LDX", "ze takelen de flowbooster eruit", "Demonteren aandrijving", "het luik ligt opzij en hij staat met z'n hakken aan de rand van het gat te sjorren", "LDX-2.01", "blind10"],
  // ---- zesde ronde (na afkeuring 6) ----
  // kritiek6: alle zinnen van de reviewer uit afkeuring 6 (zijn eigen 35 gelabelde zinnen over 16 producten, plus de
  //           ITV-zin "boort in de stuwkant … vijzel kan zo wegdraaien" uit de tekst). Zijn eerste meting (vóór dit
  //           bijstellen): top 3 33/35, eerste 27/35, 25 sterk waarvan 2 FOUT, beide bij direct gevaar (ITV/SMV boren op een
  //           niet geblokkeerde vijzel → stof; NBT "zonder bokken of stempels" → kantelende kraan). Daarna bijgesteld; nu
  //           regressie. Zijn label "geen passende regel" voor BUV "leunt over de rand … harnas hangt in de bus" is hier
  //           BUV-3.01 (vallen van hoogte bij de rand van de vijzelput): dat is de passende regel van die taak. Een 7e kolom
  //           noemt een regel die ook goed is (NBT: terugzakken of beknelling onder de opgetilde brug). Zijn vier negatieve
  //           zinnen staan in K9 (nooit sterk).
  ["ITV", "ze hijsen de trogvijzel erin", "Monteren instorttrog", "die gozer hangt met z'n halve lijf over de putrand zonder lijntje om de bout te pakken", "ITV-2.03", "kritiek6"],
  ["ITV", "ze stellen de vijzel af in de trog", "Monteren instorttrog", "hij zit al een kwartier beneden in de vijzelput, er draait geen ventilator en niemand heeft een gasdetector bij zich", "ITV-2.05", "kritiek6"],
  ["SHV", "ze takelen de semi hydro eruit", "Demonteren Semi", "vijzel glipt half uit de trog als ze hem optrekken, hij hangt alleen nog aan de bovenste strop", "SHV-2.09", "kritiek6"],
  ["SHV", "ze laten de vijzel zakken", "Monteren Semi", "Kees stapt onder de vijzel om de onderlagerbouten te pakken terwijl ie nog aan de kraan hangt", "SHV-3.03", "kritiek6"],
  ["KET", "ze slopen de kettingreiniger eruit", "Demonteren kettingreiniger", "ze knippen de ketting door terwijl de spanner nog vol aangedraaid staat", "KET-2.04", "kritiek6"],
  ["KET", "ze laten de kettingreiniger voor het eerst lopen", "Inbedrijfstelling", "hij steekt z'n hand in de goot om een prop weg te halen terwijl de schrapers langskomen", "KET-5.02", "kritiek6"],
  ["BBL", "ze schakelen de borstelbeluchter af", "Afschakelprotocol", "schakelaar staat op 0 maar er hangt geen slot of label aan, iedereen kan hem zo weer aanzetten", "BBL-1.02", "kritiek6"],
  ["BBL", "ze halen de tandwielkast eraf", "Demonteren aandrijving", "roostervloer is eruit gehaald en hij stapt er achteruit langs met de tandwielkast aan de takel", "BBL-2.01", "kritiek6"],
  ["SMV", "ze bouwen het bovenlager in", "Monteren (bovenlager", "jongen staat bovenop de vijzel en niemand heeft de vijzel vastgezet, dat ding kan zo wegdraaien", "SMV-5.06", "kritiek6"],
  ["SMV", "ze storten de trog af", "Betonwerkzaamheden", "die knul staat tot z'n enkels in de specie met gewone gympen, geen laarzen", "SMV-3.02", "kritiek6"],
  ["IDV", "ze koppelen de indraaireductor af", "Indraaireductor", "de vijzel draait nog na terwijl hij de koppeling losmaakt", "IDV-4.09", "kritiek6"],
  ["IDV", "ze draaien de vijzel in", "Indraaireductor", "de aannemer staat ook aan de knoppen, niemand weet wie de vijzel bedient", "IDV-4.06", "kritiek6"],
  ["DBL", "ze leggen de drijvende beluchter in het bassin", "Tewaterlating", "ploeg stapt van de kant op de drijvers, het wiebelt als een gek en er is geen boei of reddingsvest", "DBL-4.02", "kritiek6"],
  ["DBL", "ze halen de beluchter uit het water", "Demonteren bestaande", "hij trekt de ankerketting met blote handen los, z'n vingers zitten tussen de schalm en het oog", "DBL-2.02", "kritiek6"],
  ["NBT", "ze halen de ruimerbrug eraf", "Verwijderen ruimerbrug", "de brug is met de vijzels opgekrikt en hij kruipt eronder zonder bokken of stempels", "NBT-4.05", "kritiek6", ["NBT-4.04"]],
  ["NBT", "ze slijpen de oude schraperarmen los", "Demonteren onderwaterwerk", "ze slijpen de armen in stukken zonder spatbril, de vonken vliegen in het rond", "NBT-3.04", "kritiek6"],
  ["SLI", "ze halen de slibindikker uit elkaar", "Demonteren", "hij staat op de rand van de tank met restwater erin, geen hekwerk en geen lijn", "SLI-2.09", "kritiek6"],
  ["SLI", "ze monteren het onderlager", "Monteren", "ladder staat met de pootjes in de blubber en zakt scheef weg als hij naar beneden klimt", "SLI-3.11", "kritiek6"],
  ["TRF", "ze zetten de trommel in elkaar", "Monteren van trommelfilter", "half opgebouwde trommel staat niet vast, de aandrijving zit er nog niet op en hij kan zo gaan rollen", "TRF-3.01", "kritiek6"],
  ["TRF", "ze hijsen het trommelfilter de put in", "Monteren van trommelfilter", "trommelfilter draait als een tol aan de kraan, er zit geen stuurlijn aan", "TRF-3.06", "kritiek6"],
  ["CHV", "ze laten de compact hydro proefdraaien", "Inbedrijfstelling", "afscherming van de koppeling ligt nog op de grond en hij staat er met z'n mouw vlak naast", "CHV-6.02", "kritiek6"],
  ["SCV", "ze zetten de semi compact spanningsloos", "Afschakelprotocol", "hij draait de klemmen los zonder te meten, is toch uit zegt ie", "SCV-1.03", "kritiek6"],
  ["POM", "ze trekken de pomp uit de put", "Demontage", "hij klimt de pompput in zonder gasmeting, mangat open en verder niks", "POM-2.05", "kritiek6"],
  ["BEL", "ze bouwen de nieuwe beluchter op", "Monteren nieuwe", "ze boren de ankergaten in het beton zonder stofkap of P3 masker, alles is grijs", "BEL-3.01", "kritiek6"],
  ["POM", "ze zetten de pomp weer aan", "Inbedrijfstelling", "hij hangt over de put met z'n handen bij de waaier en de vlotter staat nog op automaat", "POM-5.04", "kritiek6", ["POM-5.03"]],
  ["ITV", "ze maken de stuwkant dicht", "Afmonteren", "hij staat op de vijzelbladen te boren en de vijzel is niet geblokkeerd", "ITV-4.05", "kritiek6"],
  ["SCV", "ze hijsen de vijzelunit in", "Monteren (Vijzelunit", "de vijzel glijdt uit de trog zodra de kraan aantrekt, één strop zit los", "SCV-3.10", "kritiek6"],
  ["BUV", "ze bouwen de buisvijzel in", "Monteren", "hij leunt over de rand van de put om de stuurlijn te pakken, harnas hangt in de bus", "BUV-3.01", "kritiek6"],
  ["SHV", "ze zetten de vijzel veilig", "Afschakelprotocol", "kast is open en hij werkt met natte handschoenen aan de rails, geen isolerende handschoenen", "SHV-1.01", "kritiek6"],
  ["KET", "ze hangen de kettingreiniger erin", "Monteren kettingreiniger", "ding slingert alle kanten op boven het bassin, niemand heeft een lijn vast", "KET-3.05", "kritiek6"],
  ["TRF", "ze bouwen het trommelfilter af", "Demonteren van trommelfilter", "steiger in de put heeft geen kantplank en een leuning ontbreekt, hij staat op 4 meter", "TRF-2.02", "kritiek6"],
  ["NBT", "ze zetten de nieuwe brug neer", "Plaatsen nieuwe", "de loopwagen staat op een paar houtjes en schuift weg als ze de brug erop laten zakken", "NBT-5.07", "kritiek6", ["NBT-5.08", "NBT-5.09"]],
  ["POM", "ze schakelen de pomp af", "Afschakelprotocol", "hij heeft de werkschakelaar uit maar de pomp staat op niveausturing en slaat zo weer aan", "POM-1.01", "kritiek6"],
  ["BEL", "ze halen de oude beluchter eruit", "Demonteren bestaande", "luik in het dek ligt ernaast en hij loopt er met de rug naartoe", "BEL-2.05", "kritiek6"],
  ["SMV", "ze lijnen de vijzel uit in de stortmal", "Monteren stortmal", "de vijzel wordt losgekoppeld terwijl hij nog niet ingezekerd is, kan zo wegschuiven", "SMV-2.07", "kritiek6"],
  ["SMV", "ze bouwen het bovenlager in", "Monteren (bovenlager", "hij boort de ankers voor het bovenlager terwijl hij op de vijzelbladen staat, niks geblokkeerd", "SMV-5.06", "kritiek6"],
  ["ITV", "ze maken de stuwkant dicht", "Afmonteren", "hij boort in de stuwkant terwijl hij op de vijzel staat, vijzel kan zo wegdraaien", "ITV-4.05", "kritiek6"],
  // blind11: 24 eigen nieuwe zinnen (ronde 7) over 21 producten, geschreven en gelabeld VÓÓR de meting. Eerste meting
  //          (eerlijk, na het bijstellen op kritiek6 maar vóór elke aanpassing hierop): top 3 23/24 (96%), eerste 18/24 (75%),
  //          taakchip 22/24, 18 sterk waarvan 2 FOUT, beide tussen twee regels met direct gevaar (BUV "leerling met z'n benen in
  //          de put" → 5.02 i.p.v. 5.03; IDV "reductor eraf … niemand heeft de vijzel geblokkeerd, zit erbovenop" → 4.09 i.p.v.
  //          4.04). Missers toen: SMV "ligt nog los in de mal … wegschuiven" (geen voorstel), DAM "stempel … zakt langzaam
  //          weg", CHV "bungelt … draait langzaam rond", ITV "afzuiging uit, meter ligt boven op de rand" (2e). Daarna
  //          bijgesteld; nu regressie. Reken op nieuwe bouwplaatstaal dus nog steeds op ~75-85% eerste: daarom blijft een
  //          zwakke match een tik op de regel zelf, en blokkeert het vangnet een sterke match zodra direct gevaar meespeelt.
  ["BAN", "ze laten de bandscreen proefdraaien", "Inbedrijfstelling", "de ketting loopt al en hij trekt met z'n hand een lap tussen de zeefpanelen uit", "BAN-5.02", "blind11"],
  ["BEL", "ze takelen de oude beluchter eruit", "Demonteren bestaande", "die beluchter hangt scheef aan één strop en hij staat eronder de kabel los te knippen", "BEL-2.03", "blind11"],
  ["CPV", "ze schakelen de compactvijzel af", "Afschakelprotocol", "hij zegt dat de groep eruit is maar er hangt geen slot aan de werkschakelaar, iedereen kan hem terugzetten", "CPV-1.02", "blind11"],
  ["DAM", "de kraan wordt opgesteld", "Situatie Kraanopstelling", "één stempel van de kraan staat op de rand van de sloot en die zakt langzaam weg", "DAM-1.08", "blind11"],
  ["KET", "ze hangen de kettingreiniger erin", "Monteren kettingreiniger", "hij leunt ver over de bassinrand zonder lijn om het frame naar zich toe te trekken", "KET-3.01", "blind11"],
  ["LDX", "ze bouwen de tandwielkast op de flowbooster", "Monteren flowbooster", "het dekluik staat open en hij loopt er met de tandwielkast in z'n armen vlak langs", "LDX-3.01", "blind11"],
  ["MIC", "ze laten het microfilter voor het eerst draaien", "Inbedrijfstelling", "de trommel draait al en hij steekt z'n arm door het inspectieluik om een doek eruit te vissen", "MIC-5.03", "blind11"],
  ["ROO", "ze bouwen de roosterreiniger op", "Montage", "hij hangt vanuit de hoogwerker over de reling zonder harnas om het bordes vast te zetten", "ROO-3.04", "blind11"],
  ["SCV", "ze zetten de spanning er weer op", "Inschakelen", "hij klemt de motorkabel aan terwijl de groep nog onder spanning staat", "SCV-4.01", "blind11"],
  ["TRF", "ze halen het trommelfilter uit elkaar", "Demonteren van trommelfilter", "de trommel is half los en kan zo gaan rollen terwijl hij de lagerbouten eruit draait", "TRF-2.01", "blind11"],
  ["BBL", "ze halen de tandwielkast van de borstelbeluchter", "Demonteren aandrijving", "tandwielkast hangt aan de takel en die gozer staat er pal onder om de laatste bout eruit te tikken", "BBL-2.02", "blind11"],
  ["BUV", "ze laten de buisvijzel proefdraaien", "Inbedrijfstelling", "ze laten de vijzel draaien terwijl de leerling nog met z'n benen in de put hangt", "BUV-5.03", "blind11"],
  ["SLI", "ze bouwen de slibindikker uit", "Demonteren (slibindikker", "het slibindikkerlichaam is losgekoppeld en staat nergens tegen, kan zo omklappen", "SLI-2.08", "blind11"],
  ["DBL", "de drijvende beluchter gaat het water in", "Tewaterlating", "ze stappen zonder zwemvest op het platform terwijl het nog flink deint", "DBL-4.02", "blind11"],
  ["POM", "ze laten de nieuwe pomp zakken", "Montage van de Pomp", "z'n vingers zitten tussen de klauw en de geleidebuis als de pomp zakt", "POM-3.03", "blind11"],
  ["CHV", "ze takelen de compact hydrovijzel eruit", "Demonteren van de Compact", "het vijzellichaam bungelt aan de kraan en draait langzaam rond, niemand heeft een lijn eraan", "CHV-2.05", "blind11"],
  ["ITV", "ze stellen de trog af in de put", "Monteren instorttrog", "hij zit beneden in de vijzelput de trog uit te lijnen, de afzuiging staat uit en z'n meter ligt boven op de rand", "ITV-2.05", "blind11"],
  ["SMV", "ze lijnen de vijzel uit in de stortmal", "Monteren stortmal", "ze halen de stroppen eraf maar de vijzel ligt nog los in de mal en kan zo wegschuiven", "SMV-2.07", "blind11"],
  ["SHV", "ze zetten de hydrovijzel spanningsloos", "Afschakelprotocol", "hij meet niks na en begint aan de klemmen, de kast staat toch uit zegt ie", "SHV-1.03", "blind11"],
  ["IDV", "ze draaien de vijzel in", "Indraaireductor", "de reductor is eraf maar niemand heeft de vijzel geblokkeerd en hij zit erbovenop", "IDV-4.04", "blind11"],
  ["NBT", "ze hangen de inlooptrommel op", "Monteren onderwaterwerk", "hij staat op de rolsteiger in de tank op drie meter en er zit geen leuning aan", "NBT-6.01", "blind11"],
  ["KET", "ze zetten de kettingreiniger veilig", "Afschakelprotocol", "de schakelaar staat nog op automaat en ze zitten al aan de schrapers", "KET-1.01", "blind11"],
  ["BEL", "ze zetten de nieuwe beluchter vast", "Monteren nieuwe", "hij boort de ankers in het beton zonder masker, alles zit onder het grijze stof", "BEL-3.01", "blind11"],
  ["ROO", "ze laten de roosterreiniger proefdraaien", "Inbedrijfstelling", "hij steekt z'n hand tussen de harken terwijl de reiniger een testslag maakt", "ROO-5.02", "blind11"],
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
    return CASES.map(([code, werk, taakBegin, zin, regel, tag, alt]) => {
      const regels = kb[code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      const taak = taken.find((t) => t.startsWith(taakBegin));
      const tv = WPI.koppel.taakRang(werk, taken, regels, [kb[code].naam]).slice(0, 2).map((x) => x.id);
      const r = WPI.koppel.rangschik(zin, { regels: regels.filter((x) => x.taak === taak), alg, generiek: [kb[code].naam, taak || ""] });
      const top3 = r.lijst.filter((x) => !x.alg).slice(0, 3).map((x) => x.id);
      const verwacht = regels.find((x) => x.id === regel);
      // een 7e kolom: regels die óók goed zijn (de inspecteur zou ze net zo goed kiezen); de eerste die in de top 3 staat telt
      const goedIds = [regel].concat(alt || []), rang = top3.findIndex((id) => goedIds.includes(id));
      return { code, werk, zin, regel, goedIds, taak, set: tag || "ronde 1", taakOk: !!taak && tv[0] === taak, tv, top3, rang, sterk: r.sterk, top: r.top, topGoed: goedIds.includes(r.top), reden: r.reden,
        direct: !!(verwacht && WPI.koppel.directGevaar(verwacht.risico, "")) };
    });
  }, CASES.map((c) => [c[0], c[1], c[2], c[3], c[4], c[5], c[6] || null]));
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
  const eersteGoed = res.filter((x) => x.rang === 0), pctE = Math.round((eersteGoed.length / res.length) * 100);
  const fouteSterke = res.filter((x) => x.sterk && !x.topGoed);
  [...new Set(res.map((x) => x.set))].forEach((set) => { const d = res.filter((x) => x.set === set);
    console.log(`  set ${set.padEnd(8)} n=${d.length} · top 3 ${d.filter((x) => x.rang >= 0).length} · eerste ${d.filter((x) => x.rang === 0).length} · sterk ${d.filter((x) => x.sterk).length} (fout ${d.filter((x) => x.sterk && !x.topGoed).length}) · taakchip eerste ${d.filter((x) => x.taakOk).length}`); });
  console.log(`  regel in top 3: ${goed.length}/${res.length} (${pct}%) · eerste: ${eersteGoed.length}/${res.length} (${pctE}%) · taak = eerste chip: ${taakGoed.length}/${res.length} (${pctT}%) · foute sterke matches: ${fouteSterke.length}`);
  ok(res.length >= 15, "K3 tabel heeft ≥ 15 zinnen (" + res.length + ")");
  ok(pct >= 95, "K3 ≥ 95% van de zinnen heeft de verwachte regel in de top 3 (" + pct + "%)");
  ok(pctE >= 85, "K3 ≥ 85% van de zinnen heeft de verwachte regel als EERSTE (" + pctE + "%)");
  const nieuw = res.filter((x) => /^(kritiek4|blind7|blind8)$/.test(x.set)), nieuwProd = new Set(nieuw.filter((x) => x.set !== "kritiek4").map((x) => x.code));
  ok(nieuw.filter((x) => x.set !== "kritiek4").length >= 20 && nieuwProd.size >= 15, "K3 ronde 4: ≥ 20 nieuwe zinnen over ≥ 15 producten (" + nieuw.length + " zinnen, " + nieuwProd.size + " producten)");
  const nieuw5 = res.filter((x) => /^(blind9|blind10)$/.test(x.set)), nieuw5Prod = new Set(nieuw5.map((x) => x.code)), krit5 = res.filter((x) => x.set === "kritiek5");
  ok(nieuw5.length >= 20 && nieuw5Prod.size >= 15, "K3 ronde 5: ≥ 20 nieuwe eigen zinnen over ≥ 15 producten (" + nieuw5.length + " zinnen, " + nieuw5Prod.size + " producten)");
  ok(krit5.length >= 30, "K3 ronde 5: alle zinnen van de reviewer staan in de tabel (" + krit5.length + " + 1 negatieve in K8)");
  const nieuw7 = res.filter((x) => x.set === "blind11"), nieuw7Prod = new Set(nieuw7.map((x) => x.code)), krit6 = res.filter((x) => x.set === "kritiek6");
  ok(nieuw7.length >= 20 && nieuw7Prod.size >= 15, "K3 ronde 7: ≥ 20 nieuwe eigen zinnen over ≥ 15 producten (blind11: " + nieuw7.length + " zinnen, " + nieuw7Prod.size + " producten)");
  ok(krit6.length >= 36, "K3 ronde 7: alle gelabelde zinnen van de reviewer staan in de tabel (kritiek6: " + krit6.length + " + 4 negatieve in K9)");
  ok(res.filter((x) => x.direct && x.sterk && !x.topGoed).length === 0, "K3 geen foute sterke match bij direct gevaar (" + res.filter((x) => x.direct).length + " zinnen met direct gevaar)");
  ok(pctT >= 90, "K3 ≥ 90% van de werkzinnen geeft de verwachte taak als EERSTE chip (" + pctT + "%)");
  ok(fouteSterke.length === 0, "K3 geen enkele foute sterke match (één tik zou een verkeerde regel vastleggen)", fouteSterke.map((x) => x.code + ": " + x.zin + " → " + x.top));

  // ---------------- K3b: de gevallen uit de afkeuring (ronde 2) ----------------
  console.log("K3b afkeuring ronde 2");
  const k3b = await ev(() => {
    const kb = App.data.kennisbank, alg = App.onderwerpen(), K = WPI.koppel;
    const takenVan = (c) => [...new Set(kb[c].regels.map((r) => r.taak))];
    const rang = (c, tb, zin) => { const t = takenVan(c).find((x) => x.startsWith(tb)); return K.rangschik(zin, { regels: kb[c].regels.filter((r) => r.taak === t), alg, generiek: [kb[c].naam, t] }); };
    const chip = (c, zin) => K.taakRang(zin, takenVan(c), kb[c].regels, [kb[c].naam]).map((x) => x.id);
    const lot = rang("SCV", "Afschakelprotocol", "kast staat open, geen hangslot op de hoofdschakelaar en de elektricien zit al te sleutelen");
    const elek = K.signalen("de elektricien kijkt mee");
    return { lot: { top: lot.top, sterk: lot.sterk, top3: lot.lijst.filter((x) => !x.alg).slice(0, 3).map((x) => x.id) }, elek: Object.keys(elek),
      chips: [["BUV", "de buisvijzel wordt erin gehesen"], ["SCV", "ze bouwen de vijzelunit in"], ["POM", "ze hangen de nieuwe pomp erin"], ["SMV", "ze laten de vijzel in de stortmal zakken"],
        ["CPV", "ze klemmen de motor aan"], ["SCV", "ze zetten hem spanningsloos bij de kast"], ["POM", "pomp gaat d'r uit"]].map(([c, z]) => ({ c, z, chips: chip(c, z) })),
      ketting: (() => { const r = rang("POM", "Demontage", "ze hangen die pomp aan een verroeste ketting zonder keuringslabel"); return { top: r.top, sterk: r.sterk, alg: r.alg }; })(),
      haak: (() => { const r = rang("BEL", "Demonteren", "gast loopt pal onder dat ding door terwijl ie aan de haak hangt"); return { top: r.top, sterk: r.sterk }; })(),
      put: (() => { const r = rang("BUV", "Inbedrijf", "er staat nog een monteur in de put als ze de vijzel laten lopen"); return { top: r.top, sterk: r.sterk }; })(),
      gevaar: ["BUV-5.03", "CPV-3.06", "SMV-5.06", "SCV-1.02", "IDV-4.04"].map((id) => { const c = id.slice(0, 3), r = kb[c].regels.find((x) => x.id === id); return id + ":" + !!K.directGevaar(r.risico, ""); }),
      geenGevaar: ["DAM-2.02", "BEL-2.04"].map((id) => { const r = kb[id.slice(0, 3)].regels.find((x) => x.id === id); return id + ":" + !!K.directGevaar(r.risico, ""); }) };
  });
  ok(k3b.lot.top === "SCV-1.02" && k3b.lot.sterk && k3b.lot.top3[0] !== "SCV-1.01", "K3b ‘geen hangslot op de hoofdschakelaar … elektricien’ → SCV-1.02 (LOTOTO-slot), niet SCV-1.01", k3b.lot);
  ok(!k3b.elek.includes("ELEKTRA"), "K3b ‘elektricien’ (functie) is geen elektrisch gevaarwoord", k3b.elek);
  const chipVerwacht = { "de buisvijzel wordt erin gehesen": /^Monteren/, "ze bouwen de vijzelunit in": /^Monteren/, "ze hangen de nieuwe pomp erin": /^Montage/, "ze laten de vijzel in de stortmal zakken": /^Monteren stortmal/,
    "ze klemmen de motor aan": /^Inschakelen/, "ze zetten hem spanningsloos bij de kast": /^Afschakelprotocol/, "pomp gaat d'r uit": /^Demontage/ };
  k3b.chips.forEach((x) => ok(chipVerwacht[x.z].test(x.chips[0] || ""), "K3b eerste taakchip voor " + x.c + " ‘" + x.z + "’", x.chips.slice(0, 3)));
  ok(k3b.chips.filter((x) => /erin|in$|zakken/.test(x.z)).every((x) => !/^(Demont|Inbedrijf)/.test(x.chips[0] || "")), "K3b plaatsen/inbouwen geeft nooit ‘Demonteren’ of ‘Inbedrijfstelling’ als eerste chip", k3b.chips.map((x) => x.chips[0]));
  ok(k3b.ketting.top === "POM-2.02" && k3b.ketting.sterk && !k3b.ketting.alg, "K3b ‘hangen die pomp aan een verroeste ketting zonder keuringslabel’ → POM-2.02 sterk, geen algemeen onderwerp ervoor", k3b.ketting);
  ok(k3b.haak.top === "BEL-2.03" && k3b.haak.sterk, "K3b ‘pal onder dat ding door … aan de haak’ → BEL-2.03 als gevaarzin (sterk)", k3b.haak);
  ok(k3b.put.top === "BUV-5.03" && k3b.put.sterk, "K3b ‘nog een monteur in de put als ze de vijzel laten lopen’ → BUV-5.03 sterk", k3b.put);
  ok(k3b.gevaar.every((x) => /:true$/.test(x)), "K3b direct gevaar: draaiende vijzel/gevarenzone, ongewenst draaien, LOTOTO", k3b.gevaar);
  ok(k3b.geenGevaar.every((x) => /:false$/.test(x)), "K3b geen direct gevaar bij fysieke belasting en biologische agentia", k3b.geenGevaar);

  // ---------------- K4: het koppelscherm ----------------
  console.log("K4 koppelscherm");
  const naarKoppel = async (werk, zin, code) => {
    await ev((code) => { App.closeModal(); App.caps.sample = null; App.startInspectie(code, "P26-168", code === "DAM" ? "Damwand · RWZI Voorbeeldstad" : "Test " + code + " · RWZI Voorbeeldstad", true); }, code || "DAM"); await wacht(300);
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
  const vouw = () => ev(() => { const A = document.querySelector(".seg.stapel button.t-A").getBoundingClientRect(); return { top: Math.round(A.top), onder: Math.round(A.bottom), h: Math.round(A.height), w: Math.round(A.width), vh: innerHeight, y: Math.round(scrollY) }; });
  const v1 = await vouw();
  ok(v1.onder <= v1.vh && v1.top >= 0 && v1.y === 0 && v1.h >= 72 && v1.w >= 96, "K4 sterk: A (Afwijking) helemaal boven de vouw op 390×844, zonder scrollen, ≥ 72 px hoog", v1);
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
    const v2 = await vouw();
    ok(v2.onder <= v2.vh && v2.top >= 0, "K4 zwak: na de tik op de regel staat A op de oordeelstap boven de vouw", v2);
  } else ok(z.label === "" || /geen/i.test(z.label), "K4 zonder aanwijzing: geen voorstel", z.label);

  // langste risicozin (SLI-3.05, 300 tekens) in de veldmodus (grotere letters): A blijft in beeld (plakt onderin)
  await ev(() => document.body.classList.add("veld"));
  await naarKoppel("ze monteren de nieuwe slibindikker", "de slibindikker zwaait aan de kraan en er zit geen stuurlijn aan", "SLI");
  const v3 = await vouw(), sli = await ev(() => App.state.inspectie.voorstel);
  ok(sli.sterk && sli.ids[0] === "SLI-3.05" && v3.onder <= v3.vh && v3.top >= 0, "K4 veldmodus + langste risicozin (SLI-3.05): A boven de vouw", { v3, ids: sli.ids });
  await ev(() => document.body.classList.remove("veld"));

  // LOTOTO: geen slot op de hoofdschakelaar → SCV-1.02 sterk; drie regels van de taak; A legt SCV-1.02 vast
  await naarKoppel("ze schakelen de vijzel af", "kast staat open, geen hangslot op de hoofdschakelaar en de elektricien zit al te sleutelen", "SCV");
  const lo = await ev(() => { const vs = App.state.inspectie.voorstel; return { taak: App.state.inspectie.taak, ids: vs.ids, sterk: vs.sterk,
    refs: [...document.querySelectorAll(".kpick:not(.kalg) .vp-ref")].map((x) => x.textContent.trim()), kop: (document.getElementById("oordeel-lab") || {}).textContent || "" }; });
  ok(/^Afschakelprotocol/.test(lo.taak) && lo.sterk && lo.ids[0] === "SCV-1.02" && lo.refs.length === 3 && lo.refs.every((r) => /^SCV-1\./.test(r)) && /SCV-1\.02/.test(lo.kop), "K4 LOTOTO-zin: sterke match SCV-1.02, drie regels van de taak, kop noemt SCV-1.02", lo);
  await p.screenshot({ path: SHOTS + "/koppel-lototo-sterk.png" });
  await p.click(".seg.stapel button.t-A"); await wacht(800);
  const lo2 = await ev(() => { const c = App.state.inspectie.cur; return { regel: c.regel_id, prio: c.actie.prio, tp: c.actie.terPlaatse, gevaar: c.actie.gevaar }; });
  ok(lo2.regel === "SCV-1.02" && lo2.prio === "direct" && !lo2.tp && !!lo2.gevaar, "K4 LOTOTO: A legt SCV-1.02 vast; onverwacht inschakelen = direct gevaar (Direct, ter plaatse nog leeg)", lo2);

  // spreektaal hangende last: alleen regels van de taak als kaart, POM-2.02 eerst en sterk
  await naarKoppel("pomp gaat d'r uit", "ze hangen die pomp aan een verroeste ketting zonder keuringslabel", "POM");
  const pk = await ev(() => { const vs = App.state.inspectie.voorstel; return { taak: App.state.inspectie.taak, ids: vs.ids, sterk: vs.sterk, refs: [...document.querySelectorAll(".kpick:not(.kalg) .vp-ref")].map((x) => x.textContent.trim()) }; });
  ok(/^Demontage/.test(pk.taak) && pk.sterk && pk.ids[0] === "POM-2.02" && pk.refs.length === 3 && pk.refs.every((r) => /^POM-2\./.test(r)), "K4 ‘verroeste ketting’: POM-2.02 sterk, drie kaarten zijn regels van de taak (geen ALG ertussen)", pk);

  // ---------------- K6: de gevallen uit afkeuring 3 (scherm) ----------------
  console.log("K6 afkeuring ronde 3");
  const vsNu = () => ev(() => { const ins = App.state.inspectie, vs = ins.voorstel; return { taak: ins.taak, ids: vs.ids, sterk: vs.sterk, reden: vs.reden,
    refs: [...document.querySelectorAll(".kpick:not(.kalg) .vp-ref")].map((x) => x.textContent.trim()), label: (document.querySelector(".kmatch") || {}).textContent || "",
    uit: [...document.querySelectorAll(".seg.stapel button")].map((x) => x.disabled) }; });
  const naA = async () => { await p.click(".seg.stapel button.t-A"); await wacht(800);
    return ev(() => { const c = App.state.inspectie.cur; return { stap: App.state.inspectie.stap, regel: c.regel_id, prio: c.actie.prio, tp: c.actie.terPlaatse, gevaar: c.actie.gevaar,
      eerste: ([...document.querySelectorAll(".otitel")][0] || {}).textContent, balk: (document.querySelector(".kgevaar, .akaart2 .gevaarbalk") || {}).textContent || "" }; }); };
  // SCV: "hangt over een scherpe rand" is een hijsband over een rand (vallende last), geen persoon over de putrand
  await naarKoppel("ze takelen de vijzel uit de put", "de hijsband is niet gekeurd en hangt over een scherpe rand", "SCV");
  const scv = await vsNu();
  ok(/^Demonteren/.test(scv.taak) && scv.ids[0] === "SCV-2.03" && scv.refs[0] === "SCV-2.03", "K6 SCV ‘hijsband niet gekeurd, hangt over een scherpe rand’ → SCV-2.03 (vallen van de last) eerst, niet SCV-2.01", scv);
  await p.screenshot({ path: SHOTS + "/k6-scv-koppel.png" });
  if (scv.sterk) { const a = await naA(); ok(a.regel === "SCV-2.03" && a.prio === "direct" && !a.tp, "K6 SCV: één tik op A legt SCV-2.03 vast, Direct, ter plaatse nog leeg", a); }
  // twee gevaren in één zin (hijsband én persoon over de rand): geen sterke match, de inspecteur kiest zelf
  await naarKoppel("ze takelen de vijzel uit de put", "de hijsband is niet gekeurd en hij hangt over de rand van de put", "SCV");
  const twee = await vsNu();
  ok(twee.sterk !== true && twee.uit.every((x) => x) && twee.refs.includes("SCV-2.01") && twee.refs.includes("SCV-2.03"), "K6 twee gevaren (hijsband + persoon over de rand): zwakke match, C/A/V uit, beide regels in beeld", twee);
  // taakchips: gescheiden werkwoorden ("draaien … proef", "zetten … aan", "veilig zetten", "onder stroom zetten")
  const chips6 = await ev(() => { const kb = App.data.kennisbank, K = WPI.koppel;
    const c = (code, zin) => K.taakRang(zin, [...new Set(kb[code].regels.map((r) => r.taak))], kb[code].regels, [kb[code].naam]).slice(0, 2).map((x) => x.id);
    return { mic: c("MIC", "ze draaien het microfilter proef"), ban: c("BAN", "ze zetten het bandfilter weer onder stroom"), sli: c("SLI", "ze zetten de slibindikker veilig"),
      cpv: c("CPV", "ze zetten de compactvijzel aan"), idv: c("IDV", "ze draaien de vijzel er weer in"), slaan: c("DAM", "ze slaan de planken erin") }; });
  ok(/^Inbedrijf/.test(chips6.mic[0] || ""), "K6 MIC ‘ze draaien het microfilter proef’ → eerste chip Inbedrijfstelling", chips6.mic);
  ok(/^Inschakelen/.test(chips6.ban[0] || ""), "K6 BAN ‘weer onder stroom’ → eerste chip Inschakelen", chips6.ban);
  ok(/^Afschakel/.test(chips6.sli[0] || ""), "K6 SLI ‘zetten de slibindikker veilig’ → eerste chip Afschakelprotocol", chips6.sli);
  ok(/^(Inschakelen|Inbedrijf)/.test(chips6.cpv[0] || "") && chips6.cpv.some((x) => /^Inbedrijf/.test(x)) && chips6.cpv.some((x) => /^Inschakelen/.test(x)), "K6 CPV ‘zetten de compactvijzel aan’ → Inschakelen en Inbedrijfstelling als chips", chips6.cpv);
  ok(/^Indraai/.test(chips6.idv[0] || "") && /^Plaatsen/.test(chips6.slaan[0] || ""), "K6 ‘draaien de vijzel er weer in’ → Indraaien; ‘slaan de planken erin’ → Plaatsen", [chips6.idv, chips6.slaan]);
  await naarKoppel("ze draaien het microfilter proef", "hij grijpt in de draaiende trommel om een doek eruit te trekken", "MIC");
  const mic = await vsNu();
  ok(/^Inbedrijf/.test(mic.taak) && mic.ids[0] === "MIC-5.03" && !mic.refs.includes("MIC-2.09"), "K6 MIC: taak Inbedrijfstelling (eerste chip), MIC-5.03 eerst, geen MIC-2.09 (demontage)", mic);
  // TRF spreektaal: "gozer staat onder de trommel die aan de kraan bungelt" → TRF-2.04 (vallen van de last), direct gevaar
  await naarKoppel("ze takelen de trommel d'r uit", "gozer staat onder de trommel die aan de kraan bungelt", "TRF");
  const trf = await vsNu();
  ok(/^Demonteren/.test(trf.taak) && trf.ids[0] === "TRF-2.04" && trf.refs[0] === "TRF-2.04" && trf.sterk, "K6 TRF ‘gozer staat onder de trommel die aan de kraan bungelt’ → TRF-2.04 eerst en sterk", trf);
  await p.screenshot({ path: SHOTS + "/k6-trf-koppel.png" });
  const trfA = await naA();
  ok(trfA.regel === "TRF-2.04" && trfA.prio === "direct" && !trfA.tp && trfA.eerste === "Wat heb je ter plaatse gedaan?", "K6 TRF + A: Direct, eerst ‘Wat heb je ter plaatse gedaan?’", trfA);
  // IDV: kruipt onder een niet vergrendelde vijzel → IDV-4.08 is direct gevaar (beknelling door restbeweging)
  await naarKoppel("ze draaien de vijzel er weer in", "de vijzel is niet vergrendeld en hij kruipt eronder om de bout te pakken", "IDV");
  const idv = await vsNu();
  ok(/^Indraai/.test(idv.taak) && idv.ids[0] === "IDV-4.08" && idv.sterk, "K6 IDV → IDV-4.08 sterk", idv);
  const idvA = await naA();
  ok(idvA.regel === "IDV-4.08" && idvA.prio === "direct" && !idvA.tp && idvA.eerste === "Wat heb je ter plaatse gedaan?" && /Direct gevaar/.test(idvA.balk), "K6 IDV-4.08 + A: Direct, rode balk, eerst ‘Wat heb je ter plaatse gedaan?’", idvA);
  await p.screenshot({ path: SHOTS + "/k6-idv-actie.png" });
  const dg6 = await ev(() => ["IDV-4.08", "KET-2.04", "DBL-4.02", "DBL-2.03", "SCV-3.10", "ROO-3.05"].map((id) => id + ":" + !!WPI.koppel.directGevaar(App.data.kennisbank[id.slice(0, 3)].regels.find((r) => r.id === id).risico, "")));
  ok(dg6.every((x) => /:true$/.test(x)), "K6 direct gevaar: restbeweging vijzel, veerkracht ketting, in het water vallen, uit de trog glijden, omvallen hoogwerker", dg6);
  // BBL/CPV/ROO: direct gevaar met een voorstel (eerder: geen voorstel, of alleen de val-regel)
  await naarKoppel("ze gaan de borstelbeluchter testdraaien", "collega staat nog in de goot bij de rotor als ze hem aanzetten", "BBL");
  const bbl = await vsNu();
  ok(/^Inbedrijf/.test(bbl.taak) && bbl.ids[0] === "BBL-5.02" && bbl.refs[0] === "BBL-5.02", "K6 BBL ‘in de goot bij de rotor als ze hem aanzetten’ → BBL-5.02 (draaiende delen) eerst, niet elektrocutie", bbl);
  await naarKoppel("ze demonteren de roosterreiniger", "hij zit beneden in het kanaal en zijn meetkastje staat te piepen", "ROO");
  const roo = await vsNu();
  ok(roo.ids[0] === "ROO-2.08", "K6 ROO ‘beneden in het kanaal, meetkastje staat te piepen’ → ROO-2.08 (besloten ruimte/gas) eerst", roo);
  // NBT: duidelijke vallende last (takel kraakt, strop doorgesleten, hangt boven zijn kop) → sterk, A boven de vouw
  await naarKoppel("ze halen de schraperarmen eruit", "de kettingtakel kraakt en de strop is half doorgesleten, onderdeel hangt boven zijn kop", "NBT");
  const nbt = await vsNu(), vn = await vouw();
  ok(/^Demonteren onderwater/.test(nbt.taak) && nbt.ids[0] === "NBT-3.03" && nbt.sterk && vn.onder <= vn.vh && vn.y === 0, "K6 NBT → NBT-3.03 sterk; A boven de vouw zonder scrollen", { nbt, vn });

  // ---------------- K7: de gevallen uit afkeuring 4 (scherm) ----------------
  console.log("K7 afkeuring ronde 4");
  // SHV: "geen touw … draait helemaal rond aan de haak" is een zwaaiende last (SHV-2.05), geen vallende last (SHV-2.03)
  await naarKoppel("ze halen de semi hydrovijzel eruit", "er zit geen touw aan, dat ding draait helemaal rond aan de haak", "SHV");
  const shv = await vsNu();
  ok(/^Demonteren Semi/.test(shv.taak) && shv.ids[0] === "SHV-2.05" && shv.refs[0] === "SHV-2.05", "K7 SHV ‘geen touw … draait helemaal rond aan de haak’ → SHV-2.05 (zwaaiende vijzel) eerst, niet SHV-2.03", shv);
  await p.screenshot({ path: SHOTS + "/k7-shv-koppel.png" });
  if (shv.sterk) { const a = await naA(); ok(a.regel === "SHV-2.05" && a.prio === "direct" && !a.tp && /Zwaaiende vijzel/.test(a.balk), "K7 SHV + A: legt SHV-2.05 vast (zwaaiende last = direct gevaar), ter plaatse nog leeg", a); }
  // BAN: kop onder de last, langere zin → BAN-2.03 sterk met ‘Waarom’, niet ‘Ook bij deze taak’
  await naarKoppel("ze trekken de bandscreen eruit", "die vent staat met z'n kop onder de bandscreen terwijl die omhoog gaat", "BAN");
  const ban = await vsNu();
  const banW = await ev(() => ({ tag: (document.querySelector(".kpick.k1 .ktag") || {}).textContent || "", waarom: (document.querySelector(".kpick.k1 .waarom") || {}).textContent || "" }));
  ok(ban.ids[0] === "BAN-2.03" && ban.sterk && /Sterke match/.test(banW.tag) && /Waarom/.test(banW.waarom), "K7 BAN ‘met z’n kop onder de bandscreen terwijl die omhoog gaat’ → BAN-2.03 sterk, met ‘Waarom’", { ban, banW });
  // NBT: zonder meter de tank in, ruikt raar → NBT-1.01 met voorstel (eerder: geen enkele aanwijzing)
  await naarKoppel("we controleren of de tank schoon is", "hij gaat zonder meter de tank in, ruikt een beetje raar daar beneden", "NBT");
  const nbt4 = await vsNu();
  ok(/^Controleren/.test(nbt4.taak) && nbt4.ids[0] === "NBT-1.01" && nbt4.sterk, "K7 NBT ‘zonder meter de tank in, ruikt raar’ → NBT-1.01 sterk", nbt4);
  const nbtA = await naA();
  ok(nbtA.regel === "NBT-1.01" && nbtA.prio === "direct" && nbtA.eerste === "Wat heb je ter plaatse gedaan?", "K7 NBT + A: Direct, eerst ‘Wat heb je ter plaatse gedaan?’", nbtA);
  // LDX: dekplaat eruit, achteruit richting het gat → LDX-2.01 (vallen in bassin) eerst, Direct
  await naarKoppel("ze takelen de flowbooster eruit", "dekplaat ligt eruit en hij loopt achteruit met de takel richting het gat", "LDX");
  const ldx = await vsNu();
  ok(ldx.ids[0] === "LDX-2.01" && ldx.refs[0] === "LDX-2.01", "K7 LDX ‘dekplaat ligt eruit … achteruit richting het gat’ → LDX-2.01 eerst (niet LDX-2.05 begeleiden)", ldx);
  if (ldx.sterk) { const a = await naA(); ok(a.regel === "LDX-2.01" && a.prio === "direct" && /Direct gevaar/.test(a.balk), "K7 LDX + A: Direct, rode balk", a); }
  // SLI: ladder niet vastgezet → val van ladder (SLI-2.10), niet ‘unit verschuift’ (SLI-2.08)
  await naarKoppel("ze bouwen de slibindikker uit", "hij klimt de ladder af de tank in met een rugzak gereedschap, ladder niet vastgezet", "SLI");
  const sli4 = await vsNu();
  ok(sli4.ids[0] === "SLI-2.10" && sli4.refs[0] === "SLI-2.10" && sli4.refs.indexOf("SLI-2.08") !== 0, "K7 SLI ‘ladder niet vastgezet’ → SLI-2.10 (val van ladder) eerst, niet SLI-2.08", sli4);
  if (sli4.sterk) { const a = await naA(); ok(a.regel === "SLI-2.10" && !/bevestigingsmiddelen/.test(a.balk), "K7 SLI + A: legt SLI-2.10 vast, label niet ‘bevestigingsmiddelen … verschuiven’", a); }
  // CHV: ‘Waarom’ zonder overlappende stukken
  await naarKoppel("ze halen de compact hydrovijzel eruit", "die knakker loopt gewoon onder de vijzel door terwijl die aan de kraan hangt", "CHV");
  const chv = await ev(() => { const w = (document.querySelector(".kpick.k1 .waarom") || {}).textContent || ""; return { ids: App.state.inspectie.voorstel.ids, w, stukken: [...w.matchAll(/“([^”]+)”/g)].map((m) => m[1]) }; });
  const zin = " die knakker loopt gewoon onder de vijzel door terwijl die aan de kraan hangt ";
  const spans = chv.stukken.map((x) => { const i = zin.indexOf(" " + x + " "); return [i, i + x.length + 1]; });
  const overlap = spans.some((a, i) => spans.some((b, j) => i !== j && a[0] >= 0 && b[0] >= 0 && a[0] < b[1] && b[0] < a[1]));
  ok(chv.ids[0] === "CHV-2.03" && chv.stukken.length >= 1 && spans.every((x) => x[0] >= 0) && !overlap, "K7 CHV ‘Waarom’: stukken uit de zin zonder overlap", chv);
  // zwakke match: nooit stil bevestigd (C/A/V uit, een oordeeltik legt niets vast); de goede regel staat wel eerst
  await naarKoppel("ze hijsen de buisvijzel erin", "het ding tolt rond aan de haak en er hangt geen lijn aan", "BUV");
  const buv = await vsNu();
  ok(buv.ids[0] === "BUV-3.05" && buv.refs[0] === "BUV-3.05", "K7 BUV ‘tolt rond aan de haak, geen lijn’ → BUV-3.05 (zwaaiend) eerst", buv);
  if (!buv.sterk) {
    ok(/Zwakke match/.test(buv.label) && buv.uit.every((x) => x), "K7 BUV zwak: label ‘Zwakke match’ en C/A/V uit", buv);
    await ev(() => App.bevestigOordeel("A")); await wacht(300);
    const na4 = await ev(() => ({ stap: App.state.inspectie.stap, regel: App.state.inspectie.cur.regel_id, o: App.state.inspectie.cur.oordeel }));
    ok(na4.stap === "koppel" && !na4.regel && !na4.o, "K7 zwak: een oordeeltik bevestigt de regel niet stil", na4);
  }
  // twijfel tussen twee regels met elk een eigen gevaarzin (≥ 3): nooit sterk, ongeacht de verhouding
  const conflict = await ev(() => { const kb = App.data.kennisbank, K = WPI.koppel;
    const r = (c, tb, z) => { const t = [...new Set(kb[c].regels.map((x) => x.taak))].find((x) => x.startsWith(tb)); return K.rangschik(z, { regels: kb[c].regels.filter((x) => x.taak === t), alg: App.onderwerpen(), generiek: [kb[c].naam, t] }); };
    const a = r("SCV", "Demonteren", "de hijsband is niet gekeurd en hij hangt over de rand van de put");
    return { top: a.top, sterk: a.sterk, tweede: a.tweede, dg: ["SHV-2.05", "DBL-2.05", "SLI-2.10"].map((id) => id + ":" + !!K.directGevaar(kb[id.slice(0, 3)].regels.find((x) => x.id === id).risico, "")) }; });
  ok(!conflict.sterk && !!conflict.tweede, "K7 twee gevaren met elk een eigen gevaarzin: geen sterke match", conflict);
  ok(conflict.dg.every((x) => /:true$/.test(x)), "K7 direct gevaar: zwaaiende last (ook boven water) en val van ladder", conflict.dg);

  // ---------------- K8: de gevallen uit afkeuring 5 ----------------
  console.log("K8 afkeuring ronde 5");
  // MIC: trommel niet geblokkeerd + arm tussen de spaken → MIC-3.09 (onverwacht draaien) eerst; NOOIT een sterke match op
  // MIC-3.04 (beknelling): die zou met één tik vastleggen zonder rode balk en zonder de ter-plaatse-vraag
  await naarKoppel("ze zetten de trommel van het microfilter in elkaar", "trommel is niet geblokkeerd en hij zit met z'n arm tussen de spaken", "MIC");
  const mic5 = await vsNu();
  ok(/^Monteren Microfilter/.test(mic5.taak) && mic5.ids[0] === "MIC-3.09" && mic5.refs[0] === "MIC-3.09" && !(mic5.sterk && mic5.ids[0] !== "MIC-3.09"), "K8 MIC ‘trommel niet geblokkeerd … arm tussen de spaken’ → MIC-3.09 eerst, geen sterke MIC-3.04", mic5);
  await p.screenshot({ path: SHOTS + "/k8-mic-koppel.png" });
  if (!mic5.sterk) {
    ok(/Zwakke match/.test(mic5.label) && mic5.uit.every((x) => x), "K8 MIC zwak: label ‘Zwakke match’, C/A/V uit", mic5);
    await ev(() => App.bevestigOordeel("A")); await wacht(300);
    const stil = await ev(() => ({ stap: App.state.inspectie.stap, regel: App.state.inspectie.cur.regel_id, o: App.state.inspectie.cur.oordeel }));
    ok(stil.stap === "koppel" && !stil.regel && !stil.o, "K8 MIC zwak: een oordeeltik bevestigt niets stil", stil);
    await p.locator(".kpick:not(.kalg)").nth(0).click(); await wacht(400);
  }
  const micA = await naA();
  ok(micA.regel === "MIC-3.09" && micA.prio === "direct" && !micA.tp && micA.eerste === "Wat heb je ter plaatse gedaan?" && /Direct gevaar/.test(micA.balk), "K8 MIC + A: MIC-3.09, Direct, ter plaatse leeg, eerst ‘Wat heb je ter plaatse gedaan?’, rode balk", micA);
  await p.screenshot({ path: SHOTS + "/k8-mic-actie.png" });
  // ROO: rolsteiger op losse platen die wiebelt → ROO-3.05 met een voorstel (eerder: niets)
  await naarKoppel("ze bouwen de roosterreiniger op", "rolsteiger staat op losse stelconplaten en wiebelt als je erop klimt", "ROO");
  const roo5 = await vsNu();
  ok(roo5.ids[0] === "ROO-3.05" && roo5.refs[0] === "ROO-3.05", "K8 ROO ‘rolsteiger … losse stelconplaten … wiebelt’ → ROO-3.05 als Voorstel", roo5);
  // LDX: rooster ligt ernaast, achteruit met de stuurlijn → LDX-3.01 (open gat) eerst, niet begeleiden
  await naarKoppel("ze hijsen de flowbooster het bassin in", "rooster van het dek ligt ernaast en hij loopt achteruit met de stuurlijn in z'n hand", "LDX");
  const ldx5 = await vsNu();
  ok(ldx5.ids[0] === "LDX-3.01" && ldx5.refs[0] === "LDX-3.01", "K8 LDX ‘rooster … ligt ernaast … achteruit met de stuurlijn’ → LDX-3.01 eerst", ldx5);
  if (ldx5.sterk) { const a = await naA(); ok(a.regel === "LDX-3.01" && a.prio === "direct" && /Direct gevaar/.test(a.balk), "K8 LDX + A: Direct, rode balk", a); }
  // pure: BAN (bijdraait/tandwiel), CPV (meet niks na), MIC demontage (omdraaien), vangnet direct gevaar, negatieve zinnen
  const k8 = await ev(() => { const kb = App.data.kennisbank, K = WPI.koppel;
    const r = (c, tb, z) => { const t = [...new Set(kb[c].regels.map((x) => x.taak))].find((x) => x.startsWith(tb)); return K.rangschik(z, { regels: kb[c].regels.filter((x) => x.taak === t), alg: App.onderwerpen(), generiek: [kb[c].naam, t] }); };
    const kort = (x) => ({ top: x.top, sterk: x.sterk, reden: x.reden, tweede: x.tweede });
    return {
      ban: kort(r("BAN", "Installatie", "ze voeren de ketting in terwijl de motor bijdraait, z'n handschoen zit bijna tussen het tandwiel")),
      cpv: kort(r("CPV", "Afschakelprotocol", "hij zet de werkschakelaar om maar meet niks na, zegt dat ie dood is")),
      mic: kort(r("MIC", "Demonteren Microfilter", "trommel zit niet vast, die kan zo omdraaien terwijl hij de bouten eruit haalt")),
      // vangnet: een regel zonder direct gevaar wint, terwijl een regel mét direct gevaar ook een gevaarzin heeft → nooit sterk
      vang: kort(r("MIC", "Monteren Microfilter", "hij zit met z'n arm tussen de flens en het frame en de trommel kan nog ronddraaien")),
      vangZin: kort(r("MIC", "Monteren Microfilter", "ze boren in het beton zonder stofmasker en de man in de put heeft geen gasmeter")),
      // negatief: alles in orde → nooit sterk; een gevaar zonder passende regel bij deze taak → nooit sterk
      netjes: kort(r("DAM", "Verwijderen damwand", "alles netjes, iedereen heeft z'n spullen aan en de hijsband is gekeurd")),
      geenRegel: kort(r("KET", "Monteren kettingreiniger", "hij zit met z'n vingers tussen de ketting terwijl de motor even bijdraait")) }; });
  ok(k8.ban.top === "BAN-3.07", "K8 BAN ‘motor bijdraait … tussen het tandwiel’ → BAN-3.07 (grijpgevaar draaiende delen) eerst", k8.ban);
  ok(k8.cpv.top === "CPV-1.03", "K8 CPV ‘meet niks na, zegt dat ie dood is’ → CPV-1.03 (gaat ervan uit dat het spanningsvrij is) eerst", k8.cpv);
  ok(k8.mic.top === "MIC-2.09", "K8 MIC demontage ‘trommel zit niet vast … kan zo omdraaien’ → MIC-2.09 eerst (niet ‘unit verschuift’)", k8.mic);
  ok(!(k8.vang.sterk && k8.vang.top !== "MIC-3.09"), "K8 vangnet: geen sterke match op een regel zonder direct gevaar als een regel mét direct gevaar ook een gevaarzin heeft", k8.vang);
  ok(k8.vangZin.top === "MIC-3.10" && !k8.vangZin.sterk && k8.vangZin.reden === "controle", "K8 vangnet: de zin noemt direct gevaar (‘geen gasmeter’), de eerste regel (stof) niet → nooit sterk, ‘controleer’", k8.vangZin);
  ok(!k8.netjes.sterk && !k8.geenRegel.sterk, "K8 negatieve zinnen (alles in orde / geen passende regel bij de taak): nooit een sterke match", k8);

  // ---------------- K9: de gevallen uit afkeuring 6 ----------------
  // Drie FOUTE sterke matches bij direct gevaar (boren op een niet geblokkeerde vijzel → stof; "zonder bokken of stempels"
  // → kantelende kraan) en één gemiste afscherming. Bewijs via het scherm (390×844): nooit een sterke match op een regel
  // zonder direct gevaar; de juiste regel staat eerst; is de match zwak, dan bevestigt een oordeeltik niets stil; na de
  // tik op de regel en A: Direct, ter plaatse leeg, eerst "Wat heb je ter plaatse gedaan?", rode balk.
  console.log("K9 afkeuring ronde 6");
  const tikRegel = (id) => p.locator(".kpick:not(.kalg)", { has: p.locator(".vp-ref", { hasText: id }) }).first().click();
  const K9 = [["ITV", "ze maken de stuwkant dicht", "hij staat op de vijzelbladen te boren en de vijzel is niet geblokkeerd", "ITV-4.05", "ITV-4.04", /^Afmonteren/],
    ["SMV", "ze bouwen het bovenlager in", "hij boort de ankers voor het bovenlager terwijl hij op de vijzelbladen staat, niks geblokkeerd", "SMV-5.06", "SMV-5.10", /^Monteren \(bovenlager/],
    ["ITV", "ze maken de stuwkant dicht", "hij boort in de stuwkant terwijl hij op de vijzel staat, vijzel kan zo wegdraaien", "ITV-4.05", "ITV-4.04", /^Afmonteren/],
    ["NBT", "ze halen de ruimerbrug eraf", "de brug is met de vijzels opgekrikt en hij kruipt eronder zonder bokken of stempels", "NBT-4.05", "NBT-4.01", /^Verwijderen ruimerbrug/],
    ["CHV", "ze laten de compact hydro proefdraaien", "afscherming van de koppeling ligt nog op de grond en hij staat er met z'n mouw vlak naast", "CHV-6.02", null, /^Inbedrijfstelling/]];
  for (const [code, werk, zin, goedId, foutId, taakRe] of K9) {
    await naarKoppel(werk, zin, code);
    const v = await vsNu();
    ok(taakRe.test(v.taak) && v.ids[0] === goedId && v.refs[0] === goedId, "K9 " + code + " ‘" + zin + "’ → " + goedId + " eerst (Voorstel)", v);
    ok(!(v.sterk && v.ids[0] !== goedId) && (!foutId || !(v.sterk && v.ids[0] === foutId)), "K9 " + code + ": geen sterke match op " + (foutId || "een andere regel"), v);
    await p.screenshot({ path: SHOTS + "/k9-" + code.toLowerCase() + "-koppel.png" });
    if (!v.sterk) {
      ok(/Zwakke match|Controleer|Klopt/i.test(v.label) && v.uit.every((x) => x), "K9 " + code + " zwak: C/A/V uit tot de inspecteur de regel aantikt", v);
      await ev(() => App.bevestigOordeel("A")); await wacht(300);
      const stil = await ev(() => ({ stap: App.state.inspectie.stap, regel: App.state.inspectie.cur.regel_id, o: App.state.inspectie.cur.oordeel }));
      ok(stil.stap === "koppel" && !stil.regel && !stil.o, "K9 " + code + " zwak: een oordeeltik zonder de regel aan te tikken legt niets vast", stil);
      await tikRegel(goedId); await wacht(400);
    }
    const a9 = await naA();
    ok(a9.regel === goedId && a9.prio === "direct" && !a9.tp && a9.eerste === "Wat heb je ter plaatse gedaan?" && /Direct gevaar/.test(a9.balk), "K9 " + code + " + A: " + goedId + ", Direct, ter plaatse leeg, eerst ‘Wat heb je ter plaatse gedaan?’, rode balk", a9);
    await p.screenshot({ path: SHOTS + "/k9-" + code.toLowerCase() + "-actie.png" });
  }
  // pure: de zwakkere van de reviewer staan nu eerst; zijn negatieve zinnen nooit sterk; taakchips bij de drijvende beluchter
  const k9p = await ev(() => { const kb = App.data.kennisbank, K = WPI.koppel;
    const takenVan = (c) => [...new Set(kb[c].regels.map((x) => x.taak))];
    const r = (c, tb, z) => { const t = takenVan(c).find((x) => x.startsWith(tb)); return K.rangschik(z, { regels: kb[c].regels.filter((x) => x.taak === t), alg: App.onderwerpen(), generiek: [kb[c].naam, t] }); };
    const kort = (x) => ({ top: x.top, sterk: x.sterk, reden: x.reden });
    const chips = (c, z) => K.taakRang(z, takenVan(c), kb[c].regels, [kb[c].naam]).slice(0, 3).map((x) => x.id);
    return {
      eerst: [["NBT", "Demonteren onderwaterwerk", "ze slijpen de armen in stukken zonder spatbril, de vonken vliegen in het rond", "NBT-3.04"],
        ["SHV", "Demonteren Semi", "vijzel glipt half uit de trog als ze hem optrekken, hij hangt alleen nog aan de bovenste strop", "SHV-2.09"],
        ["IDV", "Indraaireductor", "de vijzel draait nog na terwijl hij de koppeling losmaakt", "IDV-4.09"],
        ["POM", "Afschakelprotocol", "hij heeft de werkschakelaar uit maar de pomp staat op niveausturing en slaat zo weer aan", "POM-1.01"]].map(([c, tb, z, id]) => ({ id, ...kort(r(c, tb, z)) })),
      neg: [["SHV", "Monteren Semi", "iedereen staat netjes buiten de afzetting, stuurlijnen eraan, hijsband gekeurd"], ["KET", "Monteren kettingreiniger", "keet is netjes opgeruimd en de koffie is lekker"],
        ["CPV", "Demonteren", "hij staat in de put en de kraanmachinist ziet hem niet, geen seinman, last komt zo naar beneden"], ["DAM", "Plaatsen damwand", "die vent staat binnen de draaicirkel van de kraan achter de contragewichten"]]
        .map(([c, tb, z]) => ({ z, ...kort(r(c, tb, z)) })),
      dbl: [chips("DBL", "ze leggen de drijvende beluchter in het bassin"), chips("DBL", "de beluchter gaat het water in"), chips("DBL", "ze halen de beluchter uit het water")] }; });
  k9p.eerst.forEach((x) => ok(x.top === x.id, "K9 ‘" + x.id + "’ staat nu eerst (was 2e)", x));
  ok(k9p.neg.every((x) => !x.sterk), "K9 de negatieve zinnen van de reviewer: nooit een sterke match", k9p.neg);
  ok(/^Tewaterlating/.test(k9p.dbl[0][0]) && /^Tewaterlating/.test(k9p.dbl[1][0]) && /^Demonteren/.test(k9p.dbl[2][0]), "K9 DBL ‘in het bassin’ / ‘gaat het water in’ → Tewaterlating eerst; ‘uit het water’ → Demonteren", k9p.dbl);

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

  // vastleggen zonder antwoord op "Wat heb je ter plaatse gedaan?" kan niet; "Nog niets" alleen als eigen keuze
  await naarKoppel("ze takelen de vijzelunit eruit", "man onder zwevende last", "BUV");
  await p.click(".seg.stapel button.t-A"); await wacht(800);
  const voor = await ev(() => App.state.inspectie.waarnemingen.length);
  if (!(await ev(() => App.state.inspectie.cur.actie.tekst.trim()))) await ev(() => { App.state.inspectie.cur.actie.tekst = "Niemand onder de last; hijsplan bespreken"; });
  await p.click("text=Actievoorstel vastleggen"); await wacht(400);
  const bl = await ev(() => ({ stap: App.state.inspectie.stap, n: App.state.inspectie.waarnemingen.length, tp: App.state.inspectie.cur && App.state.inspectie.cur.actie.terPlaatse, prio: App.state.inspectie.cur && App.state.inspectie.cur.actie.prio,
    mis: (document.querySelector(".kvmis") || {}).textContent || "" }));
  ok(bl.stap === "actie" && bl.n === voor && !bl.tp && /Kies eerst wat je ter plaatse/.test(bl.mis), "K5 direct gevaar zonder antwoord: NIET vastgelegd, melding ‘Kies eerst wat je ter plaatse hebt gedaan’", bl);
  await p.screenshot({ path: SHOTS + "/actie-direct-gevaar-niet-beantwoord.png" });
  await p.locator("#kv-tp-groep .kvlak").nth(3).click(); await wacht(300);   // "Nog niets": bewuste keuze
  await p.click("text=Actievoorstel vastleggen"); await wacht(400);
  const nn = await ev(() => { const w = App.state.inspectie.waarnemingen.slice(-1)[0]; return { stap: App.state.inspectie.stap, regel: w.regel_id, tp: w.actie.terPlaatse, gekozen: !!w.actie.tpGekozen, prio: w.actie.prio, st: w.actie.status, mis: "tpMis" in w.actie }; });
  ok(nn.stap === "meer" && nn.regel === "BUV-2.03" && nn.tp === "niets" && nn.gekozen && nn.prio === "direct" && nn.st === "Voorstel" && !nn.mis, "K5 ‘Nog niets’ alleen als eigen keuze vastgelegd (open voorstel, Direct)", nn);

  // persoon in de gevarenzone van de draaiende vijzel (BUV-5.03): direct gevaar
  await naarKoppel("ze laten de vijzel proefdraaien", "er staat nog een monteur in de put als ze de vijzel laten lopen", "BUV");
  const bz = await ev(() => App.state.inspectie.voorstel);
  ok(bz.sterk && bz.ids[0] === "BUV-5.03", "K5 ‘monteur in de put als ze de vijzel laten lopen’ → BUV-5.03 sterk", bz.ids);
  await p.click(".seg.stapel button.t-A"); await wacht(800);
  const bz2 = await ev(() => { const c = App.state.inspectie.cur; return { regel: c.regel_id, prio: c.actie.prio, tp: c.actie.terPlaatse, eerste: ([...document.querySelectorAll(".otitel")][0] || {}).textContent, balk: (document.querySelector(".kgevaar") || {}).textContent || "" }; });
  ok(bz2.regel === "BUV-5.03" && bz2.prio === "direct" && !bz2.tp && bz2.eerste === "Wat heb je ter plaatse gedaan?" && /Direct gevaar/.test(bz2.balk), "K5 BUV-5.03 + A: Direct, rode balk, eerst ‘Wat heb je ter plaatse gedaan?’, niets voorgekozen", bz2);
  await p.screenshot({ path: SHOTS + "/actie-direct-gevaar-draaiende-vijzel.png" });

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
