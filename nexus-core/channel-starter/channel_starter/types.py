"""Data contracts for Channel Starter sites."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator

from channel_starter.themes import DEFAULT_THEME_ID, THEMES, resolve_theme


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slugify(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:48] or "site"


def http_url(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    if not text.startswith(("https://", "http://")):
        return ""
    return text[:500]


class SiteCategory(str, Enum):
    FNB = "fnb"
    JASA = "jasa"
    PROFIL = "profil"


class PricingTier(str, Enum):
    STARTER = "starter"
    USAHA = "usaha"
    TEPI = "tepi"
    COWORK = "cowork"


class GaasUpsellStatus(str, Enum):
    NONE = "none"
    ACTIVE = "active"


GAAS_UPSELL_TIERS = {PricingTier.TEPI, PricingTier.COWORK}


class Offering(BaseModel):
    title: str = ""
    body: str = ""


class StatItem(BaseModel):
    number: str = ""
    label: str = ""


class GalleryItem(BaseModel):
    image_url: str = ""
    title: str = ""
    caption: str = ""

    @field_validator("image_url")
    @classmethod
    def _gallery_url(cls, value: str) -> str:
        return http_url(value)


class SiteForm(BaseModel):
    business_name: str = Field(min_length=2, max_length=80)
    category: SiteCategory = SiteCategory.PROFIL
    tagline: str = ""
    description: str = ""
    whatsapp: str = Field(min_length=8, max_length=20)
    address: str = ""
    email: str = ""
    hours: str = ""
    instagram: str = ""
    headline: str = ""
    headline_accent: str = ""
    about_title: str = ""
    about_body: str = ""
    extra_title: str = ""
    extra_body: str = ""
    quote: str = ""
    quote_name: str = ""
    quote_role: str = ""
    partners: str = ""
    cta_label: str = ""
    hero_image_url: str = ""
    logo_url: str = ""
    theme: str = DEFAULT_THEME_ID
    primary_color: str = ""
    custom_domain: str = ""
    offerings: list[Offering] = Field(default_factory=list)
    stats: list[StatItem] = Field(default_factory=list)
    gallery: list[GalleryItem] = Field(default_factory=list)
    tier: PricingTier = PricingTier.STARTER
    slug: str = ""

    @field_validator("theme")
    @classmethod
    def _theme_id(cls, value: str) -> str:
        key = (value or DEFAULT_THEME_ID).strip().lower()
        return key if key in THEMES else DEFAULT_THEME_ID

    @field_validator("hero_image_url", "logo_url")
    @classmethod
    def _http_only(cls, value: str) -> str:
        return http_url(value)

    @field_validator("custom_domain")
    @classmethod
    def _host(cls, value: str) -> str:
        text = (value or "").strip().lower().removeprefix("https://").removeprefix("http://")
        text = text.split("/")[0]
        if not text or " " in text or len(text) > 80:
            return ""
        return text

    @field_validator("instagram")
    @classmethod
    def _ig(cls, value: str) -> str:
        text = (value or "").strip().lstrip("@")
        return text[:40]

    @field_validator("whatsapp")
    @classmethod
    def _digits_wa(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("0"):
            digits = "62" + digits[1:]
        return digits

    @model_validator(mode="after")
    def _apply_theme_hex(self) -> "SiteForm":
        theme = resolve_theme(self.theme, self.primary_color)
        self.theme = theme.id
        self.primary_color = theme.primary
        return self

    def resolved_slug(self) -> str:
        return self.slug or slugify(self.business_name)

    def template_name(self) -> str:
        return self.category.value

    def partner_list(self) -> list[str]:
        return [p.strip() for p in self.partners.split(",") if p.strip()][:8]


class SiteManifest(BaseModel):
    site_id: str
    slug: str
    business_name: str
    category: SiteCategory
    tier: PricingTier
    subdomain: str
    output_dir: str
    index_path: str
    tagline: str = ""
    description: str = ""
    whatsapp: str = ""
    address: str = ""
    email: str = ""
    hours: str = ""
    instagram: str = ""
    headline: str = ""
    headline_accent: str = ""
    about_title: str = ""
    about_body: str = ""
    extra_title: str = ""
    extra_body: str = ""
    quote: str = ""
    quote_name: str = ""
    quote_role: str = ""
    partners: str = ""
    cta_label: str = ""
    hero_image_url: str = ""
    logo_url: str = ""
    theme: str = DEFAULT_THEME_ID
    primary_color: str = "#4CAF4F"
    custom_domain: str = ""
    offerings: list[Offering] = Field(default_factory=list)
    stats: list[StatItem] = Field(default_factory=list)
    gallery: list[GalleryItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_utcnow)
    upsell_note: str = (
        "Keamanan wasit Nexus Cowork (Job/Loop GaaS) — paket terpisah, bukan termasuk Starter Rp ~20rb."
    )
    gaas_status: GaasUpsellStatus = GaasUpsellStatus.NONE
    gaas_tier: PricingTier | None = None
    protected_host: str = ""
    cowork_job_id: str = ""
    loop_schedule_id: str = ""
    upsell_at: datetime | None = None
    vercel_url: str = ""
    vercel_project: str = ""

    @property
    def gaas_active(self) -> bool:
        return self.gaas_status == GaasUpsellStatus.ACTIVE
