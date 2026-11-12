#!/usr/bin/env python3
"""DeepSeek harnas via OpenRouter.

Dun CLI-laagje rond de OpenRouter chat-completions API. Claude roept dit aan
om DeepSeek het uitvoerende werk te laten doen; Claude beoordeelt de output.

Rolverdeling per taak (wie doet wat): zie tools/DELEGATIE.md.
Leidend principe: bij twijfel doet Claude het zelf.

De API-key wordt NIET uit de omgeving gelezen: de netwerk-proxy van deze
sessie injecteert hem automatisch in de Authorization-header. Daarom staat
hier een placeholder. Buiten deze omgeving: zet OPENROUTER_API_KEY.

Functies:
  * Auto-context  - tools/CONTEXT.md wordt als systeemprompt meegestuurd.
  * Parallel      - meerdere onafhankelijke taken tegelijk via --tasks.
  * Patch-modus   - DeepSeek levert toepasbare bestandsblokken via --patch.

Gebruik:
  # losse prompt (context wordt automatisch meegestuurd)
  python3 tools/deepseek_harness.py "Schrijf een functie die ..."

  # doorlopend gesprek
  python3 tools/deepseek_harness.py --history /tmp/chat.json "Voeg tests toe"

  # patch-modus: DeepSeek levert hele bestanden in een vast formaat
  python3 tools/deepseek_harness.py --patch "Maak index.html met ..."

  # parallel: JSON-bestand [{"label": "...", "prompt": "..."}]
  python3 tools/deepseek_harness.py --tasks taken.json

  # prompt via stdin
  echo "leg deze code uit" | python3 tools/deepseek_harness.py -
"""
import argparse
import concurrent.futures
import json
import os
import sys
import urllib.request
import urllib.error

API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash-1017"
HERE = os.path.dirname(os.path.abspath(__file__))
CONTEXT_FILE = os.path.join(HERE, "CONTEXT.md")

# Vast, machine-toepasbaar formaat zodat Claude de output direct wegschrijft.
PATCH_INSTRUCTION = (
    "Lever elk te wijzigen of nieuw bestand VOLLEDIG aan, elk als een apart "
    "blok in exact dit formaat (niets ertussen, geen extra uitleg):\n"
    "=== FILE: <relatief/pad> ===\n"
    "```\n<volledige bestandsinhoud>\n```\n"
    "Herhaal dit blok per bestand. Geen diffs, geen weggelaten regels."
)


def call(messages, model, temperature, cheapest):
    key = os.environ.get("OPENROUTER_API_KEY", "proxy-injected")
    body = {"model": model, "messages": messages, "temperature": temperature}
    if cheapest:
        body["provider"] = {"sort": "price"}  # goedkoopste provider per call
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://werkplekinspectie.nl",
            "X-Title": "Werkplekinspectie DeepSeek harnas",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"_error": f"HTTP {e.code}: {e.read().decode(errors='replace')}"}
    except urllib.error.URLError as e:
        return {"_error": f"Netwerkfout: {e}"}


def build_messages(prompt, system, history_path, use_context, patch):
    messages = []
    if history_path and os.path.exists(history_path):
        with open(history_path) as f:
            messages = json.load(f)

    sys_parts = []
    if system:
        sys_parts.append(system)
    elif use_context and os.path.exists(CONTEXT_FILE):
        with open(CONTEXT_FILE) as f:
            sys_parts.append(f.read().strip())
    if patch:
        sys_parts.append(PATCH_INSTRUCTION)

    if sys_parts and not any(m.get("role") == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": "\n\n".join(sys_parts)})

    messages.append({"role": "user", "content": prompt})
    return messages


def reply_text(resp):
    if "_error" in resp:
        return None, resp["_error"]
    return resp["choices"][0]["message"]["content"], None


def main():
    ap = argparse.ArgumentParser(description="DeepSeek harnas via OpenRouter")
    ap.add_argument("prompt", nargs="?",
                    help="De prompt; '-' leest van stdin. Weglaten bij --tasks.")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--system", default=None, help="Systeemprompt (overschrijft context)")
    ap.add_argument("--no-context", action="store_true",
                    help="CONTEXT.md niet automatisch meesturen")
    ap.add_argument("--patch", action="store_true",
                    help="DeepSeek levert hele bestanden in een vast formaat")
    ap.add_argument("--history", default=None, help="JSON-bestand dat het gesprek bewaart")
    ap.add_argument("--tasks", default=None,
                    help="JSON-bestand [{label,prompt}] voor parallelle taken")
    ap.add_argument("--temperature", type=float, default=0.3)
    ap.add_argument("--no-cheapest", action="store_true", help="Niet op prijs routeren")
    ap.add_argument("--json", action="store_true", help="Volledig API-antwoord printen")
    args = ap.parse_args()

    cheapest = not args.no_cheapest
    use_context = not args.no_context

    # ---- Parallelle modus ------------------------------------------------
    if args.tasks:
        with open(args.tasks) as f:
            tasks = json.load(f)

        def run(task):
            msgs = build_messages(task["prompt"], args.system, None,
                                  use_context, args.patch)
            resp = call(msgs, args.model, args.temperature, cheapest)
            text, err = reply_text(resp)
            return task.get("label", "taak"), text, err

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(tasks))) as ex:
            results = list(ex.map(run, tasks))

        for label, text, err in results:
            print(f"\n===== {label} =====")
            print(err if err else text)
        if any(err for _, _, err in results):
            sys.exit(1)
        return

    # ---- Enkele prompt ---------------------------------------------------
    if not args.prompt:
        ap.error("geef een prompt, of gebruik --tasks")
    prompt = sys.stdin.read() if args.prompt == "-" else args.prompt

    messages = build_messages(prompt, args.system, args.history, use_context, args.patch)
    resp = call(messages, args.model, args.temperature, cheapest)

    if args.json:
        print(json.dumps(resp, indent=2, ensure_ascii=False))
        return

    text, err = reply_text(resp)
    if err:
        sys.stderr.write(err + "\n")
        sys.exit(1)
    print(text)

    usage = resp.get("usage", {})
    if usage:
        sys.stderr.write(
            f"\n[tokens in={usage.get('prompt_tokens')} "
            f"out={usage.get('completion_tokens')} model={resp.get('model')}]\n"
        )

    if args.history:
        messages.append({"role": "assistant", "content": text})
        with open(args.history, "w") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
