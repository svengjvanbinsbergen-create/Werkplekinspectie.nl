# Voorbeeldrapport — opdracht ronde 8 (na criticus)

Oordeel ronde 7: A wint bij beide lezers, op vormgeving en op VCA 7.1 (alle elementen, citaten letterlijk). NIET GEWONNEN alleen op consistentie (d). Bouwscript: `/home/claude/wpi/run/build/build_rapport.py`. Data is nu versie 10.1 (`/home/claude/wpi/run/data/voorbeelddata.json`):
- actie -4: `direct_genomen_maatregel` is leeg (ter plaatse uitgevoerd ≠ direct genomen maatregel); toetser "Coördinator 2 (fictief), ter plaatse";
- actie -3: direct genomen maatregel = "Afgesproken met de operator van de opdrachtgever dat hij de resterende delen afspuit vóór het uithijsen, terwijl niemand in het kanaal is; de mangatwacht spuit na het uithijsen op de bokken na."

## Grootste gat — TRA-revisie
Noem overal tegen welke TRA-revisie is getoetst: "TRA Damwand, [documentcode] rev. [X] (QMS)" in de kop/9a en boven onderdeel 4. Bij actie 1 en bevinding A: revisie in de projectmap tegenover revisie in het QMS. Neem documentcode/revisie over uit de bron als die er is (`/home/claude/wpi/kb/TRA-DAM-*.md`, `/mnt/user-data/uploads/` Damwand .xltx: kijk in de kop/voettekst); anders een duidelijk fictieve aanduiding ("rev. 3 (fictief)") en in de projectmap een oudere ("rev. 2 (fictief)").

## Consistentie
1. Actie 4: geen label "Direct genomen maatregel" meer; alleen "Ter plaatse uitgevoerd en getoetst". Dubbele haakjes weg.
2. Actie 3: de afspraak met de operator komt ook in de waarneming bij DAM-2.06 ("ter plaatse: …"), passend bij de beschreven werkwijze van de mangatwacht.
3. Samenvatting: "7 van 8 TRA-regels getoetst, 1 niet beoordeeld (DAM-2.02)" in plaats van "alle 8".
4. DAM-2.01: de TRA-maatregel "Werkinstructie voor werken nabij putrand" moet in de waarneming staan (aanwezig en bekend bij de ploeg), anders klopt Conform niet.
5. DAM-2.08 (Conform): motiveer expliciet waarom het losnemen van de onderste geleidingsbouten met slappe ketting veilig was (damwand op bovenophanging ingezekerd, kraan stilgezet, niemand onder de last). E (Conform): vermeld dat certificaat/aanwijzing kraanmachinist is gezien. Koffie op het stempelschot: benoem ook dat iemand binnen de afzetting bij de kraanstempel was en wat de inspecteur daarmee deed — alleen als het consistent blijft met bestaande regels/acties (geen nieuwe actie verzinnen; past het bij -7, verwerk het daar in de bevindingstekst).

## Bruikbaarheid en opmaak
- Actielijst in de samenvatting: toon de verbeteractie (kort) naast of in plaats van de bevinding.
- Rij DAM-2.08 niet over de pagina laten breken (cantSplit of paginabreuk).
- Cover: kerngegevens (datum, werkplek/project, inspecteur, aantal open acties) erop.
- Voetgolf kleiner zodat pagina's 2–10 meer ruimte krijgen; let op lege ruimte onderaan p.4 en p.12.
- Landschapspagina's: zelfde kop met logo als de rest; kolom Omschrijving in 9c smaller, Classificatie niet afbreken.
- Uitleg "direct gecorrigeerd" niet drie keer: één keer in de legenda, elders verwijzen.
- Taal actie 9: "stellen voor hem tot vaste uitrusting … te maken".

Render alle pagina's als afbeelding en bekijk ze. Je beoordeelt je eigen werk niet. Rapporteer paginatal en wat je hebt aangepast.
