"""Empat palet Channel Starter — token dari Figma Contoh-landing-page-nexus.

Landing memakai Brand/Primary #4CAF4F, Info #2194F3, Secondary #263238,
Shade/S4 #1B5E1F, plus netral Silver/Grey dari style guide. Bukan palet bebas.
"""

from __future__ import annotations

from typing import NamedTuple


class Theme(NamedTuple):
    id: str
    label: str
    primary: str
    dark: str
    tint: str


THEMES: dict[str, Theme] = {
    "hijau": Theme("hijau", "Hijau", "#4CAF4F", "#237D31", "#E8F5E9"),
    "biru": Theme("biru", "Biru", "#2194F3", "#1565C0", "#E3F2FD"),
    "navy": Theme("navy", "Navy", "#263238", "#11181C", "#F5F7FA"),
    "hutan": Theme("hutan", "Hutan", "#1B5E1F", "#103E13", "#E8F5E9"),
}

DEFAULT_THEME_ID = "hijau"

# Netral Figma — sama di semua palet
NEUTRAL = {
    "black": "#263238",
    "d_grey": "#4D4D4D",
    "grey": "#717171",
    "l_grey": "#89939E",
    "silver": "#F5F7FA",
    "white": "#FFFFFF",
}


def resolve_theme(theme_id: str | None, primary_color: str = "") -> Theme:
    key = (theme_id or "").strip().lower()
    if key in THEMES:
        return THEMES[key]
    hex_map = {t.primary.lower(): t for t in THEMES.values()}
    mapped = hex_map.get((primary_color or "").strip().lower())
    return mapped or THEMES[DEFAULT_THEME_ID]


def theme_choices() -> list[Theme]:
    return list(THEMES.values())
