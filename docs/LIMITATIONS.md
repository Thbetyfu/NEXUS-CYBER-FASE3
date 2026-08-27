# Nexus Cyber Limitations

Kontrak kejujuran produk GaaS. **Model:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md). Pembaruan: 2026-08-23.

---

## Batasan model GaaS

1. **Dua lapisan produk** — Channel Starter (murah, **lab v0.1** `channel-starter/`) ≠ Loop GaaS (mahal, **sudah** mesin lab). Jangan gabung klaim.
2. **Bukan self-serve legacy** — F-10 **ditunda**; Starter v1 = **`nexus-channel-portal/`** + form + template.
3. **Bukan SOC otonom 24/7** — Job Cowork + operator; manusia pemilik risiko L0/L1.
4. **Rp ~20rb/bulan** — realistis hanya untuk **website template** shared; **tanpa** Job Cowork, domain included, atau support unlimited.
4b. **Hosting tahap pilot** — PC operator 24/7 + tunnel; **bukan** SLA data center. Control plane SOC **tidak** dipublikasikan lewat tunnel. Lihat [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).
4c. **B2G on-prem** — pitching/arsitektur + pintu `/b2g` **ada**; packaging binary berlisensi produksi, pengadaan formal, dan pilot DC instansi **belum**. Source & control plane **tidak** diserahkan. Lihat [COWORK_B2G.md](./COWORK_B2G.md).
5. **Bukan pentest exploit** — NEX-RED = wasit purple-team jinak.
6. **Residual wajib jujur** — `origin_open` / `replay_missed` tidak disembunyikan.
7. **Bukan GRC bank penuh** — irisan kanal digital saja.
8. **Bukan approve regulator** — POJK/BSSN = pembingkai kompetisi, bukan sertifikasi.
9. **DIY bisa meniru komponen** — moat = operasi + loop + jejak, bukan “tidak bisa ditiru”.

---

## Di luar cakupan (umum)

1. Rekayasa sosial, akses fisik, insider shell, celah firmware
2. Email / SMTP malware
3. Pemulihan database — self-repair hanya file template terpantau
4. DDoS volumetric — eBPF **stub**, tidak `XDP_DROP`
5. RCE memori tanpa ubah file — self-repair tidak mendeteksi

---

## Batasan kode (demo & produksi)

6. **Reflex = regex** — bukan AI pada setiap request; model reasoning opsional.
7. **Command Center / Operator GaaS bukan publik** — `:8081` / `:3001` loopback; SOC API 404 di `:8080`. Bukan dashboard pelanggan; UI lab (War Room/MTD/license) **dihapus** — fokus Job Cowork.
8. **Satu `PROTECTED_HOST` per instance** — bukan multi-tenant otomatis.
9. **PACS/Base64** — obfuskasi, bukan enkripsi.
10. **NEX-RED origin direct** — hanya HTTP privat; publik/HTTPS ditolak untuk delta.
11. **Telegram** — pager setelah ban; bukan GPS; bukan deteksi mandiri.
12. **F-10 back-office** — ditunda; roster pelanggan **bukan** di SOC `:8081`.

---

## Yang sengaja ditunda (legacy subscription)

- Webhook pembayaran fail-closed / Midtrans-Stripe
- Back-office F-10 di portal legacy
- Provisioner per-tenant CNAME massal

Lihat [CHANGELOG.md](../CHANGELOG.md) Unreleased.

---

*Limitations GaaS — 2026-08-22.*
