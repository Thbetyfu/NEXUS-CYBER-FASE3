# Dataset lab NEX-AI

Pengumpul: `python NEX-AI/scripts/collect_lab_dataset.py`

Label mengikuti **keputusan gateway** (ALLOWED / BLOCKED / honeypot / rate-limit), bukan keluaran LLM.

## Sumber

1. `nexus_traffic.log` (JSONL telemetri) jika ada — termasuk request yang sudah diblokir Reflex.
2. Kasus **BENIGN** dari `NEX-AI/evaluation/benchmark_cases.json`.
3. Seed path lab (`/`, `/api/telemetry`, checkout JSON, dsb.).

Tidak membuat wordlist exploit. Baris BLOCKED hanya muncul jika sudah ada di log lab.

## Keluaran (lokal, tidak di-commit)

- `NEX-AI/dataset/lab/lab_collected.jsonl`
- `NEX-AI/dataset/lab/lab_collected.summary.json`

Setelah stack lab jalan dan ada trafik ke `:80`/`:8080`, jalankan ulang (pengumpul mencoba `docker cp` dari `nexus-local-gateway:/app/nexus_traffic.log` jika file tidak ada di host):

```bash
python NEX-AI/scripts/collect_lab_dataset.py
```
