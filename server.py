"""Mirai AI Analyst local server.

Serves the website and connects "Ask Mirai" to an AI model.
Default: Google Gemini (free tier). Optional: Claude.
No packages to install. Needs Python 3.8+.

    python server.py        then open  http://localhost:8000
"""
import base64
import json
import mimetypes
import os
import re
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "website"


def load_env():
    """Read KEY=VALUE lines from the .env file next to this script."""
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
GEMINI_KEY = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
CLAUDE_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
PROVIDER = os.environ.get("MIRAI_PROVIDER", "").strip().lower()
if PROVIDER not in ("gemini", "claude"):
    PROVIDER = "claude" if (CLAUDE_KEY and not GEMINI_KEY) else "gemini"
HAS_KEY = bool(GEMINI_KEY if PROVIDER == "gemini" else CLAUDE_KEY)
if PROVIDER == "gemini":
    MODEL = os.environ.get("GEMINI_MODEL", "").strip() or "gemini-flash-latest"
    API_BASE = os.environ.get("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta")
else:
    MODEL = os.environ.get("MIRAI_MODEL", "claude-sonnet-5-5")
    API_BASE = os.environ.get("ANTHROPIC_API_URL", "https://api.anthropic.com/v1/messages")
PORT = int(os.environ.get("PORT", "8000"))
MAX_BODY = 3_000_000
LOCAL_ORIGIN = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")


class ApiError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.message, self.status = message, status


def _post(url, headers, payload, retries=2):
    """POST JSON, retry a couple of times when the provider is briefly busy."""
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read()).get("error", {})
                msg = msg.get("message", "") if isinstance(msg, dict) else str(msg)
            except Exception:
                msg = ""
            if e.code in (500, 503) and attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise ApiError(msg or "The AI service returned an error (%s)." % e.code, e.code)
        except Exception as e:
            raise ApiError("Could not reach the AI service: %s" % e)


# ---------- Claude (optional) ----------
def call_claude(msgs, tools):
    payload = {"model": MODEL, "max_tokens": 1500, "messages": msgs}
    if tools:
        payload["tools"] = [
            {"name": t["name"], "description": t.get("description", ""), "input_schema": t["input_schema"]}
            for t in tools
        ]
    try:
        return _post(API_BASE, {"x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"}, payload)
    except ApiError as e:
        if e.status == 401:
            e.message = "The API key was rejected. Check ANTHROPIC_API_KEY in the .env file."
        elif e.status == 429:
            e.message = "Too many requests or no credit left on your Anthropic account."
        raise


# ---------- Gemini ----------
def _enc_id(i, sig):
    """Gemini 3 models need a 'thought signature' sent back with each function call.
    We hide it inside the call id, which the browser already echoes back to us."""
    raw = json.dumps({"i": i, "s": sig or ""}).encode()
    return "g" + base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _dec_sig(cid):
    try:
        b = cid[1:]
        b += "=" * (-len(b) % 4)
        return json.loads(base64.urlsafe_b64decode(b)).get("s") or None
    except Exception:
        return None


def to_schema(s):
    if not isinstance(s, dict):
        return {"type": "STRING"}
    t = str(s.get("type", "string")).upper()
    o = {"type": t}
    if s.get("description"):
        o["description"] = s["description"]
    if t == "OBJECT":
        o["properties"] = {k: to_schema(v) for k, v in (s.get("properties") or {}).items()}
        if s.get("required"):
            o["required"] = s["required"]
    elif t == "ARRAY":
        o["items"] = to_schema(s.get("items") or {"type": "string"})
    elif t == "STRING" and s.get("enum"):
        o["enum"] = [str(x) for x in s["enum"]]
    return o


def to_contents(msgs):
    names, out = {}, []
    for m in msgs:
        role = "model" if m.get("role") == "assistant" else "user"
        c = m.get("content")
        parts = []
        if isinstance(c, str):
            parts.append({"text": c if c.strip() else "(empty)"})
        else:
            for b in c or []:
                t = b.get("type")
                if t == "text" and (b.get("text") or "").strip():
                    parts.append({"text": b["text"]})
                elif t == "tool_use":
                    names[b["id"]] = b["name"]
                    p = {"functionCall": {"name": b["name"], "args": b.get("input") or {}}}
                    sig = _dec_sig(b["id"])
                    if sig:
                        p["thoughtSignature"] = sig
                    parts.append(p)
                elif t == "tool_result":
                    raw = b.get("content")
                    try:
                        val = json.loads(raw) if isinstance(raw, str) else raw
                    except Exception:
                        val = raw
                    parts.append({"functionResponse": {"name": names.get(b.get("tool_use_id"), "query_data"), "response": {"result": val}}})
        if parts:
            out.append({"role": role, "parts": parts})
    return out


def _get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception:
        return {}


AVAILABLE = []


def pick_model():
    """Ask Google which models this key can use and choose a good free Flash model."""
    global AVAILABLE
    j = _get("%s/models?pageSize=200" % API_BASE.rstrip("/"), {"x-goog-api-key": GEMINI_KEY})
    names = [
        m["name"].split("/", 1)[-1]
        for m in j.get("models", [])
        if "generateContent" in (m.get("supportedGenerationMethods") or [])
    ]
    AVAILABLE = names
    prefer = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
    for p in prefer:
        if p in names:
            return p
    flash = [n for n in names if "flash" in n and "image" not in n and "tts" not in n and "live" not in n]
    return flash[0] if flash else None


def call_gemini(msgs, tools):
    """Call Gemini. If the model name is not found, pick a working one automatically."""
    global MODEL
    try:
        return _gemini_once(msgs, tools)
    except ApiError as e:
        if e.status != 404:
            raise
        alt = pick_model()
        if alt and alt != MODEL:
            print("Model %s was not found. Switching to %s" % (MODEL, alt))
            MODEL = alt
            return _gemini_once(msgs, tools)
        shown = ", ".join(AVAILABLE[:8]) or "none found"
        raise ApiError("No working Gemini model found for your key. Models your key can use: %s. Set GEMINI_MODEL in the .env file to one of them." % shown, 404)


def _gemini_once(msgs, tools):
    payload = {
        "contents": to_contents(msgs),
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
    }
    if tools:
        payload["tools"] = [{"functionDeclarations": [
            {"name": t["name"], "description": t.get("description", ""), "parameters": to_schema(t["input_schema"])}
            for t in tools
        ]}]
    url = "%s/models/%s:generateContent" % (API_BASE.rstrip("/"), MODEL)
    try:
        j = _post(url, {"x-goog-api-key": GEMINI_KEY, "content-type": "application/json"}, payload)
    except ApiError as e:
        if e.status in (400, 403) and "api key" in e.message.lower():
            e.message = "The Gemini API key was rejected. Check GEMINI_API_KEY in the .env file."
        elif e.status == 404:
            e.message = "Model '%s' was not found. Set GEMINI_MODEL in the .env file (for example gemini-2.5-flash)." % MODEL
        elif e.status == 429:
            e.message = "Gemini free-tier limit reached (it allows only a few requests per minute and per day). Wait a minute and try again."
        elif e.status in (500, 503):
            e.message = "Gemini is busy right now. Try again in a moment."
        raise
    cands = j.get("candidates") or []
    if not cands:
        why = (j.get("promptFeedback") or {}).get("blockReason", "")
        raise ApiError("Gemini returned no answer%s." % (" (blocked: %s)" % why if why else ""), 502)
    cand = cands[0]
    blocks, calls = [], 0
    for p in (cand.get("content") or {}).get("parts") or []:
        if p.get("thought"):
            continue
        if "functionCall" in p:
            fc = p["functionCall"]
            blocks.append({"type": "tool_use", "id": _enc_id(calls, p.get("thoughtSignature")), "name": fc.get("name", ""), "input": fc.get("args") or {}})
            calls += 1
        elif p.get("text"):
            blocks.append({"type": "text", "text": p["text"]})
    fin = cand.get("finishReason", "")
    stop = "tool_use" if calls else ("max_tokens" if fin == "MAX_TOKENS" else "end_turn")
    if not blocks and not calls:
        blocks.append({"type": "text", "text": "I could not produce an answer for that. Try rephrasing the question."})
    return {"content": blocks, "stop_reason": stop}


class Handler(BaseHTTPRequestHandler):
    server_version = "Mirai/1.1"

    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        origin = self.headers.get("Origin", "")
        # Only pages served from your own computer may use this server (protects your API key).
        if LOCAL_ORIGIN.match(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/health":
            return self._send(200, {"ok": True, "ai": HAS_KEY, "provider": PROVIDER, "model": MODEL})
        rel = "index.html" if path in ("", "/") else path.lstrip("/")
        f = (WEB / rel).resolve()
        if WEB.resolve() not in f.parents or not f.is_file():
            return self._send(404, {"error": "Not found"})
        ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        self._send(200, f.read_bytes(), ctype)

    def do_POST(self):
        if self.path != "/api/chat":
            return self._send(404, {"error": "Not found"})
        if not HAS_KEY:
            name = "GEMINI_API_KEY" if PROVIDER == "gemini" else "ANTHROPIC_API_KEY"
            return self._send(503, {"error": "%s is missing. Add it to the .env file and restart the server." % name})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if n <= 0 or n > MAX_BODY:
                return self._send(413, {"error": "Request is empty or too large."})
            data = json.loads(self.rfile.read(n))
            msgs, tools = data.get("messages"), data.get("tools") or []
            if not isinstance(msgs, list) or not msgs or len(msgs) > 40 or len(tools) > 5:
                return self._send(400, {"error": "Bad request."})
        except Exception:
            return self._send(400, {"error": "Bad request."})
        try:
            result = call_gemini(msgs, tools) if PROVIDER == "gemini" else call_claude(msgs, tools)
            return self._send(200, result)
        except ApiError as e:
            return self._send(502, {"error": e.message})
        except Exception as e:
            return self._send(502, {"error": "Unexpected server error: %s" % e})


if __name__ == "__main__":
    print("Mirai AI Analyst is running:  http://localhost:%d" % PORT)
    if HAS_KEY:
        print("Ask Mirai AI: ON  (%s, model %s)" % (PROVIDER, MODEL))
    else:
        print("Ask Mirai AI: OFF  (add %s to the .env file)" % ("GEMINI_API_KEY" if PROVIDER == "gemini" else "ANTHROPIC_API_KEY"))
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()