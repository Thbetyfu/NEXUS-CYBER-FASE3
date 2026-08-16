---
name: dual-brain
description: Ensemble AI Architecture for Nexus Cyber (NEX-AI Reflex + NEX-AI Protect)
---

# 🧠 Skill: Dual-Brain (Ensemble AI)

## Objective
Implementasikan arsitektur Ensemble AI kustom untuk filter trafik massal dan analisis anomali mendalam.

## Workflow
1. **Reflex Layer (NEX-AI Reflex)**: Model skala kecil dan cepat (`nex-ai-reflex`) untuk filtrasi real-time sub-milidetik.
2. **Reasoning Layer (NEX-AI Protect)**: Model penalaran kontekstual kustom (`nex-ai-protect`) untuk analisis ancaman terobfuskasi & zero-day.

## Constraints
* Dilarang menggunakan model AI tunggal / vendor cloud external **sebagai runtime**.
* Runtime wajib `nex-ai-protect` / `nex-ai-reflex`. Jangan fallback Qwen/Llama.
* Interaksi antar layer harus melalui protokol tertutup.
