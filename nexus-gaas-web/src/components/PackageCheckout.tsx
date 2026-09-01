"use client";

import Link from "next/link";
import { useState } from "react";
import { KreditPanel } from "@/components/KreditPanel";
import { useKreditSession } from "@/hooks/useKreditSession";
import type { CheckoutPackage } from "@/lib/checkout";
import { priceIdrSub, priceKrLabel } from "@/lib/checkout";

export function PackageCheckout({ pkg }: { pkg: CheckoutPackage }) {
  const { kredit, kreditError, busy, requestTopup, isiKeran, submitProof } = useKreditSession();
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  return (
    <>
      <Link href={pkg.segmentHref} className="order-back">
        ← Kembali ke paket
      </Link>
      <p className="hub-kicker">
        {pkg.kind === "tepi" ? "Edge Shield · 1 host lab" : "Tugas operator · bukan kasir Starter"}
      </p>
      <h1 className="order-title">{pkg.title}</h1>
      <p className="order-lead">{pkg.summary}</p>
      <p className="order-lead">
        Harga daftar: <strong>{priceKrLabel(pkg.priceKr)}</strong>
        {pkg.priceKr != null ? ` (${priceIdrSub(pkg.priceKr)})` : ""}. Bukan Midtrans. Bukan WhatsApp. Bukan
        debit otomatis 20 Kr generate. QRIS/VA settlement belum live; Isi = pending.
      </p>

      <KreditPanel
        kredit={kredit}
        kreditError={kreditError}
        busy={busy}
        onRequestTopup={(amount) => void requestTopup(amount)}
        onLabFaucet={() => void isiKeran()}
        onSubmitProof={submitProof}
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
              <li>Operator lab memasang tepi / menjalankan Job sesuai paket — bukan Loop otomatis di 20 Kr.</li>
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
            <label htmlFor="pkg-host">Host yang dilindungi</label>
            <input
              id="pkg-host"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="contoh.nexus-lab.test"
            />
            <label htmlFor="pkg-note">Catatan (opsional)</label>
            <textarea id="pkg-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </fieldset>
          <button type="submit" className="notion-button notion-button-primary order-submit">
            {pkg.kind === "tepi" ? "Kirim form Edge Shield" : "Ajukan ke operator"}
          </button>
        </form>
      )}
    </>
  );
}
