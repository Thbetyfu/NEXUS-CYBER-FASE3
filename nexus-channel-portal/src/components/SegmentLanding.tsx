"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Cloud, Globe, GlobeLock, Server, Shield } from "lucide-react";
import { useState } from "react";
import {
  plansForSegment,
  type DeployMode,
  type SegmentDef,
  type WebsiteStatus,
} from "@/lib/segments";
import { Navbar, WaCta } from "./Navbar";

export function SegmentLanding({ segment }: { segment: SegmentDef }) {
  const [website, setWebsite] = useState<WebsiteStatus | null>(
    segment.askWebsite ? null : "sudah",
  );
  const [deploy, setDeploy] = useState<DeployMode | null>(
    segment.askDeployMode ? null : "hosted",
  );

  const plans = plansForSegment(
    segment,
    segment.askWebsite ? website : null,
    segment.askDeployMode ? deploy : null,
  );
  const showPlans =
    (!segment.askWebsite || website !== null) &&
    (!segment.askDeployMode || deploy !== null);

  return (
    <div className="hub-page" style={{ minHeight: "100vh" }}>
      <Navbar />
      <main className="notion-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <Link href="/" className="hub-back-link">
          <ArrowLeft size={14} /> Semua segmen
        </Link>

        <section className="text-center" style={{ marginBottom: 28 }}>
          <p className="hub-kicker">{segment.badge}</p>
          <h1 className="hub-segment-h1">{segment.headline}</h1>
          <p className="hub-segment-lead">{segment.subhead}</p>
        </section>

        {segment.askWebsite && (
          <section className="web-status-block" aria-labelledby="web-status-title">
            <h2 id="web-status-title" className="web-status-title">
              Apakah Anda sudah punya website?
            </h2>
            <p className="web-status-hint">
              Jawaban ini mengubah paket & harga — biar yang belum punya site tidak dipaksa bayar
              tepi saja, dan yang sudah punya tidak bayar bikin website lagi.
            </p>
            <div className="web-status-grid">
              <button
                type="button"
                className={`web-status-btn${website === "belum" ? " is-on" : ""}`}
                onClick={() => setWebsite("belum")}
              >
                <Globe size={22} strokeWidth={1.75} />
                <strong>Belum punya</strong>
                <span>Butuh website / landing dari Nexus</span>
              </button>
              <button
                type="button"
                className={`web-status-btn${website === "sudah" ? " is-on" : ""}`}
                onClick={() => setWebsite("sudah")}
              >
                <GlobeLock size={22} strokeWidth={1.75} />
                <strong>Sudah punya</strong>
                <span>Site sudah online — fokus pagar / wasit</span>
              </button>
            </div>
            {website && (
              <button type="button" className="web-status-reset" onClick={() => setWebsite(null)}>
                Ganti jawaban
              </button>
            )}
          </section>
        )}

        {segment.askDeployMode && (
          <section className="web-status-block" aria-labelledby="deploy-mode-title">
            <h2 id="deploy-mode-title" className="web-status-title">
              Seberapa besar / di mana mesin jalan?
            </h2>
            <p className="web-status-hint">
              Hosted = beli Job/Loop seperti segmen lain (mesin di Nexus). On-prem = perusahaan sudah
              besar / data kritis — Edge di server Anda, model sama Pemerintah.
            </p>
            <div className="web-status-grid">
              <button
                type="button"
                className={`web-status-btn${deploy === "hosted" ? " is-on" : ""}`}
                onClick={() => setDeploy("hosted")}
              >
                <Cloud size={22} strokeWidth={1.75} />
                <strong>Hosted</strong>
                <span>Job/Loop di infrastruktur Nexus — ratusan ribu</span>
              </button>
              <button
                type="button"
                className={`web-status-btn${deploy === "onprem" ? " is-on" : ""}`}
                onClick={() => setDeploy("onprem")}
              >
                <Server size={22} strokeWidth={1.75} />
                <strong>On-prem (besar)</strong>
                <span>Server milik Anda — lisensi jutaan + Loop wajib</span>
              </button>
            </div>
            {deploy && (
              <button type="button" className="web-status-reset" onClick={() => setDeploy(null)}>
                Ganti jawaban
              </button>
            )}
          </section>
        )}

        <AnimatePresence mode="wait">
          {showPlans && (
            <motion.div
              key={`${website ?? "w"}-${deploy ?? "d"}`}
              id="harga"
              className="notion-pricing-grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  className="notion-pricing-card"
                  style={plan.popular ? { borderColor: "var(--hub-ink)", borderWidth: 2 } : undefined}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
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
                  <WaCta label="Pesan via WhatsApp" href={plan.cta} primary={plan.popular} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {((segment.askWebsite && !website) || (segment.askDeployMode && !deploy)) && (
          <p className="text-center" style={{ color: "var(--notion-text-muted)", fontSize: 14 }}>
            Pilih salah satu di atas untuk melihat harga.
          </p>
        )}

        {segment.faqs.length > 0 && showPlans && (
          <section id="faq" style={{ padding: "36px 0 8px", maxWidth: 640, margin: "0 auto" }}>
            <h2 className="text-center" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
              FAQ {segment.title}
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

        <p className="text-center" style={{ marginTop: 28, fontSize: 13, color: "var(--notion-text-muted)" }}>
          Bukan segmen ini? <Link href="/">Pilih lagi</Link>
          {" · "}
          <Link href="/order">Form isi data website</Link>
        </p>
      </main>

      <footer className="hub-footer">
        <div className="notion-container" style={{ paddingBottom: 0 }}>
          <div className="notion-navbar-brand" style={{ marginBottom: 6 }}>
            <Shield size={18} />
            <span style={{ fontSize: 15 }}>Nexus Cyber · {segment.title}</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--notion-text-muted)", margin: 0 }}>
            © {new Date().getFullYear()} Nexus Cyber
          </p>
        </div>
      </footer>
    </div>
  );
}
