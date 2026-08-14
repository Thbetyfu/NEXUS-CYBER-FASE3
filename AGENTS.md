# Agen & dokumentasi Nexus Cyber

Jika Anda mengubah **perilaku** sistem (kode gateway, dasbor, NEX-RED, Caddy, compose):

1. Ikuti `.agents/rules/nexus-rule.md` (termasuk bagian **docs-sync**).
2. Jalankan pola `.agents/agents/docs-sync.md`: perbarui dokumen **hidup** di `docs/README.md` dan `CHANGELOG.md` dalam perubahan yang sama.
3. Control plane: `.agents/agents/soc-control-plane.md`. Identitas HTTP: `.agents/agents/request-identity.md`.

Jangan mengklaim eBPF XDP nyata, JWT enterprise, Stripe/provisioner, atau pentest NEX-RED jika kode tidak melakukannya.

Pembayaran / webhook fail-closed: **ditunda** (lihat `CHANGELOG.md` Unreleased) — jangan kerjakan kecuali pemilik minta.
