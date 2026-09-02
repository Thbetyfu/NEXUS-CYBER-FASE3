"use client";

import { useCallback, useEffect, useState } from "react";
import { isOpenTopupStatus, type OperatorTopupView } from "@/lib/kredit";

type QueuePayload = { ok?: boolean; error?: string; items?: OperatorTopupView[] };

export function OperatorTopupBoard() {
  const [items, setItems] = useState<OperatorTopupView[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kredit/topup/queue");
      const data = (await res.json()) as QueuePayload;
      if (!res.ok || data.ok === false) {
        setError(data.error || "Antrian tidak terbaca");
        return;
      }
      const rows = Array.isArray(data.items) ? data.items : [];
      setItems(rows.filter((item) => isOpenTopupStatus(item.status)));
      setError("");
    } catch {
      setError("Antrian tidak terbaca");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/kredit/topup/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setError(data.error || "Konfirmasi gagal");
        return;
      }
      await load();
    } catch {
      setError("Konfirmasi gagal");
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="operator-topup">
      <p className="operator-topup-kicker">Localhost only</p>
      <h1>Konfirmasi isi Kredit</h1>
      <p className="operator-topup-lead">
        Bukan SOC publik. Saldo pelanggan naik hanya setelah tombol ini (atau{" "}
        <code>POST /api/kredit/topup/approve</code>). WhatsApp tidak mengkredit otomatis. Bukan Midtrans.
      </p>
      {error && (
        <p className="kredit-error" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="operator-topup-empty">Tidak ada permintaan pending.</p>
      ) : (
        <ul className="operator-topup-list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.id}</strong> · {item.amountKr} Kr · {item.status}
                <span className="operator-topup-meta">
                  {item.walletId} · {new Date(item.createdAt).toLocaleString("id-ID")}
                </span>
                {item.notes ? <p className="operator-topup-notes">{item.notes}</p> : null}
                {item.hasProof ? (
                  <p>
                    <a href={`/api/kredit/topup/proof-file?id=${encodeURIComponent(item.id)}`} target="_blank" rel="noreferrer">
                      Lihat berkas bukti
                    </a>
                  </p>
                ) : (
                  <p className="operator-topup-meta">Belum ada gambar bukti.</p>
                )}
              </div>
              <button
                type="button"
                className="notion-button notion-button-primary"
                onClick={() => void confirm(item.id)}
                disabled={Boolean(busyId)}
              >
                {busyId === item.id ? "Mengkredit…" : "Konfirmasi isi"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
