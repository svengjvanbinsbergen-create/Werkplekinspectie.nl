// Werkplekinspectie — Edge Function "mail-versturen" (Supabase, Deno). STUB tot de mailbox er is.
// Verstuurt rapporten uit public.mail_wachtrij via Microsoft Graph (sendMail met de PDF als bijlage), maar ALLEEN als
// GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET en GRAPH_AFZENDER zijn ingesteld; anders doet hij niets en logt
// "wacht op mailbox". Aanroep door pg_cron met de kop x-wpi-cron (geheim MAIL_CRON_GEHEIM).
// Logica: ../_shared/mail.ts.   Deploy: supabase functions deploy mail-versturen --no-verify-jwt
import { maakMailVersturen } from "../_shared/mail.ts";

const get = (k: string) => Deno.env.get(k) ?? "";
const env = {
  SUPABASE_URL: get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: get("SUPABASE_SERVICE_ROLE_KEY"),
  MAIL_CRON_GEHEIM: get("MAIL_CRON_GEHEIM"),
  GRAPH_TENANT_ID: get("GRAPH_TENANT_ID"),
  GRAPH_CLIENT_ID: get("GRAPH_CLIENT_ID"),
  GRAPH_CLIENT_SECRET: get("GRAPH_CLIENT_SECRET"),
  GRAPH_AFZENDER: get("GRAPH_AFZENDER"),
};
Deno.serve(maakMailVersturen({ env, fetch }));
