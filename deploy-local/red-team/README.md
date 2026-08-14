# Red team — laptop yang menguji lewat hotspot blue team

Laptop ini = **penguji**. Tidak perlu Docker. Yang wajib: join Wi-Fi hotspot laptop blue team, lalu buka situs **lewat IP itu**.

Ini lab resmi terhadap WAF Nexus di jaringan hotspot. Bukan izin menyerang situs Vercel publik atau jaringan orang lain.

## 1 klik

1. Blue team sudah menjalankan `deploy-local\blue-team\START.bat` dan hotspot menyala.
2. Di laptop ini, buka Wi-Fi → pilih **`NEXUS-BLUE-LAB`** (password di `KARTU-BLUE-TEAM.txt`).
3. Double-click **`JOIN.bat`**.
4. Browser harus membuka portofolio **melalui Nexus** (alamatnya IP, misalnya `http://192.168.137.1`).
5. Opsional: **`SCAN.bat`** — NEX-RED blackbox (cek pintu & header, tanpa kit exploit). Perlu Python + clone repo ini.

`JOIN.bat` menunggu hingga ~90 detik, jadi boleh diklik dulu lalu baru connect Wi-Fi.

## Kalau JOIN gagal

- SSID salah (masih di Wi-Fi kampus/rumah, bukan `NEXUS-BLUE-LAB`).
- Blue team belum `START.bat` / hotspot mati.
- Isolasi klien: hotspot harus dari **laptop** blue team, bukan hotspot HP yang memblokir perangkat lain.
- Cadangan: ketik URL di kartu blue team ke browser.

## Yang tidak dilakukan skrip ini

Tidak mengirim payload serangan, tidak memecah Vercel, tidak scan internet. Pintu yang sah hanya IP hotspot hasil `JOIN.bat`.
