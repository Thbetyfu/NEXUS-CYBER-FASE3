# Keputusan Terbuka — Nexus Cyber

**Pembaruan:** 2026-08-22  
**Tujuan:** Agar tim (dan agen) **tidak hilang arah** — jika jawaban belum ada di dokumen, **tanya pemilik proyek** sebelum mengunci implementasi atau klaim jual.

---

## Sudah disepakati (2026-08-22)

| Topik | Keputusan |
| --- | --- |
| Model inti | **GaaS Edge Antibody Cowork** (Job/Loop), bukan model multi-tenant self-serve lama |
| UMKM Rp ~20rb/bulan | **Hanya** lapisan **Channel Starter** (website template), **bukan** Loop GaaS penuh |
| Harga Starter exact | **Rp 20.000/bulan** |
| Subdomain produksi | **`*.nexus.id`** |
| Pembayaran v1 | **Manual WhatsApp** `62895603358692` — pesan: *Saya mau beli Nexus Cyber!!* |
| Portal jual | **Reuse desain** portal legacy → modul baru **`nexus-channel-portal/`** (bukan submodule lama) |
| Nama entry | **Channel Starter** |
| Upsell keamanan | Job Cowork / Loop = **paket terpisah** (ratusan ribu ke atas) |
| Peran integrator | Tim Nexus **boleh** jadi agensi/integrator (build + deploy + opsional Loop) |
| Segment v1 | **B2C (UMKM) + B2B** — **B2G belum** prioritas |
| Generator site | **Rule-based + template**, bukan LLM berat |
| F-10 / Rp19k otomatis / Midtrans massal | **Ditunda** — Midtrans fase berikutnya |

---

## Belum final — tanya pemilik

| # | Pertanyaan | Dampak |
| --- | --- | --- |
| **Q3** | **Domain** included di Starter atau **selalu terpisah**? | Margin, support |
| **Q5** | Berapa **template** v1 beyond 3? | Scope dev |
| **Q6** | Target UMKM **pertama** vertical copy? | Preset form |
| **Q9** | Prioritas demo: form→site vs Job Cowork? | Roadmap sprint |
| **Q10** | Satu brand Nexus vs sub-brand? | Positioning |

---

## Cara pakai dokumen ini

1. Agen/developer: cek **Belum final** sebelum mengunci fitur.  
2. Setelah jawaban, pindahkan ke **Sudah disepakati** + update [CHANNEL_STARTER.md](./CHANNEL_STARTER.md) dan [CHANGELOG.md](../CHANGELOG.md).

---

*Dokumen hidup — pemilik proyek adalah sumber kebenaran bisnis.*
