"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, Globe, CreditCard, Package, RotateCcw, Shield, Sparkles, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlanCta } from "./Navbar";
import { PORTAL_DAFTAR, PORTAL_ORDER } from "@/lib/portal-config";

export type Audience = "umkm" | "bisnis";

type Plan = {
  name: string;
  tag: string | null;
  forWho: string;
  price: string;
  sub: string;
  popular: boolean;
  features: string[];
  cta: string;
  ctaLabel: string;
};

type QuizScores = { umkm: number; bisnis: number; integrator: boolean };

type QuizResult = {
  audience: Audience;
  planName: string;
  title: string;
  explanation: string;
};

const QUIZ_QUESTIONS = [
  {
    id: "website",
    question: "Apakah usaha Anda sudah punya website atau aplikasi online?",
    options: [
      { label: "Belum — masih offline / hanya WA/IG", score: { umkm: 2, bisnis: 0, integrator: false } },
      { label: "Sudah ada — web atau app sudah jalan", score: { umkm: 0, bisnis: 2, integrator: false } },
    ],
  },
  {
    id: "goal",
    question: "Apa yang paling Anda butuhkan sekarang?",
    options: [
      { label: "Biar pelanggan bisa lihat usaha di internet", score: { umkm: 2, bisnis: 0, integrator: false } },
      { label: "Pemeriksaan & laporan keamanan kanal digital", score: { umkm: 0, bisnis: 2, integrator: false } },
      { label: "Keduanya — tapi baru mau mulai dari website dulu", score: { umkm: 2, bisnis: 0, integrator: false } },
    ],
  },
  {
    id: "who",
    question: "Siapa yang mewakili Anda?",
    options: [
      { label: "Pemilik UMKM / warung / jasa", score: { umkm: 1, bisnis: 0, integrator: false } },
      { label: "Perusahaan / fintech / tim IT", score: { umkm: 0, bisnis: 2, integrator: false } },
      { label: "Agensi / integrator untuk banyak klien", score: { umkm: 0, bisnis: 1, integrator: true } },
    ],
  },
] as const;

const WORDS = ["website UMKM cepat.", "kanal digital aman.", "template siap jual."];

const FLOW_STEPS = [
  { icon: Package, label: "Jawab 3 pertanyaan", color: "var(--notion-blue)" },
  { icon: CreditCard, label: "Isi Kredit", color: "var(--notion-blue)" },
  { icon: CheckCircle2, label: "Tim proses", color: "var(--notion-green)" },
  { icon: Globe, label: "Selesai", color: "#8b5cf6" },
];

export const UMKM_PLANS: Plan[] = [
  {
    name: "Website UMKM",
    tag: "PALING LAKU",
    forWho: "Warung, jasa, profil usaha kecil — belum punya website.",
    price: "Rp 20.000",
    sub: "/ bulan",
    popular: true,
    features: [
      "Alamat situs: nama.nexus.id",
      "3 tampilan siap pakai (kuliner, jasa, profil)",
      "Isi data lewat form — tanpa coding",
      "Bukan paket keamanan / wasit",
    ],
    cta: PORTAL_ORDER,
    ctaLabel: "Isi Kredit",
  },
  {
    name: "Website Usaha",
    tag: null,
    forWho: "UMKM naik kelas — mau domain sendiri & halaman lebih banyak.",
    price: "Rp 49.000",
    sub: "/ bulan",
    popular: false,
    features: ["Domain sendiri (biaya domain terpisah)", "Halaman tambahan", "SEO dasar", "Support email"],
    cta: PORTAL_ORDER,
    ctaLabel: "Beli di portal",
  },
];

export const BISNIS_PLANS: Plan[] = [
  {
    name: "Keamanan Wasit (Job)",
    tag: "PILOT B2B",
    forWho: "Fintech, kanal digital, atau web yang sudah jalan — butuh bukti risiko sekali jalan.",
    price: "Rp 200.000",
    sub: "sekali · pilot PC+tunnel",
    popular: true,
    features: [
      "1 Job wasit + laporan risiko jujur",
      "Cek pelindung tepi vs server asli",
      "Persetujuan sebelum tindakan",
      "Hosting tahap awal di infrastruktur operator (bukan VPS)",
    ],
    cta: PORTAL_ORDER,
    ctaLabel: "Beli di portal",
  },
  {
    name: "Wasit Berkala (Loop)",
    tag: null,
    forWho: "Butuh pemeriksaan rutin — retainership bulanan untuk satu kanal.",
    price: "Rp 300.000",
    sub: "/ bulan · 1 host",
    popular: false,
    features: [
      "Semua fitur Job Wasit",
      "1 siklus Job / bulan (jadwal)",
      "Riwayat residual per host",
      "Harga maks daftar v1 (pilot)",
    ],
    cta: PORTAL_ORDER,
    ctaLabel: "Beli di portal",
  },
  {
    name: "Paket Integrator",
    tag: null,
    forWho: "Agensi / partner yang build untuk banyak klien — site + wasit.",
    price: "Custom",
    sub: "multi-klien",
    popular: false,
    features: ["Bangun kanal + opsi wasit", "Kontrak pisah: site vs keamanan", "Diskusi scope per klien"],
    cta: PORTAL_DAFTAR,
    ctaLabel: "Masuk portal",
  },
];

function computeResult(scores: QuizScores): QuizResult {
  if (scores.integrator && scores.bisnis >= scores.umkm) {
    return {
      audience: "bisnis",
      planName: "Paket Integrator",
      title: "Paket Integrator",
      explanation:
        "Anda mewakili agensi/integrator — cocok diskusi bundle build kanal + opsi wasit per klien, dengan kontrak terpisah.",
    };
  }
  if (scores.bisnis > scores.umkm) {
    return {
      audience: "bisnis",
      planName: "Keamanan Wasit (Job)",
      title: "Keamanan Wasit (Job)",
      explanation:
        "Kanal digital Anda sudah jalan dan fokus utamanya pemeriksaan risiko — mulai dari Job Wasit one-shot/pilot.",
    };
  }
  if (scores.umkm >= 4 && scores.umkm > scores.bisnis + 1) {
    return {
      audience: "umkm",
      planName: "Website UMKM",
      title: "Website UMKM",
      explanation: "Anda butuh tampil online dulu — paket Rp 20rb/bulan untuk website, tanpa wasit keamanan.",
    };
  }
  return {
    audience: "umkm",
    planName: "Website UMKM",
    title: "Website UMKM",
    explanation: "Langkah pertama yang paling masuk akal: website murah. Keamanan wasit bisa dibahas setelah situs jalan.",
  };
}

function HeroFlowVisual() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % FLOW_STEPS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const hints = [
    "Jawab 3 pertanyaan singkat — kami arahkan ke paket yang cocok.",
    "Isi form paket lalu Kredit (isi ulang pending). WhatsApp hanya on-prem.",
    "Tim Nexus proses — website ~1×24 jam; Job hosted = operator.",
    "Website dan keamanan = produk berbeda, harga berbeda.",
  ];

  return (
    <div className="hero-flow" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="hero-flow-track">
        {FLOW_STEPS.map((step, i) => {
          const isActive = i === active;
          return (
            <motion.div key={step.label} className="hero-flow-step" animate={{ opacity: isActive ? 1 : 0.5 }}>
              <motion.div
                className="hero-flow-icon"
                style={{
                  background: isActive ? step.color : "var(--notion-bg-hover)",
                  color: isActive ? "#fff" : "var(--notion-text-muted)",
                }}
                animate={isActive ? { y: [0, -4, 0] } : { y: 0 }}
                transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 1.2 }}
              >
                <step.icon size={22} />
              </motion.div>
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{step.label}</span>
              {i < FLOW_STEPS.length - 1 && <ArrowRight size={16} className="hero-flow-arrow" />}
            </motion.div>
          );
        })}
      </div>
      <motion.p key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16, fontSize: 13, color: "var(--notion-text-muted)" }}>
        {hints[active]}
      </motion.p>
    </div>
  );
}

function PlanCard({ plan, index, recommended }: { plan: Plan; index: number; recommended?: boolean }) {
  return (
    <motion.div
      id={recommended ? "paket-rekomendasi" : undefined}
      className="notion-pricing-card"
      style={{
        borderColor: recommended ? "var(--notion-green)" : plan.popular ? "var(--notion-blue)" : undefined,
        borderWidth: recommended || plan.popular ? 2 : undefined,
        boxShadow: recommended ? "0 0 0 4px var(--notion-green-bg)" : undefined,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
    >
      {recommended && (
        <div className="plan-tag" style={{ background: "var(--notion-green)", left: 24, right: "auto" }}>
          REKOMENDASI ANDA
        </div>
      )}
      {!recommended && plan.tag && (
        <div className="plan-tag" style={{ background: plan.popular ? "var(--notion-blue)" : "var(--notion-green)" }}>
          {plan.tag}
        </div>
      )}
      <div className="notion-pricing-card-title">{plan.name}</div>
      <p className="plan-for-who">{plan.forWho}</p>
      <div className="notion-pricing-card-price" style={plan.popular || recommended ? { color: recommended ? "var(--notion-green)" : "var(--notion-blue)" } : undefined}>
        {plan.price} <span>{plan.sub}</span>
      </div>
      <ul className="notion-pricing-features-list">
        {plan.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <PlanCta label={plan.ctaLabel} href={plan.cta} primary={recommended ?? plan.popular} />
    </motion.div>
  );
}

function NeedQuiz({
  onComplete,
}: {
  onComplete: (result: QuizResult) => void;
}) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<QuizScores>({ umkm: 0, bisnis: 0, integrator: false });

  const q = QUIZ_QUESTIONS[step];
  const progress = ((step + 1) / QUIZ_QUESTIONS.length) * 100;

  const pick = (score: QuizScores) => {
    const next = {
      umkm: scores.umkm + score.umkm,
      bisnis: scores.bisnis + score.bisnis,
      integrator: scores.integrator || score.integrator,
    };
    if (step < QUIZ_QUESTIONS.length - 1) {
      setScores(next);
      setStep(step + 1);
    } else {
      onComplete(computeResult(next));
    }
  };

  return (
    <div className="quiz-panel">
      <div className="quiz-header">
        <Sparkles size={18} style={{ color: "var(--notion-blue)" }} />
        <span>
          Pertanyaan {step + 1} dari {QUIZ_QUESTIONS.length}
        </span>
      </div>
      <div className="quiz-progress">
        <motion.div className="quiz-progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
          <h3 className="quiz-question">{q.question}</h3>
          <div className="quiz-options">
            {q.options.map((opt) => (
              <motion.button
                key={opt.label}
                type="button"
                className="quiz-option"
                onClick={() => pick(opt.score)}
                whileHover={{ scale: 1.01, borderColor: "var(--notion-blue)" }}
                whileTap={{ scale: 0.99 }}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      {step > 0 && (
        <button type="button" className="quiz-back" onClick={() => setStep(step - 1)}>
          ← Pertanyaan sebelumnya
        </button>
      )}
    </div>
  );
}

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIndex];
    const timer = setTimeout(() => {
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
    }, deleting ? 30 : 70);
    return () => clearTimeout(timer);
  }, [text, deleting, wordIndex]);

  return (
    <section className="text-center" style={{ padding: "40px 0 24px" }}>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 680, margin: "0 auto 0.75rem", fontWeight: 800, fontSize: "clamp(1.85rem, 5vw, 2.75rem)" }}
      >
        Butuh <span style={{ color: "var(--notion-blue)" }}>website</span> atau{" "}
        <span style={{ color: "var(--notion-green)" }}>keamanan</span> kanal digital?
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "var(--notion-text-muted)", maxWidth: 480, margin: "0 auto 1.5rem" }}>
        Jawab 3 pertanyaan singkat — kami arahkan ke paket yang cocok.
      </motion.p>
      <motion.a
        href="#harga"
        className="notion-button notion-button-primary"
        style={{ padding: "12px 32px", fontSize: 15, display: "inline-flex", alignItems: "center", marginBottom: "1.75rem" }}
      >
        Mulai — 3 pertanyaan
        <ArrowRight size={16} style={{ marginLeft: 8 }} />
      </motion.a>
      <HeroFlowVisual />
    </section>
  );
}

export function PricingSection() {
  const [mode, setMode] = useState<"quiz" | "manual">("quiz");
  const [audience, setAudience] = useState<Audience | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [highlightPlan, setHighlightPlan] = useState<string | null>(null);

  const plans = useMemo(
    () => (audience === "bisnis" ? BISNIS_PLANS : audience === "umkm" ? UMKM_PLANS : []),
    [audience],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const need = params.get("need");
    if (need === "umkm" || need === "bisnis") {
      setMode("manual");
      setAudience(need);
    }
  }, []);

  const applyQuizResult = (result: QuizResult) => {
    setQuizResult(result);
    setAudience(result.audience);
    setHighlightPlan(result.planName);
    setTimeout(() => {
      document.getElementById("paket-rekomendasi")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
  };

  const resetQuiz = () => {
    setQuizResult(null);
    setAudience(null);
    setHighlightPlan(null);
    setMode("quiz");
  };

  return (
    <section id="harga" style={{ padding: "40px 0 36px" }}>
      <div className="text-center" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginTop: 0, borderBottom: "none" }}>Temukan paket yang cocok</h2>
        <p style={{ color: "var(--notion-text-muted)", fontSize: 15, maxWidth: 520, margin: "0.5rem auto 0" }}>
          Mulai dari quiz singkat, atau pilih langsung jika sudah yakin.
        </p>
      </div>

      <div className="mode-tabs">
        <button type="button" className={`mode-tab ${mode === "quiz" ? "mode-tab-active" : ""}`} onClick={() => setMode("quiz")}>
          <Sparkles size={16} />
          Bantu pilih (3 pertanyaan)
        </button>
        <button type="button" className={`mode-tab ${mode === "manual" ? "mode-tab-active" : ""}`} onClick={() => setMode("manual")}>
          Saya sudah tahu
        </button>
      </div>

      {mode === "quiz" && !quizResult && <NeedQuiz onComplete={applyQuizResult} />}

      {mode === "quiz" && quizResult && (
        <motion.div className="quiz-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <CheckCircle2 size={32} style={{ color: "var(--notion-green)", marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>Rekomendasi: {quizResult.title}</h3>
          <p style={{ color: "var(--notion-text-muted)", margin: "0 0 16px", fontSize: 15 }}>{quizResult.explanation}</p>
          <button type="button" className="notion-button notion-button-text" onClick={resetQuiz} style={{ fontSize: 13 }}>
            <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Ulangi quiz
          </button>
        </motion.div>
      )}

      {mode === "manual" && (
        <>
          <div className="need-selector" style={{ marginTop: 20 }}>
            <motion.button
              type="button"
              className={`need-card ${audience === "umkm" ? "need-card-active" : ""}`}
              onClick={() => {
                setAudience("umkm");
                setHighlightPlan(null);
              }}
              whileHover={{ y: -3 }}
            >
              <Store size={28} style={{ color: "var(--notion-blue)", marginBottom: 10 }} />
              <strong>Website untuk usaha</strong>
              <span>UMKM — mulai Rp 20rb/bulan.</span>
            </motion.button>
            <motion.button
              type="button"
              className={`need-card ${audience === "bisnis" ? "need-card-active need-card-bisnis" : ""}`}
              onClick={() => {
                setAudience("bisnis");
                setHighlightPlan(null);
              }}
              whileHover={{ y: -3 }}
            >
              <Shield size={28} style={{ color: "var(--notion-green)", marginBottom: 10 }} />
              <strong>Keamanan & wasit</strong>
              <span>Bisnis — Job Rp 200rb · Loop Rp 300rb/bln.</span>
            </motion.button>
          </div>
        </>
      )}

      {audience && (mode === "manual" || quizResult) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
          <div className="audience-banner">
            {audience === "umkm" ? (
              <>
                <Building2 size={18} />
                <span>
                  <strong>Website</strong> — belum termasuk wasit keamanan.
                </span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>
                  <strong>Keamanan wasit</strong> — bukan website Rp 20rb.
                </span>
              </>
            )}
          </div>
          <div className="notion-pricing-grid" style={{ marginTop: 20 }}>
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} index={i} recommended={highlightPlan === plan.name} />
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}
