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
| Kasir | **Kredit** per identitas — lab: keran + Starter **20 Kr** di `/pesan/umkm-starter` (`/order` alias) |
| Kontak | WhatsApp **hanya on-prem**. UMKM–startup + Corporat hosted = form `/pesan/{sku}` |
| Pembayaran IDR | **Bukan** Midtrans/Stripe. Berikutnya (disepakati, **belum dikode**): QRIS/VA milik pemilik → bukti → approve → Kredit |
| WhatsApp | `62895603358692` **hanya on-prem** (Corporat On-prem + Pemerintah) |

Login / daftar / tamu = **pelanggan storefront** (`/masuk`, `/daftar`). Bukan login operator Nexus.

## Relasi ke nexus-core

Generate situs **membutuhkan** Channel Starter di mesin core:

`NEXT_PUBLIC_CHANNEL_STARTER_URL` / proxy → **`http://127.0.0.1:3010`**

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
| `npm test` | Uji ledger Kredit |
| `npm run build` / `npm start` | Build produksi / `next start -p 3003` |
| `npm run lint` | ESLint |

## Batasan (jujur)

- F-10 roster pelanggan penuh **ditunda**.
- Top-up QRIS/VA + approve **belum** di kode.
- Tidak menjual Job Cowork / Loop dari kasir 20 Kr.
- SOC `:3001`/`:8081` **jangan** di-tunnel sebagai “portal”.
- Nama paket npm masih `nexus-channel-portal` — folder git = `nexus-gaas-web`.

Dokumen: [`../nexus-core/docs/NEXUS_CHANNEL_PORTAL.md`](../nexus-core/docs/NEXUS_CHANNEL_PORTAL.md), [`../nexus-core/docs/CHANNEL_STARTER.md`](../nexus-core/docs/CHANNEL_STARTER.md), [`../nexus-core/docs/LIMITATIONS.md`](../nexus-core/docs/LIMITATIONS.md).
