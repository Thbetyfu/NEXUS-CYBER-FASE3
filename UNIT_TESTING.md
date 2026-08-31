# Panduan Unit Testing & Verifikasi — Nexus Cyber

**Pembaruan:** 2026-08-31  
**Model produk:** [docs/PRODUCT_MODEL.md](docs/PRODUCT_MODEL.md) — GaaS Edge Antibody Cowork. Pengujian di bawah ini mengcover **mesin gateway + lab**; orkestrasi **Job Cowork** ada di `NEX-RED/tests/test_job_cowork.py`.

---

## 1. Unit test otomatis (Go backend)

Backend Go di `nexus-core-gateway` — paket utama:

| Paket | Fokus uji |
| --- | --- |
| `internal/proxy` | CSRF, middleware, dynamic router, PACS (obfuskasi — bukan enkripsi) |
| `pkg/logger` | Telemetri, rantai audit, `NormalizeTargetHost`, persist `target_domain` |
| `internal/database` | Job Cowork PG + digest insiden `threat_logs` + ban `intel_blacklist` selamat restart |
| `internal/repair` | Integrity monitor BLAKE3, restore folder terpantau |
| `internal/rasp` | RASP monitor (jika modul aktif di build) |
| `internal/ai` | Nama NEX-AI only + gerbang `NEX_AI_REQUIRED` (skip jika unset/`0`) |
| `cmd/gateway` | Handlers lab (vault autoban), CLI, webhook (**ditunda** produksi) |

### 1.1 Proxy & CSRF (`internal/proxy`)

- **`TestCsrfShield`:** GET set cookie; POST tanpa token → 403; POST dengan token cocok → 200; bypass rute lab (`/api/verify-session`).
- **`TestDynamicRouterWildcardAndFallback`:** satu `PROTECTED_HOST` / wildcard lab — **bukan** multi-tenant massal legacy.
- **ROUTER-SYNC origin:** leftover `127.0.0.1:3001` tidak menimpa Vercel. Tes masih mencakup origin HTTP `portfolio:3002` jika `TARGET_BACKEND` diset (bukan mode START default).
- **Lab session vs PoW:** `TestBrowserIntegrity_NamedHostWithoutSessionIsPoW` (pengunjung tetap challenge); `TestVerifySession_LabTokenMintsSession` / fail-closed env kosong. Bukan skip PoW publik.
- **ROUTER-SYNC origin bind:** `TestSeedUpsertsStaleLabOriginToVercel` / `ToOfflinePortfolio`; `TestNamedHostAndLoopbackAgreeAfterRouterSync_Vercel` / `_Offline`; `TestRouterSyncWithoutRebindSplitsHosts` — leftover `127.0.0.1:3001` tidak membagi named-host vs loopback; host onboard ekstra tidak diubah.
- **Degradasi Redis → antibodi RAM:** `TestProxy_AntibodyHoldsWhenRedisDisabled`, `TestProxy_AntibodyHoldsAfterRedisNil`, `TestProxy_AntibodyHoldsWithDeadRedisClient`, `TestProxy_AntibodyHoldsOnPOSTBodyWhenRedisDown` — token lab di query/body → **403**, origin dummy tidak dipanggil. `TestProxy_NoAntibodyReachesOrigin` — tanpa match → 200 origin. `TestProxy_AddAntibody_DegradedMode` — store RAM tanpa panic.
- **Golden GET cache:** `TestGoldenGET_MissThenHit`, stale-if-5xx, skip `/api`/sesi/`Set-Cookie`/`private`, default HTTPS-only. `NEXUS_GOLDEN_GET_CACHE=0/1` override.
- **PACS:** obfuskasi HTML — jangan klaim enkripsi enterprise di laporan uji.

### 1.2 Self-repair (`internal/repair`)

- **`TestIntegrityMonitorRestoreAndPurge`:** deface/hapus → restore; file liar → purge. **`TestIntegrityPinSurvivesRestartWithoutRebaseline`:** pin selamat “restart”. **`TestIntegrityAlertOnRestore`:** hook pager. **`TestUploadsDirIsNotPurged`:** foto di `uploads/` tidak dihapus.

### 1.3 Gateway handlers (`cmd/gateway`)

- **`TestRewardUnlockAutoban`:** 5× password salah → ban; unban + password benar → reward link.
- **`TestIncidentDigestRequiresWorkspace`:** `domain=all` / tanpa domain → 400.
- **`TestQueryIncidentDigestFiltersByDomain`:** digest SQLite hanya host yang diminta; markdown tanpa payload.
- **Ban selamat restart:** `TestBanSurvivesRestartViaDBWhenRAMEmpty` (RAM kosong → masih match lewat DB), `TestBanSurvivesRestartViaHydrateRAM` (hydrate lalu DB nil → RAM menahan), permanen / kedaluwarsa / unban. SQLite in-memory, bukan klaim Postgres produksi terhubung di CI.
- **`TestNormalizeTargetHost` / `TestCryptographicAuditTrail`:** host tanpa port tersimpan di ThreatLog.
- **`TestPaymentWebhookHandler`:** ada di kode uji — **pembayaran otomatis legacy ditunda**; jangan anggap produk jual aktif.
- **Kredit:** `nexus-channel-portal` `npm test` (`kredit-ledger.test.ts`) — keran, fail-closed, refund, **dua session id saldo terpisah**, migrasi tamu→akun. Bukan Midtrans. Top-up QRIS/VA+approve belum ada tes (belum dikode).
- **`TestValidateDomainHandler`:** validasi domain untuk TLS ask — satu instance, bukan provisioner per tenant.

---

## 2. Menjalankan pengujian

Dari `nexus-core-gateway`:

```bash
go test -v ./internal/proxy ./internal/repair ./internal/database ./internal/ai ./pkg/logger ./cmd/gateway
```

Paket tertentu:

```bash
go test -v ./internal/proxy
go test -v ./internal/repair
go test -v ./internal/database
go test -v ./pkg/logger
go test -v ./cmd/gateway
```

---

## 3. Verifikasi NEX-RED (wasit GaaS — lab)

Defense delta + antibody loop — bukan unit test Go; jalankan setelah WAF hidup:

```bash
python NEX-RED/nexred.py scan -u http://127.0.0.1 -r . -m hybrid --no-llm
```

Label wasit: `waf_blocked`, `origin_open`, `both_held`, `replay_missed`, `antibody_learned`. Detail: [NEX-RED/README.md](NEX-RED/README.md).

**Job Cowork end-to-end:** `python -m unittest tests.test_job_cowork tests.test_waf_bind tests.test_browser` (+ lab bridge `:3004` untuk UI). Host-header: TCP ke gateway + `Host: {protected_host}` tanpa file hosts. Browser: Chromium `--host-resolver-rules=MAP` ke IP WAF; missing Chromium = skip `sast_only` (bukan crash). PoW tanpa `NEX_RED_LAB_SESSION_TOKEN` = `sast_only`; token lab → `POST /api/verify-session` (bukan bypass pengunjung).

---

### 3.1 Gerbang NEX-AI (parse tags, tanpa Ollama hidup)

```powershell
python -m unittest discover -s scripts/tests -p test_check_nex_ai.py -v
```

Dari `nexus-core-gateway`: `go test -v ./internal/ai/` — skip jika `NEX_AI_REQUIRED` unset/`0`; fail-closed jika `1` dan model absen (httptest).

---

## 4. Verifikasi build frontend

### Command Center (operator kokpit — bukan produk GaaS ke klien)

```bash
cd nexus-admin-dashboard
npm run build
```

### Portofolio (origin, repo terpisah)

Build origin **bukan** di monorepo. Repo: `https://github.com/Thbetyfu/Portofolio-Thoriq`. Deploy = Vercel di belakang WAF. Folder `playground/` diarsip.

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

- Reflex = regex; reasoning asinkron. Lab `deploy-local` start-gate wajib NEX-AI lokal; `NEX_AI_REQUIRED=0` hanya untuk CI
- eBPF di test/log = **stub**, bukan XDP nyata
- NEX-RED ≠ Shannon/Strix pentest
- Telegram pager = env lab; bukan GPS penyerang

Kontrak lengkap: [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

---

*Selaraskan dengan pivot GaaS 2026-08-22.*
