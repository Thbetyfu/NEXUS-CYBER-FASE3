"use client";

import Link from "next/link";
import { useState } from "react";
import { KreditPanel } from "@/components/KreditPanel";
import { useKreditSession } from "@/hooks/useKreditSession";
import type { CheckoutPackage } from "@/lib/checkout";
import { priceIdrSub, priceKrLabel } from "@/lib/checkout";
import { HONEST_SKU_DISCLAIMER, OPERATOR_TEPI_PATH, tepiEnableCli } from "@/lib/honest-copy";

export function PackageCheckout({ pkg }: { pkg: CheckoutPackage }) {
  const { kredit, kreditError, busy, requestTopup, isiKeran, submitProof, cancelTopup } = useKreditSession();
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  const slugHint = host.replace(/\.nexus-lab\.test$/i, "").trim() || "slug-anda";
  const isTepi = pkg.kind === "tepi";
  const isCoworkRequest = pkg.kind === "request" && /job|loop/i.test(`${pkg.sku} ${pkg.title}`);

  return (
    <>
      <Link href={pkg.segmentHref} className="order-back">
        ← Kembali ke paket
      </Link>
      <p className="hub-kicker">
        {isTepi
          ? "Edge Shield · SKU tepi · host map (bukan Loop)"
          : isCoworkRequest
            ? "Cowork Job/Loop · bukan 20 Kr · bukan tepi-only"
            : "Tugas operator · bukan kasir Starter"}
      </p>
      <h1 className="order-title">{pkg.title}</h1>
      <p className="order-lead">{pkg.summary}</p>
      <p className="order-lead">
        Harga daftar: <strong>{priceKrLabel(pkg.priceKr)}</strong>
        {pkg.priceKr != null ? ` (${priceIdrSub(pkg.priceKr)})` : ""}. Bukan Midtrans. Bukan WhatsApp. Bukan
        debit otomatis 20 Kr generate. QRIS/VA settlement belum live; Isi = pending. {HONEST_SKU_DISCLAIMER}
      </p>

      {isTepi && (
        <div className="notion-callout notion-callout-blue" style={{ marginBottom: 20 }}>
          <div className="notion-callout-content">
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Pasang tepi (lab / operator)</p>
            <p style={{ fontSize: 14, color: "var(--notion-text-muted)", marginBottom: 8 }}>
              Form ini tidak men-debit 20 Kr dan tidak menjalankan Loop. Operator di PC lab (loopback) atau
              CLI:
            </p>
            <pre style={{ fontSize: 13, overflowX: "auto", margin: "0 0 12px" }}>{tepiEnableCli(slugHint)}</pre>
            <p style={{ fontSize: 14, margin: 0 }}>
              UI loopback:{" "}
              <Link href={`${OPERATOR_TEPI_PATH}?slug=${encodeURIComponent(slugHint)}`}>
                {OPERATOR_TEPI_PATH}
              </Link>{" "}
              — fail-closed di luar lab. Portfolio <code>portfolio.nexus-lab.test</code> tetap.
            </p>
          </div>
        </div>
      )}

      {isCoworkRequest && (
        <p className="order-lead">
          Job/Loop adalah <strong>Edge Antibody Cowork</strong>. Bukan Channel Starter 20 Kr. Bukan Edge Shield
          tepi. Operator menjalankan wasit — bukan kasir generate.
        </p>
      )}

      <KreditPanel
        kredit={kredit}
        kreditError={kreditError}
        busy={busy}
        onRequestTopup={(amount) => void requestTopup(amount)}
        onLabFaucet={() => void isiKeran()}
        onSubmitProof={submitProof}
        onCancelTopup={(id) => void cancelTopup(id)}
      />

      {done ? (
        <div className="notion-callout notion-callout-blue">
          <div className="notion-callout-content">
            <p style={{ fontWeight: 700, marginBottom: 12 }}>Form paket ini tercatat di sesi Anda</p>
            <ol style={{ paddingLeft: 20, color: "var(--notion-text-muted)", fontSize: 14 }}>
              <li>
                {name} · host {host || "—"}
              </li>
              {kredit?.orderCode && <li>Kode sesi: {kredit.orderCode}</li>}
              <li>
                {isTepi
                  ? "Operator menambah slug ke host map (--tier tepi). Bukan Loop, bukan debit 20 Kr."
                  : isCoworkRequest
                    ? "Operator menjalankan Job/Loop Cowork. Bukan Starter 20 Kr, bukan tepi-only."
                    : "Operator lab memasang header / tugas sesuai paket — bukan Loop otomatis di 20 Kr."}
              </li>
            </ol>
            <p style={{ marginTop: 16 }}>
              <Link href={pkg.segmentHref} className="notion-button notion-button-primary">
                Selesai
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="notion-database order-form">
          <fieldset>
            <legend>Data paket</legend>
            <label htmlFor="pkg-name">Nama usaha / instansi</label>
            <input
              id="pkg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama tampil"
            />
            <label htmlFor="pkg-host">{isTepi ? "Slug atau host lab" : "Host yang dilindungi"}</label>
            <input
              id="pkg-host"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={isTepi ? "bu-grace atau bu-grace.nexus-lab.test" : "contoh.nexus-lab.test"}
            />
            <label htmlFor="pkg-note">Catatan (opsional)</label>
            <textarea id="pkg-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </fieldset>
          <button type="submit" className="notion-button notion-button-primary order-submit">
            {isTepi ? "Kirim form Edge Shield" : isCoworkRequest ? "Ajukan Job/Loop ke operator" : "Ajukan ke operator"}
          </button>
        </form>
      )}
    </>
  );
}
