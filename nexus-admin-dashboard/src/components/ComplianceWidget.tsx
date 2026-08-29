'use client';

import React, { useState, useEffect } from 'react';
import { isGlobalWorkspace, workspaceTargetLabel } from '@/lib/gaas-labels';

interface Standard {
  id: string;
  name: string;
  score: number;
  status: string;
  clausesPassed: number;
}

interface ComplianceWidgetProps {
  activeDomain: string;
}

export default function ComplianceWidget({ activeDomain }: ComplianceWidgetProps) {
  const targetDomain = isGlobalWorkspace(activeDomain)
    ? 'portfolio.nexus-lab.test'
    : activeDomain;
  const [overallScore, setOverallScore] = useState<number>(100.0);
  const [grade, setGrade] = useState<string>('AAA (EXCELLENT)');
  const [standards, setStandards] = useState<Standard[]>([]);
  const [bssnStatus, setBssnStatus] = useState<string>('CONNECTED');
  const [threatCount, setThreatCount] = useState<number>(4);
  const [selectedStandard, setSelectedStandard] = useState<string>('ISO27001');
  const [exportedReport, setExportedReport] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    fetch(`/api/compliance?domain=${encodeURIComponent(targetDomain)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.overallScore) setOverallScore(data.overallScore);
        if (data.complianceGrade) setGrade(data.complianceGrade);
        if (data.standards) setStandards(data.standards);
        if (data.bssnSyncStatus) setBssnStatus(data.bssnSyncStatus);
        if (data.bssnThreatCount) setThreatCount(data.bssnThreatCount);
      })
      .catch(() => {});
  }, [targetDomain]);

  const handleExport = async (format: 'markdown' | 'json') => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard: selectedStandard,
          format,
          domain: targetDomain,
        }),
      });
      const data = await res.json();
      if (format === 'json') {
        setExportedReport(JSON.stringify(data, null, 2));
      } else if (data.content) {
        setExportedReport(data.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyReport = () => {
    if (exportedReport) {
      navigator.clipboard.writeText(exportedReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-cyan-400 font-mono text-sm">
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
        <div>
          <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
            <span>📋</span> BSSN THREAT INTEL & SOVEREIGN COMPLIANCE EXPORTER
          </h3>
          <p className="text-xs text-cyan-500/80">
            Milestone 14 Super-Phase — STIX/TAXII over Syslog TLS & ISO 27001 / UU PDP Audit Engine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold bg-cyan-950 border border-cyan-500 text-cyan-300 rounded shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            📡 BSSN FEED: {bssnStatus} ({threatCount} IPs)
          </span>
          <span className="px-3 py-1 text-xs font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded">
            SCORE: {overallScore}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-black/40 p-3 rounded border border-cyan-500/20 flex-wrap">
        <span className="text-xs text-cyan-500">AUDIT TARGET:</span>
        <span className="text-xs font-semibold text-cyan-200 font-mono">
          {isGlobalWorkspace(activeDomain)
            ? `Global Overwatch → default ${targetDomain}`
            : workspaceTargetLabel(activeDomain)}
        </span>
        <span className="text-xs font-bold text-emerald-400 ml-auto">GRADE: {grade}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {standards.map((std) => (
          <button
            key={std.id}
            onClick={() => setSelectedStandard(std.id)}
            className={`p-3 rounded text-left border transition-all ${
              selectedStandard === std.id
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-black/30 border-cyan-500/20 text-cyan-500 hover:border-cyan-500/50'
            }`}
          >
            <div className="font-bold text-xs">{std.name}</div>
            <div className="text-sm font-black text-emerald-400 mt-1">{std.score}% COMPLIANT</div>
            <div className="text-[10px] text-cyan-400/80 mt-1">{std.clausesPassed} Clauses Audited</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
          className="flex-1 py-2 bg-cyan-900/60 hover:bg-cyan-800/80 border border-cyan-400 text-cyan-200 font-bold rounded text-xs transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
        >
          {isExporting ? 'GENERATING REPORT...' : 'EXPORT AUDIT REPORT (MARKDOWN)'}
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="flex-1 py-2 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-400 text-emerald-200 font-bold rounded text-xs transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
        >
          {isExporting ? 'GENERATING REPORT...' : 'EXPORT AUDIT DATA (JSON)'}
        </button>
      </div>

      {exportedReport && (
        <div className="bg-black/80 border border-cyan-400 p-3 rounded flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300">
              📋 GENERATED COMPLIANCE REPORT OUTPUT:
            </span>
            <button
              onClick={handleCopyReport}
              className="px-2 py-0.5 text-[10px] bg-cyan-800 hover:bg-cyan-700 text-white rounded border border-cyan-400"
            >
              {copySuccess ? 'COPIED!' : 'COPY TO CLIPBOARD'}
            </button>
          </div>
          <pre className="text-xs p-3 rounded border border-cyan-500/40 text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-60 bg-black">
            {exportedReport}
          </pre>
        </div>
      )}
    </div>
  );
}
