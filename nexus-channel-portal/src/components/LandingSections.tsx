"use client";

import { motion } from "framer-motion";
import { Lock, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { WaCta } from "./Navbar";
import { whatsappPackageUrl, whatsappUrl } from "@/lib/portal-config";

const WORDS = [
  "website UMKM cepat.",
  "kanal digital aman.",
  "Job Cowork terukur.",
  "template siap jual.",
];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIndex];
    const timer = setTimeout(
      () => {
        if (!deleting && text === word) {
          setTimeout(() => setDeleting(true), 2000);
          return;
        }
        if (deleting && text === "") {
          setDeleting(false);
          setWordIndex((i) => (i + 1) % WORDS.length);
          return;
        }
        setText(deleting ? word.substring(0, text.length - 1) : word.substring(0, text.length + 1));
      },
      deleting ? 30 : 70,
    );
    return () => clearTimeout(timer);
  }, [text, deleting, wordIndex]);

  return (
    <section className="text-center" style={{ padding: "60px 0 40px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: "var(--notion-blue-bg)",
          border: "1px solid rgba(79, 70, 229, 0.15)",
          padding: "6px 14px",
          borderRadius: 30,
          fontSize: 12.5,
          fontWeight: 700,
          color: "var(--notion-blue)",
          marginBottom: 24,
        }}
      >
        <Lock size={12} />
        Channel Starter · subdomain *.nexus.id
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        style={{ maxWidth: 860, margin: "0 auto 1.5rem", fontWeight: 800 }}
      >
        Website UMKM + keamanan wasit — mulai dari{" "}
        <span className="typing-cursor" style={{ color: "var(--notion-blue)" }}>
          {text}
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ color: "var(--notion-text-muted)", maxWidth: 680, margin: "0 auto 2.5rem", fontWeight: 500 }}
      >
        Form → template → site live di <strong>{`{nama}.nexus.id`}</strong>. Rp 20.000/bulan untuk website saja.
        Job Cowork / Loop GaaS = paket terpisah — jujur, tanpa janji palsu.
      </motion.p>

      <motion.div
        className="flex justify-center gap-4"
        style={{ marginBottom: "3rem", flexWrap: "wrap" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <WaCta label="Beli via WhatsApp" href={whatsappUrl()} primary />
        <a href="#harga" className="notion-button" style={{ padding: "12px 28px", fontSize: 15 }}>
          Lihat paket
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, duration: 0.7 }}
        className="hero-illustration-wrapper"
        style={{ maxWidth: 520, margin: "0 auto" }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(79,70,229,0.08), rgba(16,185,129,0.06))",
            borderRadius: 20,
            padding: 32,
            border: "1px solid var(--notion-border)",
            boxShadow: "var(--notion-shadow-stacked)",
          }}
        >
          <Shield size={48} style={{ color: "var(--notion-blue)", marginBottom: 16 }} />
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Alur pelanggan</p>
          <p style={{ fontSize: 14, color: "var(--notion-text-muted)", margin: 0 }}>
            Portal → WA → operator generate → site live → upsell Cowork opsional
          </p>
        </div>
      </motion.div>
    </section>
  );
}

export function PricingSection() {
  const plans = [
    {
      name: "Channel Starter",
      price: "Rp 20.000",
      sub: "/ bulan · website saja",
      popular: true,
      features: [
        "Subdomain nama.nexus.id",
        "3 template (F&B, jasa, profil)",
        "Form wizard rule-based",
        "SSL shared infra",
        "Tanpa Job Cowork di harga ini",
      ],
      cta: whatsappPackageUrl("Channel Starter Rp 20rb"),
    },
    {
      name: "Usaha",
      price: "Rp 49.000",
      sub: "/ bulan",
      features: ["Domain sendiri (terpisah)", "Halaman tambahan", "SEO dasar", "Support email"],
      cta: whatsappPackageUrl("Usaha"),
    },
    {
      name: "Cowork GaaS",
      price: "Rp 500rb+",
      sub: "/ bulan · wasit",
      features: [
        "WAF + Job Cowork",
        "Artefak risiko L0/L1",
        "Loop GaaS opsional",
        "Kontrak terpisah dari Starter",
      ],
      cta: whatsappPackageUrl("Cowork GaaS"),
    },
  ];

  return (
    <section id="harga" style={{ padding: "80px 0" }}>
      <div className="text-center" style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "2.4rem", borderBottom: "none", paddingBottom: 0, marginTop: 0 }}>
          Paket jujur — B2C & B2B
        </h2>
        <p style={{ color: "var(--notion-text-muted)" }}>
          Pembayaran manual via WhatsApp. Midtrans — rencana fase berikutnya.
        </p>
      </div>
      <div className="notion-pricing-grid">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className="notion-pricing-card"
            style={plan.popular ? { borderColor: "var(--notion-blue)", borderWidth: 2 } : undefined}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -6 }}
          >
            {plan.popular && (
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: 30,
                  background: "var(--notion-blue)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 14px",
                  borderRadius: 30,
                }}
              >
                PALING LAKU
              </div>
            )}
            <div className="notion-pricing-card-title">{plan.name}</div>
            <div className="notion-pricing-card-price" style={plan.popular ? { color: "var(--notion-blue)" } : undefined}>
              {plan.price} <span>{plan.sub}</span>
            </div>
            <ul className="notion-pricing-features-list">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <WaCta label="Pesan via WhatsApp" href={plan.cta} primary={plan.popular} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
