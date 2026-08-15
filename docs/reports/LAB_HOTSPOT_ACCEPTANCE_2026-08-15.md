# Laporan uji penerimaan lab hotspot — 15 Agustus 2026

**Klasifikasi.** Ini **arsip sesi**, bukan kontrak kemampuan produk. Klaim yang mengikat ada di `docs/CAPABILITIES.md` dan `docs/LIMITATIONS.md`.

**Jenis uji.** *Control-verification laboratory exercise* (verifikasi kontrol), **bukan** penetration test ofensif, **bukan** proof-by-exploitation, **bukan** setara Shannon/Strix.

**Standar rujukan (interpretatif).** ISO/IEC 27001: pengendalian yang dinyatakan harus dapat diuji. ISO/IEC 25010: *security* dan *reliability* diukur dari perilaku yang teramati, bukan dari narasi pemasaran. Tidak ada standar yang menyatakan suatu WAF “kebal zero-day.”

**Peran.** Blue team: laptop hotspot + Docker `START-OFFLINE`. Red team: laptop klien di SSID lab. Origin: container `nexus-local-portfolio`, bukan Vercel.

**Target.** `http://192.168.137.1` (Caddy :80 → gateway :8080).

**Kode yang relevan.** Gateway `main` `58550ac`; submodule portofolio `68b84d3` (sidik jari HTTP tidak melempar jika `crypto.subtle` kosong).

---

## 1. Tesis yang diuji

Hipotesis operasional (bukan hipotesis “aman mutlak”):

> Jika pengunjung hanya boleh menyentuh data plane publik, maka (a) situs portofolio tampil di belakang WAF, (b) control plane dan basis data tidak terpapar hotspot, (c) unggah gambar wajar diterima jalur AVSE, (d) lima kegagalan vault memicu autoban.

Hipotesis yang **tidak** diuji: “sistem menahan penyerang terampil dan zero-day.”

---

## 2. Metode

1. Postur otomatis: `deploy-local/red-team/CHECK.ps1` dari laptop red team.
2. Browser dengan sesi PoW/PACS ke IP hotspot (hard refresh setelah rebuild image).
3. Unggah satu berkas PNG 1×1 piksel (bukan payload ofensif).
4. Lima password vault salah, masing-masing ≥ 5 karakter (`salah1` … `salah5`).
5. Observasi teks UI dan kode HTTP; tidak ada kit exploit di folder red team.

**Cacat metode yang disengaja.** Encoding/obfuskasi Reflex diuji di unit test gateway, bukan dari hotspot. `SCAN.bat` (NEX-RED blackbox) tidak menjadi penutup sesi ini.

---

## 3. Hasil per butir checklist

| # | Pengujian | Hasil | Bukti ringkas | Interpretasi profesor |
| --- | --- | --- | --- | --- |
| 1 | Pintu benar (bukan Vercel) | **Lulus** | URL `http://192.168.137.1/`; bundle `index-BrTLgRVq.js` HTTP 200 | Trafik lab melewati WAF lokal. Membuka Vercel **tidak** menguji Nexus. |
| 2 | Situs / Gallery terlihat | **Lulus** | Judul portofolio; form Gallery dan vault ada | Origin offline merespons setelah PoW. |
| 3 | Unggah gambar wajar | **Lulus** | “Photo successfully uploaded and sanitized by AVSE”; daftar foto (1), lencana AVSE CLEANED | Jalur `/api/upload` + sesi CSRF berfungsi untuk PNG sah. **Tidak** membuktikan deteksi malware visual. |
| 4 | Vault 5× salah → ban | **Lulus** | Attempt 1–4 of 5; ke-5: “ACCESS DENIED: Your IP has been permanently blacklisted by Nexus Intel-Shield.” | Autoban lab hidup. Ini *rate-limit / lockout*, bukan kriptanalisis. |
| 5 | SOC `:3001` / admin `:8081` | **Lulus** | TCP tidak menerima dari red team | Pemisahan control plane terbukti dari hotspot. |
| 6 | Postgres `:5432` / Redis `:6379` | **Lulus** | Tertutup dari hotspot | Permukaan serangan basis data tidak diekspos ke klien lab. |
| 7 | Honeypot `:9090` | **Tidak diuji** | — | Opsional; bukan syarat lulus. |
| 8 | NEX-RED `SCAN.bat` | **Tidak ditutup sesi ini** | Pemeriksaan blackbox sebelumnya hanya postur (403/blokir probe), bukan exploit | NEX-RED v5 ≠ pentest. |

**Temuan insidental (bukan “menang/kalah”).**

- Akar 502 awal: rute origin tanpa skema `http://` (`unsupported protocol scheme ""`). Diperbaiki blue team (origin `http://portfolio:3002`).
- Gallery/vault sempat gagal di HTTP LAN karena `crypto.subtle` tidak ada (bukan secure context). Diperbaiki `fingerprint.ts` (`68b84d3`) lalu rebuild image. Pelajaran: **lab HTTP mematahkan API browser yang dianggap “selalu ada.”**

**Skrip tanpa browser.** `GET /` dari curl/`CHECK.ps1` → HTTP **403** (tantangan sesi). Itu **lulus postur**, bukan kegagalan situs.

---

## 4. Putusan

**Uji penerimaan lab: LULUS.**

Putusan yang **dilarang** ditarik dari data ini:

- “Blue team terlalu kuat / red team terlalu lemah.” Yang diukur adalah *apakah kontrol menyala*, bukan skill adversarial.
- “Nexus kebal zero-day / kejahatan siber.” Tidak ada eksperimen yang menyentuh kelas itu.
- “NEX-RED setara Shannon.” Kode tidak melakukan proof-by-exploitation.
- “eBPF XDP, JWT enterprise, pembayaran fail-closed.” Di luar sesi; stub atau ditunda sesuai dokumen hidup.

**Nilai ilmiah sesi ini.** Reproduktibilitas kontrol (pintu, zona, unggah sah, lockout). Itu fondasi ISO 27001: *declared control, tested control*. Fondasi itu **perlu**, tetapi **tidak cukup** untuk klaim ketahanan.

---

## 5. Agenda riset lanjutan (bukan janji produk)

Tidak ada arsitektur yang “menghindari semua zero-day.” Yang rasional: mempersempit jendela paparan, memisahkan zona, dan menguji dengan jujur.

**Pertahanan (prioritas bukti, bukan slogan)**

1. Mempertahankan pemisahan data plane / control plane (sudah terbukti di lab).
2. Memperkuat Reflex pada bentuk kanonik (percent, HTML, `\u`, komentar SQL, NFKC) + tes regresi; obfuskasi dalam tetap batasan.
3. AVSE: tes berkas sah vs berkas rusak/magic-byte salah — masih tes laboratorium, bukan antivirus komersial.
4. Ban/unban sebagai prosedur SOC, bukan “permanen” secara hukum/produk.
5. Jangan mengklaim PQC ke browser atau XDP drop sampai kodenya ada.

**Pengujian (naik kelas tanpa kit exploit di repo)**

1. Matriks encoding di CI (sudah ada benih di `reflex_normalize_test.go`), diperluas, **bukan** daftar payload di folder hotspot.
2. NEX-RED whitebox SAST pada repo sendiri: temuan sink berbahaya, bukan “64 ribu serangan.”
3. NEX-RED live checks: header, rute mutasi tanpa sesi, telemetri tidak publik — postur, bukan RCE.
4. RoE tertulis sebelum uji ofensif apa pun; target hanya IP lab.
5. Alat pihak ketiga (Shannon/Strix) hanya jika pemilik meminta, dengan disclaimer paritas.

Laporan ini menutup sesi 15 Agustus 2026. Sesi ofensif berikutnya harus punya hipotesis baru, RoE, dan kriteria gagal yang tidak sama dengan checklist hotspot.
