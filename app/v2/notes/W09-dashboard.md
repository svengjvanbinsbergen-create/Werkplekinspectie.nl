# W09-dashboard — overzicht (v2, data v11.1)

1440 × 900, past in één schermhoogte. Tweede toestand: `W09-dashboard-paneel.html` (zijpaneel "Over termijn" open).

## Wat zie je
- Navigatie teruggebracht tot Overzicht · Inspecties · Acties · Dashboard · Configuratie (sub-items klappen uit). Organisatie onderaan.
- Vier tegels: Open acties 17 (6 kort · 11 planmatig), Over termijn 4 (oudste 134 dagen), Programma 17 gemist (rood getint; 15 van 32 gedaan, 47%; 2 lopend) — rekenregel uit het voorstel: lange-projectmaand pas verplicht vanaf 10 werkdagen, gehaalde verplichting in de lopende maand telt direct mee, WPI moet bij de werkplek passen (locatie + product); 9 projecten zonder enige WPI, Waarnemingen 190 (TRA 87 · onderwerpen 98 · 5 buiten TRA; plus 2 [NVT]) — afspraak eenheid, data v11.1.
- Eén grafiek: oordelen per maand uit cijfers.json v11 (mei–nov, totalen 25/41/17/8/35/25/41 = 192), gestapeld [A] → [V] → [NVT] → [C], met legenda in woorden en totaal boven elke staaf.
- Eén zijtegel (rustiger, 7 blokken): Inspecties 15 (12 coördinator · 3 directie) · Getoetst 15 taken · 11 taakstappen · Directie per kwartaal 3 van 3.
- Rij "Aandacht nodig" (ronde 2): eerst "Verplichte WPI's niet gedaan · 17 gemist" (laatst P26-379, oktober), daarna één themakaart "Geluid bemoeilijkt communicatie bij hijsen · 3 acties · oudste 134 d" (ronde 3: de twee losse geluidskaarten samengevoegd), dan werkverlichting 98 d en "Last met de hand begeleid" 44 d (DAM-C1-1 volgens data 11.1, bij DAM-2.04). Grafiekkaart 314 en zijtegels 147 hoog zodat de onderste rij lucht heeft.
- Alle cijfers uit voorbeelddata v10.4 / cijfers.json, peildatum 11-11-2026.

## Wat zit achter een klik
- Elke tegel, staaf en kaart opent een zijpaneel (zie paneel-toestand) met de onderliggende lijst en een knop naar het volledige scherm (Acties W11, Programma W12, Inspecties W10).
- Het programmaraster, klassen, TRA-regels en de trendanalyse VCA 7.2 zitten achter de tegel Programma / de grafiek / W09b, niet meer op het hoofdscherm.

## Hoe configureert de klant dit
- Welke 4–6 tegels, welke grafiek en welke regel "Aandacht nodig" vult (over termijn, binnen 7 dagen, directe prioriteit) kiest de beheerder in de Dashboardbouwer (W08), inclusief doelen (bv. 80%).
- Filters (periode, vestiging, product) staan achter één filterknop i.p.v. een filterrij.

## Opmerkingen
- Koers 2 (momentopname): geen dekking/eigen waarneming meer; alleen gezien maatregelen tellen (C 152 / A 22 / V 16 / NVT 2).
- Grafiekkleuren gecontroleerd met de dataviz-validator: volgorde voorkomt dat rood en groen naast elkaar staan; grijs "[NVT]" is bewust neutraal en heeft een woordlabel.
- Statische toestand: hover-tooltips per staaf horen in de bouw erbij.
