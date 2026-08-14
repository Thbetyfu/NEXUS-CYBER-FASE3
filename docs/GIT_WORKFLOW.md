# Nexus Cyber Git Workflow

Submodule portofolio: `playground/Portofolio-Thoriq` (`https://github.com/Thbetyfu/Portofolio-Thoriq.git`). Bukan folder lama `Portfolio-website-main`.

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

Ubah isi portofolio: commit + push **di dalam** submodule, lalu di repo utama `git add playground/Portofolio-Thoriq` dan commit pointer.

Jangan hapus `.git` di dalam submodule.

Commit: conventional commits (`feat`, `fix`, `chore`, `docs`). Perubahan perilaku → `CHANGELOG.md` + dokumen hidup (`docs/README.md`).
