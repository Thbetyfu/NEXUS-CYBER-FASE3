"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Navbar, WaCta } from "@/components/Navbar";
import { BRAND, SALES, whatsappPackageUrl } from "@/lib/portal-config";

export default function OrderPage() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("profil");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("business_name", businessName);
    fd.set("category", category);
    fd.set("whatsapp", whatsapp);
    fd.set("tier", "starter");
    try {
      await fetch("/api/channel-starter/generate", { method: "POST", body: fd });
    } catch {
      /* operator may generate manually if channel-starter offline */
    }
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: "var(--notion-bg)", minHeight: "100vh" }}>
      <Navbar />
      <main className="notion-container" style={{ maxWidth: 560 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--notion-text-muted)" }}>
            ← Kembali
          </Link>
          <h1 style={{ marginTop: 16, fontSize: "2rem" }}>Form pesanan Channel Starter</h1>
          <p style={{ color: "var(--notion-text-muted)", marginBottom: 32 }}>
            Isi data usaha — lalu konfirmasi pembayaran Rp {SALES.starterPrice.toLocaleString("id-ID")}/bulan
            via WhatsApp.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="notion-database" style={{ padding: 24 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>Nama usaha</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={{ width: "100%", marginBottom: 16 }}
                placeholder="Warung Bu Siti"
              />
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%", marginBottom: 16 }}
              >
                <option value="fnb">Kuliner / F&B</option>
                <option value="jasa">Jasa</option>
                <option value="profil">Profil UMKM</option>
              </select>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>WhatsApp</label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                style={{ width: "100%", marginBottom: 24 }}
                placeholder="08xxxxxxxxxx"
              />
              <button type="submit" className="notion-button notion-button-primary" style={{ width: "100%" }}>
                Lanjut ke pembayaran
              </button>
            </form>
          ) : (
            <motion.div
              className="notion-callout notion-callout-blue"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="notion-callout-content">
                <p style={{ fontWeight: 700, marginBottom: 12 }}>Langkah berikutnya</p>
                <ol style={{ paddingLeft: 20, color: "var(--notion-text-muted)", fontSize: 14 }}>
                  <li>Transfer Rp 20.000 (konfirmasi via WA)</li>
                  <li>Tim Nexus deploy site di subdomain {`{slug}.${BRAND.subdomainBase}`}</li>
                  <li>Anda terima link + panduan edit form ulang</li>
                </ol>
                <div style={{ marginTop: 20 }}>
                  <WaCta
                    label="Konfirmasi via WhatsApp"
                    href={whatsappPackageUrl(`Starter — ${businessName}`)}
                    primary
                  />
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
