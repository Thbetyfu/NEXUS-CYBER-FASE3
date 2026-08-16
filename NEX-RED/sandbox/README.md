# Sandbox NEX-RED (opsional)

Image worker **non-root** (`uid 10001`). CLI `nexred.py scan` tetap bisa di laptop tanpa Docker.

## Apa yang dikunci

- User `10001`, `cap_drop: ALL`, `no-new-privileges`, root filesystem read-only, tmpfs untuk laporan
- **Tidak** memasang Docker socket
- Allow-list HTTP di `sandbox/policy.py` (bukan iptables). Klien NEX-RED menolak host di luar lab; `curl` mentah di dalam image **bisa** masih ke internet jika jaringan Docker terbuka

## Jalankan

```bat
cd NEX-RED\sandbox
docker compose run --rm nexred
```

Atau: `python NEX-RED/nexred.py sandbox` (exit 3 jika Docker tidak ada — scan biasa tetap dipakai).

Target di host (WAF / Juice Shop): `host.docker.internal`.
