# Panduan Unit Testing & Verifikasi — Nexus Cyber

**Pembaruan:** 2026-08-22  
**Model produk:** [docs/PRODUCT_MODEL.md](docs/PRODUCT_MODEL.md) — GaaS Edge Antibody Cowork. Pengujian di bawah ini mengcover **mesin gateway + lab**; orkestrasi **Job Cowork** ada di `NEX-RED/tests/test_job_cowork.py`.

---

## 1. Unit test otomatis (Go backend)

Backend Go di `nexus-core-gateway` — paket utama:

| Paket | Fokus uji |
| --- | --- |
| `internal/proxy` | CSRF, middleware, dynamic router, PACS (obfuskasi — bukan enkripsi) |
| `internal/repair` | Integrity monitor BLAKE3, restore folder terpantau |
| `internal/rasp` | RASP monitor (jika modul aktif di build) |
| `cmd/gateway` | Handlers lab (vault autoban), CLI, webhook (**ditunda** produksi) |

### 1.1 Proxy & CSRF (`internal/proxy`)

- **`TestCsrfShield`:** GET set cookie; POST tanpa token → 403; POST dengan token cocok → 200; bypass rute lab (`/api/verify-session`).
- **`TestDynamicRouterWildcardAndFallback`:** satu `PROTECTED_HOST` / wildcard lab — **bukan** multi-tenant massal legacy.
- **PACS:** obfuskasi HTML — jangan klaim enkripsi enterprise di laporan uji.

### 1.2 Self-repair (`internal/repair`)

- **`TestIntegrityMonitorRestoreAndPurge`:** modifikasi/hapus file baseline → restore; file ilegal → purge. **Hanya** folder yang dikonfigurasi.

### 1.3 Gateway handlers (`cmd/gateway`)

- **`TestRewardUnlockAutoban`:** 5× password salah → ban; unban + password benar → reward link.
- **`TestPaymentWebhookHandler`:** ada di kode uji — **pembayaran otomatis legacy ditunda**; jangan anggap produk jual aktif.
- **`TestValidateDomainHandler`:** validasi domain untuk TLS ask — satu instance, bukan provisioner per tenant.

---

## 2. Menjalankan pengujian

Dari `nexus-core-gateway`:

```bash
go test -v ./internal/proxy ./internal/repair ./cmd/gateway
```

Paket tertentu:

```bash
go test -v ./internal/proxy
go test -v ./internal/repair
go test -v ./cmd/gateway
```

---

## 3. Verifikasi NEX-RED (wasit GaaS — lab)

Defense delta + antibody loop — bukan unit test Go; jalankan setelah WAF hidup:

```bash
python NEX-RED/nexred.py scan -u http://127.0.0.1 -r . -m hybrid --no-llm
```

Label wasit: `waf_blocked`, `origin_open`, `both_held`, `replay_missed`, `antibody_learned`. Detail: [NEX-RED/README.md](NEX-RED/README.md).

**Job Cowork end-to-end:** `python -m unittest tests.test_job_cowork` (+ lab bridge `:3004` untuk UI).

---

## 4. Verifikasi build frontend

### Command Center (operator kokpit — bukan produk GaaS ke klien)

```bash
cd nexus-admin-dashboard
npm run build
```

### Portofolio lab

```bash
cd playground/Portofolio-Thoriq
npm run build
```

---

## 5. Unit test Channel Starter (Python)

Modul `channel-starter/` — Milestone 18 lab v0.1:

```powershell
cd channel-starter
pip install -r requirements.txt
python -m unittest discover -s tests -v
```

| Test | Fokus |
| --- | --- |
| `test_generator.py` | 3 template, preset, WA, aggregate Caddy S-3, upsell S-6, copy tier jujur |

---

## 6. Batasan kejujuran uji

- Reflex = regex; reasoning opsional
- eBPF di test/log = **stub**, bukan XDP nyata
- NEX-RED ≠ Shannon/Strix pentest
- Telegram pager = env lab; bukan GPS penyerang

Kontrak lengkap: [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

---

*Selaraskan dengan pivot GaaS 2026-08-22.*
