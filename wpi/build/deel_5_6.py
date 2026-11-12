# ------------------------------------------------------------ 5
add(pagebreak())
h1("5. Procedure Werkplekinspecties, versie 2.0 concept (herziening van versie 1.0)")
p("Dit hoofdstuk is de herziene procedure. De opbouw en de afspraken van versie 1.0 zijn behouden waar ze goed zijn; "
  "AMS is vervangen door de nieuwe werkwijze. Na de proef en na de besluiten uit 8.1 wordt dit hoofdstuk als "
  "afzonderlijk document in het QMS gezet. De tabellen uit hoofdstuk 3 worden dan bijlage A (vast te leggen gegevens). "
  "Waar een termijn, aantal of regel nog een voorstel is, staat dat erbij.", italic=True, color=BLAUW)
tbl([
    ["Documentbeheer", ""],
    ["Versie", "2.0 concept (vervangt versie 1.0 na vaststelling)"],
    ["Eigenaar", "Hoofd Service, Montage & Aftersales (hierna: Hoofd Service & Montage)"],
    ["Opgesteld door / goedgekeurd door / datum", "In te vullen bij vaststelling"],
    ["Reviewfrequentie", "Jaarlijks"],
], [3000, 6064], first_bold=True, zebra=False)

h2("5.0 Wat is gewijzigd ten opzichte van versie 1.0")
tbl([
    ["Onderdeel", "Versie 1.0", "Versie 2.0", "Waarom"],
    ["Hulpmiddel", "Checklist invullen in AMS", "Inspreken en fotograferen in de Claude-app; de skill wpi-begeleider maakt het rapport. AMS vervalt voor WPI's na het besluit in 8.1", "De auditor vond de WPI's niet duidelijk genoeg; AMS kent geen koppeling met het werk"],
    ["Checklist", "Eén vaste checklist", "Negen algemene onderwerpen plus de risicoregels uit de TRA van de taak die wordt uitgevoerd", "De inspectie moet gaan over het werk dat op dat moment gebeurt"],
    ["Positieve bevindingen", "Niet beschreven; een bevinding was alleen een verbeterpunt, afwijking of onveilige situatie", "Beschreven: oordeel Conform met waarneming, en 'wat ging opvallend goed'", "VCA 7.1 vraagt dat de procedure en het verslag de positieve bevindingen bevatten"],
    ["Directie-inspectie", "'conform VCA 7.2'", "Verwijzing naar VCA 7.1", "Fout in versie 1.0: de deelname van directieleden staat in 7.1"],
    ["Onderaannemers", "Waarnemingen ook bespreken met de leidinggevende van de onderaannemer", "Bevindingen worden alleen over eigen monteurs vastgelegd (zie het oranje kader in 5.2)", "Keuze voor de nieuwe methode; onderaannemers worden beoordeeld via hun eigen procedure"],
    ["Acties", "Actiehouder, termijn, prioriteit", "Daarbij: actienummer en toetser", "VCA 7.1 vraagt in het actieplan de verantwoordelijken voor uitvoering en toetsing"],
    ["Classificatie", "'Per categorie', categorieën niet benoemd", "Veertien vaste klassen", "VCA 7.2: bevindingen worden geclassificeerd"],
    ["Trendanalyse", "Aantallen, meest voorkomende bevindingen, doorlooptijd, trends", "Daarbij: positieve bevindingen, TRA-maatregelen, oorzaken, te ondernemen acties en de follow-up daarvan", "VCA 7.2 vraagt positieve en negatieve bevindingen, acties en follow-up"],
    ["Werk van korte duur", "Niet benoemd", "Regels voor de keuze van de werkplek in het inspectieprogramma", "Voetnoot 10 bij VCA 7.1"],
    ["Inspectie door een monteur", "Niet beschreven", "Beschreven als mogelijkheid", "Derde minimumeis van VCA 7.1"],
    ["Waargenomen of alleen bevestigd", "Niet aanwezig", "Per regel zichtbaar: waargenomen, alleen bevestigd of niet beoordeeld", "Een auditor moet kunnen zien bij welke maatregelen feitelijk is gekeken"],
    ["Terugvaloptie", "Niet aanwezig", "Terugvalformulier en Word-sjabloon", "Afhankelijkheid van app en bereik"],
    ["Registraties", "In AMS; bewaartermijnen niet ingevuld", "WPI-rapport in het QMS; bewaartermijnen ingevuld (voorstel)", "Aantoonbaarheid bij de audit"],
    ["Ongewijzigd", "Frequenties (coördinator maandelijks, directie vier per jaar); bezoek bij voorkeur niet of kort van tevoren aankondigen; direct gevaarlijke situaties stoppen en melden; een bevinding is pas afgerond na verificatie; bespreking in het coördinatorenoverleg op maandag; trendanalyse als input voor directiebeoordeling en het volgende inspectieprogramma; rolverdeling", "Overgenomen", "Deze afspraken voldoen en zijn bekend bij de inspecteurs"],
], [1500, 2500, 2764, 2300], first_bold=True)

h2("5.1 Doel")
p("Deze procedure beschrijft hoe Noardling B.V. werkplekinspecties (WPI's) uitvoert binnen de afdeling Service & "
  "Montage. De procedure waarborgt dat:", space_after=40)
bl("VGM-risico's op de werkplek tijdig worden gesignaleerd en gecorrigeerd;")
bl("de operationeel leidinggevenden en de directie aantoonbaar betrokken zijn bij het toezicht op veilig werken;")
bl("bevindingen, positieve en negatieve, structureel worden opgevolgd en gebruikt voor verbetering van het VGM-beheersysteem, waaronder de TRA's.")
vca("7.1 Worden periodiek werkplekinspecties uitgevoerd door operationeel leidinggevenden? (*/**/P)\n"
    "Doelstelling: Het in stand houden dan wel bevorderen van een veilige werkomgeving en werkwijze.\n"
    "Minimumeisen:\n"
    "• Er is een procedure, waarin de volgende zaken staan beschreven:\n"
    "    – de uitvoering van de inspecties;\n"
    "    – de positieve bevindingen van de inspecties;\n"
    "    – de opvolging van waargenomen verbeterpunten;\n"
    "    – gebruik van de checklist.\n"
    "• Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden.(10)\n"
    "• Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.\n"
    "• Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, uit te "
    "voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de uitvoering.\n"
    "• Er is een actieplan met daarin:\n"
    "    – actiepunten, voortkomende uit de inspecties;\n"
    "    – de verantwoordelijken voor de uitvoering en toetsing;\n"
    "    – tijdsplanning.\n"
    "• De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een "
    "werklocatie.\n"
    "Documenten:\n"
    "• Procedure met betrekking tot de uitvoering van de werkplekinspecties en het inspectieprogramma\n"
    "• Verslagen van de uitgevoerde inspecties en de follow-up hiervan\n"
    "(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar "
    "verhouding wordt behaald, rekening houdend met de risico's.",
    "VCA 2026/6.1, hoofdstuk 7 VGM-inspecties, vraag 7.1 (letterlijke tekst)")
vca("7.2 Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)? (-/□/P)\n"
    "Doelstelling: Het identificeren van basisoorzaken van structurele verbetermogelijkheden.\n"
    "Minimumeisen:\n"
    "• Bevindingen worden geclassificeerd.\n"
    "• Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.\n"
    "Documenten:\n"
    "• Trendanalyse\n"
    "• Overzicht verbeteracties",
    "VCA 2026/6.1, vraag 7.2 (letterlijke tekst)")

h2("5.2 Toepassingsgebied")
p("Deze procedure geldt voor alle werkzaamheden die door of namens de afdeling Service & Montage van Noardling B.V. "
  "worden uitgevoerd, uitsluitend voor de Service & Montage-werkzaamheden op projectlocaties: montage, onderhoud, "
  "revisie en storingswerk.")
keuze("Versie 1.0 liet de inspecteur waarnemingen ook bespreken met de leidinggevende van de onderaannemer. In de nieuwe "
      "methode leggen we in het WPI-rapport alleen bevindingen vast over het werk van onze eigen monteurs. Er is geen "
      "veld voor onderaannemers of derden. Wat blijft: ziet de inspecteur bij een ander een direct gevaarlijke situatie, "
      "dan laat hij die stoppen, spreekt hij de betrokkene of diens leidinggevende aan en meldt hij het volgens de "
      "procedure incidentenrapportage. De beoordeling van onderaannemers loopt via de Procedure Inkoop van Diensten. "
      "Bevindingen over de locatie van de opdrachtgever die ons eigen werk raken, bijvoorbeeld een werkplek die niet is "
      "gereinigd, leggen we vast als bevinding over onze eigen voorbereiding.",
      "Keuze Noardling (voorstel, zie 8.1): alleen eigen monteurs")

h2("5.3 Definities")
tbl([
    ["Begrip", "Betekenis in deze procedure"],
    ["Werkplekinspectie (WPI)", "Geplande, vastgelegde inspectie van een werkplek of werksituatie, gericht op de naleving van VGM-afspraken. Bestaat uit een algemene observatie en een toetsing van het lopende werk aan de maatregelen uit de TRA"],
    ["VGM-inspectie directie", "Werkplekinspectie waaraan een directielid deelneemt of die een directielid zelf uitvoert, conform VCA 7.1"],
    ["Operationele werkplek", "Een projectlocatie waar monteurs van Service & Montage aan het werk zijn"],
    ["Werk van korte duur", "Werk dat korter dan een maand op dezelfde locatie duurt (voorstel)"],
    ["Operationeel leidinggevende", "De Montage Coördinator en het Hoofd Service & Montage"],
    ["Inspecteur", "Degene die de WPI uitvoert: een Montage Coördinator, het Hoofd Service & Montage, een directielid of, onder verantwoordelijkheid van een Montage Coördinator, een ervaren monteur"],
    ["Kennisbank", "De 21 product-TRA's in de vorm waarin de skill wpi-begeleider ze gebruikt: per product de fasen, taken, risicoregels en maatregelen. Elke risicoregel heeft een vast nummer (productcode, fase, volgnummer)"],
    ["Checklist", "De negen algemene onderwerpen (A t/m I) plus de risicoregels uit de kennisbank die horen bij de taak die wordt uitgevoerd"],
    ["Bevinding", "Wat de inspecteur tijdens de WPI vaststelt: een positieve bevinding, een verbeterpunt, een afwijking of een onveilige situatie"],
    ["Positieve bevinding", "Een maatregel of werkwijze die de inspecteur in orde heeft gezien en heeft beschreven (oordeel Conform), of een opmerking onder 'wat ging opvallend goed'"],
    ["Afwijking", "Een afgesproken maatregel wordt niet nageleefd of ontbreekt"],
    ["Verbeterpunt", "De situatie voldoet, maar kan veiliger of beter"],
    ["Waargenomen / alleen bevestigd / niet beoordeeld", "Waargenomen: de inspecteur heeft bij de regel een eigen waarneming beschreven. Alleen bevestigd: de regel is afgedaan met het antwoord op de afsluitvraag. Niet beoordeeld: de inspecteur heeft de regel niet gezien"],
    ["Buiten TRA", "Een waarneming van een risico dat in de TRA van het product niet voorkomt"],
    ["Actieoverzicht", "Het overzicht van alle acties uit WPI's met actiehouder, toetser, termijn en status, bijgehouden in het WPI-dashboard. Dit is het actieplan in de zin van VCA 7.1"],
    ["Toetser", "Degene die verifieert dat een maatregel daadwerkelijk is uitgevoerd"],
    ["Coördinatorenoverleg", "Wekelijks overleg op maandagochtend onder leiding van het Hoofd Service & Montage, waarin onder andere WPI-bevindingen worden besproken en opvolging wordt vastgelegd"],
], [2500, 6564], first_bold=True)

h2("5.4 Verantwoordelijkheden")
tbl([
    ["Functie", "Verantwoordelijkheid"],
    ["Directielid", "Neemt minimaal eenmaal per kwartaal deel aan een WPI op een werklocatie (minimaal 4 VGM-inspecties per kalenderjaar). Toont zichtbaar commitment. Ziet toe op de opvolging van bevindingen. Bespreekt de jaarlijkse trendanalyse in de directiebeoordeling"],
    ["Hoofd Service & Montage", "Eigenaar van deze procedure en eindverantwoordelijk voor de uitvoering van het inspectieprogramma binnen Service & Montage. Stelt het inspectieprogramma vast en deelt het met de inspecteurs. Voert aanvullend WPI's uit naar eigen inzicht. Bewaakt tijdige opvolging in het coördinatorenoverleg. Slaat de rapporten op in het QMS. Stelt de jaarlijkse trendanalyse op"],
    ["Montage Coördinator", "Voert minimaal 1 WPI per maand uit (gezamenlijk minimaal 24 per jaar). Bespreekt de waarnemingen ter plaatse met de monteurs. Brengt de bevindingen in tijdens het coördinatorenoverleg. Is toetser van de acties uit zijn eigen WPI's, tenzij anders vastgelegd. Draagt de verantwoordelijkheid voor WPI's die een monteur onder zijn naam uitvoert"],
    ["Monteur", "Werkt mee aan de uitvoering van inspecties. Signaleert onveilige situaties en meldt deze conform de geldende procedures. Voert acties uit die aan hem zijn toegewezen"],
    ["QHSE-Manager", "Ondersteunt bij de methode en de trendanalyse. Verwerkt voorstellen tot wijziging van een TRA en werkt daarna de kennisbank bij. Is niet verantwoordelijk voor de uitvoering van de inspecties"],
], [2400, 6664], first_bold=True)

h2("5.5 Inspectieprogramma")
vca("• Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden.(10)\n"
    "• De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een "
    "werklocatie.\n"
    "(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar "
    "verhouding wordt behaald, rekening houdend met de risico's.", "VCA 7.1, minimumeisen 2 en 6 en voetnoot 10")
tbl([
    ["Wie", "Frequentie", "Keuze van de werkplek"],
    ["Elke Montage Coördinator", "Minimaal 1 WPI per maand (gezamenlijk minimaal 24 per jaar)", "Een lopende werklocatie of werksituatie binnen Service & Montage; zie de regels hieronder"],
    ["Directielid", "Minimaal 1 per kwartaal, 4 per kalenderjaar", "Een projectlocatie; bij voorkeur een project met hijswerk, een besloten ruimte of werk bij open water"],
    ["Hoofd Service & Montage", "Aanvullend, naar eigen inzicht", "Vrij"],
    ["Project dat langer dan een maand op dezelfde locatie loopt (voorstel)", "Minimaal 1 WPI per maand op die werkplek", "Door de coördinator van het project; telt mee voor zijn maandnorm"],
], [2800, 2800, 3464], first_bold=True)
p("Het werk van Service & Montage duurt op de meeste locaties enkele dagen tot enkele weken. Voetnoot 10 is daarom op "
  "ons werk van toepassing. Het programma haalt de frequentie naar verhouding met de volgende regels voor de keuze van "
  "de werkplek.", space_after=40)
bl("Projecten met hijswerk, een besloten ruimte, werken op hoogte of bij open water, of werk aan een installatie die is veiliggesteld gaan voor.")
bl("In een kalenderjaar worden zo veel mogelijk verschillende producten en fasen geïnspecteerd. Het dashboard laat zien welke producten en welke TRA-maatregelen nog niet zijn waargenomen; de inspecteur gebruikt dat bij zijn keuze.")
bl("Elke monteursploeg wordt minimaal één keer per jaar geïnspecteerd.")
p("Het programma wordt vastgesteld door het Hoofd Service & Montage en gedeeld met de inspecteurs. Het staat in het "
  "WPI-dashboard: per maand en per inspecteur het geplande aantal, met daartegenover de uitgevoerde WPI's. Een gemiste "
  "maand wordt in het eerstvolgende coördinatorenoverleg besproken en in de maand erna ingehaald. De uitkomsten van de "
  "jaarlijkse trendanalyse zijn input voor het programma van het volgende jaar.")
keuze("De VCA laat open hoe het programma voor werk van korte duur eruitziet. De grens van een maand, de voorrangsregels "
      "op risico, de spreiding over producten en de regel dat elke ploeg minimaal één keer per jaar wordt geïnspecteerd "
      "zijn een voorstel voor onze invulling.", "Keuze Noardling (voorstel, zie 8.1): programma bij werk van korte duur")

h2("5.6 Voorbereiding")
bl("De inspecteur selecteert een lopende werklocatie of werksituatie binnen Service & Montage volgens het inspectieprogramma.")
bl("Hij kondigt het bezoek bij voorkeur niet (of slechts kort) van tevoren aan, zodat een representatief beeld ontstaat. Voorstel: minimaal een derde van de WPI's is onaangekondigd; het rapport vermeldt of de WPI was aangekondigd.")
bl("Hij neemt zijn telefoon mee met de Claude-app, aangemeld op het Noardling-account, en opent de WPI-projectmap.")

h2("5.7 Uitvoering")
vca("• Er is een procedure, waarin de volgende zaken staan beschreven:\n"
    "    – de uitvoering van de inspecties;\n"
    "    – de positieve bevindingen van de inspecties;\n"
    "    – de opvolging van waargenomen verbeterpunten;\n"
    "    – gebruik van de checklist.", "VCA 7.1, minimumeis 1")
p("De inspecteur start de inspectie in de WPI-projectmap. De skill wpi-begeleider leidt hem door de onderdelen "
  "hieronder. De volgorde is vrij; aan het eind hebben alle onderdelen een waarde.")
tbl([
    ["Onderdeel", "Inhoud", "Vastlegging (bijlage A)"],
    ["1. Kop", "Inspecteur en functie, soort inspectie, deelnemend directielid, datum en tijd, opdrachtgever, locatie, projectnummer, soort werk, werk van korte duur, aangekondigd of niet, aanwezige monteurs, omstandigheden", "K1–K12"],
    ["2. Product en taak", "De inspecteur noemt het product en de taak waar de monteurs mee bezig zijn. Daarmee ligt vast welke risicoregels uit de kennisbank de checklist vormen. Het WPI-nummer wordt toegekend", "P1–P3"],
    ["3. Algemene observatie", "De negen onderwerpen A t/m I, waaronder de naleving van afgesproken beheersmaatregelen en het gebruik van PBM, orde en netheid, en de staat en keuring van gereedschappen en arbeidsmiddelen. Onder A worden vier vaste vragen gesteld: VGM-projectplan, TRA, werkvergunning, LMRA", "V1–V4, O1, O2"],
    ["4. Taakgerichte toetsing", "Per risicoregel van de taak noemt Claude de maatregelen uit de TRA. De inspecteur beschrijft wat hij ziet en geeft een oordeel. Bij een afwijking legt hij vast welke maatregel ontbreekt en wat de oorzaak is. Waarnemingen die bij geen regel passen krijgen de aanduiding Buiten TRA", "R1–R7"],
    ["5. Foto's", "Elke foto krijgt een nummer, een toelichting van de inspecteur en een koppeling aan een onderwerp of risicoregel. Geen herkenbare personen in beeld, tenzij dat voor de bevinding nodig is", "F1–F4"],
    ["6. Gesprek met de monteurs", "De inspecteur bespreekt zijn waarnemingen, ook de positieve, ter plaatse met de aanwezige monteur(s) en legt hun reactie en ideeën vast", "G1–G4"],
    ["7. Bevindingen en acties", "Zie 5.8", "B1–B15"],
    ["8. Afsluiten", "Claude stelt de afsluitvraag voor alle regels zonder waarneming. De inspecteur bevestigt de samenvatting", "S1, S2, A1–A4"],
], [1700, 6064, 1300], first_bold=True)
p("Direct gevaarlijke situaties worden ter plaatse gestopt en, indien nodig, gemeld conform de procedure "
  "incidentenrapportage. De inspecteur legt dit vast met prioriteit 'direct' en 'werk stilgelegd: ja'.")
lab("Regels voor de uitvoering")
bl("Waarneming en oordeel komen van de inspecteur. Claude vult geen waarneming of oordeel in dat de inspecteur niet heeft uitgesproken.")
bl("Positieve bevindingen: het oordeel 'Conform' wordt alleen gegeven als de inspecteur heeft beschreven wat hij zag. Daarnaast noemt hij minimaal één ding dat opvallend goed ging, of zegt hij uitdrukkelijk dat er niets opviel.")
bl("Regels waarover de inspecteur niets zegt, krijgen na de afsluitvraag 'Geen afwijking waargenomen' of 'Niet beoordeeld'.")
bl("Het rapport toont per regel of die is waargenomen, alleen bevestigd of niet beoordeeld, en telt dat op in de samenvatting. Zo kan een auditor zien bij welke maatregelen feitelijk is gekeken.")
bl("Namen van monteurs staan alleen in de kop van het rapport, niet bij een bevinding.")
bl("Een korte WPI is geldig.")
lab("Inspectie door een monteur")
vca("• Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.", "VCA 7.1, minimumeis 3")
keuze("Een ervaren monteur mag een WPI uitvoeren op een werkplek waar hij zelf niet aan het werk is. De Montage "
      "Coördinator onder wiens verantwoordelijkheid dat gebeurt staat in de kop, leest het rapport na en is toetser van "
      "de acties. Zo'n WPI telt mee in de spreiding over werkplekken, maar niet voor de maandelijkse norm van de "
      "coördinator zelf.", "Keuze Noardling (voorstel, zie 8.1): inspectie door een monteur")

h2("5.8 Vastleggen van bevindingen en het inspectieverslag")
vca("• Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, uit te "
    "voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de uitvoering.",
    "VCA 7.1, minimumeis 4")
p("Per onderwerp en per risicoregel worden het oordeel, een korte toelichting in de woorden van de inspecteur en "
  "eventuele foto's vastgelegd. Per afwijking en per verbeterpunt daarnaast: omschrijving, classificatie, verbeteractie, "
  "actiehouder, toetser, overeengekomen termijn en prioriteit.")
tbl([
    ["Prioriteit", "Betekenis", "Termijn"],
    ["Direct", "Gevaar dat niet kan wachten. Wordt ter plaatse gestopt en opgelost", "Tijdens de inspectie"],
    ["Kort", "Moet snel worden opgelost, maar het werk kan veilig doorgaan", "Binnen twee weken"],
    ["Planmatig", "Vraagt een aanpassing in voorbereiding, middelen, instructie of TRA", "Datum in overleg; voorstel: uiterlijk het einde van het volgende kwartaal"],
], [1700, 4664, 2700], first_bold=True)
p("Na de bevestiging van de inspecteur maakt Claude het inspectieverslag (WPI-rapport) als Word-document met negen vaste "
  "onderdelen: 1 Kop, 2 Samenvatting, 3 Algemene observatie, 4 Taakgerichte toetsing (alle regels van de taak), "
  "5 Positieve bevindingen, 6 Bevindingen en acties, 7 Gesprek met de monteurs, 8 Foto's met toelichting, "
  "9 Gegevenstabel. De inspecteur leest het rapport na en laat fouten in dezelfde chat herstellen.")
keuze("De VCA schrijft geen vorm of hulpmiddel voor. De koppeling aan de product-TRA, de negen algemene onderwerpen, de "
      "foto's, de vaste indeling van het rapport en het gebruik van Claude zijn onze eigen invulling.",
      "Keuze Noardling (voorstel, zie 8.1): vorm van de inspectie en het verslag")

h2("5.9 Opvolging")
vca("• Er is een actieplan met daarin:\n"
    "    – actiepunten, voortkomende uit de inspecties;\n"
    "    – de verantwoordelijken voor de uitvoering en toetsing;\n"
    "    – tijdsplanning.", "VCA 7.1, minimumeis 5")
p("Elke afwijking en elk verbeterpunt leidt tot een actie met een nummer (WPI-nummer plus volgnummer). Alle acties staan "
  "in het actieoverzicht in het WPI-dashboard.", space_after=40)
bl("Bevindingen uit alle WPI's worden besproken in het wekelijkse coördinatorenoverleg op maandag. Per bevinding worden vastgelegd: status (open, in behandeling, afgerond, vervallen), actiehouder en termijn, uitgevoerde maatregel(en) en verificatie.")
bl("Een bevinding wordt pas als afgerond geregistreerd nadat de toetser heeft geverifieerd dat de maatregel daadwerkelijk is uitgevoerd. Hij legt vast hoe hij dat heeft gezien: een foto, een document of een waarneming bij een volgende WPI.")
bl("De afhandeling wordt vastgelegd in het actieoverzicht en in het verslag van het coördinatorenoverleg.")
bl("Een actie die vervalt krijgt de status Vervallen met de reden.")
bl("Voorstel: is een actie meer dan twee weken te laat, dan beslist het Hoofd Service & Montage over een nieuwe termijn of een andere actiehouder. Dat wordt bij de actie vastgelegd.")
bl("Een voorstel om een TRA aan te passen gaat als actie naar de QHSE-Manager. Na wijziging van de TRA wordt de kennisbank bijgewerkt (5.12).")

h2("5.10 Classificatie en trendanalyse")
vca("• Bevindingen worden geclassificeerd.\n"
    "• Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.",
    "VCA 7.2, minimumeisen")
p("Elke beoordeelde regel, positief en negatief, krijgt een van de volgende veertien klassen. Risicoregels uit de TRA "
  "hebben hun klasse al in de kennisbank; bij andere bevindingen stelt Claude een klasse voor en bevestigt de inspecteur.")
tbl([
    ["Classificatie", "Classificatie", "Classificatie"],
    ["PBM", "Orde en netheid", "Gedrag en werkwijze"],
    ["Veiligstellen-LOTOTO", "Gevaarlijke stoffen en hygiëne", "Omgeving en afzetting"],
    ["Hijsen", "Besloten ruimte en gas", "Milieu"],
    ["Werken op hoogte of bij water", "Noodvoorzieningen", "TRA onvolledig"],
    ["Arbeidsmiddelen en keuring", "Documenten en voorbereiding", ""],
], [3021, 3021, 3022], zebra=False)
p("De trendanalyse wordt minimaal eenmaal per jaar gemaakt door het Hoofd Service & Montage, ondersteund door de "
  "QHSE-Manager, op basis van de uitgevoerde WPI's. Voorstel: in januari over het afgelopen kalenderjaar. Zij bevat:",
  space_after=40)
bl("het aantal WPI's ten opzichte van het programma;")
bl("de meest voorkomende bevindingen per classificatie, positief en negatief;")
bl("de TRA-maatregelen die het vaakst afwijken, de oorzaken en de herhaalde bevindingen;")
bl("welk deel van de regels is waargenomen, alleen bevestigd of niet beoordeeld, en welke maatregelen nooit zijn waargenomen;")
bl("de doorlooptijd van openstaande bevindingen;")
bl("trends over de tijd;")
bl("de te ondernemen acties, elk met actiehouder en termijn, en de stand van de acties uit de vorige trendanalyse (follow-up).")
p("De resultaten worden besproken in het coördinatorenoverleg en vormen input voor de directiebeoordeling en het "
  "volgende inspectieprogramma. De acties uit de trendanalyse komen in het actieoverzicht. Voorstel: daarnaast bekijkt "
  "het Hoofd Service & Montage elk kwartaal met de Montage Coördinatoren het dashboard en kiezen zij onderwerpen voor "
  "toolbox en instructie.")
keuze("De VCA vraagt een classificatie en een jaarlijkse trendanalyse met acties en follow-up, maar schrijft de indeling "
      "niet voor. De veertien klassen, het kwartaaloverzicht en de analyse van TRA-maatregelen, oorzaken en blinde "
      "vlekken zijn onze eigen invulling.", "Keuze Noardling (voorstel, zie 8.1): indeling en inhoud van de trendanalyse")

h2("5.11 Als Claude op locatie niet beschikbaar is")
p("Geen bereik, een lege telefoon of een storing is geen reden om een WPI over te slaan.")
tbl([
    ["Situatie", "Werkwijze"],
    ["Geen bereik of storing tijdens één inspectie", "De inspecteur gebruikt het terugvalformulier WPI (één A4, op papier in de bus en als pdf op de telefoon) met dezelfde onderdelen: kop, negen onderwerpen, ruimte voor waarnemingen bij het werk, acties met actiehouder en termijn. Foto's maakt hij met de camera van de telefoon. Binnen twee werkdagen voert hij de inspectie zelf in via de skill, die dan de risicoregels van de taak naloopt. Het rapport vermeldt 'achteraf ingevoerd' en de datum van de inspectie"],
    ["Claude langer dan twee weken niet bruikbaar", "De inspecteur maakt het rapport met het Word-sjabloon WPI-rapport uit het QMS, dat dezelfde negen onderdelen heeft. De risicoregels van de taak haalt hij uit de kennisbank, die als pdf per product in het QMS staat. Het Hoofd Service & Montage houdt het actieoverzicht in die periode bij in het verslag van het coördinatorenoverleg"],
], [2600, 6464], first_bold=True)
p("Het terugvalformulier, het Word-sjabloon en de pdf's van de kennisbank bestaan nog niet. Voorstel: ze worden vóór de "
  "start van de proef gemaakt. De termijnen van twee werkdagen en twee weken zijn een voorstel.",
  italic=True, color=BLAUW)

h2("5.12 Registraties")
tbl([
    ["Registratie", "Omschrijving en plaats", "Beheer", "Bewaartermijn (voorstel)"],
    ["Inspectieprogramma", "Jaarplanning WPI's per inspecteur, gepland en uitgevoerd. In het WPI-dashboard; jaarlijks als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["WPI-rapport (inspectieverslag)", "Per inspectie, inclusief bevindingen, foto's en acties. Gemaakt in de WPI-projectmap in Claude; maandelijks opgeslagen in het QMS als Word en pdf", "Inspecteur maakt; Hoofd S&M slaat op", "5 jaar"],
    ["Actieoverzicht", "Alle acties met actiehouder, toetser, termijn, status en verificatie. In het WPI-dashboard; elk kwartaal als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["Verslag coördinatorenoverleg", "Bespreking en opvolging van bevindingen", "Hoofd S&M", "Volgens het QMS"],
    ["Trendanalyse WPI's", "Jaarrapportage met aantallen, bevindingen per classificatie, trends, acties en follow-up. In het QMS", "Hoofd S&M", "5 jaar"],
    ["Kennisbank", "TRA's per product met versiedatum. In de WPI-projectmap in Claude; pdf per product in het QMS", "QHSE-Manager", "Actuele versie plus de vorige"],
    ["Ingevuld terugvalformulier", "Bijlage bij het WPI-rapport in het QMS", "Inspecteur", "Gelijk aan het rapport"],
], [2000, 3764, 1700, 1600], first_bold=True)
p("Het QMS is de plaats waar de registraties voor de audit staan. De Claude-omgeving is het gereedschap waarmee ze worden "
  "gemaakt. Wijzigt een TRA, dan werkt de QHSE-Manager het bijbehorende bestand in de kennisbank bij en past hij de "
  "versiedatum aan (voorstel: binnen twee weken). De nummers van bestaande risicoregels blijven gelijk; een nieuwe regel "
  "krijgt een nieuw nummer, een vervallen nummer wordt niet opnieuw gebruikt.")
keuze("De VCA noemt geen bewaartermijn; versie 1.0 had de termijnen niet ingevuld. Voorstel: vijf jaar, langer dan één "
      "certificatieperiode van drie jaar, zodat een auditor de vorige periode kan inzien. Ook het maandelijks opslaan "
      "in het QMS door het Hoofd Service & Montage is een voorstel.",
      "Keuze Noardling (voorstel, zie 8.1): bewaartermijn en opslag")

h2("5.13 Gerelateerde documenten")
p("Methodiek TRA; de 21 product-TRA's; Procedure VGM-projectplan; LMRA-procedure; Verslagformulier coördinatorenoverleg; "
  "procedure incidentenrapportage; Procedure Inkoop van Diensten. Alle documenten staan in het QMS.")

# ------------------------------------------------------------ 6
add(pagebreak())
h1("6. Dekking van de VCA-eisen 7.1 en 7.2")
p("Per minimumeis en per deelpunt staat waar hij is ingevuld en wat de auditor te zien krijgt. De eerste kolom bevat de "
  "letterlijke tekst van de checklist. 'Rapport' verwijst naar de negen vaste onderdelen van het WPI-rapport "
  "(bijlage 1). 'Dashboard' verwijst naar de onderdelen van het WPI-dashboard (bijlage 2, nog in aanbouw): programma, "
  "oordelen, classificatie, TRA-maatregelen, blinde vlekken en acties. Verwijzingen als K2 of B9 zijn velden uit "
  "hoofdstuk 3; T-nummers zijn trends uit hoofdstuk 4.")
DW = [2700, 1900, 2264, 2200]
DK = ["Eis (letterlijke tekst checklist)", "Waar ingevuld", "Waar zichtbaar", "Bewijsstuk voor de auditor"]


def dek(titel, rijen):
    add(_kn(para(titel, bold=True, color=BLAUW, space_after=40)))
    tbl([DK] + rijen, DW, size=16)


dek("VCA 7.1: Worden periodiek werkplekinspecties uitgevoerd door operationeel leidinggevenden?", [
    ["Er is een procedure, waarin [is] beschreven: de uitvoering van de inspecties", "Methode: hoofdstuk 2\nProcedure: 5.6, 5.7, 5.11", "Rapport: volgt de negen vaste onderdelen\nDashboard: –", "Procedure Werkplekinspecties; een WPI-rapport dat de beschreven werkwijze volgt"],
    ["[...] de positieve bevindingen van de inspecties", "Methode: 3.4 (oordeel Conform), B14\nProcedure: 5.3, 5.7", "Rapport: onderdeel 5 Positieve bevindingen\nDashboard: oordelen", "Procedure 5.3 en 5.7; onderdeel 5 van elk rapport"],
    ["[...] de opvolging van waargenomen verbeterpunten", "Methode: 3.7\nProcedure: 5.9", "Rapport: onderdeel 6 Bevindingen en acties\nDashboard: acties", "Procedure 5.9; actieoverzicht; verslagen coördinatorenoverleg"],
    ["[...] gebruik van de checklist", "Methode: 2.1, 3.3, 3.4\nProcedure: 5.3 (definitie), 5.7", "Rapport: onderdelen 3 en 4, met alle regels van de taak\nDashboard: TRA-maatregelen", "Procedure 5.7; kennisbank per product; onderdelen 3 en 4 van elk rapport"],
    ["Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel leidinggevenden.(10)", "Methode: K2, K3, K5, K6; T1\nProcedure: 5.4, 5.5", "Rapport: onderdeel 1 Kop\nDashboard: programma (gepland en uitgevoerd per maand per inspecteur)", "Inspectieprogramma; rapporten per maand per coördinator"],
    ["(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar verhouding wordt behaald, rekening houdend met de risico's.", "Methode: K8; T2\nProcedure: 5.5", "Rapport: onderdeel 1 Kop (werk van korte duur ja/nee)\nDashboard: programma, blinde vlekken", "Procedure 5.5 met de regels voor de keuze van de werkplek; overzicht van bezochte projecten en producten"],
    ["Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een operationeel leidinggevende.", "Methode: K2\nProcedure: 5.7", "Rapport: onderdeel 1 Kop (inspecteur en verantwoordelijke coördinator)\nDashboard: –", "Procedure 5.7; rapport met beide namen in de kop, als het is toegepast"],
    ["Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen", "Methode: O2, R2, R3, B14\nProcedure: 5.7, 5.8", "Rapport: onderdeel 5; oordeel Conform in onderdelen 3 en 4\nDashboard: oordelen", "Elk WPI-rapport"],
    ["[...] geconstateerde afwijkingen", "Methode: R2, R3, B2\nProcedure: 5.8", "Rapport: onderdelen 3, 4 en 6\nDashboard: oordelen, classificatie", "Elk WPI-rapport"],
    ["[...] uit te voeren verbeteracties", "Methode: B7\nProcedure: 5.8, 5.9", "Rapport: onderdeel 6\nDashboard: acties", "Elk WPI-rapport, onderdeel 6"],
    ["[...] uitvoeringsverantwoordelijken", "Methode: B8\nProcedure: 5.8", "Rapport: onderdeel 6 (actiehouder)\nDashboard: acties", "Elk WPI-rapport, onderdeel 6"],
    ["[...] en de bepaling van de tijdsduur voor de uitvoering", "Methode: B4, B10\nProcedure: 5.8", "Rapport: onderdeel 6 (prioriteit en termijn)\nDashboard: acties", "Elk WPI-rapport, onderdeel 6"],
    ["Er is een actieplan met daarin: actiepunten, voortkomende uit de inspecties", "Methode: B1\nProcedure: 5.9", "Rapport: onderdelen 6 en 9\nDashboard: acties", "Actieoverzicht (elk kwartaal als pdf in het QMS)"],
    ["[...] de verantwoordelijken voor de uitvoering en toetsing", "Methode: B8, B9\nProcedure: 5.9", "Rapport: onderdeel 6 (actiehouder en toetser)\nDashboard: acties", "Actieoverzicht; afgeronde acties met de wijze van verificatie"],
    ["[...] tijdsplanning", "Methode: B10, B11, B12; T9\nProcedure: 5.8, 5.9", "Rapport: onderdeel 6 (termijn)\nDashboard: acties (termijn, status, datum afgerond, te laat)", "Actieoverzicht; verslagen coördinatorenoverleg"],
    ["De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een werklocatie.", "Methode: K3, K4; T1\nProcedure: 5.4, 5.5", "Rapport: onderdeel 1 Kop (soort inspectie, deelnemend directielid)\nDashboard: programma (directie per kwartaal)", "Vier rapporten per jaar met een directielid in de kop, één per kwartaal"],
    ["Document: Procedure met betrekking tot de uitvoering van de werkplekinspecties en het inspectieprogramma", "Methode: hoofdstuk 5\nProcedure: geheel; programma in 5.5", "Rapport: –\nDashboard: programma", "Procedure Werkplekinspecties versie 2.0 en het inspectieprogramma in het QMS"],
    ["Document: Verslagen van de uitgevoerde inspecties en de follow-up hiervan", "Methode: hoofdstuk 3\nProcedure: 5.8, 5.9, 5.12", "Rapport: het rapport zelf\nDashboard: acties", "WPI-rapporten en actieoverzicht in het QMS; verslagen coördinatorenoverleg"],
])
dek("VCA 7.2: Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)?", [
    ["Vraag: trendanalyse van bevindingen (positieve en negatieve)", "Methode: hoofdstuk 4; T3, T12\nProcedure: 5.10", "Rapport: onderdeel 9 Gegevenstabel (bron)\nDashboard: oordelen, classificatie", "Trendanalyse WPI's [jaar], met positieve en negatieve bevindingen"],
    ["Doelstelling: Het identificeren van basisoorzaken van structurele verbetermogelijkheden.", "Methode: R4, R5; T5, T6, T7, T11\nProcedure: 5.10", "Rapport: onderdelen 4 en 6 (maatregel, oorzaak)\nDashboard: TRA-maatregelen", "Trendanalyse: oorzaken en herhaalde bevindingen"],
    ["Bevindingen worden geclassificeerd.", "Methode: B3, R2\nProcedure: 5.10", "Rapport: classificatie bij elke regel in onderdelen 3, 4, 6 en 9\nDashboard: classificatie", "Elk rapport; de veertien klassen in procedure 5.10"],
    ["Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.", "Methode: hoofdstuk 4; T9, T11\nProcedure: 5.10", "Rapport: –\nDashboard: alle onderdelen; acties uit de trendanalyse onder acties", "Trendanalyse WPI's [jaar] met acties en de stand van de acties uit het vorige jaar; verslag directiebeoordeling"],
    ["Document: Trendanalyse", "Procedure: 5.10, 5.12", "Dashboard: bron voor de analyse", "Trendanalyse WPI's [jaar] in het QMS"],
    ["Document: Overzicht verbeteracties", "Procedure: 5.9, 5.12", "Dashboard: acties", "Actieoverzicht in het QMS"],
])
p("Wat de auditor bij de eerstvolgende audit nog niet kan zien: een trendanalyse over een heel jaar en de follow-up van "
  "acties uit een vorige trendanalyse. Bij invoering per 1 januari 2027 bestaat de eerste volledige jaaranalyse in "
  "januari 2028. Tot die tijd tonen we de procedure, het dashboard met de gegevens tot dan toe en een eerste analyse over "
  "de periode sinds de start.")
