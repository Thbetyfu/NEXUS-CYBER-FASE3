# Agen & dokumentasi Nexus Cyber

**Model produk:** Channel Starter (entry) + GaaS Edge Antibody Cowork — lihat `docs/PRODUCT_MODEL.md`. Keputusan bisnis: `docs/DECISIONS_OPEN.md` — **tanya pemilik** untuk item di bagian Belum final.

Jika Anda mengubah **perilaku** sistem (kode gateway, dasbor, NEX-RED, Caddy, compose):

1. Ikuti `.agents/rules/nexus-rule.md` (termasuk bagian **docs-sync**).
2. Jalankan pola `.agents/agents/docs-sync.md`: perbarui dokumen **hidup** di `docs/README.md` dan `CHANGELOG.md` dalam perubahan yang sama; selaraskan dengan `docs/PRODUCT_MODEL.md`.
3. Control plane: `.agents/agents/soc-control-plane.md`. Identitas HTTP: `.agents/agents/request-identity.md`.

Jangan mengklaim eBPF XDP nyata, JWT enterprise, Stripe/provisioner, pentest NEX-RED Shannon, **Channel Starter produksi/billing selesai** jika deploy HTTPS + pembayaran belum ada, atau **Loop GaaS di harga Rp 20rb/bulan**.

Pembayaran / webhook fail-closed: **ditunda** (lihat `CHANGELOG.md` Unreleased) — jangan kerjakan kecuali pemilik minta.

Channel Portal / F-10 back-office: **ditunda** — modul **`nexus-channel-portal/`** adalah pintu jual v1; F-10 **bukan** prioritas. Jangan kerjakan kecuali pemilik minta.

**NEX-AI only:** runtime reasoning/reflex hanya `nex-ai-protect` / `nex-ai-reflex` (model milik pemilik, bukan Ollama Hub). Jangan fallback Qwen/Llama/GPT. Lihat `.agents/rules/nex-ai-only.md` dan `docs/NEX_AI_RUNTIME.md`.
