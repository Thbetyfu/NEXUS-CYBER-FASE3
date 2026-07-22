---
name: senior-developer
description: Senior Software Engineer Principles - Clean Code, DRY, No Dead Code, High Architecture Integrity, and Zero Duplication
---

# 🧠 Skill: Senior Developer (Clean Code & Architectural Excellence)

## Objective
Menjamin seluruh *codebase* Nexus Cyber (Backend Go, Frontend Next.js, dan Script Python) mengikuti standar **Senior Principal Software Engineer**: bersih, terstruktur, modular, zero-duplication (DRY), dan bebas dari *dead code*.

## Core Rules & Principles

### 1. 🧹 Zero Dead Code & Zero Duplication (DRY)
* **No Dead Code**: Hapus fungsi, variabel, import, atau file eksperimental yang tidak lagi dipanggil dalam alur aplikasi aktif.
* **No Duplicate Logic**: Dilarang membuat fungsi pembantu (*helper*) yang sama secara berulang di lokasi berbeda. Gunakan modul terpusat (misal `pkg/utils/` di Go atau `lib/utils.ts` di Next.js).
* **Audit Sebelum Menulis**: Selalu periksa basis data kode (`grep_search` / `list_dir`) sebelum membuat utility function baru.

### 2. 🏗️ Clean Code & High Maintainability
* **Single Responsibility Principle (SRP)**: Setiap file dan fungsi hanya boleh memiliki satu alasan untuk berubah.
* **Descriptive & Explicit Naming**: Gunakan penamaan variabel/fungsi yang jelas dan mengekspresikan maksud (*self-documenting*), misal `CalculateThreatScore()` daripada `CalcTS()`.
* **Standardized Error Handling**: Tangani error secara eksplisit di tempat kejadian. Dilarang menelan error (*swallow exceptions*) atau mengembalikan fallback kosong tanpa log audit.
* **Type Hints & Static Checks**: Gunakan type hints ketat pada Go (structs/interfaces), TypeScript (strict mode), dan Python (type hints).

### 3. 🛡️ Robust & Fail-Safe Design
* **Fail-Safe Mechanism**: Jika service eksternal atau modul AI mengalami kegagalan, sistem harus masuk ke mode *Graceful Degradation*, bukan crash/panic.
* **Resource Cleanup**: Selalu gunakan `defer resp.Body.Close()`, `defer cancel()`, atau penutupan resource untuk mencegah kebocoran RAM dan file handles.
