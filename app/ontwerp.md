# Gedeeld ontwerp (neutraal, later te vervangen door een VGM-merk)

Iedere bouwer gebruikt precies deze waarden, zodat alle schermen één product zijn.

## Lettertypen
- Tekst: Inter (Google Fonts: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">`), lokaal ook geïnstalleerd.
- Koppen: Space Grotesk 600/700.
- Schaal: 12 / 14 / 16 (basis telefoon) / 18 / 22 / 28 / 36 px. Telefoon-bodytekst minimaal 16 px; web-bodytekst 14–15 px.

## Kleuren (tokens)
- Achtergrond `#F6F7F9`, vlak `#FFFFFF`, rand `#DDE1E7`, tekst `#141A22`, tekst-zacht `#4A5565`, tekst-zwak `#6B7584` (alleen ≥ 14 px).
- Primair (actie, focus): `#1F5FBF`; primair-zacht `#E7EFFB`.
- Accent (AI-begeleider, alles wat de AI voorstelt of structureert): `#6B4FD8`; accent-zacht `#EFEBFD`. Regel: wat de AI voorstelt staat altijd in accent-stijl met label "Voorstel"; wat de inspecteur zei staat neutraal met label "Jij". Pas na bevestiging wordt het gewone inhoud.
- Oordelen (altijd met code + woord, nooit alleen kleur): Conform `#1E7A4C` op `#E6F4EC` [C]; Afwijking `#B42318` op `#FDECEA` [A]; Verbeterpunt `#8A4B00` op `#FFF1DC` [V]; Geen afwijking waargenomen `#4A5565` op `#EEF0F3` [GA]; Niet beoordeeld `#4A5565` op een gestreept grijs [NB]; Niet van toepassing `#6B7584` [NVT].
- Prioriteit: direct (rood, vol), kort (oranje, omlijnd), planmatig (grijs, omlijnd).
- Donker thema is later; ontwerp nu licht.

## Vormen
- Radius 10 px (kaarten), 8 px (knoppen, velden), 999 px (chips).
- Ruimte: 4/8/12/16/24/32/48.
- Schaduw alleen voor zwevende elementen (`0 4px 16px rgba(20,26,34,.10)`).
- Knoppen telefoon: hoogte 56 px, primaire knop vol primair; secundair omlijnd. Microfoonknop: rond, 72 px, primair, onderaan midden, altijd bereikbaar met de duim.
- Web: linkernavigatie 248 px breed (Overzicht, Inspecties, Acties, Dashboard, Configuratie ▸ Begeleider, Kennisbank, Rapport, Dashboardbouwer, Programma, Gebruikers en rollen, AI en data, Huisstijl), bovenbalk 56 px met organisatienaam "Noardling B.V." en omgevingschip "Concept / Gepubliceerd".
- Iconen: inline stroke-SVG 20/24 px, stroke 1.75, `currentColor`.
- Geen verlopen, geen linker-kleurrand-kaarten, geen emoji, geen nep-statusbalk op de telefoon (laat 44 px vrij bovenaan).

## Productnaam
Werknaam: "Begeleid Inspecteren" (neutraal; vervangbaar). Gebruik die naam spaarzaam.

## Afspraken na ronde 1 (gelden voor alle schermen)
- Herkomstlabels in zinsletters: "Jij" (wat de inspecteur zei) en "Voorstel" (wat de AI structureert), niet in hoofdletters.
- Oordeelchips altijd als "[C] Conform", "[A] Afwijking", "[V] Verbeterpunt", "[GA] Geen afwijking waargenomen", "[NB] Niet beoordeeld", "[NVT] Niet van toepassing".
- Markering van voorbeeldinhoud: één kleine neutrale chip "Voorbeeldinhoud · fictief" rechtsboven in de kop van elk scherm (telefoon en web). Niet in subregels.
- Microfoonknop: rond 72 px met het zichtbare woord "Inspreken" eronder (14 px), plus aria-label.
- Statussen van acties: Open, Uitgevoerd gemeld (actiehouder meldt klaar, wacht op toetsing), Afgerond (na toetsing), Vervallen. "Uitgevoerd gemeld" is een nieuw voorstel van het app-ontwerp en hoeft niet in de voorbeelddata te staan.
- Versies (overal gelijk): gepubliceerd v1.3, concept v1.4. Navigatie krijgt onder Configuratie ook het item "Versies en publiceren".

## Afspraak offline (12-11)
Zonder bereik draait geen AI. De inspecteur kan alles inspreken en met de hand tikken; het Jij-transcript wordt lokaal bewaard (spraak-naar-tekst op het toestel is toegestaan, gelabeld "op toestel"). AI-voorstellen (koppeling aan regel, actievelden, standaardmaatregelen) verschijnen pas bij bereik, gelabeld "Voorstel", en moeten dan nog bevestigd worden. Offline-chip in de kop; velden zonder voorstel tonen "voorstel volgt bij bereik". Op een scherm met chip "Offline" staat dus nooit een AI-voorstel dat in die sessie is gemaakt.

## Afspraken telefoon (12-11, na criticus P01–P05)
- Onderbalk overal gelijk: links altijd Foto, midden Inspreken (72 px), rechts altijd de primaire vervolgactie (of uitgeschakeld met reden). Typen zit in het invoerveld zelf, niet als onderbalkknop.
- "Direct gevaar · werk stilleggen" staat op elk inspectiescherm (P02–P08) op dezelfde plek in duimbereik, met zichtbare tekst "houd 2 s ingedrukt".
- Bodytekst op de telefoon 16 px (kerninhoud: kop, historie, koppelingen); 14 px alleen voor metadata.
- Verbindingsstatus één vorm: chip in de kop ("Online" omlijnd / "Offline" gevuld).
- Snel tikken: elke TRA-regel en elk onderwerp kan ook zonder spraak worden afgehandeld: maatregel aantikken → oordeel (één tik) → waarneming kort typen of een vaste waarnemingschip ("gezien: aanwezig", "gezien: niet aanwezig") — Conform vraagt altijd een waarneming, maar een chip telt als waarneming.
- Koppeling tot op de maatregel: een waarneming wordt gekoppeld aan regel-ID én de maatregelzin (letterlijk, gemarkeerd), opgeslagen als veld "maatregel".

## KOERSWIJZIGING (12-11, Sven na tussenstop) — gaat boven alle eerdere afspraken over inhoud per scherm
- Alles is te vol tekst en te geclusterd. Nieuwe lat: Apple-achtige app (Gezondheid, Herinneringen, Instellingen): rustig, veel witruimte, één taak per scherm, "smooth" knoppen en kaarten in plaats van tekstblokken.
- Algemeen scherm = alleen overzichtsinformatie. Meer info alleen als je erom vraagt: tik/klik op een kaart → detail (sheet, uitklap, zijpaneel, tweede scherm).
- Geen uitleg, bronverwijzingen of regels als lopende tekst op het scherm; die horen in de annotatie of achter een "i".
- Telefoon: geen scroll op het hoofdscherm, hooguit ~5 elementen, grote afgeronde knoppen. Web: hoofdscherm binnen één schermhoogte (~900 px), details in paneel of tab.
- Criticus weegt eerst eenvoud en rust (A/B tegen Apple-apps), daarna pas volledigheid.

## Stijlvoorbeeld Sven (12-11) — `ref/stijlvoorbeeld-sven.png`
Ander genre (health tracker), maar dit is de gewenste sfeer: zachte afgeronde kaarten (radius ~20–24), pastel-getinte kaartvlakken (licht groen/geel/blauw), grote cijfers met klein label erboven, icoontegel rechtsboven in een kaart, wegklikbare info-banner met icoon, zachte schaduwen, veel witruimte en spacing, één zwarte/donkere hoofdknop met afgeronde hoeken, zwevende ronde "+" in de tabbalk, tabbalk onderaan met 4–5 iconen + label, horizontaal swipebare kaartrij. Kaarten zijn tikbaar → detail. Weinig tekst per kaart (titel, één waarde, één regel metadata).

## Besluiten Sven 12-11 (09:20)
- Richting nieuwe stijl (v2: P01, P04, P04-detail, P07, W09) goedgekeurd: "veel cleaner".
- Lettertype: overal één strakke schreefloze letter (geen serif-koppen).
- Nog NIET alle schermen omzetten; wacht op Sven. Daarna app en documenten (rapport, voorstel: overzicht voorin, details erachter) tegelijk, als Sven het aangeeft.

## v2 telefoon — gedeelde regels na criticus (12-11 middag)
- Hooguit twee prominente (gevulde) knoppen per beeld. Direct gevaar = omlijnde, niet-gevulde rode balk (tekst "Direct gevaar · werk stilleggen · houd 2 s ingedrukt"), op dezelfde plek; ook bereikbaar als er een sheet open is (sheet laat de balk vrij of herhaalt hem). Knop rechtsonder pas gevuld als de stap af is. Gekozen chips/oordelen: pasteltint + vinkje + rand, niet vol verzadigd.
- Typeschaal: schermtitel 28 px, sheettitel 22 px, body 16, metadata 14; oordeelchips en Jij/Voorstel/Standaard-labels minimaal 14 px. Kop op elk scherm op dezelfde y.
- Maatregelkaarten: één pasteltint voor alle maatregelen; Collectief/Individueel als woord. Elke maatregelzin uit de kennisbank = één kaart (niet samenvoegen of weglaten). Status-chip op elke kaart: "nog niet" / [C] / [A] / [V] / NVT.
- Oordeel op maatregelniveau: de oordeelrij geldt voor de geselecteerde kaart ("Oordeel voor: 4-gasmeting"); NVT als vierde kleine keuze. Het regeloordeel wordt afgeleid (slechtste telt: A > V > C) en klein onder de titel getoond; in het rapport blijft één oordeel per regel, met de maatregel(en) die het bepaalden.
- Historie hoort bij de regel (niet bij een maatregel), tenzij de oude bevinding aan een maatregel gekoppeld was.
- Labels: alles wat de inspecteur koos "Jij", AI "Voorstel", vaste regel "Standaard". GA-chip grijs (#4A5565 op #EEF0F3).

## v2 telefoon — vaste maten (12-11, gelijk voor P01–P10b)
- Contextregel boven de titel: vaste hoogte 28 px; titel (28 px) begint op y = 138 op elk scherm.
- Direct gevaar: hoogte 48 px, rand 2 px rood, niet gevuld, icoon + tekst links uitgelijnd: "Direct gevaar · werk stilleggen" en rechts klein "houd 2 s"; afstand tot onderbalk 12 px. Samen met de onderbalk maximaal ~190 px.
- Uitgeschakelde hoofdknop rechtsonder: grijs gevuld (#E3E6EA, tekst #4A5565) met zichtbare reden eronder in 14 px.
- Niet-gekozen chips altijd neutraal (wit, grijze rand); kleur alleen bij gekozen + vinkje.
- Elke waarde die niet door de inspecteur is ingetikt heeft een herkomstlabel: Jij / Standaard / Voorstel. "Vastleggen" wacht tot alle Voorstel-waarden bevestigd zijn; Standaard-waarden mogen staan.

## Oordeel per regel én maatregel — hybride (12-11, vervangt "Oordeel op maatregelniveau")
- Standaard één tik per regel: knop "[C] Alles gezien, in orde" = elke maatregelkaart krijgt [C] met waarneming "gezien: in orde" (Jij). Daarna springt de app naar de volgende regel.
- Alleen bij een afwijking/verbeterpunt of twijfel tikt de inspecteur een maatregelkaart aan en geeft daar [A]/[V]/NVT + waarneming; de selectie springt daarna door naar de volgende "nog niet"-kaart.
- Afleiding: regel [C] alleen als elke maatregel [C] of NVT is; [A] als minstens één [A]; anders [V] als minstens één [V]; zijn er maatregelen "nog niet" en geen A/V, dan "deels beoordeeld" — die open maatregelen gaan per maatregel naar de afsluitvraag (P08) → [GA] of [NB]. Rangorde A > V > C > GA > NB; NVT telt niet.
- Rapport toont per regel het regeloordeel én per maatregel het eigen oordeel (compact).
- Kaartnamen: letterlijke eerste woorden van de maatregelzin (geen parafrase), met behoud van voorwaarden als "(indien nodig)" en kernwoorden als "continue"; een veld "korte naam" (Standaard, door beheerder in W04) mag dit vervangen.

## Afspraken 12-11 avond (na criticus hele set)
Telefoon:
- Eén bouwsteen voor kop, Direct gevaar, onderbalk en sheets: die in `/home/claude/app/v2/src/telefoon.py` (P01–P05) is leidend; P06–P10 importeren of kopiëren hem exact (zelfde y, schaduw/rand, lettergewicht). In sheets: sluitknop links, Direct gevaar onderaan op y 772.
- "Standaard"-label overal grijs (#F3F4F6/#4A5565), nooit amber. Oordeelchips altijd met woord ("[GA] Geen afwijking waargenomen").
- "Volgende" is nooit geblokkeerd door open maatregelen: "Volgende · 3 open → afsluitvraag". "[C] Alles gezien, in orde" laat maatregelen met "(indien nodig)" op "nog niet" (inspecteur kiest NVT of C).
- Elke regel en elk onderwerp heeft een één-tik-route "[C] In orde · gezien".
- Jij-citaat "Geen handenwasset in de bus." duurt overal 0:14.
Web:
- Tweede bedrijf heet overal "Bouwbedrijf Voorbeeld B.V. (fictief)", in de zijbalk "Bouwbedrijf Voorbeeld"; in W17 als organisatie: Proef · concept v0.1 · kennisbank leeg · AI EU-gehost.
- KPI-tegels overal 164 hoog, radius 24, rij op y 146. Segmented control: y 146, radius 14. Kaarttitel boven de kaart. Kopchip-vak alleen voor de versie.
- Regels actiehouder/toetser: W13 is de enige bron (inclusief trendacties: houder Hoofd S&M → directie toetst = 6e regel).
- Verduidelijking (12-11 laat): sectiekop boven een gegroepeerde lijst (Instellingen-stijl, configuratieschermen) en titel binnen een dashboardkaart (zoals W09) zijn allebei goed; kies per kaarttype, niet per bouwer.
- Open maatregelen gaan altijd per maatregel naar de afsluitvraag, ook als de regel al [A]/[V] is door een andere maatregel.

## KOERSWIJZIGING 2 (12-11 14:33, Sven) — WPI = momentopname, geen vragenlijst
- Een WPI toetst of wat het bedrijf als werkwijze heeft vastgelegd (TRA-maatregelen) op dat moment op de werkvloer wordt uitgevoerd. Momentopname: alleen wat je ziet.
- Twee ingangen: ingepland (uit het programma, kop vooraf gevuld) én spontaan ("ik kom hier toevallig langs"): minimaal projectnummer, naam inspecteur, datum — de rest optioneel/afgeleid.
- Kern: wat zijn de monteurs aan het doen (taak + taakstap) en doen ze dat conform de maatregelen van die stap uit de TRA.
- Geen verplichte route langs alle regels/onderwerpen, geen "regel x van y", geen afsluitvraag die alles dichtzet; wat niet gezien is komt niet in het rapport (alleen "getoetst tijdens bezoek: stap X, Y").
