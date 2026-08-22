"""FastAPI form wizard + static preview for Channel Starter."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from channel_starter.config import SERVE_PORT, SITES_DIR
from channel_starter.deploy import deploy_manifest
from channel_starter.generator import generate_from_dict, list_sites
from channel_starter.types import SiteCategory, PricingTier
from channel_starter.upsell import disable_upsell, enable_upsell, upsell_status

app = FastAPI(title="Nexus Channel Starter", version="0.1.0")

_FORM_HTML = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Channel Starter — Buat Website UMKM</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    label { display: block; margin-top: 1rem; font-weight: 600; }
    input, select, textarea { width: 100%; padding: .5rem; margin-top: .25rem; }
    button { margin-top: 1.5rem; padding: .75rem 1.5rem; background: #0ea5e9; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
    .note { font-size: .85rem; color: #64748b; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Channel Starter</h1>
  <p>Form → template → site statis. Rule-based, bukan LLM berat.</p>
  <form method="post" action="/generate">
    <label>Nama usaha</label>
    <input name="business_name" required maxlength="80" placeholder="Warung Bu Siti" />
    <label>Kategori</label>
    <select name="category">
      <option value="fnb">Kuliner / F&B</option>
      <option value="jasa">Jasa</option>
      <option value="profil" selected>Profil UMKM</option>
    </select>
    <label>WhatsApp (08xx atau 62xx)</label>
    <input name="whatsapp" required placeholder="6281234567890" />
    <label>Alamat (opsional)</label>
    <input name="address" placeholder="Jl. Contoh No. 1" />
    <label>Email (opsional)</label>
    <input name="email" type="email" />
    <label>Tagline (kosong = preset kategori)</label>
    <input name="tagline" />
    <label>Deskripsi (kosong = preset kategori)</label>
    <textarea name="description" rows="3"></textarea>
    <label>Warna utama</label>
    <input name="primary_color" value="#0ea5e9" />
    <label>Paket</label>
    <select name="tier">
      <option value="starter" selected>Starter (~Rp 0–29rb) — website saja</option>
      <option value="usaha">Usaha (Rp 49–99rb)</option>
      <option value="tepi">Tepi + WAF</option>
      <option value="cowork">Cowork GaaS (Job/Loop terpisah)</option>
    </select>
    <button type="submit">Generate site</button>
  </form>
  <p class="note">Starter Rp ~20rb <strong>tidak</strong> termasuk Job Cowork / Loop GaaS.</p>
  <p><a href="/sites">Daftar site</a></p>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def form_page() -> str:
    return _FORM_HTML


@app.post("/generate")
def generate_form(
    business_name: str = Form(...),
    category: SiteCategory = Form(SiteCategory.PROFIL),
    whatsapp: str = Form(...),
    address: str = Form(""),
    email: str = Form(""),
    tagline: str = Form(""),
    description: str = Form(""),
    primary_color: str = Form("#0ea5e9"),
    tier: PricingTier = Form(PricingTier.STARTER),
):
    payload = {
        "business_name": business_name,
        "category": category,
        "whatsapp": whatsapp,
        "address": address,
        "email": email,
        "tagline": tagline,
        "description": description,
        "primary_color": primary_color,
        "tier": tier,
    }
    try:
        manifest = generate_from_dict(payload)
        deploy = deploy_manifest(manifest)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedirectResponse(url=f"/sites/{manifest.slug}", status_code=303)


@app.get("/sites")
def sites_list():
    return [m.model_dump(mode="json") for m in list_sites()]


@app.get("/sites/{slug}")
def site_detail(slug: str):
    for manifest in list_sites():
        if manifest.slug == slug:
            deploy = deploy_manifest(manifest)
            return JSONResponse({"manifest": manifest.model_dump(mode="json"), "deploy": deploy})
    raise HTTPException(status_code=404, detail="Site not found")


@app.get("/preview/{slug}", response_class=HTMLResponse)
def preview_site(slug: str):
    index = SITES_DIR / slug / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=404, detail="Site not found")
    return index.read_text(encoding="utf-8")


@app.get("/upsell/status")
def upsell_status_route():
    return upsell_status()


@app.post("/upsell/{slug}/enable")
def upsell_enable_route(
    slug: str,
    tier: PricingTier = PricingTier.COWORK,
    create_job: bool = True,
    create_loop: bool = False,
):
    try:
        return enable_upsell(
            slug,
            tier=tier,
            create_job=create_job,
            create_loop=create_loop,
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/upsell/{slug}/disable")
def upsell_disable_route(slug: str):
    try:
        return disable_upsell(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=SERVE_PORT)


if __name__ == "__main__":
    main()
