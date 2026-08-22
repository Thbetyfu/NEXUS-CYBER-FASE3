"""Rule-based copy presets — no LLM."""

from channel_starter.types import SiteCategory


PRESETS: dict[SiteCategory, dict[str, str]] = {
    SiteCategory.FNB: {
        "tagline": "Rasa lokal, pelayanan ramah",
        "description": (
            "Menu harian dan camilan favorit. Pesan lewat WhatsApp untuk takeaway "
            "atau tanya stok hari ini."
        ),
    },
    SiteCategory.JASA: {
        "tagline": "Solusi praktis untuk kebutuhan Anda",
        "description": (
            "Layanan profesional dengan harga transparan. Hubungi kami untuk "
            "konsultasi singkat via WhatsApp."
        ),
    },
    SiteCategory.PROFIL: {
        "tagline": "UMKM lokal — percaya, dekat, responsif",
        "description": (
            "Profil usaha kami: produk/jasa berkualitas untuk komunitas sekitar. "
            "Silakan hubungi tim kami."
        ),
    },
}


def apply_presets(form_dict: dict) -> dict:
    cat = SiteCategory(form_dict.get("category", SiteCategory.PROFIL))
    preset = PRESETS.get(cat, PRESETS[SiteCategory.PROFIL])
    if not form_dict.get("tagline"):
        form_dict["tagline"] = preset["tagline"]
    if not form_dict.get("description"):
        form_dict["description"] = preset["description"]
    return form_dict
