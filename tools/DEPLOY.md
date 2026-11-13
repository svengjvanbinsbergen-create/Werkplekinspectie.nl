# Deployen naar Netlify

De app staat op **https://werkplekinspectie-app.netlify.app** (Netlify-site `werkplekinspectie-app`).
Online zetten gaat met één script, vanuit de root van de repository:

```bash
tools/deploy_netlify.sh --dry-run   # eerst kijken: bouwen, controleren, bestandslijst tonen, niets uploaden
tools/deploy_netlify.sh             # productie: de site wordt meteen bijgewerkt
tools/deploy_netlify.sh --preview   # concept: eigen adres (<id>--werkplekinspectie-app.netlify.app), productie blijft ongewijzigd
```

Het script gebruikt de Netlify-API rechtstreeks. Er is geen Netlify-build en geen koppeling met GitHub nodig.

## Wat er gebeurt

1. **Alleen wat gecommit is.** Het script pakt `webapp/` uit de laatste commit (`git archive HEAD webapp`).
   Wijzigingen die nog niet gecommit zijn, gaan niet mee. Het script waarschuwt als die er zijn.
2. **Allowlist.** Uit die kopie gaan alleen de bestanden mee die de app echt gebruikt (zie hieronder).
3. **Poort.** Het script deployt niet als:
   - er een bestand buiten de allowlist in de publicatiemap staat (of een map/extensie van de verbodslijst);
   - de geheimenscan iets vindt. Die gebruikt dezelfde regels als `tools/secret_scan.sh`, streng en zonder
     uitzonderingslijst. Het script weigert ook bij een Supabase-sleutel met een andere rol dan `anon`
     (vooral `service_role`), een `sb_secret_`-sleutel, een `supabaseAnonKey` die niet publiek is, of
     `debug: true` in `js/config.js`;
   - `_headers` ontbreekt of geen strikte CSP voor `/*` heeft;
   - `sw.js` (precache-lijst), `index.html` of `manifest.json` verwijst naar een bestand dat niet meegaat.
4. **Deploy.** Het script controleert eerst of de site echt `werkplekinspectie-app` heet. Daarna uploadt het
   alleen de bestanden die Netlify nog niet heeft en wacht het tot de deploy `ready` is. Tot slot vergelijkt het
   de bestandslijst op Netlify met de publicatiemap (pad + sha1). Bij elke afwijking stopt het met een foutmelding.

Opnieuw draaien kan altijd: dezelfde inhoud geeft gewoon een nieuwe, identieke deploy.

## Wat wordt gepubliceerd

| Wat | Bestanden |
|---|---|
| App-pagina | `index.html` (de enige html-pagina) |
| Opmaak | `styles.css`, `css/*.css` |
| Scripts | `js/*.js`, `sw.js` (service worker) |
| PWA | `manifest.json`, `icon-192.png`, `icon-512.png` |
| Gegevens die de app laadt | `data/cijfers.json`, `data/kennisbank.json`, `data/voorbeelddata.json`, `data/trendacties.json` |
| Beveiligingsheaders | `_headers` (CSP, HSTS en de andere headers; Netlify verwerkt dit bestand tot header-regels) |

Komen er later bij, dan mogen ook deze mee: `_redirects`, `.well-known/security.txt`, en afbeeldingen of lettertypen in
`icons/`, `img/`, `images/` of `fonts/`. Al het andere houdt het script tegen.

## Wat níet wordt gepubliceerd

- `docs/`, `tests/`, `supabase/` (migraties, seed, testscripts), en `tools/`, `handoff/`, `wpi/` buiten `webapp/`
- `*.md`, `*.sql`, `*.py`, `*.sh`, `*.toml`, `.env` en andere dotfiles
- `netlify.toml` en `vercel.json`
- de interne pagina's `beveiliging.html`, `onderzoek.html`, `gauntlet.html`, `verbeter.html` en `design-vandaag.html`
- niet-gecommitte en ongevolgde bestanden

## Goed om te weten

- **Headers komen alleen uit `_headers`.** Bij een deploy via de API gebruikt Netlify `netlify.toml` niet.
  `_headers` bevat dezelfde headers als `netlify.toml` (gecontroleerd). De redirects uit `netlify.toml` gelden
  hier niet, maar dat geeft niets: de afgeschermde paden staan niet online (Netlify geeft dan zelf een 404), en
  Netlify zet http altijd om naar https. Pas je een header aan, doe dat dan in `_headers` (en houd
  `netlify.toml`, `vercel.json` en de meta-CSP in `index.html` gelijk).
- **Bij livegang met Supabase:** vervang `project-ref` in de CSP door de echte project-ref. Het script weigert te
  deployen als `js/config.js` een Supabase-adres heeft en de CSP nog `project-ref` noemt.
- **Sleutel:** het script leest de Netlify-token uit `NETLIFY_AUTH_TOKEN` en toont of bewaart hem nooit. In de
  Claude-cloudomgeving voegt de netwerkproxy de token zelf toe.
- **Terugdraaien:** in Netlify, *Deploys*, kies een eerdere deploy en klik *Publish deploy*. Of check een eerdere
  commit uit en draai het script opnieuw.
- `--houd` laat de tijdelijke publicatiemap staan, zodat je kunt zien wat er precies online ging.
