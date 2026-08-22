"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { FeaturesSection, HowItWorksSection, ProductLayersSection } from "@/components/FeaturesSection";
import { HeroSection, PricingSection } from "@/components/LandingSections";
import { Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div style={{ backgroundColor: "var(--notion-bg)", minHeight: "100vh" }}>
      <Navbar />
      <main className="notion-container">
        <HeroSection />

        <FeaturesSection />
        <ProductLayersSection />
        <HowItWorksSection />
        <PricingSection />

        <section id="faq" style={{ padding: "60px 0 100px" }}>
          <h2 className="text-center" style={{ fontSize: "2rem", marginBottom: "2rem" }}>
            FAQ
          </h2>
          <motion.details
            className="notion-toggle"
            open
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <summary className="notion-toggle-summary">Bagaimana cara bayar?</summary>
            <div className="notion-toggle-content">
              <p>
                Klik tombol WhatsApp — pesan otomatis terkirim. Setelah transfer dikonfirmasi, tim Nexus
                generate site Anda (biasanya 1×24 jam).
              </p>
            </div>
          </motion.details>
          <motion.details
            className="notion-toggle"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
          >
            <summary className="notion-toggle-summary">Apakah Rp 20rb sudah termasuk keamanan wasit?</summary>
            <div className="notion-toggle-content">
              <p>
                <strong>Tidak.</strong> Starter = website template saja. Job Cowork / Loop GaaS = paket Cowork
                terpisah (ratusan ribu ke atas).
              </p>
            </div>
          </motion.details>
          <motion.details
            className="notion-toggle"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <summary className="notion-toggle-summary">Domain sendiri?</summary>
            <div className="notion-toggle-content">
              <p>
                Subdomain <code>{`{slug}.nexus.id`}</code> included di Starter. Domain custom — paket Usaha
                atau biaya domain terpisah (~Rp 150–200rb/tahun).
              </p>
            </div>
          </motion.details>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--notion-border)", background: "#fff", padding: "48px 0" }}>
        <div className="notion-container" style={{ paddingBottom: 0 }}>
          <div className="notion-navbar-brand" style={{ marginBottom: 12 }}>
            <Shield size={20} />
            <span>Nexus Cyber</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--notion-text-muted)", maxWidth: 400 }}>
            Channel Portal — pintu jual Channel Starter & upsell GaaS Cowork.
          </p>
          <p style={{ fontSize: 12, color: "var(--notion-text-muted)", marginTop: 24 }}>
            © {new Date().getFullYear()} Nexus Cyber ·{" "}
            <Link href="/order">Form pesanan</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
