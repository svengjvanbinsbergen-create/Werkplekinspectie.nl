# ------------------------------------------------------------ 8
h1("8. Voorstel voor de proef en te nemen besluiten")
h2("8.1 Te nemen besluiten")
p("Alles in deze tabel is een voorstel. Niets hiervan ligt vast; de kolom rechts zegt wie erover beslist. In de "
  "lopende tekst en in de concept-procedure zijn deze punten gemarkeerd als voorstel.")
tbl([
    ["Nr", "Besluit", "Voorstel", "Wie beslist"],
    ["1", "Proefdraaien met de nieuwe methode", "Ja, van maandag 16 november tot en met vrijdag 18 december 2026", "Hoofd S&M"],
    ["2", "Deelnemers en aantal", "Twee Montage Coördinatoren (elk drie WPI's) en één directielid (één WPI): zeven WPI's", "Hoofd S&M; directie over eigen deelname"],
    ["3", "Status van een proef-WPI", "Telt als de WPI van die maand; niet dubbel invoeren in AMS", "Hoofd S&M"],
    ["4", "Vast te leggen gegevens", "De set uit hoofdstuk 3 als startpunt, inclusief de velden met 'Nieuw'; na de proef schrappen wat niet werkt", "Hoofd S&M met de Montage Coördinatoren"],
    ["5", "Alleen bevindingen over eigen monteurs", "Ja; geen veld voor onderaannemers of derden (5.2)", "Hoofd S&M"],
    ["6", "Onderscheid Conform / Geen afwijking waargenomen", "Alleen een beschreven waarneming telt als positieve bevinding; het rapport toont waargenomen, alleen bevestigd en niet beoordeeld", "Hoofd S&M"],
    ["7", "Classificatie", "Veertien klassen (5.10)", "Hoofd S&M met de QHSE-Manager"],
    ["8", "Programma bij werk van korte duur", "Grens van een maand; voorrang op risico; spreiding over producten; elke ploeg minimaal één keer per jaar (5.5)", "Hoofd S&M"],
    ["9", "Aandeel onaangekondigd", "Minimaal een derde van de WPI's", "Hoofd S&M"],
    ["10", "Inspectie door een monteur", "Toegestaan onder verantwoordelijkheid van een coördinator; telt niet voor diens maandnorm", "Hoofd S&M"],
    ["11", "Toetser van acties", "Standaard de inspecteur zelf", "Hoofd S&M"],
    ["12", "Termijnen voor acties", "Planmatig: uiterlijk einde volgend kwartaal. Escalatie naar Hoofd S&M bij meer dan twee weken te laat", "Hoofd S&M"],
    ["13", "Terugvaloptie", "Terugvalformulier en Word-sjabloon maken vóór de start; achteraf invoeren binnen twee werkdagen", "Hoofd S&M"],
    ["14", "Opslag in het QMS", "Rapporten maandelijks, actieoverzicht per kwartaal, door het Hoofd S&M", "Hoofd S&M"],
    ["15", "Bewaartermijn", "Vijf jaar voor programma, rapporten, actieoverzicht en trendanalyse", "Hoofd S&M met de QHSE-Manager"],
    ["16", "Trendanalyse", "Jaarlijks in januari over het afgelopen jaar; daarnaast een kwartaaloverzicht", "Hoofd S&M; directie voor de directiebeoordeling"],
    ["17", "Kennisbank bijwerken na wijziging van een TRA", "Binnen twee weken, door de QHSE-Manager", "QHSE-Manager met Hoofd S&M"],
    ["18", "Gedeeld account, foto's en AVG", "Eerst navragen bij IT en laten toetsen (hoofdstuk 7); tot dan geen gezichten op foto's", "Directie"],
    ["19", "Evaluatie en besluit over AMS", "Evaluatie op maandag 21 december 2026 in het coördinatorenoverleg. Bij een positieve uitkomst vervalt AMS voor WPI's per 1 januari 2027 en wordt de procedure vastgesteld", "Hoofd S&M"],
], [500, 2300, 4164, 2100])

h2("8.2 Opzet van de proef (voorstel)")
tbl([
    ["Onderdeel", "Voorstel"],
    ["Periode", "Maandag 16 november tot en met vrijdag 18 december 2026"],
    ["Wie", "Twee Montage Coördinatoren (elk drie WPI's) en één directielid (één WPI, zelfstandig of met een coördinator). Het Hoofd Service & Montage is eigenaar van de proef. QHSE ondersteunt en verzamelt de uitkomsten"],
    ["Aantal", "Zeven WPI's, op minimaal vier verschillende producten. Minimaal één buiten bij slecht weer, één op een locatie met zwak bereik (terugvalformulier) en één bewust korte WPI van ongeveer tien minuten"],
    ["Vooraf", "Terugvalformulier en Word-sjabloon maken. Een kwartier uitleg per inspecteur, met één proefgesprek op kantoor. Monteurs informeren. Bij twee gewone WPI's in AMS de tijd opnemen als vergelijking"],
    ["WPI's in AMS tijdens de proef", "Een WPI in de proef telt als de WPI van die maand en wordt als rapport in het QMS opgeslagen. Lukt een proef-WPI niet, dan doet de inspecteur die maand een WPI in AMS"],
    ["Acties", "Acties uit de proef zijn echte acties en komen vanaf 23 november op de agenda van het coördinatorenoverleg"],
], [2200, 6864], first_bold=True)

h2("8.3 Waar we op letten")
p("De verwachting is dat de nieuwe methode de inspecteur niet meer moeite kost dan de checklist in AMS. Dat is niet "
  "aangetoond. De proef meet het met drie dingen: de duur van de inspectie, het aantal waargenomen regels en het "
  "oordeel van de inspecteur zelf.")
tbl([
    ["Vraag", "Hoe we het meten", "Voorstel: wanneer zijn we tevreden"],
    ["Kost het de inspecteur meer moeite?", "Duur van de inspectie (K5) naast de twee gemeten WPI's in AMS; tijd voor nalezen en herstellen van het rapport; oordeel van de inspecteur na elke WPI (S3) en in de evaluatie", "Niet langer op locatie dan nu; nalezen en herstellen binnen tien minuten; de inspecteurs vinden het niet zwaarder dan AMS"],
    ["Gaat het dieper?", "Aantal waargenomen regels per rapport, naast alleen bevestigd en niet beoordeeld (A1, A4); aantal positieve bevindingen en gekoppelde TRA-regels", "Elk rapport bevat minimaal één positieve bevinding en minimaal één waargenomen TRA-regel"],
    ["Klopt wat Claude vastlegt?", "Aantal correcties van de inspecteur per rapport: verkeerde regel, classificatie of samenvatting", "Geen rapport waarin een waarneming of oordeel staat dat de inspecteur niet heeft gegeven"],
    ["Werkt het op de telefoon?", "Opmerkingen bij S3; aantal keren terugvalformulier", "Spraak is buiten bruikbaar, of het terugvalformulier vangt het op"],
    ["Voldoet elk rapport aan VCA 7.1?", "Controle van de zeven rapporten op positieve bevindingen, afwijkingen, verbeteracties, uitvoeringsverantwoordelijken en tijdsduur", "Zeven van de zeven"],
    ["Zijn de velden bruikbaar?", "Welke velden bleven leeg of riepen vragen op", "Lijst van te schrappen of aan te passen velden"],
    ["Wat vinden de monteurs?", "Reactie in het gesprek (G2) en navraag door de coördinator", "Geen bezwaar tegen foto's en vastlegging"],
], [2300, 3664, 3100], first_bold=True)

h2("8.4 Na de proef (voorstel)")
bl("Maandag 21 december 2026, coördinatorenoverleg: evaluatie aan de hand van de zeven rapporten, het dashboard en de tabel in 8.3.")
bl("Daarna beslist het Hoofd Service & Montage. Bij een positieve uitkomst wordt de procedure uit hoofdstuk 5 vastgesteld, vervalt AMS voor WPI's per 1 januari 2027 en start het inspectieprogramma 2027 in het dashboard.")
bl("Bij twijfel verlengen we de proef met het eerste kwartaal van 2027 en blijft AMS zolang de terugvaloptie.")
bl("Als de rapporten goed zijn, leggen we er twee met de procedure voor aan de certificerende instelling, met de vraag of dit het oordeel over de WPI's en het ontbreken van de trendanalyse wegneemt.")

h1("Bijlagen")
p("Bijlage 1: voorbeeldrapport WPI-20261105-DAM-C2 (VOORBEELD — fictieve data), afzonderlijk bestand.", space_after=40)
p("Bijlage 2: WPI-dashboard, nog in aanbouw, met trendoverzichten op een fictieve dataset van 15 WPI's "
  "(VOORBEELD — fictieve data), afzonderlijk bestand.")

UIT = "/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.docx"
build(template="/home/claude/wpi/build/sjabloon.docx",
      title="Werkplek-\ninspecties",
      subtitle="Voorstel nieuwe methode",
      body_xml="\n".join(B),
      output=UIT, cover_size=72, work="/home/claude/wpi/build/_nb_build")
