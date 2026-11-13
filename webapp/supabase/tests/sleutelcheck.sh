#!/bin/sh
# Controle vóór elke deploy: staat er een geheime Supabase-sleutel in webapp/?
# Geen uitvoer = goed. Vindt secret keys (sb_secret_…) en JWT-sleutels met een andere rol dan anon
# (bv. service_role). Gebruik vanuit de repo-root: sh webapp/supabase/tests/sleutelcheck.sh webapp
W=${1:-webapp}
if [ ! -d "$W" ]; then echo "Map $W bestaat niet (draai vanuit de repo-root of geef de map mee)" >&2; exit 2; fi
grep -rnoE "sb_secret_[A-Za-z0-9_-]{8,}" "$W" | sed 's/^/LEK (secret key): /'
python3 - "$W" <<'PY'
import base64, json, pathlib, re, sys
for f in pathlib.Path(sys.argv[1]).rglob("*"):
    if not f.is_file() or f.suffix not in (".js", ".html", ".json", ".webmanifest", ".txt", ".md"):
        continue
    for t in re.findall(r"eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+", f.read_text(errors="ignore")):
        try:
            rol = json.loads(base64.urlsafe_b64decode(t + "=" * (-len(t) % 4))).get("role")
        except Exception:
            continue
        if rol != "anon":
            print(f"LEK (JWT met rol {rol}): {f}")
PY
