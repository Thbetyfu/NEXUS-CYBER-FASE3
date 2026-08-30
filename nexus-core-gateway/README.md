# nexus-core-gateway

Go reverse proxy + WAF — **mesin Alur A** (tepi always-on) untuk Nexus Cyber GaaS.

**Model produk:** [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md)

## Listeners

| Env | Default | Role |
| --- | --- | --- |
| `PORT` | `8080` | Public data plane (proxy, upload, reward, CSRF site). SOC paths 404; other `/api` needs `nexus_session`. |
| `PROTECTED_HOST` | (empty) | One DNS name per GaaS instance. Lab: `portfolio.nexus-lab.test`. |
| `TARGET_BACKEND` | (compose) | Instance origin. START.bat = Vercel HTTPS; START-OFFLINE = `http://portfolio:3002`. Lab seed upserts this onto named-host + loopback so ROUTER-SYNC cannot split them. |
| `ADMIN_LISTEN` | `127.0.0.1:8081` | Operator control plane (telemetry, CLI, ban, digest insiden, lab antibody handlers) |
| `INTEGRITY_MONITORED_DIR` | `../playground/Portofolio-Thoriq` | Folder origin lokal untuk self-heal (pin + fsnotify). Docker lab: `/origin-lab`. |

Operator session: `POST /api/admin/login` → cookie `nexus_admin_token`. Loopback may skip token in local `start-dev`.

Trusted client IP: `NEXUS_TRUSTED_PROXIES`. See `.agents/agents/request-identity.md`.

SOC routing: `.agents/agents/soc-control-plane.md`.

Docs: [`../docs/README.md`](../docs/README.md).
