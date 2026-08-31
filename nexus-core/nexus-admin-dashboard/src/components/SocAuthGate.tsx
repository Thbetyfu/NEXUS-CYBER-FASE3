"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { gatewayURL } from "@/config";

export default function SocAuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "login" | "ok">("checking");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (active) setState("login");
    }, 2000);

    (async () => {
      try {
        const res = await fetch(gatewayURL("/api/ai/status"), {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!active) return;
        if (res.status === 401) {
          setState("login");
          return;
        }
        setState("ok");
      } catch {
        clearTimeout(timeoutId);
        if (active) setState("login");
      }
    })();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const csrfRes = await fetch(gatewayURL("/api/csrf-token"), { credentials: "include" });
      const csrfJson = csrfRes.ok ? await csrfRes.json() : {};
      const csrf = csrfJson.csrf_token as string | undefined;
      const res = await fetch(gatewayURL("/api/admin/login"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 403 && body.includes("CSRF")) {
          setError("CSRF gagal — refresh halaman lalu coba lagi.");
        } else {
          setError("Kunci operator tidak diterima.");
        }
        setBusy(false);
        return;
      }
      setState("ok");
    } catch {
      setError(
        "Tidak dapat mencapai control plane. Pastikan gateway :8081 hidup, lalu refresh.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center text-gray-500 font-mono text-xs tracking-widest uppercase">
        Verifying operator session…
      </div>
    );
  }

  if (state === "login") {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#030508] flex items-center justify-center p-6">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md border border-cyan-500/20 bg-[#05080c] rounded-2xl p-8 shadow-[0_0_40px_rgba(34,211,238,0.08)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-white font-black tracking-[0.2em] uppercase text-sm">Nexus Command Center</h1>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">Operator session required</p>
            </div>
          </div>
          <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">NEXUS_ADMIN_TOKEN</label>
          <input
            type="password"
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 font-mono outline-none focus:border-cyan-500/50"
          />
          {error ? <p className="text-red-400 text-xs mt-3 font-mono">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !token}
            className="mt-6 w-full py-2.5 rounded-lg bg-cyan-500/90 text-black font-black uppercase text-xs tracking-widest disabled:opacity-40"
          >
            {busy ? "Authenticating…" : "Enter SOC"}
          </button>
        </motion.form>
      </div>
    );
  }

  return <>{children}</>;
}
