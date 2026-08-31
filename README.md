# Nexus Cyber (FASE3 monorepo)

Git root tetap **`D:\NEXUS`**. Dua produk di dalam repo ini — **bukan** submodule, **bukan** nested `.git`.

| Folder | Produk | Peran |
| --- | --- | --- |
| [`nexus-gaas-web/`](./nexus-gaas-web/) | Channel Portal (Next.js `:3003`) | Pintu jual lab + kandidat Root Directory Vercel jika Connect Git FASE3 (**discouraged**). Generate tetap `CHANNEL_STARTER_URL=http://127.0.0.1:3010`. |
| [`nexus-core/`](./nexus-core/) | WAF, NEX-RED, dasbor operator, Channel Starter, lab | Mesin yang sulit ditiru: Job Cowork + tepi. Start lab: **`nexus-core\deploy-local\START.bat`**. |

**Produksi situs jual kanonik:** repo terpisah [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS). Salinan kerja opsional di **`D:\nexus-gaas-web`** (di luar git ini) boleh tetap ada — lab in-repo dan folder saudara **bisa drift** sampai owner pilih satu kanonik. **Jangan** Connect project `warung-*` ke FASE3. **Jangan** tunnel-kan SOC `:3001`/`:8081`.

Agen: [`AGENTS.md`](./AGENTS.md). Tata letak: [`nexus-core/docs/REPO_LAYOUT.md`](./nexus-core/docs/REPO_LAYOUT.md). Changelog mesin: [`nexus-core/CHANGELOG.md`](./nexus-core/CHANGELOG.md).
