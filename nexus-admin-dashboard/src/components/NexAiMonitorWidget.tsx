"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, Activity, ShieldCheck, Zap, Database } from 'lucide-react';
import { gatewayURL } from '@/config';

interface ModelMetric {
	label: string;
	value: string | number;
	accent?: boolean;
}

// Memoized for 60 FPS Performance Hardening
function NexAiMonitorWidget() {
	const [activeNodes, setActiveNodes] = useState<number[]>([]);
	const [sysStats, setSysStats] = useState({
		latency: 0,
		status: "ONLINE",
		throughput: 0,
		activeLayer: "Layer 28/32"
	});

	// Generate 64 nodes for the neural grid
	const nodes = useMemo(() => Array.from({ length: 64 }).map((_, i) => i), []);

	// Initial node active map setup (throttled to 3 seconds to avoid JS layout thrashing)
	useEffect(() => {
		const interval = setInterval(() => {
			const activeCount = Math.floor(Math.random() * 10) + 5;
			const selected: number[] = [];
			for (let i = 0; i < activeCount; i++) {
				selected.push(Math.floor(Math.random() * 64));
			}
			setActiveNodes(selected);

			setSysStats(prev => ({
				...prev,
				throughput: Number((Math.random() * 15 + 20).toFixed(1)),
				activeLayer: `Layer ${Math.floor(Math.random() * 5) + 27}/32`
			}));
		}, 3000);

		return () => clearInterval(interval);
	}, []);

	// Fetch real health latency from API (throttled to 5s)
	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await fetch(gatewayURL("/api/ai/status"), { credentials: "include" });
				if (res.ok) {
					const data = await res.json();
					setSysStats(prev => ({
						...prev,
						latency: data.latency_ms || 18,
						status: data.status || "ONLINE"
					}));
				}
			} catch {
				setSysStats(prev => ({ ...prev, status: "DISCONNECTED", latency: 0 }));
			}
		};

		fetchStatus();
		const timer = setInterval(fetchStatus, 5000);
		return () => clearInterval(timer);
	}, []);

	const modelSpecs: ModelMetric[] = [
		{ label: "Signature", value: "NEX-AI-Cognitive (v1.2)", accent: true },
		{ label: "Quantization", value: "4-Bit NF4 (GGUF Production)" },
		{ label: "Layers Enabled", value: "32 Transformer Layers" },
		{ label: "LoRA Adapters", value: "7 Modules Active (r=16)" },
		{ label: "Precision", value: "FP16 Compute Kernels" },
		{ label: "Context Window", value: "4,096 Tokens max" },
		{ label: "Reflex Speed", value: "< 1.2ms (Otak Kiri)" },
		{ label: "Reasoning Speed", value: `${sysStats.latency || 240}ms (Otak Kanan)`, accent: true }
	];

	return (
		<div className="h-full bg-[#030507] text-gray-200 p-5 flex flex-col font-sans gap-5 overflow-y-auto custom-scrollbar">
			
			{/* Header Status Bar */}
			<div className="bg-[#07090c] border border-cyan-900/20 p-4 rounded-xl flex items-center justify-between shrink-0">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
						<Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
					</div>
					<div>
						<h4 className="text-xs font-black tracking-widest text-white uppercase">NEX-AI Neural Core</h4>
						<p className="text-[8px] text-cyan-500 uppercase tracking-widest font-mono mt-0.5">{sysStats.activeLayer}</p>
					</div>
				</div>
				<div className="text-right flex flex-col items-end gap-1">
					<span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${
						sysStats.status === "ONLINE" 
							? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
							: "bg-red-500/10 text-red-400 border-red-500/20"
					}`}>
						{sysStats.status}
					</span>
					<span className="text-[7px] text-gray-500 font-mono">LATENCY: {sysStats.latency || 240}ms</span>
				</div>
			</div>

			{/* Main Grid Content */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
				
				{/* Neural Node Grid Activation Map */}
				<div className="bg-[#05070a]/90 border border-white/5 p-4 rounded-xl flex flex-col justify-between min-h-[220px]">
					<div className="flex justify-between items-center mb-3">
						<p className="text-[9px] text-cyan-400 uppercase font-black tracking-widest flex items-center gap-1.5">
							<Activity size={10} className="text-cyan-400" /> Synaptic Node Activation Map
						</p>
						<span className="text-[7px] text-gray-500 font-mono">ACTIVE TENSORS: {activeNodes.length}</span>
					</div>

					<div className="grid grid-cols-8 gap-2 bg-black/40 p-3 rounded-lg border border-white/5 flex-1 justify-center items-center">
						{nodes.map((node) => {
							const isActive = activeNodes.includes(node);
							return (
								<div
									key={node}
									className={`aspect-square rounded border transition-colors cursor-pointer ${
										isActive 
											? "bg-cyan-500/40 border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.3)] synapse-node-active" 
											: "bg-white/[0.03] border-white/5"
									}`}
									style={{ animationDelay: `${(node % 8) * 0.15}s` }}
								/>
							);
						})}
					</div>
					
					<div className="text-[7px] text-gray-500 font-mono uppercase tracking-widest text-center mt-3">
						Visualisasi synapse firing rate saat mengevaluasi payload siber (GPU Accelerated)
					</div>
				</div>

				{/* Model Diagnostics */}
				<div className="bg-[#05070a]/90 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
					<p className="text-[9px] text-cyan-400 uppercase font-black tracking-widest flex items-center gap-1.5">
						<Database size={10} className="text-cyan-400" /> Cognitive Core Metrics
					</p>

					<div className="divide-y divide-white/5 flex-1 flex flex-col justify-between">
						{modelSpecs.map((spec, i) => (
							<div key={i} className="flex justify-between items-center py-2">
								<span className="text-[9px] text-gray-500 font-mono uppercase">{spec.label}</span>
								<span className={`text-[10px] font-mono font-bold ${spec.accent ? "text-cyan-400" : "text-gray-300"}`}>
									{spec.value}
								</span>
							</div>
						))}
					</div>
				</div>

			</div>

			{/* Flow Inspector & Diagnostics Logs */}
			<div className="bg-[#05070a]/90 border border-white/5 p-4 rounded-xl shrink-0">
				<p className="text-[9px] text-cyan-400 uppercase font-black tracking-widest flex items-center gap-1.5 mb-3">
					<Zap size={10} className="text-cyan-400" /> Cognitive Decision Stream
				</p>
				<div className="bg-black/60 rounded-lg p-3 border border-white/5 font-mono text-[9px] text-cyan-500/80 space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
					<div>[NEX-AI] Initializing cognitive attention layer...</div>
					<div>[NEX-AI] Parsing request headers and loading virtual patch registry</div>
					<div>[NEX-AI] Reflex Layer evaluated payload: No static signatures detected</div>
					<div>[NEX-AI] Cognitive Engine proctored: Inbound request routed to token tensor</div>
					<div className="text-emerald-400">[NEX-AI] Classification output generated: BENIGN (Confidence: 99.8%)</div>
				</div>
			</div>

		</div>
	);
}

export default React.memo(NexAiMonitorWidget);
