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
  proofEmail?: string | null;
};

export function KreditPanel({
  kredit,
  kreditError,
  busy,
  onRequestTopup,
  onSubmitProof,
  onLabFaucet,
}: {
  kredit: KreditState | null;
  kreditError: string;
  busy: boolean;
  onRequestTopup: (amountKr: number) => void;
  onSubmitProof?: (topupId: string, notes: string, file: File | null) => void;
  onLabFaucet?: () => void;
}) {
  const [pack, setPack] = useState<(typeof KREDIT.topupPacksKr)[number]>(KREDIT.starterPriceKr);
  const open = kredit?.pendingTopups?.filter((item) => item.status !== "approved") ?? [];
  const showFaucet = Boolean(kredit?.faucetEnabled && onLabFaucet);
  const wa = kredit?.proofWa ? formatWhatsAppNumber(kredit.proofWa) : null;

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
            Permintaan isi ulang, bukan pembayaran otomatis. QRIS/VA milik pemilik <strong>belum live</strong>. Kirim
            bukti lewat form email di bawah. Saldo naik hanya setelah operator approve. Bukan Midtrans/Stripe.
          </p>
        </div>

        {open.length > 0 && (
          <ul className="kredit-pending" aria-live="polite">
            {open.map((item) => (
              <li key={item.id}>
                <TopupOpenCard
                  item={item}
                  wa={wa}
                  proofEmail={kredit?.proofEmail}
                  orderCode={kredit?.orderCode}
                  busy={busy}
                  onSubmitProof={onSubmitProof}
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
  proofEmail,
  orderCode,
  busy,
  onSubmitProof,
}: {
  item: PendingTopup;
  wa: ReturnType<typeof formatWhatsAppNumber> | null;
  proofEmail?: string | null;
  orderCode?: string | null;
  busy: boolean;
  onSubmitProof?: (topupId: string, notes: string, file: File | null) => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const waHref = wa
    ? `https://wa.me/${wa.digits}?text=${encodeURIComponent(
        topupWhatsAppMessage({ id: item.id, amountKr: item.amountKr, orderCode }),
      )}`
    : null;
  const submitted = item.status === "proof_submitted";

  return (
    <>
      <span>
        {submitted ? "Bukti terkirim" : "Pending"} {item.id}: {item.amountKr} {KREDIT.abbr} — belum masuk saldo
      </span>
      {waHref && wa ? (
        <a className="kredit-proof-wa" href={waHref} target="_blank" rel="noreferrer">
          Opsional: salin id ke WhatsApp
        </a>
      ) : null}
      {onSubmitProof && (
        <form
          className="kredit-proof-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            onSubmitProof(item.id, notes, file);
          }}
        >
          <label className="kredit-proof-label" htmlFor={`notes-${item.id}`}>
            Catatan (opsional)
          </label>
          <textarea
            id={`notes-${item.id}`}
            className="kredit-proof-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misalnya bank / jam transfer"
            disabled={busy}
          />
          <label className="kredit-proof-label" htmlFor={`file-${item.id}`}>
            Berkas bukti (gambar atau PDF, maks 5 MB)
          </label>
          <input
            id={`file-${item.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            required
          />
          <button type="submit" className="notion-button kredit-proof-submit" disabled={busy || !file}>
            {busy ? "Mengirim…" : "Kirim bukti ke email"}
          </button>
          <p className="kredit-proof-hint">
            {proofEmail
              ? `Tujuan: ${proofEmail}. Email benar-benar terkirim hanya jika SMTP diset.`
              : "Set NEXUS_TOPUP_PROOF_EMAIL. Form tetap menyimpan berkas jika SMTP belum ada."}{" "}
            Submit tidak menambah Kredit.
          </p>
        </form>
      )}
    </>
  );
}
