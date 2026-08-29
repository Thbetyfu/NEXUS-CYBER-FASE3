# Nexus Cyber — Operator Console (kokpit GaaS)

Next.js dashboard untuk **operator Nexus** saja — **Operator GaaS Console** (kanal, antrian L0/L1, Job Cowork, artefak), telemetri, CLI, ban/unban.

**Bukan** Channel Portal pelanggan. **Bukan** War Room / MTD / licensing SaaS (dihapus dari UI).

**Model produk:** [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md)

## Yang ada

- **Operator GaaS Console** — kanal aktif, **Onboard kanal** (origin URL → protected host via `POST /api/routes`), antrian L0/L1, Job Cowork, artefak MD/JSON
- Logs, IP/Ban, Terminal, Metrics, Laporan/Artefak
- Domain/Workspace switcher (refresh setelah onboard)

**Onboard kanal (operator pilot):** tempel origin lama → opsional set protected host (default lab `portfolio.nexus-lab.test`) → daftar rute WAF + workspace. Bukan self-serve multi-tenant / billing. Hostname publik (tunnel/Caddy) tetap di luar SOC.

## Stack

Next.js App Router, Tailwind, Xterm.js. Bind **`127.0.0.1:3001`**. Control plane **`127.0.0.1:8081`**. Job bridge **`:3004`**.

```bash
npm install
npm run dev -- -p 3001
```

Login: `NEXUS_ADMIN_TOKEN` dari `deploy-local/.env` / gateway.
