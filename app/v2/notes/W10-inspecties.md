# W10-inspecties (v2) + W10-inspecties-detail

Beide 1440 × 900, geen scroll. Detail is een zijpaneel (tweede toestand).

## Wat zie je
- Zoekveld rechts.
- Segment Alle 15 · Coördinator 12 · Directie 3 · Spontaan 2 · Met open acties 9.
- Eén lijst, nieuwste eerst, 8 rijen + "1–8 van 15 · Toon meer" (scrolt ook bij meer data niet). Per rij: datum, product · fase (chip "Spontaan" bij ingang spontaan), "Getoetst: taak · n stappen" (uit stappen_per_wpi, taaknaam ingekort), locatie · inspecteur, project, bevindingen [A] n / [V] n, open acties x van y.  Getallen per WPI uit `cijfers.json` (per_wpi) en voorbeelddata.

Per regel de maatregel die het oordeel bepaalde: de voorbeelddata v11.1 hebben dat veld (nog) niet, dus het scherm laat het weg in plaats van het te verzinnen; zodra de data een veld `maatregel` hebben, staat het klein onder de onderwerpnaam.

## Achter een tik (detail)
- Rij → paneel WPI-20261105-DAM-C2: Damwand · demontage, 05-11-2026, Coördinator 2, P26-168, RWZI Voorbeeldstad.
- Onder de kop: ingang (ingepland/spontaan) en "Getoetst: Verwijderen damwand" (geen taakstap in de bron-TRA).
- Strook "Getoetst tegen TRA Damwand rev. 3 · projectmap rev. 2 → actie 1" (v10.5 `tra_revisie` / `tra_revisie_projectmap`; de verouderde projectmap is bevinding A, actie 1).
- Drie kerncijfers (v11.1): 15 regels gezien (10 [C] Conform) · 5 bevindingen (4 [A] · 1 [V]) · 9 acties (8 open).
- Tab Bevindingen met onderwerpnaam en klasse als chip: A Voorbereiding en documenten → actie 1·8, G Gevaarlijke stoffen, hygiëne en milieu → 2·9, DAM-2.03 [V] → 6, DAM-2.06 → 3·7, DAM-2.07 → 4·5.
- Tabs Rapport (volgens inrichting v1.3), Foto's, Audittrail. Regel aantikken → wat de inspecteur zei ("Jij") en de koppeling ("Voorstel", bevestigd), zoals in de oude W10.
- Alle 17 regels, monteursgesprek en exportknoppen zitten achter de tabs.

## Hoe configureert de klant dit
Kolommen en standaardweergaven per rol; welke tabs een rol ziet volgt uit W13 (lezer zonder audittrail/namen).

## Uitbreidingen
Twee inspecties op hetzelfde project naast elkaar; oordeel corrigeren met reden (origineel blijft in audittrail); export gegevenstabel per inspectie.
