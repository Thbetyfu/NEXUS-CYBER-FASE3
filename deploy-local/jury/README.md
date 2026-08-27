# Jury / akses publik — tanpa hotspot

Alur lengkap: [`../../docs/JURY_PUBLIC_ACCESS.md`](../../docs/JURY_PUBLIC_ACCESS.md) · kebijakan: [`../../docs/DISTRIBUTION_PILOT.md`](../../docs/DISTRIBUTION_PILOT.md)

## Satu klik (Windows)

| File | Fungsi |
| --- | --- |
| **`PREP-PC-SERVER.bat`** | PC baru: cek prasyarat, pull Docker, npm, pip, buat `.env` |
| **`SETUP-ENV-PC-SERVER.bat`** | Buat `.env` dari template + password/token acak |
| **`START-FOR-JURY.bat`** | Nyalakan lab OFFLINE (portofolio di belakang WAF) + Cloudflare Tunnel ke **port 80** |
| **`STATUS-FOR-JURY.bat`** | Cek Docker lab + cloudflared |
| **`STOP-FOR-JURY.bat`** | Hentikan tunnel; tanya apakah matikan lab juga |

## Alur

```text
Juri → https://….trycloudflare.com → cloudflared → Caddy :80 → WAF → Portofolio
```

**Dilarang:** tunnel ke `:3001` / `:8081` (SOC).

## Setelah START

1. Salin URL `https://….trycloudflare.com` dari jendela tunnel.  
2. Uji dari HP (data seluler).  
3. Kirim URL ke juri.

URL quick tunnel **berubah** tiap kali tunnel di-restart.
