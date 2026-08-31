# Agen & dokumentasi Nexus Cyber

**Model produk:** Channel Starter (entry) + GaaS Edge Antibody Cowork — lihat `docs/PRODUCT_MODEL.md`. Keputusan bisnis: `docs/DECISIONS_OPEN.md` — **tanya pemilik** untuk item di bagian Belum final.

## Lab target — apa yang dilindungi & kenapa (wajib dibaca)

**Yang dilindungi (origin lab/deploy default):** website **portofolio** pemilik di **Vercel**, di belakang WAF — `PROTECTED_HOST` default **`portfolio.nexus-lab.test`**. Folder `playground/` **diarsip** (bukan di monorepo).

| Item | Nilai / lokasi |
| --- | --- |
| Hostname lab | `PROTECTED_HOST` default **`portfolio.nexus-lab.test`** |
| Alur | Pengunjung → Caddy/tunnel → **Gateway WAF `:8080`** → origin portofolio **Vercel** |
| Start lab | `deploy-local/START.bat` — lihat `deploy-local/README.md`. `START-OFFLINE.bat` **ditolak** (playground diarsip) |
| Bukan | Portofolio ≠ produk yang dijual; ≠ Channel Starter UMKM; ≠ expose SOC `:3001`/`:8081`; ≠ tembak `*.vercel.app` langsung saat klaim Nexus melindungi |

**Kenapa portofolio:** origin HTTP **nyata** untuk membuktikan **Alur A** (tepi always-on) + **Job Cowork** (ukur → kendalikan → uji, termasuk `replay_missed` ≠ hijau palsu). Demo/pitching harus menunjuk mesin wasit pada host ini (atau `PROTECTED_HOST` setara), **bukan** hanya landing Channel Portal.

**Inti produk yang sulit ditiru cepat:** Job Cowork (defense delta + antibody/vaccine-probe + replay + aturan `CLOSED_OK`/`CLOSED_GAP`) di `NEX-RED/jobs/` + gateway — bukan UI portal/harga.

**Jangan:** tembak origin Vercel/portofolio **langsung** saat mengklaim “Nexus melindungi”; scan/demo lewat `PROTECTED_HOST`. Jangan tunnel-kan control plane. Jangan samakan paket Rp 20rb dengan Loop Job penuh.

Jika Anda mengubah **perilaku** sistem (kode gateway, dasbor, NEX-RED, Caddy, compose):

1. Ikuti `.agents/rules/nexus-rule.md` (termasuk bagian **docs-sync**).
2. Jalankan pola `.agents/agents/docs-sync.md`: perbarui dokumen **hidup** di `docs/README.md` dan `CHANGELOG.md` dalam perubahan yang sama; selaraskan dengan `docs/PRODUCT_MODEL.md`.
3. Control plane: `.agents/agents/soc-control-plane.md`. Identitas HTTP: `.agents/agents/request-identity.md`.

Jangan mengklaim eBPF XDP nyata, JWT enterprise, Stripe/provisioner, pentest NEX-RED Shannon, **Channel Starter produksi/billing selesai** jika deploy HTTPS + top-up QRIS/VA+approve belum ada, atau **Loop GaaS di harga Rp 20rb/bulan**.

Pembayaran: **bukan** PSP pihak ketiga (Midtrans/Stripe) — **jangan kerjakan**. Mata uang kasir = **Kredit**. Lab: keran + Starter 20 Kr di `/order` (bukan settlement IDR). **Berikutnya (disepakati, jangan kerjakan sampai pemilik minta implementasi):** QRIS milik pemilik dan/atau VA bank milik pemilik → bukti transfer → approve jika bukti aman → Kredit masuk.

Channel Portal: pintu jual v1 di **`nexus-channel-portal/`** (`:3003`). **Login/daftar/tamu pelanggan** diminta pemilik (ledger Kredit per cookie/akun, bukan satu wallet `lab` untuk semua browser). **Bukan** login operator/developer di `/umkm`. F-10 roster penuh **tetap ditunda**. **Jangan** expose SOC publik `:3001`/`:8081`. **Jangan** Connect Git monorepo ke project warung. **Jangan** Loop/Job otomatis di Starter 20 Kr. **Pagar tipis** (`--tier tepi`) boleh untuk **satu** slug lab — bukan setiap warung otomatis, bukan Loop, bukan debit 20 Kr.

**NEX-AI only:** runtime reasoning/reflex hanya `nex-ai-protect` / `nex-ai-reflex` (model milik pemilik, bukan Ollama Hub). Jangan fallback Qwen/Llama/GPT. Lihat `.agents/rules/nex-ai-only.md` dan `docs/NEX_AI_RUNTIME.md`.
