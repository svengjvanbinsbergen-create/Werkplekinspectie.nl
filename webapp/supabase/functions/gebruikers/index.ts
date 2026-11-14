// Werkplekinspectie — Edge Function "gebruikers" (Supabase, Deno).
// Rol, functie of naam wijzigen, een nieuwe uitnodigingslink maken (alleen voor wie nog nooit inlogde), en een collega op non-actief zetten (profiel inactief + account geblokkeerd in
// Supabase Auth met ban_duration) of weer actief maken. Alleen een hoofd, de QHSE-manager of de beheerder met
// tweestapsverificatie; de database bewaakt de rest (niet jezelf, minstens één actief hoofd, geen rol "inspecteur").
// Logica en controles: ../_shared/gebruikers.ts.   Deploy: supabase functions deploy gebruikers
import { maakGebruikers } from "../_shared/gebruikers.ts";

const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  SITE_URL: Deno.env.get("SITE_URL") ?? "",
  LINK_GELDIG_SECONDEN: Deno.env.get("LINK_GELDIG_SECONDEN") ?? "",
};
Deno.serve(maakGebruikers({ env, fetch }));
