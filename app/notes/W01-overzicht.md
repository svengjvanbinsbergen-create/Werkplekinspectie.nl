# W01-overzicht — Startpagina beheer

Webscherm 1440 × 1982 px. Alle getallen komen uit `voorbeelddata.json` (versie 10.4, fictief, peildatum 11-11-2026): programma per operationele werkplek 12 van 32 verplichte WPI's (lange projecten 3 van 16 maanden, korte projecten met risicokenmerk 9 van 16, 5 lopen nog), per inspecteur 15 van 17, 17 open acties waarvan 4 over termijn (0 direct, 6 kort, 11 planmatig), laatste 5 WPI's met tellingen per oordeel.

## Hoe configureert de klant dit
- Welke tegels en blokken op de startpagina staan en in welke volgorde, stel je per rol in via Dashboardbouwer (W08).
- De regel voor "verplicht per werkplek" (lang project elke kalendermaand, kort project met hijsen, besloten ruimte of open water ten minste één) en de frequentie per inspecteur komen uit Programma (W12).
- De drempel voor signalen uit inspecties (nu: elke waarneming Buiten TRA telt, vanaf 2 keer heet het terugkerend; klasse ongebruikt na 6 maanden) stel je in bij Dashboardbouwer (W08). Het scherm zegt dat onder de signalen.
- "Over termijn" volgt uit de standaardtermijnen per prioriteit in Regels en grenzen (W03c).

## Uitbreidingen
- Een signaal met één klik omzetten in een conceptwijziging (bijvoorbeeld een nieuwe TRA-regel), met de inspecties als aanleiding erbij.
- Herinnering aan de coördinator zodra een lopend lang project halverwege de maand nog geen WPI heeft.
- Blok "Te toetsen door mij" voor wie toetser is, gekoppeld aan P10.

## Verbeteringen
- De lijst "Werkplekken in november" toont alleen de lopende maand; een knop naar de gemiste maanden (20 stuks sinds mei) ontbreekt nog.
- Open acties toont de 4 die het langst over termijn zijn; een keuze tussen termijn, prioriteit en "wacht op toetsing" ontbreekt.
- De tegels hebben geen vergelijking met de vorige periode; die staat alleen op het dashboard (W09).
