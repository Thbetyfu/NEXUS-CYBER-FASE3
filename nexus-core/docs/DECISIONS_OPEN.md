# Keputusan Terbuka — Nexus Cyber

**Pembaruan:** 2026-09-01  
**Tujuan:** Agar tim (dan agen) **tidak hilang arah** — jika jawaban belum ada di dokumen, **tanya pemilik proyek** sebelum mengunci implementasi atau klaim jual.

---

## Sudah disepakati (2026-08-22 → 2026-08-23)

| Topik | Keputusan |
| --- | --- |
| Model inti | **GaaS Edge Antibody Cowork** (Job/Loop), bukan model multi-tenant self-serve lama |
| UMKM Rp ~20rb/bulan | **Website + pagar dasar** = site template + **header tepi** (nosniff / frame / Referrer-Policy / CSP) + hostname lab `{slug}.nexus-lab.test` (Caddy `file_server` atau folder Vercel). **Bukan** WAF Reflex, **bukan** Job/Loop institusi. Jangan overclaim “pelindung tingkat UMKM” sebagai WAF. Lihat `/umkm` |
| **Pagar tipis (2026-08-31)** | SKU portal **35rb** (belum punya web) / **28rb** (sudah) = tepi shared: upsell `--tier tepi` → WAF Reflex judi/deface, **satu** host per lab. **Bukan** Starter 20 Kr, **bukan** Job, **bukan** Loop, **bukan** pulih Vercel, **bukan** `*.vercel.app` langsung |
| Harga Starter exact | **Rp 20.000/bulan** |
| Subdomain produksi | **`*.nexus.id`** |
| Pembayaran v1 (kontak) | WhatsApp `62895603358692` — pesan: *Saya mau beli Nexus Cyber!!* (saluran manusia, **bukan** gateway PSP) |
| **Kredit (mata uang kasir)** | Nama **Kredit** (**Kr**). **1 Kr = Rp 1.000**. SKU Starter = **20 Kr** di `/order`. Debit fail-closed; refund jika generate gagal. **Bukan** Job 200 Kr dari portal. **Bukan** e-money. Ledger **per tamu/akun** (bukan satu file `lab` untuk semua browser) |
| **Akun pelanggan portal v0 (2026-09-01)** | Channel Portal `:3003` saja: tamu (cookie httpOnly) / daftar / masuk. **Bukan** Operator Console `:3001`. **Bukan** F-10 roster/SOC. **Bukan** SSO. Daftar dari sesi tamu memindahkan Kredit tamu ke akun |
| **Top-up Kredit (2026-08-31)** | **Bukan** PSP pihak ketiga (Midtrans, Stripe, dll.) — **jangan** dikerjakan. Jalur yang disepakati (**belum dikode**): bayar ke **QRIS milik pemilik** dan/atau **Virtual Account bank milik pemilik** → kirim **bukti transfer** → operator **approve** jika bukti aman/sah → Kredit masuk ledger. Lab sekarang: keran `POST /api/kredit/faucet` (bukan settlement IDR) |
| Portal jual | **Reuse desain** portal legacy → modul baru **`nexus-channel-portal/`** (bukan submodule lama) |
| Nama entry | **Channel Starter** |
| Upsell keamanan | Job Cowork / Loop = **paket terpisah** |
| **Harga Cowork tahap pilot** | **Job Rp 200.000** (sekali) · **Loop Rp 300.000**/bulan (maks daftar v1) — lihat [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) |
| **Distribusi tahap awal** | **PC operator 24/7 + tunnel publik** — **tanpa VPS** dulu; SOC/DB tidak di-tunnel |
| **Portal segmen (satu situs)** | Hub `/` → `/umkm` · `/sekolah` · `/startup` · `/corporat` · `/pemerintah` (bukan website terpisah). Alias lama tetap redirect: `/institusi` → `/corporat` · `/b2g` → `/pemerintah` · `/cowork` → `/corporat` |
| **Harga UMKM / sekolah** | Harga tetap. **20rb/15rb** = **header tepi + hostname lab**, bukan WAF. **35rb/28rb Pagar tipis** = Reflex di tepi, 1 `PROTECTED_HOST` per lab (`gaas_active` + `--tier tepi`), **bukan** Job/Loop, **bukan** setiap warung otomatis |
| **Harga startup** | **Belum:** Landing+pagar Rp 45.000 (**header tepi**, bukan WAF) · Landing+Tepi Rp 75.000 (**Alur A Reflex**, `--tier tepi`, 1 host lab — mesin pagar tipis, **bukan** Job, **bukan** alert Telegram pelanggan) · Job 200rb. **Sudah:** Tepi Rp 75.000 (mesin sama) · Job 200rb · Loop 300rb |
| **Cabang “punya website?”** | Aktif di UMKM / sekolah / startup; **institusi & B2G** tanpa cabang website |
| Peran integrator | Tim Nexus **boleh** jadi agensi/integrator (build + deploy + opsional Loop) |
| Segment v1 | **B2C (UMKM) + B2B + B2G pitching** — lihat [COWORK_B2G.md](./COWORK_B2G.md) |
| **B2G (2026-08-23)** | **Paket pitching/on-prem diterima** (docs + pintu `/pemerintah`; alias `/b2g`): Edge lisensi + Loop wajib; source **tidak** diserahkan. **Bukan** pengadaan pemerintah / produksi B2G selesai |
| **Harga B2G ilustrasi** | Lisensi Edge On-Prem **Rp 18jt**/tahun · Loop On-Prem **Rp 3,5jt**/bulan · Custom — [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md) |
| Prioritas demo v1 (Q9) | **Cowork GaaS untuk klien B2B** (fintech, integrator, kanal digital) — bukan sprint form→site dulu; B2G = pitching paralel |
| Generator site | **Rule-based + template**, bukan LLM berat |
| F-10 / Rp19k otomatis / CNAME massal legacy | **Ditunda** — F-10 **bukan** prioritas; akun pelanggan v0 (login/tamu) **bukan** F-10 |
| Connect Git monorepo ke project warung | **Dilarang** — publish folder `sites/{slug}` ke Vercel, bukan repo Nexus |
| Loop GaaS / Job otomatis di Starter ~Rp 20rb | **Dilarang** — wasit Job = paket terpisah; bukan setiap warung dapat Job |

---

## Belum final — tanya pemilik

| # | Pertanyaan | Dampak |
| --- | --- | --- |
| **Q3** | **Domain** included di Starter atau **selalu terpisah**? | Margin, support |
| **Q5** | Berapa **template** v1 beyond 3? | Scope dev |
| **Q6** | Target UMKM **pertama** vertical copy? | Preset form |
| **Q10** | Satu brand Nexus vs sub-brand? | Positioning |
| **Q11** | Nomor QRIS / VA bank produksi + siapa yang approve bukti? | Instruksi top-up; jangan hardcode rekening di repo |

---

## Cara pakai dokumen ini

1. Agen/developer: cek **Belum final** sebelum mengunci fitur.  
2. Setelah jawaban, pindahkan ke **Sudah disepakati** + update [CHANNEL_STARTER.md](./CHANNEL_STARTER.md) dan [CHANGELOG.md](../CHANGELOG.md).

---

*Dokumen hidup — pemilik proyek adalah sumber kebenaran bisnis.*
