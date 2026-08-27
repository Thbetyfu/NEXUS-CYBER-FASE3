'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Radio,
} from 'lucide-react';
import JobCoworkWidget from './JobCoworkWidget';
import {
  DEFAULT_PROTECTED_HOST,
  approveCoworkJob,
  downloadJobArtifact,
  errorMessage,
  isClosedJobStatus,
  statusTone,
  type ArtifactFormat,
} from '@/lib/gaas-labels';

interface GaasStatus {
  protected_host: string;
  live_target: string;
  bridge: 'online' | 'offline';
  job_count: number;
  pending_approval: number;
}

interface PendingJob {
  job_id: string;
  title: string;
  status: string;
  autonomy_level: string;
  target_url: string;
  defense_deltas?: Record<string, number>;
  residuals?: string[];
}

interface OperatorGaasConsoleProps {
  isLive: boolean;
  metrics: { allowed: number; blocked: number; honeypot: number };
  activeDomain: string;
  onOpenOps: (id: string) => void;
}

const OPS_SHORTCUTS = [
  { id: 'forensic-logs', label: 'Logs' },
  { id: 'ip-monitor', label: 'IP / Ban' },
  { id: 'system-status', label: 'Terminal' },
] as const;

export default function OperatorGaasConsole({
  isLive,
  metrics,
  activeDomain,
  onOpenOps,
}: OperatorGaasConsoleProps) {
  const [status, setStatus] = useState<GaasStatus | null>(null);
  const [pending, setPending] = useState<PendingJob[]>([]);
  const [closed, setClosed] = useState<PendingJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [st, jobsRes] = await Promise.all([
        fetch('/api/gaas/status', { cache: 'no-store' }),
        fetch('/api/jobs', { cache: 'no-store' }),
      ]);
      if (st.ok) setStatus(await st.json());
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        const jobs: PendingJob[] = Array.isArray(data.jobs) ? data.jobs : [];
        setPending(jobs.filter((j) => j.status === 'PENDING_APPROVAL'));
        setClosed(jobs.filter((j) => isClosedJobStatus(j.status)).slice(0, 6));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const runBusy = async (fn: () => Promise<void>, failFallback: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(errorMessage(e, failFallback));
    } finally {
      setBusy(false);
    }
  };

  const approve = (jobId: string) =>
    runBusy(async () => {
      await approveCoworkJob(jobId, 'operator-gaas-console');
      setMsg(`Disetujui: ${jobId}`);
      await refresh();
    }, 'Approve gagal');

  const downloadArtifact = (jobId: string, format: ArtifactFormat) =>
    runBusy(async () => {
      await downloadJobArtifact(jobId, format);
      setMsg(`Artefak ${format.toUpperCase()} diunduh`);
    }, 'Unduh gagal');

  const host = status?.protected_host || DEFAULT_PROTECTED_HOST;
  const bridgeOnline = status?.bridge === 'online';

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4 text-sm font-mono">
      <div className="rounded-xl border border-teal-500/25 bg-teal-950/30 px-4 py-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-teal-500/80 font-bold">
            Operator GaaS Console
          </p>
          <p className="text-teal-100 font-semibold mt-0.5">
            Kokpit internal Nexus — bukan dashboard pelanggan
          </p>
          <p className="text-xs text-teal-500/70 mt-1 max-w-2xl leading-relaxed">
            Alur A (tepi always-on) + Alur B (Job Cowork L0/L1) + Alur C (artefak). Portal Channel =
            etalase jual; SOC ini = dapur wasit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-teal-400/90 border border-teal-500/30 rounded-lg px-3 py-1.5 hover:bg-teal-900/40"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
          <div className="flex items-center gap-2 text-teal-400 text-[10px] uppercase tracking-widest font-bold">
            <Radio size={14} /> Kanal aktif
          </div>
          <p className="text-white text-base font-bold break-all">{host}</p>
          <p className="text-[11px] text-gray-500">
            Workspace UI: {activeDomain === 'all' ? 'semua (lab)' : activeDomain}
          </p>
          <p className="text-[11px] text-gray-500">
            Target Job default: {status?.live_target || 'http://127.0.0.1:8080'}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sky-400 text-[10px] uppercase tracking-widest font-bold">
            <Activity size={14} /> Tepi (Alur A)
          </div>
          <p className={`text-sm font-bold ${isLive ? 'text-emerald-400' : 'text-rose-400'}`}>
            Gateway {isLive ? 'LIVE' : 'OFFLINE'}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div>
              <p className="text-gray-500">Allowed</p>
              <p className="text-white font-bold">{metrics.allowed}</p>
            </div>
            <div>
              <p className="text-gray-500">Blocked</p>
              <p className="text-rose-300 font-bold">{metrics.blocked}</p>
            </div>
            <div>
              <p className="text-gray-500">Honeypot</p>
              <p className="text-amber-300 font-bold">{metrics.honeypot}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
          <div className="flex items-center gap-2 text-violet-300 text-[10px] uppercase tracking-widest font-bold">
            <Shield size={14} /> Wasit bridge
          </div>
          <p className={`text-sm font-bold ${bridgeOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            NEX-RED :3004 — {bridgeOnline ? 'online' : 'offline'}
          </p>
          <p className="text-[11px] text-gray-400">
            Jobs: {status?.job_count ?? 0} · Menunggu approve:{' '}
            <span className="text-sky-300 font-bold">{status?.pending_approval ?? 0}</span>
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {OPS_SHORTCUTS.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => onOpenOps(op.id)}
                className="text-[9px] uppercase tracking-wider px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white hover:border-white/25"
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sky-300 text-[10px] uppercase tracking-widest font-bold">
          <CheckCircle2 size={14} /> Antrian approve L0 / L1
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-sky-500/70">Tidak ada Job menunggu persetujuan manusia.</p>
        ) : (
          pending.map((job) => (
            <div
              key={job.job_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/25 bg-black/30 px-3 py-2"
            >
              <div>
                <p className="text-sky-100 font-semibold">{job.title}</p>
                <p className="text-[11px] text-sky-500/80">
                  {job.job_id} · {job.autonomy_level} · {job.target_url}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => approve(job.job_id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 disabled:opacity-50"
              >
                Approve {job.autonomy_level}
              </button>
            </div>
          ))
        )}
        {msg && <p className="text-xs text-amber-300/90">{msg}</p>}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
        <div className="flex items-center gap-2 text-amber-300/90 text-[10px] uppercase tracking-widest font-bold">
          <AlertTriangle size={14} /> Artefak risiko (Alur C)
        </div>
        <p className="text-[11px] text-gray-500">
          Unduh ringkasan untuk pemilik risiko kanal — bukan login mereka ke SOC.
        </p>
        {closed.length === 0 ? (
          <p className="text-xs text-gray-600">Belum ada Job tertutup. Jalankan Job di bawah.</p>
        ) : (
          closed.map((job) => (
            <div
              key={job.job_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded border ${statusTone(job.status)}`}>
                  {job.status}
                </span>
                <span className="text-gray-200 text-xs font-semibold">{job.title}</span>
                <span className="text-[10px] text-gray-500">{job.job_id}</span>
              </div>
              <div className="flex gap-1.5">
                {(['md', 'json'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={busy}
                    onClick={() => downloadArtifact(job.job_id, format)}
                    className={
                      format === 'md'
                        ? 'flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-teal-500/30 text-teal-300 hover:bg-teal-950/40 disabled:opacity-50'
                        : 'flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-white/15 text-gray-300 hover:bg-white/5 disabled:opacity-50'
                    }
                  >
                    <Download size={11} /> {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 overflow-hidden min-h-[320px]">
        <JobCoworkWidget compact />
      </div>
    </div>
  );
}
