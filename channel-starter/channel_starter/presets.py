"""Rule-based copy presets — no LLM. Mengisi section Nexcent jika form kosong."""

from channel_starter.types import GalleryItem, Offering, SiteCategory, StatItem

_FNB = {
    "tagline": "Rasa lokal, pelayanan ramah — pesan hari ini via WhatsApp.",
    "description": (
        "Menu harian, camilan favorit, dan porsi keluarga. Pesan lewat WhatsApp untuk "
        "takeaway, delivery lokal, atau tanya stok hari ini."
    ),
    "headline": "Menu harian yang bikin",
    "headline_accent": "langganan pulang",
    "about_title": "Dapur rumahan, standar ramah tetangga",
    "about_body": (
        "Kami masak setiap hari dengan bahan segar. Tidak ada keranjang online yang ribet — "
        "cukup chat, konfirmasi menu, dan ambil atau antar sesuai janji."
    ),
    "extra_title": "Jam buka & cara pesan",
    "extra_body": (
        "Chat WhatsApp sebelum datang agar stok dipastikan. Bisa porsi harian, paket keluarga, "
        "atau pesanan acara kecil. Alamat dan jam operasional tercantum di footer."
    ),
    "hours": "Setiap hari 09.00–21.00 WIB",
    "cta_label": "Pesan via WhatsApp",
    "quote": (
        "Langganan nasi uduk di sini karena rasanya konsisten dan chat-nya cepat. "
        "Cocok buat yang tidak mau ribet buka aplikasi ojek."
    ),
    "quote_name": "Pelanggan tetap",
    "quote_role": "Langganan minggu ini",
    "partners": "Pasar pagi, Petani lokal, Komunitas RT",
    "offerings": [
        Offering(title="Menu harian", body="Masakan yang habis di hari yang sama. Tanya stok via chat sebelum datang."),
        Offering(title="Takeaway & antar", body="Bungkus rapi untuk dibawa pulang, atau antar di radius sekitar lokasi."),
        Offering(title="Paket acara kecil", body="Nasi kotak dan camilan untuk arisan, rapat RT, atau kantor mini."),
    ],
    "stats": [
        StatItem(number="100+", label="Porsi / minggu"),
        StatItem(number="4.9", label="Rating pelanggan"),
        StatItem(number="15 mnt", label="Balasan chat"),
        StatItem(number="1", label="Dapur, bukan waralaba"),
    ],
    "gallery": [
        GalleryItem(title="Menu andalan", caption="Foto hidangan — unggah URL foto Anda."),
        GalleryItem(title="Suasana warung", caption="Tempat duduk atau etalase."),
        GalleryItem(title="Paket keluarga", caption="Porsi untuk dinikmati bareng."),
    ],
}

_JASA = {
    "tagline": "Solusi praktis, harga transparan, respon via WhatsApp.",
    "description": (
        "Layanan profesional untuk kebutuhan harian dan usaha kecil. Jadwal, ruang lingkup, "
        "dan harga dibicarakan dulu di chat — baru dikerjakan."
    ),
    "headline": "Layanan rapi yang",
    "headline_accent": "bisa diandalkan",
    "about_title": "Satu chat, ruang lingkup jelas",
    "about_body": (
        "Kami tidak menjanjikan keajaiban. Yang kami jaga: datang tepat waktu, kerja sesuai "
        "kesepakatan, dan konfirmasi jika ada biaya tambahan sebelum dikerjakan."
    ),
    "extra_title": "Area & jadwal",
    "extra_body": (
        "Wilayah layanan mengikuti alamat di footer. Slot hari ini atau minggu ini bisa ditanya "
        "langsung. Foto sebelum-sesudah bisa dilampirkan di galeri."
    ),
    "hours": "Senin–Sabtu 08.00–17.00 WIB",
    "cta_label": "Konsultasi WhatsApp",
    "quote": (
        "Harganya tidak mengambang di tengah jalan. Setelah sepakat di chat, hasilnya sesuai "
        "yang dibicarakan."
    ),
    "quote_name": "Klien rumahan",
    "quote_role": "Pesanan jasa",
    "partners": "Toko bahan, Bengkel rekanan, Komunitas usaha",
    "offerings": [
        Offering(title="Kunjungan & survei", body="Lihat kondisi di lokasi, usulkan langkah, dan kirim perkiraan biaya."),
        Offering(title="Pengerjaan terjadwal", body="Slot hari yang disepakati, dengan konfirmasi H-1 via WhatsApp."),
        Offering(title="Perawatan berkala", body="Paket ulang untuk yang butuh jadwal rutin, bukan sekali datang."),
    ],
    "stats": [
        StatItem(number="24 jam", label="Respon kerja"),
        StatItem(number="50+", label="Order selesai"),
        StatItem(number="1 hari", label="Jadwal tersingkat"),
        StatItem(number="0", label="Biaya tersembunyi"),
    ],
    "gallery": [
        GalleryItem(title="Sebelum", caption="Kondisi awal — taruh foto URL."),
        GalleryItem(title="Proses", caption="Tim atau alat di lokasi."),
        GalleryItem(title="Sesudah", caption="Hasil yang diserahkan ke klien."),
    ],
}

_PROFIL = {
    "tagline": "UMKM lokal — percaya, dekat, responsif.",
    "description": (
        "Profil usaha kami: produk dan layanan untuk tetangga dan pelanggan setia. "
        "Hubungi kami untuk katalog, jam buka, atau kerja sama kecil."
    ),
    "headline": "Usaha lokal yang",
    "headline_accent": "siap dihubungi",
    "about_title": "Cerita singkat di balik nama ini",
    "about_body": (
        "Kami membangun usaha pelan-pelan: produk yang kami pakai sendiri, layanan yang kami "
        "mau terima sebagai pelanggan, dan saluran chat yang benar-benar dibalas."
    ),
    "extra_title": "Cara berkenalan",
    "extra_body": (
        "Isi alamat, jam, dan galeri di form agar halaman ini jadi kartu nama yang lengkap. "
        "Tombol hijau mengarah langsung ke WhatsApp usaha Anda."
    ),
    "hours": "Senin–Jumat 09.00–17.00 WIB",
    "cta_label": "Hubungi kami",
    "quote": (
        "Website-nya langsung ke chat. Tidak perlu isi form panjang hanya untuk tanya harga."
    ),
    "quote_name": "Pelanggan pertama",
    "quote_role": "Tetangga & langganan",
    "partners": "Komunitas UMKM, Pasar lokal, Rekan distribusi",
    "offerings": [
        Offering(title="Produk unggulan", body="Yang paling sering ditanya — jelaskan manfaatnya dalam satu kalimat."),
        Offering(title="Untuk siapa", body="Pelanggan rumahan, kantor kecil, atau reseller — sebut di sini."),
        Offering(title="Cara pesan", body="Chat, datang ke lokasi, atau pre-order. Cantumkan jam operasional."),
    ],
    "stats": [
        StatItem(number="2019", label="Mulai usaha"),
        StatItem(number="200+", label="Pelanggan"),
        StatItem(number="3", label="Produk andalan"),
        StatItem(number="1 kota", label="Wilayah layanan"),
    ],
    "gallery": [
        GalleryItem(title="Produk", caption="Foto produk atau etalase."),
        GalleryItem(title="Tim", caption="Wajah di balik usaha."),
        GalleryItem(title="Lokasi", caption="Tampak depan atau peta sederhana."),
    ],
}

PRESETS: dict[SiteCategory, dict] = {
    SiteCategory.FNB: _FNB,
    SiteCategory.JASA: _JASA,
    SiteCategory.PROFIL: _PROFIL,
}

_TEXT_KEYS = (
    "tagline",
    "description",
    "headline",
    "headline_accent",
    "about_title",
    "about_body",
    "extra_title",
    "extra_body",
    "hours",
    "cta_label",
    "quote",
    "quote_name",
    "quote_role",
    "partners",
)


def apply_presets(form_dict: dict) -> dict:
    cat = SiteCategory(form_dict.get("category", SiteCategory.PROFIL))
    preset = PRESETS.get(cat, PRESETS[SiteCategory.PROFIL])
    for key in _TEXT_KEYS:
        if not form_dict.get(key):
            form_dict[key] = preset[key]
    existing_off = form_dict.get("offerings") or []
    preset_off = [item.model_dump() for item in preset["offerings"]]
    if not existing_off:
        form_dict["offerings"] = preset_off
    elif len(existing_off) < 3:
        form_dict["offerings"] = list(existing_off) + preset_off[len(existing_off) :]

    existing_stats = form_dict.get("stats") or []
    preset_stats = [item.model_dump() for item in preset["stats"]]
    if not existing_stats:
        form_dict["stats"] = preset_stats
    elif len(existing_stats) < 4:
        form_dict["stats"] = list(existing_stats) + preset_stats[len(existing_stats) :]

    existing_gal = form_dict.get("gallery") or []
    preset_gal = [item.model_dump() for item in preset["gallery"]]
    if not existing_gal:
        form_dict["gallery"] = preset_gal
    elif len(existing_gal) < 3:
        form_dict["gallery"] = list(existing_gal) + preset_gal[len(existing_gal) :]
    return form_dict
