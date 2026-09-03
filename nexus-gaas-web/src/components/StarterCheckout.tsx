"use client";

import Link from "next/link";
import { useState } from "react";
import { KreditPanel } from "@/components/KreditPanel";
import { useKreditSession } from "@/hooks/useKreditSession";
import type { CheckoutPackage } from "@/lib/checkout";
import { KREDIT } from "@/lib/kredit";
import {
  DEFAULT_STARTER_THEME,
  EMPTY_STARTER_EXTRAS,
  applyFillSlotsToExtras,
  buildStarterGeneratePairs,
  categoryPresetSlots,
  fillCopySourceLabel,
  splitHeroLine,
  type StarterFillSlots,
  type StarterGenerateExtras,
} from "@/lib/starter-generate-payload";

const THEMES = [
  { id: "hijau", label: "Hijau", hex: "#4CAF4F" },
  { id: "biru", label: "Biru", hex: "#2194F3" },
  { id: "navy", label: "Navy", hex: "#263238" },
  { id: "hutan", label: "Hutan", hex: "#1B5E1F" },
] as const;

type OrderResult = {
  slug?: string | null;
  previewUrl?: string | null;
  subdomain?: string | null;
  balance?: number;
  orderId?: string;
  publishOk?: boolean;
  publishSkipped?: boolean;
  vercelUrl?: string | null;
  publishError?: string | null;
};

function slugFromRedirect(redirect: string | null | undefined): string | null {
  if (!redirect) return null;
  const match = redirect.match(/\/(?:preview|sites)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function slotsFromFillBody(fill: StarterFillSlots, category: string): StarterFillSlots {
  const fallback = categoryPresetSlots(category);
  const tagline = (fill.tagline ?? "").trim();
  const hero = (fill.hero ?? "").trim();
  const about = (fill.about_body ?? "").trim();
  if (!tagline && !hero && !about) {
    return fallback;
  }
  return {
    tagline: tagline || fallback.tagline,
    hero: hero || fallback.hero,
    about_body: about || fallback.about_body,
    cta_label: (fill.cta_label ?? "").trim() || fallback.cta_label,
    hours: (fill.hours ?? "").trim() || fallback.hours,
    description: (fill.description ?? "").trim() || fallback.description,
  };
}

export function StarterCheckout({ pkg }: { pkg: CheckoutPackage }) {
  const { kredit, setKredit, kreditError, busy, setBusy, requestTopup, isiKeran, submitProof, cancelTopup } =
    useKreditSession();
  const [formError, setFormError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("profil");
  const [whatsapp, setWhatsapp] = useState("");
  const [story, setStory] = useState("");
  const [later, setLater] = useState<StarterGenerateExtras>(EMPTY_STARTER_EXTRAS);
  const [heroDraft, setHeroDraft] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const [previewed, setPreviewed] = useState(false);
  const [fillBusy, setFillBusy] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  const patchLater = (patch: Partial<StarterGenerateExtras>) => {
    setLater((prev) => ({ ...prev, ...patch }));
  };

  const applyPreview = (fill: StarterFillSlots, usedFallback: boolean, error?: string) => {
    const slots = slotsFromFillBody(fill, category);
    setLater((prev) => applyFillSlotsToExtras(prev, slots));
    setHeroDraft((slots.hero ?? "").trim());
    setCopyHint(
      usedFallback ? error?.trim() || fillCopySourceLabel(true) : fillCopySourceLabel(false),
    );
    setPreviewed(true);
  };

  const handlePreview = async () => {
    setFormError("");
    setFillBusy(true);
    try {
      const fillRes = await fetch("/api/local-llm/fill-starter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessName,
          category,
          whatsapp,
          story,
        }),
      });
      if (fillRes.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/gate?next=${encodeURIComponent(next)}`);
        return;
      }
      const fill = (await fillRes.json()) as StarterFillSlots & {
        usedFallback?: boolean;
        error?: string;
      };
      applyPreview(fill, fill.usedFallback !== false, fill.error);
    } catch {
      applyPreview(categoryPresetSlots(category), true);
    } finally {
      setFillBusy(false);
    }
  };

  const handlePay = async () => {
    setFormError("");
    setBusy(true);
    const extras = {
      ...later,
      ...splitHeroLine(heroDraft),
    };
    const fd = new FormData();
    const pairs = buildStarterGeneratePairs({
      businessName,
      category,
      whatsapp,
      story,
      extras,
    });
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
        publishOk?: boolean;
        publishSkipped?: boolean;
        vercelUrl?: string | null;
        publishError?: string | null;
      };
      if (typeof data.balance === "number") {
        setKredit((prev) => ({
          balance: data.balance as number,
          mode: prev?.mode ?? "lab",
          kind: data.kind ?? prev?.kind,
          orderCode: data.orderCode ?? prev?.orderCode,
          email: data.email ?? prev?.email,
          pendingTopups: prev?.pendingTopups,
          faucetEnabled: prev?.faucetEnabled,
          proofWa: prev?.proofWa,
        }));
      }
      if (!res.ok || data.ok === false) {
        const raw = data.error || "";
        setFormError(
          res.status === 502 || /fetch failed|ECONNREFUSED|upstream/i.test(raw)
            ? "Channel Starter :3010 tidak hidup. Kredit di-refund. Nyalakan python cli.py serve di nexus-core/channel-starter."
            : raw || "Pesanan ditolak. Isi ulang Kredit (pending → operator approve) sampai saldo ≥ 20 Kr, lalu kirim lagi.",
        );
        return;
      }
      const slug = data.slug || slugFromRedirect(data.redirect);
      setResult({
        slug,
        previewUrl: data.previewUrl || (slug ? `/starter/preview/${slug}` : null),
        subdomain: data.subdomain || (slug ? `${slug}.nexus-lab.test` : null),
        balance: data.balance,
        orderId: data.orderId,
        publishOk: data.publishOk,
        publishSkipped: data.publishSkipped,
        vercelUrl: data.vercelUrl ?? null,
        publishError: data.publishError ?? null,
      });
    } catch {
      setFormError("Portal tidak menghubungi Channel Starter (:3010). Kredit tidak hang — generate gagal di-refund.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewed) {
      void handlePreview();
      return;
    }
    void handlePay();
  };

  const cukup = (kredit?.balance ?? 0) >= KREDIT.starterPriceKr;
  const blocked = busy || fillBusy;

  return (
    <>
      <Link href={pkg.segmentHref} className="order-back">
        ← Kembali ke paket
      </Link>
      <p className="hub-kicker">Langkah 4 · lihat teks dulu, baru bayar</p>
      <h1 className="order-title">{pkg.title}</h1>
      <p className="order-lead">{pkg.summary}</p>
      <p className="order-lead">
        Debit mesin = <strong>{KREDIT.starterPriceKr} Kr</strong> hanya pada tombol Bayar (fail-closed). 1 Kr = Rp 1.000.
        Isi Kredit di <Link href="/kredit">/kredit</Link> (pending + WhatsApp + bukti). Bukan WAF/Job, bukan Midtrans.
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
              Tamu cookie
              {kredit.orderCode ? (
                <>
                  {" "}
                  · <code>{kredit.orderCode}</code>
                </>
              ) : null}
              . <Link href="/daftar">Daftar</Link> opsional agar Kredit tidak hilang.
            </>
          ) : (
            <>
              Belum ada sesi — kembali ke <Link href="/gate">gerbang</Link> (Login / Daftar / Tamu).
            </>
          )}
        </p>
      </section>

      <KreditPanel
        kredit={kredit}
        kreditError={kreditError}
        busy={blocked}
        onRequestTopup={(amount) => void requestTopup(amount)}
        onLabFaucet={() => void isiKeran()}
        onSubmitProof={submitProof}
        onCancelTopup={(id) => void cancelTopup(id)}
      />

      {result ? (
        <div className="notion-callout notion-callout-blue">
          <div className="notion-callout-content">
            <p style={{ fontWeight: 700, marginBottom: 12 }}>Site dibuat — 20 Kredit terdebet</p>
            {copyHint ? (
              <p className="order-later-hint" role="status">
                {copyHint}
              </p>
            ) : null}
            <ol style={{ paddingLeft: 20, color: "var(--notion-text-muted)", fontSize: 14 }}>
              {result.subdomain && <li>Domain lab: {result.subdomain}</li>}
              <li>
                Saldo sekarang: {result.balance ?? kredit?.balance} {KREDIT.abbr}
              </li>
              {result.orderId && <li>Job generate {result.orderId.slice(0, 8)}…</li>}
              {kredit?.orderCode && <li>Kode sesi: {kredit.orderCode}</li>}
              {later.custom_domain && (
                <li>Domain kustom yang diisi: {later.custom_domain} (CNAME operator, bukan auto-DNS publik)</li>
              )}
              <li>
                Publish Vercel = folder situs saja di mesin wizard (
                <code>python cli.py publish --slug …</code>
                ). Token/login Vercel hanya di PC itu. Jangan Connect Git NEXUS-CYBER-FASE3 ke project warung. *.vercel.app
                bukan WAF / Edge Shield.
              </li>
              <li>
                {result.publishOk && result.vercelUrl ? (
                  <>
                    Vercel:{" "}
                    <a href={result.vercelUrl} rel="noreferrer" target="_blank">
                      {result.vercelUrl}
                    </a>
                  </>
                ) : (
                  <>
                    {result.publishError || "publish gagal: set token di mesin wizard"}
                    {result.slug ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="notion-button"
                          disabled={blocked}
                          onClick={() => {
                            const slug = result.slug;
                            if (!slug) return;
                            setBusy(true);
                            void fetch("/api/channel-starter/publish", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ slug }),
                            })
                              .then(async (pubRes) => {
                                const pub = (await pubRes.json()) as OrderResult & { ok?: boolean };
                                setResult((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        publishOk: pub.publishOk,
                                        publishSkipped: pub.publishSkipped,
                                        vercelUrl: pub.vercelUrl ?? null,
                                        publishError: pub.publishError ?? null,
                                      }
                                    : prev,
                                );
                              })
                              .catch(() => {
                                setResult((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        publishOk: false,
                                        publishError: "publish gagal: Channel Starter :3010 tidak merespons",
                                      }
                                    : prev,
                                );
                              })
                              .finally(() => setBusy(false));
                          }}
                        >
                          Coba publish lagi
                        </button>
                      </>
                    ) : null}
                  </>
                )}
              </li>
              <li>Header tepi (nosniff / frame / CSP) di Caddy. Wasit Job = upsell. Starter 20 Kr ≠ Edge Shield.</li>
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
            <button
              type="button"
              className="notion-button"
              style={{ marginTop: 16 }}
              onClick={() => {
                setResult(null);
                setBusinessName("");
                setWhatsapp("");
                setStory("");
                setCopyHint("");
                setHeroDraft("");
                setPreviewed(false);
                setLater({ ...EMPTY_STARTER_EXTRAS });
              }}
            >
              Buat site lain
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
            <label htmlFor="order-wa">WhatsApp usaha (tampil di site, bukan bayar)</label>
            <input
              id="order-wa"
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
            <label htmlFor="order-cat">Kategori</label>
            <select id="order-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="fnb">Kuliner / F&amp;B</option>
              <option value="jasa">Jasa</option>
              <option value="profil">Profil UMKM</option>
            </select>
            <label htmlFor="order-story">Cerita usaha (opsional, 2–5 kalimat)</label>
            <textarea
              id="order-story"
              rows={4}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Kosong = template kategori. Isi singkat: model lokal di PC mengisi hero/tagline/tentang (bukan NEX-AI WAF)."
            />
          </fieldset>

          {previewed ? (
            <fieldset className="order-preview-copy">
              <legend>Teks situs — boleh diubah</legend>
              {copyHint ? (
                <p className="order-later-hint" role="status">
                  {copyHint}
                </p>
              ) : null}
              <label htmlFor="order-tag">Tagline</label>
              <input
                id="order-tag"
                value={later.tagline}
                onChange={(e) => patchLater({ tagline: e.target.value })}
              />
              <label htmlFor="order-hero">Hero</label>
              <textarea
                id="order-hero"
                rows={2}
                value={heroDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setHeroDraft(value);
                  patchLater(splitHeroLine(value));
                }}
              />
              <label htmlFor="order-ab">Tentang</label>
              <textarea
                id="order-ab"
                rows={4}
                value={later.about_body}
                onChange={(e) => patchLater({ about_body: e.target.value })}
              />
            </fieldset>
          ) : null}

          <details className="notion-toggle order-later">
            <summary className="notion-toggle-summary">Lengkapi nanti</summary>
            <div className="notion-toggle-content">
              <p className="order-later-hint">
                Tidak wajib. Kosong = palet {DEFAULT_STARTER_THEME}, jam/CTA/teks dari kategori. Bukan WhatsApp paket.
              </p>
              <label htmlFor="order-addr">Alamat</label>
              <input
                id="order-addr"
                value={later.address}
                onChange={(e) => patchLater({ address: e.target.value })}
                placeholder="Jl. Contoh No. 1"
              />
              <label htmlFor="order-email">Email</label>
              <input
                id="order-email"
                type="email"
                value={later.email}
                onChange={(e) => patchLater({ email: e.target.value })}
              />
              <label htmlFor="order-hours">Jam operasional</label>
              <input
                id="order-hours"
                value={later.hours}
                onChange={(e) => patchLater({ hours: e.target.value })}
                placeholder="Kosong = jam preset kategori"
              />
              <label htmlFor="order-ig">Instagram</label>
              <input
                id="order-ig"
                value={later.instagram}
                onChange={(e) => patchLater({ instagram: e.target.value })}
                placeholder="tanpa @"
              />

              <p className="order-later-sub">Warna (default Hijau)</p>
              <div className="theme-grid" role="radiogroup" aria-label="Palet warna">
                {THEMES.map((item) => (
                  <label key={item.id} className={`theme-chip${later.theme === item.id ? " is-on" : ""}`}>
                    <input
                      type="radio"
                      value={item.id}
                      checked={later.theme === item.id}
                      onChange={() => patchLater({ theme: item.id })}
                    />
                    <span className="theme-swatch" style={{ background: item.hex }} />
                    {item.label}
                  </label>
                ))}
              </div>

              <label htmlFor="order-h">Judul hero</label>
              <input
                id="order-h"
                value={later.headline}
                onChange={(e) => {
                  patchLater({ headline: e.target.value });
                  setHeroDraft(`${e.target.value} ${later.headline_accent}`.trim());
                }}
                placeholder="Kosong = cerita atau preset kategori"
              />
              <label htmlFor="order-ha">Kata aksen (berwarna)</label>
              <input
                id="order-ha"
                value={later.headline_accent}
                onChange={(e) => {
                  patchLater({ headline_accent: e.target.value });
                  setHeroDraft(`${later.headline} ${e.target.value}`.trim());
                }}
              />
              <label htmlFor="order-desc">Deskripsi</label>
              <textarea
                id="order-desc"
                rows={3}
                value={later.description}
                onChange={(e) => patchLater({ description: e.target.value })}
              />
              <label htmlFor="order-at">Judul tentang</label>
              <input
                id="order-at"
                value={later.about_title}
                onChange={(e) => patchLater({ about_title: e.target.value })}
              />
              <label htmlFor="order-et">Judul blok tambahan</label>
              <input
                id="order-et"
                value={later.extra_title}
                onChange={(e) => patchLater({ extra_title: e.target.value })}
              />
              <label htmlFor="order-eb">Isi blok tambahan</label>
              <textarea
                id="order-eb"
                rows={3}
                value={later.extra_body}
                onChange={(e) => patchLater({ extra_body: e.target.value })}
              />
              <label htmlFor="order-cta">Teks tombol</label>
              <input
                id="order-cta"
                value={later.cta_label}
                onChange={(e) => patchLater({ cta_label: e.target.value })}
                placeholder="Kosong = CTA kategori"
              />

              <p className="order-later-sub">Tiga layanan</p>
              <input
                value={later.offering_1_title}
                onChange={(e) => patchLater({ offering_1_title: e.target.value })}
                placeholder="Layanan 1 — judul"
              />
              <textarea
                rows={2}
                value={later.offering_1_body}
                onChange={(e) => patchLater({ offering_1_body: e.target.value })}
                placeholder="Isi"
              />
              <input
                value={later.offering_2_title}
                onChange={(e) => patchLater({ offering_2_title: e.target.value })}
                placeholder="Layanan 2 — judul"
              />
              <textarea
                rows={2}
                value={later.offering_2_body}
                onChange={(e) => patchLater({ offering_2_body: e.target.value })}
                placeholder="Isi"
              />
              <input
                value={later.offering_3_title}
                onChange={(e) => patchLater({ offering_3_title: e.target.value })}
                placeholder="Layanan 3 — judul"
              />
              <textarea
                rows={2}
                value={later.offering_3_body}
                onChange={(e) => patchLater({ offering_3_body: e.target.value })}
                placeholder="Isi"
              />

              <p className="order-later-sub">Angka usaha</p>
              <div className="stat-grid">
                <input
                  value={later.stat_1_number}
                  onChange={(e) => patchLater({ stat_1_number: e.target.value })}
                  placeholder="100+"
                />
                <input
                  value={later.stat_1_label}
                  onChange={(e) => patchLater({ stat_1_label: e.target.value })}
                  placeholder="Porsi / minggu"
                />
                <input
                  value={later.stat_2_number}
                  onChange={(e) => patchLater({ stat_2_number: e.target.value })}
                  placeholder="Angka 2"
                />
                <input
                  value={later.stat_2_label}
                  onChange={(e) => patchLater({ stat_2_label: e.target.value })}
                  placeholder="Label 2"
                />
                <input
                  value={later.stat_3_number}
                  onChange={(e) => patchLater({ stat_3_number: e.target.value })}
                  placeholder="Angka 3"
                />
                <input
                  value={later.stat_3_label}
                  onChange={(e) => patchLater({ stat_3_label: e.target.value })}
                  placeholder="Label 3"
                />
                <input
                  value={later.stat_4_number}
                  onChange={(e) => patchLater({ stat_4_number: e.target.value })}
                  placeholder="Angka 4"
                />
                <input
                  value={later.stat_4_label}
                  onChange={(e) => patchLater({ stat_4_label: e.target.value })}
                  placeholder="Label 4"
                />
              </div>

              <p className="order-later-sub">Foto (URL https)</p>
              <input
                value={later.logo_url}
                onChange={(e) => patchLater({ logo_url: e.target.value })}
                placeholder="Logo https://"
              />
              <input
                value={later.hero_image_url}
                onChange={(e) => patchLater({ hero_image_url: e.target.value })}
                placeholder="Foto hero https://"
              />
              <input
                value={later.gallery_1_url}
                onChange={(e) => patchLater({ gallery_1_url: e.target.value })}
                placeholder="Galeri 1 URL"
              />
              <input
                value={later.gallery_1_title}
                onChange={(e) => patchLater({ gallery_1_title: e.target.value })}
                placeholder="Galeri 1 judul"
              />
              <input
                value={later.gallery_1_caption}
                onChange={(e) => patchLater({ gallery_1_caption: e.target.value })}
                placeholder="Galeri 1 keterangan"
              />
              <input
                value={later.gallery_2_url}
                onChange={(e) => patchLater({ gallery_2_url: e.target.value })}
                placeholder="Galeri 2 URL"
              />
              <input
                value={later.gallery_2_title}
                onChange={(e) => patchLater({ gallery_2_title: e.target.value })}
                placeholder="Galeri 2 judul"
              />
              <input
                value={later.gallery_2_caption}
                onChange={(e) => patchLater({ gallery_2_caption: e.target.value })}
                placeholder="Galeri 2 keterangan"
              />
              <input
                value={later.gallery_3_url}
                onChange={(e) => patchLater({ gallery_3_url: e.target.value })}
                placeholder="Galeri 3 URL"
              />
              <input
                value={later.gallery_3_title}
                onChange={(e) => patchLater({ gallery_3_title: e.target.value })}
                placeholder="Galeri 3 judul"
              />
              <input
                value={later.gallery_3_caption}
                onChange={(e) => patchLater({ gallery_3_caption: e.target.value })}
                placeholder="Galeri 3 keterangan"
              />

              <p className="order-later-sub">Testimoni, mitra, domain</p>
              <textarea
                rows={2}
                value={later.quote}
                onChange={(e) => patchLater({ quote: e.target.value })}
                placeholder="Kutipan pelanggan"
              />
              <input
                value={later.quote_name}
                onChange={(e) => patchLater({ quote_name: e.target.value })}
                placeholder="Nama"
              />
              <input
                value={later.quote_role}
                onChange={(e) => patchLater({ quote_role: e.target.value })}
                placeholder="Peran"
              />
              <input
                value={later.partners}
                onChange={(e) => patchLater({ partners: e.target.value })}
                placeholder="Mitra (pisah koma)"
              />
              <input
                value={later.custom_domain}
                onChange={(e) => patchLater({ custom_domain: e.target.value })}
                placeholder="tokoanda.com — CNAME menyusul, bukan auto"
              />
            </div>
          </details>

          {formError && (
            <p className="kredit-error" role="alert">
              {formError}
            </p>
          )}
          {!cukup && kredit != null && (
            <p className="kredit-warn">
              Perlu {KREDIT.starterPriceKr} Kredit. Ajukan isi ulang di panel (bukan keran gratis), atau pesanan akan
              ditolak.
            </p>
          )}
          <div className="order-actions">
            <button
              type={previewed ? "button" : "submit"}
              className={previewed ? "notion-button order-submit" : "notion-button notion-button-primary order-submit"}
              disabled={blocked}
              onClick={previewed ? () => void handlePreview() : undefined}
            >
              {fillBusy ? "Menyusun teks…" : "Lihat teks"}
            </button>
            {previewed ? (
              <button type="submit" className="notion-button notion-button-primary order-submit" disabled={blocked}>
                {busy ? "Memproses…" : `Bayar ${KREDIT.starterPriceKr} Kredit & buat site`}
              </button>
            ) : null}
          </div>
        </form>
      )}
    </>
  );
}
