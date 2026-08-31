# Task & Backlog Nexus Cyber

**Pembaruan:** 2026-08-23  
**Strategi:** [docs/PRODUCT_MODEL.md](docs/PRODUCT_MODEL.md) — **Channel Starter** (entry UMKM) + **GaaS Edge Antibody Cowork** (inti). Keputusan terbuka: [docs/DECISIONS_OPEN.md](docs/DECISIONS_OPEN.md).

Setiap ubahan kode wajib: `AGENTS.md` + `CHANGELOG.md` + dokumen hidup di `docs/README.md`.

---

## Selesai (lab / fondasi)

1. **Website uji ketahanan portofolio** — Gallery unggah + vault password + autoban 5×  
   - `[x]` `REWARD_PASSWORD` di env lab  
   - `[x]` Alur: WAF → portofolio → AVSE + vault + SOC operator  

2. **Deploy lab**  
   - `[x]` `deploy-local/` + compose; satu `PROTECTED_HOST`  
   - `[x]` Performa ringkas: [docs/PERFORMANCE_ESTIMATION.md](docs/PERFORMANCE_ESTIMATION.md)  

3. **Wasit NEX-RED (komponen GaaS)**  
   - `[x]` Defense delta (WAF vs origin lab)  
   - `[x]` Antibody loop (vaccine-probe + replay)  
   - `[x]` Agen recon / access / injection-hygiene / reporter  

4. **Tepi always-on**  
   - `[x]` Reflex + antibodi cache + control plane `:8081`  

---

## Prioritas GaaS v1 (kerjakan ini)

### Fase 1 — Job Cowork **[Selesai — NEX-RED file-backed]**

- [x] **G-1:** Entitas `Job` (status, scope, L0/L1, log langkah)  
- [x] **G-2:** CLI/API `job run` / `job show` — orkestrasi delta + probe yang sudah ada  
- [x] **G-3:** Aturan `CLOSED_OK` / `CLOSED_GAP` — tidak hijau jika `replay_missed` tanpa residual  
- [x] **G-4:** Gerbang persetujuan L0 (artefak saja) / L1 (pasang antibodi)  

### Fase 2 — Deliverable **[Selesai — artefak file + widget operator]**

- [x] **G-5:** Ekspor artefak risiko (Markdown/JSON): delta, antibodi, residual, persetujuan  
- [x] **G-6:** Halaman ringkas Job di Command Center (operator) — bukan Channel Portal pelanggan  

### Fase 3 — Moat operasi **[Selesai — file; PG belum]**

- [x] **G-7:** Memori imun per host (`immune_memory.json` + histori miss)  
- [x] **G-8:** Job terjadwal (Loop GaaS) — `schedule-add` + tick bridge 60s  

---

## Prioritas Channel Starter (Milestone 18 — lab v0.1)

- [x] **S-1:** Spesifikasi form wizard + 3 template (`fnb`, `jasa`, `profil`)
- [x] **S-2:** Generator rule-based (JSON → static site), **bukan** LLM berat — `channel-starter/`
- [x] **S-3:** Deploy multi-tenant shared + subdomain lab — Caddy import + hosts registry (`channel-starter/cli.py deploy apply` + `deploy-local/`)
- [x] **S-4:** Halaman admin / onboarding pelanggan — FastAPI form `:3010` (bukan F-10 legacy)
- [x] **S-5:** Pricing tier + copy jujur (Starter ≠ Cowork) — footer template + manifest
- [x] **S-6:** Upsell path ke Loop GaaS — `cli.py upsell enable|disable|status`, satu `PROTECTED_HOST` aktif, Job Cowork via bridge `:3004`

**Tanya pemilik** sebelum implementasi: [docs/DECISIONS_OPEN.md](docs/DECISIONS_OPEN.md).

---

## Milestone 19 — Nexus Channel Portal (v0.1)

- [x] **P-1:** Modul `nexus-gaas-web/` (dulu `nexus-channel-portal/`) — landing + animasi + harga B2C/B2B
- [x] **P-2:** Form `/order` + proxy API ke channel-starter
- [x] **P-3:** Pembayaran: Kredit kasir + keputusan kontak WA di DECISIONS_OPEN
- [ ] **P-4:** Top-up Kredit — QRIS/VA milik pemilik + bukti transfer + approve operator (**belum dikode**; bukan Midtrans)

---

## Milestone 20 — Cowork B2B GTM (prioritas Q9)

- [x] **B2B-1:** Keputusan Q9 — fokus Cowork untuk klien B2B
- [x] **B2B-2:** Dokumen [docs/COWORK_B2B.md](docs/COWORK_B2B.md) — playbook operator
- [x] **B2B-3:** Halaman `/cowork` di Channel Portal
- [x] **B2B-3b:** Keputusan distribusi PC 24/7 + tunnel + harga pilot Job Rp 200rb / Loop Rp 300rb — [docs/DISTRIBUTION_PILOT.md](docs/DISTRIBUTION_PILOT.md)
- [x] **B2B-3c:** Portal multi-segmen satu situs — `/` hub + `/umkm` `/sekolah` `/startup` `/institusi` (UMKM 20rb+pagar, GaaS entry 35rb)
- [x] **B2G-1:** Dokumen [docs/COWORK_B2G.md](docs/COWORK_B2G.md) + [docs/PRICING_UNIT_ECONOMICS.md](docs/PRICING_UNIT_ECONOMICS.md) — pitching on-prem (bukan produksi B2G selesai)
- [x] **B2G-2:** Portal `/b2g` + hub segmen B2G (Edge lisensi + Loop wajib; source tidak termasuk)
- [ ] **B2B-3d:** Setup tunnel produksi (cloudflared) + checklist PC 24/7 tanpa expose SOC
- [ ] **B2B-4:** Satu pilot B2B — Job + artefak MD diserahkan ke pemilik risiko
- [ ] **B2B-5:** Template proposal/kontrak B2B (MD)
- [ ] **B2B-6:** Demo before/after terekam (lab + defense delta)
- [ ] **B2B-7:** Jalankan checklist 30 hari — [docs/PRODUCT_LAUNCH_30_DAYS.md](docs/PRODUCT_LAUNCH_30_DAYS.md)
- [ ] **B2G-3:** Packaging binary/image Edge berlisensi produksi
- [ ] **B2G-4:** Pilot on-prem satu instansi (staging)

---

## Ditunda (legacy subscription — jangan kerjakan kecuali pemilik minta)

- [ ] **Task 6:** `scripts/provisioner.sh` multi-tenant  
- [ ] **Task 7:** ~~Midtrans/Stripe webhook fail-closed~~ **Dibatalkan** — top-up = QRIS/VA milik pemilik + bukti + approve (lihat P-4)  
- [ ] **Task 8:** F-10 back-office di portal legacy  
- [ ] Portal self-serve CNAME massal, paket Rp19k **otomatis legacy** (digantikan desain Channel Starter — lihat DECISIONS_OPEN Q8)

Lihat `CHANGELOG.md` Unreleased dan `docs/PRD.md` F-06/F-10.

---

## Catatan operasi (jujur)

- **GeoIP / Telegram:** pager setelah ban; IP publik dapat label GeoIP — **bukan** GPS, **bukan** tembus VPN.  
- **AI:** runtime hanya `nex-ai-protect` / `nex-ai-reflex` — bukan substitusi Ollama Hub.  
- **Produk jual:** Channel Starter (entry) → upsell Job/Loop GaaS — lihat [docs/BRD.md](docs/BRD.md) dan [docs/CHANNEL_STARTER.md](docs/CHANNEL_STARTER.md).

---

*Backlog selaras pivot GaaS 2026-08-22.*
