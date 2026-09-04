"""FastAPI form wizard + static preview for Channel Starter."""

from __future__ import annotations

from contextlib import asynccontextmanager
from html import escape

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from channel_starter.config import SERVE_PORT
from channel_starter.deploy import deploy_manifest
from channel_starter.vercel_publish import publish_slug
from channel_starter.generator import (
    ensure_demo_site,
    generate_from_dict,
    list_sites,
    preview_catalog,
    resolve_preview_index,
)
from channel_starter.ownership import list_owned_sites, reassign_guest_sites
from channel_starter.types import PricingTier, SiteManifest
from channel_starter.upsell import disable_upsell, enable_upsell, upsell_status


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    ensure_demo_site()
    yield


app = FastAPI(title="Nexus Channel Starter", version="0.1.0", lifespan=_lifespan)

_FORM_HTML = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Channel Starter — Buat Website UMKM</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #4D4D4D; }
    h1 { color: #263238; }
    fieldset { border: 1px solid #ABBED1; border-radius: 8px; margin: 1.25rem 0; padding: 1rem 1.1rem 1.25rem; }
    legend { font-weight: 600; padding: 0 .4rem; }
    label { display: block; margin-top: .85rem; font-weight: 600; font-size: .92rem; }
    input, select, textarea { width: 100%; padding: .5rem; margin-top: .25rem; box-sizing: border-box; }
    .themes { display: flex; gap: 12px; flex-wrap: wrap; margin-top: .5rem; }
    .themes label { display: flex; align-items: center; gap: 8px; font-weight: 500; margin: 0; }
    .swatch { width: 28px; height: 28px; border-radius: 4px; border: 1px solid #ABBED1; }
    button { margin-top: 1.5rem; padding: .75rem 1.5rem; background: #4CAF4F; color: #fff; border: 0; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .note { font-size: .85rem; color: #717171; margin-top: 1rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .banner { background: #E8F5E9; border: 1px solid #4CAF4F; border-radius: 8px; padding: .9rem 1rem; margin: 1rem 0; font-size: .92rem; }
    @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Channel Starter</h1>
  <p>Form lengkap → template Nexcent (Figma) → site statis siap WA. Rule-based, bukan LLM.</p>
  <div class="banner">
    <strong>Preview hanya di komputer yang menjalankan wizard ini.</strong>
    Kalau Simple Browser JSON <code>Site not found</code>, proses di :3010 masih kode lama —
    <code>START-PREVIEW.bat</code> atau generate di form ini. Demo git:
    <a href="/preview/contoh-nexcent">/preview/contoh-nexcent</a>
    (<code>sites/contoh-nexcent</code>). Hasil generate klien lain tidak ikut git.
  </div>
  <form method="post" action="/generate">
    <fieldset>
      <legend>Usaha</legend>
      <label>Nama usaha</label>
      <input name="business_name" required maxlength="80" placeholder="Warung Bu Siti" />
      <div class="row">
        <div>
          <label>Kategori</label>
          <select name="category">
            <option value="fnb">Kuliner / F&amp;B</option>
            <option value="jasa">Jasa</option>
            <option value="profil" selected>Profil UMKM</option>
          </select>
        </div>
        <div>
          <label>WhatsApp</label>
          <input name="whatsapp" required placeholder="08xxxxxxxxxx" />
        </div>
      </div>
      <label>Alamat</label>
      <input name="address" placeholder="Jl. Contoh No. 1, Kota" />
      <div class="row">
        <div>
          <label>Email</label>
          <input name="email" type="email" />
        </div>
        <div>
          <label>Jam operasional</label>
          <input name="hours" placeholder="Setiap hari 09.00–21.00" />
        </div>
      </div>
      <label>Instagram (tanpa @)</label>
      <input name="instagram" placeholder="warungbusiti" />
    </fieldset>
    <fieldset>
      <legend>Warna (4 palet Figma)</legend>
      <div class="themes">
        <label><input type="radio" name="theme" value="hijau" checked /> <span class="swatch" style="background:#4CAF4F"></span> Hijau</label>
        <label><input type="radio" name="theme" value="biru" /> <span class="swatch" style="background:#2194F3"></span> Biru</label>
        <label><input type="radio" name="theme" value="navy" /> <span class="swatch" style="background:#263238"></span> Navy</label>
        <label><input type="radio" name="theme" value="hutan" /> <span class="swatch" style="background:#1B5E1F"></span> Hutan</label>
      </div>
    </fieldset>
    <fieldset>
      <legend>Teks hero &amp; tentang</legend>
      <label>Judul hero (kosong = preset)</label>
      <input name="headline" placeholder="Menu harian yang bikin" />
      <label>Kata aksen (warna brand)</label>
      <input name="headline_accent" placeholder="langganan pulang" />
      <label>Tagline</label>
      <input name="tagline" />
      <label>Deskripsi</label>
      <textarea name="description" rows="3"></textarea>
      <label>Judul tentang</label>
      <input name="about_title" />
      <label>Isi tentang</label>
      <textarea name="about_body" rows="3"></textarea>
      <label>Judul blok tambahan</label>
      <input name="extra_title" />
      <label>Isi blok tambahan</label>
      <textarea name="extra_body" rows="3"></textarea>
      <label>Teks tombol</label>
      <input name="cta_label" placeholder="Pesan via WhatsApp" />
    </fieldset>
    <fieldset>
      <legend>Tiga layanan</legend>
      <label>Layanan 1 — judul</label><input name="offering_1_title" />
      <label>Layanan 1 — isi</label><textarea name="offering_1_body" rows="2"></textarea>
      <label>Layanan 2 — judul</label><input name="offering_2_title" />
      <label>Layanan 2 — isi</label><textarea name="offering_2_body" rows="2"></textarea>
      <label>Layanan 3 — judul</label><input name="offering_3_title" />
      <label>Layanan 3 — isi</label><textarea name="offering_3_body" rows="2"></textarea>
    </fieldset>
    <fieldset>
      <legend>Angka usaha</legend>
      <div class="row">
        <div><label>Angka 1</label><input name="stat_1_number" placeholder="100+" /><label>Label 1</label><input name="stat_1_label" placeholder="Porsi / minggu" /></div>
        <div><label>Angka 2</label><input name="stat_2_number" /><label>Label 2</label><input name="stat_2_label" /></div>
        <div><label>Angka 3</label><input name="stat_3_number" /><label>Label 3</label><input name="stat_3_label" /></div>
        <div><label>Angka 4</label><input name="stat_4_number" /><label>Label 4</label><input name="stat_4_label" /></div>
      </div>
    </fieldset>
    <fieldset>
      <legend>Foto (URL https)</legend>
      <label>Logo</label><input name="logo_url" placeholder="https://..." />
      <label>Foto hero</label><input name="hero_image_url" placeholder="https://..." />
      <label>Galeri 1 — URL</label><input name="gallery_1_url" />
      <label>Galeri 1 — judul</label><input name="gallery_1_title" />
      <label>Galeri 1 — keterangan</label><input name="gallery_1_caption" />
      <label>Galeri 2 — URL</label><input name="gallery_2_url" />
      <label>Galeri 2 — judul</label><input name="gallery_2_title" />
      <label>Galeri 2 — keterangan</label><input name="gallery_2_caption" />
      <label>Galeri 3 — URL</label><input name="gallery_3_url" />
      <label>Galeri 3 — judul</label><input name="gallery_3_title" />
      <label>Galeri 3 — keterangan</label><input name="gallery_3_caption" />
    </fieldset>
    <fieldset>
      <legend>Testimoni &amp; mitra</legend>
      <label>Kutipan</label><textarea name="quote" rows="2"></textarea>
      <div class="row">
        <div><label>Nama</label><input name="quote_name" /></div>
        <div><label>Peran</label><input name="quote_role" /></div>
      </div>
      <label>Mitra (pisah koma)</label>
      <input name="partners" placeholder="Pasar pagi, Petani lokal" />
    </fieldset>
    <fieldset>
      <legend>Domain &amp; paket</legend>
      <label>Domain kustom (opsional, contoh tokoanda.com)</label>
      <input name="custom_domain" placeholder="kosong = {slug}.nexus-lab.test" />
      <label>Paket</label>
      <select name="tier">
        <option value="starter" selected>Starter (~Rp 20rb) — site + domain lab + header tepi</option>
        <option value="usaha">Usaha (Rp 49–99rb)</option>
        <option value="tepi">Tepi + WAF gateway</option>
        <option value="cowork">Cowork GaaS (Job/Loop terpisah)</option>
      </select>
    </fieldset>
    <button type="submit">Generate site</button>
  </form>
  <p class="note">
    Starter menulis <code>vercel.json</code> dan, jika <code>VERCEL_TOKEN</code> ada di
    <code>channel-starter/.env</code>, men-deploy <strong>folder situs itu saja</strong> ke project Vercel
    bernama slug. Bukan git monorepo Nexus. Bukan Job Cowork. Bukan klaim *.vercel.app di belakang WAF.
  </p>
  <p><a href="/preview">Daftar preview (contoh git)</a> · <a href="/preview/contoh-nexcent">Buka contoh Nexcent</a> · <a href="/sites">JSON site (loopback, semua PII)</a></p>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def form_page() -> str:
    return _FORM_HTML


@app.post("/generate")
async def generate_form(request: Request):
    form = await request.form()
    payload = {key: str(value).strip() for key, value in form.items()}
    if not payload.get("business_name") or not payload.get("whatsapp"):
        raise HTTPException(status_code=400, detail="business_name and whatsapp are required")
    try:
        manifest = generate_from_dict(payload)
        deploy = deploy_manifest(manifest)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    vercel = deploy.get("vercel") if isinstance(deploy, dict) else {}
    if wants_json(request):
        return JSONResponse(
            {
                "ok": True,
                "slug": manifest.slug,
                "preview": f"/preview/{manifest.slug}",
                "deploy": deploy,
                "vercel": vercel or {},
            }
        )
    return RedirectResponse(url=f"/preview/{manifest.slug}", status_code=303)


@app.post("/publish/{slug}")
def publish_site_route(slug: str):
    """Same as `python cli.py publish --slug`. Token/login must live on this wizard PC."""
    result = publish_slug(slug)
    return JSONResponse(result)


def wants_json(request: Request) -> bool:
    """Portal/Node send Accept: application/json or ?format=json. Browser form posts keep 303."""
    if (request.query_params.get("format") or "").strip().lower() == "json":
        return True
    accept = (request.headers.get("accept") or "").lower()
    return "application/json" in accept and "text/html" not in accept


def wants_html(request: Request) -> bool:
    """Simple Browser / Chrome send text/html; API clients usually send */* or application/json."""
    accept = (request.headers.get("accept") or "").lower()
    if "text/html" in accept:
        return True
    dest = (request.headers.get("sec-fetch-dest") or "").lower()
    return dest in {"document", "iframe"}


def wizard_error_html(title: str, message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
  <style>
    body {{ font-family: Inter, system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #4D4D4D; }}
    h1 {{ color: #263238; }}
  </style>
</head>
<body>
  <h1>{escape(title)}</h1>
  <p>{escape(message)}</p>
  <p><a href="/">Kembali ke form</a> · <a href="/preview/contoh-nexcent">Buka contoh</a></p>
</body>
</html>"""


@app.exception_handler(StarletteHTTPException)
async def browser_http_exception(request: Request, exc: StarletteHTTPException):
    """Avoid FastAPI JSON detail payloads in Simple Browser; they look like a crash."""
    if request.url.path.startswith("/upsell") or request.url.path.startswith("/publish") or not wants_html(request):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    if exc.status_code == 404:
        parts = request.url.path.rstrip("/").split("/")
        slug = parts[-1] if len(parts) >= 2 else ""
        if slug in {"preview", "sites", "generate", ""}:
            slug = "tidak-ditemukan"
        return HTMLResponse(preview_missing_html(slug), status_code=404)
    return HTMLResponse(wizard_error_html("Permintaan tidak bisa diproses", detail), status_code=exc.status_code)


@app.get("/sites")
def sites_list():
    """Operator dump on loopback only. Do not proxy via Caddy/Next."""
    return [m.model_dump(mode="json") for m in list_sites()]


@app.post("/sites/owned")
async def sites_owned(request: Request):
    """Filter by portal owner id/email. No WhatsApp. Does not list unowned folders."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    extra_raw = body.get("extra_owner_ids") or []
    extra = extra_raw if isinstance(extra_raw, list) else []
    rows = list_owned_sites(
        owner_id=str(body.get("owner_id") or ""),
        owner_kind=str(body.get("owner_kind") or ""),
        owner_email=str(body.get("owner_email") or ""),
        extra_owner_ids=[str(item) for item in extra],
    )
    return JSONResponse({"ok": True, "sites": rows})


@app.post("/sites/reassign")
async def sites_reassign(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    moved = reassign_guest_sites(
        from_guest_id=str(body.get("from_guest_id") or ""),
        to_account_id=str(body.get("to_account_id") or ""),
        to_email=str(body.get("to_email") or ""),
    )
    return JSONResponse({"ok": True, "slugs": moved})


@app.get("/sites/{slug}")
def site_detail(slug: str, request: Request):
    if slug in {"owned", "reassign"}:
        return JSONResponse(
            {"detail": "Use POST /sites/owned", "ok": False},
            status_code=405,
        )
    if wants_html(request):
        return RedirectResponse(url=f"/preview/{slug}", status_code=303)
    for manifest in list_sites():
        if manifest.slug == slug:
            deploy = deploy_manifest(manifest)
            return JSONResponse({"manifest": manifest.model_dump(mode="json"), "deploy": deploy})
    raise HTTPException(status_code=404, detail="Site not found")


def _manifest_links(items: list[SiteManifest]) -> str:
    if not items:
        return "<li><em>Tidak ada</em></li>"
    return "".join(
        f'<li><a href="/preview/{escape(m.slug)}">{escape(m.business_name)}</a> '
        f"(<code>{escape(m.slug)}</code>)</li>"
        for m in items
    )


def preview_missing_html(slug: str) -> str:
    catalog = preview_catalog()
    shown = escape(slug)
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview tidak ada — {shown}</title>
  <style>
    body {{ font-family: Inter, system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #4D4D4D; }}
    h1 {{ color: #263238; }}
    code {{ background: #F5F7FA; padding: .1rem .35rem; border-radius: 4px; }}
    .box {{ background: #FFF8E1; border: 1px solid #F9A825; border-radius: 8px; padding: 1rem; }}
  </style>
</head>
<body>
  <h1>Site tidak ada di komputer ini</h1>
  <div class="box">
    <p>Tidak ada folder <code>sites/{shown}/</code> pada mesin yang menjalankan wizard
    <code>127.0.0.1:3010</code>. Simple Browser Cursor memakai <strong>localhost PC Anda</strong>,
    bukan mesin agen cloud yang sempat generate.</p>
    <p>Kalau yang tampil JSON <code>{{"detail":"Site not found"}}</code>, proses di port 3010
    masih <strong>kode lama</strong> (belum di-restart). Hentikan Python di 3010, <code>git pull</code>,
    lalu <code>python cli.py serve</code> atau <code>START-PREVIEW.bat</code>.</p>
    <p>Demo yang ikut git ada di <code>sites/contoh-nexcent/</code> (wizard lama hanya baca
    folder <code>sites/</code>, bukan <code>examples/</code>).</p>
    <p>Daftar situs pelanggan <strong>bukan</strong> di halaman ini (PII). Buka Channel Portal
    <code>/situs</code> dengan cookie sesi yang sama saat generate.</p>
  </div>
  <h2>Yang bisa dilakukan</h2>
  <ol>
    <li>Isi <a href="/">form Generate</a> di wizard ini, lalu Anda diarahkan ke preview HTML.</li>
    <li>Atau buka contoh yang ikut git: <a href="/preview/contoh-nexcent">/preview/contoh-nexcent</a>.</li>
  </ol>
  <h2>Contoh di git</h2>
  <ul>{_manifest_links(catalog["examples"])}</ul>
</body>
</html>"""


def preview_index_html() -> str:
    catalog = preview_catalog()
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview Channel Starter</title>
  <style>
    body {{ font-family: Inter, system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #4D4D4D; }}
    h1 {{ color: #263238; }}
  </style>
</head>
<body>
  <h1>Preview di komputer ini</h1>
  <p><a href="/">Kembali ke form</a></p>
  <p>Hasil generate klien tidak di-daftar di sini (bukan katalog publik). Portal:
  <code>/situs</code> (sesi yang sama dengan generate). Preview slug:
  <code>/preview/{{slug}}</code>.</p>
  <h2>Contoh committed</h2>
  <ul>{_manifest_links(catalog["examples"])}</ul>
</body>
</html>"""


@app.get("/preview", response_class=HTMLResponse)
@app.get("/preview/", response_class=HTMLResponse)
def preview_list() -> str:
    return preview_index_html()


@app.get("/preview/{slug}", response_class=HTMLResponse)
def preview_site(slug: str):
    index = resolve_preview_index(slug)
    if index is None:
        return HTMLResponse(preview_missing_html(slug), status_code=404)
    return HTMLResponse(index.read_text(encoding="utf-8"))


@app.get("/upsell/status")
def upsell_status_route():
    return upsell_status()


@app.post("/upsell/{slug}/enable")
def upsell_enable_route(
    slug: str,
    tier: PricingTier = PricingTier.TEPI,
    create_job: bool | None = None,
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

    ensure_demo_site()
    uvicorn.run(app, host="127.0.0.1", port=SERVE_PORT)


if __name__ == "__main__":
    main()
