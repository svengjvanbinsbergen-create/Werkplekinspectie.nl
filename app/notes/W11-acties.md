# W11-acties — Actiebeheer

Webscherm 1440 × 2502 px, getoond als **Hoofd Service & Montage**: toetser van 11 open acties, en zelf actiehouder van 6. Bij die 6 toetst iemand anders ("niet jouw toetsing", met slot). Zo is het rolconflict uit ronde 1 weg.

Getallen uit `cijfers.json` (v10.4, fictief, peildatum 11-11-2026): 42 acties: Open 17 (0 direct, 6 kort, 11 planmatig) · Uitgevoerd gemeld 0 · Afgerond 25 · Vervallen 0. Daarnaast 4 over termijn en 1 met termijn binnen 7 dagen. 17 van de 25 zijn binnen termijn afgerond. **9 van de 42 zijn ter plaatse getoetst** (beide schrijfwijzen geteld: "(ter plaatse)" en ", ter plaatse"). Bij alle 42 verschillen toetser en actiehouder. Geselecteerd: WPI-20260914-DAM-C1-1, 44 dagen over termijn, met toetser Hoofd S&M.

## Hoe configureert de klant dit
- Statussen: Open → Uitgevoerd gemeld (de actiehouder meldt klaar, P10b) → Afgerond (alleen de toetser, na toetsing) en Vervallen (alleen met reden). Afkeuren zet de actie terug op Open, met een reden. "Uitgevoerd gemeld" is een voorstel van dit ontwerp; in de voorbeelddata komt de status nog niet voor (daarom 0).
- Termijnbewaking: herinnering, melding bij verstreken termijn, de lijst voor het maandagoverleg, standaardtermijnen per prioriteit, melding aan de toetser bij "Uitgevoerd gemeld", en wanneer bewijs verplicht is.
- Vergrendeld: de toetser is nooit de actiehouder, en een actie is pas afgerond na toetsing (VCA 7.1). Wie standaard toetst, en wie nooit actiehouder is (QHSE-Manager), stel je in bij Gebruikers en rollen (W13).
- Weergaven "Alle open", "Ik toets" en "Ik ben actiehouder", plus filters die je als eigen weergave kunt opslaan.

## Uitbreidingen
- Acties over hetzelfde onderwerp samenvoegen tot één structurele actie (drie keer geluid bij hijsen, alle drie open en over termijn of bijna).
- De trendacties (TA-2026-…) uit W09b in dezelfde lijst, met een eigen filter.
- Een actie koppelen aan een kennisbankwijziging, zodat afronden pas kan als de wijziging gepubliceerd is.

## Verbeteringen
- De afgeronde acties staan ingeklapt en zijn niet direct doorzoekbaar.
- Het detailpaneel laat niet zien wat de inspecteur zei; dat staat alleen in W10.
