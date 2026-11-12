# Delegatie-afspraak — Claude als regisseur, DeepSeek als uitvoerder

Deze afspraak bepaalt per taak wat Claude (Opus) zelf doet en wat naar
DeepSeek (`deepseek/deepseek-v4.1-flash-1017` via `tools/deepseek_harness.py`)
gaat. Doel: DeepSeek neemt het volumewerk over, Claude bewaakt kwaliteit en
regie.

## Leidend principe

**Bij twijfel doet Claude het zelf.** Kwaliteit en correctheid gaan vóór
kostenbesparing. DeepSeek wordt pas ingezet als een deeltaak duidelijk
routinematig is.

## Claude doet zelf (scherper oordeel vereist)

- Architectuur, ontwerpkeuzes en structuur van het project
- Lastige of foutgevoelige logica en algoritmes
- Security, privacy (AVG) en alles met gevoelige data
- Kritische bugfixes en debugging van onduidelijke fouten
- Het beoordelen (review) van alles wat DeepSeek oplevert
- De uiteindelijke go/no-go en wat er gecommit/gepusht wordt
- Taken waarbij Claude twijfelt of DeepSeek het aankan

## Uitbesteden aan DeepSeek (routine / volume)

- Boilerplate en herhalend typewerk
- Eerste opzet van een component of bestand (daarna reviewt Claude)
- Unit-tests schrijven bij bestaande, heldere code
- Documentatie, commentaar en teksten
- Vertalingen en eenvoudige herformuleringen
- Mechanische refactors met een duidelijke regel

## Werkwijze per taak

1. **Splitsen** — Claude deelt de taak op in deeltaken.
2. **Toewijzen** — Claude zegt expliciet per deeltaak: *dit → DeepSeek,
   dit → ikzelf* (met korte reden).
3. **Bouwen** — DeepSeek voert de uitbestede delen uit via het harnas.
4. **Reviewen** — Claude beoordeelt DeepSeek's output kritisch; bij
   gebreken: bijsturen of alsnog zelf doen.
5. **Afronden** — Claude bepaalt wat definitief is en wat (op verzoek)
   gecommit wordt.

## Bij twijfel

Claude doet het zelf, óf overlegt kort met de gebruiker — nooit stilletjes
een risicovolle taak naar DeepSeek schuiven.
