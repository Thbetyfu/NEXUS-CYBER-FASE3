# NEX-RED: Nexus Cyber Security Validation Engine

NEX-RED is the **Nexus-owned** white-box + live-posture engine for Nexus Cyber.

It is **not** Shannon and **not** Strix. Those products are multi-year LLM pentest agents with sandboxes and exploit validation. NEX-RED v4 is the first honest step toward that class of engine: real static analysis, optional LLM confirmation, live recon, and evidence-backed reports.

## What v4 actually does

1. **White-box (Python AST)** — parses Python with the CPython AST to find dynamic SQL, command, eval, pickle/YAML, SSRF-ish URL sinks, hardcoded secrets, unverified JWT decode, IDOR object lookups, and mutating Flask routes without auth.
2. **White-box (Go / JS / PHP patterns)** — conservative pattern candidates with lower confidence (including `jwt.ParseUnverified`, `jwt.decode`, and `findById(req.params.id)`).
3. **LLM verifier (optional)** — asks NEX-AI / Ollama to confirm or drop high-severity static findings. Requests remediations only. Disabled automatically if the model is offline.
4. **Live recon** — maps links and reports missing security headers.
5. **Black-box posture** — benign JSON probes to measure reachability and defensive 403s. Does not send exploit payloads.
6. **Evidence gate** — findings without file:line or HTTP evidence are dropped.

## What v4 does not do yet

- Autonomous multi-agent pentest (Shannon/Strix class)
- Proof-by-exploitation
- Browser automation, HTTP intercepting proxy, or pentest toolkits
- 0% false-positive guarantee

## CLI

```bash
# White-box AST on a repository (no live target required)
python NEX-RED/nexred.py scan -r ./playground/Portofolio-Thoriq -m whitebox --no-llm

# Hybrid: source analysis + live posture
python NEX-RED/nexred.py scan -u http://127.0.0.1:8080 -r . -m hybrid --no-llm

# Bridge for the Go gateway / dashboard
python NEX-RED/nexred.py bridge -p 3004
```

LLM verification uses `NEX_AI_ENDPOINT` / `NEX_AI_MODEL_REASONING` (same family as the gateway). Omit `--no-llm` when Ollama is running.

## Tests

```bash
python -m unittest NEX-RED.tests.test_nexred NEX-RED.tests.test_benchmark
```

That path only works as a package. From `NEX-RED/`:

```bash
python -m unittest tests.test_nexred tests.test_benchmark
python nexred.py benchmark
```

## Benchmark vs Shannon & Strix

```bash
python NEX-RED/nexred.py benchmark
```

This scores NEX-RED SAST precision/recall on a labeled corpus, compares class coverage to Shannon's core pentest classes and Strix's skill list, and reads Shannon's published sample reports as a reference. It will **not** claim pentest parity: Shannon/Strix measure proof-by-exploitation; NEX-RED v4 does not. Exit code `2` means not equal.

## Jalan B — mesin native (bukan merge Shannon/Strix)

Jika NEX-RED harus **setara** lewat produk milik Nexus sendiri, ikuti peta kerja ini (bukan Jalan A/C):

- [Alur, arsitektur, fase 0–6, definisi setara](./docs/PATH_B_NATIVE_ENGINE.md)
- [Checklist eksekusi](./docs/PATH_B_CHECKLIST.md)

