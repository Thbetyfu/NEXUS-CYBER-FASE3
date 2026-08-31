# Runtime NEX-AI (kontrak hidup)

NEX-AI adalah **model milik Nexus**, didaftarkan lokal sebagai `nex-ai-protect` dan `nex-ai-reflex`. Tidak di Ollama Hub publik.

Satu GGUF (`nex_ai_q4_k_m.gguf`) dipakai kedua nama. **Modelfile berbeda:** protect = JSON NEX-RED (tanpa `stop "}\n"`); reflex = klasifikasi HTTP.

| Peran | Nama runtime | Modelfile | Jika tidak ada |
| --- | --- | --- | --- |
| Reasoning / NEX-RED verifier+planner | `nex-ai-protect` | `nex-ai-models/Modelfile.protect` | Jangan ganti model lain; scan `--no-llm` / deterministik |
| Klasifikasi payload HTTP (bukan regex WAF) | `nex-ai-reflex` | `nex-ai-models/Modelfile.production` | Reflex regex tetap jalan |

Kalau laptop sudah punya NEX-AI di path lain: `ollama rm nex-ai-protect` / `nex-ai-reflex`, lalu impor ulang **hanya** dari `nex-ai-models/` di disk repo. Jangan dua GGUF / dua registri.

Stack `deploy-local`: **tidak start** tanpa kedua nama di Ollama lokal. `START.bat` / `START-OFFLINE.bat` / `START-FOR-JURY.bat` memanggil `scripts/check_nex_ai.py` **sebelum** `docker compose up`. Pesan operator: salin `nex_ai_q4_k_m.gguf` ke `nex-ai-models\` lalu `IMPORT-OLLAMA.bat` — bobot **bukan** unduhan Ollama Hub. Cek mandiri: `deploy-local/CHECK-NEX-AI.bat`.

Container gateway memanggil Ollama di **host** (`NEX_AI_ENDPOINT=http://host.docker.internal:11434/api/chat`). Compose lab set `NEX_AI_REQUIRED=1` (boot gateway fail-closed). Unit test / `go run` tanpa env **tidak** memanggil Ollama. Lewati gerbang hanya untuk CI: `NEX_AI_REQUIRED=0` (eksplisit; bukan fallback Hub).

Perintah uji: `python NEX-RED/nexred.py llm-eval` — **hanya** lulus jika `nex-ai-protect` terpasang di endpoint. Exit 3 jika model absen.

Saat pemilik menyerahkan berkas model: daftarkan **dengan nama itu** di runtime lokal (contoh `ollama create nex-ai-protect -f Modelfile`). Jangan `ollama pull qwen` / `llama3` sebagai pengganti.

Agen: `.agents/rules/nex-ai-only.md`.
