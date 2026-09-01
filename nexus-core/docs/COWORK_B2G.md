# Edge Antibody Cowork — Paket B2G (On-Prem) untuk Pitching

**Versi:** 0.1.0 / 2026-08-23  
**Status:** **Pitching / arsitektur siap** — **bukan** produksi pengadaan pemerintah selesai.  
**Terkait:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md), [COWORK_B2B.md](./COWORK_B2B.md), [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md), [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md), [DECISIONS_OPEN.md](./DECISIONS_OPEN.md).

---

## 1. Keputusan pemilik (2026-08-23)

| Item | Keputusan |
| --- | --- |
| Prioritas sebelumnya | B2G **belum** prioritas |
| Sekarang | **B2G pitching package** diterima — docs + pintu portal `/pemerintah` (alias `/b2g`) untuk investor & narasi adaptif semua segmen |
| Bukan | Pengadaan penuh (SIPLah/E-Katalog massal, sertifikasi, SLA data center pemerintah) — **belum dikerjakan** |

Institusi komersial di `/corporat` (B2B Job/Loop; alias `/institusi`, `/cowork`). **B2G** = pintu `/pemerintah` (alias `/b2g`): **on-prem di DC klien** + lisensi Edge + **Loop wajib**.

---

## 2. Apa yang jalan DI MANA

```text
┌─────────────────────────────────────────────────────────────┐
│  DC / server milik instansi (on-prem)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Edge binary / image Nexus (lisensi terikat)          │  │
│  │  • Data plane WAF + Reflex + antibodi cache           │  │
│  │  • NEX-AI runtime: nex-ai-protect / nex-ai-reflex     │  │
│  │  • Hanya host yang diizinkan kontrak                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                         ▲ artefak / sinyal terbatas         │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│  Nexus (operator) — TIDAK diserahkan ke klien               │
│  • Source code monorepo penuh                               │
│  • Control plane SOC (:8081 / :3001)                        │
│  • Orkestrasi Job Cowork / Loop + memori imun pusat         │
│  • Build pipeline & kunci lisensi runtime                   │
└─────────────────────────────────────────────────────────────┘
```

| Diserahkan ke instansi | Tidak diserahkan |
| --- | --- |
| Image/binary Edge berlisensi + konfigurasi host | Source code gateway / NEX-RED / portal |
| Artefak Job (MD/JSON) sesuai kontrak | Control plane SOC penuh |
| Runbook operasi tepi (L0/L1 di sisi mereka) | Hak redistribute / fork produksi |
| Model NEX-AI runtime yang diizinkan lisensi | Bobot & pipeline pelatihan di luar kontrak |

**Jujur:** paket B2G = **lisensi runtime + jasa Loop**, bukan jual IP source.

---

## 3. Mengapa tidak “bisa diganti setelah 1 tahun lisensi”

Pitch investor / risk owner: cabut Nexus ≠ “copy binary lalu jalan sendiri selamanya”.

| Moat operasional | Efek |
| --- | --- |
| **Loop wajib** | Lisensi Edge tanpa retainer Loop = kontrak tidak aktif (update antibodi, jadwal Job, support) |
| **Update & artefak** | Pola virtual patch, vaccine-probe, memori imun host — mengalir lewat Loop, bukan file sekali unduh |
| **Runtime terikat lisensi** | Binary/image cek masa berlaku + fingerprint instalasi (desain); habis masa = fail-closed atau mode baca-saja sesuai kontrak |
| **Control plane tetap di Nexus** | Klien punya tepi; Nexus tetap wasit berkala — bukan “SOC penuh diserahkan” |

Ini selaras moat produk di [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) §8 (jalur di depan origin + jejak risiko), diperkuat untuk narasi on-prem.

---

## 4. Narasi pitching: satu portal, tier adaptif

```text
  UMKM → Sekolah → Startup → Corporat (B2B) → Pemerintah (on-prem)
     │        │         │            │              │
   site+pagar  header tepi  tepi/Job    Job/Loop     Edge lisensi
   15–35rb     15–35rb      45–300rb    200–300rb+   + Loop wajib
```

- **Satu situs** Channel Portal — harga & copy menyesuaikan peran (dan cabang “punya website?” di UMKM/sekolah/startup).  
- **B2G** melewatkan kuis website → langsung paket on-prem.  
- Investor melihat **funnel naik margin**: volume murah (UMKM) → wasit B2B → retainer on-prem B2G.  
- Unit ekonomi detail: [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md).

Portal: [`nexus-gaas-web/`](../../nexus-gaas-web/) → `/pemerintah`. Alias lama `/b2g` tetap redirect.

---

## 5. Paket ilustrasi B2G (pitching — bukan HPS resmi)

| Paket | Isi | Bentuk harga (ilustrasi) |
| --- | --- | --- |
| **Lisensi Edge On-Prem** | Binary/image di DC klien · 1 zona/DC · host terbatas kontrak · **source tidak termasuk** | **Rp 18.000.000** / tahun |
| **Loop On-Prem (wajib)** | Job terjadwal + update + artefak + dukungan operator · tanpa Loop lisensi tidak diperpanjang | **Rp 3.500.000** / bulan |
| **Custom / multi-DC** | Multi-zona, air-gap terbatas, integrasi SIEM/log klien, pelatihan L0/L1 | **Custom** (WA) |

Pembayaran pitching: **Kredit** / WhatsApp kontak — **bukan** Midtrans/e-procurement otomatis. Top-up: pending + form bukti + approve. QRIS atau VA bank milik pemilik **belum live**.

---

## 6. Status jujur

| Siap untuk pitching | Belum siap produksi B2G |
| --- | --- |
| Dokumen arsitektur & batasan IP | Packaging binary berlisensi produksi + enforcement runtime |
| Pintu `/pemerintah` (alias `/b2g`) + harga ilustrasi | Pengadaan formal (HPS, SIPLah, E-Katalog) |
| Narasi adaptif segmen di portal | Deploy on-prem teruji di DC pemerintah |
| Unit ekonomi transparan | SLA uptime data center / sertifikasi regulator |
| Mesin Job/Loop lab (sama fondasi B2B) | Kontrak hukum + NDA + audit source escrow (jika diminta) |

Jangan klaim: eBPF XDP nyata, SOC otonom 24/7, Shannon/pentest exploit, Channel Starter produksi+billing selesai, atau Loop GaaS di harga Rp 20rb.

---

## 7. Relasi ke B2B & distribusi pilot

| Dokumen | Peran |
| --- | --- |
| [COWORK_B2B.md](./COWORK_B2B.md) | GTM Job/Loop **hosted operator** (fintech, integrator) |
| Dokumen ini | GTM **on-prem DC instansi** + Loop wajib |
| [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) | Demo awal tetap PC+tunnel; B2G produksi = target DC klien |

Demo investor boleh tetap dari lab/PC operator; pitch B2G menjelaskan **target state** on-prem tanpa mengklaim sudah live di kementerian.

---

## 8. Sprint B2G (Milestone 21 — pitching)

| # | Task | Status |
| --- | --- | --- |
| B2G-1 | Dokumen COWORK_B2G + unit ekonomi | **Selesai** (2026-08-23) |
| B2G-2 | Portal `/pemerintah` + hub segmen (alias `/b2g`) | **Selesai** (kode portal) |
| B2G-3 | Packaging image Edge berlisensi (produksi) | **Belum** |
| B2G-4 | Template proposal/HPS ilustrasi | **Belum** |
| B2G-5 | Pilot on-prem satu instansi (lab/staging) | **Belum** |

---

*B2G pitching package — selaras keputusan pemilik 2026-08-23.*
