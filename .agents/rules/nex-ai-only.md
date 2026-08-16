---
trigger: always_on
glob: "*"
description: Runtime AI is NEX-AI only. Never Qwen, Llama, GPT, or other public models.
---

# NEX-AI only (runtime)

Pemilik model: **NEX-AI milik Nexus** (`nex-ai-protect`, `nex-ai-reflex`). Bukan model Ollama Hub.

## Wajib

- Reasoning / NEX-RED LLM: **`nex-ai-protect`** saja (`nex-ai-models/Modelfile.protect`).
- Klasifikasi payload HTTP (slot model, bukan regex WAF): **`nex-ai-reflex`** (`Modelfile.production`).
- Bobot GGUF saat ini **sama**; yang berbeda adalah prompt/stop. Jangan anggap dua file 3B terpisah.
- Jika model belum terpasang di endpoint lokal: **gagal jujur** atau lanjut tanpa LLM (rencana deterministik / `--no-llm`). **Jangan** ganti ke Qwen, Llama, GPT, Claude, Gemini, atau model lain yang kebetulan ada di `ollama list`.

## Dilarang

- Fallback `qwen2.5:*`, `llama3`, OpenRouter “model apa saja”.
- Menulis di CAPABILITIES/README bahwa sistem “pakai Qwen” atau “pakai Llama”.
- `ollama pull qwen…` sebagai pengganti NEX-AI.

## Catatan dapur (bukan runtime)

Skrip latih di `NEX-AI/scripts/` boleh menyebut base checkpoint historis. **Nama yang dipanggil kode tetap `nex-ai-*`.** Agen jangan menghidupkan base itu sebagai model produksi.
