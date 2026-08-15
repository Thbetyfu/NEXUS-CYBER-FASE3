# NEX-RED: Nexus Cyber Security Validation Engine

NEX-RED is the **Nexus-owned** white-box + live HTTP engine for Nexus Cyber.

It is **not** Shannon and **not** Strix. v5 is Jalan B **Fase 0–4 irisan**: SAST, job async, pemeriksaan HTTP tanpa sesi, dua akun, browser lab opsional. Bukan proof-by-exploitation.

## What v5 actually does

1. **White-box (Python AST)** — dynamic SQL, command, eval, pickle/YAML, SSRF-ish URL sinks, hardcoded secrets, unverified JWT, IDOR lookups, mutating Flask routes without auth.
2. **White-box (Go / JS / PHP patterns)** — conservative candidates.
3. **LLM verifier (optional)** — confirm/drop static findings; remediations only.
4. **Live recon** — links and missing security headers.
5. **Black-box posture** — benign JSON probes.
6. **Live HTTP checks** — unauthenticated mutating route, public telemetry must not be SOC, WAF 403 = `mitigated_by_nexus`, **two accounts** (peer must not read owner's object).
7. **Browser lab (optional)** — `NEX_RED_BROWSER=1` plus Playwright: benign gallery upload and five wrong vault passwords. Screenshots stay under `NEX-RED/workspaces/`.
8. **Jobs** — `POST /api/v1/scan` default `async_run=true`; poll `GET /api/v1/scan/{id}`.
9. **Evidence gate** — no file:line or HTTP status → dropped.

Two-account live check needs a lab pair: `POST /nexred/lab/session-pair` returning JSON `owner_token`, `peer_token`, `object_path`, **or** env `NEX_RED_IDOR_OWNER_TOKEN` / `NEX_RED_IDOR_PEER_TOKEN` / `NEX_RED_IDOR_OBJECT_PATH`. Tokens are not written into reports. Without a pair, the check is `sast_only` (not a pass and not a fake IDOR).

```bash
pip install -r NEX-RED/requirements-browser.txt
python -m playwright install chromium
set NEX_RED_BROWSER=1
```

## What v5 does not do yet

- Shannon/Strix-class multi-agent pentest
- Proof-by-exploitation or exploit wordlists
- Completing Gallery/vault through the hotspot PoW splash (skipped as `sast_only`)
- Full Docker egress lock (image + Python allow-list only)
- 0% false-positive guarantee

RoE: [`docs/ROE.md`](./docs/ROE.md). Live target: `NEX_RED_LIVE_TARGET` (lewat WAF, bukan Vercel langsung).

## CLI

```bash
python NEX-RED/nexred.py scan -r ./playground/Portofolio-Thoriq -m whitebox --no-llm
python NEX-RED/nexred.py scan -u http://127.0.0.1 -r . -m hybrid --no-llm
python NEX-RED/nexred.py bridge -p 3004
```

## Tests

```bash
cd NEX-RED
python -m unittest tests.test_nexred tests.test_live_http tests.test_browser tests.test_benchmark
python nexred.py benchmark
```

Benchmark **will not** claim pentest parity. Exit code `2` means not equal.

## Jalan B

- [PATH_B_NATIVE_ENGINE.md](./docs/PATH_B_NATIVE_ENGINE.md)
- [PATH_B_CHECKLIST.md](./docs/PATH_B_CHECKLIST.md)
