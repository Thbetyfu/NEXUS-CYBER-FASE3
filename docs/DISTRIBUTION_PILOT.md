# Distribusi Pilot — PC Operator + Tunnel

**Versi:** 0.1.0 / 2026-08-23  
**Status:** Keputusan tahap awal — **disepakati**  
**Terkait:** [DECISIONS_OPEN.md](./DECISIONS_OPEN.md), [COWORK_B2B.md](./COWORK_B2B.md), [COWORK_B2G.md](./COWORK_B2G.md), [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md), [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 1. Keputusan

Untuk **tahap distribusi / demo awal**, Nexus Cyber dijalankan dari:

| Komponen | Pilihan |
| --- | --- |
| Host utama | **PC pribadi high-end milik operator** (menyala **24/7**) |
| Akses publik | **Tunnel** (mis. Cloudflare Tunnel) — tanpa VPS dulu |
| VPS cloud | **Belum** — ditunda sampai volume klien / SLA menuntut |

Tujuan: seluruh stack (portal, Channel Starter, gateway, Job Cowork, lab) **aktif di satu PC** dan **bisa diakses orang luar** lewat hostname publik, tanpa kesalahan konfigurasi yang mengekspos control plane.

---

## 2. Apa yang boleh publik lewat tunnel

| Layanan | Publik? | Catatan |
| --- | --- | --- |
| Channel Portal (`nexus-channel-portal`) | **Ya** | Pintu jual |
| Site UMKM / origin Channel Starter | **Ya** | Subdomain lewat Caddy/WAF |
| WAF data plane (HTTP/HTTPS) | **Ya** | Satu atau beberapa `PROTECTED_HOST` |
| Command Center / SOC (`:3001`, `:8081`) | **Tidak** | Hanya localhost / VPN |
| Postgres, Redis, bridge internal | **Tidak** | Loopback saja |
| NEX-RED API mentah | **Tidak** | Lewat operator saja |

Aturan emas: **jangan tunnel-kan control plane** ke internet.

**Onboard kanal (operator):** di SOC hanya mendaftarkan **Origin URL** + **protected host** ke gateway. DNS/CNAME atau tunnel ke hostname publik tetap di PC/Caddy/cloudflared — **bukan** dari form SOC, **bukan** auto-provision Docker untuk klien Cowork. Channel Starter tetap jalur entry terpisah.

---

## 3. Checklist operasi PC 24/7

- [ ] Power plan: tidak sleep / hibernate  
- [ ] UPS (sangat disarankan) — listrik putus = semua klien down  
- [ ] Docker Desktop / stack `deploy-local` auto-start (opsional Task Scheduler)  
- [ ] Tunnel daemon (cloudflared) sebagai service Windows — restart otomatis  
- [ ] Hostname publik terdaftar (portal + contoh site)  
- [ ] Backup mingguan: config, `hosts-registry`, artefak Job  
- [ ] Copy kontrak/WA jujur: *pilot hosting di infrastruktur operator — bukan SLA data center*

---

## 4. Alur demo “semua orang bisa akses”

```text
Internet → Tunnel → Caddy/WAF (publik)
                      ├── portal.nexus… (Channel Portal)
                      ├── {slug}.nexus… (site Starter)
                      └── (opsional) host demo Cowork
                 ↘ localhost saja: SOC, DB, NEX-RED bridge
```

1. Nyalakan stack lab/produksi lokal di PC.  
2. Pasang tunnel → map hostname ke port portal / Caddy.  
3. Uji dari HP (jaringan lain): portal + satu site + WA CTA.  
4. Demo B2B: jalankan Job di PC → kirim artefak; klien tidak perlu masuk SOC.

---

## 5. Harga jual tahap pilot (PC + tunnel)

Karena biaya infrastruktur tahap ini ≈ **Rp 0** (PC sendiri), harga **disesuaikan segmen** di **satu portal**:

| Segmen | Route | Belum punya website | Sudah punya website |
| --- | --- | --- | --- |
| **UMKM** | `/umkm` | **Rp 20.000** Website Starter (header tepi) · **Rp 35.000** Pagar tipis | **Rp 15.000** pagar header · **Rp 28.000** Pagar tipis |
| **Sekolah** | `/sekolah` | Sama struktur 20 / 35 (copy sekolah) | Sama struktur 15 / 28 |
| **Startup** | `/startup` | Landing+pagar **Rp 45.000** (header tepi) · Landing+Tepi **Rp 75.000** (Alur A Reflex, 1 host lab) · Job **Rp 200.000** | Tepi **Rp 75.000** (Alur A, 1 host lab) · Job **Rp 200.000** · Loop **Rp 300.000** |
| **Corporat** | `/corporat` | **Cabang deploy:** Hosted = Job **Rp 200.000** · Loop **Rp 300.000**; On-prem (besar) = Edge **Rp 18jt**/tahun · Loop **Rp 3,5jt**/bulan |
| **Pemerintah** | `/pemerintah` | Lisensi Edge On-Prem **Rp 18jt**/tahun · Loop On-Prem **Rp 3,5jt**/bulan · Custom — **tanpa** kuis website; target DC instansi |

Homepage `/` = hub pilih segmen. Setelah pilih peran: UMKM/sekolah/startup → **sudah punya website?**; Corporat → **hosted vs on-prem**; Pemerintah → langsung paket on-prem.

**Pagar** 15rb / Starter 20rb = **header tepi** + hostname lab. **Pagar tipis 35rb / 28rb** dan **Startup Tepi 75rb** = Reflex di WAF (Alur A), 1 host lab, **bukan** Job, **bukan** pulih Vercel, **bukan** alert Telegram pelanggan. Landing startup 45rb = header tepi saja.

**Catatan unit ekonomi (pilot PC+tunnel, infra ≈ 0):** cabang “sudah punya web” lebih murah karena tanpa slot template. Jangan jual Loop institusi/B2G di harga warung. Tabel jual/COGS/margin: [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md). Narasi on-prem: [COWORK_B2G.md](./COWORK_B2G.md).

---

## 6. Batasan jujur

- Uptime bergantung listrik, ISP rumah, dan tunnel.  
- Bukan SOC 24/7 otonom.  
- Satu titik gagal = PC operator.  
- PSP pihak ketiga (Midtrans/Stripe) **jangan**. Top-up Kredit = QRIS/VA milik pemilik + bukti + approve (**belum dikode**). F-10 / provisioner massal tetap **ditunda**.

---

## 7. Kapan pertimbangan VPS

- ≥ beberapa site Starter yang wajib hidup tanpa bergantung PC rumah, **atau**  
- Klien Loop bayar dan minta klaim uptime lebih kuat, **atau**  
- PC tidak bisa dijamin 24/7.

Sampai saat itu: **PC + tunnel = inti distribusi awal.**

Rencana minggu 1–4 sampai keputusan VPS: [PRODUCT_LAUNCH_30_DAYS.md](./PRODUCT_LAUNCH_30_DAYS.md).

---

*Distribusi pilot 2026-08-23 — selaras keputusan pemilik.*
