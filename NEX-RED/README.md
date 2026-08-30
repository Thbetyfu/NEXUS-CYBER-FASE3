# NEX-RED: Nexus Cyber Security Validation Engine

**GaaS:** wasit **Alur B** — defense delta + antibody loop + **Job Cowork** (`NEX-RED/jobs/`).

**Model produk:** [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md)

NEX-RED is the **Nexus-owned** white-box + live HTTP engine for Nexus Cyber.

It is **not** Shannon and **not** Strix. v5 is Jalan B **Fase 0–5 plus lab Juice Shop (Fase 6 irisan)**: SAST, planner LLM JSON (allow-list), live HTTP, sandbox opsional, agen bernama, skor kelas Juice Shop. Bukan proof-by-exploitation.

## What v5 actually does

1. **White-box (Python AST)** — dynamic SQL, command, eval, pickle/YAML, SSRF-ish URL sinks, hardcoded secrets, unverified JWT, IDOR lookups, mutating Flask routes without auth.
2. **White-box (Go / JS / PHP patterns)** — conservative candidates.
3. **LLM verifier + planner (optional)** — confirm/drop static findings; propose JSON live *checks* from an allow-list (`verify_jwt_rejects_unverified` → GET without session). `--no-llm` uses the deterministic plan only. Never asks for exploit payloads.
4. **Live recon** — links and missing security headers.
5. **Black-box posture** — benign JSON probes.
6. **Live HTTP checks** — unauthenticated mutating route, public telemetry must not be SOC, WAF 403 = `mitigated_by_nexus`, **two accounts**, and **GET object without a session** (CWE-639).
7. **Browser lab (optional)** — `NEX_RED_BROWSER=1` plus Playwright: benign gallery upload and five wrong vault passwords **through WAF** when a lab session exists (`NEX_RED_LAB_SESSION_TOKEN` matching gateway `NEXUS_LAB_SESSION_TOKEN` → `POST /api/verify-session` → `nexus_session`). Chromium MAP-s `PROTECTED_HOST` to the WAF IP (same bind as Job HTTP; no hosts file). Without that token, named-host PoW is recorded as `sast_only` (visitor Matrix Verification stays on). Screenshots stay under `NEX-RED/workspaces/`.
8. **Job Cowork (GaaS)** — `nexred.py job run|approve|export`; bridge `POST /api/v1/jobs`; status `OPEN` → `CLOSED_OK`/`CLOSED_GAP`.
9. **Scan jobs** — `POST /api/v1/scan` default `async_run=true`; poll `GET /api/v1/scan/{id}`.
10. **Named agents** — `recon`, `injection-hygiene` (benign JSON / 500), `access` (session/IDOR/object GET), `reporter` (dedup). One agent exception → scan `PARTIAL`, others still run. Report has an **Agents** table.
11. **Juice Shop lab** — `lab-juice` / `benchmark --live` against `http://127.0.0.1:3003`. Twelve benign checks. 401 is `rejected`. Does not flip `equal_to_shannon_strix`.
12. **Defense delta (Sprint 1)** — optional twin: same benign request to WAF and lab origin (`NEX_RED_ORIGIN_DIRECT`, loopback/RFC1918/Docker only). Replay at the edge after a 403. Labels: `waf_blocked` / `origin_open` / `both_held` / `replay_held`. Not Shannon parity.
13. **Evidence gate** — no file:line or HTTP status → dropped.
14. **Sandbox (optional)** — `nexred.py sandbox` / `NEX-RED/sandbox/START.bat`: non-root image, no Docker socket. Missing Docker → exit 3; use `scan` on the laptop.
15. **Antibody loop (Sprint 2)** — GET `/nexred/lab/antibody-signal` (count only) then POST `/nexred/lab/vaccine-probe` (constant lab token, not an exploit). Replay must stay 403 and `antibody_count >= 1` → `antibody_learned`. SOC `/api/antibodies` stays off the WAF.
16. **Hotspot harness (Sprint 3)** — on a private non-loopback target (or `NEX_RED_HOTSPOT_HARNESS=1`): SOC `:8081`/`:3001` and Postgres/Redis must not answer; honeypot `:9090` is recorded as tarpit, not Cowrie. Vault 5× remains the optional browser flow.

Two-account live check needs a lab pair: `POST /nexred/lab/session-pair` returning JSON `owner_token`, `peer_token`, `object_path`, **or** env `NEX_RED_IDOR_OWNER_TOKEN` / `NEX_RED_IDOR_PEER_TOKEN` / `NEX_RED_IDOR_OBJECT_PATH`. Tokens are not written into reports. Without a pair, the check is `sast_only` (not a pass and not a fake IDOR).

```bash
pip install -r NEX-RED/requirements-browser.txt
python -m playwright install chromium
set NEX_RED_BROWSER=1
rem Optional lab session (same value as gateway NEXUS_LAB_SESSION_TOKEN):
rem set NEX_RED_LAB_SESSION_TOKEN=...
```

Di Windows, Chromium dan temp Job **ikut drive NEX-RED** (`workspaces/.playwright-browsers`), bukan `C:\Temp`. Install: `NEX-RED/INSTALL-PLAYWRIGHT.bat`. Binary hilang = skip `sast_only`, bukan crash Job.

## What v5 does not do yet

- Shannon/Strix-class proof-by-exploitation or exploit wordlists
- Completing Gallery/vault on named-host PoW **without** a lab session (honest `sast_only`; visitors still solve Matrix Verification)
- Full Docker egress lock (image + Python allow-list only)
- 0% false-positive guarantee

RoE: [`docs/ROE.md`](./docs/ROE.md). Live target: `NEX_RED_LIVE_TARGET` / Job `http://{PROTECTED_HOST}` — agen HTTP **dan** Playwright bind TCP ke `NEXUS_GATEWAY_URL` + header `Host` / Chromium MAP (bukan Vercel langsung; bukan file hosts wajib). Juice Shop: [`lab/juice-shop/README.md`](./lab/juice-shop/README.md). Sandbox: [`sandbox/README.md`](./sandbox/README.md).

## CLI

```bash
python NEX-RED/nexred.py scan -r ./playground/Portofolio-Thoriq -m whitebox --no-llm
python NEX-RED/nexred.py scan -u http://127.0.0.1 -r . -m hybrid --no-llm
python NEX-RED/nexred.py lab-juice
python NEX-RED/nexred.py benchmark --live
python NEX-RED/nexred.py llm-eval
python NEX-RED/nexred.py sandbox
python NEX-RED/nexred.py bridge -p 3004
```

## Tests

```bash
cd NEX-RED
python -m unittest tests.test_nexred tests.test_live_http tests.test_waf_bind tests.test_hotspot_harness tests.test_browser tests.test_benchmark tests.test_juice_lab tests.test_crew tests.test_sandbox tests.test_planner tests.test_llm_eval tests.test_modelfiles tests.test_job_cowork
python nexred.py benchmark
python nexred.py lab-juice
python nexred.py llm-eval
```

`llm-eval` hanya `nex-ai-protect`. Tidak ada fallback Qwen/Llama.

Benchmark **will not** claim pentest parity. Exit code `2` means not equal.

## Jalan B

- [PATH_B_NATIVE_ENGINE.md](./docs/PATH_B_NATIVE_ENGINE.md)
- [PATH_B_CHECKLIST.md](./docs/PATH_B_CHECKLIST.md)
