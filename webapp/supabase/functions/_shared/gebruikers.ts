// Werkplekinspectie — supabase/functions/_shared/gebruikers.ts
// Gedeelde logica van de Edge Functions "uitnodigen" en "gebruikers" (gebruikersbeheer zonder eigen mailserver).
//
// Alles hier gebruikt alleen web-standaarden (fetch, Request, Response, URL, TextEncoder): hetzelfde bestand draait in
// de Supabase Edge Runtime (Deno) en in Node 22+ (tests/functies.js en tools/functies_host.mjs laden het rechtstreeks;
// Node haalt de types weg). Geen enums, namespaces of andere TypeScript die niet alleen uit types bestaat.
//
// Beveiliging (zie ook docs/beveiligingsrapport.md en supabase/README.md §10):
//  - De service_role-sleutel staat ALLEEN in de omgeving van de functie (SUPABASE_SERVICE_ROLE_KEY, door Supabase
//    zelf gezet). Hij gaat nooit in een antwoord, een log of naar de app. Hij wordt alleen gebruikt voor wat de
//    database niet met de JWT van de aanroeper kan: de Auth-admin-API (uitnodigingslink maken, blokkeren,
//    deblokkeren, een half aangemaakt account terugdraaien) en twee RPC's die alleen service_role mag
//    (gebruiker_bestaat, beheer_gebeurtenis).
//  - Wie aanroept, wordt eerst bij Supabase Auth gecontroleerd (GET /auth/v1/user met zijn JWT) en daarna bij de
//    database (rpc/mag_gebruikers_beheren met zijn JWT: hoofd, QHSE-manager of beheerder, actief, sessie op aal2).
//  - Rol, functie, naam en activering worden gewijzigd met de JWT van de AANROEPER (PATCH /rest/v1/profiles): dan
//    gelden alle databaseregels (RLS en profiles_bewaak: geen rol "inspecteur", niemand wijzigt zijn eigen rol of
//    activering, minstens één actief hoofd …) en schrijft de audittrail de aanroeper als "wie".
//  - CORS alleen voor de eigen site (SITE_URL); een verzoek met een andere Origin wordt geweigerd.

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SITE_URL: string;
  // geldigheid van een uitnodigings-/herstellink in seconden: GELIJK aan Auth › Email OTP Expiration (README §2).
  // Alleen voor de tekst "geldig tot …" in de app; Supabase Auth bepaalt de echte geldigheid.
  LINK_GELDIG_SECONDEN?: string;
};
export type Deps = { env: Env; fetch: typeof fetch; log?: (regel: string) => void };
type Json = Record<string, unknown>;

export const ROLLEN = ["hoofd", "coordinator", "qhse", "beheerder"] as const;   // nooit "inspecteur"
export const ROL_LABEL: Record<string, string> = { hoofd: "Hoofd", coordinator: "Coördinator", qhse: "QHSE-manager", beheerder: "Beheerder" };
export const BAN_DUUR = "876000h";   // ±100 jaar: geblokkeerd tot een beheerder deblokkeert
const MAX_BODY = 4096;
export const ZELF_TEKST = "Je eigen rol of toegang kun je niet zelf wijzigen; vraag een andere beheerder (hoofd, QHSE-manager of beheerder).";
// tot wanneer is een link geldig? (standaard 3600 s; hooguit 24 uur, zoals Supabase Auth toestaat)
export function geldigTot(env: Env, nu: number): string {
  const s = Number(env.LINK_GELDIG_SECONDEN || 3600);
  const sec = Number.isFinite(s) && s >= 60 && s <= 86400 ? Math.floor(s) : 3600;
  return new Date(nu + sec * 1000).toISOString();
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// besturings- en onzichtbare tekens (zelfde set als public.tekst_tekens_ok, migratie 0009; de database blijft de grens)
// deno-lint-ignore no-control-regex
const ONZICHTBAAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0\uFFF0-\uFFFB\u{110BD}\u{110CD}\u{13430}-\u{1343F}\u{16FE4}\u{1BCA0}-\u{1BCA3}\u{1D173}-\u{1D17A}\u{E0000}-\u{E0FFF}]/u;

// ---------------- invoer (puur, zonder netwerk) ----------------
export type Uitnodiging = { email: string; naam: string; rol: string; functie: string };
export type Controle<T> = { ok: true; waarde: T } | { ok: false; fout: string };

export const schoonNaam = (n: unknown): string => String(n ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
// vergelijken zoals public.naam_sleutel (benadering): zonder hoofdletters, accenten, spaties en leestekens
export const naamSleutel = (n: string): string =>
  n.toLocaleLowerCase("nl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

export function controleerUitnodiging(b: unknown): Controle<Uitnodiging> {
  if (!b || typeof b !== "object" || Array.isArray(b)) return { ok: false, fout: "Ongeldig verzoek." };
  const o = b as Json;
  const email = String(o.email ?? "").trim().toLowerCase();
  if (!email || email.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || ONZICHTBAAR.test(email)) {
    return { ok: false, fout: "Vul een geldig e-mailadres in." };
  }
  const naam = schoonNaam(o.naam);
  if (!naam || naam.length > 120 || ONZICHTBAAR.test(naam) || !naamSleutel(naam)) {
    return { ok: false, fout: "Vul de volledige naam in (hooguit 120 tekens)." };
  }
  const rol = String(o.rol ?? "");
  if (!(ROLLEN as readonly string[]).includes(rol)) {
    return { ok: false, fout: "Kies een rol: hoofd, coördinator, QHSE-manager of beheerder." };
  }
  const functie = schoonNaam(o.functie);
  if (functie.length > 120 || ONZICHTBAAR.test(functie)) return { ok: false, fout: "De functie is hooguit 120 tekens." };
  return { ok: true, waarde: { email, naam, rol, functie } };
}

export type Wijziging = { actie: "wijzig" | "deactiveer" | "activeer" | "nieuwe_link"; id: string; rol?: string; functie?: string; naam?: string };
export function controleerWijziging(b: unknown, aanroeper: string): Controle<Wijziging> {
  if (!b || typeof b !== "object" || Array.isArray(b)) return { ok: false, fout: "Ongeldig verzoek." };
  const o = b as Json;
  const actie = String(o.actie ?? "");
  const id = String(o.id ?? "");
  if (!["wijzig", "deactiveer", "activeer", "nieuwe_link"].includes(actie)) return { ok: false, fout: "Onbekende actie." };
  if (!UUID.test(id)) return { ok: false, fout: "Onbekende gebruiker." };
  if (actie !== "wijzig") {
    if (id === aanroeper) return { ok: false, fout: actie === "nieuwe_link" ? "Voor jezelf maak je geen uitnodigingslink." : ZELF_TEKST };
    return { ok: true, waarde: { actie: actie as Wijziging["actie"], id } };
  }
  const w: Wijziging = { actie: "wijzig", id };
  if (o.rol !== undefined) {
    const rol = String(o.rol);
    if (!(ROLLEN as readonly string[]).includes(rol)) return { ok: false, fout: "Kies een rol: hoofd, coördinator, QHSE-manager of beheerder." };
    if (id === aanroeper) return { ok: false, fout: ZELF_TEKST };
    w.rol = rol;
  }
  if (o.functie !== undefined) {
    const f = schoonNaam(o.functie);
    if (f.length > 120 || ONZICHTBAAR.test(f)) return { ok: false, fout: "De functie is hooguit 120 tekens." };
    w.functie = f;
  }
  if (o.naam !== undefined) {
    const n = schoonNaam(o.naam);
    if (!n || n.length > 120 || ONZICHTBAAR.test(n) || !naamSleutel(n)) return { ok: false, fout: "Vul de volledige naam in (hooguit 120 tekens)." };
    w.naam = n;
  }
  if (w.rol === undefined && w.functie === undefined && w.naam === undefined) return { ok: false, fout: "Er is niets te wijzigen." };
  return { ok: true, waarde: w };
}

// payload van een JWT (pas gebruiken NADAT Supabase Auth het token heeft geaccepteerd)
export function jwtPayload(token: string): Json {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(p + "===".slice((p.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch (_e) {
    return {};
  }
}

// databasemelding voor de gebruiker: de eigen triggers melden in het Nederlands; Engelse teksten niet doorgeven
export function nlMelding(body: unknown, status: number): string {
  const b = (body && typeof body === "object" ? body : {}) as Json;
  const m = String(b.message ?? b.msg ?? b.error_description ?? b.error ?? "").slice(0, 300);
  if (/profiles_naam_uniek|duplicate key/i.test(m)) return "Er staat al een collega met (bijna) dezelfde naam in de lijst.";
  if (!m || /\b(the|violates|invalid|error|failed|denied|permission|row-level|column|relation|constraint|syntax|jwt|token)\b/i.test(m)) {
    return status === 403 || status === 401 ? "Geen rechten voor deze wijziging." : "De server weigerde de wijziging (code " + status + ").";
  }
  return m;
}

// ---------------- HTTP ----------------
export function corsKoppen(env: Env): Record<string, string> {
  let origin = "";
  try { origin = new URL(env.SITE_URL).origin; } catch (_e) { /* geen SITE_URL: geen CORS */ }
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}
export function antwoord(env: Env, status: number, body: Json): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, corsKoppen(env)),
  });
}
const fout = (env: Env, status: number, message: string, code = "wpi") => antwoord(env, status, { message, code });

export class HttpFout extends Error {
  status: number; body: unknown;
  constructor(status: number, body: unknown) { super("HTTP " + status); this.status = status; this.body = body; }
}
// één verzoek naar Supabase. sleutel = de JWT van de aanroeper, of de service_role-sleutel (alleen hier in de functie)
async function sb(d: Deps, pad: string, sleutel: string, opt: { method?: string; body?: unknown; prefer?: string } = {}): Promise<unknown> {
  const h: Record<string, string> = { apikey: sleutel === d.env.SUPABASE_SERVICE_ROLE_KEY ? sleutel : d.env.SUPABASE_ANON_KEY, Authorization: "Bearer " + sleutel };
  if (opt.body !== undefined) h["Content-Type"] = "application/json";
  if (opt.prefer) h.Prefer = opt.prefer;
  const r = await d.fetch(d.env.SUPABASE_URL.replace(/\/+$/, "") + pad, { method: opt.method || "GET", headers: h, body: opt.body === undefined ? undefined : JSON.stringify(opt.body) });
  const t = await r.text();
  let j: unknown = null;
  try { j = t ? JSON.parse(t) : null; } catch (_e) { j = { message: t.slice(0, 200) }; }
  if (!r.ok) throw new HttpFout(r.status, j);
  return j;
}

type Aanroeper = { id: string; token: string };
// gemeenschappelijke controles: methode, herkomst, configuratie, token geldig, en mag de aanroeper gebruikers beheren?
async function controleerAanroeper(d: Deps, req: Request): Promise<Aanroeper | Response> {
  const { env } = d;
  if (req.method !== "POST") return fout(env, 405, "Alleen POST.");
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SITE_URL) {
    return fout(env, 500, "De functie is niet ingericht (SITE_URL of Supabase-omgeving ontbreekt).", "config");
  }
  const origin = req.headers.get("Origin");
  if (origin && origin !== new URL(env.SITE_URL).origin) return fout(env, 403, "Niet toegestaan vanaf deze website.");
  const a = req.headers.get("Authorization") || "";
  const token = a.startsWith("Bearer ") ? a.slice(7).trim() : "";
  if (!token || token === env.SUPABASE_ANON_KEY || token === env.SUPABASE_SERVICE_ROLE_KEY) return fout(env, 401, "Log opnieuw in.");
  let gebruiker: Json;
  try { gebruiker = (await sb(d, "/auth/v1/user", token)) as Json; }
  catch (_e) { return fout(env, 401, "Je sessie is verlopen. Log opnieuw in."); }
  const id = String((gebruiker && gebruiker.id) || "");
  const claims = jwtPayload(token);
  if (!UUID.test(id) || (claims.sub && claims.sub !== id)) return fout(env, 401, "Log opnieuw in.");
  if (claims.aal !== "aal2") return fout(env, 403, "Log opnieuw in met tweestapsverificatie om gebruikers te beheren.", "aal2");
  let mag = false;
  try { mag = (await sb(d, "/rest/v1/rpc/mag_gebruikers_beheren", token, { method: "POST", body: {} })) === true; }
  catch (e) { if (e instanceof HttpFout && e.status >= 500) return fout(env, 503, "De server is even niet bereikbaar. Probeer het zo opnieuw."); }
  if (!mag) return fout(env, 403, "Alleen een hoofd, de QHSE-manager of de beheerder (met tweestapsverificatie) beheert gebruikers.");
  return { id, token };
}
async function leesBody(req: Request): Promise<unknown> {
  const t = await req.text();
  if (t.length > MAX_BODY) return null;
  try { return JSON.parse(t); } catch (_e) { return null; }
}
const log = (d: Deps, regel: string) => { try { (d.log || console.log)(regel); } catch (_e) { /* niets */ } };
async function gebeurtenis(d: Deps, wie: string, soort: string, profiel: string, details: Json) {
  try {
    await sb(d, "/rest/v1/rpc/beheer_gebeurtenis", d.env.SUPABASE_SERVICE_ROLE_KEY, { method: "POST", body: { p_wie: wie, p_soort: soort, p_profiel: profiel, p_details: details } });
  } catch (e) { log(d, "beheer_gebeurtenis mislukt: " + (e instanceof HttpFout ? e.status : "netwerk")); }
}

// ---------------- functie "uitnodigen" ----------------
// POST {email, naam, rol, functie} → {ok, id, link}. De link (Supabase generateLink type "invite", redirect naar SITE_URL)
// geeft de app terug; de beheerder deelt hem zelf (kopiëren of Outlook). Er wordt niets gemaild (de standaard-SMTP van
// Supabase mailt alleen leden van het projectteam).
export function maakUitnodigen(d: Deps): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const { env } = d;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsKoppen(env) });
    const wie = await controleerAanroeper(d, req);
    if (wie instanceof Response) return wie;
    const c = controleerUitnodiging(await leesBody(req));
    if (!c.ok) return fout(env, 400, c.fout);
    const u = c.waarde, svc = env.SUPABASE_SERVICE_ROLE_KEY;
    // nooit een bestaand account "uitnodigen": dat zou een vooraf aangemaakt account activeren (README §1.4)
    try {
      if ((await sb(d, "/rest/v1/rpc/gebruiker_bestaat", svc, { method: "POST", body: { p_email: u.email } })) === true) {
        return fout(env, 409, "Er bestaat al een account met dit e-mailadres. Zoek de collega in de lijst: staat er \"Nog niet ingelogd\", kies dan Wijzig › Nieuwe link maken; staat hij op non-actief, kies Weer actief maken.", "bestaat");
      }
      const profielen = (await sb(d, "/rest/v1/profiles?select=id,full_name", wie.token)) as Json[];
      if (Array.isArray(profielen) && profielen.some((p) => naamSleutel(String(p.full_name || "")) === naamSleutel(u.naam))) {
        return fout(env, 409, "Er staat al een collega met (bijna) dezelfde naam in de lijst.", "naam");
      }
    } catch (_e) { return fout(env, 503, "De server is even niet bereikbaar. Probeer het zo opnieuw."); }
    let link = "", id = "";
    try {
      const r = (await sb(d, "/auth/v1/admin/generate_link", svc, { method: "POST",
        body: { type: "invite", email: u.email, data: { full_name: u.naam }, redirect_to: env.SITE_URL } })) as Json;
      const props = (r.properties && typeof r.properties === "object" ? r.properties : r) as Json;
      const user = (r.user && typeof r.user === "object" ? r.user : r) as Json;
      link = String(props.action_link || "");
      id = String(user.id || "");
    } catch (e) {
      log(d, "generate_link mislukt: " + (e instanceof HttpFout ? e.status : "netwerk"));
      return fout(env, e instanceof HttpFout && e.status === 422 ? 409 : 502,
        e instanceof HttpFout && e.status === 422 ? "Dit e-mailadres kan niet worden uitgenodigd (bestaat het al?)." : "Uitnodigen lukte niet. Probeer het zo opnieuw.");
    }
    if (!UUID.test(id) || !/^https?:\/\//.test(link)) return fout(env, 502, "Uitnodigen lukte niet (onverwacht antwoord van Supabase Auth).");
    // naam, rol en functie met de JWT van de aanroeper: alle databaseregels en de audittrail gelden
    try {
      const rij = await sb(d, "/rest/v1/profiles?id=eq." + id, wie.token, { method: "PATCH", prefer: "return=representation",
        body: { full_name: u.naam, functie: u.functie || null, role: u.rol, actief: true } });
      if (!Array.isArray(rij) || rij.length !== 1) throw new HttpFout(403, { message: "" });
    } catch (e) {
      // terugdraaien: geen half aangemaakt account laten staan
      try { await sb(d, "/auth/v1/admin/users/" + id, svc, { method: "DELETE" }); } catch (_x) { log(d, "terugdraaien mislukt voor " + id); }
      const st = e instanceof HttpFout ? e.status : 502;
      return fout(env, st === 409 ? 409 : st >= 500 ? 502 : 400, "Uitnodigen lukte niet: " + nlMelding(e instanceof HttpFout ? e.body : null, st));
    }
    await gebeurtenis(d, wie.id, "beheer_gebruiker_uitgenodigd", id, { rol: u.rol });
    return antwoord(env, 200, { ok: true, id, link, geldig_tot: geldigTot(env, Date.now()), email: u.email, naam: u.naam, rol: u.rol });
  };
}

// ---------------- nieuwe link (functie "gebruikers", actie "nieuwe_link") ----------------
// Een uitnodigingslink verloopt (Auth › Email OTP Expiration). Zonder eigen SMTP komt de mail van "Wachtwoord
// vergeten?" niet aan bij wie geen lid is van het Supabase-projectteam, en opnieuw uitnodigen kan niet (het account
// bestaat al). Daarom maakt een beheerrol hier een NIEUWE link, maar ALLEEN voor een collega die nog nooit heeft
// ingelogd, actief is, een rol heeft en via een uitnodiging binnenkwam (profiles.uitgenodigd: nooit een vooraf
// aangemaakt account, README §1.4). Type "invite" zolang het e-mailadres nog niet is bevestigd, anders "recovery"
// (beide landen in de app op "Kies je wachtwoord"). Iemand die al eens heeft ingelogd krijgt zo nooit een link van een
// ander: dat zou een overname van zijn account zijn.
async function nieuweLink(d: Deps, wie: Aanroeper, id: string): Promise<Response> {
  const { env } = d, svc = env.SUPABASE_SERVICE_ROLE_KEY;
  let gebruiker: Json, profiel: Json | undefined;
  try {
    gebruiker = (await sb(d, "/auth/v1/admin/users/" + id, svc)) as Json;
    const r = await sb(d, "/rest/v1/profiles?select=id,full_name,role,actief,uitgenodigd&id=eq." + id, wie.token);
    profiel = Array.isArray(r) ? (r[0] as Json | undefined) : undefined;
  } catch (e) {
    if (e instanceof HttpFout && e.status === 404) return fout(env, 404, "Onbekende gebruiker.");
    return fout(env, 503, "De server is even niet bereikbaar. Probeer het zo opnieuw.");
  }
  const email = String((gebruiker && gebruiker.email) || "");
  if (!profiel || String(gebruiker.id || "") !== id || !email) return fout(env, 404, "Onbekende gebruiker.");
  if (gebruiker.last_sign_in_at) return fout(env, 409, "Deze collega heeft al eens ingelogd. Een nieuwe link maak je alleen voor wie nog nooit heeft ingelogd.", "al_ingelogd");
  if (profiel.actief === false || !profiel.role) return fout(env, 409, "Maak deze collega eerst weer actief en kies een rol.", "niet_actief");
  if (profiel.uitgenodigd !== true) return fout(env, 409, "Dit account is niet via een uitnodiging aangemaakt; een link maken kan hier niet.", "niet_uitgenodigd");
  const type = gebruiker.email_confirmed_at ? "recovery" : "invite";
  let link = "";
  try {
    const r = (await sb(d, "/auth/v1/admin/generate_link", svc, { method: "POST", body: { type, email, redirect_to: env.SITE_URL } })) as Json;
    const props = (r.properties && typeof r.properties === "object" ? r.properties : r) as Json;
    link = String(props.action_link || "");
  } catch (e) {
    log(d, "generate_link (nieuwe link) mislukt: " + (e instanceof HttpFout ? e.status : "netwerk"));
    return fout(env, 502, "Een nieuwe link maken lukte niet. Probeer het zo opnieuw.");
  }
  if (!/^https?:\/\//.test(link)) return fout(env, 502, "Een nieuwe link maken lukte niet (onverwacht antwoord van Supabase Auth).");
  await gebeurtenis(d, wie.id, "beheer_link_nieuw", id, { type });
  return antwoord(env, 200, { ok: true, id, link, geldig_tot: geldigTot(env, Date.now()), email, naam: String(profiel.full_name || "") });
}

// ---------------- functie "gebruikers" ----------------
// POST {actie: "wijzig", id, rol?, functie?, naam?} | {actie: "deactiveer"|"activeer", id} | {actie: "nieuwe_link", id}
// Deactiveren: eerst het profiel op non-actief (database: niet jezelf, niet het laatste actieve hoofd), dan het account
// blokkeren in Supabase Auth (ban_duration), zodat ook een refresh-token niet meer werkt. Activeren omgekeerd.
export function maakGebruikers(d: Deps): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const { env } = d;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsKoppen(env) });
    const wie = await controleerAanroeper(d, req);
    if (wie instanceof Response) return wie;
    const c = controleerWijziging(await leesBody(req), wie.id);
    if (!c.ok) return fout(env, 400, c.fout);
    const w = c.waarde, svc = env.SUPABASE_SERVICE_ROLE_KEY;
    if (w.actie === "nieuwe_link") return await nieuweLink(d, wie, w.id);
    const body: Json = {};
    if (w.actie === "wijzig") {
      if (w.rol !== undefined) body.role = w.rol;
      if (w.functie !== undefined) body.functie = w.functie || null;
      if (w.naam !== undefined) body.full_name = w.naam;
    } else body.actief = w.actie === "activeer";
    let rij: Json;
    try {
      const r = await sb(d, "/rest/v1/profiles?id=eq." + w.id, wie.token, { method: "PATCH", prefer: "return=representation", body });
      if (!Array.isArray(r) || r.length !== 1) return fout(env, 404, "Onbekende gebruiker (of geen rechten).");
      rij = r[0] as Json;
    } catch (e) {
      const st = e instanceof HttpFout ? e.status : 502;
      return fout(env, st >= 500 ? 502 : st === 409 ? 409 : 400, nlMelding(e instanceof HttpFout ? e.body : null, st));
    }
    let waarschuwing = "";
    if (w.actie !== "wijzig") {
      try { await sb(d, "/auth/v1/admin/users/" + w.id, svc, { method: "PUT", body: { ban_duration: w.actie === "deactiveer" ? BAN_DUUR : "none" } }); }
      catch (_e) {
        waarschuwing = w.actie === "deactiveer"
          ? "Het profiel staat op non-actief (geen toegang meer), maar blokkeren in Supabase Auth lukte niet. Probeer het opnieuw."
          : "Het profiel is weer actief, maar deblokkeren in Supabase Auth lukte niet. Probeer het opnieuw.";
      }
    }
    await gebeurtenis(d, wie.id, w.actie === "wijzig" ? "beheer_gebruiker_gewijzigd" : w.actie === "deactiveer" ? "beheer_gebruiker_gedeactiveerd" : "beheer_gebruiker_geactiveerd",
      w.id, w.actie === "wijzig" ? { velden: Object.keys(body) } : { geblokkeerd: w.actie === "deactiveer" && !waarschuwing });
    return antwoord(env, 200, { ok: true, gebruiker: { id: rij.id, full_name: rij.full_name, functie: rij.functie ?? null, role: rij.role ?? null, actief: rij.actief !== false }, waarschuwing });
  };
}
