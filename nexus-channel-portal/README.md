# Nexus Channel Portal

Pintu jual **Channel Starter** (UMKM Rp 20.000/bulan) + upsell **Edge Antibody Cowork (GaaS)**.

Desain UI diwarisi dari portal legacy (Slate & Indigo, Notion-style) — **copy & arsitektur diganti** selaras pivot GaaS 2026.

**Bukan** Command Center operator (`nexus-admin-dashboard`).

## Stack

Next.js 16 · Tailwind 4 · Framer Motion · port **3003**

## Jalankan

```powershell
cd nexus-channel-portal
npm install
npm run dev
```

Buka http://localhost:3003

## Pembayaran

- **Kontak IDR:** Manual WhatsApp → `62895603358692`
- **Kredit (kasir v0):** `/order` — sesi tamu (cookie) atau akun; keran lab **per identitas** → bayar **20 Kredit** → generate site. Job Cowork **tidak** dijual di sini. `/masuk` `/daftar` = pelanggan storefront, bukan operator `:3001`.
- **Top-up berikutnya (disepakati, belum dikode):** QRIS milik pemilik dan/atau VA bank milik pemilik → bukti transfer → operator approve jika bukti aman → Kredit masuk. **Bukan** Midtrans, Stripe, atau PSP lain.

## Integrasi

| Layanan | URL default |
| --- | --- |
| Channel Starter API | `NEXT_PUBLIC_CHANNEL_STARTER_URL=http://127.0.0.1:3010` |

Form `/order` → sesi tamu/akun (cookie `nexus_portal_sid`) → cek **Kredit** ledger identitas itu → proxy `/api/channel-starter/generate` → channel-starter `:3010`. Saldo kurang = 402. CLI Channel Starter tetap bisa generate tanpa debit (jalur operator).

## Dokumen

- [docs/CHANNEL_STARTER.md](../docs/CHANNEL_STARTER.md)
- [docs/PRODUCT_MODEL.md](../docs/PRODUCT_MODEL.md)
