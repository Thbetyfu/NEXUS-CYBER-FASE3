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
  { id: "operator-gaas", icon: LayoutDashboard, label: "GaaS Console" },
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
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#090b0e]/95 backdrop-blur-2xl border-t border-gray-800/80 flex items-center justify-between px-4 z-[10000] select-none">
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-teal-600/10 border border-teal-500/20 text-teal-400 hover:bg-teal-600/20 transition-all mr-2 group shrink-0"
        >
          <Monitor size={20} className="group-hover:scale-110 transition-transform" />
        </button>

        <div className="h-6 w-[1px] bg-gray-800 mx-2 shrink-0" />

        <div className="flex items-center gap-1 overflow-x-auto max-w-[55vw] scrollbar-none">
          {APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenApp(app.id)}
              className={`relative px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all group shrink-0 ${
                activeApps.includes(app.id)
                  ? "bg-gray-800/50 text-white border border-gray-700/50 shadow-inner"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
              }`}
            >
              <app.icon size={15} />
              <span className="text-[9px] font-bold uppercase tracking-wider hidden lg:block">
                {app.label}
              </span>
              {activeApps.includes(app.id) && (
                <motion.div
                  layoutId="indicator"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-2 px-4 py-1 rounded-full bg-black/40 border border-gray-800/50">
        <div
          className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
        />
        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">
          {isLive ? "Tepi enforced · operator only" : "Gateway offline"}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
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
              className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all group"
              title={`Purge Workspace: ${activeDomain}`}
            >
              <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-lg text-yellow-600 hover:text-yellow-500 hover:bg-yellow-500/10 transition-all group"
            title="System Purge"
          >
            <RotateCcw
              size={18}
              className="group-hover:rotate-180 transition-transform duration-700"
            />
          </button>
          <button
            type="button"
            onClick={onPanic}
            className="p-2 rounded-lg text-red-600 hover:text-red-500 hover:bg-red-500/10 transition-all group"
            title="Emergency Rescue"
          >
            <ShieldAlert size={18} className="group-hover:scale-125 transition-transform" />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-gray-800" />

        <div className="flex items-center gap-4 pl-2 text-gray-400">
          <div className="flex items-center gap-1.5">
            <Wifi size={14} className={isLive ? "text-emerald-500" : "text-red-500"} />
            <span className="text-[10px] font-mono uppercase font-bold tracking-tighter">
              8080/GATEWAY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span className="text-[11px] font-mono font-bold tracking-tighter w-16">
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
