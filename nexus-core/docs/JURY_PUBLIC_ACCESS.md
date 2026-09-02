# Akses publik untuk juri (PC 24/7 + Cloudflare Tunnel)

**Versi:** 0.1.0 / 2026-08-27  
**Status:** Alur + skrip Windows siap — **bukan** hotspot lab.  
**Terkait:** [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md), [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md), [`../deploy-local/jury/README.md`](../deploy-local/jury/README.md)

---

## 1. Alur (yang juri lihat)

```text
Juri (HP / laptop jaringan mana pun)
        │
        ▼
  https://….trycloudflare.com   ← URL dari skrip tunnel
        │
        ▼
  cloudflared di PC Anda
        │
        ▼
  localhost:80  (Caddy)
        │
        ▼
  Nexus WAF :8080  →  Portofolio Vercel (origin)
```

| Publik (boleh) | Lokal saja (dilarang tunnel) |
| --- | --- |
| Caddy `:80` → WAF → portofolio | Command Center `:3001` |
| Channel Portal `:3003` (**skrip terpisah** `-Portal`) | Control plane `:8081` |
| Preview Starter via `/starter` di portal | Postgres / Redis / NEX-RED |

**Bukan hotspot.** Juri tidak perlu join Wi‑Fi Anda. **Juri WAF** ≠ **pilot toko:** toko = `START-PORTAL-PILOT.bat` (`:3003`); juri = skrip ini (`:80`).


---

## Prasyarat PC

1. Docker Desktop **Running**
2. Repo sudah clone (tanpa submodule). Origin = Vercel di belakang WAF.
3. Port **80** / **8080** tidak bentrok dengan `start-dev.bat`
4. PC: sleep OFF (untuk sesi juri / 24/7)
5. Internet aktif (tunnel butuh ke Cloudflare)

**PC baru belum install apa pun?** Jalankan dulu **`nexus-core/deploy-local/jury/PREP-PC-SERVER.bat`** — unduh image Docker, npm, pip, buat `.env`. Daftar software + ENV: [`PC_MAIN_SERVER.md`](./PC_MAIN_SERVER.md) §2.

---

## 3. Cara jalanin dari Cursor / Explorer (Windows)

### PC baru — persiapan sekali

1. Install Git, Docker Desktop, Node 20+, Python 3.10+ (lihat [`PC_MAIN_SERVER.md`](./PC_MAIN_SERVER.md) §2)
2. Double-click **`nexus-core\deploy-local\jury\SETUP-ENV-PC-SERVER.bat`** (atau lewat `PREP-PC-SERVER.bat`)
3. Simpan **`NEXUS_ADMIN_TOKEN`** yang ditampilkan — untuk login SOC lokal
4. Sekali: **`nexus-core\deploy-local\ALLOW-DEV-LAPTOP.bat`** (UAC Yes)

### Satu klik demo juri (disarankan)

1. Buka folder `nexus-core\deploy-local\jury\`
2. Double-click **`START-FOR-JURY.bat`**
3. Tunggu lab Docker offline hidup
4. Di jendela tunnel, salin URL `https://….trycloudflare.com`
5. Kirim URL itu ke juri / uji dari HP (data seluler)

Matikan: **`STOP-FOR-JURY.bat`** (tunnel + opsi stop lab).

Status: **`STATUS-FOR-JURY.bat`**

### Dari terminal Cursor

```powershell
cd d:\NEXUS\nexus-core\deploy-local\jury
.\START-FOR-JURY.bat
```

Atau hanya tunnel (lab sudah jalan):

```powershell
cd d:\NEXUS
.\nexus-core\scripts\tunnel\nexus-tunnel.ps1
# default = port 80 (Caddy → WAF). JANGAN pakai -Dashboard.
```

Portal jual (opsional, jendela kedua):

```powershell
cd d:\NEXUS\nexus-gaas-web
npm install
npm run dev
# lalu di jendela lain, dari git root:
cd d:\NEXUS
.\nexus-core\scripts\tunnel\nexus-tunnel.ps1 -Port 3003
```

---

## 4. Checklist sebelum panggil juri

- [ ] `http://127.0.0.1` di PC menampilkan portofolio lewat Nexus  
- [ ] URL trycloudflare terbuka dari HP **luar** Wi‑Fi rumah  
- [ ] Halaman yang terbuka = site di belakang WAF (bukan SOC)  
- [ ] Copy jujur: *pilot PC operator + tunnel — bukan SLA data center*  
- [ ] SOC `:3001` / `:8081` **tidak** punya URL publik  

---

## 5. URL trycloudflare vs domain tetap

| Mode | Kapan |
| --- | --- |
| **Quick (`trycloudflare`)** | Demo juri hari ini — URL berubah tiap restart tunnel |
| **Named tunnel + domain** | 24/7 permanen — setup di Cloudflare Zero Trust (nanti) |

Skrip v1 memakai quick tunnel. Untuk hostname tetap, ikuti checklist di [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) §3.

---

*Juri public access 2026-08-27 — B2B-3d skrip.*
