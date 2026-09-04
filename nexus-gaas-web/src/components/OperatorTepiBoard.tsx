"use client";

import { useState } from "react";
import { tepiEnableCli } from "@/lib/honest-copy";

export function OperatorTepiBoard({ initialSlug = "" }: { initialSlug?: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/channel-starter/upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, tier: "tepi" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; protected_host?: string; host_map?: string };
      if (!res.ok || data.ok === false) {
        setError(data.error || "Upsell tepi gagal");
        return;
      }
      setResult(
        `Aktif: ${data.protected_host || slug}.nexus-lab.test — portfolio tetap. Bukan Loop. Bukan debit 20 Kr.`,
      );
    } catch {
      setError("Upsell tepi gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="operator-topup">
      <p className="operator-topup-kicker">Localhost only</p>
      <h1>Pasang Edge Shield (tepi)</h1>
      <p className="operator-topup-lead">
        SKU terpisah dari Starter 20 Kr. Menambah slug ke <code>nexus-host-map.json</code> tanpa menimpa{" "}
        <code>portfolio.nexus-lab.test</code>. Tidak membuat Job/Loop. Fail-closed di luar lab. Alternatif CLI:
      </p>
      <pre style={{ fontSize: 13, overflowX: "auto" }}>{tepiEnableCli(slug || "bu-grace")}</pre>
      {error && (
        <p className="kredit-error" role="alert">
          {error}
        </p>
      )}
      {result && <p className="operator-topup-lead">{result}</p>}
      <form onSubmit={(e) => void enable(e)} className="notion-database order-form">
        <label htmlFor="tepi-slug">Slug site yang sudah di-generate</label>
        <input
          id="tepi-slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="bu-grace"
        />
        <button type="submit" className="notion-button notion-button-primary" disabled={busy}>
          {busy ? "Memasang…" : "Enable --tier tepi"}
        </button>
      </form>
    </main>
  );
}
