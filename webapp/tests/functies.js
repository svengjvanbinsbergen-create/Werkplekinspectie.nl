// Werkplekinspectie — tests/functies.js: de Edge Functions (supabase/functions) zonder netwerk.
// Laadt de echte TypeScript-modules (_shared/gebruikers.ts en _shared/mail.ts; Node 22+ haalt de types weg) en draait
// de handlers tegen een nep-Supabase (fetch vervangen). Getoetst: CORS en herkomst, token en aal2, rol van de aanroeper
// (via rpc/mag_gebruikers_beheren), invoercontrole (geen rol "inspecteur"), bestaand e-mailadres en dubbele naam,
// generateLink (type invite, redirect naar SITE_URL), profiel wijzigen met de JWT van de AANROEPER (nooit met de
// service_role-sleutel), terugdraaien bij een weigering, beheer-gebeurtenis met de aanroeper als "wie", de
// service_role-sleutel nooit in een antwoord; gebruikers: niet jezelf, laatste hoofd (melding van de database),
// blokkeren/deblokkeren via ban_duration; mail-versturen: zonder Graph niets ("wacht op mailbox"), met Graph een
// bijlage en status verstuurd/fout, cron-geheim verplicht, alleen echte PDF's (eerste bytes), groter dan 3 MB via een
// uploadsessie, groter dan 20 MB of geen PDF: fout zonder nieuwe pogingen. Daarna, als er een deno-binary is (PATH of WPI_DENO),
// ook `deno check` en `deno lint` van de drie functies.
//   node /home/user/Werkplekinspectie.nl/webapp/tests/functies.js      → eindigt met "errs []"
"use strict";
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const FN = path.join(__dirname, "..", "supabase", "functions");
const errs = [];
const ok = (c, wat, extra) => { console.log((c ? "OK   " : "FOUT ") + wat + (extra !== undefined && !c ? " · " + JSON.stringify(extra).slice(0, 300) : "")); if (!c) errs.push(wat); };

const SVC = "nep-service-role-sleutel-mag-nooit-naar-buiten";
const ANON = "nep-anon";
const SITE = "https://app.voorbeeld.test/";
const env = { SUPABASE_URL: "https://nep.supabase.test", SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SVC, SITE_URL: SITE };
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (sub, aal) => b64u({ alg: "HS256" }) + "." + b64u({ sub, aal, role: "authenticated" }) + ".sig";
const U = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

// ---------------- nep-Supabase ----------------
function nepSupabase() {
  const S = {
    users: {
      [U(1)]: { email: "hoofd@x.test", full_name: "Hoofd Een", role: "hoofd", actief: true, uitgenodigd: true, ingelogd: "2026-11-01T08:00:00Z", bevestigd: "2026-10-01T08:00:00Z" },
      [U(2)]: { email: "hoofd2@x.test", full_name: "Hoofd Twee", role: "hoofd", actief: true, uitgenodigd: true, ingelogd: "2026-11-01T08:00:00Z", bevestigd: "2026-10-01T08:00:00Z" },
      [U(3)]: { email: "coord@x.test", full_name: "Coord Drie", role: "coordinator", actief: true, uitgenodigd: true, ingelogd: "2026-11-01T08:00:00Z", bevestigd: "2026-10-01T08:00:00Z" },
      [U(4)]: { email: "beheer@x.test", full_name: "Beheer Vier", role: "beheerder", actief: true, uitgenodigd: true, ingelogd: "2026-11-01T08:00:00Z", bevestigd: "2026-10-01T08:00:00Z" },
      [U(5)]: { email: "qhse@x.test", full_name: "Qhse Vijf", role: "qhse", actief: true, uitgenodigd: true, ingelogd: "2026-11-01T08:00:00Z", bevestigd: "2026-10-01T08:00:00Z" },
      // nieuwe link: uitgenodigd maar nooit ingelogd (6), non-actief (7), niet via een uitnodiging (8), bevestigd maar nooit ingelogd (9)
      [U(6)]: { email: "zes@x.test", full_name: "Nieuw Zes", role: "coordinator", actief: true, uitgenodigd: true },
      [U(7)]: { email: "zeven@x.test", full_name: "Weg Zeven", role: "coordinator", actief: false, uitgenodigd: true },
      [U(8)]: { email: "acht@x.test", full_name: "Zelf Acht", role: "coordinator", actief: true, uitgenodigd: false },
      [U(9)]: { email: "negen@x.test", full_name: "Half Negen", role: "coordinator", actief: true, uitgenodigd: true, bevestigd: "2026-11-10T08:00:00Z" },
    },
    tokens: {}, calls: [], events: [], banned: {}, verwijderd: [], volgende: 10, patchFout: null,
  };
  const tok = (id, aal) => { const t = jwt(id, aal); S.tokens[t] = { sub: id, aal }; return t; };
  const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const fetch = async (url, init = {}) => {
    const u = new URL(url), m = (init.method || "GET").toUpperCase(), h = init.headers || {};
    const auth = String(h.Authorization || "").replace(/^Bearer /, ""), body = init.body ? JSON.parse(init.body) : null;
    S.calls.push({ m, pad: u.pathname + u.search, auth, apikey: h.apikey, body });
    const isSvc = auth === SVC && h.apikey === SVC, caller = S.tokens[auth];
    const p = u.pathname;
    if (p === "/auth/v1/user") return caller ? json(200, { id: caller.sub }) : json(401, { msg: "invalid JWT" });
    if (p === "/rest/v1/rpc/mag_gebruikers_beheren") {
      if (!caller) return json(401, { message: "JWT expired" });
      const x = S.users[caller.sub]; return json(200, !!(x && x.actief && ["hoofd", "qhse", "beheerder"].includes(x.role) && caller.aal === "aal2"));
    }
    if (p === "/rest/v1/rpc/gebruiker_bestaat") { if (!isSvc) return json(403, { message: "permission denied" }); return json(200, Object.values(S.users).some((x) => x.email === body.p_email)); }
    if (p === "/rest/v1/rpc/beheer_gebeurtenis") { if (!isSvc) return json(403, { message: "permission denied" }); S.events.push(body); return json(204); }
    if (p === "/rest/v1/profiles" && m === "GET") {
      if (!caller) return json(401, {});
      const f = (u.searchParams.get("id") || "").replace(/^eq\./, "");
      return json(200, Object.entries(S.users).filter(([id]) => !f || id === f).map(([id, x]) => ({ id, full_name: x.full_name, role: x.role, actief: x.actief, uitgenodigd: !!x.uitgenodigd })));
    }
    if (p === "/rest/v1/profiles" && m === "PATCH") {
      if (!caller) return json(401, { message: "JWT" });   // alleen met de JWT van een aanroeper (de service-sleutel is hier geen aanroeper)
      if (S.patchFout) { const f = S.patchFout; S.patchFout = null; return json(f[0], f[1]); }
      const id = u.searchParams.get("id").replace(/^eq\./, ""), x = S.users[id];
      if (!x) return json(200, []);
      const nieuw = Object.assign({}, x, body.full_name !== undefined ? { full_name: body.full_name } : {}, body.role !== undefined ? { role: body.role } : {},
        body.functie !== undefined ? { functie: body.functie } : {}, body.actief !== undefined ? { actief: body.actief } : {});
      if (id === caller.sub && (nieuw.role !== x.role || nieuw.actief !== x.actief)) return json(403, { code: "42501", message: "Je eigen rol of activering wijzig je niet zelf; dat doet een ander hoofd, de QHSE-manager of de beheerder" });
      if (x.role === "hoofd" && x.actief && (nieuw.role !== "hoofd" || !nieuw.actief) && !Object.entries(S.users).some(([j, y]) => j !== id && y.role === "hoofd" && y.actief))
        return json(400, { code: "23514", message: "Er moet altijd minstens één actief hoofd zijn" });
      S.users[id] = nieuw; return json(200, [Object.assign({ id }, nieuw)]);
    }
    if (p === "/auth/v1/admin/generate_link") {
      if (!isSvc) return json(401, { msg: "service key nodig" });
      // zoals GoTrue: invite voor een bestaand, nog niet bevestigd account geeft een nieuwe link; bevestigd → 422
      const [bid, bx] = Object.entries(S.users).find(([, x]) => x.email === body.email) || [];
      const link = (t) => env.SUPABASE_URL + "/auth/v1/verify?token=abc" + S.volgende + "&type=" + t + "&redirect_to=" + encodeURIComponent(body.redirect_to);
      if (body.type === "recovery") return bx ? json(200, { id: bid, email: body.email, action_link: link("recovery"), verification_type: "recovery" }) : json(404, { msg: "user not found" });
      if (bx && (bx.bevestigd || body.data)) return json(422, { msg: "email exists" });
      if (bx) return json(200, { id: bid, email: body.email, action_link: link("invite"), verification_type: "invite", redirect_to: body.redirect_to });
      const id = U(S.volgende++); S.users[id] = { email: body.email, full_name: body.data.full_name, role: null, actief: true, uitgenodigd: true };
      return json(200, { id, email: body.email, action_link: link("invite"), verification_type: "invite", redirect_to: body.redirect_to });
    }
    const a = /^\/auth\/v1\/admin\/users\/([0-9a-f-]{36})$/.exec(p);
    if (a) {
      if (!isSvc) return json(401, {});
      if (m === "DELETE") { delete S.users[a[1]]; S.verwijderd.push(a[1]); return json(200, {}); }
      if (m === "PUT") { if (S.banFout) return json(500, {}); S.banned[a[1]] = body.ban_duration; return json(200, {}); }
      if (m === "GET") { const x = S.users[a[1]]; return x ? json(200, { id: a[1], email: x.email, last_sign_in_at: x.ingelogd || null, email_confirmed_at: x.bevestigd || null }) : json(404, { msg: "User not found" }); }
    }
    return json(404, { message: "nep: onbekend " + m + " " + p });
  };
  return { S, tok, fetch };
}
const req = (pad, opt = {}) => new Request("https://nep.supabase.test/functions/v1/" + pad, Object.assign({ method: "POST" }, opt));
const post = (pad, token, body, extra = {}) => req(pad, { headers: Object.assign({ Authorization: "Bearer " + token, "Content-Type": "application/json", Origin: "https://app.voorbeeld.test" }, extra), body: JSON.stringify(body) });
const lees = async (r) => ({ status: r.status, body: await r.json().catch(() => null), cors: r.headers.get("Access-Control-Allow-Origin") });

(async () => {
  const G = await import(path.join(FN, "_shared", "gebruikers.ts"));
  const M = await import(path.join(FN, "_shared", "mail.ts"));

  // ---------------- pure controles ----------------
  ok(G.controleerUitnodiging({ email: " Nieuw@X.test ", naam: "  Nieuwe   Collega ", rol: "coordinator", functie: "Montage Coördinator" }).ok, "invoer: geldige uitnodiging (spaties en hoofdletters opgeschoond)");
  ok(G.controleerUitnodiging({ email: "a@b.c", naam: "N", rol: "inspecteur" }).ok === false, "invoer: rol inspecteur geweigerd");
  ok(G.controleerUitnodiging({ email: "geen-adres", naam: "N", rol: "hoofd" }).ok === false, "invoer: ongeldig e-mailadres geweigerd");
  ok(G.controleerUitnodiging({ email: "a@b.c", naam: "x".repeat(121), rol: "hoofd" }).ok === false, "invoer: naam langer dan 120 geweigerd");
  ok(G.controleerUitnodiging({ email: "a@b.c", naam: "Na​am", rol: "hoofd" }).ok === false, "invoer: onzichtbaar teken in de naam geweigerd");
  ok(G.controleerUitnodiging({ email: "a@b.c", naam: "Naam", rol: "hoofd", functie: "y".repeat(121) }).ok === false, "invoer: functie langer dan 120 geweigerd");
  ok(G.controleerWijziging({ actie: "deactiveer", id: U(1) }, U(1)).ok === false, "invoer: jezelf deactiveren geweigerd");
  ok(G.controleerWijziging({ actie: "wijzig", id: U(1), rol: "coordinator" }, U(1)).ok === false, "invoer: je eigen rol wijzigen geweigerd");
  ok(G.controleerWijziging({ actie: "wijzig", id: U(2), rol: "inspecteur" }, U(1)).ok === false, "invoer: rol inspecteur via wijzig geweigerd");
  ok(G.controleerWijziging({ actie: "wis", id: U(2) }, U(1)).ok === false && G.controleerWijziging({ actie: "activeer", id: "x" }, U(1)).ok === false, "invoer: onbekende actie of id geweigerd");
  ok(G.controleerWijziging({ actie: "wijzig", id: U(2) }, U(1)).ok === false, "invoer: niets te wijzigen geweigerd");

  // ---------------- uitnodigen ----------------
  {
    const N = nepSupabase(), f = G.maakUitnodigen({ env, fetch: N.fetch, log: () => {} });
    const h2 = N.tok(U(1), "aal2"), h1 = N.tok(U(1), "aal1"), c2 = N.tok(U(3), "aal2"), b2 = N.tok(U(4), "aal2");
    const nieuw = { email: "nieuw@x.test", naam: "Nieuwe Collega", rol: "coordinator", functie: "Montage Coördinator" };
    let r = await lees(await f(req("uitnodigen", { method: "OPTIONS" })));
    ok(r.status === 204 && r.cors === "https://app.voorbeeld.test", "uitnodigen: CORS-preflight alleen voor de eigen site", r);
    r = await lees(await f(req("uitnodigen", { method: "GET" })));
    ok(r.status === 405, "uitnodigen: alleen POST");
    r = await lees(await f(post("uitnodigen", h2, nieuw, { Origin: "https://kwaad.test" })));
    ok(r.status === 403, "uitnodigen: andere herkomst (Origin) geweigerd");
    r = await lees(await f(req("uitnodigen", { body: JSON.stringify(nieuw) })));
    ok(r.status === 401, "uitnodigen: zonder token 401");
    r = await lees(await f(post("uitnodigen", "nep.token.x", nieuw)));
    ok(r.status === 401, "uitnodigen: ongeldig token 401 (Supabase Auth weigert)");
    r = await lees(await f(post("uitnodigen", SVC, nieuw)));
    ok(r.status === 401 && !N.S.calls.some((c) => c.pad.startsWith("/auth/v1/admin")), "uitnodigen: de service-sleutel als token telt niet als aanroeper");
    r = await lees(await f(post("uitnodigen", h1, nieuw)));
    ok(r.status === 403 && /tweestapsverificatie/.test(r.body.message), "uitnodigen: hoofd zonder aal2 geweigerd", r);
    r = await lees(await f(post("uitnodigen", c2, nieuw)));
    ok(r.status === 403 && /hoofd, de QHSE-manager of de beheerder/.test(r.body.message), "uitnodigen: coördinator (ook met aal2) geweigerd", r);
    r = await lees(await f(post("uitnodigen", b2, Object.assign({}, nieuw, { rol: "inspecteur" }))));
    ok(r.status === 400 && /Kies een rol/.test(r.body.message), "uitnodigen: rol inspecteur geweigerd", r);
    r = await lees(await f(post("uitnodigen", b2, Object.assign({}, nieuw, { email: "coord@x.test" }))));
    ok(r.status === 409 && /bestaat al een account/.test(r.body.message) && !N.S.calls.some((c) => c.pad === "/auth/v1/admin/generate_link"), "uitnodigen: bestaand e-mailadres → 409, geen link gemaakt", r);
    r = await lees(await f(post("uitnodigen", b2, Object.assign({}, nieuw, { naam: "coord  DRIE" }))));
    ok(r.status === 409 && /dezelfde naam/.test(r.body.message), "uitnodigen: dubbele naam (andere schrijfwijze) → 409", r);
    N.S.calls.length = 0;
    r = await lees(await f(post("uitnodigen", b2, nieuw)));
    const gl = N.S.calls.find((c) => c.pad === "/auth/v1/admin/generate_link"), pa = N.S.calls.find((c) => c.m === "PATCH");
    ok(r.status === 200 && r.body.ok && /type=invite/.test(r.body.link) && /^[0-9a-f-]{36}$/.test(r.body.id), "uitnodigen: link en id terug", r);
    { const t = Date.parse(r.body.geldig_tot) - Date.now(); ok(t > 3590e3 && t <= 3600e3, "uitnodigen: geldig_tot = nu + LINK_GELDIG_SECONDEN (standaard 3600 s)", r.body.geldig_tot); }
    ok(gl && gl.body.type === "invite" && gl.body.redirect_to === SITE && gl.body.data.full_name === "Nieuwe Collega", "uitnodigen: generateLink type invite met redirect naar SITE_URL", gl && gl.body);
    ok(pa && pa.auth === b2 && pa.auth !== SVC && pa.body.role === "coordinator" && pa.body.actief === true && pa.body.functie === "Montage Coördinator", "uitnodigen: profiel gezet met de JWT van de aanroeper (niet de service-sleutel)", pa);
    ok(N.S.users[r.body.id] && N.S.users[r.body.id].role === "coordinator", "uitnodigen: nieuw profiel heeft de gekozen rol");
    ok(N.S.events.some((e) => e.p_wie === U(4) && e.p_soort === "beheer_gebruiker_uitgenodigd" && e.p_profiel === r.body.id), "uitnodigen: beheer-gebeurtenis met de aanroeper als wie");
    ok(!JSON.stringify(r.body).includes(SVC), "uitnodigen: de service-sleutel staat nooit in het antwoord");
    ok(N.S.calls.filter((c) => c.auth === SVC).every((c) => /^\/(auth\/v1\/admin|rest\/v1\/rpc\/(gebruiker_bestaat|beheer_gebeurtenis))/.test(c.pad)), "uitnodigen: de service-sleutel alleen voor de Auth-admin-API en de twee service-RPC's");
    // weigering van de database bij het profiel → het nieuwe account wordt teruggedraaid
    N.S.patchFout = [409, { code: "23505", message: "duplicate key value violates unique constraint \"profiles_naam_uniek\"" }];
    r = await lees(await f(post("uitnodigen", b2, { email: "ander@x.test", naam: "Andere Collega", rol: "hoofd" })));
    ok(r.status === 409 && /dezelfde naam/.test(r.body.message) && N.S.verwijderd.length === 1 && !Object.values(N.S.users).some((x) => x.email === "ander@x.test"),
      "uitnodigen: weigering bij het profiel → account teruggedraaid (admin delete), Nederlandse melding", r);
  }

  // ---------------- gebruikers ----------------
  {
    const N = nepSupabase(), f = G.maakGebruikers({ env, fetch: N.fetch, log: () => {} });
    const q2 = N.tok(U(5), "aal2"), b2 = N.tok(U(4), "aal2"), c2 = N.tok(U(3), "aal2");
    let r = await lees(await f(post("gebruikers", c2, { actie: "deactiveer", id: U(1) })));
    ok(r.status === 403, "gebruikers: coördinator geweigerd");
    r = await lees(await f(post("gebruikers", b2, { actie: "deactiveer", id: U(4) })));
    ok(r.status === 400 && /eigen rol of toegang kun je niet zelf wijzigen; vraag een andere beheerder/.test(r.body.message), "gebruikers: jezelf deactiveren geweigerd (duidelijke tekst)", r);
    r = await lees(await f(post("gebruikers", b2, { actie: "deactiveer", id: U(2) })));
    ok(r.status === 200 && N.S.users[U(2)].actief === false && N.S.banned[U(2)] === G.BAN_DUUR, "gebruikers: tweede hoofd op non-actief en geblokkeerd (ban_duration)", r);
    ok(N.S.calls.find((c) => c.m === "PATCH").auth === b2, "gebruikers: profiel met de JWT van de aanroeper gewijzigd");
    r = await lees(await f(post("gebruikers", q2, { actie: "deactiveer", id: U(1) })));
    ok(r.status === 400 && /minstens één actief hoofd/.test(r.body.message) && N.S.users[U(1)].actief === true && !N.S.banned[U(1)], "gebruikers: laatste actieve hoofd: melding van de database, niets geblokkeerd", r);
    r = await lees(await f(post("gebruikers", q2, { actie: "wijzig", id: U(1), rol: "coordinator" })));
    ok(r.status === 400 && /minstens één actief hoofd/.test(r.body.message), "gebruikers: laatste hoofd degraderen geweigerd");
    r = await lees(await f(post("gebruikers", q2, { actie: "activeer", id: U(2) })));
    ok(r.status === 200 && N.S.users[U(2)].actief === true && N.S.banned[U(2)] === "none", "gebruikers: weer actief en gedeblokkeerd");
    r = await lees(await f(post("gebruikers", q2, { actie: "wijzig", id: U(3), rol: "hoofd", functie: "Manager Projects" })));
    ok(r.status === 200 && r.body.gebruiker.role === "hoofd" && r.body.gebruiker.functie === "Manager Projects", "gebruikers: rol en functie gewijzigd", r);
    ok(N.S.events.filter((e) => e.p_wie === U(5)).map((e) => e.p_soort).join() === "beheer_gebruiker_geactiveerd,beheer_gebruiker_gewijzigd", "gebruikers: beheer-gebeurtenissen met de aanroeper als wie", N.S.events);
    N.S.banFout = true;
    r = await lees(await f(post("gebruikers", q2, { actie: "deactiveer", id: U(3) })));
    ok(r.status === 200 && N.S.users[U(3)].actief === false && /blokkeren in Supabase Auth lukte niet/.test(r.body.waarschuwing), "gebruikers: blokkeren mislukt → profiel wel inactief, met waarschuwing", r);
    r = await lees(await f(post("gebruikers", q2, { actie: "wijzig", id: U(99), functie: "x" })));
    ok(r.status === 404, "gebruikers: onbekende gebruiker 404");
  }

  // ---------------- gebruikers: nieuwe link (verlopen uitnodiging) ----------------
  {
    const N = nepSupabase(), f = G.maakGebruikers({ env: Object.assign({}, env, { LINK_GELDIG_SECONDEN: "900" }), fetch: N.fetch, log: () => {} });
    const b2 = N.tok(U(4), "aal2"), b1 = N.tok(U(4), "aal1"), c2 = N.tok(U(3), "aal2");
    const gl = () => N.S.calls.filter((c) => c.pad === "/auth/v1/admin/generate_link");
    let r = await lees(await f(post("gebruikers", b1, { actie: "nieuwe_link", id: U(6) })));
    ok(r.status === 403 && !gl().length, "nieuwe link: zonder aal2 geweigerd", r);
    r = await lees(await f(post("gebruikers", c2, { actie: "nieuwe_link", id: U(6) })));
    ok(r.status === 403 && !gl().length, "nieuwe link: coördinator geweigerd", r);
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(4) })));
    ok(r.status === 400 && !gl().length, "nieuwe link: niet voor jezelf", r);
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(6) })));
    const t = Date.parse(r.body && r.body.geldig_tot) - Date.now();
    ok(r.status === 200 && /type=invite/.test(r.body.link) && r.body.email === "zes@x.test" && gl().length === 1 && gl()[0].body.type === "invite" && gl()[0].body.redirect_to === SITE && gl()[0].auth === SVC,
      "nieuwe link: nooit ingelogd → nieuwe uitnodigingslink (type invite, naar SITE_URL)", r);
    ok(t > 890e3 && t <= 900e3, "nieuwe link: geldig_tot volgt LINK_GELDIG_SECONDEN (900 s)", r.body && r.body.geldig_tot);
    ok(N.S.events.some((e) => e.p_wie === U(4) && e.p_soort === "beheer_link_nieuw" && e.p_profiel === U(6)), "nieuwe link: beheer-gebeurtenis met de aanroeper als wie");
    ok(!JSON.stringify(r.body).includes(SVC), "nieuwe link: de service-sleutel staat nooit in het antwoord");
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(9) })));
    ok(r.status === 200 && /type=recovery/.test(r.body.link) && gl()[1].body.type === "recovery", "nieuwe link: e-mail al bevestigd, nooit ingelogd → herstellink (kies je wachtwoord)", r);
    const voor = gl().length;
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(3) })));
    ok(r.status === 409 && /al eens ingelogd/.test(r.body.message) && gl().length === voor, "nieuwe link: wie al eens inlogde krijgt nooit een link van een ander (geen accountovername)", r);
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(7) })));
    ok(r.status === 409 && /weer actief/.test(r.body.message) && gl().length === voor, "nieuwe link: niet voor een non-actief account", r);
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(8) })));
    ok(r.status === 409 && /niet via een uitnodiging/.test(r.body.message) && gl().length === voor, "nieuwe link: niet voor een vooraf aangemaakt account (README §1.4)", r);
    r = await lees(await f(post("gebruikers", b2, { actie: "nieuwe_link", id: U(77) })));
    ok(r.status === 404 && gl().length === voor, "nieuwe link: onbekende gebruiker 404", r);
  }
  {   // opnieuw uitnodigen van een bestaand adres: de melding wijst naar "Nieuwe link maken"
    const N = nepSupabase(), f = G.maakUitnodigen({ env, fetch: N.fetch, log: () => {} });
    const r = await lees(await f(post("uitnodigen", N.tok(U(4), "aal2"), { email: "zes@x.test", naam: "Iemand Anders", rol: "coordinator" })));
    ok(r.status === 409 && /Nieuwe link maken/.test(r.body.message), "uitnodigen: bestaand adres → verwijst naar Wijzig › Nieuwe link maken", r);
  }

  // ---------------- mail-versturen ----------------
  {
    const roep = []; const pdf = Buffer.from("%PDF-1.4 nep rapport");
    const rijen = [{ id: 1, inspectie_id: "WPI-1", ontvanger: U(5), bestand: U(3) + "/WPI-1.pdf", pogingen: 0 },
                   { id: 2, inspectie_id: "WPI-2", ontvanger: U(5), bestand: U(3) + "/WPI-2.pdf", pogingen: 2 }];
    const nep = async (url, init = {}) => {
      const u = new URL(url), m = (init.method || "GET").toUpperCase(); roep.push({ m, url: u.origin + u.pathname + u.search, body: init.body, h: init.headers || {} });
      const j = (s, b) => new Response(b === undefined ? null : typeof b === "string" || b instanceof Uint8Array ? b : JSON.stringify(b), { status: s });
      if (u.host === "login.microsoftonline.com") return j(200, { access_token: "graph-token" });
      if (u.pathname === "/rest/v1/mail_wachtrij" && m === "GET") return j(200, rijen);
      if (u.pathname === "/rest/v1/mail_wachtrij" && m === "PATCH") return j(204);
      if (u.pathname.startsWith("/auth/v1/admin/users/")) return j(200, u.pathname.endsWith(U(1)) ? { email: "hoofd@x.test" } : u.pathname.endsWith(U(2)) ? { email: "weg@x.test", banned_until: "2999-01-01T00:00:00Z" } : { email: "qhse@x.test" });
      if (u.pathname === "/rest/v1/profiles") return j(200, [{ actief: !(u.search.includes(U(5)) && nep.qhseWeg), role: "qhse" }]);
      if (u.pathname === "/rest/v1/rpc/rapport_ontvanger_id") return j(200, JSON.stringify(nep.huidig === undefined ? U(5) : nep.huidig));
      if (u.pathname === "/rest/v1/inspecties") return j(200, [{ titel: "Damwand", opgeslagen: "2026-11-10T09:00:00Z" }]);
      if (u.pathname.startsWith("/storage/v1/object/rapporten/")) return nep.lengte ? new Response(nep.bestand || pdf, { status: 200, headers: { "content-length": String(nep.lengte) } }) : j(200, new Uint8Array(nep.bestand || pdf));
      if (u.host === "upload.nep.test") { nep.stukken.push({ range: (init.headers || {})["Content-Range"], auth: (init.headers || {}).Authorization, bytes: Buffer.from(init.body) }); return nep.uploadFout && nep.stukken.length === 2 ? j(500, "kapot") : j(200, {}); }
      if (u.host === "graph.microsoft.com" && /\/messages$/.test(u.pathname) && m === "POST") return j(201, { id: "concept-1" });
      if (u.host === "graph.microsoft.com" && /\/createUploadSession$/.test(u.pathname)) return j(200, { uploadUrl: "https://upload.nep.test/sessie?token=x" });
      if (u.host === "graph.microsoft.com" && /\/messages\/concept-1\/send$/.test(u.pathname)) return j(202);
      if (u.host === "graph.microsoft.com" && /\/messages\/concept-1$/.test(u.pathname) && m === "DELETE") return j(204);
      if (u.host === "graph.microsoft.com") return /WPI-2/.test(init.body) ? j(503, "Service Unavailable") : j(202);
      return j(404, {});
    };
    const geen = M.maakMailVersturen({ env: { SUPABASE_URL: "https://nep.supabase.test", SUPABASE_SERVICE_ROLE_KEY: SVC, MAIL_CRON_GEHEIM: "cron-geheim" }, fetch: nep, log: () => {} });
    let r = await lees(await geen(new Request("https://x/f", { method: "POST" })));
    ok(r.status === 401, "mail: zonder cron-geheim geweigerd");
    r = await lees(await geen(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "fout-geheim" } })));
    ok(r.status === 401, "mail: verkeerd cron-geheim geweigerd");
    const logs = []; const geen2 = M.maakMailVersturen({ env: { SUPABASE_URL: "https://nep.supabase.test", SUPABASE_SERVICE_ROLE_KEY: SVC, MAIL_CRON_GEHEIM: "cron-geheim" }, fetch: nep, log: (l) => logs.push(l) });
    r = await lees(await geen2(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "cron-geheim" } })));
    ok(r.status === 200 && r.body.status === "wacht op mailbox" && roep.length === 0 && logs.some((l) => /wacht op mailbox/.test(l)), "mail: zonder Graph-inrichting niets verstuurd, log \"wacht op mailbox\"", r);
    const genv = { SUPABASE_URL: "https://nep.supabase.test", SUPABASE_SERVICE_ROLE_KEY: SVC, MAIL_CRON_GEHEIM: "cron-geheim",
      GRAPH_TENANT_ID: "tenant", GRAPH_CLIENT_ID: "client", GRAPH_CLIENT_SECRET: "geheim", GRAPH_AFZENDER: "rapporten@voorbeeld.test" };
    const met = M.maakMailVersturen({ env: genv, fetch: nep, log: () => {} });
    r = await lees(await met(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "cron-geheim" } })));
    const mails = roep.filter((c) => c.url.startsWith("https://graph.microsoft.com/v1.0/users/rapporten%40voorbeeld.test/sendMail"));
    const b1 = mails[0] && JSON.parse(mails[0].body), bij = b1 && b1.message.attachments[0];
    ok(r.status === 200 && r.body.verstuurd === 1 && r.body.fout === 1, "mail: één verstuurd, één fout (Graph 503)", r);
    ok(bij && bij.contentType === "application/pdf" && Buffer.from(bij.contentBytes, "base64").equals(pdf) && b1.message.toRecipients[0].emailAddress.address === "qhse@x.test",
      "mail: PDF als bijlage naar de ontvanger", b1 && b1.message.toRecipients);
    const pt = roep.filter((c) => c.m === "PATCH").map((c) => ({ url: c.url, b: JSON.parse(c.body) }));
    ok(pt.some((p) => /id=eq\.1$/.test(p.url) && p.b.status === "verstuurd" && p.b.pogingen === 1) && pt.some((p) => /id=eq\.2$/.test(p.url) && p.b.status === "fout" && p.b.pogingen === 3 && /503/.test(p.b.laatste_fout)),
      "mail: rijen gemarkeerd (verstuurd; fout met pogingen + 1 en de reden)", pt);
    ok(roep.filter((c) => c.url.startsWith("https://nep.supabase.test")).every((c) => c.h.Authorization === "Bearer " + SVC) && roep.filter((c) => c.url.startsWith("https://graph")).every((c) => c.h.Authorization === "Bearer graph-token"),
      "mail: service-sleutel alleen naar Supabase, Graph-token alleen naar Graph");
    ok(!/[A-Z][a-z]+ [A-Z][a-z]+/.test(b1.message.subject.replace(/Rapport werkplekinspectie/, "")), "mail: onderwerp zonder persoonsnamen", b1 && b1.message.subject);
    // onderwerp: rapportnummer (terug te vinden) en wat meteen opvalt (niet ondertekend, direct gevaar)
    {
      const basis = { titel: "Damwand · RWZI", opgeslagen: "2026-11-14T08:03:00Z", nummer: "WPI-20261114-DAM-FF-0758" };
      const s1 = M.onderwerp(Object.assign({ handtekening: "u/x.png", waarnemingen: [{ oordeel: "C" }] }, basis));
      const s2 = M.onderwerp(Object.assign({ handtekening: null, waarnemingen: [{ oordeel: "A", actie: { gevaar: "door jou gemeld" } }] }, basis));
      const b2 = M.bericht("q@x.test", Object.assign({ handtekening: "" }, basis), null, "x.pdf");
      ok(/^Rapport werkplekinspectie WPI-20261114-DAM-FF-0758: Damwand · RWZI \(14 november 2026\)$/.test(s1), "mail: onderwerp met rapportnummer", s1);
      ok(/^\[NIET ONDERTEKEND · DIRECT GEVAAR\] Rapport werkplekinspectie WPI-20261114-DAM-FF-0758: /.test(s2), "mail: onderwerp markeert niet ondertekend en direct gevaar", s2);
      ok(/NIET ONDERTEKEND/.test(b2.message.subject) && /zonder handtekening/.test(b2.message.body.content) && /WPI-20261114-DAM-FF-0758/.test(b2.message.body.content), "mail: tekst noemt het nummer en 'zonder handtekening'", b2.message);
      ok(M.onderwerp({ titel: "Oud", opgeslagen: "2026-11-10T09:00:00Z", nummer: "x; drop" }) === "Rapport werkplekinspectie: Oud (10 november 2026)", "mail: ongeldig nummer of onbekende handtekening → geen vlag, geen nummer");
    }
    // de ontvanger van de rij staat intussen op non-actief: nooit naar de oud-collega, maar naar de huidige ontvanger
    rijen.length = 0; rijen.push({ id: 3, inspectie_id: "WPI-3", ontvanger: U(5), bestand: U(3) + "/WPI-3.pdf", pogingen: 0 });
    nep.qhseWeg = true; nep.huidig = U(1); roep.length = 0;
    r = await lees(await met(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "cron-geheim" } })));
    let m3 = roep.find((c) => c.url.startsWith("https://graph.microsoft.com")), pt3 = roep.find((c) => c.m === "PATCH");
    ok(r.body.verstuurd === 1 && JSON.parse(m3.body).message.toRecipients[0].emailAddress.address === "hoofd@x.test" && !roep.some((c) => c.body && /qhse@x\.test/.test(c.body))
      && pt3 && JSON.parse(pt3.body).ontvanger === U(1), "mail: ontvanger non-actief → naar de huidige ontvanger (en dat vastgelegd), nooit naar de oud-collega", { r, pt3 });
    // niemand meer als ontvanger: blijft wachten
    nep.huidig = null; roep.length = 0;
    r = await lees(await met(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "cron-geheim" } })));
    ok(r.body.overgeslagen === 1 && !roep.some((c) => c.url.startsWith("https://graph.microsoft.com/v1.0")) && !roep.some((c) => c.m === "PATCH"), "mail: geen actieve ontvanger → niets verstuurd, rij blijft wachten", r);
    // ontvanger geblokkeerd in Supabase Auth (ban): niet versturen
    nep.qhseWeg = false; rijen[0].ontvanger = U(2); roep.length = 0;
    r = await lees(await met(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "cron-geheim" } })));
    ok(r.body.overgeslagen === 1 && !roep.some((c) => c.url.startsWith("https://graph.microsoft.com/v1.0")), "mail: geblokkeerde ontvanger → niets verstuurd", r);
    rijen[0].ontvanger = U(5);
    const ronde = async () => { roep.length = 0; return lees(await met(new Request("https://x/f", { method: "POST", headers: { "x-wpi-cron": "cron-geheim" } }))); };
    const patch = () => roep.filter((c) => c.m === "PATCH").map((c) => JSON.parse(c.body));
    // geen PDF (de bucket kijkt alleen naar de Content-Type-kop): nooit versturen, en niet elke ronde opnieuw
    nep.bestand = Buffer.from("<html><script>alert(1)</script></html>");
    r = await ronde();
    ok(r.body.fout === 1 && r.body.verstuurd === 0 && !roep.some((c) => c.url.startsWith("https://graph.microsoft.com/v1.0")) && patch()[0].status === "fout"
      && patch()[0].pogingen === M.MAX_POGINGEN && /geen PDF/.test(patch()[0].laatste_fout), "mail: bestand dat geen PDF is (HTML met Content-Type PDF) → niet gemaild, fout zonder nieuwe pogingen", { r: r.body, p: patch() });
    ok(M.isPdf(Buffer.from("%PDF-1.7")) && !M.isPdf(Buffer.from("%PDF")) && !M.isPdf(Buffer.from(" %PDF-1.7")), "mail: isPdf kijkt naar de eerste vijf bytes");
    // groter dan 3 MB (tot 20 MB, zoals de bucket): via een uploadsessie in stukken, zonder Authorization-kop naar het upload-adres
    const groot = Buffer.alloc(5 * 1024 * 1024 + 123, 7); groot.write("%PDF-1.7\n", 0);
    nep.bestand = groot; nep.stukken = [];
    r = await ronde();
    const st = nep.stukken, samen = Buffer.concat(st.map((x) => x.bytes));
    ok(r.body.verstuurd === 1 && samen.equals(groot) && st.every((x) => x.auth === undefined && x.bytes.length <= 4 * 1024 * 1024)
      && st[0].range === "bytes 0-" + (M.BLOK - 1) + "/" + groot.length && st[st.length - 1].range.endsWith("-" + (groot.length - 1) + "/" + groot.length)
      && roep.some((c) => /\/messages\/concept-1\/send$/.test(c.url)) && !roep.some((c) => /\/sendMail$/.test(c.url)) && patch()[0].status === "verstuurd",
      "mail: rapport van 5 MB via een uploadsessie (stukken < 4 MB, geen token naar het upload-adres) en verstuurd", { r: r.body, st: st.map((x) => x.range) });
    const cb = roep.find((c) => /\/createUploadSession$/.test(c.url)), ct = roep.find((c) => /\/messages$/.test(c.url));
    ok(cb && JSON.parse(cb.body).AttachmentItem.size === groot.length && JSON.parse(cb.body).AttachmentItem.name === "WPI-3.pdf" && ct && !JSON.parse(ct.body).attachments,
      "mail: concept zonder bijlage, uploadsessie met naam en grootte");
    // upload mislukt halverwege: concept weer weg, rij op fout (volgende ronde opnieuw)
    nep.stukken = []; nep.uploadFout = true;
    r = await ronde();
    ok(r.body.fout === 1 && roep.some((c) => c.m === "DELETE" && /\/messages\/concept-1$/.test(c.url)) && patch()[0].status === "fout" && patch()[0].pogingen === 1,
      "mail: upload mislukt → concept verwijderd, rij op fout (wordt opnieuw geprobeerd)", { r: r.body, p: patch() });
    nep.uploadFout = false;
    // groter dan 20 MB (Content-Length): niet eens helemaal ophalen
    nep.bestand = Buffer.from("%PDF-1.7 klein"); nep.lengte = 21 * 1024 * 1024;
    r = await ronde();
    ok(r.body.fout === 1 && patch()[0].pogingen === M.MAX_POGINGEN && /20 MB/.test(patch()[0].laatste_fout) && !roep.some((c) => c.url.startsWith("https://graph.microsoft.com/v1.0")),
      "mail: groter dan 20 MB → fout zonder nieuwe pogingen, niets naar Graph", { r: r.body, p: patch() });
    nep.lengte = 0; nep.bestand = null;
  }

  // ---------------- deno check en lint (als deno er is) ----------------
  const deno = process.env.WPI_DENO || (spawnSync("sh", ["-c", "command -v deno"], { encoding: "utf8" }).stdout || "").trim();
  if (deno && fs.existsSync(deno)) {
    const opt = { cwd: FN, encoding: "utf8", env: Object.assign({}, process.env, { DENO_DIR: process.env.DENO_DIR || "/tmp/claude-0/denocache", NO_COLOR: "1" }) };
    const c = spawnSync(deno, ["check", "uitnodigen/index.ts", "gebruikers/index.ts", "mail-versturen/index.ts"], opt);
    ok(c.status === 0, "deno check (strict) van de drie functies", (c.stderr || "").slice(-400));
    const l = spawnSync(deno, ["lint"], opt);
    ok(l.status === 0, "deno lint", (l.stdout + l.stderr).slice(-400));
  } else console.log("deno: niet gevonden (zet WPI_DENO=<pad naar deno>); deno check en lint overgeslagen");
  console.log("errs " + JSON.stringify(errs));
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.log("FOUT onverwacht: " + (e && e.stack || e)); console.log("errs " + JSON.stringify(["onverwacht"])); process.exit(1); });
