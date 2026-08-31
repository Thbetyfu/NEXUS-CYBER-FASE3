# Edge Antibody Cowork — Go-to-Market B2B

**Versi:** 0.1.0 / 2026-08-23  
**Status:** Mesin **sudah ada** (lab); fokus sprint = **demo & kontrak B2B**, bukan billing otomatis.  
**Keputusan Q9:** Prioritas demo = **Cowork untuk klien B2B** — lihat [DECISIONS_OPEN.md](./DECISIONS_OPEN.md).

---

## 1. Siapa ICP B2B

| Persona | Kebutuhan | Produk |
| --- | --- | --- |
| **Pemilik risiko kanal** (fintech, ITSK) | Bukti pengendalian, bukan PDF scanner saja | Job + artefak L0/L1 |
| **Integrator / agensi web keuangan** | Satu hubungan vendor: build + wasit | Loop multi-host (kontrak terpisah per host) |
| **Tim IT terbatas** | Tepi always-on + Job berkala | Alur A + Loop GaaS |

**Bukan ICP v1:** bank tier-1 SLA 24/7, klaim sertifikasi regulator.

---

## 2. Value proposition (jujur)

| Scanner / pentest tradisional | Edge Antibody Cowork |
| --- | --- |
| Temuan statis | Defense delta: WAF vs origin lab |
| Laporan hijau default | `replay_missed` → **CLOSED_GAP**, tidak disembunyikan |
| Tidak ada loop | vaccine-probe + replay di tepi |
| Tidak ada jejak persetujuan | Gerbang L0 (artefak) / L1 (pasang antibodi) |

---

## 3. Paket ilustrasi B2B (bukan kontrak final)

| Paket | Isi | Harga tahap pilot (PC + tunnel) |
| --- | --- | --- |
| **Job tunggal** | Satu Job Cowork + artefak MD/JSON | **Rp 200.000** (one-shot) |
| **Loop GaaS** | Job terjadwal + memori imun per `PROTECTED_HOST` | **Rp 300.000**/bulan (1 host) |
| **Integrator** | Multi-klien / bundle | Custom (WA) |

Channel Starter (Rp 20rb) **bukan** paket Cowork — kontrak **pisah** site vs keamanan.

**Distribusi awal:** host di **PC operator 24/7 + tunnel** — bukan VPS. Detail: [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).

---

## 4. Alur delivery B2B (operator)

```text
1. Discovery call / WA → scope PROTECTED_HOST + izin HTTP jinak
2. Deploy instance (satu hostname) atau upsell dari Channel Starter
3. nexred job run → MEASURED → PENDING_APPROVAL
4. Pemilik risiko approve L0/L1 (artefak)
5. VERIFYING → CLOSED_OK atau CLOSED_GAP (residual jujur)
6. Serahkan artefak + opsional schedule Loop
```

### Perintah lab (referensi)

```bash
# Bridge + WAF hidup dulu
python NEX-RED/nexred.py bridge -p 3004

# Job Cowork
python NEX-RED/nexred.py job run -u http://127.0.0.1 --scope hybrid
python NEX-RED/nexred.py job show <id>
python NEX-RED/nexred.py job approve <id> --level L0
python NEX-RED/nexred.py job export <id> --format md

# Loop (opsional)
python NEX-RED/nexred.py job schedule-add --host portfolio.nexus-lab.test --interval-hours 168
```

Operator UI: Command Center `:3001` → widget **Job Cowork** + API `:8081`.

Portal jual B2B: [`nexus-channel-portal/`](../nexus-channel-portal/) → `/corporat`. Alias lama tetap redirect: `/institusi` → `/corporat` · `/cowork` → `/corporat`.  
On-prem pemerintah / pitching B2G: [COWORK_B2G.md](./COWORK_B2G.md) → `/pemerintah` (alias `/b2g`).  
Unit ekonomi: [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md).

---

## 5. Demo before/after (sales)

Siapkan **satu skenario** untuk pitch:

1. **Before:** request jinak lolos origin, ditahan WAF (defense delta).
2. **Antibody:** vaccine-probe → replay masih 403 (`antibody_learned`).
3. **Artefak:** export MD dengan tabel delta + status Job — bukan klaim Shannon.

Lab: `deploy-local/START.bat` + checklist red team.

---

## 6. Batasan (wajib di pitch)

- Bukan pentest exploit / Shannon parity
- Residual `origin_open` atau `replay_missed` = **CLOSED_GAP**
- Manusia pemilik risiko wajib L0/L1 — bukan SOC otonom 24/7
- Satu `PROTECTED_HOST` per instance GaaS (bukan CNAME massal otomatis)

Lihat [LIMITATIONS.md](./LIMITATIONS.md), [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

---

## 7. Sprint berikut (Milestone 20)

| # | Task | Status |
| --- | --- | --- |
| M20-1 | Halaman Cowork di Channel Portal (`/corporat`; alias `/cowork`) | **Selesai** (2026-08-23) |
| M20-2 | Playbook operator + demo script | Dokumen ini |
| M20-3 | Satu pilot B2B (Job + artefak diserahkan) | **Belum** |
| M20-4 | Template proposal/kontrak B2B (MD) | **Belum** |
| M20-5 | Produksi VPS + TLS untuk host klien | **Belum** |

Peluncuran produk (bukan lab-only): checklist 30 hari di [PRODUCT_LAUNCH_30_DAYS.md](./PRODUCT_LAUNCH_30_DAYS.md).

---

*Cowork B2B GTM — selaras pivot GaaS 2026-08-23.*
