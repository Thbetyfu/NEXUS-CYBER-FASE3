# Power Point — Nexus Cyber (Lomba PIDI)

Folder pitch deck untuk **PIDI Digdaya x Hackathon 2026** dan versi investor.

## File

| File | Untuk siapa | Slide |
| --- | --- | --- |
| **`Nexus-Cyber-PIDI-Capstone.pptx`** | **Final submission / pitching juri** | ~33 (14 core + additional Q&A) |
| `Nexus-Cyber-Investor-Pitch.pptx` | Investor (format bebas) | ~30 |
| `generate_pidi_pitch_deck.py` | Regenerasi deck PIDI | — |
| `generate_pitch_deck.py` | Regenerasi deck investor | — |

## Struktur deck PIDI (pendekatan Anda)

### Part A — 14 slide inti (WAJIB presentasi ±10 menit)

Sesuai `Lomba/Aturan PIDI/markdown/03-STRUKTUR-PITCH-DECK-14-SLIDE.md`:

1. Solution at a Glance — **PS1 Manajemen Risiko**
2. Problem & Why It Matters
3. Problem Validation & Root Cause
4. Solution & Core Use Case
5. Value Prop & Differentiation
6. Prototype & Current State (Built / Planned / Not claimed)
7. How Technology Works (3-layer)
8. Technical Testing & Performance
9. Impact & Evidence (tabel metrik)
10. Market / User / Offtaker Validation
11. Adoption & Sustainability
12. Team & Execution Readiness — **ISI NAMA TIM**
13. Roadmap to Implementation
14. Key Risks & Next Priorities

Badge di slide: **CORE 1/14 … CORE 14/14**

### Part B — Additional (Q&A — tidak dipresentasi penuh)

Digunakan saat juri bertanya — jawab dengan **buka slide + data**, bukan abstrak.

| Slide | Isi |
| --- | --- |
| A1 | Defense delta & label wasit |
| A2 | Job Cowork lifecycle |
| A3 | AI/GaaS 8 poin teknis + L0/L1 |
| A4 | Keamanan lab |
| A5 | Bukti pengujian repo |
| A6–A9 | Unit economics & finance per segmen |
| A10 | BMC detail |
| A11 | Limitations (kejujuran) |
| A12 | Demo SOP 3-tier backup |
| A13 | Distribusi pilot PC+tunnel |
| A14 | **Template validasi lapangan — ISI data nyata** |
| A15 | Checklist eligibility 12 pertanyaan |
| A16 | Index dokumen repo |

Badge di slide: **ADDITIONAL · Q&A**

## Problem Statement resmi (form submission)

- **PS1:** Penguatan Ketahanan dan Inovasi Keuangan  
- **Sub-PS:** Manajemen Risiko  

## Sebelum submit — wajib tim isi manual

1. **Slide 12 Team** — nama, skill, kontribusi nyata per anggota  
2. **Slide A14** — transkrip/ringkasan wawancara & LOI (jika ada)  
3. **Slide 10** — feedback user nyata (jangan template kosong)  
4. **Video demo backup** 60–90 detik (Tier 2, harddisk lokal)  

## Regenerasi

```bash
pip install python-pptx
python "Lomba/power point/generate_pidi_pitch_deck.py"
```

## Aturan lomba

Baca: `Lomba/Aturan PIDI/markdown/` dan PDF resmi.

Prinsip juri: **Evidence over Claim** · Built vs Planned · Transparency.
