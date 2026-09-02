# nexus-gaas-web — Channel Portal (situs jual GaaS)

Folder ini adalah **Channel Portal / website GaaS**: pintu jual Channel Starter (entry UMKM) dan copy upsell Edge Antibody Cowork. Lab lokal: port **3003**.

**Bukan** Command Center operator (`nexus-core/nexus-admin-dashboard`, `:3001` / `:8081`). **Bukan** WAF. **Bukan** mesin Job Cowork.

Deploy publik kanonik: repo [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS) → Vercel dari **root** repo itu. Folder ini adalah **salinan in-repo** di git FASE3 (`D:\NEXUS\nexus-gaas-web\`) untuk lab. Salinan kerja opsional `D:\nexus-gaas-web` **boleh drift**. Jangan Connect project warung (`warung-*`) ke monorepo ini.

## Produk

| | |
| --- | --- |
| Nama | Channel Portal (jual) |
| Stack | **Next.js** 16 · React 19 · Tailwind 4 · Framer Motion |
| Port lab | **3003** (`npm run dev`) |
| Kasir | **Kredit** per identitas — Isi = pending; Starter **20 Kr** di `/pesan/umkm-starter` (`/order` alias) |
| Kontak | WhatsApp **hanya on-prem**. UMKM–startup + Corporat hosted = form `/pesan/{sku}` |
| Pembayaran IDR | **Bukan** Midtrans/Stripe. Isi = pending + nomor WA `SALES.whatsapp` + form bukti + approve operator. **QRIS/VA milik pemilik belum live** |
| WhatsApp | `62895603358692` — **on-prem** (Corporat/Pemerintah) **dan** instruksi isi ulang Kredit. Bukan CTA “Pesan via WhatsApp” di kartu UMKM |

Login / daftar / tamu = **pelanggan storefront** (`/masuk`, `/daftar`). Bukan login operator Nexus.

## Relasi ke nexus-core

Generate situs **membutuhkan** Channel Starter di mesin core. **Node di PC** memanggil `CHANNEL_STARTER_URL` (default `http://127.0.0.1:3010`). **Browser** memakai `/starter/` (rewrite ke wizard) atau `CHANNEL_STARTER_PUBLIC_URL` — bukan `127.0.0.1` di HP pengunjung.

## Pilot HP (satu README)

```powershell
# jendela 1
cd nexus-core\channel-starter
python cli.py serve

# jendela 2
cd nexus-gaas-web
copy .env.local.example .env.local   # live + faucet 0 untuk publik
npm install
npm run dev

# jendela 3 (opsional — model tulis loopback, BUKAN tunnel)
cd nexus-core\deploy-local
START-LOCAL-LLM.bat

# jendela 4
cd nexus-core\deploy-local
START-PORTAL-PILOT.bat
```

Uji data seluler: `/gate` → daftar → `/kredit` Isi → WhatsApp + bukti → di PC `http://127.0.0.1:3003/operator/topup` → `/pesan/umkm-starter`. Sleep OFF. Login Cloudflare named tunnel = pemilik.

Form `/pesan/umkm-starter` → sesi (`nexus_portal_sid`) → ledger Kredit identitas itu → `POST` generate. Saldo kurang = **402**. CLI `channel-starter` di core tetap bisa generate tanpa debit (jalur operator). `/order` redirect ke form Starter.

Mesin tepi, Job, dan `START.bat`: [`../nexus-core/README.md`](../nexus-core/README.md). Model: [`../nexus-core/docs/PRODUCT_MODEL.md`](../nexus-core/docs/PRODUCT_MODEL.md).

Paket ~Rp 20rb / 20 Kredit = **website Starter**, bukan full WAF, bukan Loop/Job.

## Vercel

| Cara | Root Directory | Catatan |
| --- | --- | --- |
| **Kanonik** | root repo **NEXUS-CYBER-WEBISTE-GaaS** | Produksi situs jual |
| Connect Git **FASE3** (monorepo ini) | folder **`nexus-gaas-web`** | **Discouraged.** Owner reconnect di dashboard; agen tidak mengklik Vercel. |

Generate di produksi tetap butuh API Starter yang reachable — lab = `:3010` di PC operator, bukan “Vercel menjalankan WAF”.

## Skrip

```powershell
cd nexus-gaas-web
npm install
npm run dev
```

Buka http://127.0.0.1:3003

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Next.js `:3003` |
| `npm test` | Uji ledger Kredit + bukti isi ulang (tanpa auto-kredit) + approve fail-closed |
| `node scripts/approve-topup.mjs TU-…` | Operator: kreditkan pending (localhost `:3003`) |
| UI operator isi | `http://127.0.0.1:3003/operator/topup` (loopback; bukan URL tunnel; bukan SOC `:3001`) |
| `npm run build` / `npm start` | Build produksi / `next start -p 3003` |
| `npm run lint` | ESLint |

## Batasan (jujur)

- F-10 roster pelanggan penuh **ditunda**.
- Top-up: permintaan pending + WhatsApp pemilik + form bukti (`data/topup-proofs/`) + approve operator **ada**. QRIS/VA **belum live**. Bukan billing produksi. Bukan auto-kredit dari WA.
- Tidak menjual Job Cowork / Loop dari kasir 20 Kr.
- SOC `:3001`/`:8081` **jangan** di-tunnel sebagai “portal”.
- Ollama `:11434` **jangan** di-tunnel. Health: `GET /api/local-llm/health`. Fill: `POST /api/local-llm/fill-starter` (server fetch `NEXUS_LOCAL_LLM_URL`, model `NEXUS_LOCAL_LLM_MODEL` default `gemma3:1b`). Start: `nexus-core\deploy-local\START-LOCAL-LLM.bat`. Bukan NEX-AI WAF.
- Nama paket npm masih `nexus-channel-portal` — folder git = `nexus-gaas-web`.

Dokumen: [`../nexus-core/docs/NEXUS_CHANNEL_PORTAL.md`](../nexus-core/docs/NEXUS_CHANNEL_PORTAL.md), [`../nexus-core/docs/CHANNEL_STARTER.md`](../nexus-core/docs/CHANNEL_STARTER.md), [`../nexus-core/docs/LIMITATIONS.md`](../nexus-core/docs/LIMITATIONS.md).
