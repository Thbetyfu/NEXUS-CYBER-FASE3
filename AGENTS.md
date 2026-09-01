# Agen & dokumentasi Nexus Cyber

**Model produk:** Channel Starter (entry) + GaaS Edge Antibody Cowork — lihat [`nexus-core/docs/PRODUCT_MODEL.md`](nexus-core/docs/PRODUCT_MODEL.md). Keputusan bisnis: [`nexus-core/docs/DECISIONS_OPEN.md`](nexus-core/docs/DECISIONS_OPEN.md) — **tanya pemilik** untuk item di bagian Belum final. Tata letak pohon: [`nexus-core/docs/REPO_LAYOUT.md`](nexus-core/docs/REPO_LAYOUT.md).

## Lab target — apa yang dilindungi & kenapa (wajib dibaca)

**Yang dilindungi (origin lab/deploy default):** website **portofolio** pemilik di **Vercel**, di belakang WAF — `PROTECTED_HOST` default **`portfolio.nexus-lab.test`**. Folder `playground/` **diarsip** (bukan di monorepo).

| Item | Nilai / lokasi |
| --- | --- |
| Hostname lab | `PROTECTED_HOST` default **`portfolio.nexus-lab.test`** |
| Alur | Pengunjung → Caddy/tunnel → **Gateway WAF `:8080`** → origin portofolio **Vercel** |
| Start lab | `nexus-core/deploy-local/START.bat` — lihat `nexus-core/deploy-local/README.md`. `START-OFFLINE.bat` **ditolak** (playground diarsip) |
| Bukan | Portofolio ≠ produk yang dijual; ≠ Channel Starter UMKM; ≠ expose SOC `:3001`/`:8081`; ≠ tembak `*.vercel.app` langsung saat klaim Nexus melindungi |

**Kenapa portofolio:** origin HTTP **nyata** untuk membuktikan **Alur A** (tepi always-on) + **Job Cowork** (ukur → kendalikan → uji, termasuk `replay_missed` ≠ hijau palsu). Demo/pitching harus menunjuk mesin wasit pada host ini (atau `PROTECTED_HOST` setara), **bukan** hanya landing Channel Portal.

**Inti produk yang sulit ditiru cepat:** Job Cowork (defense delta + antibody/vaccine-probe + replay + aturan `CLOSED_OK`/`CLOSED_GAP`) di `nexus-core/NEX-RED/jobs/` + gateway — bukan UI portal/harga.

**Jangan:** tembak origin Vercel/portofolio **langsung** saat mengklaim “Nexus melindungi”; scan/demo lewat `PROTECTED_HOST`. Jangan tunnel-kan control plane. Jangan samakan paket Rp 20rb dengan Loop Job penuh.

Jika Anda mengubah **perilaku** sistem (kode gateway, dasbor, NEX-RED, Caddy, compose):

1. Ikuti `.agents/rules/nexus-rule.md` (termasuk bagian **docs-sync**). Folder **`.agents/`** ada di laptop saja (**gitignore**, tidak di-push).
2. Jalankan pola `.agents/agents/docs-sync.md`: perbarui dokumen **hidup** di `nexus-core/docs/README.md` dan `nexus-core/CHANGELOG.md` dalam perubahan yang sama; selaraskan dengan `nexus-core/docs/PRODUCT_MODEL.md`.
3. Control plane: `.agents/agents/soc-control-plane.md`. Identitas HTTP: `.agents/agents/request-identity.md`.

Jangan mengklaim eBPF XDP nyata, JWT enterprise, Stripe/provisioner, pentest NEX-RED Shannon, **Channel Starter produksi/billing selesai** jika deploy HTTPS + top-up QRIS/VA+approve belum ada, atau **Loop GaaS di harga Rp 20rb/bulan**.

Pembayaran: **bukan** PSP pihak ketiga (Midtrans/Stripe) — **jangan kerjakan**. Mata uang kasir = **Kredit**. Isi pelanggan = permintaan pending + approve operator (bukan keran sebagai CTA beli). QRIS/VA milik pemilik **belum live**. Keran lab hanya uji (`NEXUS_LAB_FAUCET`). Starter 20 Kr fail-closed.

Pohon in-repo: **`nexus-gaas-web/`** (Channel Portal lab `:3003`) + **`nexus-core/`** (WAF, NEX-RED, `channel-starter`, `deploy-local`, docs). Produksi Vercel kanonik = GitHub **nexus-gaas-web** ([NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS)); salinan kerja opsional **`D:\nexus-gaas-web`** di luar repo ini **boleh drift**. Jika Connect Git FASE3 ke Vercel: Root Directory = `nexus-gaas-web` (**discouraged**; jangan Connect project warung). **Login/daftar/tamu pelanggan** diminta pemilik (ledger Kredit per cookie/akun, bukan satu wallet `lab` untuk semua browser). **Bukan** login operator/developer di `/umkm`. F-10 roster penuh **tetap ditunda**. **Jangan** expose SOC publik `:3001`/`:8081`. **Jangan** Loop/Job otomatis di Starter 20 Kr. **Pagar tipis** (`--tier tepi`) boleh untuk **satu** slug lab — bukan setiap warung otomatis, bukan Loop, bukan debit 20 Kr.

**NEX-AI only:** runtime reasoning/reflex hanya `nex-ai-protect` / `nex-ai-reflex` (model milik pemilik, bukan Ollama Hub). Jangan fallback Qwen/Llama/GPT. Lihat `.agents/rules/nex-ai-only.md` dan `nexus-core/docs/NEX_AI_RUNTIME.md`.
