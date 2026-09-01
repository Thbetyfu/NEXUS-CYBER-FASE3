"use client";

import Link from "next/link";
import { KreditPanel } from "@/components/KreditPanel";
import { Navbar } from "@/components/Navbar";
import { useKreditSession } from "@/hooks/useKreditSession";

export default function KreditPage() {
  const { kredit, kreditError, busy, isiKeran } = useKreditSession();

  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main">
        <Link href="/" className="order-back">
          ← Kembali ke toko
        </Link>
        <p className="hub-kicker">Kredit</p>
        <h1 className="order-title">Isi Kredit</h1>
        <p className="order-lead">
          Lab: keran di bawah menambahkan Kredit ke identitas ini (tamu atau akun). Bukan Midtrans, bukan QRIS otomatis.
          Starter tetap 20 Kr fail-closed; bukan Loop.
        </p>
        <KreditPanel kredit={kredit} kreditError={kreditError} busy={busy} onFaucet={() => void isiKeran()} />
      </main>
    </div>
  );
}
