"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Activity,
  ShieldAlert,
  RotateCcw,
  Clock,
  Wifi,
  Monitor,
  Trash2,
  Terminal,
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";
import DomainSwitcher from "./DomainSwitcher";

interface TaskbarProps {
  onOpenApp: (id: string) => void;
  onPanic: () => void;
  onReset: () => void;
  onDeleteDomain: () => void;
  activeDomain: string;
  onDomainChange: (domain: string) => void;
  onAddClick: () => void;
  refreshTrigger?: number;
  isLive: boolean;
  activeApps: string[];
}

const APPS = [
  { id: "operator-gaas", icon: LayoutDashboard, label: "Konsol GaaS" },
  { id: "panduan", icon: BookOpen, label: "Panduan" },
  { id: "job-cowork", icon: ShieldCheck, label: "Job Cowork" },
  { id: "forensic-logs", icon: Activity, label: "Logs" },
  { id: "ip-monitor", icon: Shield, label: "IP / Ban" },
  { id: "system-status", icon: Terminal, label: "Terminal" },
  { id: "metrics", icon: Activity, label: "Metrics" },
  { id: "compliance-audit", icon: ShieldAlert, label: "Artefak" },
];

const Taskbar: React.FC<TaskbarProps> = ({
  onOpenApp,
  onPanic,
  onReset,
  onDeleteDomain,
  activeDomain,
  onDomainChange,
  onAddClick,
  refreshTrigger,
  isLive,
  activeApps,
}) => {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#080b11]/95 backdrop-blur-2xl border-t border-gray-800/80 flex items-center justify-between px-4 z-[10000] select-none">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-400 hover:bg-teal-500/20 hover:border-teal-400/40 transition-all mr-1 group shrink-0"
          title="Nexus System"
        >
          <Monitor size={18} className="group-hover:scale-110 transition-transform" />
        </button>

        <div className="h-5 w-[1px] bg-gray-800/80 mx-1 shrink-0" />

        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 pr-4">
          {APPS.map((app) => {
            const isActive = activeApps.includes(app.id);
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onOpenApp(app.id)}
                className={`relative px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all group shrink-0 ${
                  isActive
                    ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <app.icon size={15} className={isActive ? "text-teal-400" : "text-gray-400 group-hover:text-gray-300"} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider hidden md:block">
                  {app.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="taskbar-active-indicator"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <DomainSwitcher
            activeDomain={activeDomain}
            onDomainChange={onDomainChange}
            onAddClick={onAddClick}
            refreshTrigger={refreshTrigger}
          />
          {activeDomain !== "all" && (
            <button
              type="button"
              onClick={onDeleteDomain}
              className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all group"
              title={`Hapus workspace: ${activeDomain}`}
            >
              <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-lg text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all group"
            title="Purge sistem"
          >
            <RotateCcw
              size={16}
              className="group-hover:rotate-180 transition-transform duration-700"
            />
          </button>
          <button
            type="button"
            onClick={onPanic}
            className="p-2 rounded-lg text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all group"
            title="Panic / darurat"
          >
            <ShieldAlert size={16} className="group-hover:scale-125 transition-transform" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-gray-800/80" />

        <div className="flex items-center gap-3 pl-1 text-gray-400">
          <div className="flex items-center gap-1.5 bg-black/30 border border-gray-800/60 rounded-md px-2 py-1">
            <Wifi size={13} className={isLive ? "text-emerald-400" : "text-rose-400"} />
            <span className="text-[10px] font-mono uppercase font-bold tracking-tight text-gray-300">
              8080/GATEWAY
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            <Clock size={13} className="text-gray-500" />
            <span className="text-[11px] font-mono font-bold tracking-tight">
              {mounted
                ? time.toLocaleTimeString("id-ID", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--:--:--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
