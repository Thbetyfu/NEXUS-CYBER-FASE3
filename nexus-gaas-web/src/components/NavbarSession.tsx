"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchAuthMe, type AuthView } from "@/components/AuthLinks";
import { KREDIT } from "@/lib/kredit";

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1v10M1 6h10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function NavbarSession() {
  const pathname = usePathname() ?? "/";
  const [auth, setAuth] = useState<AuthView>({ kind: null, orderCode: null, email: null });
  const [balance, setBalance] = useState<number | null>(null);

  const refresh = useCallback(() => {
    void fetchAuthMe().then((view) => {
      setAuth(view);
      if (!view.kind) {
        setBalance(null);
        return;
      }
      void fetch("/api/kredit")
        .then((res) => res.json())
        .then((data: { ok?: boolean; balance?: number }) => {
          if (data.ok && typeof data.balance === "number") {
            setBalance(data.balance);
          }
        });
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ kind: null, orderCode: null, email: null });
    setBalance(null);
    window.location.assign("/gate");
  };

  if (!auth.kind) {
    return null;
  }

  return (
    <div className="auth-links">
      {auth.kind === "account" && auth.email && (
        <span className="auth-links-label" title={auth.email}>
          {auth.email}
        </span>
      )}
      <Link href="/kredit" className="kredit-chip" title="Isi Kredit (keran lab)">
        <span className="kredit-chip-amount">
          {balance == null ? "…" : `${balance} ${KREDIT.abbr}`}
        </span>
        <span className="kredit-chip-plus" aria-hidden="true">
          <PlusIcon />
        </span>
        <span className="sr-only">Isi Kredit</span>
      </Link>
      <button type="button" className="notion-navbar-link auth-links-btn" onClick={() => void logout()}>
        Keluar
      </button>
    </div>
  );
}
