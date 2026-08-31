"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileCheck, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { Navbar, PlanCta } from "./Navbar";
import { PORTAL_DAFTAR } from "@/lib/portal-config";

const DELIVERABLES = [
  {
    icon: Shield,
    title: "Defense delta",
    desc: "Ukur perbedaan WAF vs origin — label jujur: waf_blocked, origin_open, replay_missed.",
  },
  {
    icon: RefreshCw,
    title: "Antibody loop",
    desc: "Virtual patch di tepi + vaccine-probe + replay — bukti tembakan ulang masih ditahan.",
  },
  {
    icon: FileCheck,
    title: "Artefak risiko",
    desc: "Export Markdown/JSON untuk pemilik risiko: delta, antibodi, residual, persetujuan L0/L1.",
  },
  {
    icon: CheckCircle2,
    title: "Loop GaaS opsional",
    desc: "Job terjadwal + memori imun per host — retainership operasi, bukan one-shot scanner.",
  },
];

const PLANS = [
  {
    name: "Job Cowork",
    price: "Rp 200.000",
    sub: "sekali · pilot PC+tunnel",
    features: [
      "Satu PROTECTED_HOST",
      "Defense delta + antibody loop",
      "Artefak MD/JSON",
      "Gerbang L0/L1",
      "CLOSED_GAP jika residual",
    ],
    cta: "/pesan/corporat-job",
  },
  {
    name: "Loop GaaS",
    price: "Rp 300.000",
    sub: "/ bulan · 1 host",
    features: [
      "Semua Job Cowork",
      "1 Job terjadwal / bulan",
      "Memori imun per host",
      "Operator + artefak berkala",
      "Harga maks daftar v1 (pilot)",
    ],
    cta: "/pesan/corporat-loop",
  },
  {
    name: "Integrator bundle",
    price: "Custom",
    sub: "multi-host / agensi",
    features: [
      "Channel build + Cowork",
      "Kontrak pisah site vs wasit",
      "Loop multi-host (manual ops)",
      "Demo before/after untuk klien Anda",
    ],
    cta: PORTAL_DAFTAR,
    highlight: false,
  },
];

export function CoworkB2BPage() {
  return (
    <div style={{ backgroundColor: "var(--notion-bg)", minHeight: "100vh" }}>
      <Navbar />
      <main className="notion-container">
        <section className="text-center" style={{ padding: "48px 0 32px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--notion-green-bg)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              padding: "6px 14px",
              borderRadius: 30,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--notion-green)",
              marginBottom: 20,
            }}
          >
            B2B · Fintech · Integrator · Kanal digital
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ maxWidth: 780, margin: "0 auto 1rem", fontSize: "2.75rem" }}
          >
            Edge Antibody Cowork — wasit keamanan dengan bukti risiko
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ color: "var(--notion-text-muted)", maxWidth: 640, margin: "0 auto 2rem" }}
          >
            Job Cowork mengukur celah di tepi vs origin, memasang antibodi virtual, dan menutup Job hanya jika replay
            jujur — bukan laporan hijau default. Loop GaaS untuk retainership berkala.
          </motion.p>
          <motion.div
            className="flex justify-center gap-4"
            style={{ flexWrap: "wrap" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <PlanCta label="Ajukan Job hosted" href="/pesan/corporat-job" primary />
            <Link href="/" className="notion-button" style={{ padding: "12px 24px" }}>
              Lihat Channel Starter UMKM
            </Link>
          </motion.div>
        </section>

        <section style={{ padding: "40px 0" }}>
          <h2 className="text-center" style={{ marginBottom: "2rem" }}>
            Deliverable untuk pemilik risiko
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {DELIVERABLES.map((d, i) => (
              <motion.div
                key={d.title}
                className="feature-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <d.icon size={28} style={{ color: "var(--notion-blue)", marginBottom: 12 }} />
                <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>{d.title}</h3>
                <p style={{ fontSize: 14, color: "var(--notion-text-muted)", margin: 0 }}>{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section style={{ padding: "40px 0 60px" }}>
          <h2 className="text-center" style={{ marginBottom: "0.5rem" }}>
            Paket B2B
          </h2>
          <p className="text-center" style={{ color: "var(--notion-text-muted)", marginBottom: "2rem" }}>
            Harga ilustrasi — kontrak final setelah scope `PROTECTED_HOST` dan izin uji jinak.
          </p>
          <div className="notion-pricing-grid">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                className="notion-pricing-card"
                style={plan.highlight ? { borderColor: "var(--notion-green)", borderWidth: 2 } : undefined}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      right: 24,
                      background: "var(--notion-green)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 12px",
                      borderRadius: 30,
                    }}
                  >
                    PILOT B2B
                  </div>
                )}
                <div className="notion-pricing-card-title">{plan.name}</div>
                <div
                  className="notion-pricing-card-price"
                  style={plan.highlight ? { color: "var(--notion-green)" } : undefined}
                >
                  {plan.price} <span>{plan.sub}</span>
                </div>
                <ul className="notion-pricing-features-list">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <PlanCta
                  label={plan.name === "Integrator bundle" ? "Masuk portal" : "Ajukan ke operator"}
                  href={plan.cta}
                  primary={plan.highlight}
                />
              </motion.div>
            ))}
          </div>
        </section>

        <section style={{ padding: "0 0 80px" }}>
          <div className="notion-callout notion-callout-blue">
            <div className="notion-callout-content">
              <strong>Bukan pentest exploit.</strong> NEX-RED = wasit purple-team jinak. Job tidak{" "}
              <code>CLOSED_OK</code> jika ada <code>replay_missed</code> tanpa residual tertulis. Manusia pemilik
              risiko mengesahkan L0/L1 — bukan SOC otonom 24/7.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
