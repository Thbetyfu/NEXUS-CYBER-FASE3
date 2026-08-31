"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type AuthView = {
  kind: "guest" | "account" | null;
  orderCode: string | null;
  email: string | null;
};

export async function fetchAuthMe(): Promise<AuthView> {
  const res = await fetch("/api/auth/me");
  const data = (await res.json()) as AuthView & { ok?: boolean };
  if (!res.ok || data.ok === false) {
    return { kind: null, orderCode: null, email: null };
  }
  return { kind: data.kind ?? null, orderCode: data.orderCode ?? null, email: data.email ?? null };
}

export async function continueAsGuest(): Promise<AuthView> {
  const res = await fetch("/api/auth/guest", { method: "POST" });
  const data = (await res.json()) as AuthView & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "Sesi tamu gagal");
  }
  return { kind: data.kind ?? "guest", orderCode: data.orderCode ?? null, email: null };
}

export function AuthLinks({ compact = false }: { compact?: boolean }) {
  const [auth, setAuth] = useState<AuthView>({ kind: null, orderCode: null, email: null });

  const refresh = useCallback(() => {
    void fetchAuthMe().then(setAuth);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ kind: null, orderCode: null, email: null });
  };

  if (auth.kind === "account") {
    return (
      <div className={`auth-links${compact ? " is-compact" : ""}`}>
        <span className="auth-links-label">{auth.email}</span>
        {auth.orderCode && <span className="auth-links-code">{auth.orderCode}</span>}
        <button type="button" className="notion-navbar-link auth-links-btn" onClick={() => void logout()}>
          Keluar
        </button>
      </div>
    );
  }

  if (auth.kind === "guest") {
    return (
      <div className={`auth-links${compact ? " is-compact" : ""}`}>
        <span className="auth-links-label">Tamu</span>
        {auth.orderCode && <span className="auth-links-code">{auth.orderCode}</span>}
        <Link href="/masuk" className="notion-navbar-link">
          Masuk
        </Link>
        <Link href="/daftar" className="notion-navbar-link">
          Daftar
        </Link>
      </div>
    );
  }

  return (
    <div className={`auth-links${compact ? " is-compact" : ""}`}>
      <Link href="/masuk" className="notion-navbar-link">
        Masuk
      </Link>
      <Link href="/daftar" className="notion-navbar-link">
        Daftar
      </Link>
    </div>
  );
}
