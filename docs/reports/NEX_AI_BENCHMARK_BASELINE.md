# NEX-AI Benchmark Baseline

## Tujuan
- Template ini dipakai setelah model `NEX-AI` selesai dilatih dan diregistrasi ke Ollama lokal.
- File ini sengaja **tidak** berisi hasil benchmark palsu. Semua nilai harus diisi dari output nyata runner benchmark.

## Metadata Pengujian
- Model yang diuji:
- Endpoint:
- Tanggal pengujian:
- Commit / artefak model:
- Benchmark source:
- Jumlah total case:

## Ringkasan Metrik
| Metrik | Nilai |
| :--- | :--- |
| JSON validity rate | |
| Status accuracy | |
| Attack type accuracy | |
| Threat score range pass rate | |
| Full pass rate | |

## Hasil per Kategori
| Kategori | Jumlah Case | Pass | Catatan |
| :--- | ---: | ---: | :--- |
| `benign_web` | | | |
| `benign_graphql` | | | |
| `benign_checkout` | | | |
| `sql_injection` | | | |
| `cross_site_scripting` | | | |
| `path_traversal` | | | |
| `command_injection` | | | |
| `zero_day_bypass` | | | |

## Failure Cases Prioritas Tinggi
- Isi bagian ini dengan case yang:
  - JSON-nya gagal diparse,
  - status salah,
  - attack type salah,
  - threat score terlalu jauh dari rentang target,
  - atau reasoning menunjukkan blind spot yang penting.

## Analisis
- Apakah model terlalu agresif pada benign traffic?
- Apakah model konsisten membedakan `COMMAND_INJECTION` vs `ZERO_DAY_BYPASS`?
- Apakah ada indikasi mismatch label terhadap schema `Output.md`?
- Apakah output JSON stabil untuk seluruh benchmark set?

## Keputusan Lanjut
- Siap dipakai untuk smoke test integrasi:
- Perlu retraining:
- Perlu perbaikan dataset:
- Perlu update schema / dokumentasi:
