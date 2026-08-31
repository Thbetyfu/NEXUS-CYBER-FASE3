"use client";

import { useCallback, useEffect, useState } from "react";
import type { KreditState } from "@/components/KreditPanel";
import { KREDIT } from "@/lib/kredit";

export function useKreditSession() {
  const [kredit, setKredit] = useState<KreditState | null>(null);
  const [kreditError, setKreditError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadKredit = useCallback(async () => {
    try {
      const res = await fetch("/api/kredit");
      const data = (await res.json()) as KreditState & { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setKreditError(data.error || "Ledger Kredit tidak terbaca");
        return;
      }
      setKredit({
        balance: data.balance,
        mode: data.mode,
        kind: data.kind,
        orderCode: data.orderCode,
        email: data.email,
      });
      setKreditError("");
    } catch {
      setKreditError("Ledger Kredit tidak terbaca");
    }
  }, []);

  useEffect(() => {
    void loadKredit();
  }, [loadKredit]);

  const isiKeran = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/kredit/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: KREDIT.faucetAmountKr }),
      });
      const data = (await res.json()) as KreditState & { error?: string };
      if (!res.ok) {
        setKreditError(data.error || "Keran gagal");
        return;
      }
      setKredit({
        balance: data.balance,
        mode: data.mode,
        kind: data.kind,
        orderCode: data.orderCode,
        email: data.email,
      });
      setKreditError("");
    } catch {
      setKreditError("Keran gagal");
    } finally {
      setBusy(false);
    }
  };

  return { kredit, setKredit, kreditError, setKreditError, busy, setBusy, isiKeran };
}
