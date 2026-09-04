"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { MySitesPanel } from "@/components/MySitesPanel";

export default function SitusPage() {
  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main">
        <Link href="/" className="order-back">
          ← Kembali ke toko
        </Link>
        <p className="hub-kicker">Channel Starter</p>
        <h1 className="order-title">Situs saya</h1>
        <p className="order-lead">
          Hanya situs yang dibuat dengan cookie sesi ini (tamu atau akun). Tanpa debit Kredit. Bukan
          daftar semua warung lab. Bukan WAF / Job Cowork.
        </p>
        <MySitesPanel />
      </main>
    </div>
  );
}
