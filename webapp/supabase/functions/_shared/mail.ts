// Werkplekinspectie — supabase/functions/_shared/mail.ts
// Logica van de Edge Function "mail-versturen": rapporten uit public.mail_wachtrij versturen via Microsoft Graph.
//
// ALLEEN als de vier Graph-variabelen zijn ingesteld (GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET,
// GRAPH_AFZENDER) wordt er iets verstuurd. Zonder die inrichting doet de functie niets en logt alleen
// "wacht op mailbox": de rijen blijven op "wacht" staan en gaan mee zodra de mailbox er is.
// Aanroepen: door pg_cron (zie migratie 0009, sectie 9) met de kop "x-wpi-cron: <MAIL_CRON_GEHEIM>"; de functie wordt
// gedeployed met --no-verify-jwt en weigert elk verzoek zonder dat geheim.
// Het rapport moet een PDF zijn (eerste bytes "%PDF-", hier gecontroleerd: de bucket kijkt alleen naar de Content-Type-
// kop) en hooguit 20 MB (= de bucket). Tot 3 MB gaat het in één sendMail; groter via een Graph-uploadsessie.
// Geen PDF of te groot: de rij gaat op "fout" en wordt niet opnieuw geprobeerd.
// Web-standaarden alleen (draait in Deno en in Node voor tests/functies.js).

export type MailEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MAIL_CRON_GEHEIM?: string;
  GRAPH_TENANT_ID?: string;
  GRAPH_CLIENT_ID?: string;
  GRAPH_CLIENT_SECRET?: string;
  GRAPH_AFZENDER?: string;
};
export type MailDeps = { env: MailEnv; fetch: typeof fetch; log?: (regel: string) => void };
type Json = Record<string, unknown>;

export const MAX_POGINGEN = 10;
export const PER_RONDE = 20;
export const MAX_RAPPORT = 20 * 1024 * 1024;   // = bucket "rapporten" (file_size_limit, migratie 0009) en js/sync.js RAPPORT_MAX
export const MAX_IN_EEN_KEER = 3 * 1024 * 1024; // Graph sendMail: bijlage tot 3 MB in één verzoek; groter → uploadsessie
export const BLOK = 9 * 320 * 1024;            // uploadsessie: stukken van 2,8 MB (Graph: < 4 MB per verzoek, veelvoud van 320 KiB)

// Het rapport is een PDF: de eerste bytes zijn "%PDF-". De bucket controleert alleen de Content-Type-kop die de app
// meestuurt; wat de server mailt, moet zelf kloppen (anders mailt de bedrijfsmailbox willekeurige inhoud als "PDF").
export function isPdf(b: Uint8Array): boolean {
  return b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;
}

export const graphIngericht = (e: MailEnv): boolean =>
  !!(e.GRAPH_TENANT_ID && e.GRAPH_CLIENT_ID && e.GRAPH_CLIENT_SECRET && e.GRAPH_AFZENDER);

// tijdsonafhankelijke vergelijking (het cron-geheim)
export function gelijk(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let v = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) v |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return v === 0 && a.length > 0;
}
export function base64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const datumNl = (t: unknown): string => {
  const d = new Date(String(t || ""));
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });
};
// rapportnummer uit het record (WPI-JJJJMMDD-CODE-XX-UUMM): te noemen en terug te vinden (ook met Zoeken in de app)
const NUMMER = /^WPI-\d{8}-[A-Z0-9]{1,12}-[A-Z]{1,3}-\d{4}$/;
export const rapportNummer = (ins: Json): string => (typeof ins.nummer === "string" && NUMMER.test(ins.nummer) ? ins.nummer : "");
// direct gevaar: dezelfde regel als het rapport (js/inspecties.js gevaarVan): door de inspecteur gemeld of gekozen
const gevaarAantal = (ins: Json): number => (Array.isArray(ins.waarnemingen) ? ins.waarnemingen as unknown[] : []).filter((x) => {
  if (!x || typeof x !== "object") return false;
  const w = x as Json, a = (w.actie && typeof w.actie === "object" ? w.actie : {}) as Json;
  return w.direct === true || (w.oordeel === "A" && typeof a.gevaar === "string" && a.gevaar !== "");
}).length;
// het onderwerp: wat de ontvanger in de inbox meteen moet zien (niet ondertekend, direct gevaar) en het rapportnummer;
// geen namen van personen (die staan in het rapport zelf)
export function onderwerp(ins: Json): string {
  const titel = String(ins.titel || "Inspectie").slice(0, 120), datum = datumNl(ins.opgeslagen), nr = rapportNummer(ins);
  const vlag = [ins.handtekening === undefined || ins.handtekening ? "" : "NIET ONDERTEKEND", gevaarAantal(ins) ? "DIRECT GEVAAR" : ""].filter(Boolean);
  return (vlag.length ? "[" + vlag.join(" · ") + "] " : "") + "Rapport werkplekinspectie" + (nr ? " " + nr : "") + ": " + titel + (datum ? " (" + datum + ")" : "");
}
// het bericht (Graph-formaat)
// pdf null: zonder bijlage (concept voor de uploadsessie; de bijlage komt er daarna in stukken bij)
export function bericht(aan: string, ins: Json, pdf: Uint8Array | null, bestandsnaam: string): Json {
  const datum = datumNl(ins.opgeslagen), nr = rapportNummer(ins);
  const message: Json = {
    subject: onderwerp(ins),
    body: { contentType: "Text", content: "Hierbij het rapport van de werkplekinspectie" + (datum ? " van " + datum : "") + (nr ? " (rapportnummer " + nr + ")" : "") + " als bijlage (PDF)."
      + (ins.handtekening === undefined || ins.handtekening ? "" : "\n\nLet op: de inspecteur heeft dit rapport afgerond zonder handtekening.")
      + (gevaarAantal(ins) ? "\n\nLet op: bij deze inspectie is direct gevaar vastgelegd; zie de acties in het rapport." : "")
      + "\n\nDit bericht is automatisch verstuurd door de app Werkplekinspectie. Het rapport is een momentopname en staat ook in de app" + (nr ? " (Zoeken op " + nr + ")" : "") + "." },
    toRecipients: [{ emailAddress: { address: aan } }],
  };
  if (pdf) message.attachments = [{ "@odata.type": "#microsoft.graph.fileAttachment", name: bestandsnaam, contentType: "application/pdf", contentBytes: base64(pdf) }];
  return { message, saveToSentItems: true };
}

class HttpFout extends Error {
  status: number;
  constructor(status: number, tekst: string) { super(tekst); this.status = status; }
}
// fout die bij een volgende poging niet anders uitvalt (geen PDF, te groot): niet opnieuw proberen
class BlijvendeFout extends Error {}
async function verzoek(d: MailDeps, url: string, init: RequestInit): Promise<Response> {
  const r = await d.fetch(url, init);
  if (!r.ok) throw new HttpFout(r.status, (await r.text().catch(() => "")).slice(0, 300));
  return r;
}
const sbUrl = (d: MailDeps, pad: string) => d.env.SUPABASE_URL.replace(/\/+$/, "") + pad;
const svc = (d: MailDeps, extra: Record<string, string> = {}) => Object.assign({ apikey: d.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + d.env.SUPABASE_SERVICE_ROLE_KEY }, extra);

// rollen die rapporten mogen ontvangen (= public.mag_rapport_ontvangen, migratie 0009; niet de oude rol "inspecteur")
export const ONTVANGER_ROLLEN = ["hoofd", "coordinator", "qhse", "beheerder"];
// is dit profiel nu een actieve collega met een rol van nu? (service_role; geen RLS)
async function actiefProfiel(d: MailDeps, id: string): Promise<boolean> {
  const r = (await (await verzoek(d, sbUrl(d, "/rest/v1/profiles?select=actief,role&id=eq." + encodeURIComponent(id)), { headers: svc(d) })).json()) as Json[];
  const p = Array.isArray(r) ? r[0] : null;
  return !!(p && p.actief === true && ONTVANGER_ROLLEN.includes(String(p.role)));
}

export type Ronde = { status: string; verstuurd: number; fout: number; overgeslagen: number };

// het rapport uit de bucket, met de grootte gecontroleerd VOORDAT het helemaal binnen is (Content-Length, en tijdens
// het lezen), en de eerste bytes gecontroleerd (een PDF)
async function haalRapport(d: MailDeps, bestand: string): Promise<Uint8Array> {
  const r = await verzoek(d, sbUrl(d, "/storage/v1/object/rapporten/" + bestand.split("/").map(encodeURIComponent).join("/")), { headers: svc(d) });
  const kop = Number(r.headers.get("content-length"));
  if (Number.isFinite(kop) && kop > MAX_RAPPORT) { await r.body?.cancel().catch(() => {}); throw new BlijvendeFout("rapport groter dan 20 MB"); }
  const delen: Uint8Array[] = [];
  let n = 0;
  if (r.body) {
    const lezer = r.body.getReader();
    for (;;) {
      const { done, value } = await lezer.read();
      if (done) break;
      n += value.length;
      if (n > MAX_RAPPORT) { await lezer.cancel().catch(() => {}); throw new BlijvendeFout("rapport groter dan 20 MB"); }
      delen.push(value);
    }
  }
  const pdf = new Uint8Array(n);
  let i = 0;
  for (const x of delen) { pdf.set(x, i); i += x.length; }
  if (!isPdf(pdf)) throw new BlijvendeFout("het bestand is geen PDF (begint niet met %PDF-); niet verstuurd");
  return pdf;
}

// versturen via Graph: tot 3 MB in één sendMail; groter via een concept met een uploadsessie voor de bijlage
// (POST messages → attachments/createUploadSession → PUT in stukken → send). Mislukt het onderweg, dan wordt het
// concept weer verwijderd (geen halve mails in de map Concepten).
async function verstuurViaGraph(d: MailDeps, token: string, aan: string, ins: Json, pdf: Uint8Array, naam: string): Promise<void> {
  const g = "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(d.env.GRAPH_AFZENDER!);
  const h = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  if (pdf.length <= MAX_IN_EEN_KEER) {
    await verzoek(d, g + "/sendMail", { method: "POST", headers: h, body: JSON.stringify(bericht(aan, ins, pdf, naam)) });
    return;
  }
  const concept = (await (await verzoek(d, g + "/messages", { method: "POST", headers: h, body: JSON.stringify(bericht(aan, ins, null, naam).message) })).json()) as Json;
  const mid = String(concept.id || "");
  if (!mid) throw new Error("Graph gaf geen concept-id");
  const m = g + "/messages/" + encodeURIComponent(mid);
  try {
    const sessie = (await (await verzoek(d, m + "/attachments/createUploadSession", { method: "POST", headers: h,
      body: JSON.stringify({ AttachmentItem: { attachmentType: "file", name: naam, size: pdf.length, contentType: "application/pdf" } }) })).json()) as Json;
    const url = String(sessie.uploadUrl || "");
    if (!/^https:\/\//.test(url)) throw new Error("Graph gaf geen upload-adres");
    for (let a = 0; a < pdf.length; a += BLOK) {
      const stuk = pdf.slice(a, Math.min(a + BLOK, pdf.length));
      // het upload-adres bevat zelf de toegang: GEEN Authorization-kop meesturen (Graph-documentatie)
      await verzoek(d, url, { method: "PUT", headers: { "Content-Type": "application/octet-stream", "Content-Range": "bytes " + a + "-" + (a + stuk.length - 1) + "/" + pdf.length }, body: stuk });
    }
    await verzoek(d, m + "/send", { method: "POST", headers: { Authorization: "Bearer " + token } });
  } catch (x) {
    try { await d.fetch(m, { method: "DELETE", headers: { Authorization: "Bearer " + token } }); } catch (_y) { /* blijft als concept staan */ }
    throw x;
  }
}

// één ronde: hooguit PER_RONDE rijen met status wacht of fout (en minder dan MAX_POGINGEN pogingen)
export async function verstuurRonde(d: MailDeps): Promise<Ronde> {
  const log = (r: string) => { try { (d.log || console.log)(r); } catch (_e) { /* niets */ } };
  if (!graphIngericht(d.env)) { log("mail-versturen: wacht op mailbox (Graph niet ingericht)"); return { status: "wacht op mailbox", verstuurd: 0, fout: 0, overgeslagen: 0 }; }
  const e = d.env, uit: Ronde = { status: "klaar", verstuurd: 0, fout: 0, overgeslagen: 0 };
  const tok = (await (await verzoek(d, "https://login.microsoftonline.com/" + encodeURIComponent(e.GRAPH_TENANT_ID!) + "/oauth2/v2.0/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: e.GRAPH_CLIENT_ID!, client_secret: e.GRAPH_CLIENT_SECRET!, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }).toString(),
  })).json()) as Json;
  const graphToken = String(tok.access_token || "");
  if (!graphToken) throw new Error("Geen Graph-token");
  const rijen = (await (await verzoek(d, sbUrl(d, "/rest/v1/mail_wachtrij?select=id,inspectie_id,ontvanger,bestand,pogingen&status=in.(wacht,fout)&pogingen=lt." + MAX_POGINGEN
    + "&order=aangemaakt.asc&limit=" + PER_RONDE), { headers: svc(d) })).json()) as Json[];
  for (const rij of Array.isArray(rijen) ? rijen : []) {
    const id = String(rij.id), pogingen = Number(rij.pogingen) || 0;
    const markeer = (status: string, laatste_fout: string | null, extra: Json = {}) => verzoek(d, sbUrl(d, "/rest/v1/mail_wachtrij?id=eq." + encodeURIComponent(id)), {
      method: "PATCH", headers: svc(d, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(Object.assign({ status, pogingen: pogingen + 1, laatste_fout }, extra)) });
    try {
      // ontvanger: uit de rij, maar alleen als die collega NU nog actief is (de database laat wachtende rijen de huidige
      // ontvanger volgen, migratie 0009 §10b; dit is de tweede controle vlak voor het versturen). Anders, of als de rij
      // nog leeg is: de huidige ontvanger volgens de database (rapport_ontvanger_id). Niemand: rij blijft wachten.
      let ontvanger = String(rij.ontvanger || "");
      if (ontvanger && !(await actiefProfiel(d, ontvanger))) { log("mail-versturen: rij " + id + ": ontvanger niet meer actief, opnieuw bepaald"); ontvanger = ""; }
      if (!ontvanger) {
        const r = await (await verzoek(d, sbUrl(d, "/rest/v1/rpc/rapport_ontvanger_id"), { method: "POST", headers: svc(d, { "Content-Type": "application/json" }), body: "{}" })).json();
        ontvanger = typeof r === "string" ? r : "";
        if (!ontvanger) { uit.overgeslagen++; log("mail-versturen: rij " + id + " heeft (nog) geen ontvanger"); continue; }
      }
      const gebruiker = (await (await verzoek(d, sbUrl(d, "/auth/v1/admin/users/" + encodeURIComponent(ontvanger)), { headers: svc(d) })).json()) as Json;
      const ban = Date.parse(String(gebruiker.banned_until || ""));
      if (Number.isFinite(ban) && ban > Date.now()) { uit.overgeslagen++; log("mail-versturen: rij " + id + ": ontvanger is geblokkeerd, niet verstuurd"); continue; }
      const aan = String(gebruiker.email || "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(aan)) throw new Error("ontvanger zonder geldig e-mailadres");
      // alleen wat het onderwerp nodig heeft (JSON-paden van PostgREST): nummer, handtekening (pad of leeg), waarnemingen
      const ins = ((await (await verzoek(d, sbUrl(d, "/rest/v1/inspecties?select=titel,opgeslagen,nummer:record->>nummer,handtekening:record->>handtekening,waarnemingen:record->waarnemingen&id=eq." + encodeURIComponent(String(rij.inspectie_id))), { headers: svc(d) })).json()) as Json[])[0] || {};
      const pdf = await haalRapport(d, String(rij.bestand));
      await verstuurViaGraph(d, graphToken, aan, ins, pdf, (rapportNummer(ins) || String(rij.inspectie_id)) + ".pdf");
      await markeer("verstuurd", null, ontvanger !== String(rij.ontvanger || "") ? { ontvanger } : {});
      uit.verstuurd++;
    } catch (x) {
      uit.fout++;
      const tekst = (x instanceof HttpFout ? "HTTP " + x.status + ": " : "") + String((x as Error).message || x).replace(/\s+/g, " ").slice(0, 300);
      const blijvend = x instanceof BlijvendeFout;
      log("mail-versturen: rij " + id + " mislukt (" + (x instanceof HttpFout ? x.status : blijvend ? "blijvend" : "fout") + ")");
      // blijvend (geen PDF, te groot): meteen op het maximum aantal pogingen, dus niet elke ronde opnieuw ophalen
      try { await markeer("fout", tekst, blijvend ? { pogingen: Math.max(MAX_POGINGEN, pogingen + 1) } : {}); } catch (_y) { /* volgende ronde opnieuw */ }
    }
  }
  return uit;
}

export function maakMailVersturen(d: MailDeps): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const json = (status: number, body: Json) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (req.method !== "POST") return json(405, { message: "Alleen POST." });
    const geheim = d.env.MAIL_CRON_GEHEIM || "";
    if (!geheim || !gelijk(req.headers.get("x-wpi-cron") || "", geheim)) return json(401, { message: "Niet toegestaan." });
    try { return json(200, await verstuurRonde(d)); }
    catch (x) { return json(502, { message: "Versturen lukte niet: " + String((x as Error).message || x).slice(0, 200) }); }
  };
}
