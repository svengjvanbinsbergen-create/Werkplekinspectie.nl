#!/usr/bin/env python3
"""Werkplekinspectie — lokale nep-Supabase voor tests (alleen Python-standaardbibliotheek).

Serveert op één poort (zelfde origin, dus de CSP connect-src 'self' volstaat):
  - de statische app uit webapp/ (met een ingevulde js/config.js die naar deze server wijst)
  - /auth/v1     token (password, refresh_token), user (GET/PUT), logout, recover, factors (TOTP)
  - /rest/v1     profiles, inspecties, acties, planning, actie_log (+ rpc/report_security_event)
  - /storage/v1  object/fotos/<pad> (upload) en object/authenticated/fotos/<pad> (download)
  - /__mock/...  testhulp: state (alles bekijken), fail (volgende verzoeken laten mislukken; optioneel alleen
                 voor één pad/methode: fail?n=1&status=503&pad=/rest/v1/inspecties&methode=POST), reset,
                 maxrows (PostgREST max-rows nabootsen; filters eq/is/gt/gte/lt/lte/in, order, limit, select)

Dit is GEEN beveiligde server en bootst maar een klein deel van Supabase na (een paar RLS- en
triggerregels uit supabase/migrations, zodat de client-validatie echt getest wordt). Waar het voor de
client uitmaakt volgt de mock de ECHTE regels, ook als die ruimer zijn (bijv. planning: iedereen mag
inplannen, ook voor een ander — 0003_rls_rechten.sql), zodat tests geen strengere server veronderstellen.
Alleen voor lokaal testen: python3 tools/mock_supabase.py --port 8331 [--dir webapp] [--demo]

Testaccounts (wachtwoord voor allemaal: Veilig-Wachtwoord-2026):
  inspecteur@noardling.test  (inspecteur)   winfred@noardling.test (coordinator)
  douwe@noardling.test       (coordinator)  bjorn@noardling.test   (hoofd, MFA verplicht)
  inactief@noardling.test    (inspecteur, actief=false)
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import struct
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

ANON = "mock-anon-key"
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
    users = [u(1, "inspecteur@noardling.test", "Ingrid Inspecteur", "inspecteur", "Inspecteur op locatie"),
             u(2, "winfred@noardling.test", "Winfred Loerts", "coordinator", "Montage Coördinator"),
             u(3, "douwe@noardling.test", "Douwe de Boer", "coordinator", "Montage Coördinator"),
             u(4, "bjorn@noardling.test", "Björn Sloos", "hoofd", "Hoofd Service & Montage"),
             u(5, "inactief@noardling.test", "Oud Medewerker", "inspecteur", "Inspecteur", actief=False)]
    return {"users": {x["email"]: x for x in users}, "sessions": {}, "refresh": {}, "challenges": {},
            "tables": {"inspecties": {}, "acties": {}, "planning": {}}, "actie_log": [], "security_events": [],
            "fotos": {}, "recover": [], "logins": [], "fail": {"n": 0, "status": 503, "pad": "", "methode": "", "code": ""}, "requests": [], "max_rows": 1000}


STATE = nieuwe_state()


def user_by_id(uid):
    for x in STATE["users"].values():
        if x["id"] == uid:
            return x
    return None


def profiel_rij(x):
    p = x["profiel"]
    return {"id": x["id"], "full_name": p["full_name"], "functie": p["functie"], "role": p["role"], "actief": p["actief"]}


def user_json(x):
    return {"id": x["id"], "aud": "authenticated", "role": "authenticated", "email": x["email"],
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
        if p.startswith(("/auth/v1/", "/rest/v1/", "/storage/v1/")):
            with LOCK:
                STATE["requests"].append({"t": nu_iso(), "m": self.command, "p": p, "q": u.query})
                if self.headers.get("apikey") != ANON:
                    return self.stuur(401, {"message": "No API key found in request"})
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
                s = {k: v for k, v in STATE.items() if k not in ("fotos", "users", "refresh")}
                s["fotos"] = [{"pad": k, "mime": v["mime"], "grootte": len(v["data"]), "exif": b"Exif" in v["data"][:4096],
                               "door": v["door"]} for k, v in STATE["fotos"].items()]
                s["users"] = [{"email": x["email"], "id": x["id"], "factors": x["factors"]} for x in STATE["users"].values()]
                return self.stuur(200, s)
            if p == "/__mock/fail":
                STATE["fail"] = {"n": int(q.get("n", "1")), "status": int(q.get("status", "503")), "pad": q.get("pad", ""), "methode": q.get("methode", ""), "code": q.get("code", "")}
                return self.stuur(200, STATE["fail"])
            if p == "/__mock/maxrows":   # PostgREST max-rows nabootsen (Supabase-standaard 1000)
                STATE["max_rows"] = int(q.get("n", "1000"))
                return self.stuur(200, {"max_rows": STATE["max_rows"]})
            if p == "/__mock/reset":
                STATE = nieuwe_state()
                return self.stuur(200, {"ok": True})
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
                ok = bool(x and hmac.compare_digest(x["password"], str(b.get("password", ""))))
                STATE["logins"].append({"email": mail, "ok": ok, "t": time.time()})
                if not ok:
                    return self.stuur(400, {"code": "invalid_credentials", "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
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
                return self.stuur(200, sessie_uitgeven(user_by_id(s["uid"]), s["aal"], r["sid"]))
            return self.stuur(400, {"msg": "unsupported_grant_type"})
        if pad == "recover" and m == "POST":
            b = self.jbody() or {}
            STATE["recover"].append({"email": str(b.get("email", "")).lower(), "redirect_to": q.get("redirect_to"), "t": nu_iso()})
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
        if tabel == "rpc/report_security_event" and m == "POST":
            b = self.jbody() or {}
            STATE["security_events"].append({"id": len(STATE["security_events"]) + 1, "t": nu_iso(), "wie": x["id"],
                                             "soort": b.get("p_soort"), "details": b.get("p_details") or {}})
            return self.stuur(200, True)
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
        if tabel == "actie_log":
            if m == "GET":
                zicht = set(self.zichtbaar("acties", x))
                return self.stuur(200, resultaat([r for r in STATE["actie_log"] if r["actie_id"] in zicht and past(r)]))
            if m == "POST":
                b = self.jbody()
                for r in (b if isinstance(b, list) else [b]):
                    if r.get("actie_id") not in STATE["tables"]["acties"]:
                        return self.fout(403, "42501", "new row violates row-level security policy for table \"actie_log\"")
                    STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": r["actie_id"], "t": nu_iso(), "wie": x["id"], "wat": str(r.get("wat", ""))[:2000]})
                return self.stuur(201)
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
                        STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": r["id"], "t": nu_iso(), "wie": x["id"], "wat": "Aangemaakt met status %s" % nieuw["status"]})
                    elif oud.get("status") != nieuw["status"]:
                        STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": r["id"], "t": nu_iso(), "wie": x["id"], "wat": "Status: %s → %s" % (oud["status"], nieuw["status"])})
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
                    STATE["actie_log"].append({"id": len(STATE["actie_log"]) + 1, "actie_id": i, "t": nu_iso(), "wie": x["id"], "wat": "Status: %s → %s" % (oud.get("status"), nieuw.get("status"))})
                T[i] = nieuw
                uit.append(nieuw)
            return self.stuur(200, uit) if "return=representation" in self.headers.get("Prefer", "") else self.stuur(204)
        return self.fout(405, "PGRST", "method not allowed")

    def zichtbaar(self, tabel, x):
        T, rol, uid = STATE["tables"][tabel], x["profiel"]["role"], x["id"]
        if rol in ("hoofd", "coordinator", "qhse"):
            return list(T)
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
            if oud and r.get("inspecteur") != oud.get("inspecteur") and not staf and oud.get("gemaakt_door") != uid:
                return 403, "42501", "Alleen wie de planning maakte (of een coördinator/hoofd) mag de inspecteur wijzigen"
        return None

    # ---------- /storage/v1 ----------
    def storage(self, pad, q):
        x, c = self.gebruiker()
        if not x:
            return self.stuur(400, {"statusCode": "403", "error": "Unauthorized", "message": "invalid jwt"})
        m = self.command
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
