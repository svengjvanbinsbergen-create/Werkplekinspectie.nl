# W06-upload-omzetten

Webscherm, 1440 × 1972 px (ronde 3); de onderbalk blijft onderaan in beeld. Damwand.xltx van Noardling, 31 regels.

Wat de gebruiker in de eerste schermhoogte ziet: wat er gebeurd is ("De AI deed voor alle 31 regels een voorstel; jij beslist per regel"), waar hij begint (5 regels met twijfel) en één knop. De voortgang staat één keer, in de onderbalk. Daar staat ook waarom "Overnemen in concept" nog niet kan: er zijn nog regels open en daarna moet een tweede goedkeurder kijken.

Feiten uit de bestanden:
- Vergelijking met `kennisbank.json`, met spaties en regeleinden genegeerd: 30 gelijk, 1 anders (DAM-3.10 "vijzelonderdelen" tegenover "onderdelen").
- Twijfel "type ontbreekt" bij DAM-1.02, DAM-3.09, DAM-4.01 en DAM-5.01: hun maatregeltekst begint niet met Collectief, Individueel of PBM.
- DAM-3.09 heeft bij "hoe erg" 3 zonder en 7 met maatregelen. De AI stelt geen nieuwe waarde voor.
- DAM-3.01 verwijst alleen naar "Standaard maatregel". DAM-2.01 is hetzelfde risico bij Verwijderen damwand.

Fictief: de 20 goedgekeurde regels, de keuze bij DAM-1.02 en het tijdstip.

## Hoe configureert de klant dit
- **Kolommen koppelen**: één keer per bestandsopmaak. Daarna staat er één regel met "Wijzigen". Bestanden met een afwijkende kop wachten in de Wachtrij.
- **Wat als twijfel telt**: in te stellen per organisatie (type ontbreekt, alleen een verwijzing, tekst anders dan de kennisbank, gevolg erger na maatregelen).
- **Vast, niet in te stellen**: elke regel apart goedkeuren; de AI kiest geen type, geen score en geen beslissing vooraf; een tweede goedkeurder kijkt altijd vóór het overnemen, en dat is altijd iemand anders dan wie beoordeelde (gelijk aan de vaste regels in W13).

## Uitbreidingen
- "Navragen" als echte taak: de vraag gaat naar de opsteller van de TRA en het antwoord komt terug bij de regel.
- Goedgekeurde correcties terugschrijven naar een nieuwe versie van de Excel-TRA.
- Bij opnieuw uploaden alleen nieuwe, gewijzigde en vervallen regels tonen.

## Verbeteringen
- De toestand "één regel tegelijk" voor de 6 regels zonder twijfel (doorlopen met toetsen) is nog niet getekend.
- De tooltip achter "Bron" (bestand, blad, rij) is nog niet getekend.
