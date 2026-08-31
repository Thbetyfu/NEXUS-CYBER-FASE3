> **Arsip historis** � snapshot; kontrak hidup: [PRODUCT_MODEL.md](./PRODUCT_MODEL.md), [CAPABILITIES.md](./CAPABILITIES.md).

---

# TEMPLAT PRD SIAP-AI (AI-READY PRD TEMPLATE)
Format Dokumen Kebutuhan Produk yang Dioptimalkan untuk LLM / AI Code Generator

> **Petunjuk Penggunaan:** Isi bagian di dalam tanda kurung siku `[Contoh]` sesuai dengan spesifikasi proyek Anda.
> Berikan dokumen ini kepada AI dengan instruksi awal: *"Bacalah dokumen PRD berikut secara menyeluruh, pahami batasan dan logikanya, lalu tunggu instruksi saya selanjutnya untuk mulai membuat modul kode."*

---

## 1. METADATA & KONTEKS GLOBAL
Gunakan bagian ini untuk mengunci pemahaman AI terhadap batasan ekosistem teknologi (*tech stack*) dan peran spesifik yang harus diambil.

- **Nama Proyek:** `[Nama Website / Aplikasi web]`
- **Versi PRD & Tanggal:** `[v1.0.0 / Tanggal Hari Ini]`
- **Target Tech Stack:**
  - **Frontend:** `[Contoh: Next.js 14 (App Router), Tailwind CSS, TypeScript]`
  - **Backend / API:** `[Contoh: Next.js Route Handlers / Node.js Express]`
  - **Database & ORM:** `[Contoh: PostgreSQL dengan Prisma ORM]`
  - **Autentikasi:** `[Contoh: NextAuth.js / JWT dengan HttpOnly Cookies]`
- **Arsitektur & Standar Kode:** `[Contoh: SOLID Principles, Clean Architecture, ESLint strict mode, Mobile-First Design]`
- **Peran AI (AI Persona Prompts):**
  > Bertindaklah sebagai Senior Full-Stack Developer, Software Architect, dan QA Engineer berpengalaman. Semua respons, struktur kode, skema database, dan pengujian yang Anda hasilkan nanti harus mematuhi batasan teknologi dan standar yang didefinisikan dalam dokumen ini tanpa pengecualian.

---

## 2. RINGKASAN PRODUK & TARGET PENGGUNA

### 2.1 Masalah & Solusi (Problem & Solution)
- **Problem Statement:** `[Jelaskan masalah mendasar yang dihadapi pengguna secara singkat dan logis]`
- **Product Vision:** `[Jelaskan solusi atau bentuk website yang ingin dibangun]`

### 2.2 Target Pengguna (User Personas)
Aplikasi ini memiliki beberapa peran (*roles*) pengguna dengan hak akses yang terisolasi:
1. **Role:** `[Nama Role 1, misal: GUEST]` - `[Deskripsi hak akses singkat]`
2. **Role:** `[Nama Role 2, misal: USER]` - `[Deskripsi hak akses singkat]`
3. **Role:** `[Nama Role 3, misal: ADMIN]` - `[Deskripsi hak akses singkat]`

---

## 3. ARSITEKTUR INFORMASI & STRUKTUR HALAMAN
AI memerlukan peta navigasi yang jelas untuk memahami bagaimana rute halaman (*routing*) dan proteksi halaman diatur di dalam sistem.

Berikut adalah hierarki halaman (*Sitemap*) dan batasan aksesnya:
- `/` (Landing Page) → `[Akses: Publik]`
- `/login` & `/register` → `[Akses: Hanya Guest, redirect ke /dashboard jika sudah login]`
- `/dashboard` → `[Akses: Terproteksi (USER, ADMIN)]`
- `/admin/manage` → `[Akses: Terproteksi Super (Hanya ADMIN)]`
- `[Tambahkan rute lainnya sesuai kebutuhan]`

---

## 4. SPESIFIKASI FITUR DETAIL (MENGGUNAKAN USER STORY & ACCEPTANCE CRITERIA)
**Format Kaku untuk AI:** Duplikat struktur di bawah ini untuk setiap fitur yang ingin Anda buat. Format *Given-When-Then* mencegah AI menulis kode di luar ekspektasi (berhalusinasi).

### Fitur ID: F-XX - `[Nama Fitur]`
- **User Story:** Sebagai `[Role Pengguna]`, saya ingin `[Aksi yang ingin dilakukan]` sehingga `[Manfaat/Hasil yang didapatkan]`.
- **Aturan Bisnis (Business Rules):**
  - `[Aturan 1: Misal, Email tidak boleh duplikat di database]`
  - `[Aturan 2: Sesi login akan kedaluwarsa dalam 7 hari]`
- **Kriteria Penerimaan (Acceptance Criteria - Gherkin Format):**
  - **Skenario 1:** `[Nama Skenario, misal: Berhasil Login]`
    - **Given:** Pengguna berada di halaman `/login` dan belum terautentikasi.
    - **When:** Pengguna memasukkan email dan password yang valid, lalu menekan tombol "Masuk".
    - **Then:** Sistem memvalidasi kredensial, membuat session JWT, dan mengalihkan pengguna ke rute `/dashboard`.
  - **Skenario 2:** `[Nama Skenario, misal: Gagal Login karena Email Salah]`
    - **Given:** Pengguna berada di halaman `/login`.
    - **When:** Pengguna memasukkan email yang tidak terdaftar, lalu menekan tombol "Masuk".
    - **Then:** Sistem menolak permintaan dan menampilkan pesan error generic: `"Kredensial yang Anda masukkan salah."` demi alasan keamanan.
- **Kebutuhan UI/UX & Komponen Website:**
  - `[Contoh: Layout form harus centered, responsif (mobile-first), menggunakan komponen input dari Shadcn UI, dan state loading pada button saat API memproses request.]`

---

## 5. SKEMA DATA & ENTITAS DATABASE (DATA MODEL)
Gunakan format tabel ini untuk mendefinisikan struktur tabel database agar AI dapat menghasilkan file migrasi (SQL/Prisma schema) secara instan.

### Entitas 1: `[Nama Tabel, misal: User]`

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key, Unique | ID Unik entitas pengguna |
| `email` | String | Unique, Required | Alamat email untuk login |
| `password` | String | Required | Password yang sudah di-hash (bcrypt) |
| `role` | Enum | Default: 'USER' | Nilai: 'USER' \| 'ADMIN' |
| `created_at` | DateTime | Default: now() | Waktu pembuatan akun |

---

## 6. BATASAN NON-FUNGSIONAL, KEAMANAN, & VALIDASI
Bagian ini bertindak sebagai penjaga gerbang (*guardrails*) keamanan dan performa agar AI tidak menulis kode yang rentan bug.

- **Keamanan (Security):**
  - Semua input form wajib divalidasi di sisi klien (*frontend*) dan sisi server (*backend*) menggunakan library validasi seperti `[Zod / Joi]`.
  - Proteksi ketat terhadap celah keamanan umum: **XSS (Cross-Site Scripting)** dengan melakukan sanitasi input, **CSRF Protection**, dan enkripsi data sensitif sebelum masuk ke database.
  - Implementasikan *Rate Limiting* pada rute API sensitif (Maksimal 5x percobaan per menit untuk endpoint `/api/auth/login`).
- **Performa (Performance):**
  - Nilai performa Google Lighthouse minimal harus mencakup skor 90+ untuk Kinerja, Aksesibilitas, dan SEO.
  - Semua media/gambar wajib menggunakan optimasi otomatis format modern (WebP/AVIF) dan menggunakan metode *lazy loading*.
- **Aksesibilitas (Accessibility):**
  - Struktur HTML harus semantik dan mematuhi standar WCAG 2.1 AA (mendukung navigasi keyboard dan pembaca layar/*screen reader*).
