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

## Pembayaran (v1)

Manual WhatsApp → `62895603358692` · pesan: *Saya mau beli Nexus Cyber!!*

## Integrasi

| Layanan | URL default |
| --- | --- |
| Channel Starter API | `NEXT_PUBLIC_CHANNEL_STARTER_URL=http://127.0.0.1:3010` |

Form `/order` → proxy `/api/channel-starter/generate` → channel-starter `:3010` (opsional; operator tetap bisa manual).

## Dokumen

- [docs/CHANNEL_STARTER.md](../docs/CHANNEL_STARTER.md)
- [docs/PRODUCT_MODEL.md](../docs/PRODUCT_MODEL.md)
