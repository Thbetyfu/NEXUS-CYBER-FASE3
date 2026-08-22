'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { gatewayURL } from '@/config';

interface CoworkJob {
  job_id: string;
  title: string;
  target_url: string;
  status: string;
  autonomy_level: string;
  defense_deltas: Record<string, number>;
  residuals: string[];
  antibody_loop_ok: boolean | null;
}

export default function JobCoworkWidget() {
  const [jobs, setJobs] = useState<CoworkJob[]>([]);
  const [title, setTitle] = useState('Weekly wasit');
  const [targetUrl, setTargetUrl] = useState('http://127.0.0.1:8080');
  const [autonomy, setAutonomy] = useState<'L0' | 'L1'>('L0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [storage, setStorage] = useState<string>('file');

  const refresh = useCallback(async () => {
    try {
      const gw = await fetch(gatewayURL('/api/jobs'), { credentials: 'include' });
      if (gw.ok) {
        const data = await gw.json();
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setStorage(data.storage || 'postgres');
          return;
        }
      }
    } catch {
      /* fallback */
    }
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
        setStorage(data.bridge === 'online' ? 'bridge' : 'offline');
      }
    } catch {
      setJobs([]);
      setStorage('offline');
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const startJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, target_url: targetUrl, autonomy_level: autonomy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start job');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Job start failed');
    } finally {
      setLoading(false);
    }
  };

  const approveJob = async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, operator: 'command-center' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-emerald-400 font-mono text-sm h-full overflow-auto">
      <div className="border-b border-emerald-500/30 pb-3">
        <h3 className="text-lg font-bold text-emerald-300">Job Cowork — GaaS Wasit</h3>
        <p className="text-xs text-emerald-500/80">
          Alur B: ukur → gerbang L0/L1 → tutup jujur · storage: {storage}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          className="bg-black/40 border border-emerald-500/30 rounded px-2 py-1 text-emerald-200"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Job title"
        />
        <input
          className="bg-black/40 border border-emerald-500/30 rounded px-2 py-1 text-emerald-200 md:col-span-2"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Target URL"
        />
        <select
          className="bg-black/40 border border-emerald-500/30 rounded px-2 py-1"
          value={autonomy}
          onChange={(e) => setAutonomy(e.target.value as 'L0' | 'L1')}
        >
          <option value="L0">L0 — artefak saja</option>
          <option value="L1">L1 — tepi + replay</option>
        </select>
      </div>

      <button
        onClick={startJob}
        disabled={loading}
        className="px-4 py-2 rounded bg-emerald-900/50 border border-emerald-400/40 hover:bg-emerald-800/50 disabled:opacity-50 w-fit"
      >
        {loading ? 'Running…' : 'Start Job Cowork'}
      </button>

      {error && <p className="text-rose-400 text-xs">{error}</p>}

      <div className="space-y-2">
        {jobs.length === 0 && (
          <p className="text-emerald-600 text-xs">No jobs — start NEX-RED bridge on :3004</p>
        )}
        {jobs.map((job) => (
          <div
            key={job.job_id}
            className="border border-emerald-500/20 rounded p-3 bg-black/30 flex flex-col gap-2"
          >
            <div className="flex justify-between gap-2 flex-wrap">
              <span className="font-bold text-emerald-200">{job.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
                {job.status}
              </span>
            </div>
            <div className="text-xs text-emerald-500/90">
              {job.job_id} · {job.target_url} · {job.autonomy_level}
            </div>
            {Object.keys(job.defense_deltas || {}).length > 0 && (
              <div className="text-xs">
                Delta:{' '}
                {Object.entries(job.defense_deltas)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ')}
              </div>
            )}
            {job.residuals?.length > 0 && (
              <div className="text-amber-400 text-xs">Residual: {job.residuals.join(', ')}</div>
            )}
            {job.status === 'PENDING_APPROVAL' && (
              <button
                onClick={() => approveJob(job.job_id)}
                disabled={loading}
                className="text-xs px-3 py-1 rounded border border-amber-500/40 text-amber-300 w-fit hover:bg-amber-950/40"
              >
                Approve ({job.autonomy_level})
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
