# Sandbox NEX-RED (Lantai 2)

Image ini **opsional**. CLI `nexred.py scan` tetap jalan di laptop. Sandbox dipakai jika Anda ingin isolasi Docker.

- User non-root `10001`
- Jaringan: jangan `--network host`. Hubungkan hanya ke compose lab / `127.0.0.1` via extra_hosts
- Allow-list host ada di `sandbox/policy.py` (bukan iptables di dalam image)

Belum memblokir `curl` ke internet dari dalam kontainer tanpa network policy Docker. Itu fase berikutnya.
