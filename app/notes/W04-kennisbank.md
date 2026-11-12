# W04-kennisbank

Webscherm, 1440 × 3196 px (ronde 3). Twee toestanden onder elkaar:
1. **Noardling B.V.**: ingang Producten en TRA's, risicomethode Fine & Kinney, regel IDV-4.08 open. Inhoud van IDV fase 4 uit `kennisbank.json` en `Indraaivijzel.xltx`.
2. **Bouwbedrijf Voorbeeld B.V. (fictief)**: ingang Werkplekken, gevuld uit hun RI&E via W06b. Werkplek › Risico › Maatregel, prioriteit Hoog/midden/laag. Alle inhoud is verzonnen en gelijk aan W05 en W06b.

Wat de gebruiker ziet: bovenaan één kaart "Inrichting van de kennisbank" met ingang, niveaus en risicomethode; daaronder de boom, de lijst en de open regel. Controlepunten staan in één regel. Rij- en celnummers staan alleen achter de link "Bron".

## Hoe configureert de klant dit
- **Ingang kiezen** (kaart Inrichting): Producten en TRA's, Werkplekken uit RI&E, of beide. Zonder RI&E staat er "geen RI&E" met de knop RI&E uploaden (naar W06b).
- **Niveaus aanpassen**: hernoemen, overslaan of toevoegen. Een overgeslagen niveau blijft doorgestreept zichtbaar, zodat je ziet wat er weg is (Bouwbedrijf: Activiteit).
- **Risicomethode**: Fine & Kinney, Hoog/midden/laag of Geen score. Dit bepaalt wat de coördinator per regel invult (drie keuzes, één keuze of niets). Zonder score of prioriteit kun je opslaan in het concept, maar niet publiceren (dezelfde zin als in W05).
- **Per maatregel de toetswijze** (Kijken, Vragen, Document). Die bepaalt hoe de begeleider ernaar vraagt. Het type (collectief, individueel, PBM) is optioneel; Bouwbedrijf gebruikt het niet.
- **Standaardmaatregelen** per organisatie, gekoppeld aan alle of aan gekozen werkplekken of producten.

## Uitbreidingen
- Per regel laten zien hoe vaak hij is getoetst en hoe vaak er een afwijking was. Bij 3 afwijkingen in een kwartaal stelt de app voor de TRA of RI&E te herzien.
- "Document" opent de werkinstructie zelf.
- Eigen controleregels in de controlestrook, zoals een grens voor restrisico of een verplichte klasse.

## Verbeteringen
- De uitgeklapte controlestrook (elk punt springt naar de regels) is nog niet getekend.
- Wisselen van risicomethode als er al regels zijn: het scherm dat laat zien hoeveel regels een nieuwe waarde nodig hebben, ontbreekt nog. De app rekent niet stil om.
