# nexus-core-gateway

Go reverse proxy + WAF for Nexus Cyber.

## Listeners

| Env | Default | Role |
| --- | --- | --- |
| `PORT` | `8080` | Public data plane (proxy, upload, reward, CSRF site). SOC paths 404; other `/api` needs `nexus_session`. |
| `PROTECTED_HOST` | (empty) | One DNS name registered for TLS ask / CNAME. Lab default in compose: `portfolio.nexus-lab.test`. |
| `ADMIN_LISTEN` | `127.0.0.1:8081` | SOC control plane (telemetry, CLI, ban, reset, routes) |

Operator session: `POST /api/admin/login` → cookie `nexus_admin_token`, or header `X-Nexus-Admin-Token`. Loopback may skip the token in local `start-dev`. Token must not appear in query strings or `NEXT_PUBLIC_*`.

Trusted client IP: `NEXUS_TRUSTED_PROXIES` (default loopback + `172.16.0.0/12`). See `.agents/agents/request-identity.md`.

SOC routing rules: `.agents/agents/soc-control-plane.md`.

Product docs: [`../docs/README.md`](../docs/README.md).
