// Werkplekinspectie — tests/run-all.js
// Draait alle scenariotests na elkaar tegen een eigen statische server en toont een PASS/FAIL-tabel.
//
//   node /home/user/Werkplekinspectie.nl/webapp/tests/run-all.js            (alle scenario's)
//   node tests/run-all.js e2e kw              (alleen deze)
//   node tests/run-all.js --extra             (ook xss.js, ±6 min: 12 payloads × alle invoervelden en schermen; FAIL bij elk lek)
//   node tests/run-all.js -j 2                (2 tests tegelijk; standaard 1, de tests wachten op tijd)
//
// Omgeving: RUNALL_PORT (standaard 8412) voor de statische server, SYNC_PORT (standaard 8414; sync.js
// gebruikt ook +1) voor de mock-Supabase van sync.js, RUNALL_DIR = map voor screenshots/logs
// (standaard /tmp/claude-0/tests/run-all), RUNALL_TIMEOUT = seconden per test (standaard 420; xss 1500).
// a11y.js installeert axe-core zelf in /tmp/claude-0/tests als hij ontbreekt (zie a11y.js).
//
// Standaard draaien: methode.js (de methoderegels als harde asserties: oordeel alleen door de
// inspecteur, AI alleen als Voorstel na bevestiging, toetser ≠ actiehouder, QHSE-manager nooit
// actiehouder, Afgerond alleen na toetsing door de toetser), de scenariotests (e2e, meld, plan, mont,
// kw: asserties op de kernuitkomst van elk scenario, plus pageerrors; beheer, sync), de rooktests met
// schermafbeeldingen (dash, stijlB, web: alleen pageerrors tellen) en a11y.js (axe-core; FAIL bij elk
// verschil met de nulmeting tests/a11y-baseline.json, zonder marge en in beide richtingen: één extra
// element met een overtreding is een regressie, één element minder betekent dat de nulmeting
// aangescherpt moet worden; zie a11y.js).
// Oordeel per test: PASS als het proces met 0 eindigt, er minstens één eindregel is ("ERRS []",
// "errs []", "fouten []" of "[]"), ál die eindregels leeg zijn en er geen regel "FOUT ..." is.
// Een ontbrekend testbestand is FAIL (een verwijderde of hernoemde test mag de suite niet groen
// maken). Testbestanden in tests/ die in geen enkele lijst staan, worden als waarschuwing gemeld.
// Exitcode: 0 als alles PASS is, anders 1.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const WEBAPP = path.resolve(__dirname, "..");
const PORT = +(process.env.RUNALL_PORT || 8412);
const SYNC_PORT = +(process.env.SYNC_PORT || 8414);
const OUT = process.env.RUNALL_DIR || "/tmp/claude-0/tests/run-all";
const TIMEOUT = 1000 * +(process.env.RUNALL_TIMEOUT || 420);
const TIMEOUT_PER = { xss: 1000 * +(process.env.RUNALL_TIMEOUT || 1500) };   // xss.js: 10 payloads × ±90 schermen

const SCENARIO = ["methode", "e2e", "meld", "plan", "mont", "kw", "beheer", "sync", "oefen", "security"];
const ROOK = ["dash", "stijlB", "web"];      // schermafbeeldingen; eindigen met console.log(pageerrors)
const POORT = ["a11y"];                      // regressiepoort t.o.v. de nulmeting
const EXTRA = ["xss"];
const HULP = new Set(["run-all", "exposed"]);   // geen browsertest (exposed.js: tegen een URL, zie rapport)

// ---------- argumenten ----------
const args = process.argv.slice(2);
let jobs = 1; const namen = []; let extra = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "-j") jobs = Math.max(1, +args[++i] || 1);
  else if (args[i] === "--extra") extra = true;
  else if (args[i] === "-h" || args[i] === "--help") { console.log(fs.readFileSync(__filename, "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(0); }
  else namen.push(args[i].replace(/\.js$/, ""));
}
const lijst = namen.length ? namen : SCENARIO.concat(ROOK, POORT, extra ? EXTRA : []);
const bekend = new Set(SCENARIO.concat(ROOK, POORT, EXTRA, [...HULP]));
const onbekend = fs.readdirSync(__dirname).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)).filter((n) => !bekend.has(n));

// ---------- kleine statische server (zelfde gedrag als python3 -m http.server voor de app) ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json", ".pdf": "application/pdf", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
function server() {
  const s = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch (e) { res.writeHead(400); return res.end(); }
    let f = path.normalize(path.join(WEBAPP, p));
    if (!f.startsWith(WEBAPP)) { res.writeHead(403); return res.end(); }
    fs.stat(f, (err, st) => {
      if (!err && st.isDirectory()) { f = path.join(f, "index.html"); try { st = fs.statSync(f); } catch (e) { err = e; } }
      if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("404"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-cache" });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(f).pipe(res);
    });
  });
  return new Promise((res, rej) => { s.once("error", rej); s.listen(PORT, "127.0.0.1", () => res(s)); });
}

// ---------- één test draaien ----------
function oordeel(naam, code, out, timedOut, limiet) {
  const regels = out.split(/\r?\n/).map((l) => l.trimEnd());
  // eindregel: "errs [...]" e.d., of een kale array van console.log(errs): "[]", "[" of "[ 'fout' ]"
  // (niet elke regel die met "[" begint: a11y.js print bijv. "[critical] select-name …")
  const eind = regels.filter((l) => /^(ERRS|errs|fouten)\s*\[/.test(l) || /^\[(\]|\s*$|\s*['"`])/.test(l));
  const fout = regels.filter((l) => /^FOUT\b/.test(l));
  const slecht = eind.filter((l) => !/^((ERRS|errs|fouten)\s+)?\[\]$/.test(l));
  if (timedOut) return ["FAIL", "time-out na " + limiet / 1000 + " s"];
  if (code !== 0) {
    // bij een meerregelige "errs [" de eerste fout erachter tonen
    const i = regels.findIndex((l) => /^(ERRS|errs|fouten)\s+\[$|^\[$/.test(l)), n = regels.filter((l, k) => k > i && /^\s+['"]/.test(l)).length;
    const eerste = i >= 0 && regels[i + 1] ? regels[i + 1].trim().replace(/,$/, "") : "";
    return ["FAIL", "exitcode " + code + (fout.length ? " · " + fout.length + "× FOUT · " + fout[0].slice(5, 80) : eerste ? " · " + n + " fouten, o.a. " + eerste.slice(0, 90) : lastErr(regels) ? " · " + lastErr(regels) : "")];
  }
  if (!eind.length) return ["FAIL", "geen eindregel (ERRS/errs/[]) gevonden"];
  if (fout.length) return ["FAIL", fout.length + "× FOUT · " + fout[0].slice(5, 110)];
  if (slecht.length) {   // bij een meerregelige "ERRS [" ook de eerste fout erachter tonen
    const i = regels.indexOf(slecht[0]), volg = /\[$/.test(slecht[0]) && regels[i + 1] ? " " + regels[i + 1].trim().replace(/,$/, "") : "";
    return ["FAIL", (slecht[0] + volg).slice(0, 140)];
  }
  return ["PASS", ""];
}
function lastErr(regels) { const r = regels.filter((l) => /Error|PAGEERR|EXC/.test(l)); return r.length ? r[r.length - 1].trim().slice(0, 100) : ""; }

function draai(naam) {
  const bestand = path.join(__dirname, naam + ".js");
  if (!fs.existsSync(bestand)) return Promise.resolve({ naam, status: "FAIL", tijd: 0, noot: "testbestand ontbreekt: " + bestand });
  const dir = path.join(OUT, naam); fs.mkdirSync(dir, { recursive: true });
  const env = Object.assign({}, process.env, { BASE: "http://127.0.0.1:" + PORT, SYNC_PORT: String(SYNC_PORT), TESTS_OUT: dir });
  const t0 = Date.now();
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [bestand], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
    const limiet = TIMEOUT_PER[naam] || TIMEOUT;
    let timedOut = false; const tm = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, limiet);
    p.on("close", (code) => {
      clearTimeout(tm);
      fs.writeFileSync(path.join(dir, "uitvoer.log"), out);
      const [status, noot] = oordeel(naam, code, out, timedOut, limiet);
      resolve({ naam, status, tijd: (Date.now() - t0) / 1000, noot, log: path.join(dir, "uitvoer.log") });
    });
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let srv;
  try { srv = await server(); } catch (e) { console.error("Kan de server niet starten op poort " + PORT + ": " + e.message + " (zet RUNALL_PORT)"); process.exit(2); }
  console.log(`Server: http://127.0.0.1:${PORT} (${WEBAPP}) · logs: ${OUT} · tests: ${lijst.join(", ")} · -j ${jobs}`);
  // sync.js start zelf de mock op SYNC_PORT en SYNC_PORT+1; die mag niet tegelijk met een andere sync-run
  const wachtrij = lijst.slice(), res = [];
  async function werker() {
    while (wachtrij.length) {
      const n = wachtrij.shift();
      process.stdout.write(`  … ${n}\n`);
      const r = await draai(n); res.push(r);
      process.stdout.write(`  ${r.status.padEnd(4)} ${n} (${r.tijd.toFixed(1)} s)${r.noot ? " · " + r.noot : ""}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, lijst.length) }, werker));
  srv.close();
  res.sort((a, b) => lijst.indexOf(a.naam) - lijst.indexOf(b.naam));
  const w = [Math.max(8, ...res.map((r) => r.naam.length)), 6, 8];
  const lijn = "+" + "-".repeat(w[0] + 2) + "+" + "-".repeat(w[1] + 2) + "+" + "-".repeat(w[2] + 2) + "+" + "-".repeat(62);
  console.log("\n" + lijn);
  console.log(`| ${"Test".padEnd(w[0])} | ${"Status".padEnd(w[1])} | ${"Tijd".padEnd(w[2])} | Opmerking`);
  console.log(lijn);
  for (const r of res) console.log(`| ${r.naam.padEnd(w[0])} | ${r.status.padEnd(w[1])} | ${(r.tijd.toFixed(1) + " s").padEnd(w[2])} | ${r.noot || ""}`);
  console.log(lijn);
  const nFail = res.filter((r) => r.status === "FAIL").length;
  console.log(`${res.filter((r) => r.status === "PASS").length} PASS · ${nFail} FAIL`);
  if (onbekend.length) console.log("Waarschuwing: testbestanden die run-all niet kent en dus niet draait: " + onbekend.map((n) => n + ".js").join(", ") + " (zet ze in SCENARIO/ROOK/POORT/EXTRA)");
  if (nFail) console.log("Logs van mislukte tests:\n" + res.filter((r) => r.status === "FAIL").map((r) => "  " + (r.log || r.naam + ": " + r.noot)).join("\n"));
  process.exit(nFail ? 1 : 0);
})();
