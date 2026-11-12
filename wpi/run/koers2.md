# Koers 2 — WPI als momentopname (Sven, 12-11-2026 14:36) — gaat boven brief.md waar ze botsen

## Kern
"Werken wij zoals we zeggen dat we werken?" Een WPI toetst of de werkwijze die het bedrijf heeft vastgelegd (de TRA-maatregelen) op dat moment op de werkvloer wordt uitgevoerd. Het is een momentopname: alleen wat de inspecteur ziet telt.

## Verloop
1. Kop. Twee ingangen: ingepland (uit het programma; kop vooraf gevuld) of spontaan (inspecteur komt toevallig langs). Minimaal: projectnummer, naam inspecteur, datum. Rest (opdrachtgever, locatie, product, monteurs) afgeleid uit het project of optioneel.
2. Wat doen de monteurs nu? Taak + taakstap(pen) uit de TRA van het product. De inspecteur kiest of zegt het; de AI stelt de stap voor (Voorstel, te bevestigen).
3. Doen ze dat conform de maatregelen van die stap? Alleen de maatregelen van de gekozen stap(pen) + de standaardmaatregelen (LMRA, PBM e.d.) worden getoond. Per maatregel die de inspecteur ziet: [C] Conform (met eigen waarneming), [A] Afwijking of [V] Verbeterpunt. Wat hij niet ziet, legt hij niet vast. Meerdere stappen: herhalen.
4. Algemene onderwerpen (PBM, orde en netheid, LMRA, documenten, …): operationeel als geheugensteun, niet verplicht. Alleen wat gezien is wordt vastgelegd, met hetzelfde oordeelmodel.
5. Gesprek met de monteurs (vast, kort) en afronden: wat ging goed, afwijkingen met acties. Geen afsluitvraag die alles dichtzet; geen "regel x van y".

## Oordeelmodel (vervangt het oude)
- Alleen [C] Conform, [A] Afwijking, [V] Verbeterpunt — altijd met eigen waarneming. Optioneel [NVT] als de inspecteur expliciet ziet dat een maatregel niet van toepassing is.
- "Geen afwijking waargenomen (alleen bevestigd)" en "Niet beoordeeld" vervallen als oordeel. Wat niet gezien is, staat niet in het rapport; het rapport zegt alleen "Getoetst tijdens bezoek: taak X, stap(pen) Y" en welke maatregelen gezien zijn.
- Regeloordeel bij meerdere maatregelen: slechtste van wat gezien is (A > V > C).
- Actieregels blijven ongewijzigd (oordeel actie = oordeel regel; toetser ≠ actiehouder; afgerond pas na toetsing; één actie = één verbeteractie; direct gecorrigeerd = verbeteractie ter plaatse uitgevoerd; QHSE-Manager geen actiehouder).
- VCA 7.1 blijft gedekt: positieve bevindingen (de [C]'s), afwijkingen, verbeteracties, uitvoeringsverantwoordelijken, termijn; actieplan met toetser.

## Data
Kennisbank krijgt het niveau taakstap (uit de TRA-bestanden). Voorbeelddata versie 11: regels hebben een taakstap; regels/onderwerpen die alleen bevestigd of niet beoordeeld waren vervallen; per WPI een veld `getoetste_stappen` en `ingang` (ingepland/spontaan). Tellingen veranderen daardoor overal — alles uit de data afleiden, niets met de hand.

## Aanvulling (data v11, 12-11 15:00)
- De TRA-bronnen zijn de gegeneraliseerde "(2)"-versies: maar 128 van 666 regels hebben een taakstap (vooral LOTOTO/Inschakelen). Werkwijze tot Sven anders beslist: toetsniveau = taak; waar de TRA een taakstap kent, kies je die ook. Binnen een taak ziet de inspecteur de risico's/maatregelen als kaarten en tikt alleen aan wat hij ziet gebeuren (het risico beschrijft feitelijk het werk-moment). In de app is "toetsniveau" (taak of taakstap) een instelling van de klant.
- Data v11: 192 regels (C 152 / A 22 / V 16 / NVT 2), 26 getoetste stappen, 13 ingepland / 2 spontaan (WPI-20260810-ROO-C2 en WPI-20261103-ROO-C1). DAM-C2: 15 regels (10 C, 4 A, 1 V), taak Verwijderen damwand (geen taakstap in de bron), F en DAM-2.02 vervallen. Acties ongewijzigd (42; DAM-C2 9: 1 direct, 5 kort, 3 planmatig; 8 open, 1 afgerond).
- cijfers.py is aangepast (geen dekking/GA/NB meer; nieuw: ingang, maatregelen_gezien, stappen_per_wpi, taken_getoetst, klasse_gezien). Oude sleutels breken in w09b.py, w10.py, web_resultaten_beheer.py (dek), lib.py, config_web.py.

## Afspraak eenheid (12-11 laat) — geldt overal
- Eenheid van oordeel = de risicoregel uit de TRA (en het algemene onderwerp). Per regel legt de inspecteur vast welke maatregel(en) hij zag en welke het oordeel bepaalde. Noem tellingen dus "waarnemingen" of "regels", nooit "maatregelen gezien". Kerngetal: "Waarnemingen 190 (87 TRA-regels · 98 onderwerpen · 5 buiten TRA)".
- "Getoetst" = taken en, waar de TRA ze kent, taakstappen: "15 taken · 11 taakstappen", niet "26 stappen".
- Data 11.1: actie DAM-C1-1 gaat nu over handmatig begeleiden zonder mechanisch hulpmiddel (past bij DAM-2.04); geen stuurlijn meer.
