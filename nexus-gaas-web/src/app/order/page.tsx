"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Navbar, WaCta } from "@/components/Navbar";
import { KREDIT, starterPriceIdr } from "@/lib/kredit";
import { whatsappPackageUrl } from "@/lib/portal-config";

const THEMES = [
  { id: "hijau", label: "Hijau", hex: "#4CAF4F" },
  { id: "biru", label: "Biru", hex: "#2194F3" },
  { id: "navy", label: "Navy", hex: "#263238" },
  { id: "hutan", label: "Hutan", hex: "#1B5E1F" },
] as const;

type KreditState = {
  balance: number;
  mode: "lab" | "live";
  kind?: "guest" | "account" | null;
  orderCode?: string | null;
  email?: string | null;
};

type OrderResult = {
  slug?: string | null;
  previewUrl?: string | null;
  subdomain?: string | null;
  balance?: number;
  orderId?: string;
};

function slugFromRedirect(redirect: string | null | undefined): string | null {
  if (!redirect) return null;
  const match = redirect.match(/\/(?:preview|sites)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export default function OrderPage() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("profil");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState("");
  const [instagram, setInstagram] = useState("");
  const [theme, setTheme] = useState("hijau");
  const [headline, setHeadline] = useState("");
  const [headlineAccent, setHeadlineAccent] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutBody, setAboutBody] = useState("");
  const [extraTitle, setExtraTitle] = useState("");
  const [extraBody, setExtraBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [offering1Title, setOffering1Title] = useState("");
  const [offering1Body, setOffering1Body] = useState("");
  const [offering2Title, setOffering2Title] = useState("");
  const [offering2Body, setOffering2Body] = useState("");
  const [offering3Title, setOffering3Title] = useState("");
  const [offering3Body, setOffering3Body] = useState("");
  const [stat1Number, setStat1Number] = useState("");
  const [stat1Label, setStat1Label] = useState("");
  const [stat2Number, setStat2Number] = useState("");
  const [stat2Label, setStat2Label] = useState("");
  const [stat3Number, setStat3Number] = useState("");
  const [stat3Label, setStat3Label] = useState("");
  const [stat4Number, setStat4Number] = useState("");
  const [stat4Label, setStat4Label] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [gallery1Url, setGallery1Url] = useState("");
  const [gallery1Title, setGallery1Title] = useState("");
  const [gallery1Caption, setGallery1Caption] = useState("");
  const [gallery2Url, setGallery2Url] = useState("");
  const [gallery2Title, setGallery2Title] = useState("");
  const [gallery2Caption, setGallery2Caption] = useState("");
  const [gallery3Url, setGallery3Url] = useState("");
  const [gallery3Title, setGallery3Title] = useState("");
  const [gallery3Caption, setGallery3Caption] = useState("");
  const [quote, setQuote] = useState("");
  const [quoteName, setQuoteName] = useState("");
  const [quoteRole, setQuoteRole] = useState("");
  const [partners, setPartners] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [kredit, setKredit] = useState<KreditState | null>(null);
  const [kreditError, setKreditError] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  const loadKredit = useCallback(async () => {
    try {
      const res = await fetch("/api/kredit");
      const data = (await res.json()) as KreditState & {
        ok?: boolean;
        error?: string;
        kind?: "guest" | "account" | null;
        orderCode?: string | null;
        email?: string | null;
      };
      if (!res.ok || data.ok === false) {
        setKreditError(data.error || "Ledger Kredit tidak terbaca");
        return;
      }
      setKredit({
        balance: data.balance,
        mode: data.mode,
        kind: data.kind,
        orderCode: data.orderCode,
        email: data.email,
      });
      setKreditError("");
    } catch {
      setKreditError("Ledger Kredit tidak terbaca");
    }
  }, []);

  useEffect(() => {
    void loadKredit();
  }, [loadKredit]);

  const isiKeran = async () => {
    setBusy(true);
    setFormError("");
    try {
      const res = await fetch("/api/kredit/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: KREDIT.faucetAmountKr }),
      });
      const data = (await res.json()) as KreditState & { error?: string };
      if (!res.ok) {
        setFormError(data.error || "Keran gagal");
        return;
      }
      setKredit({
        balance: data.balance,
        mode: data.mode,
        kind: data.kind,
        orderCode: data.orderCode,
        email: data.email,
      });
    } catch {
      setFormError("Keran gagal");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const fd = new FormData();
    const pairs: [string, string][] = [
      ["business_name", businessName],
      ["category", category],
      ["whatsapp", whatsapp],
      ["address", address],
      ["email", email],
      ["hours", hours],
      ["instagram", instagram],
      ["theme", theme],
      ["headline", headline],
      ["headline_accent", headlineAccent],
      ["tagline", tagline],
      ["description", description],
      ["about_title", aboutTitle],
      ["about_body", aboutBody],
      ["extra_title", extraTitle],
      ["extra_body", extraBody],
      ["cta_label", ctaLabel],
      ["offering_1_title", offering1Title],
      ["offering_1_body", offering1Body],
      ["offering_2_title", offering2Title],
      ["offering_2_body", offering2Body],
      ["offering_3_title", offering3Title],
      ["offering_3_body", offering3Body],
      ["stat_1_number", stat1Number],
      ["stat_1_label", stat1Label],
      ["stat_2_number", stat2Number],
      ["stat_2_label", stat2Label],
      ["stat_3_number", stat3Number],
      ["stat_3_label", stat3Label],
      ["stat_4_number", stat4Number],
      ["stat_4_label", stat4Label],
      ["logo_url", logoUrl],
      ["hero_image_url", heroImageUrl],
      ["gallery_1_url", gallery1Url],
      ["gallery_1_title", gallery1Title],
      ["gallery_1_caption", gallery1Caption],
      ["gallery_2_url", gallery2Url],
      ["gallery_2_title", gallery2Title],
      ["gallery_2_caption", gallery2Caption],
      ["gallery_3_url", gallery3Url],
      ["gallery_3_title", gallery3Title],
      ["gallery_3_caption", gallery3Caption],
      ["quote", quote],
      ["quote_name", quoteName],
      ["quote_role", quoteRole],
      ["partners", partners],
      ["custom_domain", customDomain],
      ["tier", "starter"],
    ];
    for (const [key, value] of pairs) {
      fd.set(key, value);
    }
    try {
      const res = await fetch("/api/channel-starter/generate", { method: "POST", body: fd });
      const data = (await res.json()) as OrderResult & {
        ok?: boolean;
        error?: string;
        redirect?: string | null;
        balance?: number;
        kind?: "guest" | "account" | null;
        orderCode?: string | null;
        email?: string | null;
      };
      if (typeof data.balance === "number") {
        setKredit((prev) => ({
          balance: data.balance as number,
          mode: prev?.mode ?? "lab",
          kind: data.kind ?? prev?.kind,
          orderCode: data.orderCode ?? prev?.orderCode,
          email: data.email ?? prev?.email,
        }));
      }
      if (!res.ok || data.ok === false) {
        setFormError(data.error || "Pesanan ditolak. Isi keran lab atau lanjut konfirmasi WA.");
        return;
      }
      const slug = data.slug || slugFromRedirect(data.redirect);
      setResult({
        slug,
        previewUrl: data.previewUrl || (slug ? `http://127.0.0.1:3010/preview/${slug}` : null),
        subdomain: data.subdomain || (slug ? `${slug}.nexus-lab.test` : null),
        balance: data.balance,
        orderId: data.orderId,
      });
    } catch {
      setFormError("Portal tidak menghubungi Channel Starter. Site bisa digenerate operator setelah isi Kredit.");
    } finally {
      setBusy(false);
    }
  };

  const cukup = (kredit?.balance ?? 0) >= KREDIT.starterPriceKr;
  const hargaIdr = starterPriceIdr().toLocaleString("id-ID");

  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main">
        <Link href="/" className="order-back">
          ← Kembali
        </Link>
        <h1 className="order-title">Form pesanan Channel Starter</h1>
        <p className="order-lead">
          Paket Starter = <strong>{KREDIT.starterPriceKr} Kredit</strong> (setara Rp {hargaIdr}/bulan): template
          Nexcent, 4 warna, domain lab <code>{`{slug}.nexus-lab.test`}</code>, berkas Vercel, header tepi Nexus. Lab
          memakai Kredit (keran) — bukan Midtrans atau PSP lain. Job Cowork bukan paket ini. Top-up IDR produksi:
          QRIS atau VA bank milik Nexus + bukti transfer + approve operator (belum di halaman ini). WhatsApp = chat,
          bukan gateway bayar. Pagar Starter = header tepi (nosniff / frame / CSP), bukan WAF Reflex dan bukan Job.
          Pagar tipis (35rb, upsell <code>--tier tepi</code>) = Reflex judi/deface di WAF 1 host lab — bukan debit 20
          Kredit, bukan pulih Vercel, bukan <code>*.vercel.app</code> langsung.
        </p>

        <section className="auth-order-strip" aria-label="Akun pelanggan">
          <p>
            {kredit?.kind === "account" ? (
              <>
                Akun <strong>{kredit.email}</strong>
                {kredit.orderCode ? (
                  <>
                    {" "}
                    · kode <code>{kredit.orderCode}</code>
                  </>
                ) : null}
              </>
            ) : kredit?.kind === "guest" ? (
              <>
                Sesi <strong>tamu</strong>
                {kredit.orderCode ? (
                  <>
                    {" "}
                    · kode <code>{kredit.orderCode}</code>
                  </>
                ) : null}{" "}
                — cookie di browser ini. Ganti HP atau hapus cookie = saldo tamu hilang.{" "}
                <Link href="/daftar">Daftar</Link> untuk simpan akun (Kredit tamu ikut).
              </>
            ) : (
              <>
                Boleh telusur tanpa daftar. Keran dan generate memakai sesi tamu otomatis.{" "}
                <Link href="/masuk">Masuk</Link> · <Link href="/daftar">Daftar</Link> · uji tanpa daftar di halaman ini.
              </>
            )}
          </p>
        </section>

        <section className="kredit-panel" aria-label="Saldo Kredit">
          <img src="/brand/nexus-kredit.svg" alt="" width={56} height={56} className="kredit-panel-mark" />
          <div className="kredit-panel-copy">
            <p className="kredit-panel-label">Kredit</p>
            <p className="kredit-panel-balance">{kredit == null ? "…" : `${kredit.balance} ${KREDIT.abbr}`}</p>
            <p className="kredit-panel-hint">
              1 {KREDIT.abbr} = Rp {KREDIT.idrPerKredit.toLocaleString("id-ID")}
              {kredit?.mode === "lab" ? " · keran lab" : ""}
              {kredit?.orderCode ? ` · ${kredit.orderCode}` : ""}
            </p>
          </div>
          {kredit?.mode !== "live" && (
            <button type="button" className="notion-button" onClick={() => void isiKeran()} disabled={busy}>
              Isi {KREDIT.faucetAmountKr} Kredit
            </button>
          )}
        </section>
        {kreditError && (
          <p className="kredit-error" role="alert">
            {kreditError}
          </p>
        )}

        {result ? (
          <div className="notion-callout notion-callout-blue">
            <div className="notion-callout-content">
              <p style={{ fontWeight: 700, marginBottom: 12 }}>Site dibuat — 20 Kredit terdebet</p>
              <ol style={{ paddingLeft: 20, color: "var(--notion-text-muted)", fontSize: 14 }}>
                {result.subdomain && <li>Domain lab: {result.subdomain}</li>}
                <li>
                  Saldo sekarang: {result.balance ?? kredit?.balance} {KREDIT.abbr}
                </li>
                {result.orderId && <li>Job generate {result.orderId.slice(0, 8)}…</li>}
                {kredit?.orderCode && <li>Kode TF / WA: {kredit.orderCode}</li>}
                {customDomain && (
                  <li>Domain kustom yang diisi: {customDomain} (CNAME operator, bukan auto-DNS publik)</li>
                )}
                <li>
                  Jika wizard punya sesi Vercel, generate men-deploy folder situs ke project Vercel bernama slug (bukan
                  git monorepo Nexus). *.vercel.app bukan WAF.
                </li>
                <li>Header tepi (nosniff / frame / CSP) di Caddy. Wasit Job = upsell.</li>
              </ol>
              {formError && (
                <p className="kredit-error" role="alert">
                  {formError}
                </p>
              )}
              {result.previewUrl ? (
                <p style={{ marginTop: 16 }}>
                  <a href={result.previewUrl} className="notion-button notion-button-primary">
                    Buka preview
                  </a>
                </p>
              ) : (
                <p style={{ marginTop: 12, fontSize: 14, color: "var(--notion-text-muted)" }}>
                  Site tersimpan di Channel Starter. Nyalakan <code>python cli.py serve</code> untuk preview.
                </p>
              )}
              <div style={{ marginTop: 20 }}>
                <WaCta
                  label="Konfirmasi via WhatsApp"
                  href={whatsappPackageUrl(
                    `Starter — ${businessName}${kredit?.orderCode ? ` — ${kredit.orderCode}` : ""}`,
                  )}
                  primary
                />
              </div>
              <button
                type="button"
                className="notion-button"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setResult(null);
                  setBusinessName("");
                  setWhatsapp("");
                }}
              >
                Pesan site lain
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="notion-database order-form">
            <fieldset>
              <legend>Usaha</legend>
              <label htmlFor="order-name">Nama usaha</label>
              <input
                id="order-name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Warung Bu Siti"
              />
              <label htmlFor="order-cat">Kategori</label>
              <select id="order-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="fnb">Kuliner / F&amp;B</option>
                <option value="jasa">Jasa</option>
                <option value="profil">Profil UMKM</option>
              </select>
              <label htmlFor="order-wa">WhatsApp</label>
              <input
                id="order-wa"
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
              <label htmlFor="order-addr">Alamat</label>
              <input
                id="order-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Contoh No. 1"
              />
              <label htmlFor="order-email">Email</label>
              <input id="order-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label htmlFor="order-hours">Jam operasional</label>
              <input
                id="order-hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Setiap hari 09.00–21.00"
              />
              <label htmlFor="order-ig">Instagram</label>
              <input
                id="order-ig"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="tanpa @"
              />
            </fieldset>

            <fieldset>
              <legend>Warna (4 palet Figma)</legend>
              <div className="theme-grid" role="radiogroup" aria-label="Palet warna">
                {THEMES.map((item) => (
                  <label key={item.id} className={`theme-chip${theme === item.id ? " is-on" : ""}`}>
                    <input
                      type="radio"
                      value={item.id}
                      checked={theme === item.id}
                      onChange={() => setTheme(item.id)}
                    />
                    <span className="theme-swatch" style={{ background: item.hex }} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Teks halaman</legend>
              <label htmlFor="order-h">Judul hero</label>
              <input
                id="order-h"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Kosong = teks preset kategori"
              />
              <label htmlFor="order-ha">Kata aksen (berwarna)</label>
              <input id="order-ha" value={headlineAccent} onChange={(e) => setHeadlineAccent(e.target.value)} />
              <label htmlFor="order-tag">Tagline</label>
              <input id="order-tag" value={tagline} onChange={(e) => setTagline(e.target.value)} />
              <label htmlFor="order-desc">Deskripsi</label>
              <textarea id="order-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              <label htmlFor="order-at">Judul tentang</label>
              <input id="order-at" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} />
              <label htmlFor="order-ab">Isi tentang</label>
              <textarea id="order-ab" rows={3} value={aboutBody} onChange={(e) => setAboutBody(e.target.value)} />
              <label htmlFor="order-et">Judul blok tambahan</label>
              <input id="order-et" value={extraTitle} onChange={(e) => setExtraTitle(e.target.value)} />
              <label htmlFor="order-eb">Isi blok tambahan</label>
              <textarea id="order-eb" rows={3} value={extraBody} onChange={(e) => setExtraBody(e.target.value)} />
              <label htmlFor="order-cta">Teks tombol</label>
              <input
                id="order-cta"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Pesan via WhatsApp"
              />
            </fieldset>

            <fieldset>
              <legend>Tiga layanan</legend>
              <label>Layanan 1</label>
              <input value={offering1Title} onChange={(e) => setOffering1Title(e.target.value)} placeholder="Judul" />
              <textarea rows={2} value={offering1Body} onChange={(e) => setOffering1Body(e.target.value)} placeholder="Isi" />
              <label>Layanan 2</label>
              <input value={offering2Title} onChange={(e) => setOffering2Title(e.target.value)} placeholder="Judul" />
              <textarea rows={2} value={offering2Body} onChange={(e) => setOffering2Body(e.target.value)} placeholder="Isi" />
              <label>Layanan 3</label>
              <input value={offering3Title} onChange={(e) => setOffering3Title(e.target.value)} placeholder="Judul" />
              <textarea rows={2} value={offering3Body} onChange={(e) => setOffering3Body(e.target.value)} placeholder="Isi" />
            </fieldset>

            <fieldset>
              <legend>Angka usaha</legend>
              <div className="stat-grid">
                <input value={stat1Number} onChange={(e) => setStat1Number(e.target.value)} placeholder="100+" />
                <input value={stat1Label} onChange={(e) => setStat1Label(e.target.value)} placeholder="Porsi / minggu" />
                <input value={stat2Number} onChange={(e) => setStat2Number(e.target.value)} placeholder="Angka 2" />
                <input value={stat2Label} onChange={(e) => setStat2Label(e.target.value)} placeholder="Label 2" />
                <input value={stat3Number} onChange={(e) => setStat3Number(e.target.value)} placeholder="Angka 3" />
                <input value={stat3Label} onChange={(e) => setStat3Label(e.target.value)} placeholder="Label 3" />
                <input value={stat4Number} onChange={(e) => setStat4Number(e.target.value)} placeholder="Angka 4" />
                <input value={stat4Label} onChange={(e) => setStat4Label(e.target.value)} placeholder="Label 4" />
              </div>
            </fieldset>

            <fieldset>
              <legend>Foto (URL https)</legend>
              <label>Logo</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://" />
              <label>Foto hero</label>
              <input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} placeholder="https://" />
              <label>Galeri 1</label>
              <input value={gallery1Url} onChange={(e) => setGallery1Url(e.target.value)} placeholder="URL" />
              <input value={gallery1Title} onChange={(e) => setGallery1Title(e.target.value)} placeholder="Judul" />
              <input value={gallery1Caption} onChange={(e) => setGallery1Caption(e.target.value)} placeholder="Keterangan" />
              <label>Galeri 2</label>
              <input value={gallery2Url} onChange={(e) => setGallery2Url(e.target.value)} placeholder="URL" />
              <input value={gallery2Title} onChange={(e) => setGallery2Title(e.target.value)} placeholder="Judul" />
              <input value={gallery2Caption} onChange={(e) => setGallery2Caption(e.target.value)} placeholder="Keterangan" />
              <label>Galeri 3</label>
              <input value={gallery3Url} onChange={(e) => setGallery3Url(e.target.value)} placeholder="URL" />
              <input value={gallery3Title} onChange={(e) => setGallery3Title(e.target.value)} placeholder="Judul" />
              <input value={gallery3Caption} onChange={(e) => setGallery3Caption(e.target.value)} placeholder="Keterangan" />
            </fieldset>

            <fieldset>
              <legend>Testimoni, mitra, domain</legend>
              <label>Kutipan pelanggan</label>
              <textarea rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} />
              <label>Nama</label>
              <input value={quoteName} onChange={(e) => setQuoteName(e.target.value)} />
              <label>Peran</label>
              <input value={quoteRole} onChange={(e) => setQuoteRole(e.target.value)} />
              <label>Mitra (pisah koma)</label>
              <input value={partners} onChange={(e) => setPartners(e.target.value)} />
              <label>Domain kustom (opsional)</label>
              <input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="tokoanda.com — CNAME menyusul, bukan auto"
              />
            </fieldset>

            {formError && (
              <p className="kredit-error" role="alert">
                {formError}
              </p>
            )}
            {!cukup && kredit != null && (
              <p className="kredit-warn">
                Perlu {KREDIT.starterPriceKr} Kredit. Isi keran lab dulu, atau pesanan akan ditolak.
              </p>
            )}
            <button type="submit" className="notion-button notion-button-primary order-submit" disabled={busy}>
              {busy ? "Memproses…" : `Bayar ${KREDIT.starterPriceKr} Kredit & buat site`}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
