// Werkplekinspectie — tools/functies_host.mjs (alleen voor lokaal testen)
// Draait de ECHTE Edge Functions "uitnodigen" en "gebruikers" (webapp/supabase/functions/_shared/gebruikers.ts) in Node
// 22+ (de types worden weggehaald), met tools/mock_supabase.py als Supabase. mock_supabase.py start dit script zelf bij
// het eerste verzoek naar /functions/v1/... en geeft het verzoek door.
//   node tools/functies_host.mjs <supabase-basis-url> <site-url>     → print "poort <n>" en luistert op 127.0.0.1
import http from "node:http";

const [basis, site] = process.argv.slice(2);
const G = await import(new URL("../webapp/supabase/functions/_shared/gebruikers.ts", import.meta.url).href);
// de sleutels van de mock (zie tools/mock_supabase.py: ANON en SERVICE); nooit echte sleutels
const env = { SUPABASE_URL: basis, SUPABASE_ANON_KEY: "mock-anon-key", SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key", SITE_URL: site };
const functies = { uitnodigen: G.maakUitnodigen({ env, fetch, log: () => {} }), gebruikers: G.maakGebruikers({ env, fetch, log: () => {} }) };

const srv = http.createServer(async (req, res) => {
  const delen = [];
  for await (const d of req) delen.push(d);
  const f = functies[(req.url || "").replace(/^\/+/, "").split("?")[0]];
  if (!f) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end('{"message":"Function not found"}'); }
  const koppen = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") koppen.set(k, v);
  const body = Buffer.concat(delen);
  const r = await f(new Request("http://functies.lokaal" + req.url, { method: req.method, headers: koppen, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }));
  const uit = Buffer.from(await r.arrayBuffer());
  res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
  res.end(uit);
});
srv.listen(0, "127.0.0.1", () => console.log("poort " + srv.address().port));
// stopt zodra de mock stopt (stdin is een pijp vanuit mock_supabase.py)
process.stdin.on("end", () => process.exit(0));
process.stdin.on("error", () => process.exit(0));
process.stdin.resume();
