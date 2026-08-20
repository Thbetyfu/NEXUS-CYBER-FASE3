# Nexus Cyber Git Workflow

Submodule:

| Folder | Remote | Peran |
| --- | --- | --- |
| `playground/Portofolio-Thoriq` | `https://github.com/Thbetyfu/Portofolio-Thoriq.git` | Origin lab (Gallery) di `START-OFFLINE` |
| `playground/NEXUS-CYBER-WEBISTE-SAAS` | `https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-SAAS.git` | Portal jual / F-10. **Bukan** origin WAF. `npm run dev` default `:3003` bentrok dengan Juice Shop lab |

Bukan folder lama `Portfolio-website-main`. Clone di `D:\NEXUS-CYBER-WEBISTE-SAAS` (di luar FASE3) adalah salinan terpisah — kerjakan isi SaaS **di dalam** submodule.

Clone:

```bash
git clone --recursive https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
# atau
git submodule update --init --recursive
```

Update:

```bash
git pull origin main --recurse-submodules
```

Lab hotspot (blue team): setelah pull, jalankan `deploy-local\blue-team\STOP.bat` lalu `START-OFFLINE.bat` supaya image `portfolio` memuat JS terbaru. `git pull` tanpa rebuild Docker masih menyajikan bundle lama. Pull submodule SaaS **tidak** mengubah container portofolio.

Ubah isi portofolio atau SaaS: commit + push **di dalam** submodule, lalu di repo utama `git add playground/<nama-folder>` dan commit pointer.

Jangan hapus `.git` di dalam submodule.

Commit: conventional commits (`feat`, `fix`, `chore`, `docs`). Perubahan perilaku → `CHANGELOG.md` + dokumen hidup (`docs/README.md`).
