"use client";

import { useCallback, useEffect, useState } from "react";
import type { KreditState } from "@/components/KreditPanel";
import type { PendingTopup } from "@/lib/kredit";

type KreditPayload = KreditState & { ok?: boolean; error?: string; credited?: boolean };

function fromPayload(data: KreditPayload): KreditState {
  return {
    balance: data.balance,
    mode: data.mode,
    kind: data.kind,
    orderCode: data.orderCode,
    email: data.email,
    pendingTopups: Array.isArray(data.pendingTopups) ? (data.pendingTopups as PendingTopup[]) : [],
    faucetEnabled: Boolean(data.faucetEnabled),
    proofWa: data.proofWa ?? null,
  };
}

export function useKreditSession() {
  const [kredit, setKredit] = useState<KreditState | null>(null);
  const [kreditError, setKreditError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadKredit = useCallback(async () => {
    try {
      const res = await fetch("/api/kredit");
      const data = (await res.json()) as KreditPayload;
      if (!res.ok || data.ok === false) {
        setKreditError(data.error || "Ledger Kredit tidak terbaca");
        return;
      }
      setKredit(fromPayload(data));
      setKreditError("");
    } catch {
      setKreditError("Ledger Kredit tidak terbaca");
    }
  }, []);

  useEffect(() => {
    void loadKredit();
  }, [loadKredit]);

  const requestTopup = async (amountKr: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/kredit/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountKr }),
      });
      const data = (await res.json()) as KreditPayload;
      if (!res.ok) {
        setKreditError(data.error || "Permintaan isi ulang gagal");
        return;
      }
      setKredit(fromPayload(data));
      setKreditError("");
    } catch {
      setKreditError("Permintaan isi ulang gagal");
    } finally {
      setBusy(false);
    }
  };

  const isiKeran = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/kredit/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as KreditPayload;
      if (!res.ok) {
        setKreditError(data.error || "Keran lab gagal");
        return;
      }
      setKredit(fromPayload(data));
      setKreditError("");
    } catch {
      setKreditError("Keran lab gagal");
    } finally {
      setBusy(false);
    }
  };

  return { kredit, setKredit, kreditError, setKreditError, busy, setBusy, requestTopup, isiKeran };
}
