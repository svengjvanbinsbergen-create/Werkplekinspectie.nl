# Design- en functionaliteitsonderzoek (DeepSeek-harnas, te cureren door Claude)

===== inspectie-app-features =====
1. **Slimme sjablonen met conditionele logica** — Zorgen dat elke inspecteur dezelfde relevante vragen ziet en alleen uitzonderingen hoeft in te vullen.
2. **Snelle oordeelknoppen Conform/Afwijking/Verbeterpunt + ernst** — Maken vastleggen snel en uniform, met directe basis voor escalatie.
3. **Foto- en video-annotatie** — Leggen een afwijking ondubbelzinnig vast met pijlen, tekst en markeringen.
4. **Spraak-naar-tekst en voice-notes** — Versnellen noteren en houden handen vrij tijdens inspectie.
5. **Offline-first met automatische sync** — Voorkomen dataverlies in kelders, buitengebieden of gebouwen zonder bereik.
6. **Automatische acties/regels bij afwijking** — Maken direct een taak, toewijzing, deadline of melding aan op basis van het oordeel.
7. **Actiebeheer met eigenaar, deadline en status** — Sluiten de lus van constatering naar herstel en maken verantwoordelijkheid zichtbaar.
8. **Herinspectie en verificatie** — Bewijzen dat een corrigerende actie is uitgevoerd en vergelijken voor/na.
9. **QR-/RFID-/asset-scan** — Koppelen de inspectie aan het juiste object of locatie en tonen direct historie.
10. **GPS, kaart en locatietagging** — Bewijzen waar de momentopname is gemaakt en ondersteunen gebieds- of route-inzicht.
11. **Digitale handtekening** — Leggen formele acceptatie of sign-off vast door inspecteur en verantwoordelijke.
12. **Rapportexport en delen als PDF/link** — Geven opdrachtgever of manager direct een professioneel inspectierapport.
13. **Dashboards en trendanalyse** — Tonen terugkerende afwijkingen en helpen prioriteren op risico.
14. **Audit trail en versiebeheer** — Maken traceerbaar wie wat wanneer wijzigde, essentieel voor compliance.
15. **Integraties/API en notificaties** — Sturen acties door naar e-mail, Teams/Slack of CMMS en voorkomen dubbel werk.

===== dashboard-ux =====
1. **Filters/slicers** — Laat gebruikers de scope (periode, regio, product) snel beperken zodat elk beeld relevant blijft.
2. **Drill-down** — Maakt het mogelijk van hoofdniveau naar detailniveau te zakken zonder het dashboard te verlaten.
3. **Drill-through** — Geeft vanuit een samenvatting direct toegang tot een detailpagina met de onderliggende records.
4. **Cross-filter/highlight** — Een klik in de ene visual filtert of markeert de andere visuals, zodat verbanden direct zichtbaar worden.
5. **Tijdsvergelijking** — Vergelijkt huidige waarden met vorige periode, vorig jaar of rolling average om trend en afwijking te duiden.
6. **Benchmarks/doelen** — Toont targets, budgetten of referentielijnen zodat prestaties direct beoordeelbaar zijn.
7. **Alerts/drempels** — Signaleert automatisch wanneer KPI’s buiten grenzen vallen zodat actie niet afhankelijk is van handmatig kijken.
8. **Export** — Maakt download naar Excel/PDF/CSV mogelijk voor offline analyse, rapportage of archivering.
9. **Delen/permalink** — Laat gebruikers een gefilterde view of inzicht delen met collega’s voor snelle besluitvorming.
10. **Gepland rapport/abonnement** — Stuurt rapporten automatisch op vaste momenten naar belanghebbenden zodat niemand handmatig hoeft te verversen.
11. **Annotaties/context** — Voegt uitleg, gebeurtenissen of datakwaliteitnotities toe zodat cijfers interpreteerbaar blijven.
12. **Mobiel/responsive** — Zorgt dat kern-KPI’s en filters op kleine schermen bruikbaar blijven voor beslissingen onderweg.

===== pwa-capabilities =====
- **Offline (service worker):** Je kunt assets/API-responses cachen en offline-fallbacks tonen; breed ondersteund in moderne browsers, met beperkingen op iOS Safari.
- **Installeren op beginscherm:** Via manifest en installprompt voelt de app native aan; breed ondersteund, maar op iOS vooral handmatig via Safari (“Zet op beginscherm”).
- **Camera/foto:** Toegang via `getUserMedia` en `<input capture>` voor foto’s/video; breed ondersteund op mobiel.
- **Microfoon/spraak:** Opnemen via `getUserMedia` is breed ondersteund, maar spraakherkenning via Web Speech API is beperkt/partieel ondersteund.
- **Geolocatie:** Via Geolocation API voor locatie en beweging; breed ondersteund, mits gebruiker toestemming geeft.
- **Push-notificaties:** Via Push API + Notifications; breed op Android/Chromium, op iOS alleen voor geïnstalleerde PWA’s vanaf iOS 16.4.
- **Achtergrond-sync:** Via Background Sync/SyncManager voor uitgestelde requests; goed ondersteund in Chromium/Android, beperkt in Safari/Firefox.
- **Bestandstoegang:** Via file input en File System Access API; file input is breed, maar volledige bestandssysteemtoegang is vooral Chromium.
- **Barcode/QR:** Via camera + JS-libraries breed mogelijk; native `BarcodeDetector` is nog beperkt ondersteund.
- **Biometrisch (WebAuthn):** Via WebAuthn/passkeys voor biometrische login; breed ondersteund in moderne browsers, afhankelijk van platform-authenticator.
- **Delen (Web Share):** Via Web Share API voor native deelmenu; breed op mobiel, desktopondersteuning is wisselend.

===== ai-features =====
AI stelt alleen voor; de inspecteur bevestigt en blijft oordeelhouder.

1. **Spraak-naar-tekst van waarnemingen** — Nut: snel en hands-free vastleggen van gesproken notities. Risico/grens: dialect, ruis en vaktaal veroorzaken transcriptfouten; inspecteur moet transcript altijd controleren.

2. **Voorstel van taak/risico uit kennisbank** — Nut: inspecteur sneller relevante checklist, taak of risico laten vinden. Risico/grens: verkeerde contextmatch of verouderde kennis; nooit automatisch classificeren.

3. **Concept-actietekst uit transcript** — Nut: sneller een eerste formulering van maatregel/actie maken. Risico/grens: AI kan te stellig of inhoudelijk verkeerd formuleren; inspecteur bevestigt actie, eigenaar en termijn.

4. **Foto-onderschrift/labeling** — Nut: foto’s sneller vindbaar en voorzien van context. Risico/grens: beeldinterpretatie kan misleiden; AI mag geen ernst of overtreding concluderen.

5. **Rapportconcept opstellen** — Nut: gestructureerd concept op basis van bevestigde invoer en transcript. Risico/grens: weglaten, samenvatten of hallucineren; eindverantwoordelijkheid en eindcontrole bij inspecteur.

6. **Trend-signalering** — Nut: patronen over locaties/periodes sneller zichtbaar maken als signaal. Risico/grens: correlatie is geen causaliteit; alleen ter bespreking, geen automatisch oordeel.

7. **Dubbele-invoer-detectie** — Nut: voorkomt dubbel werk en dubbele bevindingen/acties. Risico/grens: onterecht samenvoegen van vergelijkbare maar verschillende cases; inspecteur beslist.

8. **Checklist-volledigheid/ontbrekende velden** — Nut: wijst op mogelijk vergeten onderdelen of ontbrekende context. Risico/grens: context kan afwijken; alleen suggestie, geen blokkade.

9. **Zoeken in kennisbank/vergelijkbare cases** — Nut: relevante voorschriften en eerdere bevindingen sneller vinden. Risico/grens: verouderde of verkeerde bron; bron, geldigheid en toepasbaarheid door inspecteur laten checken.

10. **Prioriteringssuggestie op basis van historie/ernstindicatoren** — Nut: helpt inspecteur focus en volgorde bepalen. Risico/grens: bias of verkeerde weging; nooit automatische prioritering of besluit.

===== web-ux-patterns =====
| Patroon | Nut in één zin |
|---|---|
| **Command palette** | Laat ervaren gebruikers snel acties en navigatie uitvoeren zonder menu’s te doorzoeken. |
| **Globaal zoeken** | Maakt objecten, inspecties en instellingen direct vindbaar over het hele platform. |
| **Keyboard shortcuts** | Verhoogt de snelheid voor veelgebruikte desktoptaken en vermindert muisgebruik. |
| **Bulk-acties** | Bespaart tijd bij het gelijktijdig beheren of inspecteren van veel records. |
| **Inline bewerken** | Laat gebruikers velden direct in context aanpassen zonder heen-en-weer navigeren. |
| **Optimistic UI** | Geeft directe feedback na een actie, waardoor het platform sneller en responsiever aanvoelt. |
| **Skeleton loading** | Maakt wachttijd voorspelbaar en voorkomt layoutverspringingen tijdens het laden. |
| **Lege-staat-ontwerp** | Helpt gebruikers bij een lege lijst of configuratie met duidelijke volgende stappen. |
| **Onboarding/tours** | Leidt nieuwe gebruikers snel door complexe configuratie- en beheerfuncties. |
| **Toegankelijkheid (WCAG)** | Zorgt dat toetsenbord, schermlezer en contrast voor iedereen betrouwbaar werken. |
| **Dark mode** | Verbetert leescomfort en vermoeidheid bij langdurig desktopgebruik. |
| **Undo** | Maakt snelle acties veiliger doordat gebruikers fouten direct kunnen terugdraaien. |

===== adoptie-rapportage =====
1. **Rolgebaseerde dashboards** – Elke rol ziet alleen relevante KPI’s en acties, wat gebruik en eigenaarschap verhoogt.  
2. **E-mail/Teams-samenvattingen** – Automatische samenvattingen houden teams op de hoogte zonder inloggen en verhogen de betrokkenheid.  
3. **PDF-rapport met digitale handtekening en tijdstempel** – Levert een formele, controleerbare oplevering die als bewijs bruikbaar is.  
4. **Audit-trail/herleidbaarheid** – Elke wijziging, inspecteur en tijdstip is traceerbaar, wat de bewijskracht en auditbaarheid versterkt.  
5. **Herinneringen voor openstaande acties** – Voorkomt vergeten corrigerende maatregelen en houdt het inspectieproces in beweging.  
6. **Programma-planning** – Maakt inspecties voorspelbaar en zorgt dat ze tijdig en volgens schema worden uitgevoerd.  
7. **Excel-export** – Maakt analyse en rapportage eenvoudig voor bestaande werkprocessen en verlaagt de adoptiedrempel.  
8. **API/koppeling met bestaand KMS** – Voorkomt dubbel werk en maakt inspectiedata direct onderdeel van het kwaliteitssysteem.  
9. **Mobiele offline inspectie met foto, geotag en tijdstempel** – Inspecteren op locatie wordt sneller en foto’s leveren sterk bewijs.  
10. **QR/NFC-scan om inspectie te starten** – Verlaagt de drempel voor inspecteurs en koppelt de inspectie direct aan het juiste object.
