#!/usr/bin/env python3
"""Werkplekinspectie — lokale nep-Supabase voor tests (alleen Python-standaardbibliotheek).

Serveert op één poort (zelfde origin, dus de CSP connect-src 'self' volstaat):
  - de statische app uit webapp/ (met een ingevulde js/config.js die naar deze server wijst)
  - /auth/v1     token (password, refresh_token, pkce), user (GET/PUT), logout, recover (met PKCE), factors (TOTP)
  - /__mock/herstellink?email=…[&soort=recovery|invite]  de link uit de herstel-/uitnodigingsmail
  - /rest/v1     profiles, inspecties, acties, planning, actie_log, monteurs, instellingen
                 (+ rpc/report_security_event, rpc/monteur_aanmelden)
  - /storage/v1  object/fotos/<pad> (upload) en object/authenticated/fotos/<pad> (download);
                 object/rapporten/<uid>/<inspectie>.pdf (0009: één keer uploaden, eigen inspectie) en de download
  - /functions/v1 uitnodigen en gebruikers: de ECHTE Edge Functions (supabase/functions/_shared/gebruikers.ts), via
                 tools/functies_host.mjs (Node 22+), met deze mock als Supabase (service_role-sleutel: SERVICE hieronder)
  - /auth/v1/admin/generate_link, /auth/v1/admin/users/<id> (GET/PUT ban_duration/DELETE; alleen met SERVICE) en
    /auth/v1/verify (de uitnodigingslink: maakt een sessie en stuurt door naar redirect_to#access_token=…&type=invite)
  - /rest/v1 0009: rpc/mag_gebruikers_beheren, rpc/gebruikers_overzicht, rpc/gebruiker_bestaat, rpc/beheer_gebeurtenis,
    rpc/rapport_in_wachtrij, rpc/rapport_ontvanger(_id), mail_wachtrij (lezen), instelling rapport_ontvanger
  - /__mock/...  testhulp: verberg?tabel=…&id=…&uid=… (die gebruiker krijgt die rij niet, zoals RLS; sinds 0008 ziet
                 iedereen in het team alles, dus zo bootsen de tests "de server geeft jou dit niet" na),
                 state (alles bekijken), fail (volgende verzoeken laten mislukken; optioneel alleen
                 voor één pad/methode: fail?n=1&status=503&pad=/rest/v1/inspecties&methode=POST), reset,
                 maxrows (PostgREST max-rows nabootsen; filters eq/is/gt/gte/lt/lte/in, order, limit, select)

Dit is GEEN beveiligde server en bootst maar een klein deel van Supabase na (een paar RLS- en
triggerregels uit supabase/migrations, zodat de client-validatie echt getest wordt). Waar het voor de
client uitmaakt volgt de mock de ECHTE regels, ook als die ruimer zijn (bijv. planning: iedereen mag
inplannen, ook voor een ander — 0003_rls_rechten.sql), zodat tests geen strengere server veronderstellen.
Alleen voor lokaal testen: python3 tools/mock_supabase.py --port 8331 [--dir webapp] [--demo]

Testaccounts (wachtwoord voor allemaal: Veilig-Wachtwoord-2026; namen fictief, zoals de voorbeeldmodus van de app):
  carla@noardling.test   (coordinator)  winfred@noardling.test (coordinator)
  douwe@noardling.test   (coordinator)  bjorn@noardling.test   (hoofd, MFA verplicht in de app)
  qhse@noardling.test    (qhse, MFA)    beheer@noardling.test  (beheerder, MFA)
  norol@noardling.test   (actief, nog GEEN rol: migratie 0008)
  inactief@noardling.test (coordinator, actief=false)
De rol "inspecteur" bestaat alleen nog in de database (compatibiliteit); de mock kent geen gebruiker met die rol.
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import struct
import threading
import time
import unicodedata
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

ANON = "mock-anon-key"
SERVICE = "mock-service-role-key"   # alleen voor de functies-host (tools/functies_host.mjs); nooit naar de app
SECRET = b"mock-jwt-secret-alleen-voor-tests"
WACHTWOORD = "Veilig-Wachtwoord-2026"
LOCK = threading.RLock()


def nu_iso():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def b64u_dec(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def maak_jwt(payload):
    h = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    p = b64u(json.dumps(payload).encode())
    sig = b64u(hmac.new(SECRET, (h + "." + p).encode(), hashlib.sha256).digest())
    return h + "." + p + "." + sig


def lees_jwt(tok):
    try:
        h, p, s = tok.split(".")
        if not hmac.compare_digest(s, b64u(hmac.new(SECRET, (h + "." + p).encode(), hashlib.sha256).digest())):
            return None
        d = json.loads(b64u_dec(p))
        return d if d.get("exp", 0) > time.time() else None
    except Exception:
        return None


def totp(secret_b32, t=None):
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8))
    c = int((t or time.time()) // 30)
    h = hmac.new(key, struct.pack(">Q", c), hashlib.sha1).digest()
    o = h[-1] & 15
    return "%06d" % ((struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000)


def nieuwe_state():
    def u(n, mail, naam, rol, functie, actief=True):
        return {"id": "00000000-0000-4000-8000-%012d" % n, "email": mail, "password": WACHTWOORD,
                "profiel": {"full_name": naam, "role": rol, "functie": functie, "actief": actief}, "factors": []}
    users = [u(1, "carla@noardling.test", "Carla Proef", "coordinator", "Montage Coördinator"),
             u(2, "winfred@noardling.test", "Winfred Loerts", "coordinator", "Montage Coördinator"),
             u(3, "douwe@noardling.test", "Douwe de Boer", "coordinator", "Montage Coördinator"),
             u(4, "bjorn@noardling.test", "Björn Sloos", "hoofd", "Hoofd Service & Montage"),
             u(5, "inactief@noardling.test", "Oud Medewerker", "coordinator", "Montage Coördinator", actief=False),
             u(6, "qhse@noardling.test", "Gijs Gefingeerd", "qhse", "QHSE-manager"),
             u(7, "beheer@noardling.test", "Hanna Hypothese", "beheerder", "Applicatiebeheerder"),
             u(8, "norol@noardling.test", "Nieuwe Collega", None, "")]
    return {"users": {x["email"]: x for x in users}, "sessions": {}, "refresh": {}, "challenges": {},
            "tables": {"inspecties": {}, "acties": {}, "planning": {}}, "actie_log": [], "monteurs": {}, "instellingen": {}, "security_events": [],
            "fotos": {}, "recover": [], "pkce": {}, "logins": [], "verborgen": [], "fail": {"n": 0, "status": 503, "pad": "", "methode": "", "code": ""}, "requests": [], "max_rows": 1000,
            "rapporten": {}, "mail_wachtrij": [], "invites": {}}


STATE = nieuwe_state()


def naam_schoon(n):   # 0001 naam_schoon: NFC, witruimte samenvoegen, randen en losse leestekens aan het eind weg
    n = unicodedata.normalize("NFC", str(n))
    n = re.sub(r"[\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+", " ", n).strip(" ")
    return re.sub(r"[ .,;:\u00B7]+$", "", n)


def naam_sleutel(n):   # 0001 naam_sleutel (benadering): kleine letters, zonder accenten, spaties en leestekens
    n = re.sub(r"[\u0001-\u001F\u007F-\u009F\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]", "", str(n)).lower()
    n = n.translate(str.maketrans("øđðłıħ", "oddlih")).replace("æ", "ae").replace("œ", "oe").replace("ß", "ss").replace("þ", "th")
    n = "".join(ch for ch in unicodedata.normalize("NFD", n) if not unicodedata.combining(ch))
    return "".join(ch for ch in n if ch.isalnum())


def user_by_id(uid):
    for x in STATE["users"].values():
        if x["id"] == uid:
            return x
    return None


def profiel_rij(x):
    p = x["profiel"]
    return {"id": x["id"], "full_name": p["full_name"], "functie": p["functie"], "role": p["role"], "actief": p["actief"],
            "uitgenodigd": bool(x.get("uitgenodigd"))}


def user_json(x):
    return {"id": x["id"], "aud": "authenticated", "role": "authenticated", "email": x["email"],
            "last_sign_in_at": x.get("laatst"), "email_confirmed_at": x.get("bevestigd") or (x.get("laatst") if x.get("password") else None),
            "banned_until": "2999-12-31T00:00:00Z" if x.get("banned") else None,
            "factors": [{"id": f["id"], "factor_type": "totp", "status": f["status"], "friendly_name": f["name"]} for f in x["factors"]]}


def sessie_uitgeven(x, aal="aal1", sid=None):
    sid = sid or str(uuid.uuid4())
    STATE["sessions"][sid] = {"uid": x["id"], "aal": aal, "revoked": False}
    rt = b64u(os.urandom(18))
    STATE["refresh"][rt] = {"sid": sid, "used": False}
    exp = int(time.time()) + 3600
    at = maak_jwt({"sub": x["id"], "aud": "authenticated", "role": "authenticated", "email": x["email"],
                   "aal": aal, "session_id": sid, "exp": exp, "iat": int(time.time())})
    return {"access_token": at, "token_type": "bearer", "expires_in": 3600, "expires_at": exp,
            "refresh_token": rt, "user": user_json(x)}


class Handler(SimpleHTTPRequestHandler):
    server_version = "MockSupabase/1"

    def log_message(self, fmt, *args):  # stil, behalve met --verbose
        if self.server.verbose:
            super().log_message(fmt, *args)

    # ---------- helpers ----------
    def stuur(self, status, body=None, ctype="application/json", extra=None):
        data = b"" if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
        self.send_response(status)
        if body is not None:
            self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def jbody(self):
        try:
            return json.loads(self.body() or b"null")
        except Exception:
            return None

    def gebruiker(self):
        """(user, claims) uit de Bearer-JWT, of (None, None)."""
        a = self.headers.get("Authorization", "")
        if not a.startswith("Bearer "):
            return None, None
        c = lees_jwt(a[7:])
        if not c:
            return None, None
        x = user_by_id(c["sub"])
        return (x, c) if x else (None, None)

    def end_headers(self):
        if self.path.startswith(("/auth/", "/rest/", "/storage/")):
            self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "authorization, apikey, content-type, prefer, x-upsert, cache-control")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.end_headers()

    def route(self):
        u = urlparse(self.path)
        alle = parse_qs(u.query, keep_blank_values=True)
        p, q = u.path, {k: v[0] for k, v in alle.items()}
        self.filters = [(k, w) for k, v in alle.items() for w in v]   # meerdere filters op één kolom (id=gt.&id=in.)
        if p.startswith("/__mock/"):
            return self.mock(p, q)
        if p == "/auth/v1/verify" and self.command == "GET":   # de link uit de uitnodiging (zonder apikey, zoals GoTrue)
            return self.verify(q)
        if p.startswith("/functions/v1/"):   # buiten de LOCK: de functie roept deze mock zelf weer aan
            if self.headers.get("apikey") != ANON:
                return self.stuur(401, {"message": "No API key found in request"})
            return self.functie(p[len("/functions/v1/"):])
        if p.startswith(("/auth/v1/", "/rest/v1/", "/storage/v1/")):
            with LOCK:
                STATE["requests"].append({"t": nu_iso(), "m": self.command, "p": p, "q": u.query})
                if self.headers.get("apikey") not in (ANON, SERVICE):
                    return self.stuur(401, {"message": "No API key found in request"})
                if self.dienst():
                    return self.service(p, q)
                F = STATE["fail"]
                if F["n"] > 0 and not p.startswith("/auth/") and (not F.get("pad") or p == F["pad"]) and (not F.get("methode") or self.command == F["methode"]):
                    F["n"] -= 1
                    if F.get("code"):
                        return self.fout(F["status"], F["code"], "mock: geforceerde fout")
                    return self.stuur(F["status"], {"message": "mock: geforceerde fout"})
                if p.startswith("/auth/v1/"):
                    return self.auth(p[len("/auth/v1/"):], q)
                if p.startswith("/rest/v1/"):
                    return self.rest(p[len("/rest/v1/"):], q)
                return self.storage(p[len("/storage/v1/"):], q)
        if self.command not in ("GET", "HEAD"):
            return self.stuur(405, {"message": "Method not allowed"})
        if p == "/js/config.js" and not self.server.demo:
            js = ("/* mock_supabase.py: ingevulde config voor tests */\nwindow.WPI_CONFIG = Object.freeze({ supabaseUrl: %s, supabaseAnonKey: %s });\n"
                  % (json.dumps("http://%s" % self.headers.get("Host")), json.dumps(ANON))).encode()
            return self.stuur(200, js, "application/javascript")
        return super().do_GET() if self.command == "GET" else super().do_HEAD()

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = lambda self: self.route()

    # ---------- testhulp ----------
    def mock(self, p, q):
        global STATE
        with LOCK:
            if p == "/__mock/state":
                s = {k: v for k, v in STATE.items() if k not in ("fotos", "users", "refresh", "rapporten", "invites")}
                s["rapporten"] = [{"pad": k, "grootte": len(v["data"]), "door": v["door"]} for k, v in STATE["rapporten"].items()]
                s["fotos"] = [{"pad": k, "mime": v["mime"], "grootte": len(v["data"]), "exif": b"Exif" in v["data"][:4096],
                               "door": v["door"]} for k, v in STATE["fotos"].items()]
                s["users"] = [{"email": x["email"], "id": x["id"], "factors": x["factors"], "profiel": x["profiel"], "banned": bool(x.get("banned"))} for x in STATE["users"].values()]
                return self.stuur(200, s)
            if p == "/__mock/fail":
                STATE["fail"] = {"n": int(q.get("n", "1")), "status": int(q.get("status", "503")), "pad": q.get("pad", ""), "methode": q.get("methode", ""), "code": q.get("code", "")}
                return self.stuur(200, STATE["fail"])
            if p == "/__mock/verberg":
                STATE["verborgen"].append("%s:%s:%s" % (q.get("tabel", ""), q.get("id", ""), q.get("uid", "")))
                return self.stuur(200, {"verborgen": STATE["verborgen"]})
            if p == "/__mock/maxrows":   # PostgREST max-rows nabootsen (Supabase-standaard 1000)
                STATE["max_rows"] = int(q.get("n", "1000"))
                return self.stuur(200, {"max_rows": STATE["max_rows"]})
            if p == "/__mock/reset":
                STATE = nieuwe_state()
                return self.stuur(200, {"ok": True})
            if p == "/__mock/herstellink":   # de link uit de herstel-/uitnodigingsmail (alleen voor de test)
                x = STATE["users"].get(q.get("email", ""))
                if not x:
                    return self.stuur(404, {"message": "onbekend"})
                r = next((r for r in reversed(STATE["recover"]) if r["email"] == x["email"]), None)
                doel = (r and r["redirect_to"]) or q.get("redirect_to", "/index.html")
                soort = q.get("soort", "recovery")
                if soort == "recovery" and r and r.get("code_challenge"):
                    code = str(uuid.uuid4())
                    STATE["pkce"][code] = {"uid": x["id"], "challenge": r["code_challenge"], "method": str(r.get("code_challenge_method") or "plain").lower(), "t": time.time()}
                    return self.stuur(200, {"link": doel + "?code=" + code})
                d = sessie_uitgeven(x)
                return self.stuur(200, {"link": doel + "#access_token=%s&expires_at=%d&expires_in=3600&refresh_token=%s&token_type=bearer&type=%s" % (d["access_token"], d["expires_at"], d["refresh_token"], soort)})
            if p == "/__mock/totp":   # huidige code voor een gebruiker (alleen voor de test)
                x = STATE["users"].get(q.get("email", ""))
                f = x and next((f for f in x["factors"] if f["status"] == "verified" or q.get("ook_nieuw")), None)
                return self.stuur(200, {"code": totp(f["secret"]) if f else None})
        return self.stuur(404, {"message": "onbekend"})

    # ---------- /auth/v1 ----------
    def auth(self, pad, q):
        m = self.command
        if pad == "token" and m == "POST":
            b = self.jbody() or {}
            if q.get("grant_type") == "password":
                mail = str(b.get("email", "")).lower()
                recent = [x for x in STATE["logins"] if x["email"] == mail and not x["ok"] and x["t"] > time.time() - 300]
                if len(recent) >= 30:
                    return self.stuur(429, {"code": "over_request_rate_limit", "msg": "Request rate limit reached"})
                x = STATE["users"].get(mail)
                ok = bool(x and x.get("password") and hmac.compare_digest(x["password"], str(b.get("password", ""))))
                STATE["logins"].append({"email": mail, "ok": ok, "t": time.time()})
                if not ok:
                    return self.stuur(400, {"code": "invalid_credentials", "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
                if x.get("banned"):   # 0009: op non-actief gezet via de functie "gebruikers" (ban_duration)
                    return self.stuur(400, {"code": "user_banned", "error_code": "user_banned", "msg": "User is banned"})
                x["laatst"] = nu_iso()
                return self.stuur(200, sessie_uitgeven(x))
            if q.get("grant_type") == "refresh_token":
                r = STATE["refresh"].get(str(b.get("refresh_token", "")))
                s = r and STATE["sessions"].get(r["sid"])
                if not r or not s or s["revoked"]:
                    return self.stuur(400, {"code": "refresh_token_not_found", "msg": "Invalid Refresh Token: Refresh Token Not Found"})
                if r["used"]:   # hergebruik van een oud token: hele sessie intrekken (zoals Supabase)
                    s["revoked"] = True
                    return self.stuur(400, {"code": "refresh_token_already_used", "msg": "Invalid Refresh Token: Already Used"})
                r["used"] = True
                if (user_by_id(s["uid"]) or {}).get("banned"):
                    return self.stuur(400, {"code": "user_banned", "msg": "User is banned"})
                return self.stuur(200, sessie_uitgeven(user_by_id(s["uid"]), s["aal"], r["sid"]))
            if q.get("grant_type") == "pkce":   # PKCE: code uit de herstellink + code_verifier van DEZE browser
                f = STATE["pkce"].pop(str(b.get("auth_code", "")), None)
                if not f or f["t"] < time.time() - 300:
                    return self.stuur(404, {"code": "flow_state_not_found", "msg": "invalid flow state, no valid flow state found"})
                v = str(b.get("code_verifier", ""))
                ok = (b64u(hashlib.sha256(v.encode()).digest()) == f["challenge"]) if f["method"] == "s256" else hmac.compare_digest(v, f["challenge"])
                if not v or not ok:
                    return self.stuur(400, {"code": "bad_code_verifier", "msg": "code challenge does not match previously saved code verifier"})
                return self.stuur(200, sessie_uitgeven(user_by_id(f["uid"])))
            return self.stuur(400, {"msg": "unsupported_grant_type"})
        if pad == "recover" and m == "POST":
            b = self.jbody() or {}
            STATE["recover"].append({"email": str(b.get("email", "")).lower(), "redirect_to": q.get("redirect_to"), "t": nu_iso(),
                                     "code_challenge": b.get("code_challenge"), "code_challenge_method": b.get("code_challenge_method")})
            return self.stuur(200, {})
        x, c = self.gebruiker()
        if not x:
            return self.stuur(401, {"code": "bad_jwt", "msg": "invalid JWT"})
        if pad == "user" and m == "GET":
            return self.stuur(200, user_json(x))
        if pad == "user" and m == "PUT":
            b = self.jbody() or {}
            if "password" in b:
                if len(str(b["password"])) < 12:
                    return self.stuur(422, {"code": "weak_password", "msg": "Password should be at least 12 characters."})
                x["password"] = str(b["password"])
            return self.stuur(200, user_json(x))
        if pad == "logout" and m == "POST":
            for sid, s in STATE["sessions"].items():
                if (q.get("scope") == "global" and s["uid"] == x["id"]) or sid == c.get("session_id"):
                    s["revoked"] = True
            return self.stuur(204)
        if pad == "factors" and m == "POST":
            sec = base64.b32encode(os.urandom(20)).decode().rstrip("=")
            f = {"id": str(uuid.uuid4()), "status": "unverified", "secret": sec, "name": (self.jbody() or {}).get("friendly_name", "")}
            x["factors"].append(f)
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><text x="10" y="100" font-size="12">mock QR</text></svg>'
            return self.stuur(200, {"id": f["id"], "type": "totp", "totp": {"qr_code": "data:image/svg+xml;utf-8," + svg, "secret": sec,
                                                                          "uri": "otpauth://totp/Werkplekinspectie:%s?secret=%s" % (x["email"], sec)}})
        parts = pad.split("/")
        if len(parts) >= 2 and parts[0] == "factors":
            f = next((f for f in x["factors"] if f["id"] == parts[1]), None)
            if not f:
                return self.stuur(404, {"msg": "Factor not found"})
            if len(parts) == 2 and m == "DELETE":
                x["factors"].remove(f)
                return self.stuur(200, {"id": f["id"]})
            if len(parts) == 3 and parts[2] == "challenge" and m == "POST":
                cid = str(uuid.uuid4())
                STATE["challenges"][cid] = {"fid": f["id"], "t": time.time()}
                return self.stuur(200, {"id": cid, "expires_at": int(time.time()) + 300})
            if len(parts) == 3 and parts[2] == "verify" and m == "POST":
                b = self.jbody() or {}
                ch = STATE["challenges"].pop(str(b.get("challenge_id", "")), None)
                code = str(b.get("code", ""))
                geldig = any(hmac.compare_digest(code, totp(f["secret"], time.time() + d)) for d in (-30, 0, 30))
                if not ch or ch["fid"] != f["id"] or not geldig:
                    return self.stuur(422, {"code": "mfa_verification_failed", "msg": "Invalid TOTP code entered"})
                f["status"] = "verified"
                return self.stuur(200, sessie_uitgeven(x, "aal2", c.get("session_id")))
        return self.stuur(404, {"msg": "Not found"})

    # ---------- 0009: service_role (alleen de functies-host), uitnodigingslink, Edge Functions ----------
    def dienst(self):
        return self.headers.get("apikey") == SERVICE and self.headers.get("Authorization", "") == "Bearer " + SERVICE

    def service(self, p, q):
        """Wat de Edge Functions met de service_role-sleutel doen: Auth-admin-API en twee RPC's (zoals 0009)."""
        m, b = self.command, None
        if m in ("POST", "PUT", "PATCH"):
            b = self.jbody()
        if p == "/auth/v1/admin/generate_link" and m == "POST":
            b = b or {}
            mail = str(b.get("email", "")).strip().lower()
            if b.get("type") not in ("invite", "recovery") or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", mail):
                return self.stuur(422, {"code": "validation_failed", "msg": "invalid"})
            bestaand = STATE["users"].get(mail)
            # zoals GoTrue: recovery voor een bestaand account; invite opnieuw voor een bestaand maar nog NIET bevestigd account
            if bestaand and (b.get("type") == "recovery" or not user_json(bestaand)["email_confirmed_at"]):
                tok = b64u(os.urandom(18))
                STATE["invites"][tok] = {"uid": bestaand["id"], "redirect_to": b.get("redirect_to") or "/", "t": time.time(), "type": b["type"]}
                link = "http://%s/auth/v1/verify?token=%s&type=%s&redirect_to=%s" % (self.headers.get("Host"), tok, b["type"], b.get("redirect_to") or "/")
                return self.stuur(200, dict(user_json(bestaand), action_link=link, verification_type=b["type"], redirect_to=b.get("redirect_to")))
            if b.get("type") == "recovery":
                return self.stuur(404, {"code": "user_not_found", "msg": "User not found"})
            if mail in STATE["users"]:
                return self.stuur(422, {"code": "email_exists", "msg": "A user with this email address has already been registered"})
            uid = str(uuid.uuid4())
            naam = naam_schoon((b.get("data") or {}).get("full_name") or mail.split("@")[0])[:110] or "Nieuwe gebruiker"
            while any(naam_sleutel(u["profiel"]["full_name"]) == naam_sleutel(naam) for u in STATE["users"].values()):
                naam += " (2)"   # zoals profiel_beginnaam (0002): een bestaande naam krijgt een volgnummer
            STATE["users"][mail] = {"id": uid, "email": mail, "password": None, "factors": [], "uitgenodigd": nu_iso(), "sinds": nu_iso(),
                                    "profiel": {"full_name": naam, "role": None, "functie": "", "actief": True}}
            tok = b64u(os.urandom(18))
            STATE["invites"][tok] = {"uid": uid, "redirect_to": b.get("redirect_to") or "/", "t": time.time()}
            link = "http://%s/auth/v1/verify?token=%s&type=invite&redirect_to=%s" % (self.headers.get("Host"), tok, b.get("redirect_to") or "/")
            return self.stuur(200, dict(user_json(STATE["users"][mail]), action_link=link, verification_type="invite", redirect_to=b.get("redirect_to")))
        mt = re.match(r"^/auth/v1/admin/users/([0-9a-f-]{36})$", p)
        if mt:
            x = user_by_id(mt.group(1))
            if not x:
                return self.stuur(404, {"code": "user_not_found", "msg": "User not found"})
            if m == "GET":
                return self.stuur(200, user_json(x))
            if m == "PUT":
                if "ban_duration" in (b or {}):
                    x["banned"] = (b or {}).get("ban_duration") not in ("none", "", None)
                    if x["banned"]:   # zoals GoTrue: lopende sessies kunnen niet meer vernieuwen
                        for s_ in STATE["sessions"].values():
                            if s_["uid"] == x["id"]:
                                s_["revoked"] = True
                return self.stuur(200, user_json(x))
            if m == "DELETE":
                del STATE["users"][x["email"]]
                return self.stuur(200, {})
        if p == "/rest/v1/rpc/gebruiker_bestaat" and m == "POST":
            return self.stuur(200, str((b or {}).get("p_email", "")).strip().lower() in STATE["users"])
        if p == "/rest/v1/rpc/beheer_gebeurtenis" and m == "POST":
            b = b or {}
            if not re.match(r"^beheer_[a-z_]{3,40}$", str(b.get("p_soort", ""))):
                return self.fout(400, "22023", "Ongeldige soort")
            STATE["security_events"].append({"id": len(STATE["security_events"]) + 1, "t": nu_iso(), "wie": b.get("p_wie"),
                                             "soort": b.get("p_soort"), "details": dict(b.get("p_details") or {}, profiel=b.get("p_profiel"))})
            return self.stuur(204)
        if p == "/rest/v1/rpc/rapport_ontvanger_id" and m == "POST":
            return self.stuur(200, self.ontvanger_id())
        return self.fout(403, "42501", "permission denied (mock: service_role alleen voor de Auth-admin-API en de 0009-RPC's)")

    def verify(self, q):
        with LOCK:
            f = STATE["invites"].pop(q.get("token", ""), None)
            x = f and user_by_id(f["uid"])
            if not f or not x or f["t"] < time.time() - 3600:
                return self.stuur(303, None, extra={"Location": (q.get("redirect_to") or "/") + "#error=access_denied&error_code=otp_expired"})
            x["bevestigd"] = x.get("bevestigd") or nu_iso()
            x["laatst"] = nu_iso()   # zoals GoTrue: de link openen is inloggen
            d = sessie_uitgeven(x)
            return self.stuur(303, None, extra={"Location": f["redirect_to"] + "#access_token=%s&expires_at=%d&expires_in=3600&refresh_token=%s&token_type=bearer&type=%s"
                                                % (d["access_token"], d["expires_at"], d["refresh_token"], f.get("type", "invite"))})

    _host = None
    _host_lock = threading.Lock()

    def functie(self, naam):
        """/functions/v1/<naam>: doorgeven aan de echte TypeScript-functie (tools/functies_host.mjs, gestart bij het
        eerste verzoek). Zo toetsen de tests de functie zelf, met deze mock als Supabase."""
        import http.client
        import subprocess
        if naam not in ("uitnodigen", "gebruikers"):
            return self.stuur(404, {"message": "Function not found"})
        with Handler._host_lock:
            if Handler._host is None or Handler._host[0].poll() is not None:
                basis = "http://%s" % self.headers.get("Host")
                host = os.path.join(os.path.dirname(os.path.abspath(__file__)), "functies_host.mjs")
                pr = subprocess.Popen(["node", host, basis, basis + "/"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)   # stdin dicht (mock weg) = host stopt
                regel = pr.stdout.readline().strip()
                if not regel.startswith("poort "):
                    return self.stuur(501, {"message": "functies-host start niet (Node 22+ nodig)"})
                Handler._host = (pr, int(regel.split()[1]))
            poort = Handler._host[1]
        body = self.body()
        koppen = {k: v for k, v in self.headers.items() if k.lower() in ("authorization", "apikey", "content-type", "origin")}
        c = http.client.HTTPConnection("127.0.0.1", poort, timeout=30)
        c.request(self.command, "/" + naam, body=body or None, headers=koppen)
        r = c.getresponse()
        data = r.read()
        extra = {k: v for k, v in r.getheaders() if k.lower().startswith("access-control-")}
        return self.stuur(r.status, data if data else None, r.getheader("Content-Type") or "application/json", extra)

    def ontvanger_id(self):   # rapport_ontvanger_id (0009): instelling, anders de (eerste) actieve QHSE-manager
        w = (STATE["instellingen"].get("rapport_ontvanger") or {}).get("waarde")
        x = user_by_id(w) if isinstance(w, str) else None
        if x and x["profiel"]["actief"] and x["profiel"]["role"]:
            return x["id"]
        q = [u for u in STATE["users"].values() if u["profiel"]["role"] == "qhse" and u["profiel"]["actief"]]
        return q[0]["id"] if q else None

    def wachtrij_volg(self):   # mail_wachtrij_volg (0009 §10b): wachtende rapporten volgen de huidige ontvanger
        o = self.ontvanger_id()
        for r in STATE["mail_wachtrij"]:
            if r["status"] in ("wacht", "fout"):
                r["ontvanger"] = o

    # ---------- /rest/v1 ----------
    def fout(self, status, code, msg):
        return self.stuur(status, {"code": code, "details": None, "hint": None, "message": msg})

    def rest(self, tabel, q):
        x, c = self.gebruiker()
        m = self.command
        if not x:
            return self.fout(401, "42501", "permission denied (anon)")
        prof = x["profiel"]
        if not prof["actief"]:
            return self.stuur(200, []) if m == "GET" else self.fout(403, "42501", "new row violates row-level security policy")
        if prof["role"] is None and tabel != "profiles":   # 0008: nog geen rol = nog geen toegang (alleen het eigen profiel)
            return self.stuur(200, []) if m == "GET" else self.fout(403, "42501", "new row violates row-level security policy")
        if tabel == "rpc/report_security_event" and m == "POST":
            b = self.jbody() or {}
            STATE["security_events"].append({"id": len(STATE["security_events"]) + 1, "t": nu_iso(), "wie": x["id"],
                                             "soort": b.get("p_soort"), "details": b.get("p_details") or {}})
            return self.stuur(200, True)
        beheer2 = prof["role"] in ("hoofd", "qhse", "beheerder") and c.get("aal") == "aal2"
        if tabel == "rpc/mag_gebruikers_beheren" and m == "POST":   # 0009: beheerrol, actief, altijd aal2
            return self.stuur(200, beheer2)
        if tabel == "rpc/gebruikers_overzicht" and m == "POST":
            if not beheer2:
                return self.fout(403, "42501", "Alleen een hoofd, de QHSE-manager of de beheerder, ingelogd met tweestapsverificatie")
            return self.stuur(200, sorted([dict(profiel_rij(u), uitgenodigd=bool(u.get("uitgenodigd")), laatst_ingelogd=u.get("laatst"), geblokkeerd=bool(u.get("banned")), aangemaakt=u.get("sinds") or "2026-01-01T00:00:%02dZ" % (list(STATE["users"]).index(u["email"]) % 60))
                                           for u in STATE["users"].values()], key=lambda r: r["full_name"]))
        if tabel == "rpc/rapport_ontvanger" and m == "POST":
            i = self.ontvanger_id()
            u = user_by_id(i) if i else None
            w = (STATE["instellingen"].get("rapport_ontvanger") or {}).get("waarde")
            return self.stuur(200, {"id": u["id"] if u else None, "naam": u["profiel"]["full_name"] if u else None, "keuze": w if isinstance(w, str) else None})
        if tabel == "rpc/rapport_in_wachtrij" and m == "POST":   # 0009: alleen de eigen inspecteur, na het uploaden
            b = self.jbody() or {}
            iid, pad = str(b.get("p_inspectie_id", "")), str(b.get("p_bestand", ""))
            ins = STATE["tables"]["inspecties"].get(iid)
            if not ins or ins.get("inspecteur_id") != x["id"]:
                return self.fout(403, "42501", "Alleen de inspecteur van deze inspectie zet het rapport klaar")
            if pad != x["id"] + "/" + iid + ".pdf":
                return self.fout(400, "22023", "Het rapport hoort in de eigen map als <inspectie>.pdf")
            if pad not in STATE["rapporten"]:
                return self.fout(400, "22023", "Het rapport is nog niet geüpload")
            rij = next((r for r in STATE["mail_wachtrij"] if r["inspectie_id"] == iid), None)
            if not rij:
                rij = {"id": len(STATE["mail_wachtrij"]) + 1, "soort": "rapport", "inspectie_id": iid, "ontvanger": self.ontvanger_id(), "bestand": pad,
                       "status": "wacht", "pogingen": 0, "laatste_fout": None, "aangemaakt": nu_iso(), "verstuurd_op": None, "aangemaakt_door": x["id"]}
                STATE["mail_wachtrij"].append(rij)
            o = user_by_id(rij["ontvanger"]) if rij["ontvanger"] else None
            return self.stuur(200, {"id": rij["id"], "status": rij["status"], "ontvanger": rij["ontvanger"], "ontvanger_naam": o["profiel"]["full_name"] if o else None})
        if tabel == "mail_wachtrij":
            if m != "GET":
                return self.fout(403, "42501", "permission denied for table mail_wachtrij")
            alles = prof["role"] == "coordinator" or beheer2   # mag_alles_lezen (MFA verplicht in de mock)
            return self.stuur(200, [dict(r) for r in STATE["mail_wachtrij"]] if alles else [])
        filt = [(k, v) for k, v in self.filters if k not in ("select", "order", "on_conflict", "limit", "offset", "columns")]

        def waarde(w, val):   # vergelijk als getal als de kolom een getal is, anders als tekst
            if isinstance(w, (int, float)) and not isinstance(w, bool):
                try:
                    return w, float(val)
                except ValueError:
                    return str(w), val
            return ("" if w is None else str(w)), val

        def in_lijst(val):   # in.(a,"b",c)
            val = val.strip()
            if not (val.startswith("(") and val.endswith(")")):
                return []
            uit, cur, quote = [], "", False
            for ch in val[1:-1]:
                if ch == '"':
                    quote = not quote
                elif ch == "," and not quote:
                    uit.append(cur)
                    cur = ""
                else:
                    cur += ch
            uit.append(cur)
            return uit

        def past(rij):
            for k, v in filt:
                op, _, val = v.partition(".")
                w = rij.get(k)
                if op == "eq" and str(w) != unquote(val):
                    return False
                if op == "is" and {"true": True, "false": False, "null": None}.get(val, "?") != w:
                    return False
                if op in ("gt", "gte", "lt", "lte"):
                    if w is None:
                        return False
                    a, b = waarde(w, val)
                    if type(a) is not type(b) and not (isinstance(a, float) or isinstance(b, float)):
                        a, b = str(a), str(b)
                    if not {"gt": a > b, "gte": a >= b, "lt": a < b, "lte": a <= b}[op]:
                        return False
                if op == "in" and str(w) not in in_lijst(val):
                    return False
            return True

        def resultaat(rows):   # order, limit, max-rows en select zoals PostgREST
            for deel in reversed([d for d in q.get("order", "").split(",") if d]):
                kol, _, richting = deel.partition(".")
                rows = sorted(rows, key=lambda r: (r.get(kol) is None, r.get(kol) if r.get(kol) is not None else ""), reverse=richting.startswith("desc"))
            n = STATE["max_rows"]
            if q.get("limit"):
                n = min(n, int(q["limit"]))
            rows = rows[:n]
            sel = q.get("select", "*")
            if sel != "*":
                kols = [c.strip() for c in sel.split(",") if c.strip()]
                rows = [{c: r.get(c) for c in kols} for r in rows]
            return rows

        if tabel == "profiles" and m == "GET":
            return self.stuur(200, [r for r in (profiel_rij(u) for u in STATE["users"].values()) if past(r)])
        if tabel == "profiles" and m == "PATCH":
            # 0008 (profiles_update + profiles_bewaak): alleen de beheerrollen (met aal2, zoals mfa_verplicht_hoofd = true);
            # geen rol "inspecteur", niemand wijzigt zijn eigen rol/activering, minstens één actief hoofd. Zonder recht:
            # 0 rijen (RLS), zoals PostgREST.
            b = self.jbody()
            if not isinstance(b, dict) or set(b) - {"role", "actief", "functie", "full_name"}:
                return self.fout(400, "PGRST204", "Could not find the column in the schema cache")
            rep = "return=representation" in self.headers.get("Prefer", "")
            if prof["role"] not in ("hoofd", "qhse", "beheerder") or c.get("aal") != "aal2":
                return self.stuur(200, []) if rep else self.stuur(204)
            uit = []
            for u in [u for u in STATE["users"].values() if past(profiel_rij(u))]:
                nieuw = dict(u["profiel"], **b)
                if "full_name" in b:
                    nieuw["full_name"] = naam_schoon(str(b["full_name"] or ""))
                    if not 1 <= len(nieuw["full_name"]) <= 120:
                        return self.fout(400, "23514", "new row for relation \"profiles\" violates check constraint \"profiles_naam_lengte\"")
                    if any(v is not u and naam_sleutel(v["profiel"]["full_name"]) == naam_sleutel(nieuw["full_name"]) for v in STATE["users"].values()):
                        return self.fout(409, "23505", "duplicate key value violates unique constraint \"profiles_naam_uniek\"")
                if "role" in b and b["role"] not in ("hoofd", "coordinator", "qhse", "beheerder"):
                    return self.fout(400, "23514", "De rol inspecteur wordt niet meer toegekend; kies hoofd, coördinator, QHSE-manager of beheerder"
                                     if b["role"] == "inspecteur" else "invalid input value for enum user_role")
                if u["id"] == x["id"] and (nieuw["role"], nieuw["actief"]) != (u["profiel"]["role"], u["profiel"]["actief"]):
                    return self.fout(403, "42501", "Je eigen rol of activering wijzig je niet zelf; dat doet een ander hoofd, de QHSE-manager of de beheerder")
                if u["profiel"]["role"] == "hoofd" and u["profiel"]["actief"] and (nieuw["role"] != "hoofd" or not nieuw["actief"]) \
                        and not any(v is not u and v["profiel"]["role"] == "hoofd" and v["profiel"]["actief"] for v in STATE["users"].values()):
                    return self.fout(400, "23514", "Er moet altijd minstens één actief hoofd zijn")
                was_q = u["profiel"]["role"] == "qhse" and u["profiel"]["actief"]
                u["profiel"].update(nieuw)
                uit.append(profiel_rij(u))
                # rapport_ontvanger_vastleggen (0009 §10c): een tweede QHSE-manager verandert niet wie de rapporten krijgt
                w = (STATE["instellingen"].get("rapport_ontvanger") or {}).get("waarde")
                if nieuw["role"] == "qhse" and nieuw["actief"] and not was_q and not isinstance(w, str):
                    ander = next((v for v in STATE["users"].values() if v is not u and v["profiel"]["role"] == "qhse" and v["profiel"]["actief"]), None)
                    if ander:
                        STATE["instellingen"]["rapport_ontvanger"] = {"sleutel": "rapport_ontvanger", "waarde": ander["id"], "updated_at": nu_iso()}
            self.wachtrij_volg()
            return self.stuur(200, uit) if rep else self.stuur(204)
        if tabel in ("monteurs", "instellingen", "rpc/monteur_aanmelden"):
            return self.beheer_tabel(tabel, q, x, c, past, resultaat)
        if tabel == "actie_log":
            if m == "GET":
                zicht = set(self.zichtbaar("acties", x))
                return self.stuur(200, resultaat([r for r in STATE["actie_log"] if r["actie_id"] in zicht and past(r)]))
            if m == "POST":
                b = self.jbody()
                for r in (b if isinstance(b, list) else [b]):
                    if r.get("actie_id") not in STATE["tables"]["acties"]:
                        return self.fout(403, "42501", "new row violates row-level security policy for table \"actie_log\"")
                    STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": r["actie_id"], "t": nu_iso(), "wie": x["id"], "wat": str(r.get("wat", ""))[:2000], "bron": "client"})
                return self.stuur(201)
        if tabel == "inspectie_aanvullingen":   # 0010: append-only; lezen wie de inspectie ziet, toevoegen de eigen inspecteur (of hoofd/QHSE)
            lijst = STATE.setdefault("aanvullingen", [])
            if m == "GET":
                zicht = set(self.zichtbaar("inspecties", x))
                return self.stuur(200, resultaat([r for r in lijst if r["inspectie_id"] in zicht and past(r)]))
            if m == "POST":
                b = self.jbody()
                for r in (b if isinstance(b, list) else [b]):
                    ins = STATE["tables"]["inspecties"].get(r.get("inspectie_id"))
                    if not ins or not (ins.get("inspecteur_id") == x["id"] or prof["role"] in ("hoofd", "qhse")):
                        return self.fout(403, "42501", "new row violates row-level security policy for table \"inspectie_aanvullingen\"")
                    tekst = str(r.get("tekst", "")).strip()
                    if not tekst or len(tekst) > 2000:
                        return self.fout(400, "23514", "new row violates check constraint \"aanvulling_tekst_lengte\"")
                    foto = r.get("foto")   # 0011: nagekomen foto, alleen een pad in de eigen map
                    if foto is not None:
                        foto = re.sub(r"^fotos/", "", str(foto))
                        if not re.match(r"^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$", foto, re.I) or foto.split("/")[0] != x["id"]:
                            return self.fout(400, "23514", "new row violates check constraint \"aanvulling_foto_vorm\"")
                    lijst.append({"id": len(lijst) + 1, "inspectie_id": r["inspectie_id"], "t": nu_iso(), "wie": x["id"], "over": str(r.get("over") or "Algemeen")[:120], "tekst": tekst, "foto": foto})
                return self.stuur(201)
            return self.fout(403, "42501", "permission denied for table inspectie_aanvullingen")
        if tabel not in STATE["tables"]:
            return self.fout(404, "42P01", "relation \"public.%s\" does not exist" % tabel)
        T = STATE["tables"][tabel]
        if m == "GET":
            rows = [T[i] for i in self.zichtbaar(tabel, x)]
            return self.stuur(200, resultaat(sorted([r for r in rows if past(r)], key=lambda r: r["updated_at"])))
        if m == "DELETE":
            for i in [i for i in self.zichtbaar(tabel, x) if past(T[i])]:
                if tabel != "planning" or prof["role"] in ("hoofd", "coordinator") or T[i].get("gemaakt_door") == x["id"]:
                    del T[i]
            return self.stuur(204)
        if m == "POST":
            if "merge-duplicates" not in self.headers.get("Prefer", ""):
                return self.fout(409, "23505", "duplicate key (mock verwacht upsert)")
            b = self.jbody()
            uit = []
            for r in (b if isinstance(b, list) else [b]):
                fout = self.valideer(tabel, r, T.get(r.get("id")), x)
                if fout:
                    return self.fout(*fout)
                oud = T.get(r["id"]) or {"created_at": nu_iso()}
                nieuw = dict(oud, **{k: v for k, v in r.items() if k != "updated_at"}, updated_at=nu_iso())
                if tabel == "planning":
                    nieuw["gemaakt_door"] = oud.get("gemaakt_door") or x["id"]
                if tabel == "acties":
                    nieuw["aangemaakt_door"] = oud.get("aangemaakt_door") or x["id"]
                    if not oud.get("status"):
                        STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": r["id"], "t": nu_iso(), "wie": x["id"], "wat": "Aangemaakt met status %s" % nieuw["status"], "bron": "server"})
                    elif oud.get("status") != nieuw["status"]:
                        STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": r["id"], "t": nu_iso(), "wie": x["id"], "wat": "Status: %s → %s" % (oud["status"], nieuw["status"]), "bron": "server"})
                T[r["id"]] = nieuw
                uit.append(nieuw)
            return self.stuur(201, uit) if "return=representation" in self.headers.get("Prefer", "") else self.stuur(201)
        if m == "PATCH":   # bijwerken met filters (o.a. id=eq.X&updated_at=eq.Y); 0 rijen = []
            b = self.jbody()
            if not isinstance(b, dict):
                return self.fout(400, "PGRST102", "Empty or invalid json")
            uit = []
            for i in [i for i in self.zichtbaar(tabel, x) if past(T[i])]:
                r = dict(T[i], **b)   # valideren op de rij zoals die na het bijwerken is
                r["id"] = i
                fout = self.valideer(tabel, r, T[i], x)
                if fout:
                    return self.fout(*fout)
                oud = T[i]
                nieuw = dict(r, updated_at=nu_iso())
                if tabel == "acties" and oud.get("status") != nieuw.get("status"):
                    STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": i, "t": nu_iso(), "wie": x["id"], "wat": "Status: %s → %s" % (oud.get("status"), nieuw.get("status")), "bron": "server"})
                T[i] = nieuw
                uit.append(nieuw)
            return self.stuur(200, uit) if "return=representation" in self.headers.get("Prefer", "") else self.stuur(204)
        return self.fout(405, "PGRST", "method not allowed")

    def beheer_tabel(self, tabel, q, x, c, past, resultaat):
        """monteurs en instellingen (0001 + 0003/0008-RLS): lezen = ieder actief lid met een rol; monteurs schrijven =
        coördinator, of hoofd/QHSE-manager/beheerder met aal2; instellingen schrijven = de beheerrollen met aal2.
        Zoals PostgREST: een update/verwijdering zonder recht raakt 0 rijen, een insert zonder recht = 42501."""
        m, rol, aal2 = self.command, x["profiel"]["role"], c.get("aal") == "aal2"
        beheer = rol in ("hoofd", "qhse", "beheerder") and aal2
        mag_m = rol == "coordinator" or beheer
        rls = lambda t: self.fout(403, "42501", "new row violates row-level security policy for table \"%s\"" % t)
        if tabel == "rpc/monteur_aanmelden":
            if m != "POST":
                return self.fout(405, "PGRST", "method not allowed")
            if rol not in ("hoofd", "coordinator", "inspecteur"):
                return self.fout(403, "42501", "Alleen wie inspecteert (een hoofd of coördinator) voegt tijdens een inspectie een monteur toe; de lijst beheer je in Beheer")
            if rol == "hoofd" and not aal2:
                return self.fout(403, "42501", "Log in met tweestapsverificatie om een monteur toe te voegen")
            naam = naam_schoon((self.jbody() or {}).get("p_naam") or "")
            if not 1 <= len(naam) <= 120 or not naam_sleutel(naam):
                return self.fout(400, "22023", "Vul een naam in van 1 tot 120 tekens")
            r = next((r for r in STATE["monteurs"].values() if naam_sleutel(r["naam"]) == naam_sleutel(naam)), None)
            if r:
                her = not r["actief"]
                if her:
                    r.update(actief=True, updated_at=nu_iso())
                return self.stuur(200, {"id": r["id"], "naam": r["naam"], "actief": True, "nieuw": False, "heractiveerd": her})
            r = {"id": str(uuid.uuid4()), "naam": naam, "actief": True, "created_at": nu_iso(), "updated_at": nu_iso()}
            STATE["monteurs"][r["id"]] = r
            return self.stuur(200, {"id": r["id"], "naam": naam, "actief": True, "nieuw": True, "heractiveerd": False})
        if tabel == "monteurs":
            T = STATE["monteurs"]
            if m == "GET":
                return self.stuur(200, resultaat([dict(r) for r in T.values() if past(r)]))
            dubbel = lambda naam, eigen=None: any(naam_sleutel(r["naam"]) == naam_sleutel(naam) and r["id"] != eigen for r in T.values())
            if m == "POST":
                if not mag_m:
                    return rls("monteurs")
                b = self.jbody()
                uit = []
                for r in (b if isinstance(b, list) else [b]):
                    if not isinstance(r, dict) or set(r) - {"id", "naam", "actief"}:
                        return self.fout(400, "PGRST204", "Could not find the column in the schema cache")
                    naam = naam_schoon(r.get("naam") or "")
                    if not 1 <= len(naam) <= 120 or not naam_sleutel(naam):
                        return self.fout(400, "23514", "new row for relation \"monteurs\" violates check constraint \"monteurs_naam_lengte\"")
                    if dubbel(naam):
                        return self.fout(409, "23505", "duplicate key value violates unique constraint \"monteurs_naam_uniek\"")
                    rij = {"id": r.get("id") or str(uuid.uuid4()), "naam": naam, "actief": r.get("actief") is not False, "created_at": nu_iso(), "updated_at": nu_iso()}
                    T[rij["id"]] = rij
                    uit.append(dict(rij))
                return self.stuur(201, resultaat(uit)) if "return=representation" in self.headers.get("Prefer", "") else self.stuur(201)
            if m == "PATCH":
                b = self.jbody()
                if not isinstance(b, dict) or set(b) - {"naam", "actief"}:
                    return self.fout(400, "PGRST204", "Could not find the column in the schema cache")
                uit = []
                for r in ([r for r in T.values() if past(r)] if mag_m else []):
                    nieuw = dict(r, **b)
                    if "naam" in b:
                        nieuw["naam"] = naam_schoon(str(b["naam"] or ""))
                        if not 1 <= len(nieuw["naam"]) <= 120 or not naam_sleutel(nieuw["naam"]):
                            return self.fout(400, "23514", "new row for relation \"monteurs\" violates check constraint \"monteurs_naam_lengte\"")
                        if dubbel(nieuw["naam"], r["id"]):
                            return self.fout(409, "23505", "duplicate key value violates unique constraint \"monteurs_naam_uniek\"")
                    nieuw["actief"] = nieuw.get("actief") is not False
                    nieuw["updated_at"] = nu_iso()
                    T[r["id"]] = nieuw
                    uit.append(dict(nieuw))
                return self.stuur(200, resultaat(uit)) if "return=representation" in self.headers.get("Prefer", "") else self.stuur(204)
            if m == "DELETE":
                for i in ([r["id"] for r in T.values() if past(r)] if mag_m else []):
                    del T[i]
                return self.stuur(204)
            return self.fout(405, "PGRST", "method not allowed")
        T = STATE["instellingen"]
        if m == "GET":
            return self.stuur(200, resultaat([dict(r) for r in T.values() if past(r)]))
        if m == "POST":
            if "merge-duplicates" not in self.headers.get("Prefer", ""):
                if any(isinstance(r, dict) and r.get("sleutel") in T for r in (lambda b: b if isinstance(b, list) else [b])(self.jbody())):
                    return self.fout(409, "23505", "duplicate key value violates unique constraint \"instellingen_pkey\"")
            if not beheer:
                return rls("instellingen")
            b = self.jbody()
            for r in (b if isinstance(b, list) else [b]):
                if not isinstance(r, dict) or set(r) - {"sleutel", "waarde"}:
                    return self.fout(400, "PGRST204", "Could not find the column in the schema cache")
                k, v = r.get("sleutel"), r.get("waarde")
                if k == "doel_conform":
                    ok = v is None or (isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 100)
                elif k == "mfa_verplicht_hoofd":
                    ok = isinstance(v, bool)
                elif k == "rapport_ontvanger":   # 0009: profiel-id van een actieve collega met een rol, of null (= de QHSE-manager)
                    o = user_by_id(v) if isinstance(v, str) else None
                    if isinstance(v, str) and not (o and o["profiel"]["actief"] and o["profiel"]["role"]):
                        return self.fout(409, "23503", "Kies een actieve collega als ontvanger van de rapporten")
                    ok = v is None or bool(o)
                else:
                    ok = False
                if not ok:
                    return self.fout(400, "23514", "new row for relation \"instellingen\" violates check constraint \"instellingen_waarde_geldig\"")
                T[k] = {"sleutel": k, "waarde": v, "updated_at": nu_iso()}
                if k == "rapport_ontvanger":
                    self.wachtrij_volg()
            return self.stuur(201)
        if m == "DELETE":
            for k in ([k for k, r in T.items() if past(r)] if beheer else []):
                del T[k]
            return self.stuur(204)
        return self.fout(405, "PGRST", "method not allowed")

    def zichtbaar(self, tabel, x):
        T, rol, uid = STATE["tables"][tabel], x["profiel"]["role"], x["id"]
        if rol in ("hoofd", "coordinator", "qhse", "beheerder"):
            return [i for i in T if "%s:%s:%s" % (tabel, i, uid) not in STATE["verborgen"]]
        if tabel == "inspecties":
            return [i for i, r in T.items() if r.get("inspecteur_id") == uid]
        if tabel == "planning":
            return [i for i, r in T.items() if r.get("inspecteur") == uid]
        eigen = {i for i, r in STATE["tables"]["inspecties"].items() if r.get("inspecteur_id") == uid}
        return [i for i, r in T.items() if uid in (r.get("houder"), r.get("toetser"), r.get("aangemaakt_door")) or r.get("inspectie_id") in eigen]

    def valideer(self, tabel, r, oud, x):
        """Een paar regels uit supabase/migrations (RLS + triggers), genoeg om de client te toetsen."""
        uid, staf = x["id"], x["profiel"]["role"] in ("hoofd", "coordinator")
        if not isinstance(r, dict) or not r.get("id"):
            return 400, "22023", "id ontbreekt"
        if "data:image/" in json.dumps(r):
            return 400, "22023", "Foto's niet in het record opslaan maar in Storage (alleen het pad)"
        def actief_profiel(pid):
            u = user_by_id(pid)
            return bool(u and u["profiel"]["actief"])
        if tabel == "inspecties":
            if r.get("inspecteur_id") != uid or (oud and oud.get("inspecteur_id") != uid):
                return 403, "42501", "new row violates row-level security policy for table \"inspecties\""
            if not oud:   # inspecties_controle_nieuw: opgeslagen tussen 30 dagen geleden en nu
                try:
                    t = datetime.fromisoformat(str(r.get("opgeslagen") or nu_iso()).replace("Z", "+00:00")).timestamp()
                except ValueError:
                    return 400, "22007", "invalid input syntax for type timestamp with time zone"
                if t > time.time() + 300 or t < time.time() - 30 * 86400:
                    return 400, "22023", "Het moment van vastleggen (opgeslagen) moet tussen 30 dagen geleden en nu liggen"
            for w in (r.get("record") or {}).get("waarnemingen") or []:
                if w.get("oordeel") not in (None, "C", "A", "V", "NVT"):
                    return 400, "22023", "Ongeldig oordeel in waarnemingen: alleen C, A, V of NVT"
        if tabel == "acties":
            if r.get("status") not in ("Voorstel", "Open", "In uitvoering", "Klaar voor toetsing", "Afgerond", "Vervallen"):
                return 400, "22P02", "invalid input value for enum actie_status"
            if not oud:   # acties_valideer + acties_controle_nieuw (nieuwe actie)
                iid = r.get("inspectie_id")
                ins = STATE["tables"]["inspecties"].get(iid) if iid else None
                if iid and (not ins or ins.get("inspecteur_id") != uid):   # vóór de FK-controle, zoals de echte trigger
                    return 403, "42501", "Een actie uit een inspectie kan alleen de inspecteur van die inspectie aanmaken"
                if r.get("status") not in ("Voorstel", "Open", "Afgerond"):
                    return 400, "23514", "Een nieuwe actie start als Voorstel of Open, niet als \"%s\"" % r.get("status")
                if r.get("status") == "Afgerond" and (not iid or r.get("houder") or r.get("toetser") != uid):
                    return 403, "42501", "Direct afgerond kan alleen bij ter plaatse gecorrigeerd: vanuit je eigen inspectie, zonder actiehouder, met jezelf als toetser"
                if r.get("nafoto_pad"):
                    return 403, "42501", "De na-foto voegt de actiehouder toe tijdens de uitvoering, niet bij het aanmaken"
            for k, wat in (("houder", "Actiehouder"), ("toetser", "Toetser")):
                if r.get(k) and not actief_profiel(r[k]):
                    return 409, "23503", "insert or update on table \"acties\" violates foreign key constraint \"acties_%s_fkey\"" % k
            # 0008 acties_controle_personen: QHSE-manager en beheerder nooit actiehouder, beheerder nooit toetser
            rol_van = lambda pid: (user_by_id(pid) or {}).get("profiel", {}).get("role")
            if r.get("houder") and rol_van(r["houder"]) in ("qhse", "beheerder"):
                return 400, "23514", "De QHSE-manager kan geen actiehouder zijn" if rol_van(r["houder"]) == "qhse" else "De beheerder kan geen actiehouder zijn"
            if r.get("toetser") and rol_van(r["toetser"]) == "beheerder":
                return 400, "23514", "De beheerder kan geen toetser zijn"
            if oud and oud.get("status") in ("Klaar voor toetsing", "Afgerond", "Vervallen") and (r.get("houder", oud.get("houder")) != oud.get("houder") or r.get("toetser", oud.get("toetser")) != oud.get("toetser")):
                return 403, "42501", "Actiehouder en toetser liggen vast zodra de actie klaar voor toetsing is"
            if r.get("houder") and r.get("houder") == r.get("toetser"):
                return 400, "23514", "De toetser mag niet de actiehouder zijn"
            if r.get("status") == "Afgerond" and not r.get("toetser"):
                return 400, "23514", "afronden kan alleen met een toetser"
            if oud and oud["status"] == "Klaar voor toetsing" and r.get("status") != oud["status"] and uid != oud.get("toetser"):
                return 403, "42501", "Alleen de toetser van deze actie mag toetsen en afronden"
            for k in ("foto_pad", "nafoto_pad"):
                if r.get(k) and r[k] not in STATE["fotos"]:
                    return 400, "23514", "%s verwijst naar een onbekende foto" % k
        if tabel == "planning":
            if r.get("status") not in ("gepland", "uitgevoerd"):
                return 400, "23514", "planning_status_geldig"
            # echte regels (0003 planning_insert: with check (public.is_lid()) — "iedereen, ook voor een ander";
            # 0002 planning_valideer): inspecteur moet een actief profiel zijn; de inspecteur van een bestaande
            # planning wijzigen mag alleen wie hem maakte of een coördinator/hoofd
            if not actief_profiel(r.get("inspecteur")):
                return 409, "23503", "Inspecteur onbekend of niet actief"
            # 0008: plannen doet wie inspecteert, en alleen een inspecterende rol wordt ingepland
            if x["profiel"]["role"] not in ("hoofd", "coordinator", "inspecteur"):
                return 403, "42501", "new row violates row-level security policy for table \"planning\""
            if (not oud or r.get("inspecteur") != oud.get("inspecteur")) and user_by_id(r["inspecteur"])["profiel"]["role"] not in ("hoofd", "coordinator", "inspecteur"):
                return 400, "23514", "Alleen een hoofd of coördinator kan als inspecteur worden ingepland (de QHSE-manager en de beheerder inspecteren niet)"
            if oud and r.get("inspecteur") != oud.get("inspecteur") and not staf and oud.get("gemaakt_door") != uid:
                return 403, "42501", "Alleen wie de planning maakte (of een coördinator/hoofd) mag de inspecteur wijzigen"
        return None

    # ---------- /storage/v1 ----------
    def storage(self, pad, q):
        x, c = self.gebruiker()
        if not x:
            return self.stuur(400, {"statusCode": "403", "error": "Unauthorized", "message": "invalid jwt"})
        m = self.command
        if pad.startswith("object/rapporten/") and m in ("POST", "PUT"):   # 0009: één keer, eigen map, eigen inspectie
            naam = pad[len("object/rapporten/"):]
            data, mime = self.body(), self.headers.get("Content-Type", "")
            mt = re.match(r"^([0-9a-f-]{36})/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\.pdf$", naam)
            ins = mt and STATE["tables"]["inspecties"].get(mt.group(2))
            if not mt or mt.group(1) != x["id"] or not ins or ins.get("inspecteur_id") != x["id"] or x["profiel"]["role"] not in ("hoofd", "coordinator"):
                return self.stuur(400, {"statusCode": "403", "error": "Unauthorized", "message": "new row violates row-level security policy"})
            if mime != "application/pdf" or len(data) > 20 * 1024 * 1024 or not data.startswith(b"%PDF-"):
                return self.stuur(400, {"statusCode": "415", "error": "invalid_mime_type", "message": "mime type not supported"})
            if naam in STATE["rapporten"]:   # nooit overschrijven (geen update-policy), ook niet met x-upsert
                return self.stuur(400, {"statusCode": "409", "error": "Duplicate", "message": "The resource already exists"})
            STATE["rapporten"][naam] = {"data": data, "door": x["id"]}
            return self.stuur(200, {"Key": "rapporten/" + naam, "Id": str(uuid.uuid4())})
        if pad.startswith("object/authenticated/rapporten/") and m == "GET":
            naam = pad[len("object/authenticated/rapporten/"):]
            f = STATE["rapporten"].get(naam)
            if not f or not (naam.startswith(x["id"] + "/") or x["profiel"]["role"] in ("hoofd", "coordinator", "qhse", "beheerder")):
                return self.stuur(400, {"statusCode": "404", "error": "not_found", "message": "Object not found"})
            return self.stuur(200, f["data"], "application/pdf")
        if pad.startswith("object/authenticated/fotos/") and m == "GET":
            naam = pad[len("object/authenticated/fotos/"):]
            f = STATE["fotos"].get(naam)
            if not f:
                return self.stuur(400, {"statusCode": "404", "error": "not_found", "message": "Object not found"})
            return self.stuur(200, f["data"], f["mime"])
        if pad.startswith("object/fotos/") and m in ("POST", "PUT"):
            naam = pad[len("object/fotos/"):]
            data, mime = self.body(), self.headers.get("Content-Type", "")
            if not naam.startswith(x["id"] + "/") or ".." in naam or naam.rsplit(".", 1)[-1].lower() not in ("jpg", "jpeg", "png", "webp"):
                return self.stuur(400, {"statusCode": "403", "error": "Unauthorized", "message": "new row violates row-level security policy"})
            if mime not in ("image/jpeg", "image/png", "image/webp") or len(data) > 5 * 1024 * 1024:
                return self.stuur(400, {"statusCode": "415", "error": "invalid_mime_type", "message": "mime type not supported"})
            # zoals de echte policy (0005/0007, foto_in_gebruik): een foto die al als bewijs gekoppeld is (actie of eigen
            # inspectie) kan niet (opnieuw) worden geüpload, ook niet als hij nog niet (of niet meer) bestaat
            gebruikt = any(r.get(k) in (naam, "fotos/" + naam) for r in STATE["tables"]["acties"].values() for k in ("foto_pad", "nafoto_pad")) \
                or any(r.get("inspecteur_id") == x["id"] and naam in json.dumps(r.get("record"), ensure_ascii=False) for r in STATE["tables"]["inspecties"].values())
            if gebruikt:
                return self.stuur(400, {"statusCode": "403", "error": "Unauthorized", "message": "new row violates row-level security policy"})
            if naam in STATE["fotos"] and self.headers.get("x-upsert") != "true":
                return self.stuur(400, {"statusCode": "409", "error": "Duplicate", "message": "The resource already exists"})
            STATE["fotos"][naam] = {"data": data, "mime": mime, "door": x["id"]}
            return self.stuur(200, {"Key": "fotos/" + naam, "Id": str(uuid.uuid4())})
        return self.stuur(400, {"statusCode": "404", "error": "not_found", "message": "Not found"})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8331)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "webapp"))
    ap.add_argument("--demo", action="store_true", help="js/config.js niet vervangen (voorbeeldmodus)")
    ap.add_argument("--verbose", action="store_true")
    a = ap.parse_args()
    root = os.path.abspath(a.dir)

    class H(Handler):
        def __init__(self, *args, **kw):
            super().__init__(*args, directory=root, **kw)

    srv = ThreadingHTTPServer((a.host, a.port), H)
    srv.demo, srv.verbose = a.demo, a.verbose
    print("mock-supabase op http://%s:%d (app uit %s)%s" % (a.host, a.port, root, " [demo]" if a.demo else ""), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
