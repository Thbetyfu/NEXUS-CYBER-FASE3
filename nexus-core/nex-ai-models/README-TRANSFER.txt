Lihat panduan lengkap: README.md

Ringkas (satu hard disk / laptop blue team):
  1. Jangan andalkan git push untuk GGUF
  2. Colok disk, buka NEXUS-CYBER-FASE3 (huruf drive boleh D: atau E:)
  3. Install Ollama di laptop itu
  4. Jika ollama list sudah ada nex-ai-* dari folder lama: ollama rm nex-ai-protect lalu ollama rm nex-ai-reflex
  5. Jalankan nex-ai-models\IMPORT-OLLAMA.bat (hanya dari folder ini)
  6. ollama list: satu protect, satu reflex
  7. Baru START-OFFLINE.bat

Jangan git push file *.gguf. Jangan hapus folder repo jika disk-nya sama. Jangan impor GGUF dari path lain.
