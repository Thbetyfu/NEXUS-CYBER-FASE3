# Channel Starter — Milestone 18

Form wizard → rule-based Jinja2 templates → static site deploy untuk UMKM.

**Bukan** Job Cowork / Loop GaaS di tier Starter ~Rp 20rb.

## Deploy multi-tenant (S-3 lab)

Setelah `generate`, routing Caddy + registry hosts otomatis diperbarui.

```powershell
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890 --theme hijau
python cli.py deploy apply
python cli.py deploy reload   # jika deploy-local/Caddy sudah running
```

Dengan **deploy-local** (`nexus-core/deploy-local/START.bat`):

1. Caddy mount `channel-starter/sites` → `/srv/channel-starter`
2. Import `sites/_caddy/ChannelStarter.caddy` (subdomain statis + header tepi, **bukan** WAF gateway kecuali upsell)
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

## Upsell Pagar tipis / Tepi (tanpa Job)

Etalase terpisah dari Starter 20 Kr. `cli.py upsell enable --slug … --tier tepi` menambah Host ke `deploy-local/nexus-host-map.json` dan mem-flip Caddy ke `reverse_proxy gateway:8080`. **Portfolio tetap** di peta. **Bukan** Job Cowork. Generate 20 Kr **tidak** auto-join.

```powershell
python cli.py upsell enable --slug warung-bu-siti --tier tepi
python cli.py upsell status
python cli.py upsell disable --slug warung-bu-siti
```

Restart gateway agar host map terbaca. Trafik: `http://portfolio.nexus-lab.test` **dan** `http://warung-bu-siti.nexus-lab.test`. `*.vercel.app` langsung **tidak** dilindungi.

`--tier cowork` tetap membuat Job jika bridge `:3004` hidup. `--no-job` memaksa tanpa Job; `--job` memaksa Job meski tier `tepi`.

## Upsell Cowork (S-6, Job)

```powershell
python cli.py upsell enable --slug warung-bu-siti --tier cowork [--loop]
python cli.py upsell status
python cli.py upsell disable --slug warung-bu-siti
```

Menulis `nexus-host-map.json` (portfolio + semua `gaas_active`) dan mengalihkan subdomain tepi ke WAF. **Tidak** menimpa `PROTECTED_HOST`. Starter generate tetap tanpa WAF.

```powershell
cd D:\NEXUS\nexus-core\channel-starter
pip install -r requirements.txt
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890 --theme hijau
python cli.py list
python cli.py serve
```

Form wizard: http://127.0.0.1:3010/

Preview: http://127.0.0.1:3010/preview/{slug} — **localhost = mesin yang `serve`**. `serve` men-seed demo `sites/contoh-nexcent`. Browser mendapat HTML, bukan JSON FastAPI. Jika Simple Browser masih JSON, proses 3010 masih kode lama — `START-PREVIEW.bat`.

Generate **men-deploy folder situs** ke Vercel (project = slug) jika `VERCEL_TOKEN` di `channel-starter/.env` (gitignore; restart `serve`). Sesi `vercel login` tidak dipakai. **Jangan** Connect Git FASE3 ke project warung; tiap warung = `python cli.py publish --slug`. `*.vercel.app` bukan WAF.

## Struktur

| Path | Peran |
| --- | --- |
| `channel_starter/themes.py` | Empat palet Figma |
| `channel_starter/types.py` | Kontrak form + manifest |
| `channel_starter/presets.py` | Copy preset per kategori (tanpa LLM) |
| `channel_starter/generator.py` | Render Jinja2 → `sites/{slug}/` + `vercel.json` |
| `channel_starter/vercel_publish.py` | Deploy folder situs ke Vercel (bukan monorepo) |
| `channel_starter/ownership.py` | Filter situs per identitas portal (bukan katalog publik) |
| `channel_starter/server.py` | FastAPI form wizard + preview HTML |
| `templates/_base.html` | Layout Nexcent (Figma Contoh-landing-page-nexus) |
| `sites/README.md` | Isi folder vs Vercel vs git (jujur) |
| `examples/contoh-nexcent/` | Cadangan demo (wizard baru) |
| `START-PREVIEW.bat` | Stop port 3010 + `cli.py serve` |

## Env

| Variabel | Default |
| --- | --- |
| `CHANNEL_STARTER_SITES_DIR` | `./sites` (gitignore, kecuali demo `contoh-nexcent`) |
| `CHANNEL_STARTER_EXAMPLES_DIR` | `./examples` (ikut git) |
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
