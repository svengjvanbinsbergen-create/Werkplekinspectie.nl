// Werkplekinspectie — Edge Function "uitnodigen" (Supabase, Deno).
// Een hoofd, de QHSE-manager of de beheerder (met tweestapsverificatie) nodigt een collega uit: de functie maakt met
// de Auth-admin-API een uitnodigingslink (generateLink, type invite, terug naar SITE_URL), zet naam, rol en functie
// in het profiel (met de JWT van de aanroeper, dus met alle databaseregels) en geeft de link terug. De app toont hem
// met "Kopieer link" en "Mail de link". Logica en controles: ../_shared/gebruikers.ts.
// Deploy: supabase functions deploy uitnodigen   (geheimen: zie supabase/README.md §10)
import { maakUitnodigen } from "../_shared/gebruikers.ts";

const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  SITE_URL: Deno.env.get("SITE_URL") ?? "",
  LINK_GELDIG_SECONDEN: Deno.env.get("LINK_GELDIG_SECONDEN") ?? "",
};
Deno.serve(maakUitnodigen({ env, fetch }));
