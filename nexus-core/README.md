# nexus-core — mesin tepi, wasit, dan lab

**nexus-core** adalah mesin Nexus Cyber di monorepo FASE3 (`D:\NEXUS\nexus-core\`): WAF Go, Job Cowork (NEX-RED), konsol operator, generator Channel Starter, dan lab `deploy-local`.

**Bukan** situs jual. Pintu jual Channel Portal (Next.js `:3003`) ada di folder saudara [`../nexus-gaas-web/`](../nexus-gaas-web/). Produksi Vercel kanonik: [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS).

| | **nexus-core** | **nexus-gaas-web** |
| --- | --- | --- |
| Peran | Tepi, kokpit, wasit, cetak site, nyalakan mesin, AI lokal | Website GaaS / Channel Portal (jual) |
| Port khas | WAF `:8080` · SOC `:8081`/`:3001` (localhost) · Starter `:3010` | `:3003` |
| Inti yang sulit ditiru | Job Cowork (ukur → kendalikan → uji, `replay_missed` ≠ hijau palsu) | Copy, harga, login/Kredit lab |

Model produk: [`docs/PRODUCT_MODEL.md`](./docs/PRODUCT_MODEL.md). Klaim teknis: [`docs/CAPABILITIES.md`](./docs/CAPABILITIES.md), [`docs/LIMITATIONS.md`](./docs/LIMITATIONS.md). Keputusan terbuka: [`docs/DECISIONS_OPEN.md`](./docs/DECISIONS_OPEN.md). Tata letak git: [`docs/REPO_LAYOUT.md`](./docs/REPO_LAYOUT.md).

Origin lab default: portofolio **Vercel** di belakang WAF (`PROTECTED_HOST` = **`portfolio.nexus-lab.test`**). Folder `playground/` diarsip — [`docs/PLAYGROUND_ARCHIVE.md`](./docs/PLAYGROUND_ARCHIVE.md). **Jangan** tembak `*.vercel.app` langsung saat mengklaim Nexus melindungi.

---

## Struktur folder (nama di disk hari ini)

Nama direktori **tidak** diubah. Kolom “peran” = bahasa operator; kolom “legend” = nama masa depan opsional (bukan rename).

| Folder di `nexus-core/` | Peran | Legend (opsional, jangan git mv) |
| --- | --- | --- |
| [`nexus-core-gateway/`](./nexus-core-gateway/) | **Tepi** — WAF Go `:8080`, control plane `:8081` | `edge` |
| [`nexus-admin-dashboard/`](./nexus-admin-dashboard/) | **Kokpit** — Command Center operator `:3001` | `operator` |
| [`NEX-RED/`](./NEX-RED/) | **Wasit** — scan jinak + Job Cowork | `cowork` |
| [`channel-starter/`](./channel-starter/) | **Cetak site** — form/CLI → template UMKM `:3010` | `starter` |
| [`deploy-local/`](./deploy-local/) | **Nyalakan mesin** — Docker + Caddy + `START.bat` | `runtime` |
| [`docs/`](./docs/) | Kontrak produk & operasi | — |
| [`scripts/`](./scripts/) | Hook CI, NEX-AI check, otomasi lab | — |
| [`postgres-init/`](./postgres-init/) | SQL init Postgres lab | — |
| [`NEX-AI/`](./NEX-AI/) | **AI** — latih/eval model milik pemilik (`nex-ai-protect` / `nex-ai-reflex`) | `ai` |
| [`nex-ai-models/`](./nex-ai-models/) | GGUF + import Ollama lokal (bukan Hub) | — |

Juga di pohon ini: `start-dev.bat` (dev tanpa compose penuh), `CHANGELOG.md`, `ROADMAP.md`. Portal **bukan** di sini — `../nexus-gaas-web/`. Nama lama `nexus-channel-portal/` di akar repo **bukan** lokasi kanonik.

```
D:\NEXUS\                          git root
  nexus-gaas-web\                  Channel Portal :3003
  nexus-core\
    nexus-core-gateway\            tepi
    nexus-admin-dashboard\         kokpit
    NEX-RED\                       wasit
    channel-starter\               cetak site
    deploy-local\                  nyalakan mesin  ← START.bat
    docs\  scripts\  postgres-init\
    NEX-AI\  nex-ai-models\
```

---

## Arsitektur (lab)

```text
  Pengunjung
      → Caddy / tunnel (:80 / URL tunnel)
      → Gateway WAF :8080
      → origin portofolio Vercel (lab)

  Control plane (jangan tunnel / jangan publik)
      → Gateway SOC :8081  +  dasbor :3001   (127.0.0.1)

  Job Cowork
      → NEX-RED (bridge :3004) + agen HTTP ke WAF + Host: PROTECTED_HOST

  Channel Starter (cetak site)
      → :3010  (portal lab memanggil ini)

  Channel Portal (jual)
      → ../nexus-gaas-web  :3003
```

eBPF/XDP di kode = **stub**. Loop GaaS penuh **bukan** paket ~Rp 20rb.

---

## Kasus pakai (jujur)

| Kasus | Apa yang nyata | Bukan |
| --- | --- | --- |
| Operator Job Cowork | Orkestrasi di `NEX-RED/jobs/` + tepi; tutup `CLOSED_OK` / `CLOSED_GAP` | Pentest Shannon / “anti zero-day” |
| Generate situs UMKM | `channel-starter` + portal `/order` (20 Kredit lab) | WAF penuh / Job / Loop |
| Pagar tipis | `cli.py upsell enable --slug … --tier tepi` — **tambah** host ke peta lab (portfolio tetap) | Setiap generate 20 Kr; debit 20 Kr; Loop; mass CNAME |
| Demo “Nexus melindungi” | Trafik lewat `PROTECTED_HOST` / IP laptop + Caddy | URL Vercel origin langsung |

Starter ~Rp 20rb = website + header tepi (lab). **Bukan** full WAF, **bukan** Job Cowork.

---

## Nyalakan lab

Git root: `D:\NEXUS`. Skrip 1 klik:

**`nexus-core\deploy-local\START.bat`**

Prasyarat: Docker Desktop Running; `nex-ai-protect` **dan** `nex-ai-reflex` di Ollama lokal (`nex-ai-models\IMPORT-OLLAMA.bat`, bukan Hub). `START-OFFLINE.bat` **ditolak** (playground diarsip).

1. Double-click `deploy-local\START.bat` (dari folder `nexus-core`, atau path penuh di atas).
2. Buka **http://127.0.0.1** atau **http://portfolio.nexus-lab.test** (Caddy → WAF).
3. SOC opsional: `http://127.0.0.1:3001` — jangan expose.

Panduan: [`deploy-local/README.md`](./deploy-local/README.md). Juri/tunnel: [`docs/JURY_PUBLIC_ACCESS.md`](./docs/JURY_PUBLIC_ACCESS.md). Git: [`docs/GIT_WORKFLOW.md`](./docs/GIT_WORKFLOW.md).

Dev (ubah kode): `start-dev.bat` — **jangan** bersamaan dengan `START.bat` (port 80/8080).

---

## Clone

Tidak ada submodule. Origin GitHub mesin: [NEXUS-CYBER-FASE3](https://github.com/Thbetyfu/NEXUS-CYBER-FASE3).

```bash
git clone https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
cd NEXUS-CYBER-FASE3
```

Setelah `git pull`: `nexus-core\deploy-local\blue-team\STOP.bat` lalu `nexus-core\deploy-local\START.bat`.

---

## Yang ada di kode hari ini (ringkas)

| Lapisan | Perilaku |
| --- | --- |
| WAF `:8080` | Reverse proxy, Reflex regex, rate limit, CSRF, unggah/vault lab. Bukan API SOC. |
| Control plane `:8081` | Telemetri, ban, Job sync — `127.0.0.1`. Bukan JWT enterprise. |
| Command Center `:3001` | Operator GaaS. Bukan login pelanggan portal. |
| NEX-RED | HTTP jinak + defense delta + Job. Bukan proof-by-exploitation. |
| Channel Starter `:3010` | Generate template. Bukan Loop di 20 Kredit. |
| NEX-AI | Reflex sinkron; `nex-ai-protect` asinkron. Lab fail-closed tanpa kedua nama lokal. CI: `NEX_AI_REQUIRED=0`. |

Indeks dokumen: [`docs/README.md`](./docs/README.md).
