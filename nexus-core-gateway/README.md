# nexus-core-gateway

Go reverse proxy + WAF — **mesin Alur A** (tepi always-on) untuk Nexus Cyber GaaS.

**Model produk:** [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md)

## Listeners

| Env | Default | Role |
| --- | --- | --- |
| `PORT` | `8080` | Public data plane (proxy, upload, reward, CSRF site). SOC paths 404; other `/api` needs `nexus_session`. |
| `PROTECTED_HOST` | (empty) | One DNS name per GaaS instance. Lab: `portfolio.nexus-lab.test`. |
| `ADMIN_LISTEN` | `127.0.0.1:8081` | Operator control plane (telemetry, CLI, ban, lab antibody handlers) |

Operator session: `POST /api/admin/login` → cookie `nexus_admin_token`. Loopback may skip token in local `start-dev`.

Trusted client IP: `NEXUS_TRUSTED_PROXIES`. See `.agents/agents/request-identity.md`.

SOC routing: `.agents/agents/soc-control-plane.md`.

Docs: [`../docs/README.md`](../docs/README.md).
