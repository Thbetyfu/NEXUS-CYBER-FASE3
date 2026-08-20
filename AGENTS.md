# Agen & dokumentasi Nexus Cyber

Jika Anda mengubah **perilaku** sistem (kode gateway, dasbor, NEX-RED, Caddy, compose):

1. Ikuti `.agents/rules/nexus-rule.md` (termasuk bagian **docs-sync**).
2. Jalankan pola `.agents/agents/docs-sync.md`: perbarui dokumen **hidup** di `docs/README.md` dan `CHANGELOG.md` dalam perubahan yang sama.
3. Control plane: `.agents/agents/soc-control-plane.md`. Identitas HTTP: `.agents/agents/request-identity.md`.

Jangan mengklaim eBPF XDP nyata, JWT enterprise, Stripe/provisioner, atau pentest NEX-RED jika kode tidak melakukannya.

Pembayaran / webhook fail-closed: **ditunda** (lihat `CHANGELOG.md` Unreleased) — jangan kerjakan kecuali pemilik minta.

Back-office super-admin (jumlah user, situs, sisa langganan): **ditunda sampai produk dijual**. Kode di submodule `playground/NEXUS-CYBER-WEBISTE-SAAS`, **bukan** tab di `nexus-admin-dashboard`. Jangan kerjakan kecuali pemilik minta.

**NEX-AI only:** runtime reasoning/reflex hanya `nex-ai-protect` / `nex-ai-reflex` (model milik pemilik, bukan Ollama Hub). Jangan fallback Qwen/Llama/GPT. Lihat `.agents/rules/nex-ai-only.md` dan `docs/NEX_AI_RUNTIME.md`.
