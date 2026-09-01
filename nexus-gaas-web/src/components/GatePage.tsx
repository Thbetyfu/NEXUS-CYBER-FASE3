"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { continueAsGuest } from "@/components/AuthLinks";
import { Navbar } from "@/components/Navbar";
import { safeInternalNext } from "@/lib/gate-next";

function GateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalNext(searchParams.get("next"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const guest = async () => {
    setBusy(true);
    setError("");
    try {
      await continueAsGuest();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sesi tamu gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main auth-page gate-page">
        <p className="hub-kicker">Channel Portal</p>
        <h1 className="order-title">Masuk ke toko Nexus</h1>
        <p className="order-lead">
          Pilih cara lanjut. Ini pintu pelanggan — bukan Operator GaaS Console, bukan SOC.
        </p>
        <div className="gate-choices">
          <Link href={`/masuk?next=${encodeURIComponent(next)}`} className="notion-button notion-button-primary gate-choice">
            Login
          </Link>
          <Link href={`/daftar?next=${encodeURIComponent(next)}`} className="notion-button gate-choice">
            Daftar
          </Link>
          <button type="button" className="notion-button gate-choice" onClick={() => void guest()} disabled={busy}>
            {busy ? "Menyiapkan tamu…" : "Masuk sebagai Tamu"}
          </button>
        </div>
        {error && (
          <p className="kredit-error" role="alert">
            {error}
          </p>
        )}
        <p className="auth-honest">
          Tamu = cookie di browser ini; hapus cookie = saldo tamu hilang. Daftar menyimpan Kredit jika Anda daftar dari
          sesi tamu. Lab = keran Kredit, bukan Midtrans.
        </p>
      </main>
    </div>
  );
}

export function GatePage() {
  return (
    <Suspense fallback={<div className="order-page" />}>
      <GateInner />
    </Suspense>
  );
}
