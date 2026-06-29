"use client"

/* 
   NEXUS_UX_STABILITY_COVENANT [LOCKED-BY-ANTIGRAVITY]
   - Peraturan 1: terminalRef.scrollTop dilarang diubah menjadi scrollIntoView.
   - Peraturan 2: Jangan pernah menambahkan autoFocus pada input terminal ini.
*/
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, ServerOff, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface AIEventLog {
    timestamp: string;
    layer: string;
    status: string;
    detail_action: string;
    error?: string;
}

// Snappy super high-tech text typist effect
const simulateStreamingText = (fullText: string, onUpdate: (currentText: string) => void, onComplete: () => void) => {
    let index = 0;
    let current = "";
    const interval = setInterval(() => {
        if (index < fullText.length) {
            current += fullText[index];
            onUpdate(current);
            index++;
        } else {
            clearInterval(interval);
            onComplete();
        }
    }, 12); // Snappy 12ms per char typing speed
};

export default function AiTerminalWidget() {
    const [aiStatus, setAiStatus] = useState({ state: "INITIALIZING", latency: 0, model: "QWEN3-CORE" });
    const [stream, setStream] = useState<AIEventLog[]>([]);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Dynamic autocomplete suggestion state
    const [inputValue, setInputValue] = useState("");
    const [commandHistory, setCommandHistory] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("nexus_cli_history");
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {}
            }
        }
        return [];
    });
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

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

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [stream]);

    // Status ping logic
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

    // SSE Stream Logic
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connectSSE = () => {
            eventSource = new EventSource(`${API_BASE_URL}/api/ai/stream`);

            eventSource.onmessage = (e) => {
                if (e.data === ': heartbeat') return;

                try {
                    const data = JSON.parse(e.data);
                    if (data.error) {
                        setStream(prev => [...prev, { timestamp: new Date().toISOString(), layer: "SYSTEM", status: "ERROR", detail_action: `> [ERROR] ${data.error}. Retrying...` }].slice(-50));
                        return;
                    }

                    let prefix = "";
                    if (data.layer === "Reflex") prefix = "> [REFLEX_CORE] ";
                    else if (data.layer === "Reasoning") prefix = "> [INTENT_ANALYSIS] ";
                    else if (data.layer === "Self-Repair") prefix = "> [REPAIR_MODULE] ";
                    else prefix = "> [SYS] ";

                    setStream(prev => {
                        const newMsg = { ...data, detail_action: `${prefix}${data.detail_action}` };
                        return [...prev.slice(-50), newMsg];
                    });
                } catch (err) {
                    // silent discard
                }
            };

            eventSource.onerror = (e) => {
                if (eventSource?.readyState === EventSource.CLOSED) {
                    setStream(prev => [...prev.slice(-50), { timestamp: new Date().toISOString(), layer: "SYSTEM", status: "ERROR", detail_action: "> [ERROR] Telemetry connection lost. Retrying in 5s..." }]);
                    reconnectTimeout = setTimeout(connectSSE, 5000);
                }
            };
        };

        connectSSE();

        return () => {
            if (eventSource) eventSource.close();
            clearTimeout(reconnectTimeout);
        };
    }, []);

    const handleCommandSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
                setSuggestions([]);
                setActiveSuggestionIndex(-1);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
                setSuggestions([]);
                setActiveSuggestionIndex(-1);
            } else {
                setHistoryIndex(-1);
                setInputValue("");
                setSuggestions([]);
                setActiveSuggestionIndex(-1);
            }
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            if (suggestions.length > 0) {
                const step = e.shiftKey ? -1 : 1;
                const nextIndex = (activeSuggestionIndex + step + suggestions.length) % suggestions.length;
                setActiveSuggestionIndex(nextIndex);
                setInputValue(suggestions[nextIndex]);
            }
            return;
        }

        if (e.key === 'Escape') {
            setSuggestions([]);
            setActiveSuggestionIndex(-1);
            return;
        }

        if (e.key === 'Enter' && inputValue.trim() !== '') {
            const cmd = inputValue.trim();
            setInputValue("");
            setHistoryIndex(-1);
            setSuggestions([]);
            setActiveSuggestionIndex(-1);

            // Persist history to state and localStorage
            setCommandHistory(prev => {
                const updated = [...prev, cmd].slice(-50);
                if (typeof window !== "undefined") {
                    localStorage.setItem("nexus_cli_history", JSON.stringify(updated));
                }
                return updated;
            });

            const cmdLower = cmd.toLowerCase();
            if (cmdLower === 'clear' || cmdLower === '/clear') {
                setStream([]);
                return;
            }

            // Optimistic UI Append with command feedback
            setStream(prev => {
                const updated = [...prev.slice(-50), {
                    timestamp: new Date().toISOString(),
                    layer: "Admin",
                    status: "EXEC",
                    detail_action: `nexus_admin@soc:~$ ${cmd}`
                }];

                if (cmd.startsWith('@nexus')) {
                    updated.push({
                        timestamp: new Date().toISOString(),
                        layer: "Reasoning",
                        status: "THINKING",
                        detail_action: "[NEXUS-AI] Analysing cosmic threat vectors and forensic data..."
                    });
                }
                return updated;
            });

            try {
                // Get CSRF Token
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

                    // Check if we have a THINKING state to stream into
                    let isThinkingMsg = false;
                    setStream(prev => {
                        const next = [...prev];
                        for (let i = next.length - 1; i >= 0; i--) {
                            if (next[i].status === "THINKING") {
                                isThinkingMsg = true;
                                next[i] = {
                                    ...next[i],
                                    status: "OK",
                                    detail_action: "" // Cleared to prepare for letter typing
                                };
                                return next;
                            }
                        }
                        return next;
                    });

                    if (isThinkingMsg) {
                        simulateStreamingText(rawOutput, (currentText) => {
                            setStream(prev => {
                                const next = [...prev];
                                for (let i = next.length - 1; i >= 0; i--) {
                                    if (next[i].status === "OK" && next[i].layer === "Reasoning") {
                                        next[i] = { ...next[i], detail_action: currentText };
                                        break;
                                    }
                                }
                                return next;
                            });
                        }, () => {});
                    } else {
                        // Regular CLI output - stream letter-by-letter as well
                        const streamMsg = {
                            timestamp: new Date().toISOString(),
                            layer: "System",
                            status: "OK",
                            detail_action: ""
                        };
                        setStream(prev => [...prev.slice(-50), streamMsg]);

                        simulateStreamingText(rawOutput, (currentText) => {
                            setStream(prev => {
                                const next = [...prev];
                                if (next.length > 0) {
                                    next[next.length - 1] = {
                                        ...next[next.length - 1],
                                        detail_action: currentText
                                    };
                                }
                                return next;
                            });
                        }, () => {});
                    }
                } else {
                    setStream(prev => {
                        const next = prev.filter(item => item.status !== 'THINKING');
                        return [...next.slice(-50), {
                            timestamp: new Date().toISOString(),
                            layer: "System",
                            status: "ERROR",
                            detail_action: "[ERROR] Command routing failed."
                        }];
                    });
                }
            } catch (err) {
                setStream(prev => {
                    const next = prev.filter(item => item.status !== 'THINKING');
                    return [...next.slice(-50), {
                        timestamp: new Date().toISOString(),
                        layer: "System",
                        status: "ERROR",
                        detail_action: "[ERROR] Execution offline."
                    }];
                });
            }
        }
    };

    return (
        <div className="bg-[#030507] border border-cyan-900/30 rounded-xl flex flex-col shadow-[0_0_15px_rgba(6,182,212,0.05)] overflow-hidden h-full relative">
            <div className="bg-[#05080c] px-4 py-2 border-b border-cyan-900/30 flex items-center justify-between sticky top-0 z-10 shrink-0">
                <h3 className="text-xs font-semibold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Nexus Core Terminal
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
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black font-mono" ref={terminalRef}>
                <div className="flex flex-col gap-1 w-full text-[11px] leading-relaxed">
                    <div className="text-cyan-600 mb-2 whitespace-pre font-black leading-none tracking-tighter">
                        {`N EX US   C O R E   O S   v7.2`}
                    </div>
                    <div className="text-cyan-500/50 mb-4">{`> Loading secure cognitive streams...`}</div>

                    {stream.map((log, index) => (
                        <React.Fragment key={index}>
                            {renderFormattedLine(log)}
                        </React.Fragment>
                    ))}

                    {/* Suggestions Box Overlay */}
                    {suggestions.length > 0 && (
                        <div className="bg-[#05080c] border border-cyan-800/40 rounded-lg p-2 mt-3 mb-1 flex flex-col gap-1 text-[10px] text-cyan-400/80 font-mono shadow-[0_0_10px_rgba(6,182,212,0.1)] w-fit max-w-xs select-none">
                            <div className="text-cyan-500 font-bold border-b border-cyan-900/30 pb-0.5 mb-1 uppercase tracking-wider text-[9px]">
                                Command Suggestions:
                            </div>
                            {suggestions.map((item, i) => (
                                <div 
                                    key={i} 
                                    className={`cursor-pointer px-2 py-0.5 rounded transition-all ${
                                        activeSuggestionIndex === i 
                                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.15)] font-semibold' 
                                            : 'hover:bg-cyan-950/40 hover:text-cyan-300 text-cyan-400/80'
                                    }`}
                                    onClick={() => {
                                        setInputValue(item);
                                        setSuggestions([]);
                                        setActiveSuggestionIndex(-1);
                                    }}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center mt-2 group">
                        <span className="text-emerald-500 shrink-0 mr-2 font-bold tracking-tighter">nexus_admin@soc:~$</span>
                        <input
                            type="text"
                            className="bg-transparent border-none outline-none text-green-400 w-full font-mono text-[11px] focus:ring-0 p-0"
                            placeholder="Type /help or @nexus [query]..."
                            value={inputValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                setInputValue(val);
                                setActiveSuggestionIndex(-1); // Reset cycling on manual typing
                                
                                const trimmed = val.trim();
                                if (trimmed.startsWith("/") || trimmed.startsWith("@") || trimmed.length > 0) {
                                    const filtered = allCommands.filter(c => 
                                        c.toLowerCase().startsWith(trimmed.toLowerCase()) && c.toLowerCase() !== trimmed.toLowerCase()
                                    );
                                    setSuggestions(filtered);
                                } else {
                                    setSuggestions([]);
                                }
                            }}
                            onKeyDown={handleCommandSubmit}
                            autoComplete="off"
                            spellCheck="false"
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}

// Premium visual formatted line renderer for console high-fidelity aesthetic
const renderFormattedLine = (log: AIEventLog) => {
    const text = log.detail_action;
    if (!text) return null;
    
    // Determine default color class based on status/layer
    let colorClass = 'text-green-400';
    if (log.status === 'ERROR') colorClass = 'text-red-500 font-semibold';
    else if (log.status === 'THINKING') colorClass = 'text-fuchsia-400 animate-pulse font-bold';
    else if (log.layer === 'Self-Repair') colorClass = 'text-emerald-400 font-bold';
    else if (log.layer === 'Reasoning') colorClass = 'text-fuchsia-400';
    else if (log.layer === 'Admin') colorClass = 'text-blue-400 font-bold';

    // If it's a command input prompt:
    if (text.startsWith("nexus_admin@soc:~$")) {
        const cmdText = text.replace("nexus_admin@soc:~$", "");
        return (
            <div className="flex items-center gap-1.5 py-0.5 border-t border-cyan-950/20 mt-2 first:mt-0">
                <span className="text-emerald-500 font-bold shrink-0">nexus_admin@soc:~$</span>
                <span className="text-white font-mono font-semibold">{cmdText}</span>
            </div>
        );
    }

    // Split text by newlines and format each line for premium console styling
    const lines = text.split('\n');
    return (
        <div className="flex flex-col gap-0.5 w-full my-0.5">
            {lines.map((line, idx) => {
                let content: React.ReactNode = line;
                let lineClass = colorClass;

                // Highlight section dividers
                if (line.match(/^[-=]{10,}$/)) {
                    content = <div className="h-[1px] w-full bg-cyan-900/20 my-1 shadow-[0_0_2px_rgba(6,182,212,0.1)]" />;
                    return <div key={idx} className="w-full">{content}</div>;
                }

                // Parse standard headers: [PASS], [FAIL], [SUCCESS], [ERROR], [STATUS], etc.
                if (line.includes('[PASS]')) {
                    lineClass = 'text-emerald-400 font-medium';
                    const parts = line.split('[PASS]');
                    content = (
                        <>
                            {parts[0]}
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-sm text-[9px] font-bold mr-1.5 uppercase shadow-[0_0_4px_rgba(16,185,129,0.1)]">PASS</span>
                            {parts[1]}
                        </>
                    );
                } else if (line.includes('[FAIL]')) {
                    lineClass = 'text-red-400 font-medium';
                    const parts = line.split('[FAIL]');
                    content = (
                        <>
                            {parts[0]}
                            <span className="bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-sm text-[9px] font-bold mr-1.5 uppercase shadow-[0_0_4px_rgba(239,68,68,0.1)]">FAIL</span>
                            {parts[1]}
                        </>
                    );
                } else if (line.startsWith('[SUCCESS]')) {
                    lineClass = 'text-emerald-400';
                    content = (
                        <>
                            <span className="text-emerald-500 font-extrabold mr-1">✓</span>
                            {line.substring(9)}
                        </>
                    );
                } else if (line.startsWith('[ERROR]')) {
                    lineClass = 'text-red-400 font-bold';
                    content = (
                        <>
                            <span className="text-red-500 font-extrabold mr-1">✗</span>
                            {line.substring(7)}
                        </>
                    );
                } else if (line.startsWith('[STATUS]')) {
                    lineClass = 'text-cyan-400';
                    content = (
                        <>
                            <span className="text-cyan-500 font-extrabold mr-1.5">⚡</span>
                            {line.substring(8)}
                        </>
                    );
                } else if (line.startsWith('[STATS]')) {
                    lineClass = 'text-cyan-400';
                    content = (
                        <>
                            <span className="text-cyan-500 font-extrabold mr-1.5">📊</span>
                            {line.substring(7)}
                        </>
                    );
                } else if (line.startsWith('[VIRTUAL-PATCH-DB]') || line.startsWith('[HONEYPOT-STATUS]')) {
                    lineClass = 'text-cyan-400 font-bold tracking-wider';
                    content = (
                        <span className="border-l-2 border-cyan-500 pl-1.5 py-0.5 my-1 block bg-cyan-950/20 rounded-r-md">
                            {line}
                        </span>
                    );
                } else if (line.startsWith('[NEXUS-AI]')) {
                    lineClass = 'text-fuchsia-400 font-bold';
                    content = (
                        <span className="border-l-2 border-fuchsia-500 pl-1.5 py-0.5 my-1 block bg-fuchsia-950/20 rounded-r-md">
                            🧠 {line}
                        </span>
                    );
                }

                // Highlight list bullet items
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    const cleanLine = line.trim().replace(/^[-*]\s+/, "");
                    
                    let itemContent: React.ReactNode = cleanLine;
                    if (cleanLine.includes('|')) {
                        const segments = cleanLine.split('|');
                        itemContent = (
                            <span className="flex flex-wrap gap-x-2 items-center">
                                {segments.map((seg, sIdx) => {
                                    const sTrim = seg.trim();
                                    let segClass = 'text-cyan-400/80';
                                    if (sTrim.startsWith('IP:')) {
                                        segClass = 'text-white font-semibold';
                                    } else if (sTrim.startsWith('Status:')) {
                                        const statusVal = sTrim.split(':')[1]?.trim() || '';
                                        let statusColor = 'text-cyan-400';
                                        if (statusVal.includes('STARVED') || statusVal.includes('BANNED') || statusVal.includes('TIMEOUT')) statusColor = 'text-red-400 font-bold';
                                        else if (statusVal.includes('ACTIVE') || statusVal.includes('Active') || statusVal.includes('ISOLATED')) statusColor = 'text-emerald-400 font-bold';
                                        return (
                                            <span key={sIdx} className="text-cyan-400/60 font-mono">
                                                Status: <span className={statusColor}>{statusVal}</span>
                                                {sIdx < segments.length - 1 && <span className="text-cyan-950/40 ml-2">|</span>}
                                            </span>
                                        );
                                    } else if (sTrim.startsWith('Hits:')) {
                                        segClass = 'text-yellow-400 font-semibold';
                                    }
                                    return (
                                        <span key={sIdx} className={`${segClass} font-mono`}>
                                            {sTrim}
                                            {sIdx < segments.length - 1 && <span className="text-cyan-950/40 ml-2">|</span>}
                                        </span>
                                    );
                                })}
                            </span>
                        );
                    }

                    content = (
                        <span className="flex items-start gap-1.5 pl-3">
                            <span className="text-cyan-600 shrink-0 select-none">•</span>
                            <span className="flex-1">{itemContent}</span>
                        </span>
                    );
                }

                return (
                    <div key={idx} className="flex">
                        <span className={`w-full whitespace-pre-wrap break-words ${lineClass}`}>
                            {content}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
