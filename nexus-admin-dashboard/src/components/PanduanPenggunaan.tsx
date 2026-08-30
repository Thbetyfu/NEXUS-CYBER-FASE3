'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Shield,
  Link2,
  Globe,
  Play,
  CheckCircle2,
  Download,
  Activity,
  Ban,
  Presentation,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

type SectionId =
  | 'apa-itu'
  | 'onboard'
  | 'workspace'
  | 'job'
  | 'approve'
  | 'ops'
  | 'juri'
  | 'kejujuran';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'apa-itu', label: 'Apa itu SOC', icon: Shield },
  { id: 'onboard', label: 'Onboard kanal', icon: Link2 },
  { id: 'workspace', label: 'Workspace', icon: Globe },
  { id: 'job', label: 'Job Cowork', icon: Play },
  { id: 'approve', label: 'Approve & artefak', icon: CheckCircle2 },
  { id: 'ops', label: 'Logs / Metrics / Ban', icon: Activity },
  { id: 'juri', label: 'Demo juri', icon: Presentation },
  { id: 'kejujuran', label: 'Batas jujur', icon: AlertTriangle },
];

function DiagramBox({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-teal-500/25 bg-black/40 p-4 overflow-x-auto ${className}`}
    >
      {children}
    </div>
  );
}

function StepCard({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-teal-900/60 border border-teal-500/40 flex items-center justify-center text-[11px] font-black text-teal-300">
        {n}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-teal-100 mb-1">{title}</p>
        <div className="text-[11px] text-gray-400 leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  );
}

function Callout({
  tone = 'teal',
  children,
}: {
  tone?: 'teal' | 'amber' | 'sky' | 'rose';
  children: React.ReactNode;
}) {
  const tones = {
    teal: 'border-teal-500/30 bg-teal-950/30 text-teal-200/90',
    amber: 'border-amber-500/30 bg-amber-950/30 text-amber-200/90',
    sky: 'border-sky-500/30 bg-sky-950/30 text-sky-200/90',
    rose: 'border-rose-500/30 bg-rose-950/30 text-rose-200/90',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** Alur pengunjung → WAF → origin (SVG). */
function FlowWafDiagram() {
  return (
    <DiagramBox>
      <p className="text-[9px] uppercase tracking-widest text-teal-500/80 font-bold mb-3">
        Alur A — tepi always-on
      </p>
      <svg viewBox="0 0 640 120" className="w-full min-w-[480px] h-auto" role="img" aria-label="Diagram alur WAF">
        <defs>
          <marker id="arrowTeal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#2dd4bf" />
          </marker>
        </defs>
        {[
          { x: 8, label: 'Pengunjung', sub: 'browser / tunnel' },
          { x: 168, label: 'Caddy / DNS', sub: 'di luar SOC' },
          { x: 328, label: 'WAF :8080', sub: 'Reflex + antibodi' },
          { x: 488, label: 'Origin', sub: 'portofolio / site' },
        ].map((b, i) => (
          <g key={b.label}>
            <rect
              x={b.x}
              y={28}
              width={130}
              height={56}
              rx={8}
              fill={i === 2 ? '#042f2e' : '#0a0e14'}
              stroke={i === 2 ? '#14b8a6' : '#334155'}
              strokeWidth={1.5}
            />
            <text x={b.x + 65} y={52} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
              {b.label}
            </text>
            <text x={b.x + 65} y={68} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="ui-monospace, monospace">
              {b.sub}
            </text>
            {i < 3 && (
              <line
                x1={b.x + 130}
                y1={56}
                x2={b.x + 168}
                y2={56}
                stroke="#2dd4bf"
                strokeWidth={1.5}
                markerEnd="url(#arrowTeal)"
              />
            )}
          </g>
        ))}
      </svg>
      <p className="text-[10px] text-gray-500 mt-2">
        Hostname lab default: <code className="text-teal-400">portfolio.nexus-lab.test</code> (
        <code className="text-teal-400">PROTECTED_HOST</code>). Klaim demo lewat host ini — bukan
        tembak origin mentah.
      </p>
    </DiagramBox>
  );
}

/** Siklus Job Cowork. */
function JobCycleDiagram() {
  return (
    <DiagramBox>
      <p className="text-[9px] uppercase tracking-widest text-emerald-500/80 font-bold mb-3">
        Alur B — siklus wasit Job Cowork
      </p>
      <svg viewBox="0 0 640 140" className="w-full min-w-[480px] h-auto" role="img" aria-label="Siklus Job Cowork">
        <defs>
          <marker id="arrowEm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
          </marker>
        </defs>
        {[
          { x: 10, y: 40, w: 100, label: 'Ukur', sub: 'defense delta' },
          { x: 140, y: 40, w: 110, label: 'Kendalikan', sub: 'antibodi L0/L1' },
          { x: 280, y: 40, w: 110, label: 'Uji', sub: 'vaccine / replay' },
          { x: 420, y: 20, w: 95, label: 'CLOSED_OK', sub: 'replay held', fill: '#052e16', stroke: '#34d399' },
          { x: 420, y: 78, w: 95, label: 'CLOSED_GAP', sub: 'replay_missed', fill: '#422006', stroke: '#fbbf24' },
        ].map((b, i) => (
          <g key={b.label}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={i >= 3 ? 42 : 56}
              rx={8}
              fill={b.fill || '#0a0e14'}
              stroke={b.stroke || '#10b981'}
              strokeWidth={1.5}
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + (i >= 3 ? 18 : 24)}
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
              fontWeight="700"
            >
              {b.label}
            </text>
            <text
              x={b.x + b.w / 2}
              y={b.y + (i >= 3 ? 32 : 40)}
              textAnchor="middle"
              fill="#64748b"
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              {b.sub}
            </text>
            {i < 2 && (
              <line
                x1={b.x + b.w}
                y1={68}
                x2={b.x + b.w + 28}
                y2={68}
                stroke="#34d399"
                strokeWidth={1.5}
                markerEnd="url(#arrowEm)"
              />
            )}
            {i === 2 && (
              <>
                <line x1={390} y1={55} x2={418} y2={40} stroke="#34d399" strokeWidth={1.2} markerEnd="url(#arrowEm)" />
                <line x1={390} y1={75} x2={418} y2={95} stroke="#fbbf24" strokeWidth={1.2} />
              </>
            )}
          </g>
        ))}
        <text x={535} y={42} fill="#94a3b8" fontSize="8" fontFamily="ui-monospace, monospace">
          hijau jujur
        </text>
        <text x={535} y={100} fill="#94a3b8" fontSize="8" fontFamily="ui-monospace, monospace">
          residual eksplisit
        </text>
      </svg>
    </DiagramBox>
  );
}

/** Context-Aware workspace. */
function WorkspaceDiagram() {
  return (
    <DiagramBox>
      <p className="text-[9px] uppercase tracking-widest text-sky-400/80 font-bold mb-3">
        Context-Aware — semua jendela mengunci ke workspace
      </p>
      <svg viewBox="0 0 640 160" className="w-full min-w-[480px] h-auto" role="img" aria-label="Diagram workspace">
        <rect x="200" y="8" width="240" height="36" rx="8" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="320" y="30" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
          Domain Switcher (taskbar)
        </text>
        <line x1="320" y1="44" x2="320" y2="70" stroke="#38bdf8" strokeWidth="1.5" />
        <rect x="180" y="70" width="280" height="28" rx="6" fill="#082f49" stroke="#0ea5e9" strokeWidth="1" />
        <text x="320" y="88" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="ui-monospace, monospace">
          Active Workspace = portfolio.nexus-lab.test
        </text>
        {[
          { x: 20, label: 'Job Cowork' },
          { x: 140, label: 'Logs' },
          { x: 240, label: 'Metrics' },
          { x: 350, label: 'IP / Ban' },
          { x: 460, label: 'Artefak' },
        ].map((b) => (
          <g key={b.label}>
            <line x1="320" y1="98" x2={b.x + 50} y2="120" stroke="#334155" strokeWidth="1" />
            <rect x={b.x} y="120" width="100" height="28" rx="6" fill="#0a0e14" stroke="#475569" strokeWidth="1" />
            <text x={b.x + 50} y="138" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="ui-monospace, monospace">
              {b.label}
            </text>
          </g>
        ))}
      </svg>
      <Callout tone="amber">
        Mode <strong>Global Overwatch</strong> (<code>all</code>) = pantau gabungan. Tombol{' '}
        <strong>Start Job</strong> dinonaktifkan sampai Anda memilih satu workspace kanal.
      </Callout>
    </DiagramBox>
  );
}

/** Demo juri — jangan tunnel SOC. */
function JuryDiagram() {
  return (
    <DiagramBox>
      <p className="text-[9px] uppercase tracking-widest text-violet-400/80 font-bold mb-3">
        Demo juri — yang di-tunnel vs yang tetap lokal
      </p>
      <svg viewBox="0 0 640 150" className="w-full min-w-[480px] h-auto" role="img" aria-label="Diagram demo juri">
        <rect x="20" y="20" width="200" height="110" rx="10" fill="#1a1025" stroke="#a78bfa" strokeWidth="1.5" />
        <text x="120" y="45" textAnchor="middle" fill="#ddd6fe" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
          Publik (tunnel OK)
        </text>
        <text x="120" y="70" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontFamily="ui-monospace, monospace">
          WAF :8080
        </text>
        <text x="120" y="90" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="ui-monospace, monospace">
          PROTECTED_HOST
        </text>
        <text x="120" y="110" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="ui-monospace, monospace">
          origin di belakang WAF
        </text>

        <rect x="420" y="20" width="200" height="110" rx="10" fill="#1c1010" stroke="#f87171" strokeWidth="1.5" />
        <text x="520" y="45" textAnchor="middle" fill="#fecaca" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
          Jangan di-tunnel
        </text>
        <text x="520" y="70" textAnchor="middle" fill="#fca5a5" fontSize="10" fontFamily="ui-monospace, monospace">
          SOC :3001
        </text>
        <text x="520" y="90" textAnchor="middle" fill="#fca5a5" fontSize="10" fontFamily="ui-monospace, monospace">
          Control plane :8081
        </text>
        <text x="520" y="110" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="ui-monospace, monospace">
          DB / kokpit operator
        </text>

        <text x="320" y="75" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-monospace, monospace">
          ≠
        </text>
      </svg>
      <p className="text-[10px] text-gray-500 mt-2">
        Skrip: <code className="text-violet-300">deploy-local/jury/START-FOR-JURY.bat</code> — lihat juga
        DISTRIBUTION_PILOT / PC_MAIN_SERVER.
      </p>
    </DiagramBox>
  );
}

function SectionApaItu() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Apa itu SOC Operator?</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">
        <strong className="text-teal-200">SOC / Operator GaaS Console</strong> adalah kokpit{' '}
        <em>internal Nexus</em> — bukan dashboard pelanggan, bukan Channel Portal, bukan etalase jual.
        Di sini operator mendaftarkan kanal, menjalankan Job Cowork (wasit HTTP), menyetujui aksi L0/L1,
        dan mengunduh artefak untuk pemilik risiko.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Callout tone="teal">
          <strong>Ya:</strong> operator Nexus · Job wasit · tepi WAF · artefak MD/JSON · ban IP lab
        </Callout>
        <Callout tone="rose">
          <strong>Bukan:</strong> login klien · self-serve CNAME massal · SOC otonom 24/7 · Channel
          Starter UMKM
        </Callout>
      </div>
      <FlowWafDiagram />
      <Callout tone="sky">
        Produk inti yang sulit ditiru cepat: siklus Job (ukur → kendalikan → uji → tutup jujur), bukan
        UI portal atau harga.
      </Callout>
    </div>
  );
}

function SectionOnboard() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Onboard kanal (Origin + Protected host)</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">
        Di <strong className="text-teal-200">GaaS Console</strong> → bagian <em>Onboard kanal</em>. Form
        hanya dua field — DNS/tunnel dikonfigurasi di luar SOC.
      </p>
      <div className="space-y-2">
        <StepCard n={1} title="Origin URL *">
          Backend asli situs (contoh Vercel atau origin lab). WAF akan mem-proxy ke sini.
        </StepCard>
        <StepCard n={2} title="Protected host / custom domain">
          Hostname yang dilihat pengunjung lewat WAF. Default lab:{' '}
          <code className="text-teal-400">portfolio.nexus-lab.test</code>. Opsional — kosongkan untuk
          default.
        </StepCard>
        <StepCard n={3} title="Daftarkan lewat WAF">
          Memanggil <code className="text-teal-400">POST /api/routes</code>. Workspace baru muncul di
          Domain Switcher dan otomatis dipilih (Context-Aware).
        </StepCard>
        <StepCard n={4} title="DNS / tunnel di luar SOC">
          Pilot = PC + tunnel ke WAF. Tidak ada auto-provision Docker dari form ini. Bukan Midtrans /
          CNAME massal self-serve.
        </StepCard>
      </div>
      <Callout tone="amber">
        Origin privat (lab/localhost) butuh{' '}
        <code className="text-amber-100">NEXUS_ALLOW_PRIVATE_ORIGINS=true</code> di gateway.
      </Callout>
    </div>
  );
}

function SectionWorkspace() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Active Workspace = Context-Aware</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">
        Switcher di taskbar adalah <strong className="text-sky-200">Single Source of Truth</strong>.
        Semua jendela wasit (Job, Logs, Metrics, IP/Ban, Artefak) mengunci ke protected host yang
        dipilih.
      </p>
      <WorkspaceDiagram />
      <div className="space-y-2">
        <StepCard n={1} title="Pilih workspace kanal">
          Bukan &quot;Global Overwatch&quot; — pilih host seperti{' '}
          <code className="text-teal-400">portfolio.nexus-lab.test</code>.
        </StepCard>
        <StepCard n={2} title="Badge Target">
          Muncul <code className="text-teal-400">Target: host (via WAF)</code>. Job menembak protected
          host lewat WAF — bukan origin mentah pelanggan.
        </StepCard>
        <StepCard n={3} title="Tambah workspace">
          Tombol + di switcher membuka form rute (tanpa Docker auto). Atau pakai Onboard di GaaS
          Console.
        </StepCard>
      </div>
    </div>
  );
}

function SectionJob() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Job Cowork lewat WAF</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">
        Buka jendela <strong className="text-emerald-200">Job Cowork</strong> atau panel di GaaS
        Console. Pastikan NEX-RED bridge <code className="text-emerald-400">:3004</code> online.
      </p>
      <JobCycleDiagram />
      <div className="space-y-2">
        <StepCard n={1} title="Pilih workspace (wajib)">
          Global Overwatch <strong>tidak</strong> bisa Start Job — pilih kanal dulu.
        </StepCard>
        <StepCard n={2} title="Judul + tingkat otonomi">
          <strong>L0</strong> = artefak saja (ukur/lapor). <strong>L1</strong> = aksi tepi + replay —
          butuh approve manusia sebelum langkah merusak bisnis.
        </StepCard>
        <StepCard n={3} title="Start Job Cowork">
          Payload <code className="text-emerald-400">target_url = http://&#123;protected_host&#125;</code>{' '}
          (via WAF). Twin origin_direct hanya dipakai wasit internal untuk defense delta — bukan dari
          UI operator.
        </StepCard>
      </div>
      <Callout tone="rose">
        Jangan klaim &quot;Nexus melindungi&quot; jika scan/demo menembak origin Vercel langsung tanpa
        lewat PROTECTED_HOST / WAF.
      </Callout>
    </div>
  );
}

function SectionApprove() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Approve L0/L1 & unduh artefak</h3>
      <div className="space-y-2">
        <StepCard n={1} title="Antrian PENDING_APPROVAL">
          Di GaaS Console atau kartu Job — tombol <strong>Approve L0/L1</strong> mengesahkan gerbang
          manusia (pemilik risiko).
        </StepCard>
        <StepCard n={2} title="Status tutup">
          <code className="text-emerald-400">CLOSED_OK</code> = replay tetap ditahan.{' '}
          <code className="text-amber-400">CLOSED_GAP</code> / <code className="text-amber-400">PARTIAL</code>{' '}
          = residual (mis. <code>replay_missed</code>) — bukan hijau palsu.
        </StepCard>
        <StepCard n={3} title="Unduh MD / JSON">
          Alur C: artefak Job (delta/replay) plus <strong>digest insiden</strong> dari ThreatLog
          per workspace — untuk pemilik risiko kanal. Mereka <em>tidak</em> login ke SOC — Anda
          kirimkan file. Global Overwatch tidak mengunduh digest.
        </StepCard>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border border-teal-500/30 text-teal-300">
          <Download size={11} /> Export MD
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border border-white/15 text-gray-300">
          <Download size={11} /> Export JSON
        </span>
      </div>
    </div>
  );
}

function SectionOps() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Logs, Metrics, IP / Ban</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">
        Telemetri tepi (Alur A) — terikat workspace yang sama. Pintasan ada di GaaS Console dan
        taskbar. Digest insiden (MD/JSON, 24 jam–7 hari) di Konsol GaaS / jendela Artefak.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-center gap-2 text-teal-400 text-[10px] uppercase tracking-widest font-bold mb-2">
            <Activity size={12} /> Logs forensik
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Aliran request real-time: IP, endpoint, Allowed/Dropped. Filter baris di header jendela.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-center gap-2 text-sky-400 text-[10px] uppercase tracking-widest font-bold mb-2">
            <Activity size={12} /> Metrics
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Allowed / Blocked / Honeypot + counter drop tepi (lab). Bukan klaim eBPF/XDP kernel nyata.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-center gap-2 text-rose-400 text-[10px] uppercase tracking-widest font-bold mb-2">
            <Ban size={12} /> IP / Ban
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Pantau aktivitas IP; ban manual → gateway 403. Daftar ban tetap global di gateway (bukan
            per-workspace).
          </p>
        </div>
      </div>
      <Callout tone="sky">
        Panic / System Purge di taskbar = aksi darurat operator. Konfirmasi dua kali sebelum purge
        workspace atau reset sistem.
      </Callout>
    </div>
  );
}

function SectionJuri() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Demo juri / pitching</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">
        Tunjukkan mesin wasit pada <strong className="text-violet-200">PROTECTED_HOST</strong> (atau
        setara), bukan hanya landing Channel Portal.
      </p>
      <JuryDiagram />
      <div className="space-y-2">
        <StepCard n={1} title="Start lab">
          Offline origin: <code className="text-violet-300">deploy-local/START-OFFLINE.bat</code>.
          Vercel di belakang WAF: <code className="text-violet-300">START.bat</code>. Untuk juri:{' '}
          <code className="text-violet-300">START-FOR-JURY.bat</code>.
        </StepCard>
        <StepCard n={2} title="Tunnel hanya tepi">
          Publikasikan WAF / protected host. <strong>Jangan</strong> tunnel SOC{' '}
          <code>:3001</code> atau control plane <code>:8081</code>.
        </StepCard>
        <StepCard n={3} title="Narasi jujur">
          Tunjukkan CLOSED_GAP jika replay_missed — residual eksplisit lebih kredibel daripada hijau
          palsu.
        </StepCard>
      </div>
    </div>
  );
}

function SectionKejujuran() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-teal-100">Batas produk — kejujuran pilot</h3>
      <div className="space-y-2">
        <Callout tone="amber">
          <strong>CLOSED_GAP</strong> / residual = Job belum &quot;selesai hijau&quot;. Jangan ubah
          narasi menjadi CLOSED_OK jika <code>replay_missed</code>.
        </Callout>
        <Callout tone="rose">
          <strong>Bukan SOC 24/7 otonom.</strong> Tepi always-on + Job terjadwal + operator manusia.
          Otonomi terbatas L0/L1.
        </Callout>
        <Callout tone="sky">
          <strong>Channel Starter</strong> (~Rp 0–29rb entry UMKM) = jalur produk terpisah
          (form+template). Bukan Loop GaaS penuh di harga Rp 20rb. Portal Channel = etalase; SOC =
          dapur wasit.
        </Callout>
        <Callout tone="teal">
          <strong>Pilot hosting:</strong> PC operator + tunnel — bukan SLA data center. Pembayaran
          otomatis / F-10 back-office ditunda kecuali pemilik minta.
        </Callout>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Referensi: <code>docs/PRODUCT_MODEL.md</code>, <code>docs/CAPABILITIES.md</code>,{' '}
        <code>docs/LIMITATIONS.md</code>, <code>docs/DISTRIBUTION_PILOT.md</code>.
      </p>
    </div>
  );
}

const SECTION_BODY: Record<SectionId, React.FC> = {
  'apa-itu': SectionApaItu,
  onboard: SectionOnboard,
  workspace: SectionWorkspace,
  job: SectionJob,
  approve: SectionApprove,
  ops: SectionOps,
  juri: SectionJuri,
  kejujuran: SectionKejujuran,
};

export default function PanduanPenggunaan() {
  const [active, setActive] = useState<SectionId>('apa-itu');
  const Body = SECTION_BODY[active];

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden text-sm font-mono bg-[#06090e]">
      {/* Nav */}
      <nav className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-teal-500/15 bg-black/40 overflow-x-auto md:overflow-y-auto">
        <div className="px-3 py-3 border-b border-teal-500/15 flex items-center gap-2 sticky top-0 bg-[#06090e]/95 z-10">
          <BookOpen size={14} className="text-teal-400" />
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-teal-500/80 font-bold">Panduan</p>
            <p className="text-[10px] text-teal-200/80">Operator pilot</p>
          </div>
        </div>
        <ul className="flex md:flex-col gap-0.5 p-2 min-w-max md:min-w-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const on = active === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                    on
                      ? 'bg-teal-500/15 text-teal-200 border border-teal-500/30'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon size={13} className={on ? 'text-teal-400' : 'text-gray-600'} />
                  <span className="text-[10px] font-bold tracking-wide flex-1">{s.label}</span>
                  {on && <ChevronRight size={12} className="text-teal-500/70 hidden md:block" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-5">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-500/80 font-bold">
              Panduan Penggunaan — Bahasa Indonesia
            </p>
            <p className="text-teal-100 text-xs font-semibold mt-0.5">
              Alur operator GaaS: onboard → workspace → Job → approve → artefak
            </p>
          </div>
          <Body />
        </div>
      </div>
    </div>
  );
}
