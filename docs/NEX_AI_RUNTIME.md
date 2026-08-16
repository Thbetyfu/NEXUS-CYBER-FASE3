# Runtime NEX-AI (kontrak hidup)

NEX-AI adalah **model milik Nexus**, didaftarkan lokal sebagai `nex-ai-protect` dan `nex-ai-reflex`. Tidak di Ollama Hub publik.

Satu GGUF (`nex_ai_q4_k_m.gguf`) dipakai kedua nama. **Modelfile berbeda:** protect = JSON NEX-RED (tanpa `stop "}\n"`); reflex = klasifikasi HTTP.

| Peran | Nama runtime | Modelfile | Jika tidak ada |
| --- | --- | --- | --- |
| Reasoning / NEX-RED verifier+planner | `nex-ai-protect` | `nex-ai-models/Modelfile.protect` | Jangan ganti model lain; scan `--no-llm` / deterministik |
| Klasifikasi payload HTTP (bukan regex WAF) | `nex-ai-reflex` | `nex-ai-models/Modelfile.production` | Reflex regex tetap jalan |

Kalau laptop sudah punya NEX-AI di path lain: `ollama rm nex-ai-protect` / `nex-ai-reflex`, lalu impor ulang **hanya** dari `nex-ai-models/` di disk repo. Jangan dua GGUF / dua registri.

Stack `deploy-local`: container gateway memanggil Ollama di **host** (`NEX_AI_ENDPOINT=http://host.docker.internal:11434/api/chat`). Ollama harus nyala di laptop blue team setelah `IMPORT-OLLAMA.bat`.

Perintah uji: `python NEX-RED/nexred.py llm-eval` — **hanya** lulus jika `nex-ai-protect` terpasang di endpoint. Exit 3 jika model absen.

Saat pemilik menyerahkan berkas model: daftarkan **dengan nama itu** di runtime lokal (contoh `ollama create nex-ai-protect -f Modelfile`). Jangan `ollama pull qwen` / `llama3` sebagai pengganti.

Agen: `.agents/rules/nex-ai-only.md`.
