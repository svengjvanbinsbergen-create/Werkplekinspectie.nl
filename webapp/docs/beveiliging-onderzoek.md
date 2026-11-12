# Beveiligings- en back-up-onderzoek (DeepSeek-harnas, gecureerd door Claude)

===== webapp-security =====
**Checklist web-app (SPA + API) – OWASP-basis**

- **Authenticatie/sessies:** Gebruik sterke MFA waar mogelijk en sla sessietokens op in `HttpOnly`, `Secure`, `SameSite` cookies (niet in localStorage), met korte levensduur en veilige logout/refresh.
- **Autorisatie:** Controleer elke API-actie server-side op rol én objectrechten (geen autorisatie in de SPA vertrouwen).
- **XSS:** Codeer output contextueel en vermijd `innerHTML`/`eval`; voeg een strikte CSP toe als extra laag.
- **CSRF:** Bescherm state-changing requests met anti-CSRF-tokens of een combinatie van `SameSite` cookies en custom-header-check.
- **Invoervalidatie:** Valideer en normaliseer alle input server-side met een allowlist/schema en gebruik parameterized queries.
- **Veilige headers:** Stuur CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` en frame-bescherming (`frame-ancestors`/`X-Frame-Options`).
- **Secrets-beheer:** Houd secrets buiten de SPA en broncode, gebruik een vault/secret manager en roteer ze periodiek.
- **Rate limiting:** Limiteer login-, registratie-, reset- en API-endpoints per IP/gebruiker en voeg backoff/lockout toe.
- **Dependency/supply-chain:** Gebruik lockfiles, scan dependencies (SCA) en update/patch kwetsbare packages automatisch of periodiek.

===== supabase-hardening =====
**Supabase productie-hardening checklist**

- **RLS:** Zet RLS aan op elke tabel en zorg dat een tabel zonder policy standaard alle toegang weigert voor `anon`/`authenticated`.
- **service_role key:** Gebruik de `service_role` key uitsluitend server-side en nooit in client-apps, browsers of publieke repos.
- **anon key scope:** Behandel de `anon` key als publiek en beperk de reikwijdte via RLS en minimale grants, niet via geheimhouding.
- **Storage:** Maak buckets standaard privé en definieer Storage-policies per bucket, pad en operatie.
- **Postgres least-privilege:** Werk met aparte, minimale database-rollen en trek onnodige rechten op schema’s en tabellen in.
- **API rate limiting:** Voeg rate limiting toe vóór Supabase via reverse proxy/API gateway/Cloudflare en alarmeer op afwijkend verkeer.
- **Dashboard MFA:** Verplicht MFA voor alle leden van de Supabase-organisatie en beperk dashboardtoegang tot noodzakelijke rollen.
- **Auth-instellingen:** Schakel e-mailverificatie in, stel een sterk wachtwoordbeleid en een korte JWT-expiry met refresh-rotatie in.
- **Edge Functions secrets:** Bewaar secrets in Supabase Secrets/env en nooit in code of client, en vereis auth waar nodig.

===== database-backup =====
- **Automatische dagelijkse backups:** Supabase maakt afhankelijk van je plan dagelijkse fysieke backups van de productiedatabase, maar controleer en documenteer de exacte planning en dekking.
- **Point-in-Time Recovery (PITR):** Zet PITR aan als betaalde add-on zodat je de database naar een specifiek moment binnen de retentieperiode kunt terugzetten, bijvoorbeeld vlak vóór een foutieve migratie of delete.
- **Eigen logische export (pg_dump):** Maak daarnaast periodiek een eigen `pg_dump`/`supabase db dump` als extra, portable kopie die onafhankelijk van Supabase-backups kan worden teruggezet.
- **Backup-retentie:** Leg vast hoe lang dagelijkse backups en PITR-writes worden bewaard en stem dit af op je compliance- en herstelbehoeften.
- **Backups testen door te herstellen (restore drill):** Voer regelmatig een restore drill uit naar een testomgeving en meet of de backup daadwerkelijk volledig en bruikbaar terugkomt.
- **Scheiding van backup-opslag:** Bewaar eigen exports en eventuele extra kopieën in een aparte opslaglocatie of account, zodat een compromittering of storing van het Supabase-project niet alle backups raakt.
- **RPO/RTO bepalen:** Definieer expliciet het maximaal acceptabele dataverlies (RPO) en de maximaal acceptabele hersteltijd (RTO) voor de inspectiedata en toets of backups en procedures daaraan voldoen.

===== pwa-client-security =====
- **Tokens niet in localStorage:** Bewaar access-/refresh-tokens nooit in localStorage, maar gebruik HttpOnly/Secure/SameSite-cookies of kortlevend in-memory.
- **Veilige sessie-opslag:** Sla sessiegegevens server-side op en geef de client alleen een beschermd sessiecookie of kortlevend token.
- **IndexedDB versleutelen:** Versleutel gevoelige offline inspectiedata in IndexedDB met een sleutel die niet naast de data staat, bijvoorbeeld via WebCrypto en OS-/WebAuthn-gebonden sleutelopslag.
- **Automatisch uitloggen/timeout:** Voer korte idle- en absolute sessietimeouts in met server-side invalidatie en vergrendel de app bij inactiviteit.
- **Scherm-lock/biometrie (WebAuthn):** Gebruik WebAuthn/platform-authenticatie als app-lock of step-up, maar niet als vervanging van echte sessiebeveiliging.
- **Gegevens wissen bij uitloggen:** Verwijder bij uitloggen tokens, IndexedDB-data, caches en versleutelingssleutels en trek de sessie server-side in.
- **HTTPS afdwingen:** Forceer HTTPS met HSTS, redirects en Secure-cookies en blokkeer gemengde content.
- **Geen gevoelige data in logs:** Log nooit tokens, persoonsgegevens of inspectieresultaten en saneer client- en serverlogs.

===== operationeel-security =====
- **Toegangsbeheer:** Geef medewerkers alleen de rechten die ze nodig hebben (least privilege), verplicht MFA en trek accounts en toegang direct in bij offboarding.
- **Monitoring en alerts:** Monitor kritieke systemen en stel gerichte alerts in voor verdachte logins, fouten en afwijkend gedrag.
- **Logging en audit-trail:** Log relevante beveiligings- en beheeracties centraal, bescherm ze tegen wijzigen en bewaar ze lang genoeg voor onderzoek.
- **Incident-responsplan:** Leg rollen, contacten en stappen vast voor detectie, containment, herstel en evaluatie van beveiligingsincidenten.
- **Datalek-procedure (AVG 72 uur):** Beschrijf wie datalekken beoordeelt, hoe je binnen 72 uur meldt bij de AP en wanneer je betrokkenen informeert.
- **Periodieke security-review/pentest:** Laat jaarlijks of bij grote wijzigingen een security-review en waar nodig een pentest uitvoeren en volg bevindingen op.
- **Patch-/updatebeleid:** Patch besturingssystemen, frameworks en dependencies volgens een vaste prioriteit en termijn, met spoedpatches voor kritieke kwetsbaarheden.
- **Back-up van configuratie en secrets:** Maak versleutelde, geteste back-ups van configuratie en secrets met strikte toegang en een gedocumenteerd herstelproces.
