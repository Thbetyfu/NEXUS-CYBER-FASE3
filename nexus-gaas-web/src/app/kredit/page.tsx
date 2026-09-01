"use client";

import Link from "next/link";
import { KreditPanel } from "@/components/KreditPanel";
import { Navbar } from "@/components/Navbar";
import { useKreditSession } from "@/hooks/useKreditSession";

export default function KreditPage() {
  const { kredit, kreditError, busy, requestTopup, isiKeran } = useKreditSession();

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
          Tombol Isi mencatat permintaan (pending). Kredit masuk setelah operator approve bukti. QRIS/VA milik
          pemilik belum live di lab ini — jangan anggap saldo terisi karena tombol. Starter tetap 20 Kr fail-closed.
          Bukan Midtrans.
        </p>
        <KreditPanel
          kredit={kredit}
          kreditError={kreditError}
          busy={busy}
          onRequestTopup={(amount) => void requestTopup(amount)}
          onLabFaucet={() => void isiKeran()}
        />
      </main>
    </div>
  );
}
