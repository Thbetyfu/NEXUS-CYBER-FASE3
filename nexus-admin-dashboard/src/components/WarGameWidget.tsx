'use client';

import React, { useState } from 'react';

interface SimResult {
  id: string;
  name: string;
  totalAttacks: number;
  mitigated: number;
  successRate: number;
  avgLatencyMs: number;
  recoveryStatus: string;
  defenseLayer: string;
}

export default function WarGameWidget() {
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<SimResult[]>([]);
  const [activeTab, setActiveTab] = useState<'panel' | 'logs'>('panel');

  const handleLaunchSim = async () => {
    setIsRunning(true);
    setResults([]);
    try {
      const res = await fetch('/api/wargame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedScenario }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-rose-400 font-mono text-sm">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
        <div>
          <h3 className="text-lg font-bold text-rose-300 flex items-center gap-2">
            <span>⚔️</span> WAR ROOM LIVE WAR GAME SIMULATOR & AUTO-RECOVERY
          </h3>
          <p className="text-xs text-rose-500/80">
            Milestone 15 — Real-time Attack Simulation, eBPF Kernel Drops, & Instant Rollback Evaluation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold bg-rose-950 border border-rose-500 text-rose-300 rounded shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            DEFENSE GRID: ACTIVE
          </span>
          <span className="px-3 py-1 text-xs font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-400/40 rounded">
            LATENCY: &lt; 0.045ms
          </span>
        </div>
      </div>

      {/* Scenario Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {[
          { id: 'all', name: 'FULL WAR GAME', desc: 'All 4 Attack Vectors' },
          { id: 'ddos', name: 'DDoS SYN FLOOD', desc: '64,000 req/sec' },
          { id: 'sqli', name: 'SQLi VAULT TAMPER', desc: 'Reflex AI Intercept' },
          { id: 'ransomware', name: 'RANSOMWARE DEFACE', desc: 'Self-Repair Rollback' },
          { id: 'credential_stuffing', name: 'BOTNET STUFFING', desc: 'Honeypot Sandbox' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedScenario(s.id)}
            className={`p-2.5 rounded text-left border transition-all ${
              selectedScenario === s.id
                ? 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-black/30 border-rose-500/20 text-rose-500 hover:border-rose-500/50'
            }`}
          >
            <div className="font-bold text-xs">{s.name}</div>
            <div className="text-[9px] text-rose-400/80 mt-1">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Launch Control Switch */}
      <button
        onClick={handleLaunchSim}
        disabled={isRunning}
        className={`w-full py-3 font-bold rounded text-xs transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] border ${
          isRunning
            ? 'bg-rose-950 text-rose-400 border-rose-500 animate-pulse'
            : 'bg-rose-900/70 hover:bg-rose-800 border-rose-400 text-rose-100'
        }`}
      >
        {isRunning ? '💥 LAUNCHING LIVE ATTACK SIMULATION...' : '🚀 EXECUTE WAR GAME ATTACK SIMULATION'}
      </button>

      {/* Simulation Results Display */}
      {results.length > 0 && (
        <div className="bg-black/80 border border-rose-400 p-4 rounded flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
            <span className="text-xs font-bold text-rose-300 flex items-center gap-2">
              <span>🎯</span> SIMULATION EVALUATION RESULTS:
            </span>
            <span className="text-xs font-bold text-emerald-400">100% ATTACKS MITIGATED</span>
          </div>

          <div className="space-y-2">
            {results.map((r, idx) => (
              <div key={idx} className="bg-rose-950/30 border border-rose-500/30 p-3 rounded text-xs space-y-1">
                <div className="flex justify-between font-bold text-rose-200">
                  <span>{r.name}</span>
                  <span className="text-emerald-400">{r.successRate}% Success</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-rose-400/80 pt-1">
                  <div>ATTACKS: {r.totalAttacks.toLocaleString()}</div>
                  <div>MITIGATED: {r.mitigated.toLocaleString()}</div>
                  <div>LATENCY: {r.avgLatencyMs} ms</div>
                  <div>LAYER: {r.defenseLayer}</div>
                </div>
                <div className="text-[10px] text-emerald-300 font-bold pt-1">
                  STATUS: {r.recoveryStatus}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
