# Ronde v2 — alle schermen in de nieuwe stijl (Sven akkoord 12-11)

## Wat er verandert
Sven vond de oude schermen "veel te veel tekst, te geclusterd". Hij keurde de richting van vijf v2-schermen goed ("veel cleaner"):
`/home/claude/app/v2/P01-start.html`, `P04-tra-toetsing.html`, `P04-detail.html`, `P07-actie.html`, `W09-dashboard.html`, `W09-dashboard-paneel.html` (renders in `/home/claude/app/v2/shots/`, generator `/home/claude/app/v2/src/gen.py`, annotaties in `/home/claude/app/v2/notes/`). Dat is de sjabloon: zelfde kaarten, kleuren, maten, iconen, tabbalk, kop, chips. Stijlvoorbeeld van Sven: `/home/claude/app/ref/stijlvoorbeeld-sven.png`.

Lees de laatste vier secties van `/home/claude/app/ontwerp.md` (KOERSWIJZIGING, Stijlvoorbeeld, Besluiten 12-11). Die gaan boven alles. Lettertype: overal Inter (geen serif) — gen.py is al omgezet.

## Regels (meetbaar)
- Telefoon: 390×844, hoofdscherm zonder scroll, ~5 hoofdelementen, tikdoelen ≥ 48 px. Een sheet/detail mag een eigen bestand zijn (`…-detail.html`), alleen waar het iets laat zien dat er echt toe doet.
- Web: hoofdscherm 1440×900 zonder scroll; details in een zijpaneel of tab (eigen bestand als tweede toestand, alleen waar nodig). Configuratieschermen: toon de kern van de instelling (bijv. de regels als kaarten/rijen met één schakelaar of keuze), de rest achter "Bewerken".
- Per kaart: titel, één waarde, één regel metadata. Geen uitleg, regels, bronnen of VCA-citaten als lopende tekst in het scherm — die gaan achter een "i" of in de annotatie.
- Contrast tekst ≥ 4,5:1; kleur nooit alleen (oordeel altijd met letter/woord: [C] Conform, [A] Afwijking, [V] Verbeterpunt).
- Gedrag blijft: AI stelt alleen voor (label "Voorstel"), kiest nooit oordeel of prioriteit; Jij/Voorstel-herkomst; offline geen AI-voorstellen; toetser ≠ actiehouder; afgerond pas na toetsing; Direct gevaar bereikbaar op inspectieschermen.
- Chip "Voorbeeldinhoud · fictief". Geen Noardling-logo; organisatienaam in de web-zijbalk mag.
- Feiten uit `/home/claude/wpi/run/data/voorbeelddata.json` (v10.4) en `kennisbank.json`; cijfers voor web via `/home/claude/app/tools/cijfers.py` → `cijfers.json`.

## Werkwijze
- Bouw je schermen met een eigen script in `/home/claude/app/v2/src/<jouwnaam>.py` dat de kop/kaart/knop-bouwstenen uit `gen.py` importeert of kopieert (wijzig gen.py zelf niet — andere bouwers gebruiken hem tegelijk).
- Uitvoer: `/home/claude/app/v2/screens/phone/` of `/home/claude/app/v2/screens/web/`, zelfde code als het oude scherm (bijv. `P03-algemeen.html`, `W13-gebruikers-rollen.html`); de vijf goedgekeurde v2-schermen worden door de telefoon- resp. webbouwer daarheen gekopieerd/bijgewerkt.
- Inhoud: haal uit het oude scherm (`/home/claude/app/screens/…`, `/home/claude/app/notes/…`) wat de gebruiker op dat scherm echt nodig heeft; minder is beter. Mag een oud scherm samenvallen met een ander of wegvallen, zeg dat in je rapport.
- Annotatie per scherm in `/home/claude/app/v2/notes/<code>.md`, kort: wat zie je · wat zit achter een tik · hoe configureert de klant dit · uitbreidingen.
- Render met Playwright/Chromium (telefoon 390 breed dsf 2; web 1440×900) naar `/home/claude/app/v2/shots/`, bekijk alles, vergelijk naast de goedgekeurde v2-schermen.
- Je beoordeelt je eigen werk niet. Rapporteer kort per scherm (wat bleef op het hoofdscherm, wat ging achter een tik).
