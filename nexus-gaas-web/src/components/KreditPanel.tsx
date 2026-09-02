"use client";

import { useState } from "react";
import { KREDIT, type PendingTopup } from "@/lib/kredit";
import { formatWhatsAppNumber, topupWhatsAppMessage } from "@/lib/portal-config";

export type KreditState = {
  balance: number;
  mode: "lab" | "live";
  kind?: "guest" | "account" | null;
  orderCode?: string | null;
  email?: string | null;
  pendingTopups?: PendingTopup[];
  faucetEnabled?: boolean;
  proofWa?: string | null;
  danaNumber?: string | null;
  danaLabel?: string | null;
};

export function KreditPanel({
  kredit,
  kreditError,
  busy,
  onRequestTopup,
  onSubmitProof,
  onCancelTopup,
  onLabFaucet,
}: {
  kredit: KreditState | null;
  kreditError: string;
  busy: boolean;
  onRequestTopup: (amountKr: number) => void;
  onSubmitProof?: (topupId: string, notes: string, file: File | null) => void;
  onCancelTopup?: (topupId: string) => void;
  onLabFaucet?: () => void;
}) {
  const [pack, setPack] = useState<(typeof KREDIT.topupPacksKr)[number]>(KREDIT.starterPriceKr);
  const open = kredit?.pendingTopups?.filter((item) => item.status === "pending" || item.status === "proof_submitted") ?? [];
  const hasOpen = open.length > 0;
  const showFaucet = Boolean(kredit?.faucetEnabled && onLabFaucet);
  const wa = kredit?.proofWa ? formatWhatsAppNumber(kredit.proofWa) : null;
  const danaNumber = kredit?.danaNumber?.trim() || formatWhatsAppNumber().local;

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
                disabled={busy || hasOpen}
              >
                {amount} {KREDIT.abbr}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="notion-button notion-button-primary kredit-topup-submit"
            onClick={() => onRequestTopup(pack)}
            disabled={busy || kredit == null || hasOpen}
          >
            {busy ? "Mencatat…" : `Isi ${pack} Kredit`}
          </button>
          <p className="kredit-topup-copy">
            {hasOpen
              ? "Satu permintaan terbuka. Selesaikan bukti atau Batalkan untuk ganti paket."
              : "Setelah Isi: bayar ke Nomor DANA, unggah bukti, lalu Kirim bukti. WhatsApp muncul setelah bukti terkirim. Saldo naik hanya setelah konfirmasi operator. Bukan Midtrans/Stripe."}
          </p>
        </div>

        {open.length > 0 && (
          <ul className="kredit-pending" aria-live="polite">
            {open.map((item) => (
              <li key={item.id}>
                <TopupOpenCard
                  item={item}
                  wa={wa}
                  danaNumber={danaNumber}
                  danaLabel={kredit?.danaLabel}
                  busy={busy}
                  onSubmitProof={onSubmitProof}
                  onCancelTopup={onCancelTopup}
                />
              </li>
            ))}
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

function TopupOpenCard({
  item,
  wa,
  danaNumber,
  danaLabel,
  busy,
  onSubmitProof,
  onCancelTopup,
}: {
  item: PendingTopup;
  wa: ReturnType<typeof formatWhatsAppNumber> | null;
  danaNumber: string;
  danaLabel?: string | null;
  busy: boolean;
  onSubmitProof?: (topupId: string, notes: string, file: File | null) => void;
  onCancelTopup?: (topupId: string) => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const submitted = item.status === "proof_submitted";
  const waHref =
    submitted && wa
      ? `https://wa.me/${wa.digits}?text=${encodeURIComponent(
          topupWhatsAppMessage({ id: item.id, amountKr: item.amountKr }),
        )}`
      : null;

  return (
    <>
      <div className="kredit-pending-head">
        <p className="kredit-pending-title">
          {submitted
            ? `Bukti terkirim — ${item.amountKr} ${KREDIT.abbr}`
            : `Menunggu pembayaran ${item.amountKr} ${KREDIT.abbr}`}
        </p>
        {onCancelTopup ? (
          <button
            type="button"
            className="kredit-cancel"
            onClick={() => onCancelTopup(item.id)}
            disabled={busy}
          >
            Batalkan
          </button>
        ) : null}
      </div>
      <div className="kredit-dana">
        <p className="kredit-dana-kicker">{danaLabel?.trim() || "Nomor DANA"}</p>
        <p className="kredit-dana-number">{danaNumber}</p>
      </div>
      {onSubmitProof && !submitted && (
        <form
          className="kredit-proof-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            onSubmitProof(item.id, notes, file);
          }}
        >
          <label className="kredit-proof-label" htmlFor={`file-${item.id}`}>
            Input gambar (bukti transfer)
          </label>
          <input
            id={`file-${item.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            required
          />
          <label className="kredit-proof-label" htmlFor={`notes-${item.id}`}>
            Catatan (opsional)
          </label>
          <textarea
            id={`notes-${item.id}`}
            className="kredit-proof-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misalnya jam transfer"
            disabled={busy}
          />
          <button type="submit" className="notion-button kredit-proof-submit" disabled={busy || !file}>
            {busy ? "Mengirim…" : "Kirim bukti"}
          </button>
        </form>
      )}
      {waHref ? (
        <p className="kredit-proof-wa-after">
          <a className="notion-button kredit-wa-open" href={waHref} target="_blank" rel="noreferrer">
            Buka WhatsApp
          </a>
        </p>
      ) : null}
    </>
  );
}
