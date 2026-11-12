
===== 01-veldinspectie =====
## Inleiding
De genoemde veldapps zijn sterker dan WPI in **bewijslijn, locatie, actie-opvolging, offline synchronisatie en conditionele invoer**. Ze zijn meestal checklist- of ticketgestuurd; dat moeten we niet overnemen. Wat wél kan: hun interactiepatronen gebruiken om onze “momentopname + gesprek + waarneming” sneller, herleidbaarder en beter te laten werken. AI blijft bij ons voorstel, nooit oordeel.

## SafetyCulture (iAuditor)
**Functie/patroon:** inspectie starten, vragenlijst doorlopen, foto’s toevoegen, actie aanmaken, rapport delen, offline werken.  
**Gebruik:** scherm met “Start inspection”; kaarten per vraag met ja/nee/n.v.t., foto-icoon en “Add action”; na afloop een samenvatting en PDF.  
**Waarom werkt het:** duidelijke voortgang, bewijs per bevinding en acties direct vastleggen.  
**Toepassing WPI:** na “Wat zie je?” een fotokaart met annotatie en chips “Voorstel TRA-regel”; inspecteur bevestigt of wijzigt. Bij A/V opent direct een actiekaart met eigenaar, toetser en termijn.  
**Grens/risico:** dit is de checklist-valkuil. Geen verplichte vragenlijst; alleen waargenomen regels tonen. Foto’s van monteurs: AVG, blur/retentie. Moeite: midden.

## Fieldwire
**Functie/patroon:** werkplek-/plattegrondweergave, pins, taken, foto’s en offline markups.  
**Gebruik:** tik op een plattegrond, zet een pin, open taakkaart, voeg foto toe, markeer met pijl of cirkel, status “open/closed”.  
**Waarom werkt het:** ruimtelijke context maakt terugvinden en overdragen makkelijk.  
**Toepassing WPI:** een eenvoudige “werkplekkaart” of locatiefoto met pin per waarneming; bij “Waar hoort dit bij?” ziet de inspecteur een pin en foto, geen plattegrondbeheer.  
**Grens/risico:** plattegrondonderhoud is overhead; niet elke WPI heeft tekening nodig. AVG bij locatie en personen. Moeite: midden.

## PlanRadar
**Functie/patroon:** tickets/afwijkingen met pin, foto, toewijzing, workflow en rapportage.  
**Gebruik:** “Add ticket”, pin op plan, foto, omschrijving, verantwoordelijke, deadline; statusbalk en commentaar.  
**Waarom werkt het:** afwijking wordt een volgbare actie, niet een losse notitie.  
**Toepassing WPI:** onze A/V-actie als ticket: foto, waarneming, actiehouder, toetser, termijn, status “wacht op toetsing”. Alleen bij A/V, niet bij C.  
**Grens/risico:** ticketbureaucratie en schijnprecisie. AI mag geen ticket invullen; inspecteur bevestigt. Moeite: midden.

## Procore
**Functie/patroon:** projectcontext, daily logs, observaties, foto’s, rechten en rapportage.  
**Gebruik:** daglog met weer, personeel, foto’s en notities; observatiekaart met verantwoordelijke en status.  
**Waarom werkt het:** context wordt automatisch meegegeven, waardoor rapporten herleidbaar zijn.  
**Toepassing WPI:** bij start inspectie automatisch locatie, taak, datum, inspecteur en monteurs uit de opdracht; inspecteur ziet “Context: RWZI X, taak Y” en hoeft alleen afwijkingen te bevestigen.  
**Grens/risico:** enterprise-zwaarte; niet alle modules overnemen. Rechten en AVG streng houden. Moeite: hoog.

## GoCanvas
**Functie/patroon:** mobiele formulieren met conditionele logica, offline, handtekening en PDF.  
**Gebruik:** formulier met alleen relevante velden; bij “Afwijking” verschijnen actievelden; handtekeningvak; “Submit”.  
**Waarom werkt het:** minder ruis doordat vervolgvragen conditioneel zijn.  
**Toepassing WPI:** onze gespreksflow conditioneel maken: alleen bij A/V actieblok; alleen bij “nog iets gezien” de loop opnieuw; handtekening pas na bevestiging.  
**Grens/risico:** formulierdenken. Houd het gesprek leidend; geen verplichte checklist. Moeite: laag/midden.

## Fulcrum
**Functie/patroon:** configureerbare velddata, records, GPS, foto’s, offline sync en herhaalbare secties.  
**Gebruik:** “+ record”, GPS-punt, foto, velden, “Save and add another”; syncstatus per record.  
**Waarom werkt het:** snel meerdere waarnemingen op één locatie vastleggen.  
**Toepassing WPI:** “Nog iets gezien?” maakt een nieuwe waarneming met dezelfde context; GPS alleen als hulpmiddel, niet als bewijs.  
**Grens/risico:** datamodel wordt snel complex; GPS is privacygevoelig en niet altijd nauwkeurig. Moeite: midden.

## Snagmaster
**Functie/patroon:** snag/afwijking snel vastleggen met foto, annotatie, toewijzing en rapport.  
**Gebruik:** “New snag”, foto maken, markeren, korte tekst, verantwoordelijke, status open/closed.  
**Waarom werkt het:** minimale invoer voor maximale bewijskracht.  
**Toepassing WPI:** A/V-scherm met grote knop “Leg afwijking vast”; foto eerst, dan korte tekst, dan actie. Positieve bevindingen krijgen dezelfde snelle foto-route.  
**Grens/risico:** snag-apps richten zich op fouten; VCA 7.1 vraagt ook positieve bevindingen. Moeite: laag.

## ArcGIS Survey123
**Functie/patroon:** kaartgebaseerde formulieren, offline, locatie, herhaalvragen en analyse.  
**Gebruik:** kaart openen, locatie kiezen, formulier invullen, foto toevoegen, “Send later” bij offline.  
**Waarom werkt het:** locatie en trendanalyse worden vanzelf mogelijk.  
**Toepassing WPI:** trendanalyse per locatie/type installatie; dashboard toont “Afwijkingen per RWZI/gemaal” zonder dat de inspecteur extra velden invult.  
**Grens/risico:** GIS-complexiteit en privacy. Niet als hoofd-UI voor handschoenen. Moeite: hoog.

## Top-5 aanbevelingen
1. **Foto-first bewijs met annotatie** (SafetyCulture/Snagmaster/Fieldwire): één waarneming = één foto + korte tekst + bevestiging. Moeite: midden. Impact: hoog.  
2. **A/V-actie als ticket met toetsstatus** (PlanRadar/Procore): eigenaar, toetser, termijn, “wacht op toetsing”. Moeite: midden. Impact: hoog.  
3. **Conditionele gespreksflow, geen checklist** (GoCanvas): alleen relevante vervolgstappen bij A/V of “nog iets gezien”. Moeite: laag/midden. Impact: hoog.  
4. **Automatische context en syncstatus** (Procore/Fulcrum): locatie/taak/datum auto-vullen; offline badge “nog niet verzonden”. Moeite: midden. Impact: midden/hoog.  
5. **Positieve bevindingen even snel vastleggen** (Snagmaster/SafetyCulture): “Wat ging goed?” met foto en één tik. Moeite: laag. Impact: midden.  

Zo blijven we een gespreksapp met bewijs en acties — geen checklist-app.

===== 02-ai-notulist =====
## Inleiding
De WPI-app is een momentopname: de inspecteur ziet, toetst en bevestigt. AI mag daarom alleen ondersteunen bij vastleggen, structureren en terugvinden. Elke AI-suggestie heet in de app **“Voorstel”** en wordt pas waarheid na bevestiging door de inspecteur. Onderstaande ambient scribes en notulisten laten zien hoe je van gesprek naar gestructureerd verslag komt, zonder dat AI een oordeel of waarneming verzint. Voor VCA 2026/6.1 eis 7.1 en 7.2 is vooral herleidbaarheid belangrijk: bron, bevestiging, actie, toetser en trend.

## Abridge
**Functie/patroon:** ambient klinische documentatie: gesprek opnemen, conceptnotitie maken en elke notitieregel koppelen aan bewijs in het transcript/audio.  
**UI:** clinicus start opname, ziet een duidelijke opnamestatus, stopt, krijgt een conceptverslag in secties en kan via “linked evidence” terug naar het fragment. Daarna reviewen, aanpassen en ondertekenen.  
**Waarom:** het neemt schrijfwerk weg, maar houdt de professional eigenaar van de tekst; bronlinks maken controle snel.  
**WPI-toepassing:** in “Gesprek met monteurs” en “Wat zie je?” komt een optionele knop **“Neem gesprek op”** met zichtbare consent-stap. Na stoppen ziet de inspecteur een **Voorstel gespreksverslag** met fragmentlinks. Hij bevestigt “wat ging goed”, vult zelf C/A/V in en maakt acties. De auditor kan later bronnen terugvinden.  
**Grens/risico:** lawaai en dialecten geven fouten; ambient opnemen vraagt AVG-grondslag, doelbinding, bewaartermijn en duidelijke stopknop. Geen always-on. Review kost tijd.

## Nuance DAX Copilot
**Functie/patroon:** ambient vastleggen en een conceptnotitie in de bestaande workflow aanbieden; de clinicus reviewt en ondertekent.  
**UI:** opnameknop, verwerkingsstatus, conceptnotitie in het EHR, aanpassen en ondertekenen. De kracht zit in integratie in het werkproces, niet in een los chatvenster.  
**Waarom:** de gebruiker blijft in zijn flow; AI levert een concept, geen eindbesluit.  
**WPI-toepassing:** in de stap “Waar hoort dit bij?” toont de app na inspreken een **Voorstel waarneming** en een **Voorstel TRA-regel**. De inspecteur kiest zelf C/A/V en “welke maatregel gezien”. Bij A/V verschijnt “Wat moet er gebeuren?” met een **Voorstel actie**, maar actiehouder, toetser en termijn worden handmatig bevestigd.  
**Grens/risico:** cloud- en leveranciersafhankelijkheid, Nederlandse vaktaal en slecht bereik. AI mag nooit automatisch een oordeel invullen; alleen na expliciete bevestiging.

## Suki
**Functie/patroon:** spraakassistent met dictatie en ambient documentatie; de clinicus spreekt in en reviewt een concept.  
**UI:** grote microfoonknop, opnamemodus, daarna een conceptnotitie met correctiemogelijkheid. Voor zover bekend zijn schermnamen anders, maar het patroon is “spreek in → concept → bevestig”.  
**Waarom:** één grote spraakknop werkt met handschoenen en haast; de gebruiker hoeft niet te typen.  
**WPI-toepassing:** op het inspectiescherm komt een extra grote **“Spreek in”**-knop. De inspecteur zegt bijvoorbeeld: “Ik zie geen valbeveiliging bij de vijzel.” De app toont een **Voorstel waarneming** en vraagt: “Klopt dit?” met knoppen **Bevestig**, **Pas aan**, **Verwijder**. Foto blijft verplicht bij “Wat zie je?”.  
**Grens/risico:** lawaai veroorzaakt foutieve tekst; spraakcommando’s kunnen per ongeluk triggeren. Daarom geen automatische C/A/V en geen actie zonder bevestiging.

## Otter.ai
**Functie/patroon:** live transcriptie, sprekerlabels, samenvatting en actiepunten uit vergaderingen.  
**UI:** deelnemer start opname, ziet live transcript, sprekersnamen, highlights en na afloop een samenvatting met actiepunten. Regels zijn aanklikbaar en doorzoekbaar.  
**Waarom:** live tekst geeft houvast; actiepunten worden zichtbaar zonder dat iemand ze achteraf uit zijn hoofd moet reconstrueren.  
**WPI-toepassing:** in “Gesprek met monteurs” ziet de inspecteur een live transcript met labels **Inspecteur** en **Monteur**. Hij tikt een regel aan en kiest **“Goed voorbeeld”** of **“Actie voorstel”**. AI mag een actie als **Voorstel** tonen; de inspecteur bevestigt actiehouder, toetser en termijn.  
**Grens/risico:** sprekerherkenning faalt bij lawaai; transcript kan gevoelig zijn. Alleen opnemen met consent, toegang per rol en bewaartermijn. Actiepunten zijn geen oordelen.

## Granola
**Functie/patroon:** AI-notitieboek dat meeluistert en jouw getypte notities combineert tot “enhanced notes”; geen bot die de vergadering binnenkomt.  
**UI:** desktop-app, knop “Start listening”, tijdens gesprek typt de gebruiker steekwoorden; na afloop verschijnen samenvatting, notities en transcript. Granola is vooral desktop/Mac-gericht; mobiele details zou ik niet als zeker aannemen.  
**Waarom:** menselijke notities ankeren de AI; minder intrusief dan een meetingbot.  
**WPI-toepassing:** voor de inspecteur met haast: tijdens “Wat zie je?” typt of dicteert hij twee steekwoorden, bijvoorbeeld “pomp – geen bord – nat”. Na de ronde toont de app **Voorstel samenvatting** naast zijn eigen notities. Hij bevestigt of corrigeert; C/A/V blijft handwerk.  
**Grens/risico:** apparaat, batterij en offline werking; audio-opname vraagt AVG en duidelijke uitleg. AI kan te veel interpreteren; bronnotities moeten zichtbaar blijven.

## Fireflies.ai
**Functie/patroon:** meetingassistent die opneemt, transcribeert, samenvat, actiepunten extraheert en doorzoekbaar maakt.  
**UI:** bot joint of opname start, daarna transcript, samenvatting, actiepunten en zoekfunctie.  
**Waarom:** automatische capture en gestructureerde follow-up besparen tijd, mits de gebruiker controle houdt.  
**WPI-toepassing:** niet als bot in de fysieke inspectie, maar als patroon voor het **actie-overzicht**: na bevestigde A/V toont de app een **Voorstel actielijst** uit het gesprek. De inspecteur bevestigt actie, actiehouder, toetser en termijn. Het dashboard en de trendanalyse gebruiken alleen bevestigde data voor eis 7.2.  
**Grens/risico:** een opnamebot is in een WPI-context al snel te veel; GDPR en transparantie zijn kritisch. AI mag nooit zelf een afwijking of actiestatus vaststellen.

## Top-5 aanbevelingen
1. **Expliciete opnamesessie met consent in “Gesprek met monteurs”** — moeite: midden; impact: hoog.  
2. **“Voorstel + bevestig”-patroon met bronlink naar audio/transcript/foto** — moeite: midden; impact: hoog.  
3. **Grote handschoenvriendelijke spraakknop en offline buffer voor “Wat zie je?”** — moeite: hoog; impact: hoog.  
4. **AI-actie-extractie pas na handmatige C/A/V, met actiehouder, toetser en termijn** — moeite: laag/midden; impact: midden/hoog.  
5. **DPIA, bewaartermijnen, rolgebaseerde toegang en geen always-on ambient** — moeite: hoog; impact: hoog.

===== 03-spraak-eerst =====
## Inleiding
Voor WPI is spraak geen vervanging van de inspecteur, maar een manier om met handschoenen, lawaai en weinig schermtijd toch snel en herleidbaar vast te leggen. Onderscheid drie patronen: commando’s (Siri/Assistant), dictatie (Wispr Flow/Whisper) en push-to-talk (Zello/WhatsApp). AI mag nooit een waarneming of oordeel verzinnen: transcripten en suggesties heten in de app **“Voorstel”** en de inspecteur bevestigt. Audio kan persoonsgegevens bevatten; standaard lokaal opslaan, korte bewaartermijn en geen cloud zonder DPIA.

## Siri
**Functie/patroon:** handsfree commando’s, dictatie en Shortcuts. **Werking:** “Hé Siri” of zijknop; gesproken feedback en bevestiging op scherm. **Waarom:** systeembreed, weinig handelingen, werkt met handschoenen als telefoon bereikbaar is. **In WPI:** Shortcut “Start WPI-inspectie” opent direct het scherm “Wat zie je?” en start dictatie. Inspecteur ziet grote mic-knop, waveform en tekstballon; na stoppen verschijnt transcript als **Voorstel** met “Klopt”/“Pas aan”. C/A/V blijft handmatig. **Grens:** lawaai en Nederlands zijn zwakke punten; Siri mag nooit oordelen. Shortcuts voor eigen app vereisen ontwikkeling; exacte ondersteuning moet worden getest. **Moeite:** midden.

## Google Assistant
**Functie/patroon:** spraakcommando’s, routines en dicteren via Gboard. **Werking:** “Ok Google”, gesproken antwoord, grote suggestiechips. **Waarom:** snel starten zonder typen; Android-breed. **In WPI:** “Ok Google, WPI-notitie” opent de app in “Wat zie je?” met opnameknop. Na inspreken toont de app een transcriptkaart met label **Voorstel** en knoppen “Bevestig” en “Bewerk”. **Grens:** cloudafhankelijk, minder betrouwbaar bij lawaai; geen automatische classificatie. **Moeite:** midden.

## Apple CarPlay
**Functie/patroon:** vereenvoudigde auto-interface met grote tegels, weinig tekst en Siri. **Werking:** groot startscherm, beperkte apps, stuurknop voor Siri. **Waarom:** lage cognitieve belasting en grote raakvlakken. **In WPI:** niet op de werkplek gebruiken, maar als ontwerppatroon voor een “handschoenmodus”: één scherm met drie enorme knoppen “Nieuwe waarneming”, “Actie” en “Afronden”, plus gesproken prompt. **Grens:** CarPlay is voor voertuigen, niet voor industriële inspectie; niet claimen dat het op locatie werkt. **Moeite:** laag.

## Android Auto
**Functie/patroon:** idem: grote tegels, spraak via Assistant, minimale afleiding. **Werking:** kaarten met grote iconen, spraakknop. **Waarom:** consistent en handsfree. **In WPI:**zelfde “handschoenmodus”-patroon; op Android kan een grote zwevende PTT-knop bovenaan blijven staan. **Grens:** geen bewijs dat Android Auto zelf op bouwlocaties bruikbaar is. **Moeite:** laag.

## WhatsApp-spraakberichten
**Functie/patroon:** ingedrukt houden om op te nemen, loslaten om te verzenden; waveform, duur en playback. **Werking:** grote mic-knop, opnemen, eventueel vergrendelen, beluisteren. **Waarom:** zeer bekend en snel; geen typen. **In WPI:** in het scherm “Wat zie je?” een grote knop “Houd in om waar te nemen”. Inspecteur spreekt 10–20 seconden; app toont golfvorm, timer en “Stop”. Daarna verschijnt audio plus transcript als **Voorstel**; inspecteur bevestigt of bewerkt. **Grens:** gebruik geen consumenten-WhatsApp voor inspectiedata; audio is persoonsgegeven en live delen breekt herleidbaarheid. **Moeite:** midden.

## Wispr Flow
**Functie/patroon:** AI-dictatie die spraak omzet in verzorgde tekst in het actieve tekstveld, met sneltoets/push-to-talk. **Werking:** hotkey indrukken, spreken, tekst verschijnt; opmaak en stopwoorden worden opgeruimd. **Waarom:** veel sneller dan typen en minder schermgericht. **In WPI:** vooral backoffice/desktop: inspecteur dicteert actietekst of rapportnotitie; app toont ruwe transcriptie en een **Voorstel**-versie. Inspecteur kiest “Gebruik voorstel” of “Bewerk”. **Grens:** AI herschrijft tekst; nooit automatisch een oordeel of oorzaak laten toevoegen. Cloudverwerking vraagt AVG-toets. Mobiele ondersteuning moet worden geverifieerd; niet aannemen. **Moeite:** midden.

## Whisper-apps (o.a. MacWhisper, Whisper Transcription)
**Functie/patroon:** audio opnemen of importeren en (soms offline) transcriberen met tijdcodes. **Werking:** opname starten, voortgangsbalk, transcript met tijdlijn, exporteren. **Waarom:** goede Nederlandse transcriptie en offline mogelijk bij lokale modellen. **In WPI:** voor slecht bereik: inspecteur neemt per risicoregel een spraakmemo op; app transcriberet later op toestel. Het transcript verschijnt bij de waarneming als **Voorstel**; inspecteur bevestigt. **Grens:** offline modellen kosten batterij/opslag; ruis blijft lastig; exacte offline-functionaliteit verschilt per app. **Moeite:** hoog.

## Zello push-to-talk
**Functie/patroon:** walkie-talkie: kanaal kiezen, grote PTT-knop ingedrukt houden, spreken, loslaten. **Werking:** kanaallijst, status, hoorbare piep en zendindicator. **Waarom:** direct, handschoenvriendelijk en zonder scherm lezen. **In WPI:** niet als live kanaal voor inspectiebewijs, maar als PTT-opnamepatroon: één grote knop “Inspreken”, piep bij start/stop, opname in wachtrij bij offline. Voor coördinatie tussen inspecteur en hoofd kan Zello zelf nuttig zijn. **Grens:** live spraak is geen gestructureerd verslag en slecht auditbaar; niet gebruiken voor C/A/V-besluit. **Moeite:** laag voor patroon, hoog voor integratie.

## Top-5 aanbevelingen
1. **Handschoenmodus met PTT-opnameknop** — één groot scherm, waveform, piep en haptiek. Moeite: laag. Impact: hoog.
2. **Spraak-naar-tekst met verplichte bevestiging en “Voorstel”-label** — nooit automatisch C/A/V. Moeite: midden. Impact: hoog.
3. **Offline Whisper-transcriptie voor slecht bereik** — lokaal opnemen, later transcriberen. Moeite: hoog. Impact: hoog.
4. **Ruisbestendige close-talk headset plus visuele/haptische feedback** — minder misverstanden bij lawaai. Moeite: laag. Impact: midden.
5. **Spraakgestuurde actie-invoer** — dicteer “Wat moet er gebeuren?”, app maakt actievoorstel met actiehouder, toetser en termijn; inspecteur bevestigt. Moeite: midden. Impact: midden.

===== 04-begeleide-flow =====
Hieronder zes bestaande producten en hun ontwerppatronen voor begeleide interviews en formulieren. Steeds met toepassing op de WPI-app: één vraag tegelijk, voortgang, vertakkingen, terugkeren en hervatten. Uitgangspunt blijft: alleen waarneming telt, AI doet nooit een oordeel of waarneming; AI-suggesties heten **Voorstel** en de inspecteur bevestigt. Voor VCA 2026/6.1 eis 7.1 en 7.2 moet dit herleidbaar worden vastgelegd.

## TurboTax
**(1) Patroon:** begeleid belastinginterview met conditionele vragen, tussentijdse samenvatting en opslaan/hervatten.  
**(2) Werking:** per scherm één onderwerp, gewone taal, “Volgende/Terug”, uitleg bij lastige termen en een review aan het eind. De gebruiker ziet alleen vragen die relevant zijn.  
**(3) Waarom:** complexe materie wordt behapbaar; vertakking voorkomt ruis en de review geeft vertrouwen.  
**(4) In WPI:** na “Wat zie je?” en de foto komt het scherm “Waar hoort dit bij?”. Daar staat een **Voorstel TRA-regel** met bron/trefwoord en knoppen **Bevestig**, **Wijzig**, **Geen regel**. Pas daarna verschijnt C/A/V en “welke maatregel gezien?”. Bij A/V opent de actiestap met actiehouder, toetser (niet dezelfde persoon) en termijn.  
**(5) Grens/risico:** belastinglogica is deterministisch; WPI-waarneming niet. AI mag alleen een regel voorstellen, nooit “Conform” invullen. Auditlog en AVG-dataminimalisatie zijn nodig. Moeite: midden.

## Typeform
**(1) Patroon:** één vraag per scherm, conversationeel formulier, progressie en logic jumps.  
**(2) Werking:** grote vraag, veel wit, toetsenbord of spraak, duidelijke voortgang. Bij meerkeuze direct doorspringen. Hervatten is planafhankelijk; twijfel over exacte Typeform-plannen, maar het patroon is duidelijk.  
**(3) Waarom:** minder afleiding, hogere invulrust en logische paden.  
**(4) In WPI:** de gespreksflow “Wat doen de monteurs nu?” → “Wat zie je?” → “Waar hoort dit bij?” → oordeel → maatregel → actie. Grote mic- en fotoknoppen, één vraag tegelijk, “Terug” altijd zichtbaar. “Nog iets gezien?” is een vertakking: ja → nieuwe waarneming; nee → algemene onderwerpen/andere taak.  
**(5) Grens/risico:** één-vraag-per-scherm kan traag voelen met handschoenen en haast. Voeg “Overslaan/N.v.t.” en sneltoetsen toe. Moeite: laag.

## Duolingo-lessen
**(1) Patroon:** korte stappen, voortgangsbalk, directe feedback en ritme.  
**(2) Werking:** één oefening per scherm, grote knoppen, groen/rood-achtige feedback, “Doorgaan”. Voortgang en reeksen houden de gebruiker op gang.  
**(3) Waarom:** kleine stappen geven momentum; feedback maakt leren zichtbaar.  
**(4) In WPI:** toon tijdens de inspectie “Waarneming 3 van 5” of “TRA-regel 2 van 4”, maar zonder streak-druk. Na bevestiging korte feedback: “Vastgelegd: Afwijking, actie aangemaakt.” De inspecteur kan terug naar eerdere waarneming.  
**(5) Grens/risico:** gamification kan veiligheid trivialiseren; geen punten voor “goed” of “fout” oordeel. AI-feedback blijft Voorstel. Moeite: laag.

## Headspace-onboarding
**(1) Patroon:** rustige onboarding met enkele persoonlijke vragen, verwachtingen en visuele kalmte.  
**(2) Werking:** vriendelijke copy, pastelkaarten, één vraag per scherm, “Terug” en “Doorgaan”. De app stemt inhoud af op doel en ervaring.  
**(3) Waarom:** verlaagt drempel en maakt eerste gebruik voorspelbaar.  
**(4) In WPI:** alleen bij eerste gebruik: rol (inspecteur/coördinator/hoofd), voorkeur spraak/foto, offline uitleg en de regel “AI doet een Voorstel; jij bevestigt”. Daarna direct “Start inspectie”. Niet in elke inspectie herhalen.  
**(5) Grens/risico:** te veel onboarding kost tijd op locatie; overslaan moet kunnen. Moeite: laag.

## Belastingdienst-aangifte
**(1) Patroon:** stapsgewijs formulier met conditionele secties, opslaan/hervatten, overzicht en controle voor verzenden.  
**(2) Werking:** secties, “Volgende”, “Opslaan en later verder”, hulpteksten en een samenvatting vóór definitief maken.  
**(3) Waarom:** geschikt voor compliance en herleidbaarheid; de gebruiker controleert vóór afronden.  
**(4) In WPI:** vóór handtekening een **controlescherm**: per waarneming TRA-regel, oordeel C/A/V, maatregel, actie, actiehouder, toetser en termijn. “Opslaan en later verder” moet offline kunnen. Na ondertekening PDF en audit trail.  
**(5) Grens/risico:** overheidstoon is te zwaar; gebruik korte, menselijke taal. Actie pas afronden na toetsing. Moeite: midden/high.

## Intercom Fin
**(1) Patroon:** AI-chatbot die op basis van kennisbank antwoordt, quick replies geeft en kan overdragen aan een mens.  
**(2) Werking:** chatbubbels, suggesties, “Was dit nuttig?” en escalatie. De gebruiker typt of tikt een vraag.  
**(3) Waarom:** natuurlijke taal en just-in-time hulp verlagen zoekwerk.  
**(4) In WPI:** alleen als **Voorstel-assistent** bij “Waar hoort dit bij?” en “Wat moet er gebeuren?”. De inspecteur ziet: “Voorstel: TRA-regel ‘werken met hijsogen’ — bron: TRA-bestand”. Knoppen: Bevestig/Wijzig/Afwijzen. Bij twijfel: “Vraag coördinator”. Nooit automatisch oordeel, nooit automatisch waarneming.  
**(5) Grens/risico:** hallucinatie en AVG bij foto’s/transcripten. Toon bron, log bevestiging en bewaar geen onnodige data. Moeite: hoog.

## Top-5 aanbevelingen
1. **One-question-per-screen inspectieflow** met altijd “Terug”, “N.v.t.” en “Hervatten”. Moeite: laag. Impact: hoog.  
2. **Voorstel-kaart met bron** voor TRA-regel en actietekst, met Bevestig/Wijzig/Afwijs. Moeite: midden. Impact: hoog.  
3. **Slimme vertakking**: alleen bij A/V actievelden tonen; C en N.v.t. kort houden. Moeite: laag/midden. Impact: hoog.  
4. **Controlescherm vóór handtekening** met actiehouder, toetser en termijn; PDF en audit trail. Moeite: midden. Impact: hoog.  
5. **Offline hervatten + spraak/foto-first** met grote knoppen voor handschoenen en zonlicht. Moeite: midden. Impact: hoog.

===== 05-camera-foto =====
# Camera en foto in de WPI-app: van Lens tot snag-apps

Onze WPI-app draait om momentopnames: de inspecteur ziet, beoordeelt C/A/V en legt acties vast. Foto’s zijn daarbij bewijs van waarneming, niet van een AI-oordeel. Hieronder onderzoek ik bruikbare patronen uit bestaande producten, ook buiten onze branche. Steeds: functie, werking, waarom het werkt, toepassing in WPI en grens/risico. AI-suggesties blijven “Voorstel”; de inspecteur bevestigt.

## Google Lens
**Functie/patroon:** visueel zoeken en tekstherkenning via de camera.  
**Werking:** camera openen, op tekst of object richten, tikken op het zoekpunt; resultaten verschijnen als overlay. Tekst kan worden gekopieerd of vertaald. Feedback is een kader en “Tekst kopiëren”.  
**Waarom:** direct en zonder typen; herkenning verlaagt invoerfrictie.  
**In WPI:** in stap “Wat zie je?” een knop “Scan label/tekst”. De inspecteur fotografeert een typeplaat of etiket; OCR stelt tekst voor als **Voorstel**. Hij bevestigt en koppelt die aan een TRA-regel. Geen automatisch oordeel.  
**Grens/risico:** OCR-fouten, cloudverwerking en privacy. Alleen als hulpmiddel, nooit als waarneming. Moeite: midden.

## Apple Live Text
**Functie/patroon:** tekst in foto’s selecteren en kopiëren.  
**Werking:** foto openen, op tekst tikken; iOS markeert tekst en biedt kopiëren, vertalen of bellen. Werkt op device.  
**Waarom:** snel, herkenbaar en zonder extra app.  
**In WPI:** na de foto een knop “Tekst uit foto” voor serienummers of veiligheidslabels. De inspecteur ziet de selectie en bevestigt als Voorstel. Alleen op iOS; Android vereist alternatief.  
**Grens/risico:** platformafhankelijk, OCR kan fout zijn, en tekst kan persoonsgegevens bevatten. Geen oordeel. Moeite: laag.

## Apple Markup
**Functie/patroon:** foto-annotatie met pen, pijl, vorm, tekst en vergrootglas.  
**Werking:** Foto > Bewerk > Markeer; met vinger of stylus tekenen, undo, opslaan. Grote knoppen en directe feedback.  
**Waarom:** visueel markeren is sneller dan uitleggen, zeker met handschoenen.  
**In WPI:** na “Wat zie je?” een knop “Markeer”. Standaard rood/geel, pijl en cirkel; de inspecteur omcirkelt de afwijking en zet een korte tekst. Origineel blijft bewaard; annotatie als kopie.  
**Grens/risico:** rommelige foto’s, per ongeluk wijzigen. Non-destructief opslaan is verplicht. Moeite: laag.

## Adobe Scan
**Functie/patroon:** documenten scannen met automatische randdetectie, perspectiefcorrectie, OCR en PDF-export.  
**Werking:** camera detecteert randen, toont een kader, maakt foto, corrigeert perspectief en laat opnieuw nemen zien. Daarna OCR en exporteren.  
**Waarom:** geleide capture geeft bruikbare documenten zonder handmatig bijsnijden.  
**In WPI:** voor een papieren TRA, certificaat of actieformulier: “Scan document”. De inspecteur controleert de crop en de OCR-tekst als Voorstel. Niet voor werkplekfoto’s.  
**Grens/risico:** OCR-fouten, cloudopslag, schijnzekerheid. Moeite: midden.

## CamScanner
**Functie/patroon:** vergelijkbaar documentscannen met auto-crop, OCR en PDF.  
**Werking:** scannen, bijsnijden, OCR, exporteren; gratis versie toont watermerk.  
**Waarom:** bekend en snel.  
**In WPI:** ik zou CamScanner niet aanbevelen voor WPI. Gebruik het alleen als noodoplossing zonder persoonsgegevens.  
**Grens/risico:** ik ben niet zeker van de actuele privacypraktijken; historisch zijn er zorgen over datacollectie gemeld. Watermerk en minder controle. Moeite: laag, risico: hoog.

## Lemonade
**Functie/patroon:** verzekeringsclaim met foto/video en AI-feedback.  
**Werking:** voor zover bekend vraagt de app een video of foto’s, analyseert AI de claim en geeft direct feedback of uitbetaling. Exacte schermen ken ik niet.  
**Waarom:** geleide capture en directe terugkoppeling verlagen twijfel.  
**In WPI:** het patroon toepassen in “Wat zie je?”: korte prompts (“eerst overzicht, dan detail”) en directe kwaliteitsfeedback (“foto is donker, neem opnieuw”). AI beoordeelt alleen kwaliteit, nooit C/A/V.  
**Grens/risico:** AI-claim past niet bij onze methode; AVG en gezichten. Moeite: midden.

## Tractable
**Functie/patroon:** AI-schadeanalyse uit foto’s, vooral autoschade.  
**Werking:** foto’s uploaden, AI schat schade en kosten; exacte UI ken ik niet.  
**Waarom:** gestructureerde foto-inname en vergelijking.  
**In WPI:** alleen het patroon van voor/na-foto’s en vaste hoeken overnemen. Geen AI-schatting van veiligheid. De inspecteur maakt “voor” en “na” en beoordeelt zelf.  
**Grens/risico:** AI-bias, verkeerde toepassing, hoge implementatiekosten. Moeite: hoog.

## CompanyCam
**Functie/patroon:** bouwfoto’s met automatische tijd- en locatiemetadata, geordend per project.  
**Werking:** foto maken; app toont tijd, locatie en projecttag. Foto’s verschijnen in een tijdlijn; annotaties en rapportage zijn mogelijk. Of alle voor/na-functies in jullie versie zitten, moet je verifiëren.  
**Waarom:** metadata automatisch vastleggen voorkomt typen en discussie achteraf.  
**In WPI:** in “Wat zie je?” krijgt elke foto een badge: tijd, locatie, werkplek en inspecteur. Optioneel “voor/na” en koppeling aan TRA-regel. De inspecteur ziet “14:32 — RWZI X — voor”.  
**Grens/risico:** locatieprivacy, cloudopslag, gezichten blurren. Moeite: midden.

## Fieldwire
**Functie/patroon:** snag-/taakbeheer met foto’s, markup, toewijzing en status.  
**Werking:** taak aanmaken, foto toevoegen, markeren, actiehouder en termijn instellen; status open/closed. Mobiel en desktop.  
**Waarom:** visuele acties en duidelijke opvolging.  
**In WPI:** bij A/V een actiekaart met foto, actiehouder, toetser en termijn. Status “wacht op toetsing”; pas afronden na toetsing. De inspecteur ziet een thumbnail en “Toetsen”.  
**Grens/risico:** kan te zwaar zijn voor vijf inspecteurs; offline sync en eenvoud bewaken. Moeite: midden.

## Top-5 aanbevelingen
1. **Automatische foto-metadata** (tijd, locatie, werkplek, inspecteur) zichtbaar als badge. Moeite: laag. Impact: hoog.  
2. **Non-destructieve markup** met pijl, cirkel en tekst; origineel bewaren. Moeite: midden. Impact: hoog.  
3. **Guided capture en kwaliteitsfeedback** (“scherp”, “donker”, “voor/na”). Moeite: midden. Impact: hoog.  
4. **AVG-filter**: gezichtsblur, retentiebeleid, toegangsrechten. Moeite: midden. Impact: hoog.  
5. **OCR/scan als Voorstel** voor labels en documenten; inspecteur bevestigt. Moeite: midden. Impact: midden.

Kern: foto’s versnellen de momentopname, maar de inspecteur blijft de enige die ziet en oordeelt. AI mag alleen voorstellen doen; de methode blijft leidend.

===== 06-stress-checklists =====
## Inleiding
Stressbestendige software werkt met herkenning boven herinnering, één primaire actie, grote raakvlakken, kleur én tekst, geforceerde volgorde en directe terugkoppeling. In luchtvaart en zorg is dat uitgewerkt in kaarten, checklists en alarmering. Hieronder zeven concrete producten en wat wij daarvan kunnen leren. Waar ik twijfel over exacte schermlabels, zeg ik dat.

## ForeFlight
**Functie/patroon:** hazard- en weerinformatie op een kaart, met kleurcodering en korte tekst. ForeFlight heeft onder meer Hazard Advisor en Synthetic Vision; ik gebruik hier alleen de kaart-/waarschuwingspatronen, niet de volledige checklistfunctionaliteit.
**Werking:** kaart met rode/gele overlays; tik op een waarschuwing en je krijgt een korte tekstballon. Geen lange lijsten, wel directe visuele urgentie.
**Waarom:** de piloot ziet eerst het gevaar, niet het formulier. Kleur trekt aandacht, tekst voorkomt kleurenblindheid.
**In WPI:** op het scherm “Wat zie je?” komt bovenaan een rode kaart “Direct gevaar?” met één knop “Veiligstellen”. Daarna pas foto en waarneming. De inspecteur ziet dus eerst stop/veilig-maken, dan registreren.
**Grens/risico:** kleur alleen is onvoldoende; alarmmoeheid bij te veel rood. AI mag hier nooit “gevaar” verzinnen; alleen de inspecteur bevestigt.

## Garmin Pilot
**Functie/patroon:** split-screen met kaart, weer, verkeer en offline charts; grote, duimbereikbare bediening.
**Werking:** de gebruiker swipet tussen kaart en informatie; waarschuwingen verschijnen als korte banner. Veel informatie is progressief: eerst overzicht, dan detail.
**Waarom:** één scherm houdt context vast; offline beschikbaarheid voorkomt afhankelijkheid van bereik.
**In WPI:** op tablet/desktop een split-screen: links de huidige stap (“Wat zie je?”), rechts de voorgestelde TRA-regel. Op mobiel wordt rechts een uitklapkaart. De inspecteur houdt dus context en hoeft niet te navigeren.
**Grens/risico:** te veel panelen verhogen cognitieve belasting. Houd rechts alleen de relevante TRA-regel en maatregel zichtbaar.

## Boeing Electronic Checklist (787/777)
**Functie/patroon:** elektronische non-normal checklist in het cockpitdisplay; items krijgen een status en worden één voor één afgewerkt. Ik ben niet zeker van exacte labels per Boeing-type; het patroon is: checklist oproepen, item selecteren, bevestigen, status bijwerken.
**Werking:** geen papieren bladeren; het systeem toont het volgende item en houdt open/done-status bij. De piloot bevestigt expliciet.
**Waarom:** geforceerde volgorde en expliciete bevestiging verkleinen kans op overslaan.
**In WPI:** het scherm “Waar hoort dit bij?” toont één TRA-regel per keer, met grote knoppen C/A/V/NVT. Bij A/V opent direct het actieblok. De inspecteur ziet “Voorstel” als AI-suggestie en moet zelf bevestigen.
**Grens/risico:** automation bias: mensen klikken te snel “done”. Daarom altijd eigen waarneming verplicht en geen automatisch oordeel.

## Airbus ECAM / Electronic Checklist
**Functie/patroon:** systeemalarmering met kleur (rood/amber) en actiegerichte stappen; daarna checklist/status.
**Werking:** ECAM toont eerst de fout en vraagt stap voor stap acties. Rood betekent direct handelen; amber betekent bewaken. Ik ben voorzichtig met exacte A350/A380-schermdetails.
**Waarom:** scheidt “eerst veiligstellen” van “daarna administreren”.
**In WPI:** bij een Afwijking met direct gevaar toont WPI een tijdelijke modus: “Eerst veiligstellen” met maximaal twee concrete stappen en één knop “Uitgevoerd”. Daarna keert de app terug naar het inspectieformulier.
**Grens/risico:** te simpele stappen kunnen schijnzekerheid geven. Alleen tonen als de TRA die stap expliciet bevat; geen AI-invulling.

## WHO Surgical Safety Checklist
**Functie/patroon:** hardop voorgelezen teamchecklist in drie fasen: Sign In, Time Out, Sign Out.
**Werking:** papieren of digitale kaart; team bevestigt mondeling. Geen afvinklijst zonder gesprek.
**Waarom:** teamleden corrigeren elkaar; read-back voorkomt aannames.
**In WPI:** in de stap “Gesprek met monteurs” een korte gespreksgeleider: “Taak bekend? TRA besproken? Wat ging goed?” De inspecteur leest voor, monteurs bevestigen; daarna handtekening.
**Grens/risico:** ritualisering: afvinken zonder echt gesprek. Houd het bij drie vragen en laat de inspecteur kort vastleggen wat hij hoorde.

## Pulsara
**Functie/patroon:** één casus aanmaken, rolgebaseerde meldingen en gedeelde tijdlijn tussen ambulance en ziekenhuis.
**Werking:** één tik maakt een case; betrokkenen krijgen gerichte statusupdates; tijdlijn is gedeeld.
**Waarom:** minder telefoneren, minder dubbel invoeren, duidelijke verantwoordelijkheid.
**In WPI:** bij een A/V-actie maakt WPI een actie-tijdlijn: actiehouder, toetser, termijn, status “Wacht op toetsing”. Pas na toetsing wordt de actie “Afgerond”. Pushmeldingen bevatten alleen rol en taak, geen foto’s of namen.
**Grens/risico:** AVG: geen gevoelige inhoud in pushberichten; toegang per rol; bewaartermijn vastleggen.

## Handtevy
**Functie/patroon:** lengtegebaseerde kleurtape plus app voor pediatrische spoeddosering, gebruikt door EMS/brandweer.
**Werking:** meet lengte, kies kleur, app toont grote, eenduidige dosiskaarten. Kleur versnelt herkenning; tekst blijft leidend.
**Waarom:** onder stress is zoeken naar tabellen foutgevoelig; vaste kaarten verlagen cognitieve belasting.
**In WPI:** bij “Welke maatregel gezien?” toont WPI de TRA-maatregel als grote kaart met icoon, kleur en korte tekst. De inspecteur tikt “Gezien” of “Niet gezien”; geen vrij tekstveld nodig.
**Grens/risico:** kleur mag nooit de enige drager zijn. Geen medische logica kopiëren; alleen het kaartpatroon.

## Top-5 aanbevelingen
1. **Direct-gevaar-modus** met rode banner en één primaire actie “Veiligstellen”. Moeite: midden. Impact: hoog.
2. **Eén risicoregel per scherm** met grote C/A/V/NVT-knoppen en verplichte eigen waarneming; AI heet “Voorstel”. Moeite: laag. Impact: hoog.
3. **Actie-tijdlijn met toetserrol** en status “afgerond na toetsing”; push alleen rol/taak. Moeite: midden. Impact: hoog.
4. **Read-aloud teamcheck** in het monteursgesprek met drie vaste vragen en handtekening. Moeite: laag. Impact: midden.
5. **Offline-first, handschoenknoppen en kleur+tekst+icoon** met volledige audit trail. Moeite: midden/hoog. Impact: hoog.

===== 07-field-service =====
## Inleiding
De beste lessen uit bezorging en field service zitten niet in de kaarten, maar in de interactiepatronen: grote knoppen in de duimzone, een duidelijke statusmachine, offline wachtrijen, bewijs vastleggen en “exception codes” in plaats van vrije tekst. Voor WPI vertalen we die naar de momentopname: geen verplichte checklist, wel eigen waarneming, C/A/V/NVT en acties die pas sluiten na toetsing. AI blijft overal “Voorstel”; de inspecteur bevestigt.

## PostNL-bezorgscanner
**Functie/patroon:** route- en scanflow met statuscodes en directe bevestiging. Publiek zijn exacte schermen van de handheld niet volledig te verifiëren; ik ga uit van het bekende patroon: scannen, status kiezen, volgende stop.
**Hoe het werkt:** een route- of pakketlijst, grote scanactie, statusknoppen als “bezorgd”, “niet thuis”, “bij buren”, een piep/groen vinkje en een wachtrij als het netwerk wegvalt.
**Waarom het werkt:** weinig nadenken, grote doelen, meteen feedback en geen dataverlies bij slecht bereik.
**Toepassing WPI:** op het scherm “Waar hoort dit bij?” grote TRA-regelkaarten met zoekveld. Na foto en waarneming ziet de inspecteur grote segmented buttons C/A/V/NVT. Bij offline een badge “3 waarnemingen wachten op sync”. AI toont alleen een “Voorstel”-chip; de inspecteur tikt zelf het oordeel.
**Grens/risico:** statuscodes kunnen nuance plat slaan. Foto’s kunnen persoonsgegevens bevatten; AVG-vraagstuk. Moeite: midden.

## UPS DIAD
**Functie/patroon:** proof of delivery, handtekening en exception codes op een robuuste handheld.
**Hoe het werkt:** fysieke toetsen, een handtekeningvlak en een menu met afwijkingsredenen. De chauffeur rondt een stop af en laat de ontvanger tekenen.
**Waarom het werkt:** deterministisch, herleidbaar en bestand tegen lawaai, handschoenen en haast.
**Toepassing WPI:** het handtekening- en afsluitscherm. Na een actie ziet de toetser “Actie afronden na toetsing”, met naam, rol, timestamp en handtekening. NVT krijgt een redencode. De actie staat op “wacht op toetsing” tot de toetser bevestigt.
**Grens/risico:** een handtekening is niet automatisch geïnformeerde toestemming. AVG en bewaartermijn moeten expliciet. Moeite: midden.

## Uber Driver
**Functie/patroon:** one-handed state machine met bottom sheet.
**Hoe het werkt:** kaartbeeld, onderin een kaart met de volgende stap en een grote statusknop. Geluid en haptiek bevestigen acties; informatie verschijnt pas als die nodig is.
**Waarom het werkt:** duimzone, progressieve disclosure en duidelijke “nu”-focus.
**Toepassing WPI:** het begeleide gesprek als bottom sheet: “Wat zie je?” met microfoonknop, daarna “Waar hoort dit bij?”, daarna oordeel. Voortgangsstippen en haptiek bij opslaan. Geen swipe voor een oordeel: dat moet bewust.
**Grens/risico:** urgentie- en gamificationgevoel past niet bij veiligheid. Netwerkafhankelijkheid. Moeite: midden.

## Bolt Driver
**Functie/patroon:** accepteren, statuswijzigen, navigeren en contact opnemen vanuit één stroom.
**Hoe het werkt:** grote acceptatieknop, bottom sheet, chat/bel en inkomstenoverzicht. Status is altijd zichtbaar.
**Waarom het werkt:** snelheid en helderheid voor een gebruiker onder tijdsdruk.
**Toepassing WPI:** de “nog iets gezien?”-lus: grote knoppen “Nog een waarneming” en “Afronden”. Een actiehouder kan vanuit de actie een bel- of maillink krijgen. De inspecteur ziet één volgende actie, niet een heel formulier.
**Grens/risico:** continue locatie en contactgegevens zijn AVG-gevoelig; niet overnemen. Moeite: laag tot midden.

## ServiceTitan
**Functie/patroon:** dispatch, jobdetails, formulieren, foto’s, handtekening en afronden in één “job”.
**Hoe het werkt:** joblijst, klant-/objecthistorie, formulierregels, foto’s toevoegen, handtekening en “complete job”. Offline/queue is een bekend veldservicepatroon; exacte offline-scope verschilt per module.
**Waarom het werkt:** context en bewijs zitten bij elkaar; minder losse apps.
**Toepassing WPI:** een inspectie als “werkplekbezoek”-kaart. Daarbinnen TRA-regels, per waarneming een foto, en bij A/V een actie met actiehouder, toetser en termijn. Status “wacht op toetsing” is zichtbaar.
**Grens/risico:** checklistdrift. WPI is momentopname, geen afvinklijst. Configuratie kan zwaar zijn. Moeite: hoog.

## Salesforce Field Service
**Functie/patroon:** work orders, planning, offline mobile en guided flows.
**Hoe het werkt:** werkordercards, statusknoppen, kaart, offline sync en een audit trail. De mobiele app is gericht op veldmedewerkers.
**Waarom het werkt:** schaalbaarheid en herleidbaarheid voor auditors.
**Toepassing WPI:** dashboard, dagplanning en trendanalyse. Rollen (inspecteur, coördinator, hoofd) krijgen eigen filters; elke wijziging krijgt een audit log. AI-suggesties blijven zichtbaar als “Voorstel”.
**Grens/risico:** complexiteit en kosten voor vijf inspecteurs. AI mag nooit een waarneming of oordeel invullen. Moeite: hoog.

## Jobber
**Functie/patroon:** eenvoudige planning, jobformulieren, foto’s en klantupdates voor kleine teams.
**Hoe het werkt:** “Today”-lijst, jobdetail, notities/foto’s en formulieren. Handtekening kan in formulieren/oplevering voorkomen; exacte beschikbaarheid hangt af van abonnement.
**Waarom het werkt:** lage leerdrempel en weinig schermen.
**Toepassing WPI:** de daglijst “Vandaag te inspecteren” en een simpel actieoverzicht. Locatiehistorie toont eerdere waarnemingen zonder de inspecteur te sturen.
**Grens/risico:** niet VCA-specifiek; weinig diepgang voor toetsing en trendanalyse. Moeite: laag.

## Top-5 aanbevelingen
1. **One-handed bottom action bar met C/A/V/NVT-chips en offline badge.** Moeite: midden. Impact: hoog.
2. **“Voorstel”-patroon met expliciete bevestiging en audit log.** Moeite: midden. Impact: hoog.
3. **Toetsings- en afsluitscherm met handtekening van de toetser, timestamp en rol; actie pas afgerond na toetsing.** Moeite: midden. Impact: hoog.
4. **Dagplanning plus offline sync-status en conflict-UI.** Moeite: hoog. Impact: hoog.
5. **Foto-bewijs met AVG-hulp: doel, bewaartermijn en waarschuwing bij herkenbare personen.** Moeite: midden. Impact: midden tot hoog.

===== 08-actiebeheer =====
Voor WPI is actiebeheer geen takenlijstje, maar bewijsvoering: elke Afwijking of Verbeterpunt krijgt een actie, actiehouder, toetser (niet dezelfde persoon) en termijn; afronden kan pas na toetsing. AI mag alleen een “Voorstel” doen; de inspecteur bevestigt. Hieronder zes bestaande producten en wat we daarvan leren.

## Linear
**Functie/patroon:** issue tracking met snelle invoer, statussen, assignee, labels, prioriteit, “My Issues”, inbox en command menu (Ctrl/Cmd+K). **Werking:** je typt in één veld een issue, kiest status/assignee/label, en ziet direct een strakke detailkaart met activiteit en notificaties. **Waarom:** snelheid en duidelijke eigenaar/status verlagen uitstel. **Toepassing WPI:** maak van een actie een “issue-achtige” actiekaart: status Open → In uitvoering → Klaar voor toetsing → Afgerond/afgewezen; velden actiehouder, toetser, termijn, bewijs. Het scherm “Mijn acties” toont alleen wat bij de ingelogde rol ligt. De toetser ziet een knop “Toetsen” met verplichte waarneming/foto en kiest “Akkoord” of “Terug naar actiehouder”. **Grens/risico:** Linear is voor softwareteams; kopieer niet de complexiteit. Geen automatische oordelen; AI alleen als voorsteltekst. AVG: minimale persoonsgegevens, geen overbodige foto’s van mensen. Moeite: midden.

## Things 3
**Functie/patroon:** persoonlijke taken met Today, Upcoming, Anytime, Someday, projecten/areas, tags, checklist, deadline en startdatum, Quick Entry en Magic Plus. **Werking:** je sleept of tikt taken naar “Vandaag”; rustige lijst, vinkjes, datumkiezer en korte feedback. **Waarom:** “Today” maakt prioriteit concreet zonder dashboardruis. **Toepassing WPI:** bouw een “Vandaag”-tab voor actiehouders en toetsers: te late acties, acties die vandaag aflopen en “wacht op toetsing”. Tik op een actie opent de actiekaart met grote knoppen (“Bewijs toevoegen”, “Indienen ter toetsing”). **Grens/risico:** Things is single-user; geen echte toetsersworkflow of auditlog. Gebruik het als ontwerppatroon, niet als systeem van record. AI nooit laten afvinken. Moeite: laag.

## Todoist
**Functie/patroon:** Quick Add met natuurlijke taal, projecten, labels, filters, prioriteiten P1–P4, terugkerende taken, gedeelde projecten en taaktoewijzing in betaalde teamworkplannen. **Werking:** typ “actie damwand vandaag @Jan” en Todoist stelt datum/label voor; filters zoals “Mijn taken vandaag” geven overzicht. **Waarom:** snelle invoer past bij haast en handschoenen. **Toepassing WPI:** in de stap “Wat moet er gebeuren?” een snelveld met voorstel: “Actie: … | Actiehouder: … | Termijn: …”. De inspecteur bevestigt; daarna opent de actiekaart. Een filter “Ligt bij mij” toont actiehouder- of toetserstaken. **Grens/risico:** natuurlijke taal kan verkeerd parsen; toon altijd een bevestigingskaart. Geen automatische status “afgerond” door AI. AVG: comments kunnen persoonsgegevens bevatten; beperk velden. Moeite: laag/midden.

## Asana
**Functie/patroon:** projecten met board- en lijstweergave, taken/subtaken, assignee, deadline, custom fields, dependencies, My Tasks, inbox en rules. **Werking:** je sleept een taak van “Open” naar “Klaar voor toetsing”; kaarten tonen eigenaar en datum, regels kunnen notificaties sturen. **Waarom:** visuele statusovergangen maken afhankelijkheden en wachtrijen zichtbaar. **Toepassing WPI:** een actieboard per werkplek/locatie met kolommen Open, In uitvoering, Klaar voor toetsing, Afgerond. Custom fields: toetser, termijn, bewijsstatus. Alleen de toetser ziet de knop “Toetsing akkoord”; pas daarna mag de kaart naar Afgerond. **Grens/risico:** automatisering kan schijnzekerheid geven; toetsing blijft menselijk. Board kan te veel managementwerk worden voor 5 inspecteurs. Moeite: midden.

## Jira
**Functie/patroon:** issue-workflows met verplichte overgangen, velden, rechten, commentaar, bijlagen, JQL-filters, boards en issue-historie. **Werking:** een knop “Indienen ter toetsing” opent een formulier; zonder bewijs kun je niet verder. De toetser ziet “Toetsen” en de historie toont wie wanneer wat wijzigde. **Waarom:** strikte workflow en historie geven herleidbaarheid voor een VCA-auditor. **Toepassing WPI:** voor de formele actieafhandeling: overgang “Klaar voor toetsing” vereist bewijs; overgang “Afgerond” alleen voor rol toetser. Het scherm “Mijn werk” toont acties en toetsingen. **Grens/risico:** Jira is zwaar en jargonrijk; op locatie met lawaai/zon te complex. AI mag geen status of oordeel zetten. AVG: historie en bijlagen vragen retention- en toegangsbeleid. Moeite: hoog.

## Apple Herinneringen
**Functie/patroon:** lijsten, tags, slimme lijsten, deadlines, locatie-/tijdherinneringen, subtaken, notities, bijlagen, gedeelde lijsten en Siri-invoer. **Werking:** “Herinner me morgen 9:00” en de taak staat in Vandaag; vinkje geeft directe feedback. **Waarom:** extreem lage drempel op iPhone. **Toepassing WPI:** als offline fallback voor “mijn acties”: een gedeelde lijst “WPI acties” met tag #toetsing en #actiehouder. Na synchronisatie naar de WPI-app. **Grens/risico:** geen formele toetsersworkflow, beperkte auditlog, delen vereist Apple-accounts. Niet gebruiken als officieel verslag. Moeite: laag.

## Top-5 aanbevelingen
1. **Verplicht statusmodel met toetserrol** (Open → In uitvoering → Klaar voor toetsing → Afgerond/afgewezen). Moeite: midden; impact: hoog.
2. **“Mijn acties”-scherm** met Vandaag, Te laat en Wacht op toetsing. Moeite: laag; impact: hoog.
3. **Snelle actie-invoer met Voorstel-kaart** en verplichte velden actiehouder, toetser, termijn. Moeite: midden; impact: hoog.
4. **Actiekaart met bewijs en toetsingsknop**; afronden alleen na akkoord toetser. Moeite: midden; impact: hoog.
5. **Wekelijkse digest/trend per werkplek** voor openstaande acties en toetsingen. Moeite: laag/midden; impact: midden.

===== 09-motivatie =====
## Inleiding

Voor WPI willen we inspecteurs motiveren om het inspectieprogramma te halen en positieve bevindingen expliciet te benoemen, zonder dat de methode wordt uitgehold. Gamification is dan geen puntenspel om zo veel mogelijk afwijkingen of inspecties te scoren. Het moet helpen bij routine, zichtbare voortgang en erkenning van goed werk. Uitgangspunt blijft: alleen eigen waarneming telt, AI geeft hooguit een “Voorstel”, de inspecteur bevestigt, en acties zijn pas klaar na toetsing door een ander. Bij vijf inspecteurs is een openbare ranglijst eerder riskant dan motiverend.

## Duolingo

**Functie/patroon:** streak, dagdoel, XP en milde herinneringen.  
**Hoe het werkt:** Duolingo toont bovenaan een vlam met het aantal dagen, een dagdoel en na een les korte vieringen met tekst als “Goed gedaan!”. Een streak-freeze voorkomt dat één gemiste dag alles breekt.  
**Waarom het werkt:** kleine dagelijkse drempel, zichtbare continuïteit en verliesaversie.  
**Toepassing in WPI:** op het inspecteur-dashboard een privékaart “Jouw inspectieprogramma”: deze week 2 van 3 werkplekken, met een rustige voortgangsring. Na afronden van een rapport verschijnt één korte bevestiging: “Vastgelegd: 3 waarnemingen, 1 positieve bevinding.” Geen confetti bij afwijkingen. Bij vakantie/ziekte kan de inspecteur een “pauze” instellen, zodat de streak niet als schuldgevoel werkt.  
**Grens/risico:** niet sturen op aantal afwijkingen of snelheid. Alleen programma-afronding en kwaliteit. AI speelt hier geen rol. AVG: privévoortgang, geen monteursscores. Moeite: laag.

## Strava

**Functie/patroon:** kudos, clubs, uitdagingen en segmenten.  
**Hoe het werkt:** na een activiteit ziet de gebruiker een samenvatting, kaart en knoppen voor kudos/reacties. Clubs en challenges geven sociale erkenning; segmenten vergelijken prestaties op vaste stukken.  
**Waarom het werkt:** sociale bevestiging en gedeelde doelen versterken volhouden.  
**Toepassing in WPI:** geen individuele ranglijst, maar een besloten teamkaart “Deze maand”: aantal afgeronde werkplekinspecties, aantal benoemde positieve bevindingen en aantal acties dat na toetsing is afgerond. Collega’s kunnen een korte “duim” geven bij een goed uitgevoerde inspectie, zonder cijfer. De inspecteur ziet alleen teamaggregaten en eventueel eigen bijdrage.  
**Grens/risico:** Strava-style vergelijken kan verkeerde prikkels geven: meer inspecties, minder diepgang of positieve bevindingen “scoren”. Daarom geen segmenten op monteurs of werkplekken. Moeite: midden.

## Apple Fitness-ringen

**Functie/patroon:** drie ringen voor dagelijkse beweging, training en staan; awards en delen.  
**Hoe het werkt:** op het scherm staan ringen die zich vullen; na sluiten volgt een korte animatie en tekst. De gebruiker ziet historie en kan ringen met anderen delen.  
**Waarom het werkt:** meerdoelige doelen maken voortgang concreet; sluiten voelt als afronding.  
**Toepassing in WPI:** drie ringen op het dashboard: (1) werkplekken volgens programma, (2) positieve bevindingen benoemd, (3) acties getoetst afgerond. De inspecteur tikt op een ring en ziet welke werkplekken nog openstaan. Bij het afronden van een gesprek vult de ring zich pas na handtekening en rapport-PDF.  
**Grens/risico:** ringen mogen niet dwingen tot extra inspecties buiten het programma. “Positieve bevinding” moet een echte waarneming zijn, geen verplicht veld dat tot verzinnen leidt. Moeite: midden.

## Headspace

**Functie/patroon:** vaste dagelijkse routine, korte sessies, herinneringen en voortgangsoverzicht.  
**Hoe het werkt:** het startscherm biedt een dagelijkse sessie; de gebruiker kiest een korte oefening, ziet voortgang en ontvangt vriendelijke herinneringen. Ik ben niet zeker van de exacte streak-mechaniek; gebruik vooral het patroon van lage drempel en routine.  
**Waarom het werkt:** vaste cue, korte duur en kalme feedback verlagen weerstand.  
**Toepassing in WPI:** een “begin je inspectie”-kaart met één knop: “Start gesprek”. Daarna drie vaste stappen: “Wat doen de monteurs nu?”, “Wat zie je?”, “Waar hoort dit bij?”. Na een drukke inspectie biedt de app een 30-seconden afronding: “Noem één ding dat goed ging.” Dat is geen meditatie, maar een rustpunt dat positieve bevindingen oplevert.  
**Grens/risico:** geen AI die een positieve bevinding suggereert zonder waarneming. Wel kan AI een “Voorstel” doen op basis van ingevoerde tekst; de inspecteur bevestigt of verwijdert. Moeite: laag.

## Forest

**Functie/patroon:** focus-timer waarbij een virtuele boom groeit; weggaan kan de boom laten verdorren.  
**Hoe het werkt:** de gebruiker start een timer, ziet een boom groeien en bouwt een bos op. Stoppen of app verlaten heeft consequenties.  
**Waarom het werkt:** directe visuele feedback en lichte commitment maken geconcentreerd werken aantrekkelijk.  
**Toepassing in WPI:** een “inspectie afronden”-modus: zodra de inspecteur het gesprek start, groeit een eenvoudige plant naarmate de stappen zijn afgerond. Bij onderbreking blijft de plant staan; de app zegt “Je kunt later verder”. Na handtekening en rapport is de plant vol. Zo wordt niet snelheid, maar zorgvuldig afronden beloond.  
**Grens/risico:** geen straf bij onderbreking door lawaai of slecht bereik. Offline moet de plant lokaal doorgroeien. Moeite: midden.

## Todoist Karma

**Functie/patroon:** punten, niveaus en dagelijkse doelen voor afgeronde taken.  
**Hoe het werkt:** Todoist toont Karma, voortgang naar een dagdoel en niveaus; afvinken geeft directe feedback.  
**Waarom het werkt:** taken afronden wordt zichtbaar en opgebouwd over tijd.  
**Toepassing in WPI:** een privé “Karma-light” voor inspecteurs: geen punten per afwijking, maar per kwalitatief afgeronde stap: waarneming vastgelegd, actie met toetser toegewezen, rapport gegenereerd. Het actie-overzicht toont “wacht op toetsing” en “afgerond na toetsing”.  
**Grens/risico:** geen punten voor het aantal acties of afwijkingen; dat zou overrapportage stimuleren. Acties mogen niet sneller “af” lijken dan de toetsing toestaat. Moeite: laag.

## Top-5 aanbevelingen

1. **Privé-dagdoel en streak met pauzeknop** voor programma-afronding. Moeite: laag. Impact: hoog.  
2. **Positieve bevinding als vaste, lichte stap** na “Wat ging goed?” met eigen waarneming en foto/tekst. Moeite: laag. Impact: hoog.  
3. **Drie ringen of voortgangskaarten** voor programma, positieve bevindingen en getoetste acties. Moeite: midden. Impact: midden.  
4. **Besloten teamoverzicht zonder ranglijst** met kudos en maandtrend voor VCA 7.2. Moeite: midden. Impact: midden.  
5. **Rustige viering na rapport-PDF**, geen confetti bij afwijkingen en geen AI-oordeel. Moeite: laag. Impact: midden.

===== 10-dashboards =====
## Inleiding
Voor WPI gaat het niet om “mooie grafieken”, maar om bestuurbare kwaliteit: VCA 2026/6.1 eis 7.1 vraagt om een inspectieprogramma per werkplek met verslag van positieve bevindingen, afwijkingen en acties; eis 7.2 om een jaarlijkse trendanalyse met acties. Bij ongeveer vijf inspecteurs en kleine aantallen is eerlijk tonen belangrijker dan dashboarddrukte. Uitgangspunt blijft: alleen waargenomen feiten tellen. AI-suggesties heten in de app “Voorstel” en worden door de inspecteur bevestigd of verwijderd; AI velt nooit een oordeel.

## Power BI
(1) Functie/patroon: KPI-tegels, slicers, drill-down en drill-through van trend naar onderliggende inspectie. (2) Werking: een dashboard met kaarten “Inspecties”, “Conform”, “Afwijking”, “Open acties”; hover geeft tooltip met n en periode; klik op een balk opent een lijst met inspecties, foto’s en acties. (3) Waarom: lagen van overzicht naar bewijs voorkomen dat directie en auditor verdwalen. (4) In WPI: scherm “Trends & Bewijs” voor hoofd/coördinator. Filter op werkplek, taak, maand; drill-through naar de oorspronkelijke waarneming, het oordeel C/A/V, de actiehouder, toetser en status “afgerond na toetsing”. (5) Grens/risico: percentages bij n<5 verbergen; toon dan alleen aantallen en “nog geen trend”. Rolgebaseerde toegang en bewaartermijnen i.v.m. AVG; inrichting kost midden.

## Tableau
(1) Functie/patroon: visuele analyse en “Story” met opeenvolgende schermen als narratief. (2) Werking: werkbladen met filters en highlight-acties; in een Story staan punten als “dekking”, “afwijkingen”, “acties op tijd”, “positieve bevindingen”, elk met korte duiding. (3) Waarom: een verhaal met vaste volgorde legt uit wát verandert en waarom dat ertoe doet. (4) In WPI: scherm “Kwartaalverhaal” voor directie/auditor. De hoofd ziet eerst dekking per werkplek, dan C/A/V-aantallen, dan openstaande acties; klik door naar bewijs. De inspecteur ziet hiervan niets in het veld. (5) Grens/risico: Tableau verleidt tot exploratie; zonder “n<5”-regel en methodenoot ontstaan schijnzekerheden. Bouwen en onderhouden kost midden tot hoog.

## Stripe-dashboard
(1) Functie/patroon: rustige hiërarchie met KPI-kaarten, datumfilter, grafiek en tabel; duidelijke lege staten. (2) Werking: bovenaan “Deze maand”, daaronder kaarten met groot getal en kleine trend; klik op kaart opent gefilterde lijst; tooltips geven exacte waarden. (3) Waarom: één heldere vraag per kaart en direct doorklikken naar actie. (4) In WPI: het startdashboard. Inspecteur ziet “Mijn inspecties vandaag”, “Open acties” en “Ter plaatse gecorrigeerd”; hoofd ziet organisatiebreed. Klik op “Afwijkingen” opent de lijst met alleen waargenomen afwijkingen. (5) Grens/risico: financiële precisie suggereert zekerheid die bij kleine n niet bestaat; toon n en vermijd trendpijlen. Moeite laag tot midden.

## Linear Insights
(1) Functie/patroon: compacte productiviteitsinzichten, zoals doorlooptijd en doorstroom, met filters. (2) Werking: minimale grafieken en lijsten; je kiest periode/team en ziet direct de uitschieter. Exacte schermnamen kunnen wisselen; dat baseer ik op de Insights-gedachte. (3) Waarom: weinig metrieken, veel signaal. (4) In WPI: scherm “Actie-Insights” voor hoofd: gemiddelde doorlooptijd van actie tot toetsing, aantal heropeningen, acties zonder toetser. Klik op een uitschieter toont de acties; geen oordeel over personen. (5) Grens/risico: dit mag geen verkapte personeelsbeoordeling worden; AVG en kleine n vragen om aggregatie. Moeite midden.

## Apple Gezondheid
(1) Functie/patroon: persoonlijke samenvatting, ringen/kaarten, “Highlights” en trends met progressieve detail. (2) Werking: overzichtskaarten; tik op een kaart voor grafiek en “Toon alle gegevens”; teksten zijn gewoon taal. (3) Waarom: persoonlijke relevantie zonder meteen alles te tonen. (4) In WPI: scherm “Mijn week” voor de inspecteur: aantal inspecties, open acties, acties op tijd, positieve bevindingen. Geen ranglijst. Tik op “Open acties” opent de eigen actielijst; AI-voorstellen staan apart gemarkeerd. (5) Grens/risico: personalisatie raakt AVG; vermijd competitie of schijnprecisie. Moeite laag tot midden.

## Garmin Connect
(1) Functie/patroon: kalender/heatmap en tijdreeksen per activiteit. (2) Werking: kalenderweergave met dagen; klik op dag voor details; grafieken tonen verloop. (3) Waarom: tijd en dekking worden zichtbaar zonder tabellen. (4) In WPI: scherm “Inspectiekalender”: per werkplek/maand een heatmap van uitgevoerde inspecties; klik op dag toont inspecties en of een werkplek lang niet is bezocht. Auditor ziet dekkingsbewijs. (5) Grens/risico: kleur alleen is onvoldoende; toon aantallen en legenda. Bij n<5 geen “rode” trend suggereren. Moeite midden.

## Our World in Data
(1) Functie/patroon: datastorytelling met titel als boodschap, subtitel, bron, annotaties en methodenoot. (2) Werking: een grafiek heeft een leesbare kop, periode, n, bron en een korte uitleg; “Explore” geeft detail. (3) Waarom: context en transparantie maken cijfers auditwaardig. (4) In WPI: de trendpagina in het PDF-/auditorrapport. Elke grafiek krijgt bijvoorbeeld: “Afwijkingen dalen niet aantoonbaar; n=4 in Q1” en bron “WPI-waarnemingen, alleen bevestigd door inspecteur”. (5) Grens/risico: interactiviteit vervalt in PDF; methodenoot moet mee. Moeite midden.

## Top-5 aanbevelingen
1. **Bouw “Trends & Bewijs” met drill-through** naar waarneming, foto, oordeel en actie. Moeite: midden. Impact: hoog.  
2. **Voer een vaste kleine-aantallen-regel in**: geen percentages bij n<5, toon n en “geen trend”. Moeite: laag. Impact: hoog.  
3. **Maak een kwartaalverhaal** voor directie/auditor met vaste volgorde en methodenoot. Moeite: midden. Impact: hoog.  
4. **Voeg “Mijn week” toe** voor inspecteurs, zonder ranking, met AI-voorstellen apart. Moeite: laag/midden. Impact: midden.  
5. **Maak een inspectiedekkingskalender** per werkplek met doorklik naar bewijs. Moeite: midden. Impact: midden.

===== 11-visueel-ontwerp =====
# Visueel ontwerp en design systems voor Werkplekinspectie

Onze WPI-app wordt gebruikt met handschoenen, in lawaai, bij fel zonlicht en met één hand. Elk visueel besluit is dus een werkbesluit: minder ruis betekent sneller en betrouwbaarder waarnemen. Hieronder zeven bestaande producten, wat ze doen, en wat wij er precies van overnemen — met de grens erbij.

## Apple Human Interface Guidelines (iOS/macOS)

**Functie/patroon:** systeembrede ontwerptaal: SF-lettertype, semantische kleuren, 44pt tikdoelen, Dynamic Type, voorzichtige beweging, dark mode, haptiek.

**Hoe het werkt:** één terug-patroon, grote tikbare vlakken, tekst die meeschaalt met de systeeminstelling, en animaties die alleen bevestigen wat je al deed (sheet schuift omhoog, knop veert licht terug).

**Waarom:** herkenbaarheid verlaagt cognitieve last; de gebruiker hoeft niet te leren hoe iets werkt.

**Toepassing WPI:** gebruik Inter/SF met Dynamic Type, semantische statuskleuren (Conform groen, Afwijking oranje, Verbeterpunt blauw, N.v.t. grijs), minimaal 44pt tikdoelen ook voor de C/A/V-knoppen, en lichte haptiek bij het bevestigen van een oordeel. Dark mode volgt het systeem, maar met een aparte "hoog contrast"-schakelaar.

**Grens/risico:** Apple-look op Android voelt vreemd; forceer dark mode niet — buiten in de zon is licht juist leesbaarder. Laat de inspecteur kiezen, default op licht.

## Material 3

**Functie/patroon:** adaptieve layouts, tonal color, bottom sheets, chips, segmented buttons, FAB.

**Hoe het werkt:** een bottom sheet schuift over de context heen (je ziet de waarneming nog), chips filteren in één tik, segmented buttons tonen de gekozen optie zonder dropdown.

**Waarom:** je verliest de context niet en de keuzes zijn scanbaar op een klein scherm.

**Toepassing WPI:** de actie-toewijzing ("actiehouder, toetser, termijn") als bottom sheet boven de waarneming; C/A/V als segmented buttons; KPI-filters op het dashboard als chips ("Deze maand", "Open", "Te laat").

**Grens/risico:** neem de patronen over, niet de look. Kies één token-set (kleur, radius, spacing) en houd die consistent; anders krijg je een mengelmoes van iOS- en Android-stijlen.

## Linear

**Functie/patroon:** toetsenbord-first, commandopalet (Cmd+K), minimale chrome, issue-detail als zijpaneel.

**Hoe het werkt:** Cmd+K opent een zoekveld waarin je direct typt ("actie jan", "TRA vijzel"); resultaten verschijnen met sneltoets erbij. Alles is bereikbaar zonder muis.

**Waarom:** voor geoefende gebruikers is elke klik ruis; snelheid geeft een gevoel van controle.

**Toepassing WPI:** Cmd+K op desktop voor coördinator en hoofd: spring naar TRA-regel, open actie, zoek monteur. Op mobiel hetzelfde als lange-druk-menu. Houd het secundair — de primaire flow blijft het begeleide gesprek.

**Grens/risico:** keyboard-first is onbruikbaar met handschoenen op locatie. Bouw het als laag bovenop, niet als enige ingang.

## Things 3

**Functie/patroon:** rust, witruimte, één ding per scherm, natuurlijke datumtekst ("morgen"), vloeiende afvink-animatie.

**Hoe het werkt:** grote koppen, één primaire knop, een checkmark die zacht wegveegt bij afronden. Geen tellers, geen badges.

**Waarom:** één primaire actie per scherm verlaagt de kans op fouten; rust verlaagt stress.

**Toepassing WPI:** het begeleide gesprek blijft één vraag per scherm ("Wat zie je?"), maar met Things-rust: grote kop, één CTA, subtiele checkmark bij "Conform". Termijn als "binnen 2 weken" in plaats van een datumveld. Bovenin een compacte samenvatting ("3 waarnemingen, 1 afwijking") zodat de inspecteur weet waar hij is.

**Grens/risico:** te veel wit betekent minder info per scherm — buiten in de zon moet hij scrollen. Compenseer met de compacte samenvatting, niet met kleinere letters.

## Notion

**Functie/patroon:** blokken-editor, slash-commando ("/"), properties als pills, relationele databases.

**Hoe het werkt:** "/" opent een menu (foto, TRA-regel, actie); blokken zijn sleepbaar; properties tonen status als gekleurde pill.

**Waarom:** flexibel en herkenbaar voor kantoormensen; dezelfde bouwstenen voor rapport en dashboard.

**Toepassing WPI:** de rapport-preview als blokken (waarneming + foto + oordeel + actie), en "/" in het notitieveld voor "/foto" of "/TRA-regel". Neem de editor niet over — alleen het blok-denken.

**Grens/risico:** Notion is traag en complex; niet namaken. Belangrijker: Notion's AI-suggesties zijn ook maar voorstellen — ons patroon moet hetzelfde zijn: AI-voorstel altijd met "Bevestig"-knop en herleidbare bron (welke TRA-regel, welke woorden). Nooit een oordeel of waarneming die de inspecteur niet zelf bevestigde.

## Revolut

**Functie/patroon:** data-dichte dashboards, grote KPI-getallen, sparklines, kleurcodering, haptiek bij transacties.

**Hoe het werkt:** bovenaan één groot getal ("12 open afwijkingen"), daaronder een sparkline van de trend, en kleur alleen waar het betekenis heeft.

**Waarom:** cijfers zijn direct scanbaar; kleur geeft status, geen decoratie.

**Toepassing WPI:** dashboard-tegels voor hoofd en directie: groot getal, sparkline, kleur alleen voor status (open/te laat/afgerond). Drill-down opent met dezelfde kaartstijl, zodat de klik voelt als inzoomen.

**Grens/risico:** Revolut is speels en kleurrijk; WPI moet rustig blijven. Geen gradients, geen decoratieve kleuren — alleen statuskleur. En: KPI's zijn geen oordeel; de trendanalyse (VCA 7.2) blijft mensenwerk met AI als voorstel.

## Arc

**Functie/patroon:** ruimtelijke interface: "spaces" in een zijbalk, zwevende tab-previews, subtiele blur.

**Hoe het werkt:** de zijbalk groepeert contexten; overlays zijn licht doorschijnend; de achtergrond blijft rustig.

**Waarom:** ruimte en hiërarchie maken navigatie voorspelbaar — je weet altijd "waar" je bent.

**Toepassing WPI:** op desktop een zijbalk met "Vandaag", "Mijn acties", "Alle inspecties", "Trends" als ruimtes. Blur alleen op overlays (actie-sheet), nooit op content — leesbaarheid buiten gaat voor.

**Grens/risico:** Arc is experimenteel en visueel zwaar; blur kost performance op oude tablets. Ik ben niet zeker van alle details van Arc's nieuwste versie — toets het patroon, niet de pixel.

## Top-5 aanbevelingen

1. **Design tokens in één bestand** (kleur, type, spacing, radius, schaduw). *Moeite: laag — Impact: hoog.* Eén bron voor web en PWA voorkomt drift.
2. **Semantische statuskleuren + 44pt tikdoelen + Dynamic Type.** *Moeite: laag — Impact: hoog.* Direct merkbaar met handschoenen en in de zon.
3. **Things-rust in het begeleide gesprek, met compacte samenvatting bovenin.** *Moeite: midden — Impact: hoog.* Minder fouten, meer overzicht.
4. **Commandopalet (Cmd+K / lange druk) als tweede ingang.** *Moeite: midden — Impact: midden.* Voor coördinator en hoofd op desktop.
5. **Revolut-achtige KPI-tegels met sparklines, kleur alleen voor status.** *Moeite: midden — Impact: hoog.* Maakt VCA 7.2-trendanalyse in één oogopslag leesbaar.

De rode draad: rust is geen esthetiek maar een veiligheidsmaatregel. AI blijft overal "Voorstel" — de inspecteur bevestigt, en elke bevestiging is herleidbaar tot zijn eigen waarneming.

===== 12-buiten-ergonomie =====
## Inleiding
Voor WPI op gemalen en zuiveringen is de echte test niet “mooi op kantoor”, maar: handschoen aan, felle zon, lawaai, één hand vrij, soms nat en haast. Onderstaande producten en apps bieden concrete ontwerppatronen die we kunnen overnemen zonder de kernregel te breken: AI doet nooit een waarneming of oordeel; alles heet **Voorstel** tot de inspecteur bevestigt.

## Samsung Galaxy XCover 6 Pro/7: touch sensitivity en glove-achtige modus
**Functie/patroon:** robuuste telefoon met instelbare touchgevoeligheid; op sommige modellen een expliciete glove-achtige modus. Exacte naam verschilt per model—eerst op het toestel verifiëren.
**Hoe het werkt:** in Instellingen staat een schakelaar die het aanraakscherm gevoeliger maakt; knoppen blijven groot, de behuizing heeft fysieke toetsen. Feedback is vooral visueel: grotere raakvlakken en soms een korte trilbevestiging.
**Waarom:** een gevoeliger scherm en fysieke toetsen verlagen missers met handschoenen.
**Toepassing in WPI:** bij de stap “Wat zie je?” en het oordeel C/A/V gebruiken we een **Veldmodus** met 56–64 dp tikdoelen; de inspecteur ziet drie grote knoppen onderaan. Instelling “Handschoen” verhoogt touchgevoeligheid en toont de tekst “Handschoenmodus actief”.
**Grens/risico:** niet elke handschoen werkt; test met de echte handschoenen. Geen automatisch oordeel. Moeite: midden.

## Garmin Instinct 2/Fenix 7: outdoor-interface met fysieke knoppen
**Functie/patroon:** MIP-transflectief display, grote datavelden, fysieke knoppen en tril/auditieve alerts.
**Hoe het werkt:** je leest in één oogopslag enkele grote waarden; knoppen werken met handschoenen; bevestiging via korte trilling en tekst “OK”.
**Waarom:** zonlicht leesbaar, minder afhankelijk van precisietikken, bediening zonder kijken.
**Toepassing in WPI:** bovenin een **statusbalk** met taak, TRA-regel en oordeel; onderaan C/A/V als grote knoppen. Waar technisch haalbaar: volumetoets als “volgende/bevestig”. Bij bevestiging korte trilling en tekst “Oordeel vastgelegd”.
**Grens/risico:** te veel glance-info kan nuance verbergen; fysieke toetsen kunnen per Android-toestel verschillen. AI blijft Voorstel. Moeite: midden.

## Zebra TC52/TC57: enterprise-handheld met programmeerbare toetsen
**Functie/patroon:** robuuste handheld, grote tikdoelen, fysieke toetsen, luide speaker en beheerbare configuratie.
**Hoe het werkt:** vaste toetsen voor scannen/spraak; groot touchscreen; duidelijke statusiconen. Handschoenondersteuning is model-/configuratieafhankelijk—verifiëren.
**Waarom:** minder afhankelijk van kleine touchknoppen; geschikt voor productiewerk.
**Toepassing in WPI:** spraakopname “Wat doen de monteurs nu?” via een fysieke push-to-talk-knop; foto via aparte toets. Scherm toont “Opname loopt” en “Loslaten = stoppen”.
**Grens/risico:** duurder, beheer nodig; niet automatisch privacy-proof. Spraak kan persoonsgegevens bevatten: lokaal versleutelen, bewaartermijn en roltoegang. Moeite: hoog.

## CAT S62 Pro/S75: natte vingers en handschoenen
**Functie/patroon:** robuuste telefoon; fabrikant noemt natte-vinger- en handschoenbediening (per model verifiëren), plus programmeerbare knop.
**Hoe het werkt:** touch reageert beter op vocht/handschoen; extra knop opent direct camera of app.
**Waarom:** inspecteurs hebben vaak natte of vieze handen.
**Toepassing in WPI:** de programmeerbare knop opent direct “Wat zie je?” met camera; na foto verschijnt grote thumbnail en “Foto toevoegen aan waarneming?”.
**Grens/risico:** niet alle modellen/Android-versies gelijk; testen. Foto’s van mensen of locaties: minimaliseren, geen gezichten tenzij nodig. Moeite: midden.

## WhatsApp: spraakbericht met vasthouden en wegschuiven
**Functie/patroon:** grote microfoonknop; ingedrukt houden om op te nemen, omhoog schuiven om te annuleren, loslaten om te verzenden; waveform en tijdsduur.
**Hoe het werkt:** één duim, duidelijke tekst “Houd ingedrukt om op te nemen”; tijdens opname verschijnt een rode balk en “Schuif omhoog om te annuleren”.
**Waarom:** eenvoudig, fouttolerant en éénhandig.
**Toepassing in WPI:** in “Wat doen de monteurs nu?” een grote onderduim-microfoon: vasthouden, spreken, loslaten. Transcriptie verschijnt als **Voorstel** met knop “Bevestig taak”.
**Grens/risico:** lawaai en privacy; transcriptie is AI-suggestie, nooit oordeel. Moeite: laag.

## Google Camera/Pixel Camera: volumetoets als sluiter
**Functie/patroon:** volumeknop als camera-sluiter; grote sluiterknop; directe thumbnail.
**Hoe het werkt:** één klik, korte feedback, foto verschijnt linksonder; geen kleine knop zoeken.
**Waarom:** handschoen- en éénhandvriendelijk; minder bewegingsfout.
**Toepassing in WPI:** in de fotostap “Wat zie je?” doet volume-omlaag een foto; trilfeedback en tekst “Foto vastgelegd”. Daarna kiest de inspecteur “Gebruik bij waarneming”.
**Grens/risico:** per ongeluk foto’s; duidelijke verwijderknop. Geen AI-herkenning die zelf een afwijking benoemt. Moeite: midden.

## iOS/Android Accessibility: Increase Contrast en High contrast text
**Functie/patroon:** hoog contrast, grote tekst, minder transparantie.
**Hoe het werkt:** iOS: Instellingen > Toegankelijkheid > Weergave en tekstgrootte > Contrast verhogen. Android: Toegankelijkheid > Hoog contrast tekst. Gebruiker ziet hardere randen, minder pastel, grotere letters.
**Waarom:** zonlicht en vermoeidheid vragen contrast, niet subtiliteit.
**Toepassing in WPI:** schakelaar **Zonmodus**: zwarte achtergrond, witte/gele tekst, 18–20 pt, dikke iconen, geen pastelkaarten. De inspecteur ziet bovenaan “Zonmodus” en kan direct C/A/V kiezen.
**Grens/risico:** wijkt af van Apple-achtige huisstijl; test op kleurenblindheid. Moeite: laag.

## Top-5 aanbevelingen
1. **Zonmodus + 56–64 dp tikdoelen** — moeite: laag; impact: hoog.
2. **Handschoen-/nattevingertest en toestelkeuze** (Samsung XCover, CAT, Zebra) — moeite: midden; impact: hoog.
3. **Haptische bevestiging bij C/A/V en “Voorstel bevestigd”** — moeite: laag; impact: midden.
4. **Volumetoets als camera-sluiter en push-to-talk voor spraak** — moeite: midden; impact: midden.
5. **Eénhandige Veldmodus met onderduim-acties en expliciete “Voorstel”-labeling** — moeite: midden; impact: hoog.

===== 13-offline-sync =====
## Offline-first en synchronisatie voor WPI

Voor WPI is offline-first geen technisch detail maar een vertrouwensbelofte: een inspecteur met handschoenen, haast en slecht bereik moet altijd kunnen zien of zijn waarneming, oordeel en actie veilig zijn opgeslagen. Hieronder zes bestaande producten en wat we daarvan leren. Ik benoem ook waar ik twijfel over offlinegedrag.

### Notion offline
1. **Functie/patroon:** offline modus waarbij recente pagina’s lokaal beschikbaar zijn en wijzigingen later synchroniseren.
2. **UX:** een offline-indicator, pagina’s die “beschikbaar offline” zijn, en bewerken zonder directe cloudverbinding. Bij herstel synchroniseert Notion; de gebruiker merkt vooral dat de pagina lokaal opent.
3. **Waarom het werkt:** de app verbergt netwerkafhankelijkheid achter een lokale kopie. Je kunt doorwerken en ziet later dat sync volgt.
4. **Toepassing in WPI:** vóór vertrek ziet de inspecteur per TRA: “Lokaal beschikbaar” of “Nog niet gedownload”. Op locatie opent hij de TRA-regels en het inspectiescherm zonder netwerk. Na “Wat zie je?” en foto ziet hij “Op dit toestel opgeslagen — sync volgt”.
5. **Grens/risico:** Notion-databases en relaties zijn offline niet altijd volledig; test dit. AI-suggesties blijven “Voorstel”; de inspecteur bevestigt. Foto’s/voice kunnen persoonsgegevens bevatten: versleutel lokaal en wis na sync volgens AVG-bewaarbeleid. Moeite: midden.

### Figma
1. **Functie/patroon:** realtime multiplayer, aanwezigheid, autosave en versiehistorie. Figma ken ik vooral als online samenwerkingspatroon; volledige offline editing is niet het kernverhaal.
2. **UX:** gekleurde cursors met namen, selectiekaders, comments en automatisch opslaan zonder “Opslaan”-knop. Je ziet wie meekijkt.
3. **Waarom het werkt:** continue feedback en gedeelde context voorkomen dubbel werk; versiehistorie maakt herstel mogelijk.
4. **Toepassing in WPI:** niet op de inspectie zelf, maar bij gedeelde acties en trendanalyse: toon “Coördinator kijkt nu mee” en een automatische versiehistorie per actie. De inspecteur ziet alleen “Laatst bijgewerkt door…”. 
5. **Grens/risico:** aanwezigheid kan afleiden op locatie; houd het beperkt tot dashboard/actieoverzicht. Geen AI-oordeel. Moeite: midden.

### Things Cloud
1. **Functie/patroon:** lokaal-first takenbeheer met eigen sync via Things Cloud; geen expliciete opslaanknop.
2. **UX:** wijzigingen verschijnen direct; in instellingen staat syncstatus en “laatst gesynchroniseerd”. De app voelt lokaal en snel.
3. **Waarom het werkt:** de lokale database is leidend; sync is achtergrondwerk. Daardoor blijft de app bruikbaar zonder bereik.
4. **Toepassing in WPI:** elke inspectie krijgt een statuschip: “Veilig op dit toestel” → “In wachtrij” → “Gesynchroniseerd”. Bij twijfel tikt de inspecteur op “Sync nu” en ziet “Laatst gesynchroniseerd: 14:32”.
5. **Grens/risico:** gebruikers kunnen “op dit toestel” verwarren met “in de cloud”. Maak verschil expliciet. Lokale data op gedeelde toestellen vraagt toegangscode en encryptie. Moeite: laag/midden.

### Google Docs offline
1. **Functie/patroon:** offline bewerken via lokale cache, met offline-indicator en later syncen; bij conflicten kunnen conflictkopieën ontstaan.
2. **UX:** “Offline” in de titelbalk, grijze status, en na herstel “Alle wijzigingen opgeslagen”. Bij conflict ziet de gebruiker een kopie.
3. **Waarom het werkt:** duidelijke status en nooit stil data verliezen. Conflictkopie is lelijk maar herleidbaar.
4. **Toepassing in WPI:** toon in de app-balk “Offline — wijzigingen worden lokaal bewaard”. Bij syncconflict op een actie opent een eenvoudig scherm: “Deze actie is op twee toestellen gewijzigd. Kies de juiste versie of bewaar beide in het conflictlog.”
5. **Grens/risico:** conflictkopieën verwarren en kosten beheer. Voor VCA-audit moet het conflictlog onveranderlijk zijn. AI vult nooit het oordeel in. Moeite: midden/hoog.

### WhatsApp-wachtrij
1. **Functie/patroon:** berichtenwachtrij met statusiconen: klokje, één vinkje, twee vinkjes, mislukt/opnieuw.
2. **UX:** een klokje betekent “wacht op netwerk”; een uitroepteken betekent “mislukt — tik om opnieuw te proberen”. Zeer herkenbaar.
3. **Waarom het werkt:** de gebruiker ziet per item of het al verstuurd is, zonder technische termen.
4. **Toepassing in WPI:** elke foto, actie en handtekening krijgt een status: “In wachtrij”, “Verzonden”, “Ontvangen”, “Mislukt — opnieuw”. De inspecteur kan gerust de app sluiten; bij heropenen ziet hij de wachtrij.
5. **Grens/risico:** WhatsApp is geen bewijssysteem; gebruik alleen het UX-patroon. Eindrapport en handtekening mogen niet afhankelijk zijn van een onbevestigde wachtrij. Moeite: laag.

### Linear sync-engine
1. **Functie/patroon:** local-first cache, optimistic updates en achtergrondsync. Ik ken Linear als snel en lokaal aanvoelend; volledige offline garanties kan ik niet bevestigen.
2. **UX:** directe navigatie, wijzigingen verschijnen meteen, en bij netwerkproblemen een offline-balk of wachtrij. 
3. **Waarom het werkt:** optimistic UI maakt werken snel; sync repareert later. Dat werkt alleen met een betrouwbare wachtrij.
4. **Toepassing in WPI:** de app opent direct met lokale TRA’s en inspecties. Bij “Conform” of “Afwijking” ziet de inspecteur meteen het oordeel, maar met label “Nog niet veilig gesynchroniseerd”. Pas na bevestiging wordt het “Gesynchroniseerd”.
5. **Grens/risico:** optimistic UI kan falen verbergen. Toon nooit “opgeslagen” voordat de lokale transactie duurzaam is. Geen AI-oordeel; alleen “Voorstel”. Moeite: hoog.

## Top-5 aanbevelingen
1. **Durable outbox met status per record** — moeite: midden, impact: hoog. Elke waarneming, foto, actie en handtekening is een apart queue-item met retry.
2. **Expliciete opslagstatus in gewone taal** — moeite: laag, impact: hoog. “Veilig op dit toestel”, “In wachtrij”, “Gesynchroniseerd”, “Mislukt — opnieuw”.
3. **Conflictregels en conflictlog** — moeite: midden/hoog, impact: hoog. Inspecties als onveranderlijke gebeurtenissen; acties met zichtbare conflictkeuze voor auditor.
4. **Offline voorbereiding en preflight** — moeite: midden, impact: hoog. Voor vertrek: TRA’s, formulieren en recente dossiers lokaal; waarschuwing bij ontbreken.
5. **Sync-monitor voor beheer en auditor** — moeite: midden, impact: midden/hoog. Laat zien wat lokaal, in wachtrij of gesynchroniseerd is, met export en herleidbare tijdlijn. AI blijft overal “Voorstel”; de inspecteur bevestigt.

===== 14-ai-vertrouwen =====
## AI-voorstellen en vertrouwen in de WPI-app

De kern is niet of AI slim is, maar of een inspecteur met handschoenen, haast en slecht bereik snel kan zeggen: “dit is mijn waarneming, dit voorstel neem ik over of niet.” Ik gebruik zes bestaande producten als ontwerpbron. Steeds: functie/patroon, concreet gedrag, waarom het werkt, toepassing in WPI en de grens. Uitgangspunt blijft: AI toont alleen een **Voorstel**; de inspecteur bevestigt. AI verzint nooit een waarneming of oordeel.

## ChatGPT

**Functie/patroon:** conversationeel concept. ChatGPT toont een antwoord als tekstblok dat de gebruiker leest, kopieert, bewerkt of opnieuw laat genereren. Er is geen automatische overname in een formulier.

**Hoe het werkt:** chatvenster, antwoord in lopende tekst, knoppen als “Kopiëren” en “Opnieuw proberen”; soms duim omhoog/omlaag. De gebruiker blijft expliciet eigenaar van wat hij overneemt.

**Waarom het werkt:** lage verplichting, volledig bewerkbaar, geen schijnprecisie.

**In WPI:** bij “Wat moet er gebeuren?” na een Afwijking/Verbeterpunt toont de app een kaart **“Voorstel actie (concept)”**, gebaseerd op de door de inspecteur gekozen waarneming en maatregel. Knoppen: “Overnemen”, “Aanpassen”, “Opnieuw”. De inspecteur vult actiehouder, toetser (niet dezelfde persoon) en termijn zelf in of bevestigt een voorstel daarvoor.

**Grens/risico:** AI mag geen nieuwe feiten toevoegen. Geen vrije tekst met persoonsgegevens naar een externe AI zonder DPA/grondslag. Moeite: midden.

## GitHub Copilot

**Functie/patroon:** inline “ghost text”. In de editor verschijnt grijze, tijdelijke tekst. Tab accepteert, Esc wijst af; soms zijn er alternatieven.

**Hoe het werkt:** de suggestie staat direct op de plek waar je typt, visueel ondergeschikt. Accepteren is één toets; negeren kost niets.

**Waarom het werkt:** contextueel, snel en omkeerbaar. De gebruiker blijft in de flow.

**In WPI:** in stap “Waar hoort dit bij?” verschijnt onder de waarneming een grijze chip: **“Voorstel: TRA-regel 4.2”**. De inspecteur tikt “Gebruik”, “Volgende” of “Zelf kiezen”. Daarna bevestigt hij pas het oordeel C/A/V. De AI toont nooit zelf C/A/V.

**Grens/risico:** snelheid kan tot blind overnemen leiden. Log daarom voorstel én beslissing. AI oordeelt niet; alleen regelvoorspelling op basis van tekst. Moeite: midden.

## Notion AI

**Functie/patroon:** AI-menu/panel in een document met opties als genereren, herschrijven, samenvatten; daarna “Insert”, “Replace”, “Try again” of “Discard”. Exacte labels verschillen per versie; ik ben daar niet 100% zeker van.

**Hoe het werkt:** een zijpaneel toont een preview; de gebruiker kiest expliciet invoegen, vervangen of weggooien. De originele tekst blijft zichtbaar tot bevestiging.

**Waarom het werkt:** scheiding tussen voorstel en document; review vóór overname.

**In WPI:** na een Afwijking/Verbeterpunt opent een zijpaneel **“Voorstel actie”** met prioriteit, “ter plaatse gecorrigeerd” en een conceptzin. De inspecteur ziet zijn eigen waarneming erboven staan en kiest “Overnemen”, “Aanpassen” of “Opnieuw”. Actiehouder, toetser en termijn blijven verplichte velden.

**Grens/risico:** AI-tekst kan generiek lijken. Geen automatische toewijzing van personen. AVG: geen foto’s/audio onnodig naar AI. Moeite: laag/midden.

## Gmail Smart Compose

**Functie/patroon:** inline autocomplete. Terwijl je typt verschijnt grijze aanvulling; Tab accepteert, doortypen negeert.

**Hoe het werkt:** zeer subtiel in het tekstveld, zonder pop-up. De suggestie vult alleen aan; de gebruiker kan direct doorwerken.

**Waarom het werkt:** minimale interruptie en een duidelijk “nee” zonder handeling.

**In WPI:** in het actietekstveld verschijnt grijze aanvulling op basis van de eigen typing van de inspecteur, bijvoorbeeld “Herhaal de TRA-instructie bij aanvang…”. Onderaan staat klein: “Tab = overnemen”. Alleen formulering, geen inhoudelijke beoordeling.

**Grens/risico:** verkeerde nuance of taal. Niet gebruiken voor TRA-regel of oordeel. AVG: lokaal of via goedgekeurde verwerker. Moeite: laag.

## Grammarly

**Functie/patroon:** onderstreping met uitlegkaart. Een suggestie verschijnt als markering; klik opent een kaart met uitleg en “Accept”/“Dismiss”.

**Hoe het werkt:** kleurmarkering in de tekst, detailkaart met reden (“duidelijker”, “vermijd vaagheid”), accepteren of negeren per suggestie.

**Waarom het werkt:** uitleg “waarom” verhoogt vertrouwen en maakt gedeeltelijke acceptatie mogelijk.

**In WPI:** na het inspreken van “Wat zie je?” toont de app alleen bij onduidelijke tekst een kaart: **“Voorstel: noem locatie of maatregel”** met uitleg “Je waarneming noemt geen bron/maatregel”. De inspecteur kan de aanvulling invoegen of negeren. Geen compliance-oordeel.

**Grens/risico:** Grammarly is stijl/taal, geen VCA-toets. Nederlands en vaktaal kunnen afwijken. AI oordeelt nooit; alleen tekstkwaliteit. Moeite: midden.

## Apple Intelligence

**Functie/patroon:** Writing Tools: herschrijven, proeflezen, samenvatten. Een popover toont een preview; de gebruiker kiest “Replace”, “Copy” of “Cancel”; exacte labels verschillen per OS/app, dus twijfel bij details.

**Hoe het werkt:** tekst selecteren, Writing Tools openen, voorbeeld bekijken, origineel vergelijken en pas daarna vervangen.

**Waarom het werkt:** preview en omkeerbaarheid; waar mogelijk on-device/private cloud, al blijft dat per functie en regio verschillen.

**In WPI:** na voice-transcriptie op “Wat zie je?” verschijnt **“Voorstel: verduidelijk waarneming”** met preview. Knoppen: “Vervang”, “Bekijk origineel”, “Annuleer”. Alleen tekst; nooit een nieuwe waarneming.

**Grens/risico:** beschikbaarheid, Nederlandse kwaliteit en privacyclaims verschillen. Geen audio/foto naar AI zonder noodzaak. Moeite: midden/hoog.

## Conclusie en top-5

Toon nooit schijnzekerheid met percentages tenzij gevalideerd. Beter: “Gebaseerd op jouw zin X en TRA-regel Y”. Elke suggestie heet **Voorstel**, met bron, korte “waarom”, en expliciet accepteren/afwijzen. Log voorstel en beslissing voor VCA 7.1/7.2; trendanalyse alleen op bevestigde data.

1. **Uniforme Voorstel-component**: label, bron, waarom, accepteren/afwijzen/bewerken. Moeite: midden; impact: hoog.
2. **Inline TRA-regelvoorstel** zoals Copilot, met “Gebruik/Volgende/Zelf kiezen”. Moeite: midden; impact: hoog.
3. **Grammarly-achtige uitlegkaart** voor actietekst en onduidelijke waarneming. Moeite: laag/midden; impact: midden.
4. **Audit trail + privacy-by-design**: log AI-voorstellen, geen persoonsgegevens onnodig naar externe AI. Moeite: midden; impact: hoog.
5. **Pilot met twee inspecteurs en twee schermen**, meet acceptatie, correctie en tijdwinst. Moeite: laag; impact: midden.

===== 15-locatie-assets =====
# Locatie, kaarten en installaties: wat de WPI-app kan leren van buiten

Een inspectie begint in de praktijk niet bij een formulier, maar bij de vraag: *sta ik wel bij de juiste installatie?* Voor Noardling is dat geen detail — een vijzel op pomp 3 is een andere TRA dan de beluchter op pomp 4. Hieronder zes bestaande producten, ook buiten onze branche, met per stuk het patroon, de werking, de toepassing in WPI en de grens.

## Google Maps

**(1) Functie.** Kaart met blauwe "mijn locatie"-stip, handmatig een pin droppen (lang indrukken), en offline kaartgebieden downloaden. **(2) Werking.** Eén tik op de stip-knop centreert de kaart; een lange druk zet een speld met "Vastgezet" en coördinaten eronder. Offline gebieden zijn vooraf te kiezen en werken zonder bereik. **(3) Waarom het werkt.** De blauwe stip geeft directe, visuele zekerheid zonder tekst; offline werkt waar rioolwaterzuiveringen nu eenmaal staan — in de polder. **(4) In WPI.** Op het startscherm "Waar sta je?" een halve kaart met blauwe stip en de dichtstbijzijnde installatie-pin. Eén knop: "Hier ben ik". De coördinaat gaat mee in het rapport, niet continu. **(5) Grens.** GPS drift in gebouwen en tussen bassins; daarom nooit als enige bewijs. AVG: alleen bij start/einde inspectie vastleggen, niet tracken. Offline tiles kosten opzetwerk (midden).

## what3words

**(1) Functie.** Elk 3×3 m-vlak krijgt drie woorden, bijv. `///zalm.geel.kade`. **(2) Werking.** Intoetsen of via de app; het adres verschijnt als tekst en is deelbaar. **(3) Waarom het werkt.** Eenduidig in weiland zonder straatnaam, en menselijk leesbaar voor in een rapport. **(4) In WPI.** Optioneel veld "Exacte plek" bij de werkplek, naast de kaart. De inspecteur typt of plakt het adres; het rapport toont het onder de installatienaam. **(5) Grens.** Licentie/kosten en naamsbekendheid bij monteurs — niet elke ploeg kent het. AI mag hier niets aanvullen: alleen wat de inspecteur invoert telt. Moeite laag, impact laag.

## Uber — ophaalpunt

**(1) Functie.** Bevestigingspatroon: "Is dit de juiste plek?" met een versleepbare pin. **(2) Werking.** Na boeking verschijnt een kaart met pin en de tekst "Je chauffeur komt hier"; de pin is te verslepen en met "Bevestig ophaalpunt" af te ronden. **(3) Waarom het werkt.** Expliciete bevestiging in plaats van stilzwijgende aanname — precies wat VCA 7.1 wil: aantoonbaar dat de inspecteur de werkplek heeft vastgesteld. **(4) In WPI.** Na QR-scan of locatiebepaling een scherm: "Is dit de juiste installatie?" met foto, naam en pin. Eén tik "Ja, start inspectie" of "Nee, andere kiezen". Geen automatische doorgang. **(5) Grens.** Bij haast en handschoenen is elke extra tik er één te veel — houd het bij één bevestiging, niet drie. Moeite laag, impact midden.

## UpKeep

**(1) Functie.** QR- of NFC-sticker op een asset opent direct de bijbehorende werkorder. **(2) Werking.** Camera open, scannen, en de asset-kaart verschijnt met geschiedenis en "Start work order". NFC werkt door de telefoon tegen de sticker te houden — handig met handschoenen. **(3) Waarom het werkt.** Geen zoeken in lijsten; de context komt naar de gebruiker toe. **(4) In WPI.** QR-sticker op elke vijzel, pomp en roosterreiniger. Scan → taak + bijbehorende TRA-regels worden voorgesteld als **Voorstel**; de inspecteur bevestigt. NFC als alternatief voor de QR. **(5) Grens.** Stickers raken vuil of vallen af; NFC zit niet op elk toestel. Beheer van codes (wie plakt, wie vervangt) is echte moeite — midden. AI verzint niets: de scan levert alleen het asset-ID.

## Fiix

**(1) Functie.** Asset-hiërarchie: klant → locatie → installatie, met QR per niveau. **(2) Werking.** Een boomstructuur in de app; tikken op een knooppunt toont alle onderliggende assets en historie. **(3) Waarom het werkt.** Herleidbaarheid — precies wat de externe VCA-auditor wil zien: welke inspectie hoort bij welke installatie, wanneer, door wie. **(4) In WPI.** Elke inspectie is verplicht gekoppeld aan een asset-ID; het rapport toont het pad (bijv. "RWZI Noord – Gemaal 2 – Vijzel B"). De trendanalyse (7.2) kan daardoor per installatie filteren. **(5) Grens.** Opzetwerk is fors; voor vijf inspecteurs moet de boom plat blijven (max. drie niveaus). Moeite midden, impact hoog voor de auditor.

## Apple Find My

**(1) Functie.** Locatie delen met "aangekomen"-melding. **(2) Werking.** "Deel mijn locatie" → contactpersoon ziet een avatar op de kaart en krijgt een pushmelding "Jan is aangekomen". **(3) Waarom het werkt.** Vertrouwd, geen handeling nodig, en de melding is een natuurlijk startsein. **(4) In WPI.** De coördinator ziet op het dashboard "Inspecteur onderweg / aangekomen / klaar" zonder te bellen. Optioneel: een regel in het rapport "Aangekomen 09:14, vertrokken 10:02". **(5) Grens.** AVG — alleen tijdens werktijd, opt-in per inspectie, nooit structureel. Dit is de gevoeligste toevoeging; juridisch eerst aftikken. Moeite midden, impact midden.

## Google Lens (als zevende, kort)

Lens laat zien hoe "scan → herken → toon context" aanvoelt: camera, kader, en direct een kaart met informatie. In WPI bruikbaar als **hulpmiddel** bij het voorstellen van een TRA-regel ("dit lijkt een hijsinstallatie"), maar altijd als Voorstel met expliciete bevestiging. Geen automatisch oordeel — dat blijft mensenwerk.

## Top-5 aanbevelingen

| # | Aanbeveling | Moeite | Impact |
|---|---|---|---|
| 1 | QR/NFC-scan als startpunt van elke inspectie (UpKeep-patroon), met expliciete bevestiging (Uber-patroon) | Midden | Hoog |
| 2 | Verplichte asset-koppeling met platte hiërarchie (Fiix-patroon) voor herleidbaarheid richting auditor | Midden | Hoog |
| 3 | Offline kaart + blauwe stip op het startscherm (Google Maps), coördinaat mee in rapport | Midden | Midden |
| 4 | "Aangekomen"-signaal voor de coördinator, opt-in per inspectie (Find My-patroon) | Midden | Midden |
| 5 | Optioneel what3words-veld voor buitengebieden en gemalen zonder straatnaam | Laag | Laag |

De rode draad: locatie en scan zijn **context**, geen oordeel. De app mag de inspecteur sneller bij de juiste installatie brengen — maar wat hij ziet, en of dat Conform, Afwijking of Verbeterpunt is, blijft zijn waarneming.

===== 16-onboarding =====
## Intro
Voor WPI past de leerprincipes van consumenten-apps goed: korte stappen, directe feedback, contextuele uitleg en herhaling. Belangrijk uitgangspunt blijft: AI mag nooit een waarneming of oordeel verzinnen. Elke suggestie heet **Voorstel** en de inspecteur bevestigt. Hieronder zes bestaande producten, met toepassing op onboarding, training en toolbox-uitleg.

## Duolingo
**Functie/patroon:** micro-lessen, directe feedback, voortgang en streak.  
**Hoe het werkt:** korte oefeningen in kaarten; na elk antwoord groen/rood-achtige feedback, uitleg en “doorgaan”. Voortgang is zichtbaar via streak/XP.  
**Waarom:** kleine stappen verlagen drempel; feedback en herhaling maken leren routine.  
**Toepassing WPI:** bij eerste login een verplichte, maar korte “Momentopname in 3 minuten”: 5 schermen met situaties. De inspecteur kiest bijv. “Wat is een waarneming?” en krijgt feedback: “Goed: ‘Ik zie geen valbeveiliging’ is een waarneming; ‘Monteur is onveilig’ is een oordeel.” Daarna een oefencasus met C/A/V en actiehouder. Op dashboard een “leerstreak” voor tips, niet voor productie.  
**Grens/risico:** gamification kan veiligheid trivialiseren; geen streakdruk. AI geeft alleen voorbeeldfeedback op vaste oefencasus, nooit op echte inspecties.

## Headspace
**Functie/patroon:** rustige onboarding, dagelijkse korte sessie/reminder, kalme visuele toon.  
**Hoe het werkt:** na een paar vragen komt de gebruiker op een “Today”-achtig scherm met één korte suggestie; reminder op vaste tijd; eenvoudige startknop.  
**Waarom:** één duidelijke volgende stap voorkomt overweldiging; rust verlaagt cognitieve last.  
**Toepassing WPI:** na inlog toont WPI bovenaan dashboard “Tip van de dag” in een pastelkaart: “Alleen wat je ziet telt. AI-voorstel? Bevestig of pas aan.” Tik opent een 30-seconden uitleg met foto en tekst. Voor monteurs-toolbox: korte “adempauze”-achtige instructie is niet nodig; wel een rustige 1-minuut “zo werkt de momentopname” met drie stappen.  
**Grens/risico:** te soft/te veel tekst voor lawaai en handschoenen; houd het op één kaart en één knop. Geen persoonsgegevens in dagelijkse tips.

## Khan Academy
**Functie/patroon:** oefenen met hints, mastery-voortgang en uitleg na fouten.  
**Hoe het werkt:** video/tekst, dan oefening; bij fout een hint of stapsgewijze uitleg; voortgang per vaardigheid.  
**Waarom:** fouten zijn leermomenten; mastery geeft inzicht zonder eindeloze checklist.  
**Toepassing WPI:** een “Leerpad WPI” met drie vaardigheden: waarnemen, TRA-regel koppelen, actie formuleren. Na een fout toont WPI een hint: “Kijk eerst naar de foto: welke maatregel uit de TRA is zichtbaar?” De inspecteur oefent met fictieve locaties; voortgang is zichtbaar voor coördinator.  
**Grens/risico:** lange video’s werken niet op locatie; maak 30–60 seconden. Voorkom dat mastery een verplichte checklist wordt; het is training, geen inspectie-oordeel.

## Appcues
**Functie/patroon:** in-app rondleidingen, tooltips, modals en checklists zonder code.  
**Hoe het werkt:** bij eerste gebruik licht een element op met tekstballon: “Typ of spreek in wat de monteurs nu doen”; knop “Volgende”; voortgangsstippen; later niet meer tonen.  
**Waarom:** uitleg precies op het moment dat de stap nodig is, in de echte interface.  
**Toepassing WPI:** eerste inspectie: tour langs “Wat doen de monteurs nu?” → “Taak als Voorstel bevestigen” → “Wat zie je? Foto maken” → “TRA-regel Voorstel” → “Oordeel C/A/V” → “Actie met actiehouder en toetser”. Tekst: “AI suggereert; jij bevestigt.” Bij A/V extra tooltip: “Toetser mag niet dezelfde persoon zijn.”  
**Grens/risico:** te veel tours irriteren; maximaal één tour, overslaanbaar, daarna via “?” terugvindbaar. Ik twijfel of Appcues exacte checklistfunctionaliteit in elk abonnement heeft; het patroon is leidend.

## Loom
**Functie/patroon:** korte scherm-/cameravideo’s met link delen.  
**Hoe het werkt:** opnemen met camera-bubbel, stoppen, link plakken; kijker ziet video en kan reageren.  
**Waarom:** beweging en stem leggen handelingen sneller uit dan tekst; ideaal voor toolbox.  
**Toepassing WPI:** bibliotheek met 60-seconden video’s: “Hoe maak ik een foto bij fel zonlicht?”, “Hoe koppel ik een waarneming aan een TRA-regel?”, “Toolbox: wat is een momentopname?” Monteur op locatie opent link of ziet video in WPI; daarna één Quizvraag.  
**Grens/risico:** video’s verouderen; eigenaar en kwartaalcheck nodig. Geen herkenbare monteurs/klantnamen zonder toestemming; liever fictieve voorbeelden.

## Quizlet
**Functie/patroon:** flashcards en korte oefenvormen.  
**Hoe het werkt:** kaart voor/achter, omdraaien, “Learn/Test”-achtige oefening; direct goed/fout.  
**Waarom:** actief ophalen werkt beter dan lezen; geschikt voor begrippen als C/A/V, actiehouder, toetser.  
**Toepassing WPI:** set “WPI-begrippen” voor nieuwe inspecteurs en toolbox voor monteurs: “Afwijking = …”, “Verbeterpunt = …”, “Wie mag toetsen?”. Na de toolbox mogen monteurs drie kaarten doen; resultaat is leer signaal, geen inspectieoordeel.  
**Grens/risico:** flashcards simplificeren; nooit als formeel bewijs van vakbekwaamheid. Geen persoonsgegevens; resultaten alleen op teamniveau.

## Top-5 aanbevelingen
1. **3-minuten microlearning + oefencasus in WPI** (Duolingo/Khan-patroon). Moeite: midden. Impact: hoog.  
2. **Eerste-inspectie rondleiding met Appcues-patroon**, maximaal één keer, met “AI = Voorstel”. Moeite: midden. Impact: hoog.  
3. **Tip van de dag op dashboard** (Headspace-patroon), één kaart, 30 seconden. Moeite: laag. Impact: midden.  
4. **Loom-bibliotheek + Quizlet-kaarten voor toolbox monteurs**. Moeite: laag/midden. Impact: midden/hoog.  
5. **Contentbeheer en AVG-check**: eigenaar, kwartaalreview, fictieve casussen, geen AI-auto-oordeel. Moeite: midden. Impact: hoog.

===== 17-audit-bewijs =====
## Onderzoeksnotitie: compliance, audit en bewijs voor WPI

WPI werkt met momentopnames: alleen wat de inspecteur ziet en bevestigt telt. Voor VCA 2026/6.1 eis 7.1 en 7.2 betekent dat: een herleidbaar inspectieverslag met positieve bevindingen, afwijkingen en acties, plus een jaarlijkse trendanalyse. De kernpatronen uit compliance-tools zijn bruikbaar: een read-only auditor-weergave, een bewijsmap per eis, een append-only logboek en ondertekende acties. AI blijft overal “Voorstel”; nooit een oordeel of waarneming. Exacte schermnamen van externe tools kunnen afwijken; ik beschrijf het kernpatroon.

### Vanta
**Functie/patroon:** compliance-automatisering met controls, bewijsmateriaal en auditor-toegang.  
**Gebruiker:** dashboard met controls en statussen; klik op een control opent een bewijsdrawer met bron, datum en status. Auditor ziet een read-only overzicht.  
**Waarom:** bewijs wordt aan een eis gekoppeld en continu ververst.  
**In WPI:** nieuwe rol “Auditor” met scherm **Bewijsmap VCA**. Per eis 7.1/7.2 staan kaarten: inspecties, positieve bevindingen, afwijkingen, acties, trendanalyse. De inspecteur ziet alleen zijn eigen invoer; de auditor ziet read-only PDF’s en brondata.  
**Grens/risico:** Vanta is geen veldinspectietool; integraties vervangen geen waarneming. AVG: verwerkersovereenkomst en dataminimalisatie. Moeite: midden.

### Drata
**Functie/patroon:** control-tests, evidence library en audit-hub-achtige samenwerking.  
**Gebruiker:** lijst met tests “Pass/Fail”, bewijsaanvragen en uploadstatus. Auditor vraagt bewijs op; status gaat van “aangeleverd” naar “geaccepteerd”.  
**Waarom:** scheiding tussen uitvoerder en auditor, met status en audit trail.  
**In WPI:** scherm **Bewijsloket**: auditor vraagt per VCA-eis bewijs op; inspecteur levert link naar inspectie/actie. Status “Aangeleverd/Geweigerd/Geaccepteerd”.  
**Grens/risico:** kan voor vijf inspecteurs te zwaar zijn. Rechten strikt scheiden. Moeite: midden.

### DocuSign
**Functie/patroon:** e-signature-enveloppen met velden, herinneringen en “certificate of completion”.  
**Gebruiker:** ondertekenaar tikt op “Sign here”, ziet samenvatting, tekent met vinger, krijgt bevestiging en later een certificaat met tijdstip en audit trail.  
**Waarom:** ondertekenceremonie plus tamper-evident bewijs.  
**In WPI:** laatste stap van het gesprek: monteur en inspecteur ondertekenen op de tablet. Daarna kan de toetser een actie ondertekenen als “Getoetst”. De auditor downloadt het certificaat bij het rapport.  
**Grens/risico:** niet elke handtekening is gekwalificeerd; eIDAS-niveau checken. AVG bij persoonsgegevens. Kies één leverancier. Moeite: laag/midden.

### Adobe Sign
**Functie/patroon:** vergelijkbaar: velden slepen, mobiel ondertekenen, audit report.  
**Gebruiker:** formulier met invulvelden; na ondertekenen verschijnt een audit trail met IP/tijd/apparaat.  
**Waarom:** bekend en mobiel bruikbaar.  
**In WPI:** actieafronding: toetser opent actie, ziet foto en waarneming, tikt “Akkoord na toetsing” en ondertekent. Auditor ziet audit report.  
**Grens/risico:** dubbele kosten met DocuSign; niet beide. Geen AI in bewijs. Moeite: laag.

### Qualio
**Functie/patroon:** QMS met documentbeheer, CAPA, audits, e-signatures en audit trail.  
**Gebruiker:** quality event → CAPA-workflow met eigenaar, termijn, verificatie en status. Documentversies zijn zichtbaar.  
**Waarom:** gesloten actielus en onafhankelijke toetsing.  
**In WPI:** actiescherm als “CAPA-lite”: bij A/V verplicht actiehouder, toetser (niet dezelfde persoon), termijn en prioriteit. Status “Open/In uitvoering/Getoetst/Afgerond”; afronden kan pas na toetserhandtekening.  
**Grens/risico:** Qualio is zwaar voor een kleine organisatie; kopieer niet de complexiteit. Moeite: hoog.

### GitHub
**Functie/patroon:** onveranderlijke historie, pull-request-review, branch protection, audit log en signed commits.  
**Gebruiker:** tijdlijn met commits, diff, review “Approved” en checks.  
**Waarom:** elke wijziging is een nieuwe versie; niets verdwijnt stil.  
**In WPI:** event-sourced log per inspectie: elke wijziging wordt een nieuwe versie met hash en tijdstip. Auditor ziet “C → A gewijzigd door inspecteur, 10:42”. Inspecteur ziet alleen “Versie 2 – gewijzigd” zonder jargon.  
**Grens/risico:** technisch complex; hash-keten en back-up goed regelen. Moeite: hoog.

### Box
**Functie/patroon:** contentbeheer met versiehistorie, rechten, retentie/governance en auditlogboeken.  
**Gebruiker:** mappenstructuur, uploaden, vergrendelen, versies bekijken en read-only links delen.  
**Waarom:** bewijs centraal, met rechten en bewaartermijn.  
**In WPI:** **Bewijsmap per VCA-eis** als vergrendelde map: rapport-PDF, foto’s, handtekeningcertificaten en actiebewijs. Auditor krijgt read-only link.  
**Grens/risico:** rechten en AVG; legal hold zit mogelijk in governance-editie. Moeite: midden.

## Top-5 aanbevelingen
1. **Auditor-rol + read-only bewijsmap per VCA-eis** — moeite: midden; impact: hoog.  
2. **Append-only eventlog met hash-keten** — moeite: hoog; impact: hoog.  
3. **Ondertekenceremonie met certificaat voor inspectie én actietoetsing** — moeite: midden; impact: hoog.  
4. **Actie-CAPA-lite met verplichte onafhankelijke toetser en termijn** — moeite: midden; impact: hoog.  
5. **Bewijsretentie, export en auditor-rapportage** — moeite: midden; impact: midden/hoog.

===== 18-samenwerking =====
## Inleiding
Voor de WPI-app van Noardling zoeken we communicatiepatronen die passen bij een kleine organisatie (ca. 5 inspecteurs), veldwerk met handschoenen, lawaai, zon en slecht bereik, en de eis van herleidbaarheid voor VCA 2026/6.1 eis 7.1 en 7.2. Uitgangspunt blijft: de inspecteur ziet en beoordeelt; AI mag nooit een waarneming of oordeel verzinnen. AI-suggesties heten in de app “Voorstel” en worden pas waarheid na bevestiging. Hieronder zes bestaande producten, ook buiten onze branche, met telkens het patroon, de gebruikerservaring, het waarom, de toepassing in WPI en de grens.

## Slack
**Functie/patroon:** kanalen, threads, @mentions, emoji-reacties, zoeken en herinneringen.  
**Gebruikerservaring:** links een kanalenlijst, midden de berichtenstroom, rechts een threadpaneel. Typ “@” en kies een naam; de ontvanger ziet een badge. Een thread houdt reacties bij één bericht; een reminder kan later terugkomen.  
**Waarom werkt het:** context blijft bij elkaar, ruis blijft laag en alles is doorzoekbaar.  
**Toepassing in WPI:** in het actiedetail een “Deel bevinding”-knop met een thread per actie. De inspecteur ziet: “Actie A-104 aan jou toegewezen. Toetsing door [naam] vóór 12-06.” Hij voegt foto/notitie toe; de actiehouder reageert in de thread. Een wekelijkse samenvatting gaat naar kanaal #wpi-weekoverzicht: open acties, verlopen termijnen, positieve bevindingen.  
**Grens/risico:** Slack is geen formeel inspectierecord; AVG en bewaartermijnen moeten in WPI blijven. Geen persoonsfoto’s in open kanalen. Moeite: midden.

## Microsoft Teams
**Functie/patroon:** kanalen per team/locatie, @mentions, tabs en kanaalposts met link.  
**Gebruikerservaring:** een kanaalpost verschijnt in de tijdlijn; bij @mention krijgt de actiehouder een melding. Een tab kan naar het WPI-rapport of actieoverzicht wijzen.  
**Waarom werkt het:** past bij organisaties met Microsoft 365, scheidt locaties/teams en houdt communicatie bij het dossier.  
**Toepassing in WPI:** “Deel in Teams” op het rapport: kanaal per werklocatie, post met link naar de actie en @actiehouder. De inspecteur ziet een bevestiging “Gedeeld in Teams” en de actie blijft leidend in WPI. De wekelijkse samenvatting kan als kanaalpost met dezelfde KPI’s.  
**Grens/risico:** tenantinstellingen en externe auditor-toegang kosten beheer; Teams mag niet het bronrecord worden. Moeite: midden.

## WhatsApp
**Functie/patroon:** besloten groepen, reply-quote, vastpinnen, spraakberichten en foto’s.  
**Gebruikerservaring:** chatlijst, swipe om te antwoorden, pin bovenaan, blauwe vinkjes. Zeer laagdrempelig.  
**Waarom werkt het:** iedereen kent het; snel bij lawaai of slecht bereik.  
**Toepassing in WPI:** alleen als meldkanaal, niet als dossier. De inspecteur tikt “Stuur herinnering” en deelt een deep link naar de actie; geen inhoudelijke foto’s of namen in de groep. De app toont: “Alleen melding verzonden; actie blijft in WPI.”  
**Grens/risico:** geen betrouwbare audit trail, privételefoons, AVG en bewaartermijnen. Niet gebruiken voor C/A/V of toetsing. Moeite: laag.

## Basecamp
**Functie/patroon:** Message Board, To-dos met toegewezene en deadline, comments en meldingen.  
**Gebruikerservaring:** een project bevat een to-dolijst; per taak zie je titel, wie, deadline en commentaar. Afvinken geeft visuele voortgang.  
**Waarom werkt het:** asynchroon, gestructureerd en verantwoordelijkheden zijn expliciet.  
**Toepassing in WPI:** een actie wordt een to-do: actiehouder, toetser als aparte rol in de omschrijving, termijn. De inspecteur ziet “Toegewezen aan [naam]” en “Toetsing door [naam]”. De wekelijkse samenvatting is een Message Board-post met open acties en trends.  
**Grens/risico:** apart systeem naast WPI geeft dubbel werk en offline beperkingen. Moeite: hoog.

## Loom
**Functie/patroon:** asynchrone scherm-/webcamopname met deel-link, comments en reacties.  
**Gebruikerservaring:** opnemen, stoppen, link plakken; kijker ziet video en kan reageren.  
**Waarom werkt het:** complexe context is sneller uitgelegd dan getypt.  
**Toepassing in WPI:** bij een lastige afwijking neemt de inspecteur 30–60 seconden op: “Dit zag ik bij de beluchter; let op de kabelroute.” De video hangt aan de actie; de actiehouder reageert. Geen AI-oordeel, alleen menselijke toelichting.  
**Grens/risico:** privacy van stem/beeld, opslag en bewaartermijn. Niet als bewijs zonder toestemming. Moeite: midden.

## Figma (opmerkingen)
**Functie/patroon:** commentaarspelden op een canvas/foto, @mentions, threads en “Resolve”.  
**Gebruikerservaring:** klik op het commentaaricoon, plaats een speld, typ @naam; de thread blijft zichtbaar tot resolven.  
**Waarom werkt het:** ruimtelijke context en sluiting zijn direct zichtbaar.  
**Toepassing in WPI:** in het rapport/foto een “speld” met opmerking: “Hier ontbreekt afscherming.” De inspecteur @mentioneert de actiehouder; de speld wordt pas groen na toetsing door de toetser. Zo ziet de auditor waarneming, actie en afsluiting bij elkaar.  
**Grens/risico:** Figma is ontwerpgereedschap, geen inspectiesysteem; toegang en bewaartermijnen moeten in WPI. Moeite: midden.

## Top-5 aanbevelingen
1. **Actiethread met @mention en status in WPI** — moeite: midden; impact: hoog.  
2. **Wekelijkse samenvatting als vast digest** (open acties, verlopen termijnen, positieve bevindingen) — moeite: laag; impact: hoog.  
3. **Delen via deep link; WhatsApp alleen als melding** — moeite: laag; impact: midden.  
4. **Commentaarspeld op foto/rapport, resolve pas na toetsing** — moeite: midden; impact: hoog.  
5. **Korte spraak/video-toelichting bij complexe afwijking, met privacycheck** — moeite: midden; impact: midden.

===== 19-rapporten =====
# Rapporten en documenten: van WPI-rapport tot jaaroverzicht

Een WPI-rapport moet ter plaatse kloppen, leesbaar zijn voor de monteur en herleidbaar voor de VCA-auditor. Een maand- of jaaroverzicht moet de directie in één oogopslag laten zien of het inspectieprogramma (VCA 7.1) en de trendanalyse (7.2) op koers liggen. Hieronder zeven bestaande producten, ook buiten onze branche, met per product wat we overnemen en waar de grens ligt.

## Canva

**Functie en patroon:** sjablonen, drag-and-drop en een merk-kit (vaste kleuren, lettertypen, logo's) voor rapporten en one-pagers.

**Ervaring:** links een balk met sjablonen en elementen, in het midden het canvas, rechts de eigenschappen. Je sleept een blok, ziet direct het resultaat, en de merk-kit waarschuwt bij afwijkende kleuren.

**Waarom het werkt:** de drempel is laag en de huisstijl blijft consistent zonder dat iemand hoeft na te denken over opmaak.

**Toepassing in WPI:** niet als editor voor de inspecteur, maar als visuele referentie voor de rapportgenerator. Het PDF-rapport krijgt vaste blokken: kop met locatie en taak, positieve bevindingen, afwijkingen met foto, acties met actiehouder en termijn. De inspecteur ziet alleen "Rapport gereed" en een voorbeeld.

**Grens:** Canva is handmatig en cloudgebaseerd; inspectiedata met foto's horen daar niet standaard. AI-functies in Canva mogen nooit een oordeel of waarneming invullen.

## Pitch

**Functie en patroon:** presentaties maken met sjablonen, gedeelde decks en een presentatorweergave.

**Ervaring:** een zijbalk met dia's, een editor met tekst- en beeldblokken, en een aparte presentatiemodus. Wijzigingen zijn direct zichtbaar voor het team.

**Waarom het werkt:** snel een verzorgde presentatie zonder vormgever.

**Toepassing in WPI:** voor de jaarlijkse trendanalyse (VCA 7.2) een compacte deck voor de directie: aantal inspecties, percentage Conform, top-afwijkingen per locatie, en de acties die daaruit volgen. De data komt uit het dashboard, niet uit handmatig overtypen.

**Grens:** Pitch is geen operationeel rapportage-instrument; de koppeling met inspectiedata moet worden gebouwd. Houd de deck intern; geen persoonsgegevens van monteurs delen.

## Notion

**Functie en patroon:** blokken en databases in één werkruimte, met sjablonen en slash-commando's.

**Ervaring:** je typt "/" en kiest een blok; een database schakelt tussen tabel-, bord- en kalenderweergave. Sjablonen herhalen vaste structuren.

**Waarom het werkt:** flexibel én gestructureerd; je bouwt eenmalig een mal en hergebruikt die.

**Toepassing in WPI:** als interne TRA-bibliotheek en als mal voor het maandoverzicht. De inspecteur ziet in de app bij "Waar hoort dit bij?" dezelfde TRA-regels als in de bibliotheek, zodat voorstel en normkader synchroon blijven.

**Grens:** Notion is niet handschoenproof en niet offline-first; het veldwerk blijft in de WPI-app. Cloudopslag vraagt een AVG-afweging.

## Apple Pages-sjablonen

**Functie en patroon:** ingebouwde, verzorgde documentsjablonen met vaste typografie en witruimte.

**Ervaring:** een sjabloonkieser, daarna een rustige editor met stijlen voor koppen, lijsten en bijschriften.

**Waarom het werkt:** goede defaults; je hoeft alleen inhoud toe te voegen.

**Toepassing in WPI:** als ontwerpreferentie voor de PDF: één kolom, duidelijke koppen, foto's met bijschrift, en een samenvatting bovenaan met "wat ging goed" vóór de afwijkingen. De inspecteur ondertekent en de PDF wordt lokaal opgeslagen.

**Grens:** iOS-only en handmatig; niet geschikt als generator. De inspecteur mag geen oordeel intypen dat niet is waargenomen.

## PandaDoc

**Functie en patroon:** documentautomatisering met variabelen, workflowstatussen en e-signatuur.

**Ervaring:** een sjabloon met placeholders; bij verzenden worden velden gevuld, de ontvanger ziet een ondertekenveld en de status gaat van "verzonden" naar "ondertekend".

**Waarom het werkt:** repetitief werk verdwijnt en ondertekening is aantoonbaar.

**Toepassing in WPI:** de rapportgenerator vult het sjabloon met inspectiedata, foto's en acties. De inspecteur en de monteur ondertekenen op het scherm; de status "afgerond" verschijnt pas na toetsing van de actie. Zo blijft de keten actie → toetser → afronding herleidbaar.

**Grens:** abonnement en cloudopslag; AVG vraagt een verwerkersovereenkomst. AI mag alleen een "Voorstel" leveren, nooit het oordeel C/A/V.

## Strava Year in Review

**Functie en patroon:** een jaarlijkse samenvatting van activiteiten met statistieken, hoogtepunten en vergelijkingen.

**Ervaring:** scrollbare kaarten met cijfers, persoonlijke records en "jouw jaar in cijfers". Rustig, persoonlijk, direct te begrijpen.

**Waarom het werkt:** het maakt abstracte data persoonlijk en herkenbaar.

**Toepassing in WPI:** een maand- en jaaroverzicht in het dashboard met kaarten: aantal inspecties, percentage Conform, meest voorkomende afwijkingen, en trend per locatie of taak. De inspecteur ziet zijn eigen cijfers; de directie ziet het geheel.

**Grens:** gamification kan kwantiteit boven kwaliteit stimuleren. Geen ranglijsten op aantal inspecties; focus op conformiteit en opvolging.

## Spotify Wrapped

**Functie en patroon:** een persoonlijk jaaroverzicht in story-kaarten, met animaties en een deelknop.

**Ervaring:** full-screen kaarten; tikken of swipen om verder te gaan; korte teksten en grote cijfers.

**Waarom het werkt:** kort, visueel en deelbaar; de kijker blijft hangen.

**Toepassing in WPI:** een reeks kaarten in de app voor het jaaroverzicht van de directie: "12 locaties geïnspecteerd", "87% Conform", "top-3 verbeterpunten", "acties op tijd afgerond". Niet extern deelbaar; alleen intern.

**Grens:** de toon mag veiligheid niet trivialiseren. Geen AI-interpretatie van trends zonder bevestiging door een coördinator; AVG bij persoonsgebonden cijfers.

## Top-5 aanbevelingen

1. **Rapportgenerator met PandaDoc-achtige variabelen en Pages-layout** — moeite: midden, impact: hoog. Automatisch vullen, ondertekenen en status "afgerond na toetsing".
2. **Maand- en jaaroverzicht met Strava-achtige kaarten in het dashboard** — moeite: midden, impact: hoog. Direct bruikbaar voor VCA 7.2.
3. **Canva-merk-kit als vaste rapportstijl** — moeite: laag, impact: midden. Consistente PDF's zonder handwerk.
4. **Notion-achtige TRA-bibliotheek, gekoppeld aan de voorstelfunctie** — moeite: midden, impact: midden. Houdt normkader en app synchroon.
5. **Pitch-achtige presentatiemodus voor de trendanalyse** — moeite: laag, impact: midden. Snelle, verzorgde deck voor de directie.

Overal geldt: AI levert hooguit een "Voorstel", de inspecteur bevestigt, en niets wordt een oordeel zonder eigen waarneming.

===== 20-veiligheid-melden =====
## Inleiding
Voor WPI is de kern: een monteur of inspecteur moet **laagdrempelig gevaar kunnen melden**, een **LMRA-achtige blik** kunnen koppelen aan de momentopname, en **terugkoppeling** krijgen op wat er met een melding gebeurt. De onderzochte apps laten vooral zien hoe je melden “klein” maakt, status zichtbaar houdt en acties bewaakt. Belangrijk voor ons: AI mag nooit een waarneming of oordeel verzinnen. Alles blijft **Voorstel** tot de inspecteur bevestigt.

## SafetyCulture / Heads Up
**(1) Functie/patroon:** snel een veiligheidsobservatie vastleggen, positief of negatief, met foto en actie. Heads Up is een lichte meldingsstroom naast inspecties.  
**(2) Werking:** in de app zie je een feed en een grote “+”-knop; je kiest Heads Up, maakt foto, typt kort wat je ziet, tagt locatie/persoon en stuurt. Je kunt een actie toewijzen en krijgt statusupdates.  
**(3) Waarom:** lage drempel, mobiel-first, zichtbare opvolging.  
**(4) In WPI:** op het scherm “Nog iets gezien?” een knop **Heads Up**. De inspecteur ziet: “Voorstel: positieve observatie” of “Voorstel: afwijking” op basis van zijn eigen tekst/foto. Hij bevestigt, kiest C/A/V en maakt pas daarna een actie.  
**(5) Grens/risico:** een feed kan te openbaar worden; foto’s van personen vragen AVG-grondslag en dataminimalisatie. Geen automatische ernstclassificatie.

## EcoOnline (incident- en bijna-ongevalmelding)
**(1) Functie/patroon:** gestructureerd incident, bijna-ongeval en gevaar melden met workflow, oorzaak, maatregelen en CAPA’s.  
**(2) Werking:** doorgaans een formulierwizard: wat is er gebeurd, waar, betrokkenen, ernst, directe maatregel, foto’s, getuigen; daarna actie toewijzen en status volgen.  
**(3) Waarom:** audit trail en rolgebaseerde opvolging; past bij VCA 7.1/7.2.  
**(4) In WPI:** een **Gevaar melden**-knop op home en in het gesprek. Locatie en taak worden voorgevuld; de melder kiest “anoniem” of naam. Na verzenden ziet hij een statuskaart: “Ontvangen — in behandeling — actie toegewezen — afgerond na toetsing”.  
**(5) Grens/risico:** formulieren worden snel te zwaar voor handschoenen/lawaai. Houd mobiel bij 3–5 velden. AVG: bewaartermijn, toegang per rol, geen foto’s zonder doel.

## Intelex (EHS-incidentmanagement)
**(1) Functie/patroon:** incidentmanagement, workflows, dashboards en trendanalyse.  
**(2) Werking:** vooral webachtig: meldingen, lijsten, filters, detailpagina’s, notificaties en rapportages. Minder “onderweg”-gericht.  
**(3) Waarom:** sterke beheerskant: acties, verantwoordelijkheden en analyse.  
**(4) In WPI:** niet als veldscherm, maar als voorbeeld voor het **actie-overzicht** en de trendanalyse: elke A/V-actie heeft actiehouder, toetser (niet dezelfde persoon), termijn en status “afgerond na toetsing”.  
**(5) Grens/risico:** complexiteit en invoerlast; kleine organisatie met 5 inspecteurs moet geen enterprise-proces nabouwen.

## Donesafe (HSI)
**(1) Functie/patroon:** mobiel incidenten en bijna-ongevallen melden, met workflow en notificaties.  
**(2) Werking:** kaarten, korte formulieren, foto-bijlage, status en toewijzing; anoniem melden is vaak een expliciete optie.  
**(3) Waarom:** melden kan direct vanaf de werkplek, zonder eerst achter een pc te zitten.  
**(4) In WPI:** de **melder-terugkoppeling**: na een melding ziet de melder alleen status en reactie, niet het hele inspectierapport. De inspecteur ziet in WPI een badge “1 nieuwe melding” en kan deze koppelen aan de lopende inspectie.  
**(5) Grens/risico:** anonimiteit botst soms met onderzoek; leg vooraf vast wat je terugkoppelt. Niet alle details van Donesafe ken ik zeker; de genoemde patronen zijn algemeen herkenbaar.

## 112NL-app
**(1) Functie/patroon:** snel 112 bellen met locatie en instructie.  
**(2) Werking:** grote belknop, locatiebepaling, korte tekst “Wat is er gebeurd?” en “Waar bent u?”; daarna spraak.  
**(3) Waarom:** extreem lage drempel in stress.  
**(4) In WPI:** een **Noodkaart** in de app: “Bel 112” met GPS-locatie, projectnaam en contactpersoon. Na afloop kan de inspecteur vrijwillig een incidentmelding maken; niets automatisch.  
**(5) Grens/risico:** geen automatische melding naar de organisatie; privacy van locatie alleen tijdens gebruik.

## NL-Alert
**(1) Functie/patroon:** overheidsalarm via zendmasten; geen gewone app maar een high-priority bericht met geluid en tekst.  
**(2) Werking:** volledig scherm met locatie, aard en advies; geen tweerichtingsverkeer.  
**(3) Waarom:** werkt zonder app en bereikt veel mensen tegelijk.  
**(4) In WPI:** het patroon van een **hoge-prioriteit banner** met concrete tekst en “Ik heb het gezien”. Niet voor interne meldingen gebruiken, wel voor noodinstructies op locatie.  
**(5) Grens/risico:** geen status of opvolging; niet verwarren met incidentmelden.

## LMRA koppelen aan de inspectie
Een specifieke Nederlandse LMRA-app kan ik niet betrouwbaar bij naam noemen; SafetyCulture/iAuditor wordt vaak als LMRA-formulier gebruikt. In WPI passen we het als **stap** toe: na “Wat zie je?” verschijnt “Is er een LMRA gedaan voor deze taak?” met opties Ja/Nee/Niet van toepassing. AI mag alleen een **Voorstel** doen op basis van de taak: “Voorstel: LMRA-kaart vijzelwerk”. De inspecteur bevestigt. Bij “Nee” wordt het een Verbeterpunt met actie, toetser en termijn.

## Top-5 aanbevelingen
1. **Gevaar melden-knop** op home en in gesprek, met foto/tekst/spraak, anoniem en statusterugkoppeling. **Moeite: midden. Impact: hoog.**
2. **LMRA-stap** in de inspectie met Ja/Nee/N.v.t. en Voorstel-label; geen automatisch oordeel. **Moeite: midden. Impact: hoog.**
3. **Actie-terugkoppeling** naar melder: “ontvangen — in behandeling — afgerond na toetsing”. **Moeite: midden. Impact: hoog.**
4. **Heads Up-achtige snelmelding** voor positieve en negatieve observaties, zonder zware velden. **Moeite: laag. Impact: midden.**
5. **Noodkaart** met 112-knop, locatie en projectcontact; NL-Alert-patroon alleen als banner. **Moeite: laag. Impact: midden/hoog.**
