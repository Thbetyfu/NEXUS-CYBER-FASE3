"use client";

import { motion } from "framer-motion";
import { Globe, Layers, Sparkles, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Form → site dalam hitungan menit",
    desc: "Wizard rule-based — tanpa LLM berat. Tiga template siap pakai untuk UMKM.",
    color: "var(--notion-blue)",
    bg: "var(--notion-blue-bg)",
  },
  {
    icon: Globe,
    title: "Subdomain *.nexus.id",
    desc: "Branding digital cepat. Domain custom tersedia di paket Usaha.",
    color: "var(--notion-green)",
    bg: "var(--notion-green-bg)",
  },
  {
    icon: Layers,
    title: "Upsell Cowork terpisah",
    desc: "Starter = website saja. Job Cowork / Loop GaaS = kontrak wasit tersendiri.",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.08)",
  },
  {
    icon: Zap,
    title: "Bayar via WhatsApp",
    desc: "Tanpa janji billing otomatis. Konfirmasi manual — jujur untuk v1.",
    color: "var(--notion-yellow)",
    bg: "var(--notion-yellow-bg)",
  },
];

const STEPS = [
  { n: "01", title: "Pilih paket", desc: "Starter Rp 20rb/bulan atau Cowork untuk wasit." },
  { n: "02", title: "Isi form", desc: "Nama usaha, kategori, WhatsApp — generator siap." },
  { n: "03", title: "Konfirmasi WA", desc: "Transfer & chat tim Nexus — deploy 1×24 jam." },
  { n: "04", title: "Site live", desc: "slug.nexus.id aktif — upsell Cowork opsional." },
];

export function FeaturesSection() {
  return (
    <section id="fitur" style={{ padding: "80px 0", position: "relative" }}>
      <div className="gradient-orb gradient-orb-1" aria-hidden />
      <div className="gradient-orb gradient-orb-2" aria-hidden />

      <motion.div
        className="text-center"
        style={{ marginBottom: "3rem", position: "relative" }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={{ fontSize: "2.4rem", marginTop: 0, borderBottom: "none" }}>
          Mengapa Nexus Channel Portal?
        </h2>
        <p style={{ color: "var(--notion-text-muted)", maxWidth: 560, margin: "0 auto" }}>
          Entry UMKM yang jujur — website dulu, keamanan wasit saat Anda siap scale.
        </p>
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          position: "relative",
        }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            className="feature-card"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            whileHover={{ y: -8, boxShadow: "var(--notion-shadow-stacked)" }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: f.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <f.icon size={24} style={{ color: f.color }} />
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: "var(--notion-text-muted)", margin: 0 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section style={{ padding: "60px 0 80px" }}>
      <h2 className="text-center" style={{ fontSize: "2rem", marginBottom: "2.5rem" }}>
        Cara kerja — 4 langkah
      </h2>
      <div className="steps-track">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            className="step-card"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
          >
            <span className="step-number">{step.n}</span>
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: 4 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: "var(--notion-text-muted)", margin: 0 }}>{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ProductLayersSection() {
  return (
    <section style={{ padding: "40px 0 60px" }}>
      <motion.div
        className="notion-columns"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div>
          <h2 style={{ marginTop: 0 }}>Dua lapisan produk</h2>
          <p>
            <strong>Channel Starter</strong> = website murah untuk UMKM.{" "}
            <strong>Edge Antibody Cowork</strong> = wasit keamanan Job/Loop untuk yang butuh bukti risiko.
          </p>
          <ul className="notion-pricing-features-list">
            <li>Generator rule-based — bukan LLM berat</li>
            <li>Deploy multi-tenant *.nexus.id</li>
            <li>Upsell Cowork satu PROTECTED_HOST per instance</li>
          </ul>
        </div>
        <motion.div
          className="notion-callout notion-callout-blue"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="notion-callout-content">
            <strong>Fokus v1:</strong> B2C (UMKM) + B2B (integrator/fintech). B2G/E-Katalog belum prioritas.
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
