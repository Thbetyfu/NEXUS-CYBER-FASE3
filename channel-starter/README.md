# Channel Starter — Milestone 18

Form wizard → rule-based Jinja2 templates → static site deploy untuk UMKM.

**Bukan** Job Cowork / Loop GaaS di tier Starter ~Rp 20rb.

## Deploy multi-tenant (S-3 lab)

Setelah `generate`, routing Caddy + registry hosts otomatis diperbarui.

```powershell
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890
python cli.py deploy apply
python cli.py deploy reload   # jika deploy-local/Caddy sudah running
```

Dengan **deploy-local** (`deploy-local/START.bat`):

1. Caddy mount `channel-starter/sites` → `/srv/channel-starter`
2. Import `sites/_caddy/ChannelStarter.caddy` (subdomain statis, **tanpa** WAF)
3. Catch-all `:80` tetap ke gateway WAF (portfolio lab)
4. `START.bat` menulis subdomain ke `hosts` (butuh Administrator)

Contoh URL lab: `http://warung-bu-siti.nexus-lab.test`

### Produksi (VPS)

Set env sebelum generate:

| Variabel | Contoh |
| --- | --- |
| `CHANNEL_STARTER_SUBDOMAIN_BASE` | `sites.nexus.id` |
| `CHANNEL_STARTER_HTTP_ONLY` | `false` (auto-TLS Caddy) |

DNS wildcard `*.sites.nexus.id` → IP VPS. **Belum:** provisioner billing otomatis.

## Upsell Cowork (S-6)

```powershell
python cli.py upsell enable --slug warung-bu-siti --tier cowork [--loop]
python cli.py upsell status
python cli.py upsell disable --slug warung-bu-siti
```

Menulis `deploy-local/channel-starter-upsell.env` (`PROTECTED_HOST`, `TARGET_BACKEND`, `NEX_RED_LIVE_TARGET`) dan mengalihkan subdomain ke WAF gateway. Satu host GaaS aktif per instance lab.

```powershell
cd channel-starter
pip install -r requirements.txt
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890
python cli.py list
python cli.py serve
```

Form wizard: http://127.0.0.1:3010/

Preview site: http://127.0.0.1:3010/preview/{slug}

## Struktur

| Path | Peran |
| --- | --- |
| `channel_starter/types.py` | Kontrak form + manifest |
| `channel_starter/presets.py` | Copy preset per kategori (tanpa LLM) |
| `channel_starter/generator.py` | Render Jinja2 → `sites/{slug}/` |
| `channel_starter/deploy.py` | Snippet Caddy multi-tenant lab |
| `channel_starter/server.py` | FastAPI form wizard |
| `templates/` | 3 layout: `fnb`, `jasa`, `profil` |

## Env

| Variabel | Default |
| --- | --- |
| `CHANNEL_STARTER_SITES_DIR` | `./sites` |
| `CHANNEL_STARTER_TEMPLATES` | `./templates` |
| `CHANNEL_STARTER_SUBDOMAIN_BASE` | `nexus-lab.test` |
| `CHANNEL_STARTER_PORT` | `3010` |

## Tests

```powershell
python -m unittest discover -s tests -v
```

## Dokumen

- [docs/CHANNEL_STARTER.md](../docs/CHANNEL_STARTER.md)
- [docs/PRODUCT_MODEL.md](../docs/PRODUCT_MODEL.md)
- Keputusan terbuka: [docs/DECISIONS_OPEN.md](../docs/DECISIONS_OPEN.md)
