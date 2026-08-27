# Keputusan Terbuka — Nexus Cyber

**Pembaruan:** 2026-08-23  
**Tujuan:** Agar tim (dan agen) **tidak hilang arah** — jika jawaban belum ada di dokumen, **tanya pemilik proyek** sebelum mengunci implementasi atau klaim jual.

---

## Sudah disepakati (2026-08-22 → 2026-08-23)

| Topik | Keputusan |
| --- | --- |
| Model inti | **GaaS Edge Antibody Cowork** (Job/Loop), bukan model multi-tenant self-serve lama |
| UMKM Rp ~20rb/bulan | **Website + pelindung tingkat UMKM** (bukan Job/Loop institusi) — lihat `/umkm` |
| Harga Starter exact | **Rp 20.000/bulan** |
| Subdomain produksi | **`*.nexus.id`** |
| Pembayaran v1 | **Manual WhatsApp** `62895603358692` — pesan: *Saya mau beli Nexus Cyber!!* |
| Portal jual | **Reuse desain** portal legacy → modul baru **`nexus-channel-portal/`** (bukan submodule lama) |
| Nama entry | **Channel Starter** |
| Upsell keamanan | Job Cowork / Loop = **paket terpisah** |
| **Harga Cowork tahap pilot** | **Job Rp 200.000** (sekali) · **Loop Rp 300.000**/bulan (maks daftar v1) — lihat [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) |
| **Distribusi tahap awal** | **PC operator 24/7 + tunnel publik** — **tanpa VPS** dulu; SOC/DB tidak di-tunnel |
| **Portal segmen (satu situs)** | Hub `/` → `/umkm` · `/sekolah` · `/startup` · `/institusi` · `/b2g` (bukan website terpisah) |
| **Harga UMKM / sekolah** | **Belum punya web:** Rp 20.000 (site+pagar) · Rp 35.000 GaaS entry. **Sudah punya web:** Rp 15.000 pagar · Rp 28.000 pagar+status |
| **Harga startup** | **Belum:** Landing+pagar Rp 45.000 · Landing+Tepi Rp 75.000 · Job 200rb. **Sudah:** Tepi Rp 75.000 · Job 200rb · Loop 300rb |
| **Cabang “punya website?”** | Aktif di UMKM / sekolah / startup; **institusi & B2G** tanpa cabang website |
| Peran integrator | Tim Nexus **boleh** jadi agensi/integrator (build + deploy + opsional Loop) |
| Segment v1 | **B2C (UMKM) + B2B + B2G pitching** — lihat [COWORK_B2G.md](./COWORK_B2G.md) |
| **B2G (2026-08-23)** | **Paket pitching/on-prem diterima** (docs + `/b2g`): Edge lisensi + Loop wajib; source **tidak** diserahkan. **Bukan** pengadaan pemerintah / produksi B2G selesai |
| **Harga B2G ilustrasi** | Lisensi Edge On-Prem **Rp 18jt**/tahun · Loop On-Prem **Rp 3,5jt**/bulan · Custom — [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md) |
| Prioritas demo v1 (Q9) | **Cowork GaaS untuk klien B2B** (fintech, integrator, kanal digital) — bukan sprint form→site dulu; B2G = pitching paralel |
| Generator site | **Rule-based + template**, bukan LLM berat |
| F-10 / Rp19k otomatis / Midtrans massal | **Ditunda** — Midtrans fase berikutnya |

---

## Belum final — tanya pemilik

| # | Pertanyaan | Dampak |
| --- | --- | --- |
| **Q3** | **Domain** included di Starter atau **selalu terpisah**? | Margin, support |
| **Q5** | Berapa **template** v1 beyond 3? | Scope dev |
| **Q6** | Target UMKM **pertama** vertical copy? | Preset form |
| **Q10** | Satu brand Nexus vs sub-brand? | Positioning |

---

## Cara pakai dokumen ini

1. Agen/developer: cek **Belum final** sebelum mengunci fitur.  
2. Setelah jawaban, pindahkan ke **Sudah disepakati** + update [CHANNEL_STARTER.md](./CHANNEL_STARTER.md) dan [CHANGELOG.md](../CHANGELOG.md).

---

*Dokumen hidup — pemilik proyek adalah sumber kebenaran bisnis.*
