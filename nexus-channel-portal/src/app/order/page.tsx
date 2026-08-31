"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { KREDIT, starterPriceIdr } from "@/lib/kredit";

type KreditState = {
  balance: number;
  mode: "lab" | "live";
};

type OrderResult = {
  slug?: string | null;
  previewUrl?: string | null;
  subdomain?: string | null;
  balance?: number;
  orderId?: string;
};

export default function OrderPage() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("profil");
  const [whatsapp, setWhatsapp] = useState("");
  const [kredit, setKredit] = useState<KreditState | null>(null);
  const [kreditError, setKreditError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  const loadKredit = useCallback(async () => {
    try {
      const res = await fetch("/api/kredit");
      const data = (await res.json()) as KreditState & { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setKreditError(data.error || "Ledger Kredit tidak terbaca");
        return;
      }
      setKredit({ balance: data.balance, mode: data.mode });
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
      setKredit({ balance: data.balance, mode: data.mode });
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
    fd.set("business_name", businessName);
    fd.set("category", category);
    fd.set("whatsapp", whatsapp);
    fd.set("tier", "starter");
    try {
      const res = await fetch("/api/channel-starter/generate", { method: "POST", body: fd });
      const data = (await res.json()) as OrderResult & {
        ok?: boolean;
        error?: string;
        balance?: number;
      };
      if (typeof data.balance === "number") {
        setKredit((prev) => ({ balance: data.balance as number, mode: prev?.mode ?? "lab" }));
      }
      if (!res.ok || data.ok === false) {
        setFormError(data.error || "Pesanan ditolak");
        return;
      }
      setResult({
        slug: data.slug,
        previewUrl: data.previewUrl,
        subdomain: data.subdomain,
        balance: data.balance,
        orderId: data.orderId,
      });
    } catch {
      setFormError("Portal tidak bisa menghubungi Channel Starter");
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
          Paket Starter = <strong>{KREDIT.starterPriceKr} Kredit</strong> (setara Rp {hargaIdr}/bulan). Lab memakai
          Kredit, bukan transfer bank. Job Cowork tidak dijual di halaman ini.
        </p>

        <section className="kredit-panel" aria-label="Saldo Kredit">
          <img src="/brand/nexus-kredit.svg" alt="" width={56} height={56} className="kredit-panel-mark" />
          <div className="kredit-panel-copy">
            <p className="kredit-panel-label">Kredit</p>
            <p className="kredit-panel-balance">{kredit == null ? "…" : `${kredit.balance} ${KREDIT.abbr}`}</p>
            <p className="kredit-panel-hint">
              1 {KREDIT.abbr} = Rp {KREDIT.idrPerKredit.toLocaleString("id-ID")}
              {kredit?.mode === "lab" ? " · keran lab" : ""}
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
                {result.subdomain && <li>Subdomain lab: {result.subdomain}</li>}
                <li>
                  Saldo sekarang: {result.balance ?? kredit?.balance} {KREDIT.abbr}
                </li>
                {result.orderId && <li>Order {result.orderId.slice(0, 8)}…</li>}
              </ol>
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
                }}
              >
                Pesan site lain
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="notion-database order-form">
            <label htmlFor="order-name">Nama usaha</label>
            <input
              id="order-name"
              type="text"
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
