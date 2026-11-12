# W09b-trendanalyse — Jaarlijkse trendanalyse (VCA 7.2)

Webscherm 1440 × 2834 px. Dit is het tabblad "Trendanalyse VCA 7.2" van het dashboard, als eigen scherm. Je ziet de letterlijke eis (blauw kader) naast de eigen keuze van Noardling (oranje), de voortgang in vijf stappen, de basiscijfers, conclusies per klasse (positief en negatief, met de trend mei–aug tegenover sep–nov), de te ondernemen acties met actiehouder, toetser en termijn, en de follow-up.

Alle getallen komen uit `cijfers.json` (v10.4, fictief). Nagerekend: 15 WPI's (7 en 8), 249 regels, 152 [C], 38 [A]+[V] (22 en 16), 41 [GA], 42 acties. Per klasse komen [C], [A], [V], de trend, de dekking en de acties (open, af, te laat) uit `trend_klasse`. Terugkerende bevindingen komen uit `thema`: handenwas 6×, stuurlijn 4×, afzetting hijszone 3×, eten of drinken 3×, mangatwacht 2×. Geluid bij hijsen staat 3× buiten de TRA. De follow-up laat zien: 25 afgerond, waarvan 17 binnen termijn, 17 open waarvan 4 over termijn, 9 van 42 ter plaatse getoetst, en een gemiddelde doorlooptijd van 35,1 dagen bij prioriteit kort.

Herkomst: de app rekent de cijfers. Twee conclusies zijn geschreven door de VGM-coördinator ("Jij"). Drie zijn voorstellen van de AI ("Voorstel", accentstijl) met de knoppen Overnemen en Aanpassen. Actie TA-2026-5 is ook een voorstel. De besloten acties TA-2026-1 t/m 4 zijn fictieve voorbeeldbesluiten. De trendanalyse van 2025 bestaat niet in de app; het scherm zegt dat ook en biedt overnemen of een bijlage aan, in plaats van een verzonnen follow-up.

## Hoe configureert de klant dit
- De periode en het vaste moment (bijv. december, over het kalenderjaar), wie vaststelt (eigenaar procedure) en het follow-upritme stel je in bij Programma of de Dashboardbouwer.
- Of de AI conclusies mag voorstellen, en op welke drempel (bijv. een klasse met ≥ 2 dezelfde bevindingen), stel je in bij de begeleider (W02/W03).
- Nummering van trendacties (TA-jaar-volgnr) en de regel "Hoofd S&M actiehouder → directie toetst" stel je in bij Gebruikers en rollen (W13).

## Uitbreidingen
- Na vaststelling een PDF met handtekening en versie, als bewijsstuk "Trendanalyse" voor de audit.
- Effectmeting: per besloten actie dezelfde klasse in het volgende jaar naast de oude cijfers.
- Een actie TA-… direct koppelen aan een kennisbankwijziging (bijv. een nieuwe TRA-regel "communicatie bij omgevingsgeluid").

## Verbeteringen
- De trend vergelijkt twee ongelijke helften (4 en 3 maanden). Per WPI genormeerd zou eerlijker zijn.
- Klassen met één bevinding krijgen geen conclusie. Een vaste tekst "geen trend" kan dit afronden.
