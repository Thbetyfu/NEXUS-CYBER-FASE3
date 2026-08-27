"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  GraduationCap,
  Landmark,
  MessageCircle,
  Rocket,
  Shield,
  Sparkles,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SEGMENTS, type SegmentId } from "@/lib/segments";
import { Navbar } from "./Navbar";

const ICONS: Record<SegmentId, typeof Store> = {
  umkm: Store,
  sekolah: GraduationCap,
  startup: Rocket,
  corporat: Building2,
  pemerintah: Landmark,
};

const WORDS = [
  "website UMKM.",
  "pagar anti-deface.",
  "landing startup.",
  "wasit corporat.",
  "Edge on-prem pemerintah.",
];

const FLOW_STEPS = [
  { icon: Sparkles, label: "Pilih peran", color: "var(--hub-accent)" },
  { icon: MessageCircle, label: "Hubungi WA", color: "#128C7E" },
  { icon: CheckCircle2, label: "Tim proses", color: "var(--hub-ink)" },
  { icon: Globe, label: "Site / Job live", color: "var(--hub-accent)" },
];

function TypingHeadline() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIndex];
    const timer = setTimeout(() => {
      if (!deleting && text === word) {
        setTimeout(() => setDeleting(true), 1600);
        return;
      }
      if (deleting && text === "") {
        setDeleting(false);
        setWordIndex((i) => (i + 1) % WORDS.length);
        return;
      }
      setText(deleting ? word.substring(0, text.length - 1) : word.substring(0, text.length + 1));
    }, deleting ? 32 : 72);
    return () => clearTimeout(timer);
  }, [text, deleting, wordIndex]);

  return (
    <motion.h1
      className="hub-hero-title"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      Kanal digital Anda,
      <br />
      mulai dari{" "}
      <span className="typing-cursor hub-hero-typed">{text}</span>
    </motion.h1>
  );
}

function HeroFlow() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % FLOW_STEPS.length), 2400);
    return () => clearInterval(id);
  }, []);

  const hints = [
    "Pilih UMKM, sekolah, startup, corporat, atau pemerintah — harga tidak dicampur.",
    "Pesan lewat WhatsApp; teks sudah berisi nama paket.",
    "Proses di PC operator + tunnel — tanpa VPS dulu (on-prem = DC klien).",
    "Website live, Job wasit, atau pitch on-prem — sesuai peran Anda.",
  ];

  return (
    <div className="hero-flow">
      <div className="hero-flow-track">
        {FLOW_STEPS.map((step, i) => {
          const isActive = i === active;
          return (
            <motion.div
              key={step.label}
              className="hero-flow-step"
              animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1.04 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="hero-flow-icon"
                style={{
                  background: isActive ? step.color : "transparent",
                  color: isActive ? "#fff" : "var(--hub-ink-muted)",
                  borderColor: isActive ? step.color : "var(--hub-line)",
                }}
              >
                <step.icon size={20} strokeWidth={1.75} />
              </motion.div>
              <span className={`hero-flow-label${isActive ? " is-on" : ""}`}>{step.label}</span>
              {i < FLOW_STEPS.length - 1 && (
                <span className={`hero-flow-connector${i < active ? " is-done" : ""}`} aria-hidden>
                  <ArrowRight size={14} />
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.p
        key={active}
        className="hero-flow-hint"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {hints[active]}
      </motion.p>
    </div>
  );
}

export function SegmentHub() {
  return (
    <div className="hub-page">
      <div className="hub-mesh" aria-hidden />
      <Navbar />

      <main className="notion-container hub-main">
        <section className="hub-hero">
          <motion.p className="hub-brand-mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Shield size={14} strokeWidth={2} />
            Nexus Cyber
          </motion.p>

          <TypingHeadline />

          <motion.p
            className="hub-hero-lead"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Satu portal. Lima peran. UMKM–startup: cabang website. Corporat: hosted atau on-prem
            (jika besar). Pemerintah: on-prem di DC instansi.
          </motion.p>

          <motion.a
            href="#segmen"
            className="hub-cta"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            Pilih peran Anda
            <ArrowDown size={16} />
          </motion.a>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <HeroFlow />
          </motion.div>
        </section>

        <section id="segmen" className="hub-roles">
          <div className="hub-roles-head">
            <h2>Anda siapa?</h2>
            <p>Pilih pintu yang sesuai — paket & harga di halaman berikutnya.</p>
          </div>

          <ol className="hub-role-list">
            {SEGMENTS.map((seg, i) => {
              const Icon = ICONS[seg.id];
              return (
                <motion.li
                  key={seg.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={seg.href} className="hub-role-row">
                    <span className="hub-role-index">{String(i + 1).padStart(2, "0")}</span>
                    <span className="hub-role-icon" data-accent={seg.accent}>
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <span className="hub-role-copy">
                      <span className="hub-role-meta">{seg.badge}</span>
                      <strong>{seg.title}</strong>
                      <span className="hub-role-short">{seg.short}</span>
                    </span>
                    <span className="hub-role-go">
                      Masuk <ArrowRight size={16} />
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ol>
        </section>
      </main>

      <footer className="hub-footer">
        <div className="notion-container" style={{ paddingBottom: 0 }}>
          <div className="notion-navbar-brand" style={{ marginBottom: 8 }}>
            <Shield size={18} />
            <span style={{ fontSize: 15 }}>Nexus Cyber</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--notion-text-muted)", margin: 0, maxWidth: 400 }}>
            Channel Portal — website & wasit kanal, harga per peran dan status website.
          </p>
          <p style={{ fontSize: 12, color: "var(--notion-text-muted)", margin: "12px 0 0" }}>
            © {new Date().getFullYear()} Nexus Cyber
          </p>
        </div>
      </footer>
    </div>
  );
}
