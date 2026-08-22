# Nexus Channel Portal

**Modul:** `nexus-channel-portal/` · port **3003**  
**Peran:** Pintu jual B2C/B2B — Channel Starter + upsell Cowork  
**Bukan:** Command Center operator (`nexus-admin-dashboard`)

---

## Alur pelanggan v1

```text
Landing /order → WhatsApp manual → operator generate (channel-starter) → slug.nexus.id
```

| Langkah | Komponen |
| --- | --- |
| Marketing + harga | `nexus-channel-portal` |
| Form onboarding | `/order` + optional API `:3010` |
| Generate site | `channel-starter/` |
| Deploy | `cli.py deploy apply` + produksi `*.nexus.id` |
| Upsell Cowork | `cli.py upsell enable` |

---

## Pembayaran

- **v1:** WhatsApp `62895603358692` — *Saya mau beli Nexus Cyber!!*
- **Belum:** Midtrans webhook (ditunda)

---

## Warisan desain

UI Slate & Indigo (Notion-style) dari portal legacy — **semua copy & backend diganti** selaras [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

Portal legacy submodule **digantikan** modul monorepo **`nexus-channel-portal/`**.

---

*2026-08-22 — Milestone 19*
