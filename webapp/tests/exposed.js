// Werkplekinspectie — tests/exposed.js: wat is publiek bereikbaar, en kloppen de beveiligingsheaders?
//
//   node tests/exposed.js http://localhost:8418                 bereikbaarheid (lokaal of gedeployd)
//   node tests/exposed.js --headers https://werkplekinspectie.nl  headers van een gedeployde site
//   node tests/exposed.js --config                               deploy-config: allowlist-build (echt uitgevoerd), 404-regels, CSP gelijk,
//                                                                beveiligingsheaders + no-cache (ook "/") + http→https in _headers/netlify.toml/vercel.json,
//                                                                /.well-known/assetlinks.json gepubliceerd als application/json (Android-app)
//   node tests/exposed.js --alles https://...                    alle drie
//   --strict  → exitcode 1 als iets gevoeligs bereikbaar is of een verplichte header ontbreekt
//
// Als module (later in een deploy-check):
//   const { probeExposed, checkHeaders, configCheck } = require("./exposed.js");
//   const r = await probeExposed("https://..."); const h = await checkHeaders("https://...");
//
// Bereikbaarheid: vraagt /docs/, /tests/, /supabase/, /.git/HEAD, /.env, alle *.md, tests/*.js,
// supabase/*.sql enz. op (lijst uit de echte bestanden in webapp/ plus vaste gevoelige paden) en meldt
// statuscode, grootte en of er een maplijst ("Directory listing") terugkomt. Een 200 op een pad dat
// niet voor de app nodig is = "BLOOTGESTELD". Bestanden die de app zelf nodig heeft (index.html, js/,
// data/*.json, ...) zijn "nodig" en tellen niet als fout.
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const WEBAPP = path.resolve(__dirname, "..");

// ---------- HTTP zonder afhankelijkheden (geen redirects volgen) ----------
function vraag(url, method = "GET", ms = 10000) {
  return new Promise((res) => {
    let u; try { u = new URL(url); } catch (e) { return res({ status: 0, fout: "ongeldige URL" }); }
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, { method, headers: { "User-Agent": "wpi-kwaliteitscheck/1.0", Accept: "*/*" }, timeout: ms }, (r) => {
      const delen = []; let n = 0;
      r.on("data", (d) => { n += d.length; if (n < 65536) delen.push(d); });
      r.on("end", () => res({ status: r.statusCode, headers: r.headers, body: Buffer.concat(delen).toString("utf8"), grootte: n }));
    });
    req.on("timeout", () => { req.destroy(); res({ status: 0, fout: "time-out" }); });
    req.on("error", (e) => res({ status: 0, fout: e.code || e.message }));
    req.end();
  });
}

// ---------- welke paden ----------
const NODIG = (rel) => /^(index\.html|styles\.css|sw\.js|manifest\.json|icon-\d+\.png|css\/.+\.css|js\/.+\.js|data\/.+\.json|fonts\/.+\.(woff2|ttf))$/.test(rel);
const VAST = ["docs/", "tests/", "supabase/", "supabase/migrations/", ".git/HEAD", ".git/config", "../.git/HEAD", ".env", ".env.local",
  "README.md", "docs/README.md", "tests/README.md", "supabase/README.md", "package.json", ".DS_Store", "netlify.toml", "vercel.json", "_headers",
  "js/", "data/", "tools/", "handoff/", "wpi/", "node_modules/", ".vscode/settings.json", "backup.zip", "webapp.zip"];
function bestanden(dir, rel = "") {
  let uit = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.name === "node_modules" || d.name === ".git") continue;
    const r = rel ? rel + "/" + d.name : d.name;
    if (d.isDirectory()) uit = uit.concat(bestanden(path.join(dir, d.name), r)); else uit.push(r);
  }
  return uit;
}
function kandidaten() {
  const echt = fs.existsSync(WEBAPP) ? bestanden(WEBAPP) : [];
  const set = new Set(VAST);
  for (const f of echt) {
    if (NODIG(f)) continue;
    if (/^docs\/ref\//.test(f) && !/\.(md|txt)$/.test(f)) continue;   // referentie-afbeeldingen: één steekproef is genoeg
    set.add(f.split("/").map(encodeURIComponent).join("/"));
  }
  set.add("docs/ref/");
  // steekproef van "nodig"-bestanden (moeten 200 geven)
  ["index.html", "js/kern.js", "data/kennisbank.json"].forEach((f) => set.add(f));
  return [...set];
}
const soortVan = (rel) => NODIG(decodeURIComponent(rel)) ? "nodig"
  : /(^|\/)\.git\/|\.env|\.sql$|^supabase\/|^tests\/|^tools\/|^handoff\/|^wpi\//.test(rel) ? "gevoelig"
  : /\.md$|^docs\//.test(rel) ? "documentatie"
  : /\.(html)$/.test(rel) ? "extra-pagina"
  : /^(netlify\.toml|vercel\.json|_headers|package\.json)$/.test(rel) ? "config" : "overig";

async function probeExposed(base, opts = {}) {
  base = base.replace(/\/+$/, "");
  const lijst = opts.paden || kandidaten(), res = [];
  const rij = lijst.slice();
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (rij.length) {
      const rel = rij.shift(), r = await vraag(base + "/" + rel);
      const listing = r.status === 200 && /<title>Directory listing|Index of \//i.test(r.body || "");
      const spa = r.status === 200 && rel !== "index.html" && /<div id="app">/.test(r.body || "");   // SPA-terugval: index.html i.p.v. het bestand
      const soort = soortVan(rel);
      const bereikbaar = r.status >= 200 && r.status < 300 && !spa;
      const oordeel = soort === "nodig" ? (bereikbaar ? "ok (nodig)" : "ONTBREEKT") : bereikbaar ? (soort === "gevoelig" ? "BLOOTGESTELD" : "bereikbaar") : "afgeschermd";
      res.push({ pad: "/" + rel, status: r.status || r.fout, grootte: r.grootte || 0, listing, spa, soort, oordeel, type: r.headers && r.headers["content-type"] });
    }
  }));
  const ord = { BLOOTGESTELD: 0, bereikbaar: 1, ONTBREEKT: 2, "ok (nodig)": 3, afgeschermd: 4 };
  return res.sort((a, b) => ord[a.oordeel] - ord[b.oordeel] || a.pad.localeCompare(b.pad));
}

// ---------- headers van een gedeployde site ----------
// Beoordeelt één set response-headers (get(naam) → waarde). Gebruikt door checkHeaders (live site) en
// headerConfigCheck (wat _headers, netlify.toml en vercel.json voor "/*" instellen), zodat beide dezelfde eisen toetsen.
function beoordeelHeaders(get, isHttps, uit) {
  const add = (header, status, detail) => uit.push({ header, status, detail });
  const hsts = get("strict-transport-security");
  if (!hsts) add("Strict-Transport-Security", isHttps ? "ONTBREEKT" : "n.v.t. (http)", "");
  else { const m = hsts.match(/max-age=(\d+)/); add("Strict-Transport-Security", m && +m[1] >= 15552000 ? "ok" : "ZWAK", hsts + (m && +m[1] < 15552000 ? " (max-age < 180 dagen)" : "")); }
  const csp = get("content-security-policy");
  if (!csp) add("Content-Security-Policy", "ONTBREEKT", "alleen de meta-CSP in index.html (geen frame-ancestors mogelijk)");
  else {
    const w = [];
    if (/script-src[^;]*'unsafe-inline'/.test(csp)) w.push("script-src bevat 'unsafe-inline'");
    if (/script-src[^;]*'unsafe-eval'/.test(csp)) w.push("script-src bevat 'unsafe-eval'");
    if (/\*\.supabase\.co/.test(csp)) w.push("wildcard *.supabase.co (exfiltratie naar elk Supabase-project mogelijk)");
    if (!/frame-ancestors/.test(csp)) w.push("geen frame-ancestors");
    if (!/object-src 'none'/.test(csp)) w.push("geen object-src 'none'");
    if (!/base-uri/.test(csp)) w.push("geen base-uri");
    add("Content-Security-Policy", w.length ? "AANDACHT" : "ok", w.join("; ") || csp.slice(0, 120));
  }
  const xcto = get("x-content-type-options"); add("X-Content-Type-Options", xcto === "nosniff" ? "ok" : "ONTBREEKT", xcto || "");
  const xfo = get("x-frame-options"); add("X-Frame-Options / frame-ancestors", xfo || (csp && /frame-ancestors/.test(csp)) ? "ok" : "ONTBREEKT", xfo || "");
  const rp = get("referrer-policy"); add("Referrer-Policy", rp && !/unsafe-url|no-referrer-when-downgrade/.test(rp) ? "ok" : "ONTBREEKT", rp || "");
  const pp = get("permissions-policy"); add("Permissions-Policy", pp ? "ok" : "ONTBREEKT", pp ? pp.slice(0, 80) + "…" : "");
  add("Cross-Origin-Opener-Policy", get("cross-origin-opener-policy") ? "ok" : "ONTBREEKT", get("cross-origin-opener-policy") || "");
  add("Cross-Origin-Resource-Policy", get("cross-origin-resource-policy") ? "ok" : "aanbevolen", get("cross-origin-resource-policy") || "");
  const srv = get("server"), xpb = get("x-powered-by");
  add("Server / X-Powered-By", xpb || (srv && /\d/.test(srv)) ? "AANDACHT" : "ok", [srv, xpb].filter(Boolean).join(" · ") || "geen versie-info");
  return csp;
}
async function checkHeaders(url) {
  const u = url.replace(/\/+$/, ""), uit = [];
  const r = await vraag(u + "/", "GET");
  if (!r.status) return [{ header: "(verbinding)", status: "FOUT", detail: r.fout }];
  const h = r.headers || {}, get = (k) => h[k.toLowerCase()];
  const add = (header, status, detail) => uit.push({ header, status, detail });
  beoordeelHeaders(get, u.startsWith("https:"), uit);
  for (const f of ["index.html", "sw.js"]) {
    const x = await vraag(u + "/" + f, "HEAD"); const cc = x.headers && x.headers["cache-control"];
    add("Cache-Control /" + f, cc && /no-cache|no-store|max-age=0/.test(cc) ? "ok" : "AANDACHT", cc || "(geen; oude app-schil kan blijven hangen)");
  }
  if (u.startsWith("https:")) {
    const x = await vraag(u.replace(/^https:/, "http:") + "/", "GET");
    const loc = x.headers && x.headers.location;
    add("http → https", x.status >= 300 && x.status < 400 && /^https:/.test(loc || "") ? "ok" : x.status ? "ONTBREEKT" : "n.v.t.", x.status ? x.status + " " + (loc || "") : x.fout);
  }
  return uit;
}

// ---------- controle van de deploy-configuratie ----------
// 1. De publicatie is een ALLOWLIST: netlify.toml (command), vercel.json (buildCommand) en _headers (regel
//    "CLOUDFLARE_BUILD:" voor Cloudflare Pages) bouwen dist/ en publiceren alleen die map. bouwDist() voert elke
//    opdracht echt uit in een tijdelijke kopie van webapp/ (met extra lokaasbestanden: .env, x.sql, x.py, x.sh,
//    README.md, een interne pagina, een submap met tests) en controleert de inhoud: alleen app-bestanden, en
//    alles uit de SHELL-lijst van sw.js aanwezig (anders werkt de app offline niet).
// 2. Daarnaast (vangnet) per pad: geeft de host 404 (vercel.json-routes, netlify.toml-redirects) of staat het
//    niet in dist/?
// 3. De CSP is in index.html (meta), _headers, netlify.toml en vercel.json gelijk (frame-ancestors alleen als header).
const { execFileSync } = require("child_process");
const os = require("os");
function leesConfig() {
  let vercel = null; try { vercel = JSON.parse(fs.readFileSync(path.join(WEBAPP, "vercel.json"), "utf8")); } catch (e) {}
  let toml = ""; try { toml = fs.readFileSync(path.join(WEBAPP, "netlify.toml"), "utf8"); } catch (e) {}
  let hdr = ""; try { hdr = fs.readFileSync(path.join(WEBAPP, "_headers"), "utf8"); } catch (e) {}
  const netlifyCmd = (toml.match(/^\s*command\s*=\s*"(.*)"\s*$/m) || [])[1] || "";
  const netlifyPublish = (toml.match(/^\s*publish\s*=\s*"(.*)"\s*$/m) || [])[1] || "";
  const cfCmd = (hdr.match(/CLOUDFLARE_BUILD:\s*(.+)$/m) || [])[1] || "";
  return { vercel, toml, hdr, netlifyCmd, netlifyPublish, cfCmd: cfCmd.trim() };
}
const SHELL = () => { const t = fs.readFileSync(path.join(WEBAPP, "sw.js"), "utf8"); return [...(t.match(/const SHELL = \[([\s\S]*?)\];/) || [, ""])[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((x) => x !== "./"); };
// .well-known/assetlinks.json: Digital Asset Links voor de Android-app (Trusted Web Activity); moet online staan
const ASSETLINKS = ".well-known/assetlinks.json";
const MAG_IN_DIST = (rel) => NODIG(rel) || rel === "_headers" || rel === ASSETLINKS;
const LOKAAS = [".env", "geheim.sql", "script.py", "deploy.sh", "NOTITIE.md", "intern.html", "tests/lokaas.js", "docs/lokaas.md",
  "supabase/lokaas.sql", "js/README.md", "js/.env", "data/export.sql", "css/oud.css.bak", "js/debug.py", "data/.DS_Store",
  ".well-known/notitie.md", ".well-known/.env", ".git/HEAD"];
function kopieer(van, naar) {
  fs.mkdirSync(naar, { recursive: true });
  for (const d of fs.readdirSync(van, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(d.name) || (d.name === "ref" && van.endsWith("docs"))) continue;
    const a = path.join(van, d.name), b = path.join(naar, d.name);
    if (d.isDirectory()) kopieer(a, b); else fs.copyFileSync(a, b);
  }
}
function bouwDist(opdracht, uitmap = "dist") {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wpi-dist-")), werk = path.join(tmp, "webapp");
  try {
    kopieer(WEBAPP, werk);
    for (const f of LOKAAS) { fs.mkdirSync(path.dirname(path.join(werk, f)), { recursive: true }); fs.writeFileSync(path.join(werk, f), "lokaas\n"); }
    execFileSync("sh", ["-c", opdracht], { cwd: werk, stdio: "pipe", timeout: 60000 });
    const dist = path.join(werk, uitmap);
    const lijst = fs.existsSync(dist) ? bestanden(dist) : [];
    const fout = lijst.filter((f) => !MAG_IN_DIST(f));
    const mist = SHELL().concat(fs.existsSync(path.join(WEBAPP, ASSETLINKS)) ? [ASSETLINKS] : []).filter((f) => !lijst.includes(f));
    return { ok: !!lijst.length && !fout.length && !mist.length, bestanden: lijst, fout, mist };
  } catch (e) {
    return { ok: false, bestanden: [], fout: ["build mislukt: " + String(e.stderr || e.message).slice(0, 200)], mist: [] };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
const CSP_DIRECTIVES = (csp) => Object.fromEntries(String(csp || "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => { const [k, ...v] = x.split(/\s+/); return [k, v.join(" ")]; }));
function cspCheck() {
  const c = leesConfig(), uit = [];
  const meta = (fs.readFileSync(path.join(WEBAPP, "index.html"), "utf8").match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
  const hdr = (c.hdr.match(/^\s*Content-Security-Policy:\s*(default-src 'self'.*)$/m) || [])[1];
  const net = (c.toml.match(/^\s*Content-Security-Policy\s*=\s*"(.*)"\s*$/m) || [])[1];
  const ver = c.vercel && ((c.vercel.routes || []).find((r) => r.headers && r.headers["Content-Security-Policy"]) || {}).headers;
  const bronnen = { "index.html (meta)": meta, _headers: hdr, "netlify.toml": net, "vercel.json": ver && ver["Content-Security-Policy"] };
  const ref = CSP_DIRECTIVES(hdr);
  for (const [naam, csp] of Object.entries(bronnen)) {
    if (!csp) { uit.push({ bron: naam, oordeel: "ONTBREEKT", detail: "" }); continue; }
    const d = CSP_DIRECTIVES(csp), w = [];
    for (const k of new Set([...Object.keys(ref), ...Object.keys(d)])) {
      if (k === "frame-ancestors" && naam.startsWith("index.html")) continue;   // werkt niet in een meta-tag
      if ((ref[k] || null) !== (d[k] || null)) w.push(k + ": " + (d[k] == null ? "(ontbreekt)" : d[k]));
    }
    if (!/script-src 'self'(;|$)/.test(csp.replace(/\s+/g, " ").replace(/ ;/g, ";")) && !/script-src 'self';/.test(csp)) w.push("script-src is niet strikt 'self'");
    if (/script-src[^;]*'unsafe-(inline|eval)'/.test(csp)) w.push("script-src met 'unsafe-inline'/'unsafe-eval'");
    if (!/script-src-attr 'none'/.test(csp)) w.push("geen script-src-attr 'none'");
    if (/\*\.supabase\.co/.test(csp)) w.push("wildcard *.supabase.co");
    uit.push({ bron: naam, oordeel: w.length ? "AFWIJKEND" : "ok", detail: w.join("; ") });
  }
  return uit;
}
// 4. De beveiligingsheaders die de drie hostconfiguraties voor "/*" zetten (zelfde eisen als --headers op een
//    live site: HSTS ≥ 180 dagen, CSP, nosniff, X-Frame-Options/frame-ancestors, Referrer-, Permissions-, COOP/CORP),
//    plus Cache-Control: no-cache voor index.html en sw.js en het doorsturen van http naar https (Netlify-regel).
function headerBlokken() {
  const c = leesConfig(), uit = {};
  // _headers: het blok onder de regel "/*" (ingesprongen "Naam: waarde"-regels)
  const blok = (pad) => { const r = c.hdr.split(/\r?\n/), h = {}; let i = r.findIndex((x) => x.trim() === pad && !/^\s/.test(x)); if (i < 0) return null;
    for (i++; i < r.length && (/^\s+\S/.test(r[i]) || /^\s*#/.test(r[i])); i++) { const m = r[i].match(/^\s+([A-Za-z-]+):\s*(.*)$/); if (m) h[m[1].toLowerCase()] = m[2].trim(); } return h; };
  uit["_headers"] = { alles: blok("/*"), index: blok("/index.html"), sw: blok("/sw.js"), root: blok("/"), al: blok("/" + ASSETLINKS) };
  // netlify.toml: [[headers]] for = "<pad>" met [headers.values]
  const tom = (pad) => { const m = [...c.toml.matchAll(/\[\[headers\]\]([\s\S]*?)(?=\n\[\[|$)/g)].find((x) => new RegExp('for\\s*=\\s*"' + pad.replace(/[*.]/g, "\\$&") + '"').test(x[1]));
    if (!m) return null; const h = {}; for (const r of m[1].split(/\n/)) { const k = r.match(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/); if (k && k[1] !== "for") h[k[1].toLowerCase()] = k[2]; } return h; };
  uit["netlify.toml"] = { alles: tom("/*"), index: tom("/index.html"), sw: tom("/sw.js"), root: tom("/"), al: tom("/" + ASSETLINKS) };
  // vercel.json: routes met headers; een pad krijgt de headers van elke route met "continue" die erop past
  const ver = (pad) => { if (!c.vercel) return null; const h = {}; let n = 0;
    for (const r of c.vercel.routes || []) if (r.headers && r.continue && new RegExp("^" + r.src + "$").test(pad)) { n++; for (const [k, v] of Object.entries(r.headers)) h[k.toLowerCase()] = v; }
    return n ? h : null; };
  uit["vercel.json"] = { alles: ver("/"), index: ver("/index.html"), sw: ver("/sw.js"), root: ver("/"), al: ver("/" + ASSETLINKS) };
  return { blokken: uit, c };
}
function headerConfigCheck() {
  const { blokken, c } = headerBlokken(), uit = [];
  for (const [bron, b] of Object.entries(blokken)) {
    if (!b.alles) { uit.push({ bron, header: '(blok voor "/*")', status: "ONTBREEKT", detail: "" }); continue; }
    const r = []; beoordeelHeaders((k) => b.alles[k.toLowerCase()], true, r);
    for (const x of r) if (x.header !== "Server / X-Powered-By") uit.push(Object.assign({ bron }, x));
    for (const [naam, h] of [["index.html", b.index], ["sw.js", b.sw], ["", b.root]]) {
      const cc = h && h["cache-control"];
      uit.push({ bron, header: "Cache-Control /" + naam, status: cc && /no-cache|no-store|max-age=0/.test(cc) ? "ok" : "ONTBREEKT", detail: cc || "" });
    }
    const ct = b.al && b.al["content-type"];
    uit.push({ bron, header: "Content-Type /" + ASSETLINKS, status: ct && /^application\/json\b/i.test(ct) ? "ok" : "ONTBREEKT", detail: ct || "(Android verwacht application/json)" });
  }
  // De regel noemt vaste domeinen (from = "http://<domein>/*"): op een ander adres (app.<domein>.nl, *.netlify.app)
  // doet hij niets en stuurt Netlify zelf door zodra het certificaat er is. Daarom de domeinen in de uitvoer, en na de
  // deploy altijd --alles https://<adres> (vraagt echt http:// op).
  const httpsRegels = [...c.toml.matchAll(/\[\[redirects\]\]([\s\S]*?)(?=\n\[\[|$)/g)].filter((m) => /from\s*=\s*"http:\/\//.test(m[1]) && /to\s*=\s*"https:\/\//.test(m[1]) && /status\s*=\s*30[18]/.test(m[1]));
  const naarHttps = httpsRegels.length > 0, domeinen = httpsRegels.map((m) => (/from\s*=\s*"http:\/\/([^/"]+)/.exec(m[1]) || [])[1]).filter(Boolean);
  uit.push({ bron: "netlify.toml", header: "http → https", status: naarHttps ? "ok" : "ONTBREEKT", detail: naarHttps ? "301-regel alleen voor " + domeinen.join(", ") + " (ander adres: aanpassen, of Netlify stuurt zelf door; controleer met --alles)" : "" });
  uit.push({ bron: "vercel.json", header: "http → https", status: "ok", detail: "Vercel stuurt altijd door (niet uit te zetten)" });
  uit.push({ bron: "_headers", header: "http → https", status: "n.v.t.", detail: 'Cloudflare: "Always Use HTTPS" aanzetten (instelling, geen bestand)' });
  return uit;
}
function configCheck() {
  const paden = ["/docs/x.md", "/docs/", "/docs/beveiliging-checklist-ruw.md", "/tests/e2e.js", "/tests/security.js", "/supabase/seed.sql",
    "/supabase/migrations/0001_tabellen.sql", "/supabase/tests/run.sh", "/README.md", "/docs/sub/diep/x.md", "/js/README.md",
    "/beveiliging.html", "/gauntlet.html", "/onderzoek.html", "/verbeter.html", "/design-vandaag.html",
    "/netlify.toml", "/vercel.json", "/_headers", "/.git/HEAD", "/.git/config", "/.env", "/js/.env",
    "/tools/periodieke_check.sh", "/tools/mock_supabase.py", "/x.sql", "/data/export.sql", "/x.py", "/x.sh", "/handoff/x.md", "/wpi/x"];
  const c = leesConfig(), uit = [];
  const vercelCmd = c.vercel && c.vercel.buildCommand, vercelOut = c.vercel && c.vercel.outputDirectory;
  const net = c.netlifyCmd ? bouwDist(c.netlifyCmd, c.netlifyPublish || ".") : null;
  const ver = vercelCmd ? bouwDist(vercelCmd, vercelOut || ".") : null;
  const cf = c.cfCmd ? bouwDist(c.cfCmd, "dist") : null;
  const reds = [...c.toml.matchAll(/\[\[redirects\]\]([\s\S]*?)(?=\[\[|$)/g)].map((m) => ({ from: (m[1].match(/from\s*=\s*"([^"]+)"/) || [])[1], status: +((m[1].match(/status\s*=\s*(\d+)/) || [])[1] || 0) })).filter((r) => r.from && r.status === 404);
  const netGlob = (pat, p) => new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\/:\w+/g, "/[^/]+").replace(/\*/g, ".*") + "$").test(p);
  const inDist = (b, p) => b && b.bestanden.includes(p.slice(1));
  for (const p of paden) {
    let v = "geen vercel.json";
    if (c.vercel) { const r = (c.vercel.routes || []).find((x) => x.src && !x.continue && x.status && new RegExp("^" + x.src + "$").test(p)); v = r ? "geblokkeerd (" + r.status + ")" : ver && ver.ok && !inDist(ver, p) ? "niet in dist" : "BEREIKBAAR"; }
    let n = "geen netlify.toml";
    if (c.toml) n = reds.some((r) => netGlob(r.from, p)) ? "geblokkeerd (404)" : net && net.ok && !inDist(net, p) ? "niet in dist" : "BEREIKBAAR";
    // _headers moet in dist/ staan: Cloudflare Pages (en Netlify) lezen hem daar en serveren hem niet als bestand;
    // er staan alleen de publieke beveiligingsheaders in, geen geheimen.
    const f = !c.cfCmd ? "GEEN BUILD" : p === "/_headers" ? "door host verwerkt" : cf && cf.ok && !inDist(cf, p) ? "niet in dist" : "BEREIKBAAR";
    uit.push({ pad: p, vercel: v, netlify: n, cloudflare: f });
  }
  // wat juist WEL online moet: de app zelf en assetlinks.json (niet door een 404-regel geblokkeerd, wel in dist/)
  for (const p of ["/", "/index.html", "/" + ASSETLINKS]) {
    const r = c.vercel && (c.vercel.routes || []).find((x) => x.src && !x.continue && x.status && new RegExp("^" + x.src + "$").test(p));
    const inD = (b) => p === "/" ? inDist(b, "/index.html") : inDist(b, p);
    uit.push({ pad: p, moet: true, vercel: !c.vercel ? "geen vercel.json" : r ? "GEBLOKKEERD (" + r.status + ")" : inD(ver) ? "online" : "ONTBREEKT",
      netlify: !c.toml ? "geen netlify.toml" : reds.some((x) => netGlob(x.from, p)) ? "GEBLOKKEERD (404)" : inD(net) ? "online" : "ONTBREEKT",
      cloudflare: !c.cfCmd ? "GEEN BUILD" : inD(cf) ? "online" : "ONTBREEKT" });
  }
  const builds = [["netlify.toml", net, c.netlifyCmd], ["vercel.json", ver, vercelCmd], ["_headers (Cloudflare)", cf, c.cfCmd]].map(([naam, b, cmd]) => ({
    host: naam, ok: !!(b && b.ok), detail: !cmd ? "geen build-opdracht (dan wordt alles gepubliceerd)" : b.ok ? b.bestanden.length + " bestanden in dist/, alleen app-bestanden" : [b.fout.length ? "niet toegestaan: " + b.fout.join(", ") : "", b.mist.length ? "ontbreekt (SHELL): " + b.mist.join(", ") : ""].filter(Boolean).join(" · ") }));
  const gelijk = !!(c.netlifyCmd && c.netlifyCmd === vercelCmd && c.netlifyCmd === c.cfCmd);
  return Object.assign(uit, { builds, gelijk });
}

module.exports = { probeExposed, checkHeaders, configCheck, cspCheck, headerConfigCheck, bouwDist, vraag };

if (require.main === module) {
  (async () => {
    const a = process.argv.slice(2), strict = a.includes("--strict"), url = a.find((x) => /^https?:\/\//.test(x));
    const modus = a.includes("--alles") ? ["bereik", "headers", "config"] : a.includes("--headers") ? ["headers"] : a.includes("--config") ? ["config"] : ["bereik"];
    let slecht = 0;
    if (modus.includes("bereik")) {
      if (!url) { console.error("Geef een BASE-URL, bijv. node tests/exposed.js http://localhost:8418"); process.exit(2); }
      const r = await probeExposed(url);
      console.log(`\n=== Bereikbaarheid ${url} (${r.length} paden) ===`);
      console.log("Oordeel        Status  Grootte  Soort          Pad");
      for (const x of r) console.log(`${x.oordeel.padEnd(14)} ${String(x.status).padEnd(7)} ${String(x.grootte).padStart(7)}  ${x.soort.padEnd(13)}  ${x.pad}${x.listing ? "  [MAPLIJST]" : ""}${x.spa ? "  [index.html-terugval]" : ""}`);
      const bl = r.filter((x) => x.oordeel === "BLOOTGESTELD"), be = r.filter((x) => x.oordeel === "bereikbaar"), ml = r.filter((x) => x.listing);
      console.log(`\nSamenvatting: ${bl.length} gevoelig blootgesteld · ${be.length} niet-nodig maar bereikbaar (docs/md/extra pagina's/config) · ${ml.length} maplijsten · ${r.filter((x) => x.oordeel === "ONTBREEKT").length} app-bestanden ontbreken`);
      slecht += bl.length + ml.length;
    }
    if (modus.includes("headers")) {
      if (!url) { console.error("Geef een URL voor --headers"); process.exit(2); }
      const h = await checkHeaders(url);
      console.log(`\n=== Beveiligingsheaders ${url} ===`);
      for (const x of h) console.log(`${x.status.padEnd(13)} ${x.header.padEnd(36)} ${x.detail || ""}`);
      slecht += h.filter((x) => /ONTBREEKT|ZWAK|FOUT/.test(x.status)).length;
    }
    if (modus.includes("config")) {
      const c = configCheck();
      console.log("\n=== Publicatie (allowlist-build in een tijdelijke kopie, met lokaasbestanden) ===");
      for (const b of c.builds) console.log(`${(b.ok ? "ok" : "FOUT").padEnd(6)} ${b.host.padEnd(24)} ${b.detail}`);
      console.log(`${(c.gelijk ? "ok" : "FOUT").padEnd(6)} ${"zelfde opdracht".padEnd(24)} netlify.toml, vercel.json en _headers ${c.gelijk ? "gebruiken dezelfde build" : "verschillen"}`);
      console.log("\n=== Deploy-configuratie per pad ===");
      console.log("Pad".padEnd(42) + "Vercel".padEnd(22) + "Netlify".padEnd(22) + "Cloudflare Pages");
      for (const x of c) console.log(x.pad.padEnd(42) + x.vercel.padEnd(22) + x.netlify.padEnd(22) + x.cloudflare);
      const csp = cspCheck();
      console.log("\n=== CSP gelijk in alle vier de bronnen ===");
      for (const x of csp) console.log(`${x.oordeel.padEnd(10)} ${x.bron.padEnd(20)} ${x.detail}`);
      const hc = headerConfigCheck();
      console.log("\n=== Beveiligingsheaders in de hostconfiguraties (voor alle paden \"/*\") ===");
      for (const x of hc) console.log(`${x.status.padEnd(13)} ${x.bron.padEnd(14)} ${x.header.padEnd(36)} ${String(x.detail || "").slice(0, 70)}`);
      slecht += c.filter((x) => /BEREIKBAAR|GEEN BUILD|GEBLOKKEERD|ONTBREEKT/.test(x.vercel + x.netlify + x.cloudflare)).length + c.builds.filter((b) => !b.ok).length + (c.gelijk ? 0 : 1)
        + csp.filter((x) => x.oordeel !== "ok").length + hc.filter((x) => /ONTBREEKT|ZWAK|FOUT|AANDACHT/.test(x.status)).length;
    }
    console.log(strict && slecht ? `\nSTRICT: ${slecht} problemen` : "");
    process.exit(strict && slecht ? 1 : 0);
  })();
}
