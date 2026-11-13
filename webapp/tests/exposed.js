// Werkplekinspectie — tests/exposed.js: wat is publiek bereikbaar, en kloppen de beveiligingsheaders?
//
//   node tests/exposed.js http://localhost:8418                 bereikbaarheid (lokaal of gedeployd)
//   node tests/exposed.js --headers https://werkplekinspectie.nl  headers van een gedeployde site
//   node tests/exposed.js --config                               statische controle van netlify.toml / vercel.json
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
const NODIG = (rel) => /^(index\.html|styles\.css|sw\.js|manifest\.json|icon-\d+\.png|css\/.+\.css|js\/.+\.js|data\/.+\.json)$/.test(rel);
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
async function checkHeaders(url) {
  const u = url.replace(/\/+$/, ""), uit = [];
  const r = await vraag(u + "/", "GET");
  if (!r.status) return [{ header: "(verbinding)", status: "FOUT", detail: r.fout }];
  const h = r.headers || {}, get = (k) => h[k.toLowerCase()];
  const add = (header, status, detail) => uit.push({ header, status, detail });
  const hsts = get("strict-transport-security");
  if (!hsts) add("Strict-Transport-Security", u.startsWith("https:") ? "ONTBREEKT" : "n.v.t. (http)", "");
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

// ---------- statische controle van de deploy-configuratie ----------
function configCheck() {
  const paden = ["/docs/x.md", "/docs/", "/tests/e2e.js", "/supabase/seed.sql", "/supabase/migrations/0001_tabellen.sql", "/README.md",
    "/docs/sub/diep/x.md", "/js/README.md", "/beveiliging.html", "/gauntlet.html", "/onderzoek.html", "/verbeter.html", "/design-vandaag.html",
    "/netlify.toml", "/vercel.json", "/_headers", "/.git/HEAD"];
  const uit = [];
  // Vercel: eerste route met status die matcht (routes met "continue" zetten alleen headers)
  let vercel = null; try { vercel = JSON.parse(fs.readFileSync(path.join(WEBAPP, "vercel.json"), "utf8")); } catch (e) {}
  // Netlify: redirects met status 404 en de build-opdracht (rm -rf ... / find -name '*.md' -delete)
  let toml = ""; try { toml = fs.readFileSync(path.join(WEBAPP, "netlify.toml"), "utf8"); } catch (e) {}
  const cmd = (toml.match(/^\s*command\s*=\s*"(.*)"\s*$/m) || [])[1] || "";
  const weg = (cmd.match(/rm -rf ([^&;]+)/) || [, ""])[1].trim().split(/\s+/).filter(Boolean);
  const mdWeg = /-name\s+'\*\.md'.*-delete/.test(cmd);
  const reds = [...toml.matchAll(/\[\[redirects\]\]([\s\S]*?)(?=\[\[|$)/g)].map((m) => ({ from: (m[1].match(/from\s*=\s*"([^"]+)"/) || [])[1], status: +((m[1].match(/status\s*=\s*(\d+)/) || [])[1] || 0) })).filter((r) => r.from && r.status === 404);
  const netGlob = (pat, p) => new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\/:\w+/g, "/[^/]+").replace(/\*/g, ".*") + "$").test(p);
  for (const p of paden) {
    let v = "geen vercel.json";
    if (vercel) { const r = (vercel.routes || []).find((x) => x.src && !x.continue && x.status && new RegExp("^" + x.src + "$").test(p)); v = r ? "geblokkeerd (" + r.status + ")" : "BEREIKBAAR"; }
    const rel = p.slice(1), top = rel.split("/")[0];
    let n = "geen netlify.toml";
    if (toml) n = weg.includes(top) && rel.includes("/") ? "verwijderd in build" : mdWeg && /\.md$/i.test(rel) ? "verwijderd in build" : reds.some((r) => netGlob(r.from, p)) ? "geblokkeerd (404)" : "BEREIKBAAR";
    if (p === "/.git/HEAD") { v = v === "BEREIKBAAR" ? "niet in publicatiemap" : v; n = "niet in publicatiemap"; }
    uit.push({ pad: p, vercel: v, netlify: n });
  }
  return uit;
}

module.exports = { probeExposed, checkHeaders, configCheck, vraag };

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
      console.log("\n=== Deploy-configuratie (statisch: vercel.json en netlify.toml) ===");
      console.log("Pad".padEnd(42) + "Vercel".padEnd(26) + "Netlify");
      for (const x of c) console.log(x.pad.padEnd(42) + x.vercel.padEnd(26) + x.netlify);
      slecht += c.filter((x) => /BEREIKBAAR/.test(x.vercel + x.netlify) && !/\.html$|\.toml$|\.json$|_headers$/.test(x.pad)).length;
    }
    console.log(strict && slecht ? `\nSTRICT: ${slecht} problemen` : "");
    process.exit(strict && slecht ? 1 : 0);
  })();
}
