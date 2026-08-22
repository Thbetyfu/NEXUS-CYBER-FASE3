# Nexus Cyber — Command Center (operator kokpit)

Next.js dashboard untuk **operator Nexus** — telemetri, CLI, ban/unban, **Job Cowork** (GaaS Alur B). **Bukan** Channel Portal ke pemilik risiko kanal.

**Model produk:** [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md)

## Stack

Next.js App Router, Tailwind, Xterm.js. Bind **`127.0.0.1:3001`** di lab. API ke control plane **`127.0.0.1:8081`**.

## Getting started

```bash
npm install
npm run dev -- -p 3001
```

Login: `NEXUS_ADMIN_TOKEN` dari `nexus-core-gateway/.env`.

## Screenshots (lab)

Boot sequence, dashboard telemetri, overlay lisensi **lab** (`nexus-cyber-dev`) — bukan lockout langganan produksi.

Lihat [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).
