#!/usr/bin/env python3
"""DeepSeek harnas via OpenRouter.

Dun CLI-laagje rond de OpenRouter chat-completions API. Claude roept dit aan
om DeepSeek het uitvoerende werk te laten doen; Claude beoordeelt de output.

De API-key wordt NIET uit de omgeving gelezen: de netwerk-proxy van deze
sessie injecteert hem automatisch in de Authorization-header. Daarom staat
hier een placeholder. Buiten deze omgeving: zet OPENROUTER_API_KEY.

Gebruik:
  # losse prompt
  python3 tools/deepseek_harness.py "Schrijf een functie die ..."

  # met systeemprompt en gesprek dat blijft doorlopen (history-bestand)
  python3 tools/deepseek_harness.py --system "Je bent een senior dev." \
      --history /tmp/chat.json "Voeg tests toe"

  # prompt via stdin
  echo "leg deze code uit" | python3 tools/deepseek_harness.py -
"""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error

API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash-1017"


def call(messages, model, temperature, cheapest):
    # Proxy injecteert de echte key; placeholder volstaat binnen de sessie.
    key = os.environ.get("OPENROUTER_API_KEY", "proxy-injected")
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if cheapest:
        # Laat OpenRouter per call de goedkoopste provider kiezen.
        body["provider"] = {"sort": "price"}

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
        sys.stderr.write(f"HTTP {e.code}: {e.read().decode(errors='replace')}\n")
        sys.exit(1)
    except urllib.error.URLError as e:
        sys.stderr.write(f"Netwerkfout: {e}\n")
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser(description="DeepSeek harnas via OpenRouter")
    ap.add_argument("prompt", help="De prompt; gebruik '-' om van stdin te lezen")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--system", default=None, help="Systeemprompt")
    ap.add_argument("--history", default=None,
                    help="JSON-bestand dat het gesprek bewaart en doorzet")
    ap.add_argument("--temperature", type=float, default=0.3)
    ap.add_argument("--no-cheapest", action="store_true",
                    help="Niet op laagste prijs routeren")
    ap.add_argument("--json", action="store_true",
                    help="Volledig API-antwoord printen i.p.v. alleen de tekst")
    args = ap.parse_args()

    prompt = sys.stdin.read() if args.prompt == "-" else args.prompt

    messages = []
    if args.history and os.path.exists(args.history):
        with open(args.history) as f:
            messages = json.load(f)
    if args.system and not any(m.get("role") == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": args.system})
    messages.append({"role": "user", "content": prompt})

    resp = call(messages, args.model, args.temperature, not args.no_cheapest)

    if args.json:
        print(json.dumps(resp, indent=2, ensure_ascii=False))
        return

    reply = resp["choices"][0]["message"]["content"]
    print(reply)

    usage = resp.get("usage", {})
    if usage:
        sys.stderr.write(
            f"\n[tokens in={usage.get('prompt_tokens')} "
            f"out={usage.get('completion_tokens')} "
            f"model={resp.get('model')}]\n"
        )

    if args.history:
        messages.append({"role": "assistant", "content": reply})
        with open(args.history, "w") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
