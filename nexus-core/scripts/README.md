# scripts/

Skrip otomatisasi Nexus Cyber. **Model produk:** [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md) — deployment **instance GaaS** per kanal; provisioner multi-tenant **ditunda**.

```
scripts/
├── check_nex_ai.py  ← gerbang fail-closed NEX-AI (protect+reflex di Ollama lokal)
├── deploy/
│   ├── local/    ← PC lokal (Windows + Linux/WSL/macOS)
│   └── vps/      ← VPS (satu instance kanal)
├── tunnel/       ← Cloudflare Tunnel (lab/demo)
├── ops/          ← ignite / kill
├── init/         ← scaffolding
└── tests/        ← QA lab + test_check_nex_ai.py
```

`check_nex_ai.py` dipanggil `nexus-core/deploy-local/START.ps1` **sebelum** compose. Bukan unduhan Hub. CI: `NEX_AI_REQUIRED=0`.

## deploy/local/

| File | Deskripsi |
| --- | --- |
| `deploy-local-pc.ps1` | Docker Compose atau `-Binary` |
| `deploy-local-pc.sh` | Sama, Linux/WSL/macOS |

## deploy/vps/

| File | Deskripsi |
| --- | --- |
| `deploy-biznet-gio.sh` | Deploy instance di Ubuntu VPS |
| `provisioner.sh` / `.ps1` | **Ditunda** — legacy multi-tenant; jangan dokumentasikan sebagai produk v1 |

## tunnel/

Cloudflare Tunnel untuk demo — **jangan** expose `:8081` / `:3001` ke internet.

## tests/

Skrip QA lab (`test_mtd_shuffle.py`, `test_self_repair.py`, dll.). `test_onboarding.py` = legacy onboarding — bukan GaaS v1.

Lihat [`../UNIT_TESTING.md`](../UNIT_TESTING.md).
