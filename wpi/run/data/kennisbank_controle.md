# Controle kennisbank — niveau taakstap (12-11-2026)

Bron: `/mnt/user-data/uploads/*.xltx` (één werkblad per product, alle "(2)"/"(WMS)"-bladen), uitgelezen met `scripts/taakstap_extract.py` (samengevoegde cellen opgelost). Uitkomst is identiek aan `kb_raw.json` en aan de "- Taakstap:"-regels in `kb/TRA-*.md`; md-bestanden daarom niet bijgewerkt.
Koppeling op id (CODE-fase.regelnr); risicotekst per id gecontroleerd (656 letterlijk gelijk, 10 alleen witruimte-verschil in "Vrijkomen van stof …").

| Product | Code | Regels v1 | Regels v2 | Met taakstap | Zonder (null) | Taken | Unieke taakstappen |
|---|---|---|---|---|---|---|---|
| Bandfilter | BAN | 28 | 28 | 6 | 22 | 6 | 6 |
| Borstelbeluchter | BBL | 24 | 24 | 5 | 19 | 6 | 5 |
| Beluchter | BEL | 20 | 20 | 5 | 15 | 6 | 5 |
| Buisvijzel | BUV | 31 | 31 | 6 | 25 | 6 | 5 |
| Compact Hydrovijzel | CHV | 36 | 36 | 6 | 30 | 7 | 5 |
| Compactvijzel | CPV | 30 | 30 | 6 | 24 | 6 | 5 |
| Damwand | DAM | 31 | 31 | 6 | 25 | 6 | 5 |
| Drijvende Beluchter | DBL | 25 | 25 | 5 | 20 | 7 | 5 |
| Indraaivijzel | IDV | 45 | 45 | 16 | 29 | 8 | 10 |
| Instorttrogvijzel | ITV | 30 | 30 | 6 | 24 | 7 | 5 |
| Kettingreiniger | KET | 25 | 25 | 6 | 19 | 6 | 6 |
| Landox | LDX | 28 | 28 | 5 | 23 | 7 | 5 |
| Microfilter | MIC | 32 | 32 | 6 | 26 | 6 | 5 |
| Nabezinktank | NBT | 54 | 54 | 1 | 53 | 9 | 1 |
| Pompen | POM | 26 | 26 | 6 | 20 | 6 | 6 |
| Roosterreiniger | ROO | 32 | 32 | 7 | 25 | 6 | 7 |
| Semi Compactvijzel | SCV | 31 | 31 | 6 | 25 | 6 | 5 |
| Semi Compact Hydrovijzel | SHV | 36 | 36 | 6 | 30 | 7 | 5 |
| Slibindikker | SLI | 33 | 33 | 6 | 27 | 6 | 5 |
| Stortmalvijzel | SMV | 39 | 39 | 6 | 33 | 8 | 5 |
| Trommelfilter | TRF | 30 | 30 | 6 | 24 | 6 | 5 |
| **Totaal** | | **666** | **666** | **128** | **538** | **138** | **111** |

Waarom null: eigen cel: 111, samengevoegd: 17, samengevoegd met Taak: 535, leeg: 3. De bron-TRA's zijn gegeneraliseerde bladen; bij de meeste taken is de kolom Taakstap samengevoegd met Taak (dus geen taakstap in de bron).

## Unieke taakstappen per taak

| Code | Taak | Regels | Unieke taakstappen |
|---|---|---|---|
| BAN | Afschakelprotocol en Veiligstelling (LOTOTO) Bandscreen | 5 | 5 |
| BAN | Situatie Kraanopstelling | 4 | 0 |
| BAN | Demonteren bestaande bandscreen (transportketting, zeefpanelen, hoofdframe, geleiders) | 7 | 0 |
| BAN | Installatie bandscreen (geleiders, hoofdframe, transportketting, zeefpanelen, grouting) | 8 | 0 |
| BAN | Inschakelen | 1 | 1 |
| BAN | Inbedrijfstelling van de Bandscreen | 3 | 0 |
| BBL | Afschakelprotocol en Veiligstelling (LOTOTO) | 4 | 4 |
| BBL | Situatie Kraanopstelling | 4 | 0 |
| BBL | Demonteren aandrijving, tandwielkast en borstelbeluchter | 6 | 0 |
| BBL | Monteren borstelbeluchter, tandwielkast en aandrijving | 7 | 0 |
| BBL | Inschakelen | 1 | 1 |
| BBL | Inbedrijfstelling van de Borstelbeluchter | 2 | 0 |
| BEL | Afschakelprotocol en Veiligstelling (LOTOTO) bestaande beluchter | 4 | 4 |
| BEL | Situatie Kraanopstelling | 4 | 0 |
| BEL | Demonteren bestaande beluchter | 5 | 0 |
| BEL | Monteren nieuwe beluchter | 5 | 0 |
| BEL | Inschakelen | 1 | 1 |
| BEL | Inbedrijfstelling van de Beluchter | 1 | 0 |
| BUV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| BUV | Situatie Kraanopstelling | 4 | 0 |
| BUV | Demonteren (Aandrijving, Tandwielkast & Vijzelunit) | 8 | 0 |
| BUV | Monteren (Buisvijzel, Tandwielkast & Aandrijving) | 10 | 0 |
| BUV | Inschakelen | 1 | 1 |
| BUV | Inbedrijfstelling van de Buisvijzel-installatie | 3 | 0 |
| CHV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| CHV | Situatie Kraanopstelling | 4 | 0 |
| CHV | Demonteren van de Compact Hydrovijzel | 9 | 0 |
| CHV | Monteren van de Compact Hydrovijzel | 10 | 0 |
| CHV | Betonwerkzaamheden (storten, verdichten, afwerken, uitharding) | 4 | 0 |
| CHV | Inschakelen | 1 | 1 |
| CHV | Inbedrijfstelling van de Vijzelinstallatie | 3 | 0 |
| CPV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| CPV | Situatie Kraanopstelling | 4 | 0 |
| CPV | Demonteren (compactvijzel) | 7 | 0 |
| CPV | Monteren (Compactvijzel) | 10 | 0 |
| CPV | Inschakelen | 1 | 1 |
| CPV | Inbedrijfstelling van de Compact-Vijzelinstallatie | 3 | 0 |
| DAM | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| DAM | Situatie Kraanopstelling | 4 | 0 |
| DAM | Verwijderen damwand | 8 | 0 |
| DAM | Plaatsen damwand | 10 | 0 |
| DAM | Inschakelen | 1 | 1 |
| DAM | Inbedrijfstelling van de damwand (indien gemotoriseerd/geautomatiseerd) | 3 | 0 |
| DBL | Afschakelprotocol en Veiligstelling (LOTOTO) bestaande beluchter | 4 | 4 |
| DBL | Situatie Kraanopstelling | 4 | 0 |
| DBL | Demonteren bestaande drijvende beluchter uit water | 6 | 0 |
| DBL | Aankomst, lossen en assemblage | 6 | 0 |
| DBL | Tewaterlating, betreden platform en verankering | 3 | 0 |
| DBL | Inschakelen | 1 | 1 |
| DBL | Inbedrijfstelling van de Drijvende Beluchter | 1 | 0 |
| IDV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| IDV | Situatie Kraanopstelling | 4 | 0 |
| IDV | Demonteren (vijzelafdekking, stuwkant, vijzellichaam, aandrijving, bovenlager) | 8 | 0 |
| IDV | Monteren (bovenlager, vijzellichaam, onderlager, aandrijving) | 9 | 0 |
| IDV | Indraaireductor monteren en vijzel indraaien | 10 | 5 |
| IDV | Afmonteren (stuwkant, vijzelafdekking) | 5 | 0 |
| IDV | Inschakelen | 1 | 1 |
| IDV | Inbedrijfstelling van de Vijzelinstallatie | 3 | 0 |
| ITV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| ITV | Situatie Kraanopstelling | 4 | 0 |
| ITV | Monteren instorttrog-vijzel-combinatie (voorbereiding, hijsen, uitlijning) | 8 | 0 |
| ITV | Betonwerkzaamheden (storten, verdichten, afwerken, uitharding) | 4 | 0 |
| ITV | Afmonteren (stuwkant, vijzelafdekking) | 5 | 0 |
| ITV | Inschakelen | 1 | 1 |
| ITV | Inbedrijfstelling van de Vijzelinstallatie | 3 | 0 |
| KET | Afschakelprotocol en Veiligstelling (LOTOTO) Kettingreiniger | 5 | 5 |
| KET | Situatie Kraanopstelling | 4 | 0 |
| KET | Demonteren kettingreiniger | 6 | 0 |
| KET | Monteren kettingreiniger | 6 | 0 |
| KET | Inschakelen | 1 | 1 |
| KET | Inbedrijfstelling van de Kettingreiniger | 3 | 0 |
| LDX | Afschakelprotocol en Veiligstelling (LOTOTO) bestaande flowbooster | 4 | 4 |
| LDX | Situatie Kraanopstelling | 4 | 0 |
| LDX | Demonteren aandrijving, tandwielkast en flowbooster | 6 | 0 |
| LDX | Monteren flowbooster, tandwielkast en aandrijving | 7 | 0 |
| LDX | Monteren stromingsprofiel rondom FlowBooster (in droge put) | 4 | 0 |
| LDX | Inschakelen | 1 | 1 |
| LDX | Inbedrijfstelling van de flowbooster | 2 | 0 |
| MIC | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| MIC | Situatie Kraanopstelling | 4 | 0 |
| MIC | Demonteren Microfilter | 9 | 0 |
| MIC | Monteren Microfilter | 10 | 0 |
| MIC | Inschakelen | 1 | 1 |
| MIC | Inbedrijfstelling van het Microfilter | 3 | 0 |
| NBT | Controleren of nabezinktank schoon en droog is opgeleverd door aannemer | 2 | 0 |
| NBT | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 0 |
| NBT | Situatie Kraanopstelling | 4 | 0 |
| NBT | Demonteren onderwaterwerk (schraperarmen, inlooptrommel, deflectieplaat, drijflaagafvoerput) | 10 | 0 |
| NBT | Verwijderen ruimerbrug (incl. middendraaipunt, loopwagen, verankering) | 9 | 0 |
| NBT | Plaatsen nieuwe ruimerbrug (incl. ankers, middendraaipunt, loopwagen, toegangstrap) | 9 | 0 |
| NBT | Monteren onderwaterwerk (inlooptrommel, deflectieplaat, slibzakschraper, hangend schraperwerk, drijflaagafvoerput, drijflaagafstrijkers) | 12 | 0 |
| NBT | Inschakelen | 1 | 1 |
| NBT | Inbedrijfstelling van de Nabezinktank | 2 | 0 |
| POM | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 5 |
| POM | Situatie Kraanopstelling | 4 | 0 |
| POM | Demontage van de pomp | 5 | 0 |
| POM | Montage van de Pomp | 7 | 0 |
| POM | Inschakelen | 1 | 1 |
| POM | Inbedrijfstelling van de Landustrie Pomp | 4 | 0 |
| ROO | Afschakelprotocol en Veiligstelling (LOTOTO) Roosterreiniger | 6 | 6 |
| ROO | Situatie Kraanopstelling | 4 | 0 |
| ROO | Demontage Roosterreiniger installatie | 9 | 0 |
| ROO | Montage roosterreiniger-installatie | 9 | 0 |
| ROO | Inschakelen | 1 | 1 |
| ROO | Inbedrijfstelling van de Roosterreiniger | 3 | 0 |
| SCV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| SCV | Situatie Kraanopstelling | 4 | 0 |
| SCV | Demonteren (Aandrijving, Tandwielkast & Vijzelunit) | 8 | 0 |
| SCV | Monteren (Vijzelunit, Tandwielkast & Aandrijving) | 10 | 0 |
| SCV | Inschakelen | 1 | 1 |
| SCV | Inbedrijfstelling van de Semi-Compact-Vijzelinstallatie | 3 | 0 |
| SHV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| SHV | Situatie Kraanopstelling | 4 | 0 |
| SHV | Demonteren Semi Hydrovijzel | 9 | 0 |
| SHV | Monteren Semi Hydrovijzel | 10 | 0 |
| SHV | Betonwerkzaamheden (storten, verdichten, afwerken, uitharding) | 4 | 0 |
| SHV | Inschakelen | 1 | 1 |
| SHV | Inbedrijfstelling van de Vijzelinstallatie | 3 | 0 |
| SLI | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| SLI | Situatie Kraanopstelling | 4 | 0 |
| SLI | Demonteren (slibindikkerafdekking, stuwkant, slibindikkerlichaam, aandrijving, bovenlager) | 10 | 0 |
| SLI | Monteren (bovenlager, slibindikkerlichaam, onderlager, aandrijving) | 11 | 0 |
| SLI | Inschakelen | 1 | 1 |
| SLI | Inbedrijfstelling van de Slibindikkerinstallatie | 2 | 0 |
| SMV | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| SMV | Situatie Kraanopstelling | 4 | 0 |
| SMV | Monteren stortmal-vijzel-combinatie (voorbereiding, hijsen, uitlijning) | 8 | 0 |
| SMV | Betonwerkzaamheden (storten, verdichten, afwerken, uitharding) | 4 | 0 |
| SMV | Demonteren (vijzel uit trog, stortmal verwijderen) | 4 | 0 |
| SMV | Monteren (bovenlager, vijzellichaam, onderlager, aandrijving) | 10 | 0 |
| SMV | Inschakelen | 1 | 1 |
| SMV | Inbedrijfstelling van de Vijzelinstallatie | 3 | 0 |
| TRF | Afschakelprotocol en Veiligstelling (LOTOTO) | 5 | 4 |
| TRF | Situatie Kraanopstelling | 4 | 0 |
| TRF | Demonteren van trommelfilter | 8 | 0 |
| TRF | Monteren van trommelfilter | 9 | 0 |
| TRF | Inschakelen | 1 | 1 |
| TRF | Inbedrijfstelling van het Drumscreen | 3 | 0 |

Taken met minstens één taakstap: 42 van 138.
