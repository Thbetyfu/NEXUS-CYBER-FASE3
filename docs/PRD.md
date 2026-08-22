# DOKUMEN KEBUTUHAN PRODUK (PRD)
## NEXUS CYBER — Channel Starter + GaaS Edge Antibody Cowork

**Versi PRD:** v3.1.0 / 2026-08-22  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) — dua lapisan (Starter + GaaS). Keputusan: [DECISIONS_OPEN.md](./DECISIONS_OPEN.md).

**Status implementasi (selaras kode, 2026-08-22):** **GaaS:** WAF, Job Cowork, PG sync — **sudah ada**. **Channel Starter:** form→template — **lab v0.1** (`channel-starter/`). **Channel Portal:** `nexus-channel-portal/` v0.1. F-10 **ditunda**. Reflex = regex; eBPF stub.

---

## 1. METADATA & KONTEKS

- **Nama Proyek:** Nexus Cyber — Edge Antibody Cowork (GaaS)
- **Target Tech Stack:** Go gateway, Next.js Command Center (operator), NEX-RED (wasit + agen), PostgreSQL/Redis, Ollama opsional (`nex-ai-protect` / `nex-ai-reflex` saja)
- **Arsitektur:** SOLID, pemisahan data plane `:8080` vs control plane `:8081`
- **Problem statement (kompetisi):** Penguatan Ketahanan dan Inovasi Keuangan → **Manajemen Risiko** (irisan risiko siber/operasional kanal digital)

---

## 2. RINGKASAN PRODUK

### 2.1 Masalah

Kanal web/API institusi keuangan dan ITSK berinovasi cepat; kontrol keamanan sering terpisah: scanner menghasilkan temuan, WAF menahan trafik, **tanpa bukti** celah sudah tertutup di tepi dan masih lolos di origin. Siklus manajemen risiko membutuhkan identifikasi–pengendalian–pemantauan **terverifikasi**, bukan dashboard saja.

### 2.2 Visi produk

**Edge Antibody Cowork:** satu Job menutup loop wasit (origin vs tepi) → pengendalian virtual patch → uji replay → artefak untuk pemilik risiko. Tepi always-on (Alur A) + Job berkala (Alur B) + jejak (Alur C).

### 2.3 Bukan cakupan v1

- Self-serve CNAME massal legacy, portal pelanggan UMKM otomatis, F-10 back-office
- SOC otonom 24/7, pentest exploit, DDoS kernel
- GRC bank penuh, risiko kredit/pasar/likuiditas

---

## 3. PERSONA

| Persona | Peran | Antarmuka |
| --- | --- | --- |
| **Pemilik risiko kanal** | Klien / Direksi IT — setuju scope, L0/L1, terima artefak | Job summary, residual, persetujuan (target) |
| **Operator Nexus** | Menjalankan instance, unban, SOC | Command Center `:3001` + `:8081` |
| **Pengunjung / API** | Trafik sah | Lewat WAF `:8080` |

Tidak ada persona “UMKM pegang SOC cluster” atau “owner F-10 roster legacy” di model GaaS v1.

---

## 4. ARSITEKTUR INFORMASI

### 4.1 Alur A — Tepi (always-on)

- Caddy → gateway `:8080` → origin
- Reflex, antibodi cache, rate limit, CSRF, sesi mutasi
- Insiden → Telegram pager (opsional)

### 4.2 Alur B — Job Cowork

- Trigger: jadwal / rilis fitur / insiden
- NEX-RED agen → defense delta → draft antibodi → gerbang → vaccine-probe + replay
- Status Job: lihat [PRODUCT_MODEL.md §4](./PRODUCT_MODEL.md)

### 4.3 Alur C — Artefak

- Export tabel delta, status antibodi, residual, log persetujuan (**Belum** implementasi penuh)

### 4.4 Command Center

- Operator internal saja; **bukan** produk yang dijual ke pemilik risiko kanal

---

## 5. SPESIFIKASI FITUR (GaaS)

### F-GaaS-01 — Job Cowork (orkestrasi)

- **Status:** **[Belum]**
- **User Story:** Sebagai operator, saya ingin menjalankan satu Job dengan tujuan dan scope agar wasit, patch, dan verifikasi terikat satu status.
- **Acceptance Criteria:**
  - **Given:** Scope HTTP jinak disetujui pemilik risiko
  - **When:** Job dijalankan
  - **Then:** Status berpindah `OPEN` → … → `CLOSED_OK` atau `CLOSED_GAP`; tidak `CLOSED_OK` jika `replay_missed` tanpa residual

### F-GaaS-02 — Wasit defense delta

- **Status:** **[Sudah ada]** (NEX-RED lab)
- **User Story:** Sebagai operator, saya ingin request identik dibandingkan WAF vs origin dengan label jujur.
- **Acceptance Criteria:**
  - **Given:** `NEX_RED_ORIGIN_DIRECT` loopback/RFC1918
  - **When:** Pemeriksaan jinak dijalankan
  - **Then:** Label `waf_blocked` / `origin_open` / `both_held` / `replay_held` / `replay_missed` tercatat

### F-GaaS-03 — Antibody verify loop

- **Status:** **[Sudah ada]** (lab)
- **User Story:** Sebagai operator, saya ingin bukti antibodi tersimpan dan replay tetap 403.
- **Acceptance Criteria:**
  - **When:** vaccine-probe + replay
  - **Then:** `antibody_learned` atau `replay_missed`; `antibody_loop_ok` di laporan NEX-RED

### F-GaaS-04 — Tepi always-on

- **Status:** **[Sudah ada]**
- **User Story:** Sebagai pemilik kanal, trafik berbahaya dipotong di tepi tanpa menunggu Job.
- **Acceptance Criteria:** Reflex memblokir payload klasik; antibodi cache aktif; SOC path 404 di `:8080`

### F-GaaS-05 — Artefak risiko

- **Status:** **[Sudah ada]** — export MD/JSON per Job
- **User Story:** Sebagai pemilik risiko, saya menerima ringkasan siklus identifikasi–pengendalian–uji tanpa CLI.
- **Acceptance Criteria:** Export berisi delta, antibodi, residual, persetujuan L0/L1

### F-Channel-01 — Channel Starter (Milestone 18 — lab v0.1)

- **Status:** **[Belum]**
- **User Story:** Sebagai UMKM, saya isi form agar website template ter-deploy tanpa tim IT.
- **Acceptance (target):**
  - 3+ template; generator rule-based (**bukan** LLM berat per halaman)
  - Deploy shared; tier Starter **tanpa** Job Cowork
  - Copy jujur: keamanan wasit = upsell Cowork
- **Referensi:** [CHANNEL_STARTER.md](./CHANNEL_STARTER.md)

---

## 6. FITUR LEGACY (bukan jual GaaS v1)

| ID | Fitur | Status | Catatan |
| --- | --- | --- | --- |
| F-01 | Dual-Brain | Sebagian | Reflex regex; reasoning opsional |
| F-02 | MTD | Sudah ada | Bukan selling point GaaS |
| F-03 | eBPF | Stub | Bukan klaim DDoS |
| F-04–F-05 | AVSE / PACS | Sudah ada | PACS = obfuskasi |
| F-06 | Legacy subscription licensing | **Ditunda** | Bukan roadmap GaaS v1 |
| F-07 | SOC CLI | Sudah ada | Operator internal |
| F-08 | Self-repair file | Sudah ada | Folder terpantau saja |
| F-09 | Gallery lab | Sudah ada | Lab |
| F-10 | Back-office legacy | **Ditunda** | F-10 portal |

---

## 7. BATASAN & KEJUJURAN TEKNIS

- Reflex = regex; bukan AI pada setiap request
- eBPF stub; bukan XDP_DROP
- PACS Base64 bukan enkripsi
- Self-repair tidak mendeteksi RCE memori
- NEX-RED tidak exploit; defense delta = wasit purple-team
- Satu `PROTECTED_HOST` per instance

Detail: [`LIMITATIONS.md`](./LIMITATIONS.md)

---

## 8. ROADMAP PRODUK (dokumen)

1. **Fase 17 (GaaS):** Job + L0/L1 + PG — **selesai di mesin lab**
2. **Fase 18 (Channel Starter):** Form + template UMKM — **lab v0.1** (`channel-starter/`)
3. **Bukan prioritas:** Channel Portal billing otomatis massal, F-10, eBPF real, Loop di Rp 20rb

---

## 9. DATA MODEL (ringkas)

Entitas operasional: `threat_logs`, `cowork_jobs`, `host_immune_memories`, `antibody_audits`. Lihat [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).

---

*PRD v3 selaras pivot GaaS 2026-08-22. Kontrak kode: CAPABILITIES + CHANGELOG.*
