# Agen & dokumentasi Nexus Cyber

**Model produk:** Channel Starter (entry) + GaaS Edge Antibody Cowork — lihat `docs/PRODUCT_MODEL.md`. Keputusan bisnis: `docs/DECISIONS_OPEN.md` — **tanya pemilik** untuk item di bagian Belum final.

## Lab target — apa yang dilindungi & kenapa (wajib dibaca)

**Yang dilindungi (origin lab default):** website **portofolio** pemilik di submodule `playground/Portofolio-Thoriq` (atau origin Vercel yang sama di belakang WAF).

| Item | Nilai / lokasi |
| --- | --- |
| Hostname lab | `PROTECTED_HOST` default **`portfolio.nexus-lab.test`** |
| Alur | Pengunjung → Caddy/tunnel → **Gateway WAF `:8080`** → origin portofolio (`:3002` offline / Vercel online) |
| Start lab | `deploy-local/START-OFFLINE.bat` (origin lokal) atau `START.bat` (Vercel di belakang WAF) — lihat `deploy-local/README.md` |
| Bukan | Portofolio ≠ produk yang dijual; ≠ Channel Starter UMKM; ≠ expose SOC `:3001`/`:8081` |

**Kenapa portofolio:** origin HTTP **nyata** untuk membuktikan **Alur A** (tepi always-on) + **Job Cowork** (ukur → kendalikan → uji, termasuk `replay_missed` ≠ hijau palsu). Demo/pitching harus menunjuk mesin wasit pada host ini (atau `PROTECTED_HOST` setara), **bukan** hanya landing Channel Portal.

**Inti produk yang sulit ditiru cepat:** Job Cowork (defense delta + antibody/vaccine-probe + replay + aturan `CLOSED_OK`/`CLOSED_GAP`) di `NEX-RED/jobs/` + gateway — bukan UI portal/harga.

**Jangan:** tembak origin Vercel/portofolio **langsung** saat mengklaim “Nexus melindungi”; scan/demo lewat `PROTECTED_HOST`. Jangan tunnel-kan control plane. Jangan samakan paket Rp 20rb dengan Loop Job penuh.

Jika Anda mengubah **perilaku** sistem (kode gateway, dasbor, NEX-RED, Caddy, compose):

1. Ikuti `.agents/rules/nexus-rule.md` (termasuk bagian **docs-sync**).
2. Jalankan pola `.agents/agents/docs-sync.md`: perbarui dokumen **hidup** di `docs/README.md` dan `CHANGELOG.md` dalam perubahan yang sama; selaraskan dengan `docs/PRODUCT_MODEL.md`.
3. Control plane: `.agents/agents/soc-control-plane.md`. Identitas HTTP: `.agents/agents/request-identity.md`.

Jangan mengklaim eBPF XDP nyata, JWT enterprise, Stripe/provisioner, pentest NEX-RED Shannon, **Channel Starter produksi/billing selesai** jika deploy HTTPS + pembayaran belum ada, atau **Loop GaaS di harga Rp 20rb/bulan**.

Pembayaran / webhook fail-closed: **ditunda** (lihat `CHANGELOG.md` Unreleased) — jangan kerjakan kecuali pemilik minta.

Channel Portal / F-10 back-office: **ditunda** — modul **`nexus-channel-portal/`** adalah pintu jual v1; F-10 **bukan** prioritas. Jangan kerjakan kecuali pemilik minta.

**NEX-AI only:** runtime reasoning/reflex hanya `nex-ai-protect` / `nex-ai-reflex` (model milik pemilik, bukan Ollama Hub). Jangan fallback Qwen/Llama/GPT. Lihat `.agents/rules/nex-ai-only.md` dan `docs/NEX_AI_RUNTIME.md`.
