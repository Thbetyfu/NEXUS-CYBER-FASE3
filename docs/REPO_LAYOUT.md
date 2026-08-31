# Tata letak dua repo

**Pembaruan:** 2026-09-01  
Dua produk, **dua GitHub**, **bukan** git submodule. Workspace Cursor tetap **`D:\NEXUS`** (jangan rename).

| Nama mental | Folder disk (hari ini) | GitHub | Deploy |
| --- | --- | --- | --- |
| **nexus-gaas-web** | `D:\nexus-gaas-web` (saudara, di luar FASE3) | [Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS) | **Vercel** dari **root** repo itu |
| **nexus-core** | `D:\NEXUS` | [Thbetyfu/NEXUS-CYBER-FASE3](https://github.com/Thbetyfu/NEXUS-CYBER-FASE3) | Lab WAF / NEX-RED / operator — **bukan** situs jual Vercel |

## nexus-gaas-web

Channel Portal (Next.js). Generate site tetap ke Channel Starter lokal **`:3010`** (`CHANNEL_STARTER_URL`). Pohon SaaS lama (Prisma/Midtrans) di cabang `archive/legacy-saas`.

Owner harus **(re)connect** project Vercel ke `NEXUS-CYBER-WEBISTE-GaaS` di dashboard Vercel. Agen tidak mengklik UI Vercel.

## nexus-core (repo ini)

WAF Go, NEX-RED, Command Center `:3001`, generator `channel-starter/`, `deploy-local/`. Salinan lab **`nexus-channel-portal/`** **masih di sini** sampai cutover — jangan `git rm`. Jangan nested `.git` di dalam FASE3. Jangan Connect project `warung-*` ke FASE3.

## Bukan

- Submodule, `git submodule add`
- Pindah `.git` FASE3 ke folder lain
- Force-push
- Satu repo untuk warung + GaaS website + core
