"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnedSiteCard } from "@/lib/portal-site-owner";

export function OperatorUnownedBoard() {
  const [sites, setSites] = useState<OwnedSiteCard[]>([]);
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/channel-starter/sites/unowned");
      const data = (await res.json()) as { ok?: boolean; error?: string; sites?: OwnedSiteCard[] };
      if (!res.ok || data.ok === false) {
        setError(data.error || "Daftar slug tanpa pemilik gagal");
        setSites([]);
        return;
      }
      setSites(data.sites || []);
      setError("");
    } catch {
      setError("Daftar slug tanpa pemilik gagal");
      setSites([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const attach = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/channel-starter/sites/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; outcome?: string };
      if (!res.ok || data.ok === false) {
        setError(data.error || "Attach gagal");
        return;
      }
      setResult(
        data.outcome === "already_yours"
          ? `Slug ${slug} sudah milik akun itu.`
          : `Slug ${slug} terikat ke ${email}. Bukan debit 20 Kr. Bukan WAF.`,
      );
      setSlug("");
      await load();
    } catch {
      setError("Attach gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="operator-topup">
      <p className="operator-topup-kicker">Localhost only</p>
      <h1>Slug tanpa pemilik</h1>
      <p className="operator-topup-lead">
        Folder lama tanpa <code>portal_owner_*</code>. Bukan daftar semua situs disk ke sesi
        siapa pun. Attach satu slug ke akun terdaftar. Fail-closed di luar lab — sama{" "}
        <a href="/operator/tepi">/operator/tepi</a>. Pelanggan bisa klaim sendiri di{" "}
        <a href="/situs">/situs</a> jika tahu slug. Tanpa debit 20 Kr.
      </p>
      {error && (
        <p className="kredit-error" role="alert">
          {error}
        </p>
      )}
      {result && <p className="operator-topup-lead">{result}</p>}
      {sites.length === 0 ? (
        <p className="operator-topup-empty">Tidak ada folder tanpa pemilik (selain demo).</p>
      ) : (
        <ul className="operator-topup-list">
          {sites.map((site) => (
            <li key={site.slug}>
              <code>{site.slug}</code> — {site.businessName}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void attach(e)} className="notion-database order-form">
        <label htmlFor="attach-slug">Slug</label>
        <input
          id="attach-slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="bu-grace"
        />
        <label htmlFor="attach-email">Email akun portal</label>
        <input
          id="attach-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="thoriq2@gmail.com"
        />
        <button type="submit" className="notion-button notion-button-primary" disabled={busy}>
          {busy ? "Mengikat…" : "Attach slug ke akun"}
        </button>
      </form>
    </main>
  );
}
