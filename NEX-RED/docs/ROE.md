# Aturan keterlibatan NEX-RED (RoE)

Hanya target milik Nexus:

- Lab: `NEX_RED_LIVE_TARGET` (default `http://127.0.0.1` lewat Caddy/WAF)
- Kode: `playground/Portofolio-Thoriq` atau repo ini
- Bukan situs klien produksi, bukan URL Vercel langsung, bukan host di luar allow-list

Pemeriksaan hidup = GET/POST/DELETE **tanpa sesi**, JSON jinak, **dua sesi lab** (owner vs peer), dan (opsional) browser Chromium untuk unggah sah + 5 password vault. Tidak ada wordlist exploit di git.

Model: `nex-ai-protect` / Ollama jika ada; scan tetap jalan dengan `--no-llm`.
