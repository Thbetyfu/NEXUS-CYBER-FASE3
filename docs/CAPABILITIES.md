# 🛡️ Nexus Cyber Capabilities

Status mengikuti kode di `nexus-core-gateway`, `nexus-admin-dashboard`, dan `NEX-RED` (bukan slide pemasaran). Pembaruan terakhir: 2026-08-15. Lihat [CHANGELOG.md](../CHANGELOG.md).

## Grid pertahanan & validasi

| Kategori | Ancaman / tugas | Mekanisme di kode | Tingkat |
| :--- | :--- | :--- | :--- |
| Aplikasi web | SQLi / XSS / path traversal setelah **normalisasi** | Reflex `NormalizeForInspect` lalu regex | Nyata, lebih teliti; obfuskasi dalam masih bisa lolos |
| Unggah | Shell berkedok gambar, EXIF | AVSE + magic bytes; handler publik `/api/upload`; sidik jari klien tidak memblokir HTTP lab | Nyata |
| Vault lab | Brute-force password hadiah | `/api/unlock-reward`, autoban 5x; sama: sidik jari HTTP lab tidak boleh menggagalkan POST | Nyata |
| Abuse / flood | Request berlebih per IP | Token bucket; IP dari `utils.ClientIP` | Nyata (bukan DDoS kernel) |
| Recon SSH | Scanner SSH | Tarpit `:2222` (compose root) | Nyata jika port dipasang |
| Umpan HTTP | Scanner ke honeypot | `:9090` | Nyata |
| Integritas template | Deface file di folder terpantau | BLAKE3 baseline + restore RAM | Nyata **hanya** direktori yang dikonfigurasi |
| SOC | Ban, CLI, reset, telemetri | Listener **8081** + sesi operator | Nyata; bukan RBAC/JWT enterprise |
| Validasi kode | Sink berbahaya di Python/Go/JS/PHP | NEX-RED v4 white-box | Nyata, konservatif |
| Postur hidup | Header / 403 / HTTP tanpa sesi | NEX-RED v5 live checks | Nyata, bukan pentest |
| Reasoning AI | Obfuskasi / zero-day | Goroutine opsional ke model/API | Bergantung env; bukan jaminan |
| DDoS L3/L4 | SYN flood, pps tinggi | eBPF map **stub** | **Tidak** drop XDP |
| MitM pengunjung | Sniff TLS klien | Header PQC / modul inisialisasi | **Bukan** E2E ML-KEM ke browser |
| Intelijen | STIX/TAXII BSSN | Rencana / CLI audit | **Tidak** feed penuh di path lab |
| Multi-tenant bayar | Stripe/Midtrans + kontainer per klien | Webhook ada; provisioner **belum** | Ditunda |

## NEX-RED

Lihat [`NEX-RED/README.md`](../NEX-RED/README.md). Tidak mengirim exploit PoC. Bridge default **3004**.

## Blue team (detail jujur)

- **Reflex**: regex pada bentuk kanonik (percent berlapis, entitas HTML, `\uXXXX`, komentar SQL, NFKC).
- **Antibodi**: pola yang pernah kena bisa di-cache (virtual patch di memori/Redis).
- **MTD**: rotasi port origin HTTP; origin HTTPS publik **tidak** diubah skemanya.
- **Rate limit**: percayai `X-Forwarded-For` hanya dari `NEXUS_TRUSTED_PROXIES`.
- **CSRF**: `CsrfShield` pada metode berubah di gateway.
- **Control plane**: terpisah dari WAF publik.
