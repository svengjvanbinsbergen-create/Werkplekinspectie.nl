# Ronde 7 — Web + dashboard, verse criticus (na besluit 8 + 23)

Datum: 12-11-2026. Criticus: Claude (Opus). Gerenderd met `tools/shot.py`
(web 1440×900, dashboard via lokale http-server). Beoordeeld op rust/eenvoud,
data-consistentie en VCA-terminologie.

## Scope
Besluit 23 (toetsniveau = taak) en besluit 8 (elke maand waarin gewerkt wordt)
verwerkt in app + web + dashboard; de Word-documenten bewust niet (keuze Sven).

## Bekeken schermen
W01 overzicht, W04 kennisbank, W07 rapportontwerper, W09 dashboard,
W12 programma, en de dashboard-artifact. Alle 34 web-schermen passen binnen
900px (geen scroll).

## Oordeel: A WINT
- **Rust en eenvoud:** rustige kaarten/tegels, één hoofdkleurlijn, consistente
  oordeelkleuren (groen/amber/rood/grijs). Professioneel.
- **Data-consistentie:** programma overal 15 van 35 (43%), 20 gemist, lang
  5/18 — web én dashboard gelijk; maandbalken tellen op tot 35. Waarnemingen
  190 (TRA 87 · onderwerpen 98). Getoetst 15 taken · 11 taakstappen.
- **VCA-terminologie** correct: "Getoetst tijdens bezoek", VCA 7.1/7.2-labels,
  geen verzonnen sub-letters.
- **Besluit 23** zichtbaar: kennisbank "538 van 666 regels zonder taakstap ·
  toetsen op taakniveau".

## Gerepareerd deze ronde
- W12 Regels-paneel zei nog "Elke maand met ≥ 10 werkdagen 1 WPI" (oude regel,
  hardcoded) → "Elke maand waarin gewerkt wordt 1 WPI".

## Let op (publicatie — stap van Sven)
- De live dashboard-artifact moet opnieuw gepubliceerd worden met de
  bijgewerkte `app.v11b.js` + `data11/`; dat kan niet vanuit Claude Code.
- De Word-documenten tonen nog de 10-werkdagenregel (bewust buiten scope).
