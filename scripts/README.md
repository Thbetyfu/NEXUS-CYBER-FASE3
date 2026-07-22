# 📁 scripts/

Folder ini berisi seluruh skrip otomatisasi Nexus Cyber Fase 2, diorganisir berdasarkan fungsinya.

```
scripts/
├── deploy/
│   ├── local/    ← Deployment di PC Lokal (Windows + Linux/WSL/macOS)
│   └── vps/      ← Deployment di Cloud VPS (Biznet Gio, Hetzner, dll)
├── tunnel/       ← Cloudflare Tunnel launcher (PC Lokal → Internet Gratis)
├── ops/          ← Operasional harian (ignite, kill/shutdown)
├── init/         ← Inisiasi awal project (scaffolding folder struktur)
└── tests/        ← QA, audit keamanan, dan simulasi serangan
```

---

## deploy/local/ — PC Lokal

| File | OS | Deskripsi |
|---|---|---|
| `deploy-local-pc.ps1` | Windows | Mode A (Docker Compose) + Mode B (`-Binary`) |
| `deploy-local-pc.sh` | Linux/WSL/macOS | Mode A (Docker Compose) + Mode B (`--binary`) |

```powershell
# Windows — full stack (Docker required)
.\scripts\deploy\local\deploy-local-pc.ps1

# Windows — binary only (tanpa Docker)
.\scripts\deploy\local\deploy-local-pc.ps1 -Binary
```

```bash
# Linux/WSL — full stack
bash scripts/deploy/local/deploy-local-pc.sh

# Linux/WSL — binary only
bash scripts/deploy/local/deploy-local-pc.sh --binary
```

---

## deploy/vps/ — Cloud VPS

| File | Deskripsi |
|---|---|
| `deploy-biznet-gio.sh` | One-click deploy di Ubuntu 22.04 LTS (Biznet Gio / Hetzner / DO) |
| `provisioner.sh` | SaaS tenant provisioner — memutar container Docker per-klien |
| `provisioner.ps1` | Versi PowerShell dari tenant provisioner |

```bash
# Di VPS Ubuntu
sudo bash scripts/deploy/vps/deploy-biznet-gio.sh
```

---

## tunnel/ — Cloudflare Tunnel

Menghubungkan layanan lokal ke internet publik secara GRATIS (tanpa sewa VPS, tanpa port forwarding).

| File | OS |
|---|---|
| `nexus-tunnel.ps1` | Windows PowerShell |
| `nexus-tunnel.sh` | Linux/WSL/macOS |

```powershell
# Windows — tunnel ke WAF Gateway (default)
.\scripts\tunnel\nexus-tunnel.ps1

# Windows — tunnel ke SOC Dashboard
.\scripts\tunnel\nexus-tunnel.ps1 -Dashboard
```

```bash
# Linux/WSL — tunnel ke WAF Gateway (default)
bash scripts/tunnel/nexus-tunnel.sh

# Linux/WSL — tunnel ke SOC Dashboard
bash scripts/tunnel/nexus-tunnel.sh --dashboard
```

---

## ops/ — Operasional Harian

| File | Deskripsi |
|---|---|
| `nexus-ignite.sh` | Menyalakan semua layanan (legacy — gunakan deploy/ untuk versi baru) |
| `nexus-kill.sh` | Mematikan semua layanan Nexus secara bersih |

```bash
bash scripts/ops/nexus-kill.sh
```

---

## init/ — Inisiasi Awal

Digunakan **sekali saja** saat pertama kali setup project di mesin baru.

| File | OS |
|---|---|
| `setup.sh` | Linux/macOS |
| `setup.ps1` | Windows |

---

## tests/ — QA & Audit

| File | Fungsi |
|---|---|
| `test_mtd_shuffle.py` | Uji komponen Moving Target Defense (port shuffling) |
| `test_self_repair.py` | Uji fitur Self-Repair otonom |
| `test_intelligence.py` | Uji modul intelijen NEX-AI |
| `test_proxy.py` | Uji reverse proxy dan forwarding |
| `test_onboarding.py` | Uji alur onboarding tenant SaaS |
| `test_scaffold.py` | Uji scaffolding struktur project |
| `nexus_system_audit.py` | Audit kesehatan sistem menyeluruh |
| `rescue_scenario_simulator.py` | Simulasi skenario krisis & pemulihan darurat |

```bash
python scripts/tests/test_mtd_shuffle.py
python scripts/tests/test_self_repair.py
```
