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
//  Eerlijk over de cijfers: de sets "ronde 1", "kritiek", "vers", "blind", "blind2", "blind3", "kritiek3", "blind4" en
//  "blind5" zijn (na hun eerste meting) gebruikt om de woordenlijst bij te stellen; ze zeggen dus vooral dat er niets
//  terugvalt. Alleen "blind6" is nooit op afgestemd. Eerste metingen op zinnen die de woordenlijst nog niet kende:
//  blind3 top 3 10/12 · blind4 25/30 (1 foute sterke match) · blind5 29/30 (2 foute sterke matches) · blind6 14/16
//  (0 fout). Samen voor blind4-6: 68/76 = 89% in de top 3 en 3 foute sterke matches op 48 sterke (6%).
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
    return CASES.map(([code, werk, taakBegin, zin, regel, tag]) => {
      const regels = kb[code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      const taak = taken.find((t) => t.startsWith(taakBegin));
      const tv = WPI.koppel.taakRang(werk, taken, regels, [kb[code].naam]).slice(0, 2).map((x) => x.id);
      const r = WPI.koppel.rangschik(zin, { regels: regels.filter((x) => x.taak === taak), alg, generiek: [kb[code].naam, taak || ""] });
      const top3 = r.lijst.filter((x) => !x.alg).slice(0, 3).map((x) => x.id);
      return { code, werk, zin, regel, taak, set: tag || "ronde 1", taakOk: !!taak && tv[0] === taak, tv, top3, rang: top3.indexOf(regel), sterk: r.sterk, top: r.top, reden: r.reden };
    });
  }, CASES.map((c) => [c[0], c[1], c[2], c[3], c[4], c[5]]));
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
  const fouteSterke = res.filter((x) => x.sterk && x.top !== x.regel);
  [...new Set(res.map((x) => x.set))].forEach((set) => { const d = res.filter((x) => x.set === set);
    console.log(`  set ${set.padEnd(8)} n=${d.length} · top 3 ${d.filter((x) => x.rang >= 0).length} · eerste ${d.filter((x) => x.rang === 0).length} · sterk ${d.filter((x) => x.sterk).length} (fout ${d.filter((x) => x.sterk && x.top !== x.regel).length}) · taakchip eerste ${d.filter((x) => x.taakOk).length}`); });
  console.log(`  regel in top 3: ${goed.length}/${res.length} (${pct}%) · taak = eerste chip: ${taakGoed.length}/${res.length} (${pctT}%) · foute sterke matches: ${fouteSterke.length}`);
  ok(res.length >= 15, "K3 tabel heeft ≥ 15 zinnen (" + res.length + ")");
  ok(pct >= 90, "K3 ≥ 90% van de zinnen heeft de verwachte regel in de top 3 (" + pct + "%)");
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
