"use client";

import { KREDIT } from "@/lib/kredit";

export type KreditState = {
  balance: number;
  mode: "lab" | "live";
  kind?: "guest" | "account" | null;
  orderCode?: string | null;
  email?: string | null;
};

export function KreditPanel({
  kredit,
  kreditError,
  busy,
  onFaucet,
}: {
  kredit: KreditState | null;
  kreditError: string;
  busy: boolean;
  onFaucet: () => void;
}) {
  return (
    <>
      <section className="kredit-panel" aria-label="Saldo Kredit">
        <img src="/brand/nexus-kredit.svg" alt="" width={56} height={56} className="kredit-panel-mark" />
        <div className="kredit-panel-copy">
          <p className="kredit-panel-label">Kredit Nexus</p>
          <p className="kredit-panel-balance">{kredit == null ? "…" : `${kredit.balance} ${KREDIT.abbr}`}</p>
          <p className="kredit-panel-hint">
            1 {KREDIT.abbr} = Rp {KREDIT.idrPerKredit.toLocaleString("id-ID")}
            {kredit?.mode === "lab" ? " · keran lab (bukan QRIS)" : ""}
            {kredit?.orderCode ? ` · ${kredit.orderCode}` : ""}
          </p>
        </div>
        {kredit?.mode !== "live" && (
          <button type="button" className="notion-button" onClick={onFaucet} disabled={busy}>
            Isi {KREDIT.faucetAmountKr} Kredit
          </button>
        )}
      </section>
      {kreditError && (
        <p className="kredit-error" role="alert">
          {kreditError}
        </p>
      )}
    </>
  );
}
