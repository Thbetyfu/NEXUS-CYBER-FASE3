"""Data contracts for Channel Starter sites."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slugify(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:48] or "site"


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


class SiteForm(BaseModel):
    business_name: str = Field(min_length=2, max_length=80)
    category: SiteCategory = SiteCategory.PROFIL
    tagline: str = ""
    description: str = ""
    whatsapp: str = Field(min_length=8, max_length=20)
    address: str = ""
    email: str = ""
    primary_color: str = "#0ea5e9"
    tier: PricingTier = PricingTier.STARTER
    logo_url: str = ""
    slug: str = ""

    @field_validator("primary_color")
    @classmethod
    def _hex_color(cls, value: str) -> str:
        if not value.startswith("#") or len(value) not in {4, 7}:
            return "#0ea5e9"
        return value

    @field_validator("whatsapp")
    @classmethod
    def _digits_wa(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("0"):
            digits = "62" + digits[1:]
        return digits

    def resolved_slug(self) -> str:
        return self.slug or slugify(self.business_name)

    def template_name(self) -> str:
        return self.category.value


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
    primary_color: str = "#0ea5e9"
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

    @property
    def gaas_active(self) -> bool:
        return self.gaas_status == GaasUpsellStatus.ACTIVE
