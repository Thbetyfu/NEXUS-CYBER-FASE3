# Lab Juice Shop (NEX-RED)

Skor kelas HTTP jinak — **bukan** Shannon parity. Wasit GaaS: [`../../../docs/PRODUCT_MODEL.md`](../../../docs/PRODUCT_MODEL.md).

Self-hosted [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) for **class recall** vs Shannon sample families (AUTH, AUTHZ, INJ, XSS, SSRF).

This is **not** a Shannon/Strix pentest replay. NEX-RED only sends benign GET/POST (no SQLi, XSS, or SSRF payloads in git).

## Start

Docker Desktop must be running. Port **3003** is loopback-only (does not collide with SOC `:3001` or portfolio `:3002`).

```bat
NEX-RED\lab\juice-shop\START.bat
```

Then:

```bat
python NEX-RED\nexred.py lab-juice
python NEX-RED\nexred.py benchmark --live
```

URL override: `NEX_RED_JUICE_SHOP_URL` (default `http://127.0.0.1:3003`).

Stop: `STOP.bat`.

## What is scored

| Gold class | How NEX-RED may hit it (posture, not exploit kit) |
| --- | --- |
| authorization | Unauthenticated GET of `/api/Users`, `/api/Users/1`, basket, cards, addresses, security answers, complaints, or privacy requests returns **account fields** (`email` / `password` / token / card). **401/403 = rejected** (control held). Public catalogs without those fields (feedback comments, quantities) are **not** hits. |
| authentication | Dummy login returns a session, or `/rest/user/whoami` returns a non-empty identity without a session. Empty `{"user":{}}` is not a hit. |
| injection | Benign product search (`q=apple`) returns HTTP 500 |
| xss / ssrf | Not claimed (no XSS/SSRF payloads in git) |

`lab-juice` prints every check (`confirmed` / `rejected` / `inconclusive`). Recall can stay **0/5** on Juice Shop v17 while still proving the checks ran. `equal_to_shannon_strix` stays false.
