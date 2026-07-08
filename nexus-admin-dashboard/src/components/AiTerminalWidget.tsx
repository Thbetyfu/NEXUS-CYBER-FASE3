"use client"

/* 
   NEXUS_UX_STABILITY_COVENANT [LOCKED-BY-ANTIGRAVITY]
   - Peraturan 1: terminalRef.scrollTop dilarang diubah menjadi scrollIntoView.
   - Peraturan 2: Jangan pernah menambahkan autoFocus pada input terminal ini.
*/
import React, { useEffect, useState, useRef } from 'react';
import { Terminal as TerminalIcon, ServerOff, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface AIEventLog {
	timestamp: string;
	layer: string;
	status: string;
	detail_action: string;
	error?: string;
}

// Format log menjadi ANSI escape codes untuk warna Xterm.js
const formatLogToAnsi = (log: AIEventLog): string => {
	let text = log.detail_action;
	if (!text) return "";

	let prefix = "";
	if (log.layer === "Reflex") prefix = "\x1b[1;32m[REFLEX_CORE]\x1b[0m ";
	else if (log.layer === "Reasoning") prefix = "\x1b[1;35m[INTENT_ANALYSIS]\x1b[0m ";
	else if (log.layer === "Self-Repair") prefix = "\x1b[1;36m[REPAIR_MODULE]\x1b[0m ";
	else if (log.layer === "SSH-Tarpit") prefix = "\x1b[1;33m[SSH_TARPIT]\x1b[0m ";
	else if (log.layer === "Honeypot-Trap") prefix = "\x1b[1;31m[HONEYPOT_TRAP]\x1b[0m ";
	else if (log.layer === "System" || log.layer === "SYSTEM") prefix = "\x1b[1;31m[SYS_ERR]\x1b[0m ";
	else prefix = "\x1b[1;36m[SYS]\x1b[0m ";

	// Bersihkan prefix default buatan backend agar tidak duplikat
	const cleanPrefixes = [
		"> [REFLEX_CORE] ",
		"> [INTENT_ANALYSIS] ",
		"> [REPAIR_MODULE] ",
		"> [SYS] "
	];
	for (const p of cleanPrefixes) {
		if (text.startsWith(p)) {
			text = text.substring(p.length);
		}
	}

	const lines = text.split('\n');
	const formattedLines = lines.map(line => {
		// Garis pembatas
		if (line.match(/^[-=]{10,}$/)) {
			return "\x1b[90m" + line + "\x1b[0m";
		}

		let formatted = line;

		// Format [PASS] & [FAIL]
		if (formatted.includes('[PASS]')) {
			formatted = formatted.replace('[PASS]', '\x1b[1;42;37m PASS \x1b[0m');
		}
		if (formatted.includes('[FAIL]')) {
			formatted = formatted.replace('[FAIL]', '\x1b[1;41;37m FAIL \x1b[0m');
		}

		// Format penanda status/stats
		if (formatted.startsWith('[SUCCESS]')) {
			formatted = "\x1b[1;32m✓\x1b[0m " + formatted.substring(9);
		} else if (formatted.startsWith('[ERROR]')) {
			formatted = "\x1b[1;31m✗\x1b[0m " + formatted.substring(7);
		} else if (formatted.startsWith('[STATUS]')) {
			formatted = "\x1b[1;36m⚡\x1b[0m " + formatted.substring(8);
		} else if (formatted.startsWith('[STATS]')) {
			formatted = "\x1b[1;33m📊\x1b[0m " + formatted.substring(7);
		} else if (formatted.startsWith('[VIRTUAL-PATCH-DB]') || formatted.startsWith('[HONEYPOT-STATUS]')) {
			formatted = "\x1b[1;36m" + formatted + "\x1b[0m";
		} else if (formatted.startsWith('[NEXUS-AI]')) {
			formatted = "\x1b[1;35m🧠 " + formatted + "\x1b[0m";
		}

		// Format list bullet items
		if (formatted.trim().startsWith('- ') || formatted.trim().startsWith('* ')) {
			const cleanLine = formatted.trim().replace(/^[-*]\s+/, "");
			let itemContent = cleanLine;

			if (cleanLine.includes('|')) {
				const segments = cleanLine.split('|');
				const formattedSegments = segments.map(seg => {
					const sTrim = seg.trim();
					if (sTrim.startsWith('IP:')) {
						return "\x1b[1;37m" + sTrim + "\x1b[0m";
					} else if (sTrim.startsWith('Status:')) {
						const statusVal = sTrim.split(':')[1]?.trim() || '';
						let statusColor = "\x1b[36m"; // Cyan
						if (statusVal.includes('STARVED') || statusVal.includes('BANNED') || statusVal.includes('TIMEOUT')) {
							statusColor = "\x1b[1;31m"; // Red
						} else if (statusVal.includes('ACTIVE') || statusVal.includes('Active') || statusVal.includes('ISOLATED')) {
							statusColor = "\x1b[1;32m"; // Green
						}
						return "Status: " + statusColor + statusVal + "\x1b[0m";
					} else if (sTrim.startsWith('Hits:')) {
						return "\x1b[1;33m" + sTrim + "\x1b[0m";
					}
					return sTrim;
				});
				itemContent = formattedSegments.join(" | ");
			}
			formatted = "  \x1b[1;36m•\x1b[0m " + itemContent;
		}

		return formatted;
	});

	return prefix + formattedLines.join("\r\n");
};

export default function AiTerminalWidget() {
	const [aiStatus, setAiStatus] = useState({ state: "INITIALIZING", latency: 0, model: "QWEN3-CORE" });
	const containerRef = useRef<HTMLDivElement>(null);
	const terminalInstanceRef = useRef<any>(null);

	const allCommands = [
		"/status",
		"/stats",
		"/shuffle",
		"/ban ",
		"/unban ",
		"/sub ",
		"/unsub ",
		"/honeystats",
		"/patches",
		"/simulate-attack",
		"@nexus ",
		"clear"
	];

	// Ping status backend
	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await fetch(`${API_BASE_URL}/api/ai/status`);
				const data = await res.json();
				setAiStatus({ state: data.status, latency: data.latency_ms, model: data.model });
			} catch (err) {
				setAiStatus({ state: "DISCONNECTED", latency: 0, model: "NEXUS-CORE" });
			}
		};

		fetchStatus();
		const timer = setInterval(fetchStatus, 5000);
		return () => clearInterval(timer);
	}, []);

	// Inisialisasi Xterm.js secara dinamis (Aman untuk Next.js SSR)
	useEffect(() => {
		let active = true;
		let term: any = null;
		let fitAddon: any = null;
		let eventSource: EventSource | null = null;
		let reconnectTimeout: NodeJS.Timeout;

		// Variabel untuk melacak status terminal dan CLI
		let cmdBuffer = "";
		let commandHistory: string[] = [];
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("nexus_cli_history");
			if (stored) {
				try {
					commandHistory = JSON.parse(stored);
				} catch (e) {}
			}
		}
		let historyIndex = -1;
		let suggestions: string[] = [];
		let activeSuggestionIndex = -1;

		const initTerm = async () => {
			// Dynamic imports untuk mencegah crash saat prerender Next.js
			const { Terminal } = await import('xterm');
			const { FitAddon: FitAddonClass } = await import('@xterm/addon-fit');
			await import('xterm/css/xterm.css');

			if (!active || !containerRef.current) return;

			term = new Terminal({
				cursorBlink: true,
				theme: {
					background: '#030507',
					foreground: '#22d3ee', // Cyan-400
					cursor: '#22d3ee',
					black: '#000000',
					red: '#f87171',
					green: '#4ade80',
					yellow: '#facc15',
					blue: '#60a5fa',
					magenta: '#c084fc',
					cyan: '#22d3ee',
					white: '#f3f4f6'
				},
				fontSize: 11,
				fontFamily: 'Courier New, Courier, monospace',
				rows: 24,
				convertEol: true
			});

			fitAddon = new FitAddonClass();
			term.loadAddon(fitAddon);
			term.open(containerRef.current);
			fitAddon.fit();

			terminalInstanceRef.current = term;

			// Cetak Boot Banner
			term.writeln("\x1b[1;36mN EX US   C O R E   O S   v7.2\x1b[0m");
			term.writeln("\x1b[90m> Loading secure cognitive streams...\x1b[0m");
			term.write("\r\n\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");

			// Event handler untuk masukan keyboard
			term.onData(async (data: string) => {
				// Handle Enter
				if (data === '\r') {
					term.write('\r\n');
					const cmd = cmdBuffer.trim();
					if (cmd !== "") {
						// Simpan histori perintah
						commandHistory.push(cmd);
						if (commandHistory.length > 50) commandHistory.shift();
						localStorage.setItem("nexus_cli_history", JSON.stringify(commandHistory));
						historyIndex = -1;

						if (cmd.toLowerCase() === 'clear') {
							term.clear();
							cmdBuffer = "";
							term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");
							return;
						}

						// Eksekusi CLI backend
						term.write("\x1b[90mExecuting command...\x1b[0m\r\n");
						
						try {
							const tokenRes = await fetch(`${API_BASE_URL}/api/csrf-token`, { credentials: "include" });
							const { csrf_token } = tokenRes.ok ? await tokenRes.json() : { csrf_token: "" };

							const res = await fetch(`${API_BASE_URL}/api/cli/execute`, {
								method: 'POST',
								headers: { 
									'Content-Type': 'application/json',
									...(csrf_token ? { "X-CSRF-Token": csrf_token } : {})
								},
								credentials: "include",
								body: JSON.stringify({ command: cmd })
							});

							if (res.ok) {
								const data = await res.json();
								const rawOutput = data.output || data.response || "[EMPTY_RESPONSE]";
								
								// Format output dengan warna ANSI
								const formattedOutput = rawOutput.replace(/\r?\n/g, "\r\n");
								term.writeln(formattedOutput);
							} else {
								term.writeln("\x1b[1;31m[ERROR] Command routing failed.\x1b[0m");
							}
						} catch (err) {
							term.writeln("\x1b[1;31m[ERROR] Execution offline.\x1b[0m");
						}
					}
					cmdBuffer = "";
					term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");
					suggestions = [];
					activeSuggestionIndex = -1;
					return;
				}

				// Handle Backspace (DEL / \u007F)
				if (data === '\u007F') {
					if (cmdBuffer.length > 0) {
						cmdBuffer = cmdBuffer.slice(0, -1);
						term.write('\b \b');
					}
					suggestions = [];
					activeSuggestionIndex = -1;
					return;
				}

				// Handle Tab Autocomplete
				if (data === '\t') {
					const trimmed = cmdBuffer.trim();
					if (suggestions.length === 0 && trimmed.length > 0) {
						suggestions = allCommands.filter(c => c.startsWith(trimmed) && c !== trimmed);
					}

					if (suggestions.length > 0) {
						activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
						const completed = suggestions[activeSuggestionIndex];
						
						// Bersihkan baris input Xterm dan tulis suggestion yang baru
						term.write("\r\x1b[K\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + completed);
						cmdBuffer = completed;
					}
					return;
				}

				// Handle Arrow Up (Histori Perintah)
				if (data === '\u001b[A') {
					if (commandHistory.length > 0) {
						historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
						const histCmd = commandHistory[commandHistory.length - 1 - historyIndex];
						term.write("\r\x1b[K\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + histCmd);
						cmdBuffer = histCmd;
					}
					return;
				}

				// Handle Arrow Down (Histori Perintah)
				if (data === '\u001b[B') {
					if (historyIndex > 0) {
						historyIndex--;
						const histCmd = commandHistory[commandHistory.length - 1 - historyIndex];
						term.write("\r\x1b[K\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + histCmd);
						cmdBuffer = histCmd;
					} else {
						historyIndex = -1;
						term.write("\r\x1b[K\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");
						cmdBuffer = "";
					}
					return;
				}

				// Abaikan escape keys lainnya
				if (data.startsWith('\u001b')) {
					return;
				}

				// Karakter ketik biasa
				cmdBuffer += data;
				term.write(data);
				suggestions = [];
				activeSuggestionIndex = -1;
			});

			// Setup SSE untuk event streaming live logs ke Xterm
			const connectSSE = () => {
				eventSource = new EventSource(`${API_BASE_URL}/api/ai/stream`);

				eventSource.onmessage = (e) => {
					if (e.data === ': heartbeat') return;

					try {
						const logData = JSON.parse(e.data);
						const formattedAnsi = formatLogToAnsi(logData);

						if (formattedAnsi) {
							// Bersihkan baris input pengetikan aktif sementara, tulis logs, dan gambar ulang input
							term.write("\r\x1b[K");
							term.writeln(formattedAnsi);
							term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + cmdBuffer);
						}
					} catch (err) {}
				};

				eventSource.onerror = (e) => {
					if (eventSource?.readyState === EventSource.CLOSED) {
						term.write("\r\x1b[K");
						term.writeln("\x1b[1;31m[ERROR] Telemetry connection lost. Retrying in 5s...\x1b[0m");
						term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + cmdBuffer);
						reconnectTimeout = setTimeout(connectSSE, 5000);
					}
				};
			};

			connectSSE();
		};

		initTerm();

		const handleResize = () => {
			if (fitAddon) {
				try {
					fitAddon.fit();
				} catch (e) {}
			}
		};

		window.addEventListener('resize', handleResize);

		return () => {
			active = false;
			window.removeEventListener('resize', handleResize);
			if (term) term.dispose();
			if (eventSource) eventSource.close();
			clearTimeout(reconnectTimeout);
		};
	}, []);

	return (
		<div className="bg-[#030507] border border-cyan-900/30 rounded-xl flex flex-col shadow-[0_0_15px_rgba(6,182,212,0.05)] overflow-hidden h-full relative">
			<div className="bg-[#05080c] px-4 py-2 border-b border-cyan-900/30 flex items-center justify-between sticky top-0 z-10 shrink-0">
				<h3 className="text-xs font-semibold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
					<TerminalIcon className="w-4 h-4" /> Nexus Core Terminal
				</h3>
				<div className="flex items-center gap-2">
					{aiStatus.state === 'ONLINE' ? (
						<>
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
							<span className="text-[10px] text-emerald-400 font-mono font-bold tracking-tighter">
								{aiStatus.model}: ONLINE ({aiStatus.latency}ms)
							</span>
						</>
					) : aiStatus.state === 'INITIALIZING' ? (
						<>
							<Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />
							<span className="text-[10px] text-cyan-400 font-mono tracking-tighter">INITIALIZING...</span>
						</>
					) : (
						<>
							<ServerOff className="w-3 h-3 text-red-500" />
							<span className="text-[10px] text-red-500 font-mono font-bold tracking-tighter">
								AI CORE: DISCONNECTED
							</span>
						</>
					)
					}
				</div>
			</div>
			{/* Kontainer Xterm Mount */}
			<div className="flex-1 p-2 bg-[#030507] overflow-hidden" ref={containerRef} style={{ minHeight: '300px' }} />
		</div>
	);
}
