/* Werkplekinspectie — js/config.js
   Koppeling met de backend (Supabase, EU-regio). Wordt direct na kern.js geladen.

   LEEG LATEN = voorbeeldmodus: alles blijft alleen op dit toestel (IndexedDB), met de
   voorbeeld-login (accountkiezer, fictieve data). Precies het gedrag van het prototype.

   INGEVULD = echte modus: inloggen met e-mail + wachtwoord (js/auth.js), MFA voor het hoofd,
   en een wachtrij die inspecties, acties en planning naar Supabase stuurt (js/sync.js).

   - supabaseUrl:     https://<project-ref>.supabase.co
   - supabaseAnonKey: de "anon"/"publishable" key van het project.
     Deze sleutel is PUBLIEK BEDOELD: hij staat in elke browser die de app opent en geeft op
     zichzelf geen toegang. Alle bescherming zit in Row Level Security (RLS) op de tabellen en
     de Storage-bucket (zie supabase/migrations/0003_rls_rechten.sql en 0005_storage.sql) plus
     de JWT van de ingelogde gebruiker.

   CSP: zet hetzelfde project-adres in connect-src van de Content-Security-Policy — vervang
   "https://project-ref.supabase.co" in index.html (meta), _headers, netlify.toml en vercel.json.
   Bewust geen wildcard (*.supabase.co): dan kan een geïnjecteerd script data naar elk project sturen.

   NOOIT hier (of ergens anders in webapp/) zetten: de geheime server-sleutel (service-role / secret key), de JWT-secret,
   database-wachtwoorden, SMTP- of andere API-sleutels. Wat in deze map staat is openbaar.
   Controle vóór elke deploy: `grep -rniE "service.role|sb_secret_" webapp/js` mag alleen deze toelichting vinden. */
window.WPI_CONFIG = Object.freeze({
  supabaseUrl: "",
  supabaseAnonKey: "",
});
