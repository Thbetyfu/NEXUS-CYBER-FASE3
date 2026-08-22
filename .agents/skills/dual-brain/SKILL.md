---
name: dual-brain
description: Reflex regex + optional nex-ai-protect async — bukan selling point GaaS; lihat PRODUCT_MODEL.md
---

# Skill: Dual-Brain (NEX-AI)

**Produk GaaS** = wasit + Job Cowork, bukan dual-brain branding. Reflex di jalur request = **regex**; `nex-ai-protect` opsional asinkron.

## Workflow
1. **Reflex Layer (NEX-AI Reflex)**: Model skala kecil dan cepat (`nex-ai-reflex`) untuk filtrasi real-time sub-milidetik.
2. **Reasoning Layer (NEX-AI Protect)**: Model penalaran kontekstual kustom (`nex-ai-protect`) untuk analisis ancaman terobfuskasi & zero-day.

## Constraints
* Dilarang menggunakan model AI tunggal / vendor cloud external **sebagai runtime**.
* Runtime wajib `nex-ai-protect` / `nex-ai-reflex`. Jangan fallback Qwen/Llama.
* Interaksi antar layer harus melalui protokol tertutup.
