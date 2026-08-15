# ⚠️ Nexus Cyber Limitations

Dokumen ini adalah kontrak kejujuran produk. Pembaruan: 2026-08-15.

## Di luar cakupan (umum)

1. **Rekayasa sosial** — WAF tidak menghentikan karyawan yang menyerahkan sandi.
2. **Akses fisik** — cabut listrik, curi disk, konsol server.
3. **Insider** dengan shell pada host — bypass gateway.
4. **Celah CPU/firmware** (Spectre, dll.).
5. **Email** — bukan gerbang SMTP/malware lampiran.
6. **Pemulihan baris database** — self-repair hanya file template yang dipantau, bukan PITR Postgres.

## Batasan yang ada di kode (penting untuk demo)

7. **Bukan WAF “AI penuh” pada setiap request.** Reflex = regex. Model reasoning tidak wajib hidup; tanpa Ollama/API, filtrasi tetap regex.
8. **Bukan DDoS kernel.** `ebpf_stub.go` tidak `XDP_DROP`.
9. **Bukan PQC ke browser pengunjung.** Jangan klaim MitM-proof end-to-end.
10. **Command Center bukan benteng publik.** SOC di `127.0.0.1` + cookie operator. Hotspot red team hanya boleh menembak situs di `:80`, bukan dasbor.
11. **Lisensi lab** memakai kunci development (`nexus-cyber-dev`) — lockout 402 tidak mewakili produksi berbayar.
12. **Membuka origin Vercel langsung melewati Nexus.** Bukti WAF hanya lewat Caddy/IP laptop.
13. **NEX-RED bukan Shannon/Strix.** v5 punya pemeriksaan HTTP tanpa sesi plus **dua akun** jika lab menyediakan session-pair atau token env; browser lab opsional (Playwright). Tidak ada proof-by-exploitation.
14. **PACS/Base64** (jika aktif) adalah obfuskasi, bukan enkripsi.
15. **Regex Reflex masih bisa dilompati** obfuskasi dalam (bukan percent/HTML/`\u`/komentar `/* */`/huruf fullwidth yang sudah dinormalisasi). Lihat arsip `docs/VULNERABILITY_ASSESSMENT.md` sebagai sejarah, bukan daftar celah hari ini.
16. **Provisioner SaaS per-tenant dan pembayaran otomatis** belum menjadi produk jadi.
17. **Hotspot lab memakai HTTP.** Sidik jari Gallery memakai SHA-256 jika `crypto.subtle` ada, atau digest cadangan jika tidak. Itu header telemetri, bukan bukti HTTPS/PQC.

## Yang sengaja ditunda

Webhook pembayaran fail-closed / Midtrans-Stripe orkestrasi: tidak dikerjakan sampai pemilik meminta (lihat CHANGELOG Unreleased).
