"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PackageCheckout } from "@/components/PackageCheckout";
import { StarterCheckout } from "@/components/StarterCheckout";
import { getCheckout } from "@/lib/checkout";

export default function PesanPage() {
  const params = useParams<{ sku: string }>();
  const sku = typeof params.sku === "string" ? params.sku : "";
  const pkg = getCheckout(sku);

  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main">
        {pkg == null ? (
          <>
            <h1 className="order-title">Paket tidak dikenal</h1>
            <p className="order-lead">Mulai dari pilih segmen, lalu kartu paket — bukan kasir misterius.</p>
            <Link href="/" className="notion-button notion-button-primary">
              Pilih segmen
            </Link>
          </>
        ) : pkg.kind === "starter" ? (
          <StarterCheckout pkg={pkg} />
        ) : (
          <PackageCheckout pkg={pkg} />
        )}
      </main>
    </div>
  );
}
