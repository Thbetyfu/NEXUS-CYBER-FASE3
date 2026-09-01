"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  Lock,
  RefreshCw,
  Server,
  Shield,
} from "lucide-react";
import { getSegment } from "@/lib/segments";
import { whatsappPemerintahUrl } from "@/lib/portal-config";
import { Navbar, PlanCta, WaCta } from "./Navbar";

const WHERE = [
  {
    icon: Server,
    title: "Di DC Anda",
    desc: "Binary/image Edge berlisensi — WAF, Reflex, antibodi cache, NEX-AI runtime (nex-ai-protect / nex-ai-reflex).",
  },
  {
    icon: Lock,
    title: "Tetap di Nexus",
    desc: "Source monorepo, control plane SOC, orkestrasi Job/Loop pusat, dan kunci lisensi — tidak diserahkan.",
  },
  {
    icon: RefreshCw,
    title: "Loop wajib",
    desc: "Update antibodi, Job berkala, artefak risiko. Tanpa retainer Loop, lisensi tidak hidup sebagai produk penuh.",
  },
  {
    icon: KeyRound,
    title: "Bukan fork 1 tahun",
    desc: "Runtime terikat masa lisensi + jalur wasit. Cabut kontrak ≠ “jalan sendiri selamanya dengan IP Nexus”.",
  },
];

const MARGIN_HINT = [
  { label: "Lisensi Edge", sell: "Rp 18jt/thn", margin: "~87%" },
  { label: "Loop On-Prem", sell: "Rp 3,5jt/bln", margin: "~70%" },
  { label: "vs UMKM 20rb", sell: "laba kecil", margin: "volume" },
];

export function CoworkB2GPage() {
  const segment = getSegment("pemerintah");
  const plans = segment.plans;

  return (
    <div className="hub-page" style={{ minHeight: "100vh" }}>
      <div className="hub-mesh" aria-hidden />
      <Navbar />

      <main className="notion-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <Link href="/" className="hub-back-link">
          <ArrowLeft size={14} /> Semua segmen
        </Link>

        <section className="text-center" style={{ marginBottom: 28 }}>
          <motion.p
            className="hub-kicker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {segment.badge}
          </motion.p>
          <motion.h1
            className="hub-segment-h1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {segment.headline}
          </motion.h1>
          <motion.p
            className="hub-segment-lead"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
          >
            {segment.subhead}
          </motion.p>
          <motion.div
            className="flex justify-center gap-3"
            style={{ flexWrap: "wrap", marginTop: 20 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <WaCta label="Diskusi Pemerintah on-prem" href={whatsappPemerintahUrl()} primary />
            <Link href="/corporat" className="notion-button" style={{ padding: "12px 24px" }}>
              Corporat (hosted / on-prem)
            </Link>
          </motion.div>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 className="text-center" style={{ fontSize: "1.2rem", marginBottom: 8 }}>
            Apa yang jalan di mana
          </h2>
          <p
            className="text-center"
            style={{ color: "var(--notion-text-muted)", fontSize: 14, marginBottom: 20 }}
          >
            Tidak ada kuis “punya website?” — paket ini on-prem, bukan Channel Starter.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {WHERE.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                style={{
                  padding: "18px 16px",
                  borderBottom: "1px solid var(--hub-line)",
                }}
              >
                <item.icon
                  size={22}
                  strokeWidth={1.75}
                  style={{ color: "var(--hub-accent)", marginBottom: 10 }}
                />
                <h3 style={{ fontSize: "1rem", marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: "var(--notion-text-muted)", margin: 0 }}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="harga" style={{ marginBottom: 36 }}>
          <h2 className="text-center" style={{ fontSize: "1.2rem", marginBottom: 8 }}>
            Paket Pemerintah (ilustrasi pitching)
          </h2>
          <p
            className="text-center"
            style={{ color: "var(--notion-text-muted)", fontSize: 14, marginBottom: 20 }}
          >
            Harga bukan HPS resmi. WhatsApp = kontak on-prem (bukan gateway, bukan DANA/Midtrans).
            Self-serve UMKM–startup = form paket /pesan/… + Kredit (isi ulang pending). Bukan dump /order sebagai produk.
          </p>
          <div className="notion-pricing-grid">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className="notion-pricing-card"
                style={plan.popular ? { borderColor: "var(--hub-ink)", borderWidth: 2 } : undefined}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                {plan.tag && (
                  <div
                    className="plan-tag"
                    style={{ background: plan.popular ? "var(--hub-ink)" : "var(--hub-accent)" }}
                  >
                    {plan.tag}
                  </div>
                )}
                <div className="notion-pricing-card-title">{plan.name}</div>
                <p className="plan-for-who">{plan.forWho}</p>
                <div
                  className="notion-pricing-card-price"
                  style={plan.popular ? { color: "var(--hub-ink)" } : undefined}
                >
                  {plan.price} <span>{plan.sub}</span>
                </div>
                <ul className="notion-pricing-features-list">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <PlanCta label={plan.ctaLabel} href={plan.cta} primary={plan.popular} />
              </motion.div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginBottom: 36,
            padding: "20px 0",
            borderTop: "1px solid var(--hub-line)",
            borderBottom: "1px solid var(--hub-line)",
          }}
        >
          <h2 className="text-center" style={{ fontSize: "1.1rem", marginBottom: 8 }}>
            Unit ekonomi (ringkas)
          </h2>
          <p
            className="text-center"
            style={{ color: "var(--notion-text-muted)", fontSize: 13, marginBottom: 16 }}
          >
            Estimasi margin kotor pilot — detail di docs internal{" "}
            <code style={{ fontSize: 12 }}>PRICING_UNIT_ECONOMICS.md</code>
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            {MARGIN_HINT.map((row) => (
              <div key={row.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--hub-ink-muted)" }}>{row.label}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{row.sell}</div>
                <div style={{ fontSize: 13, color: "var(--hub-accent)" }}>margin {row.margin}</div>
              </div>
            ))}
          </div>
        </section>

        {segment.faqs.length > 0 && (
          <section id="faq" style={{ padding: "8px 0", maxWidth: 640, margin: "0 auto" }}>
            <h2 className="text-center" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
              FAQ Pemerintah
            </h2>
            {segment.faqs.map((faq) => (
              <details key={faq.q} className="notion-toggle">
                <summary className="notion-toggle-summary">{faq.q}</summary>
                <div className="notion-toggle-content">
                  <p>{faq.a}</p>
                </div>
              </details>
            ))}
          </section>
        )}

        <p
          className="text-center"
          style={{ marginTop: 28, fontSize: 13, color: "var(--notion-text-muted)" }}
        >
          Butuh wasit hosted atau corporat on-prem?{" "}
          <Link href="/corporat">
            <Building2 size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Corporat
          </Link>
          {" · "}
          <Link href="/">Pilih segmen lain</Link>
        </p>
      </main>

      <footer className="hub-footer">
        <div className="notion-container" style={{ paddingBottom: 0 }}>
          <div className="notion-navbar-brand" style={{ marginBottom: 6 }}>
            <Shield size={18} />
            <span style={{ fontSize: 15 }}>Nexus Cyber · Pemerintah</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--notion-text-muted)", margin: 0 }}>
            © {new Date().getFullYear()} Nexus Cyber
          </p>
        </div>
      </footer>
    </div>
  );
}
