"use client";

import { useState } from "react";
import { KREDIT, type PendingTopup } from "@/lib/kredit";

export type KreditState = {
  balance: number;
  mode: "lab" | "live";
  kind?: "guest" | "account" | null;
  orderCode?: string | null;
  email?: string | null;
  pendingTopups?: PendingTopup[];
  faucetEnabled?: boolean;
  proofWa?: string | null;
};

export function KreditPanel({
  kredit,
  kreditError,
  busy,
  onRequestTopup,
  onLabFaucet,
}: {
  kredit: KreditState | null;
  kreditError: string;
  busy: boolean;
  onRequestTopup: (amountKr: number) => void;
  onLabFaucet?: () => void;
}) {
  const [pack, setPack] = useState<(typeof KREDIT.topupPacksKr)[number]>(KREDIT.starterPriceKr);
  const pending = kredit?.pendingTopups?.filter((item) => item.status === "pending") ?? [];
  const showFaucet = Boolean(kredit?.faucetEnabled && onLabFaucet);
  const proofWa = kredit?.proofWa?.replace(/\D/g, "") || "";

  return (
    <>
      <section className="kredit-panel" aria-label="Saldo dan isi ulang Kredit">
        <div className="kredit-panel-row">
          <img src="/brand/nexus-kredit.svg" alt="" width={56} height={56} className="kredit-panel-mark" />
          <div className="kredit-panel-copy">
            <p className="kredit-panel-label">Kredit Nexus</p>
            <p className="kredit-panel-balance">{kredit == null ? "…" : `${kredit.balance} ${KREDIT.abbr}`}</p>
            <p className="kredit-panel-hint">
              1 {KREDIT.abbr} = Rp {KREDIT.idrPerKredit.toLocaleString("id-ID")}
              {kredit?.orderCode ? ` · ${kredit.orderCode}` : ""}
            </p>
          </div>
        </div>

        <div className="kredit-topup">
          <p className="kredit-topup-label">Beli / isi ulang</p>
          <div className="kredit-packs" role="group" aria-label="Jumlah Kredit">
            {KREDIT.topupPacksKr.map((amount) => (
              <button
                key={amount}
                type="button"
                className={amount === pack ? "kredit-pack is-on" : "kredit-pack"}
                onClick={() => setPack(amount)}
                disabled={busy}
              >
                {amount} {KREDIT.abbr}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="notion-button notion-button-primary kredit-topup-submit"
            onClick={() => onRequestTopup(pack)}
            disabled={busy || kredit == null}
          >
            {busy ? "Mencatat…" : `Isi ${pack} Kredit`}
          </button>
          <p className="kredit-topup-copy">
            Ini permintaan isi ulang, bukan pembayaran otomatis. Settlement IDR (QRIS / VA milik pemilik){" "}
            <strong>belum live</strong> — tidak ada gambar QR atau nomor VA di repo. Saldo bertambah hanya setelah
            operator menyetujui bukti. Bukan Midtrans/Stripe. Setara {pack.toLocaleString("id-ID")} × Rp{" "}
            {KREDIT.idrPerKredit.toLocaleString("id-ID")} = Rp {(pack * KREDIT.idrPerKredit).toLocaleString("id-ID")}{" "}
            jika nanti ditransfer.
          </p>
        </div>

        {pending.length > 0 && (
          <ul className="kredit-pending" aria-live="polite">
            {pending.map((item) => {
              const waHref =
                proofWa.length > 7
                  ? `https://wa.me/${proofWa}?text=${encodeURIComponent(
                      `Bukti isi ulang Kredit ${item.id} (${item.amountKr} Kr). Bukan beli paket Starter.`,
                    )}`
                  : null;
              return (
                <li key={item.id}>
                  <span>
                    Pending {item.id}: {item.amountKr} {KREDIT.abbr} — belum masuk saldo
                  </span>
                  {waHref ? (
                    <a className="kredit-proof-wa" href={waHref} target="_blank" rel="noreferrer">
                      Kirim bukti (WhatsApp, bukan CTA beli paket)
                    </a>
                  ) : (
                    <span className="kredit-proof-hint">Kirim bukti ke operator lab (QRIS/VA belum di-repo).</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {showFaucet && (
          <button type="button" className="kredit-faucet-lab" onClick={onLabFaucet} disabled={busy}>
            Keran lab (uji, bukan bayar)
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
