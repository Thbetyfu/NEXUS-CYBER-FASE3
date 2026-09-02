"use client";

import Link from "next/link";
import { KreditPanel } from "@/components/KreditPanel";
import { Navbar } from "@/components/Navbar";
import { useKreditSession } from "@/hooks/useKreditSession";

export default function KreditPage() {
  const { kredit, kreditError, busy, requestTopup, isiKeran, submitProof, cancelTopup } = useKreditSession();

  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main">
        <Link href="/" className="order-back">
          ← Kembali ke toko
        </Link>
        <p className="hub-kicker">Kredit</p>
        <h1 className="order-title">Beli / isi ulang Kredit</h1>
        <p className="order-lead">
          Tombol Isi mencatat permintaan. Bayar ke Nomor DANA, unggah bukti, lalu Kirim bukti. WhatsApp muncul
          setelah bukti terkirim. Kredit masuk hanya setelah operator konfirmasi di localhost
          <code> /operator/topup</code>. QRIS/VA belum live di repo. Bukan Midtrans. Starter 20 Kr tetap fail-closed.
        </p>
        <KreditPanel
          kredit={kredit}
          kreditError={kreditError}
          busy={busy}
          onRequestTopup={(amount) => void requestTopup(amount)}
          onLabFaucet={() => void isiKeran()}
          onSubmitProof={submitProof}
          onCancelTopup={(id) => void cancelTopup(id)}
        />
      </main>
    </div>
  );
}
