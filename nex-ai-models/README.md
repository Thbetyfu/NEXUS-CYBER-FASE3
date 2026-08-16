# NEX-AI models — paket pindahan antar laptop

Folder ini berisi bobot Ollama **`nex-ai-protect`** dan **`nex-ai-reflex`** agar bisa dibawa ke laptop lain **tanpa** `git push` file besar.

Satu file GGUF (~1.8 GB) dipakai kedua nama. Prompt **berbeda** (protect = NEX-RED; reflex = klasifikasi HTTP).

## Hard disk yang sama (blue team)

Laptop pengembang dan laptop blue team boleh memakai **satu hard disk fisik** (huruf drive bisa berubah: di sini `D:\NEXUS-CYBER-FASE3`, di blue team `E:\NEXUS-CYBER-FASE3`).

**Tidak perlu push GitHub** untuk uji lab. GGUF, log, dan `.env` lokal memang tidak boleh/tidak bisa di-push.

**Jangan hapus folder lama di E: lalu salin dari D: jika itu disk yang sama.** Cabut disk dengan aman → colok di laptop blue team → buka folder `NEXUS-CYBER-FASE3` di huruf drive yang muncul.

Yang **tidak ikut pindah** bersama disk: registri Ollama di Windows. Ollama menyimpan salinan model di disk sistem laptop itu (biasanya `%LOCALAPPDATA%\Ollama`), bukan di folder repo. Setiap PC yang baru/bersih harus impor ulang:

```bat
cd E:\NEXUS-CYBER-FASE3\nex-ai-models
IMPORT-OLLAMA.bat
ollama list
```

Ganti `E:` dengan huruf drive di laptop itu. Harus muncul `nex-ai-protect` dan `nex-ai-reflex`. Jangan `ollama pull qwen` sebagai pengganti.

WAF lab (regex) **tetap jalan** meski impor belum dilakukan. Reasoning / `llm-eval` butuh impor.

## Model lama di laptop blue team (hapus, jangan dobel)

Kalau di laptop itu NEX-AI **sudah ada di folder lain** (GGUF lama, `NEX-AI\nex_ai_q4_k_m.gguf`, salinan USB, atau nama Ollama dari impor sebelumnya), **jangan pakai yang itu bersamaan** dengan folder ini. Dua sumber = nama dobel, prompt lama, atau `llm-eval` membingungkan.

1. Sumber resmi **hanya** `NEXUS-CYBER-FASE3\nex-ai-models\` di hard disk yang sedang terpasang (`nex_ai_q4_k_m.gguf` + `Modelfile.protect` + `Modelfile.production`).
2. Hapus nama lama di Ollama, lalu impor ulang dari folder itu:

```bat
ollama rm nex-ai-protect
ollama rm nex-ai-reflex
cd E:\NEXUS-CYBER-FASE3\nex-ai-models
IMPORT-OLLAMA.bat
ollama list
```

`ollama rm` hanya melepas registri di laptop itu, bukan menghapus file di hard disk repo. Ganti `E:` sesuai huruf drive.

3. GGUF cadangan di path lain boleh dihapus atau diabaikan; **jangan** `ollama create` dari path itu lagi. Jangan `ollama pull qwen` / `llama3` sebagai pengganti.
4. Cek `ollama list`: cukup **satu** `nex-ai-protect` dan **satu** `nex-ai-reflex` (bukan tag kedua dari folder lama).

## Isi folder

| File | Fungsi |
| --- | --- |
| `nex_ai_q4_k_m.gguf` | Bobot model (lokal saja; diabaikan Git) |
| `Modelfile.production` | Reflex: klasifikasi HTTP → `nex-ai-reflex` |
| `Modelfile.protect` | Protect: JSON NEX-RED → `nex-ai-protect` |
| `IMPORT-OLLAMA.bat` | Daftarkan kedua model di Windows |
| `IMPORT-OLLAMA.sh` | Sama untuk Linux / macOS / WSL |
| `README.md` | Panduan ini |

## Prasyarat (laptop tujuan)

1. [Ollama](https://ollama.com/download) terpasang dan bisa dijalankan (`ollama --version`).
2. Folder `nex-ai-models` utuh (GGUF + Modelfile ada di folder yang sama).
3. Ruang disk bebas minimal ~3 GB (impor + salinan internal Ollama).

## Cara pakai

### 1. Salin folder

Salin seluruh `nex-ai-models` ke laptop tujuan (USB, Drive, SMB, dll.):

```text
NEXUS-CYBER-FASE3/nex-ai-models/
```

Atau cukup folder `nex-ai-models` saja.

### 2. Impor ke Ollama

**Windows** — double-click `IMPORT-OLLAMA.bat`, atau:

```bat
cd nex-ai-models
IMPORT-OLLAMA.bat
```

**Linux / macOS / WSL:**

```bash
cd nex-ai-models
chmod +x IMPORT-OLLAMA.sh
./IMPORT-OLLAMA.sh
```

Perintah setara manual:

```bash
ollama create nex-ai-protect -f Modelfile.protect
ollama create nex-ai-reflex  -f Modelfile.production
```

### 3. Verifikasi

```bash
ollama list
```

Harus muncul `nex-ai-protect` dan `nex-ai-reflex`.

Uji singkat:

```bash
ollama run nex-ai-protect "jawab JSON saja: status BENIGN untuk GET /"
```

## Hubungkan ke Nexus (opsional)

WAF lab **tetap jalan tanpa** model ini (Reflex regex). Reasoning Ollama hanya aktif jika dikonfigurasi.

Contoh di `deploy-local/.env` atau `.env` gateway:

```env
NEX_AI_ENDPOINT=http://host.docker.internal:11434/api/chat
NEX_AI_MODEL_REFLEX=nex-ai-reflex
NEX_AI_MODEL_REASONING=nex-ai-protect
```

Lalu restart gateway / stack `deploy-local` jika sedang jalan. Compose lab sudah mengarah ke `http://host.docker.internal:11434/api/chat` (Ollama di Windows, bukan di dalam container).

## Jangan push ke GitHub

- `*.gguf` diabaikan `.gitignore` (root + `NEX-AI/`).
- Jangan `git add -f` pada GGUF.
- Distribusi ulang publik dilarang (lihat `NEX-AI/NEX_AI_SOVEREIGNTY_NOTICE.md`). Paket ini untuk **salin antar perangkat Anda sendiri**.

## Troubleshooting

| Gejala | Perbaikan |
| --- | --- |
| `ollama: command not found` | Install Ollama, buka terminal baru |
| `FROM ./nex_ai_q4_k_m.gguf` gagal | Jalankan impor **dari dalam** folder `nex-ai-models` |
| Model tidak muncul di `ollama list` | Cek ukuran GGUF (~1.8 GB); salinan USB mungkin putus |
| NEX-AI sudah ada di folder lain / dobel | `ollama rm nex-ai-protect` dan `nex-ai-reflex`, impor hanya dari `nex-ai-models` di disk repo |
| Gateway tidak memakai model | Pastikan Ollama listening, env `NEX_AI_*` benar, restart gateway |
