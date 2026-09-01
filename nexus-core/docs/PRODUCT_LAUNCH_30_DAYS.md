# Checklist Peluncuran Produk — 30 Hari

**Versi:** 1.0.0 / 2026-08-28  
**Status:** Rencana operasi — **bukan** klaim “produksi massal selesai”  
**Model:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) · Distribusi: [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) · GTM: [COWORK_B2B.md](./COWORK_B2B.md)  
**Keputusan:** [DECISIONS_OPEN.md](./DECISIONS_OPEN.md) (Q9 = prioritas Cowork B2B)

---

## 0. Definisi sukses 30 hari

Setelah 30 hari, Nexus Cyber dianggap **sudah meluncur sebagai produk tepat guna (pilot)** jika:

| # | Kriteria sukses | Bukan sukses |
| --- | --- | --- |
| 1 | Portal + minimal 1 host **publik** lewat tunnel (SOC tidak terekspos) | Hanya lab `127.0.0.1` |
| 2 | **≥ 1 klien bayar** (Job Rp 200rb dan/atau Loop / Starter) | Demo gratis tanpa serah artefak |
| 3 | **1 Job Cowork** selesai → artefak MD/JSON diserahkan ke pemilik risiko | Screenshot UI tanpa status Job |
| 4 | Kontrak/proposal 1 halaman dipakai ulang | Improvisasi tiap WA |
| 5 | Copy jual jujur: PC+tunnel, residual `CLOSED_GAP`, bukan SOC 24/7 | Klaim bank-grade / E-Katalog selesai |

**Produk yang dijual di 30 hari ini:**

| Prioritas | Paket | Harga pilot | Siapa |
| --- | --- | --- | --- |
| **Utama (Q9)** | Job Cowork (sekali) | Rp 200.000 | Fintech kecil, integrator, startup kanal |
| **Utama** | Loop GaaS (1 host) | Rp 300.000/bulan | Tim IT terbatas yang butuh wasit berkala |
| **Funnel** | Channel Starter / pagar UMKM | Rp 15–35rb | Boleh paralel, **jangan** mengalihkan fokus dari Cowork |
| **Pitching saja** | B2G on-prem | Ilustrasi jutaan | Boleh pitch; **jangan** janji packaging produksi di minggu 1–4 |

---

## Minggu 1 — Fondasi publik & runbook (Hari 1–7)

**Tujuan:** Orang luar bisa membuka pintu jual; operator punya skrip deliver yang sama setiap kali.

### Siapa dijual dulu

- **ICP minggu 1–2:** 5–10 prospek B2B yang sudah dikenal (teman founder fintech, agensi web, komunitas ITSK) — **bukan** cold blast E-Katalog.
- Siapkan daftar: nama · kontak WA · apakah sudah punya website · host yang boleh diuji HTTP jinak.

### Apa yang di-deliver / dikerjakan

| Hari | Tugas | Done? |
| --- | :---: |
| 1–2 | PC 24/7: sleep OFF, Docker Running, UPS jika ada — [PC_MAIN_SERVER.md](./PC_MAIN_SERVER.md) | [ ] |
| 1–2 | `.env` dari template PC server; simpan `NEXUS_ADMIN_TOKEN` (lokal saja) | [ ] |
| 2–3 | Tunnel live: portal publik + Caddy `:80` → WAF; **jangan** tunnel `:3001` / `:8081` — [JURY_PUBLIC_ACCESS.md](./JURY_PUBLIC_ACCESS.md) | [ ] |
| 3 | Uji dari HP data seluler: portal + 1 site di belakang WAF | [ ] |
| 4 | Rekam **video before/after 60–90 detik** (harddisk lokal) — Tier 2 backup | [ ] |
| 5 | Latih live demo 90 detik: delta → antibodi → export artefak — [COWORK_B2B.md](./COWORK_B2B.md) §5 | [ ] |
| 6 | Tulis **runbook 1 halaman**: WA masuk → scope host → `job run` → L0/L1 → export → kirim file | [ ] |
| 7 | Isi template proposal kosong (lihat Minggu 2) + harga resmi di portal selaras WA | [ ] |

### Apa yang **tidak** dibangun minggu ini

- PSP pihak ketiga (Midtrans/Stripe) / webhook  
- Alur QRIS/VA settlement **live** (gambar/nomor rekening) — form bukti + approve **sudah** di portal  
- Multi-tenant CNAME massal / provisioner / Docker auto-onboard di SOC  
- Packaging binary B2G  
- Fitur SOC baru di luar Job Cowork (SEO / Safe Browsing / Core Web Vitals FE)  

**Onboard klien Cowork:** operator isi Origin + protected host di SOC; DNS/tunnel di luar — lihat [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).

### Checkpoint Minggu 1

- [ ] URL publik portal terbuka dari luar Wi‑Fi rumah  
- [ ] SOC tetap hanya localhost  
- [ ] Video demo ada di harddisk  
- [ ] Daftar ≥ 5 prospek B2B siap dikontak  

---

## Minggu 2 — Penawaran & kontrak (Hari 8–14)

**Tujuan:** Bisa jual berulang tanpa improvisasi; klaim di chat = klaim di dokumen.

### Siapa dijual

- Kontak aktif ke daftar Minggu 1.  
- Pesan singkat: *Job wasit kanal (ukur→kendalikan→uji) + artefak; bukan pentest exploit; residual jujur.*  
- Tawarkan **Job sekali Rp 200rb** dulu; Loop sebagai upsell setelah artefak pertama.

### Apa yang di-deliver / dikerjakan

| Hari | Tugas | Done? |
| --- | :---: |
| 8–9 | Template proposal/kontrak 1–2 hlm (MD/PDF): scope `PROTECTED_HOST`, izin scan jinak, L0/L1, harga, batasan (lihat lampiran di bawah) | [ ] |
| 9–10 | Copy WA standar: order Starter vs order Job/Loop (pisah kontrak site vs keamanan) | [ ] |
| 10–12 | Discovery call / chat dengan ≥ 3 prospek; catat keberatan | [ ] |
| 12–14 | Kunci **1 LOI atau 1 pembayaran** (DP OK) untuk Job pertama | [ ] |
| 14 | Folder klien: `scope.md` + izin tertulis singkat + kontak pemilik risiko | [ ] |

### Isi wajib template kontrak (checklist)

- [ ] Hostname / URL yang dilindungi  
- [ ] Apa yang dilakukan: defense delta, vaccine-probe/replay, artefak MD/JSON  
- [ ] Apa yang **tidak**: exploit, DDoS volumetric, sertifikasi OJK/BSSN  
- [ ] Siapa approve L0 (artefak) / L1 (pasang antibodi)  
- [ ] Hosting: *pilot PC operator + tunnel — bukan SLA data center*  
- [ ] Harga & jangka (Job sekali / Loop bulanan)  
- [ ] Residual: `CLOSED_GAP` / `replay_missed` = belum selesai, tidak disembunyikan  

### Apa yang **tidak** dibangun minggu ini

- Portal self-serve billing  
- F-10 back-office  
- Janji multi-host otomatis tanpa operator  

### Checkpoint Minggu 2

- [ ] File template proposal dipakai di chat nyata  
- [ ] ≥ 1 prospek setuju bayar / LOI untuk Job  
- [ ] Keberatan prospek tercatat (untuk FAQ slide Additional)  

---

## Minggu 3 — Delivery Job pertama (Hari 15–21)

**Tujuan:** Satu siklus produk nyata: bayar → kerjakan → serahkan artefak.

### Siapa menerima deliverable

- **Pemilik risiko** klien (bukan hanya tim Nexus).  
- Mereka yang meneken/approve L0 atau L1.

### Apa yang di-deliver / dikerjakan

| Hari | Tugas | Done? |
| --- | :---: |
| 15–16 | Deploy instance / arahkan WAF ke host klien (atau lab mirror dengan izin) — satu `PROTECTED_HOST` | [ ] |
| 16–17 | `nexred job run` → status sampai `PENDING_APPROVAL` — [COWORK_B2B.md](./COWORK_B2B.md) §4 | [ ] |
| 17–18 | Brief pemilik risiko: arti label `waf_blocked` / `origin_open` / `replay_missed` | [ ] |
| 18 | Approve L0 atau L1 sesuai kesepakatan | [ ] |
| 19 | `VERIFYING` → `CLOSED_OK` **atau** `CLOSED_GAP` (jujur) | [ ] |
| 19–20 | Export MD/JSON → kirim ke klien + simpan salinan operator | [ ] |
| 20–21 | Tawarkan Loop Rp 300rb/bulan jika host tetap dilindungi | [ ] |
| 21 | Retrospektif internal: waktu kerja aktual vs harga (cek [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md)) | [ ] |

### Perintah referensi (lab/operator)

```bash
python NEX-RED/nexred.py bridge -p 3004
python NEX-RED/nexred.py job run -u <URL_HOST> --scope hybrid
python NEX-RED/nexred.py job show <id>
python NEX-RED/nexred.py job approve <id> --level L0
python NEX-RED/nexred.py job export <id> --format md
```

### Apa yang **tidak** dibangun minggu ini

- Fitur baru agar laporan “selalu hijau”  
- Expose Command Center ke klien  
- Klaim Shannon / pentest penuh  

### Checkpoint Minggu 3

- [ ] Artefak Job ada di tangan klien  
- [ ] Status penutupan jujur tercatat  
- [ ] Testimoni singkat / quote boleh dipublikasi (izin tertulis) — opsional tapi berharga  

---

## Minggu 4 — Stabilisasi & keputusan skala (Hari 22–30)

**Tujuan:** Produk bisa diulang; putuskan apakah naik infrastruktur.

### Siapa dijual

- Pipeline kedua: 2–3 prospek berikutnya **atau** 1 UMKM Starter sebagai funnel (jika kapasitas operator longgar).  
- B2G: hanya pitching dokumen — **bukan** janji DC instansi minggu ini.

### Apa yang di-deliver / dikerjakan

| Hari | Tugas | Done? |
| --- | :---: |
| 22–24 | Backup mingguan: config, `hosts-registry`, artefak Job — [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) §3 | [ ] |
| 22–24 | FAQ dari keberatan Minggu 2 → masuk slide Additional / dokumen sales | [ ] |
| 25–26 | Jika ada Loop: `schedule-add` + pastikan tick bridge hidup; alert operator jika Job gagal | [ ] |
| 27–28 | Decision gate: tetap PC+tunnel **atau** rencana VPS (lihat kriteria di bawah) | [ ] |
| 29–30 | Review 30 hari: pendapatan · jam kerja · 1 pelajaran teknis · 1 pelajaran sales | [ ] |
| 30 | Update pemilik: isi jawaban Q3/Q5/Q6/Q10 di [DECISIONS_OPEN.md](./DECISIONS_OPEN.md) jika sudah jelas | [ ] |

### Kapan naik ke VPS (keputusan, belum wajib minggu 4)

Naikkan rencana VPS hanya jika **salah satu** benar:

- ≥ beberapa site Starter wajib hidup tanpa PC rumah, **atau**  
- Klien Loop bayar dan minta klaim uptime lebih kuat, **atau**  
- PC tidak bisa dijamin 24/7  

Sampai itu: **PC + tunnel = distribusi resmi tahap pilot.**

### Apa yang **tetap tidak** dikerjakan di hari 1–30 (kecuali pemilik minta)

| Ditunda | Alasan |
| --- | --- |
| PSP pihak ketiga (Midtrans/Stripe) | Kasir = Kredit; top-up = pending + form bukti + approve; QRIS/VA milik pemilik belum live |
| F-10 back-office | Roster kecil di chat/spreadsheet OK |
| Provisioner CNAME massal | Satu host per Job sudah tepat guna |
| Packaging B2G produksi | Pitching dulu; DC instansi = fase berikutnya |
| eBPF XDP nyata / SOC otonom | Bukan kontrak GaaS v1 |

### Checkpoint Minggu 4 (definisi sukses)

- [ ] Kriteria §0 terpenuhi (atau gap ditulis eksplisit + rencana 14 hari berikutnya)  
- [ ] Satu runbook + satu template kontrak dipakai ≥ 1x nyata  
- [ ] Keputusan VPS: **tetap pilot** / **jadwalkan** (tanggal)  

---

## Ringkas per minggu

```text
Minggu 1  Publik + demo + runbook
Minggu 2  Proposal + prospek + LOI/bayar
Minggu 3  Job nyata → artefak ke pemilik risiko
Minggu 4  Backup, Loop opsional, decision VPS, review
```

---

## Lampiran A — Kerangka template proposal (salin ke file terpisah)

```text
Judul: Proposal Edge Antibody Cowork — Job / Loop
1. Pihak & kontak pemilik risiko
2. Scope: hostname/URL + izin pengujian HTTP jinak
3. Deliverable: artefak MD/JSON + status Job (CLOSED_OK | CLOSED_GAP | PARTIAL)
4. Proses: MEASURED → PENDING_APPROVAL (L0/L1) → VERIFYING → tutup
5. Harga: Job Rp 200.000 | Loop Rp 300.000/bulan (1 host) | lain WA
6. Hosting tahap pilot: PC operator + tunnel (bukan SLA data center)
7. Batasan: bukan pentest exploit; bukan DDoS L3/L4; residual tidak disembunyikan
8. Jadwal: discovery → run → approve → serah (target ≤ 7 hari kerja setelah bayar)
9. Tanda tangan / persetujuan WA sebagai penerimaan scope
```

---

## Lampiran B — Pesan WA singkat (contoh)

**Job B2B:**  
*Kami jual Job wasit kanal digital: bandingkan tepi vs origin, pasang antibodi, uji ulang, serahkan laporan MD. Residual yang masih terbuka kami tulis apa adanya (bukan laporan hijau palsu). Pilot Rp 200rb/host. Bukan pentest exploit. Tertarik scope hostname Anda?*

**UMKM Starter (funnel):**  
*Website Starter dari Rp 15–20rb/bulan (pilot). Kasir lab: Kredit. Top-up IDR: QRIS/VA milik Nexus + bukti + approve (belum). WhatsApp = chat, bukan gateway. Job/Loop wasit = paket terpisah. Portal `/order` · WA 62895603358692.*

---

## Referensi cepat

| Dokumen | Untuk |
| --- | --- |
| [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) | Apa yang dijual / tidak dijual |
| [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) | PC + tunnel |
| [COWORK_B2B.md](./COWORK_B2B.md) | Delivery operator |
| [LIMITATIONS.md](./LIMITATIONS.md) | Kejujuran klaim |
| [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md) | Margin per segmen |
| [../Task.MD](../Task.MD) | Backlog B2B-3d … B2B-6 |
| [../ROADMAP.md](../ROADMAP.md) | Milestone 20 |

---

*Peluncuran 30 hari = produk jasa terkelola pilot, bukan lab-only dan bukan produksi massal.*
