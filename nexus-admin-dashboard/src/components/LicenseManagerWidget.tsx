'use client';

import React, { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  cores: number;
  price: string;
  features: string[];
}

export default function LicenseManagerWidget() {
  const [activePlan, setActivePlan] = useState<string>('ultrasafe');
  const [activeKey, setActiveKey] = useState<string>('NXS-ULTRASAFE-ENTERPRISE-DEV-KEY');
  const [domain, setDomain] = useState<string>('kemenkeu.go.id');
  const [cores, setCores] = useState<number>(16);
  const [isB2G, setIsB2G] = useState<boolean>(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [poCode, setPoCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) setActivePlan(data.plan);
        if (data.licenseKey) setActiveKey(data.licenseKey);
        if (data.domain) setDomain(data.domain);
        if (data.coresAllowed) setCores(data.coresAllowed);
        if (data.isB2G !== undefined) setIsB2G(data.isB2G);
        if (data.plans) setPlans(data.plans);
      })
      .catch(() => {});
  }, []);

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          domain,
          tier: activePlan,
          cores,
          poCode,
        }),
      });
      const data = await res.json();
      if (data.licenseKey) {
        setGeneratedKey(data.licenseKey);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-emerald-400 font-mono text-sm">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
        <div>
          <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
            <span>🔑</span> LICENSE & COMMERCIAL SUBSCRIPTION ENGINE
          </h3>
          <p className="text-xs text-emerald-500/80">
            Milestone 11 Dual-Engine Licensing — B2B/B2G Software-Only CPU Core Scheme
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isB2G && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-950 border border-emerald-500 text-emerald-300 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              🏛️ B2G GOV/EDU RECOGNIZED
            </span>
          )}
          <span className="px-3 py-1 text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded">
            TIER: {activePlan}
          </span>
        </div>
      </div>

      {/* Active License Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-black/40 p-3 rounded border border-emerald-500/20">
        <div>
          <span className="text-xs text-emerald-500">TARGET DOMAIN</span>
          <p className="text-sm font-semibold text-emerald-200">{domain}</p>
        </div>
        <div>
          <span className="text-xs text-emerald-500">MAX CPU CORES</span>
          <p className="text-sm font-semibold text-emerald-200">{cores} Cores Allowed</p>
        </div>
        <div>
          <span className="text-xs text-emerald-500">STATUS</span>
          <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE & SIGNED
          </p>
        </div>
      </div>

      {/* 5-Tier Subscription Selector */}
      <div>
        <h4 className="text-xs font-semibold text-emerald-400 mb-2">
          SELECT SUBSCRIPTION TIER (5 TIERS)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlan(p.id)}
              className={`p-2.5 rounded text-left border transition-all ${
                activePlan === p.id
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-black/30 border-emerald-500/20 text-emerald-500 hover:border-emerald-500/50'
              }`}
            >
              <div className="font-bold text-xs">{p.name}</div>
              <div className="text-[10px] text-emerald-400/80 mt-1">{p.price}</div>
              <div className="text-[9px] text-emerald-500 mt-1">{p.cores} Cores Max</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generator & B2G PO Activation Form */}
      <form onSubmit={handleGenerateLicense} className="bg-black/50 p-4 rounded border border-emerald-500/30 flex flex-col gap-3">
        <h4 className="text-xs font-bold text-emerald-300 border-b border-emerald-500/20 pb-1">
          ⚙️ ANNUAL LICENSE KEY GENERATOR & B2G PO BYPASS
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-emerald-500 block mb-1">Target Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-black border border-emerald-500/40 rounded px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
              placeholder="e.g. kemenkeu.go.id"
            />
          </div>

          <div>
            <label className="text-xs text-emerald-500 block mb-1">CPU Cores Limit</label>
            <input
              type="number"
              value={cores}
              onChange={(e) => setCores(Number(e.target.value))}
              className="w-full bg-black border border-emerald-500/40 rounded px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
              min={1}
              max={128}
            />
          </div>

          <div>
            <label className="text-xs text-emerald-500 block mb-1">B2G PO / LKPP Code (Optional)</label>
            <input
              type="text"
              value={poCode}
              onChange={(e) => setPoCode(e.target.value)}
              className="w-full bg-black border border-emerald-500/40 rounded px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
              placeholder="e.g. PO-LKPP-2026-GOV-091"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-2 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-400 text-emerald-200 font-bold rounded text-xs transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
        >
          {isGenerating ? 'GENERATING SIGNED KEY...' : 'GENERATE ANNUAL ENTERPRISE LICENSE KEY'}
        </button>
      </form>

      {/* Generated License Output */}
      {generatedKey && (
        <div className="bg-emerald-950/40 border border-emerald-400 p-3 rounded flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">
              🔑 GENERATED LICENSE KEY (HMAC SIGNED):
            </span>
            <button
              onClick={handleCopyKey}
              className="px-2 py-0.5 text-[10px] bg-emerald-800 hover:bg-emerald-700 text-white rounded border border-emerald-400"
            >
              {copySuccess ? 'COPIED!' : 'COPY KEY'}
            </button>
          </div>
          <p className="text-xs break-all bg-black/80 p-2 rounded border border-emerald-500/40 text-emerald-300 font-mono">
            {generatedKey}
          </p>
        </div>
      )}
    </div>
  );
}
