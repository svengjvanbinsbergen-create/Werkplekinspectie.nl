# W13-gebruikers-rollen — Gebruikers, rollen en rechten

Webscherm 1440 × 2730 px. Eén pagina met vier delen (gebruikers, regels actiehouder/toetser, groepen, rechten), geen tabbladen. Getallen uit voorbeelddata v10.4, nagerekend: Werkvoorbereider is actiehouder van 4 open acties; Hoofd Service & Montage is actiehouder van 10 acties, toetser steeds de inspecteur van die inspectie (4 afgerond, 6 open). Gebruikers per groep tellen op tot 10: 3 op organisatieniveau, 6 in S&M NL (waarvan 2 in Projecten op locatie), 1 in S&M DE.

## Hoe configureert de klant dit
- Gebruiker uitnodigen met functie, één of meer rollen en een groep als bereik. Rollen: Inspecteur, Coördinator, Medewerker (actiehouder, ziet eigen acties), Directie, Lezer, Beheerder; Leverancier staat daarbuiten, ziet geen inspectiegegevens en werkt in de leveranciersomgeving (W17).
- Regels voor actiehouder en toetser als zinnen met keuzelijsten: "Functie QHSE-manager is nooit actiehouder", "Standaardtoetser is Hoofd Service & Montage", "Is de standaardtoetser zelf actiehouder, dan toetst de inspecteur", "Ter plaatse uitgevoerd → inspecteur toetst ter plaatse". Toetser ≠ actiehouder is vast: VCA 7.1 vraagt verantwoordelijken voor uitvoering én toetsing; de app maakt dat twee personen.
- Groepen en werkplekken in een boom (het programma volgt procedure 5.5, voorstel: lang project elke maand een WPI, kort project met risicokenmerk minstens één, overige korte projecten één op de vier per kwartaal); elke groep erft begeleider, kennisbank, rapport, programma en lezers van de groep erboven, tenzij iets "eigen" wordt gemaakt (tabel "Wat geldt waar").
- Rechtenmatrix per rol aanpassen of een eigen rol maken; inloggen via Microsoft Entra ID met MFA, externe lezers via e-mailcode.

## Uitbreidingen
- Tijdelijke rol met einddatum (vervangend coördinator tijdens vakantie).
- Onderaannemers als eigen groep die alleen acties op hun eigen werk zien.
- Regels per actieklasse, bijvoorbeeld "Besloten ruimte en gas: toetser altijd QHSE-manager".
- Logboek van rechtenwijzigingen, ook zichtbaar in Versies en publiceren (W16).

## Verbeteringen
- Bij een regelwijziging tonen welke open acties een andere toetser krijgen, vóór opslaan.
- Uitleg per recht bij aanwijzen in de matrix ("als toetser", "zonder namen").
- Monteurs zonder account zijn nu alleen "Monteur ter plaatse"; een lichte inlog per ploeg zou eigen acties op de telefoon mogelijk maken.
