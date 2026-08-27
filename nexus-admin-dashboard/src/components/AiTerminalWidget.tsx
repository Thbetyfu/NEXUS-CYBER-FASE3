"use client"

/* 
   NEXUS_UX_STABILITY_COVENANT [LOCKED-BY-ANTIGRAVITY]
   - Peraturan 1: terminalRef.scrollTop dilarang diubah menjadi scrollIntoView.
   - Peraturan 2: Jangan pernah menambahkan autoFocus pada input terminal ini.
*/
import React, { useEffect, useState, useRef } from 'react';
import { Terminal as TerminalIcon, ServerOff, Loader2 } from 'lucide-react';
import { gatewayURL } from '@/config';

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
		"help",
		"/help",
		"status",
		"/status",
		"stats",
		"/stats",
		"shuffle",
		"/shuffle",
		"verify-audit",
		"/verify-audit",
		"recovery",
		"/recovery",
		"ban ",
		"/ban ",
		"unban ",
		"/unban ",
		"sub ",
		"/sub ",
		"unsub ",
		"/unsub ",
		"honeystats",
		"/honeystats",
		"patches",
		"/patches",
		"simulate-attack",
		"/simulate-attack",
		"geoip ",
		"/geoip ",
		"@nexus ",
		"clear"
	];

	// Ping status backend
	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await fetch(gatewayURL("/api/ai/status"), { credentials: "include" });
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
		let reconnectTimeout: ReturnType<typeof setTimeout>;
		let resizeObserver: ResizeObserver | null = null;
		let fitRaf = 0;

		const safeFit = () => {
			if (!active || !fitAddon || !term || !containerRef.current) return;
			const el = containerRef.current;
			if (el.clientWidth < 8 || el.clientHeight < 8) return;
			try {
				// Core harus sudah siap setelah open(); fit sebelum itu → dimensions undefined
				if (!term.element || !(term as any)._core) return;
				fitAddon.fit();
			} catch {
				/* ignore race during unmount / zero-size window */
			}
		};

		const scheduleFit = () => {
			cancelAnimationFrame(fitRaf);
			fitRaf = requestAnimationFrame(() => {
				fitRaf = requestAnimationFrame(safeFit);
			});
		};

		// Variabel untuk melacak status terminal dan CLI
		let cmdBuffer = "";
		let commandHistory: string[] = [];
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("nexus_cli_history");
			if (stored) {
				try {
					commandHistory = JSON.parse(stored);
				} catch {
					/* ignore */
				}
			}
		}
		let historyIndex = -1;
		let suggestions: string[] = [];
		let activeSuggestionIndex = -1;

		const initTerm = async () => {
			const { Terminal } = await import("xterm");
			const { FitAddon: FitAddonClass } = await import("@xterm/addon-fit");
			await import("xterm/css/xterm.css");

			if (!active || !containerRef.current) return;

			term = new Terminal({
				cursorBlink: true,
				theme: {
					background: "#030507",
					foreground: "#22d3ee",
					cursor: "#22d3ee",
					black: "#000000",
					red: "#f87171",
					green: "#4ade80",
					yellow: "#facc15",
					blue: "#60a5fa",
					magenta: "#c084fc",
					cyan: "#22d3ee",
					white: "#f3f4f6",
				},
				fontSize: 11,
				fontFamily: "Courier New, Courier, monospace",
				rows: 24,
				convertEol: true,
			});

			fitAddon = new FitAddonClass();
			term.loadAddon(fitAddon);
			term.open(containerRef.current);
			terminalInstanceRef.current = term;
			scheduleFit();

			term.writeln("\x1b[1;36mN EX US   C O R E   O S   v7.2\x1b[0m");
			term.writeln("\x1b[90m> Loading secure cognitive streams...\x1b[0m");
			term.write("\r\n\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");

			term.onData(async (data: string) => {
				if (!active || !term) return;
				// Handle Enter
				if (data === "\r") {
					term.write("\r\n");
					const cmd = cmdBuffer.trim();
					if (cmd !== "") {
						commandHistory.push(cmd);
						if (commandHistory.length > 50) commandHistory.shift();
						localStorage.setItem("nexus_cli_history", JSON.stringify(commandHistory));
						historyIndex = -1;

						if (cmd.toLowerCase() === "clear") {
							term.clear();
							cmdBuffer = "";
							term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");
							return;
						}

						term.write("\x1b[90mExecuting command...\x1b[0m\r\n");

						try {
							const tokenRes = await fetch(gatewayURL("/api/csrf-token"), {
								credentials: "include",
							});
							const { csrf_token } = tokenRes.ok
								? await tokenRes.json()
								: { csrf_token: "" };

							const res = await fetch(gatewayURL("/api/cli/execute"), {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									...(csrf_token ? { "X-CSRF-Token": csrf_token } : {}),
								},
								credentials: "include",
								body: JSON.stringify({ command: cmd }),
							});

							if (res.ok) {
								const payload = await res.json();
								const rawOutput =
									payload.output || payload.response || "[EMPTY_RESPONSE]";
								term.writeln(String(rawOutput).replace(/\r?\n/g, "\r\n"));
							} else {
								term.writeln("\x1b[1;31m[ERROR] Command routing failed.\x1b[0m");
							}
						} catch {
							term.writeln("\x1b[1;31m[ERROR] Execution offline.\x1b[0m");
						}
					}
					cmdBuffer = "";
					term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m ");
					suggestions = [];
					activeSuggestionIndex = -1;
					return;
				}

				if (data === "\u007F") {
					if (cmdBuffer.length > 0) {
						cmdBuffer = cmdBuffer.slice(0, -1);
						term.write("\b \b");
					}
					suggestions = [];
					activeSuggestionIndex = -1;
					return;
				}

				if (data === "\t") {
					const trimmed = cmdBuffer.trim();

					if (trimmed === "" || trimmed === "/") {
						term.write("\r\n\x1b[90mAvailable Commands:\x1b[0m\r\n");
						const colWidth = 18;
						let line = "  ";
						let printed = 0;
						allCommands.forEach((c) => {
							const cleanCmd = c.trim();
							if (cleanCmd.startsWith("/")) {
								line += cleanCmd.padEnd(colWidth);
								printed++;
								if (printed % 4 === 0) {
									term.writeln(line);
									line = "  ";
								}
							}
						});
						if (line.trim() !== "") {
							term.writeln(line);
						}
						term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + cmdBuffer);
						return;
					}

					if (suggestions.length === 0) {
						suggestions = allCommands.filter((c) => c.startsWith(trimmed) && c !== trimmed);
					}

					if (suggestions.length > 0) {
						activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
						const completed = suggestions[activeSuggestionIndex];
						term.write("\r\x1b[K\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + completed);
						cmdBuffer = completed;
					}
					return;
				}

				if (data === "\u001b[A") {
					if (commandHistory.length > 0) {
						historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
						const histCmd = commandHistory[commandHistory.length - 1 - historyIndex];
						term.write("\r\x1b[K\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + histCmd);
						cmdBuffer = histCmd;
					}
					return;
				}

				if (data === "\u001b[B") {
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

				if (data.startsWith("\u001b")) {
					return;
				}

				cmdBuffer += data;
				term.write(data);
				suggestions = [];
				activeSuggestionIndex = -1;
			});

			const connectSSE = () => {
				if (!active) return;
				eventSource = new EventSource(gatewayURL("/api/ai/stream"), {
					withCredentials: true,
				});

				eventSource.onmessage = (e) => {
					if (!active || !term || e.data === ": heartbeat") return;

					try {
						const logData = JSON.parse(e.data);
						const formattedAnsi = formatLogToAnsi(logData);

						if (formattedAnsi) {
							term.write("\r\x1b[K");
							term.writeln(formattedAnsi);
							term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + cmdBuffer);
						}
					} catch {
						/* ignore malformed SSE */
					}
				};

				eventSource.onerror = () => {
					if (!active || !term) return;
					if (eventSource?.readyState === EventSource.CLOSED) {
						term.write("\r\x1b[K");
						term.writeln(
							"\x1b[1;31m[ERROR] Telemetry connection lost. Retrying in 5s...\x1b[0m",
						);
						term.write("\x1b[1;32mnexus_admin@soc:~$\x1b[0m " + cmdBuffer);
						reconnectTimeout = setTimeout(connectSSE, 5000);
					}
				};
			};

			connectSSE();

			if (containerRef.current && typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(() => scheduleFit());
				resizeObserver.observe(containerRef.current);
			}
		};

		initTerm();

		const handleResize = () => scheduleFit();
		window.addEventListener("resize", handleResize);

		return () => {
			active = false;
			window.removeEventListener("resize", handleResize);
			cancelAnimationFrame(fitRaf);
			resizeObserver?.disconnect();
			resizeObserver = null;
			clearTimeout(reconnectTimeout);
			if (eventSource) eventSource.close();
			eventSource = null;
			fitAddon = null;
			terminalInstanceRef.current = null;
			try {
				term?.dispose();
			} catch {
				/* ignore */
			}
			term = null;
		};
	}, []);

	return (
		<div className="bg-[#030507] flex flex-col h-full w-full relative overflow-hidden">
			{/* Top Status Bar (Integrasi Seamless Tanpa Title Duplikat) */}
			<div className="bg-[#05080c]/80 px-3 py-1.5 border-b border-cyan-900/20 flex items-center justify-between sticky top-0 z-10 shrink-0 backdrop-blur-sm">
				<div className="flex items-center gap-2 text-[10px] text-cyan-500/80 font-mono tracking-widest uppercase">
					<TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
					<span>TTY / DEVTMPFS / SYS_LOGS</span>
				</div>
				<div className="flex items-center gap-2">
					{aiStatus.state === 'ONLINE' || aiStatus.state === 'REFLEX_ACTIVE' ? (
						<>
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
							<span className="text-[10px] text-emerald-400 font-mono font-bold tracking-tighter">
								{aiStatus.model}: ONLINE {aiStatus.state === 'REFLEX_ACTIVE' ? '(REFLEX_MODE)' : `(${aiStatus.latency}ms)`}
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
			<div className="flex-1 p-2 bg-[#030507] overflow-hidden" ref={containerRef} style={{ minHeight: '250px' }} />
		</div>
	);
}
