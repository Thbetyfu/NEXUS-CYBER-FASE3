"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { OwnedSiteCard } from "@/lib/portal-site-owner";

export function MySitesPanel() {
  const [sites, setSites] = useState<OwnedSiteCard[] | null>(null);
  const [error, setError] = useState("");
  const [claimSlug, setClaimSlug] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimNote, setClaimNote] = useState("");

  const load = useCallback(() => {
    setError("");
    void fetch("/api/channel-starter/sites")
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          operatorDetail?: string;
          sites?: OwnedSiteCard[];
        };
        if (res.status === 401) {
          window.location.assign("/gate?next=/situs");
          return;
        }
        if (!res.ok || !data.ok) {
          setSites([]);
          const detail = data.operatorDetail ? ` (${data.operatorDetail})` : "";
          setError((data.error || "Tidak bisa memuat situs") + detail);
          return;
        }
        setSites(data.sites || []);
      })
      .catch(() => {
        setSites([]);
        setError("Tidak bisa memuat situs");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (sites == null && !error) {
    return <p className="order-lead">Memuat situs sesi ini…</p>;
  }

  return (
    <div className="my-sites">
      {error ? (
        <p className="order-lead" role="alert">
          {error}
        </p>
      ) : null}
      {sites && sites.length === 0 && !error ? (
        <p className="order-lead">
          Belum ada situs terikat ke sesi ini. Generate di{" "}
          <Link href="/pesan/umkm-starter">/pesan/umkm-starter</Link> (20 Kredit) setelah login,
          atau klaim slug lama yang Anda ingat (satu folder, bukan seluruh disk).
        </p>
      ) : null}
      <ul className="my-sites-list">
        {(sites || []).map((site) => {
          const preview = `/starter/preview/${site.slug}`;
          return (
            <li key={site.slug} className="my-sites-item">
              <p className="my-sites-name">{site.businessName}</p>
              <p className="my-sites-slug">
                slug <code>{site.slug}</code>
              </p>
              <p className="my-sites-links">
                <a href={preview}>Preview lab</a>
                {site.published && site.vercelUrl ? (
                  <>
                    {" · "}
                    <a href={site.vercelUrl} rel="noreferrer" target="_blank">
                      {site.vercelUrl}
                    </a>
                  </>
                ) : (
                  <span> · belum publish</span>
                )}
              </p>
              <p className="my-sites-note">
                Preview = HTML Starter, bukan WAF. *.vercel.app bukan Edge Shield.
              </p>
            </li>
          );
        })}
      </ul>
      <p className="order-lead">
        Nama tampilan boleh sama; slug folder/preview harus unik (
        <code>bu-grace</code> lalu <code>bu-grace-2</code>
        ). Generate baru tidak menimpa situs lama.
      </p>
      <form
        className="my-sites-claim"
        onSubmit={async (e) => {
          e.preventDefault();
          setClaimBusy(true);
          setClaimError("");
          setClaimNote("");
          try {
            const res = await fetch("/api/channel-starter/sites/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: claimSlug }),
            });
            const data = (await res.json()) as {
              ok?: boolean;
              error?: string;
              outcome?: string;
            };
            if (res.status === 401) {
              window.location.assign("/gate?next=/situs");
              return;
            }
            if (!res.ok || data.ok === false) {
              setClaimError(data.error || "Klaim slug gagal");
              return;
            }
            setClaimNote(
              data.outcome === "already_yours"
                ? `Slug ${claimSlug.trim().toLowerCase()} sudah milik sesi ini.`
                : `Slug ${claimSlug.trim().toLowerCase()} terikat ke sesi ini. Tanpa debit 20 Kr.`,
            );
            setClaimSlug("");
            load();
          } catch {
            setClaimError("Klaim slug gagal");
          } finally {
            setClaimBusy(false);
          }
        }}
      >
        <h2 className="my-sites-claim-title">Klaim slug</h2>
        <p className="my-sites-note">
          Folder lama tanpa pemilik. Harus tahu slug persis. Bukan mengambil situs orang lain. Bukan
          WAF. Tanpa debit Kredit.
        </p>
        {claimError ? (
          <p className="kredit-error" role="alert">
            {claimError}
          </p>
        ) : null}
        {claimNote ? <p className="order-lead">{claimNote}</p> : null}
        <label htmlFor="claim-slug">Slug</label>
        <input
          id="claim-slug"
          required
          value={claimSlug}
          onChange={(e) => setClaimSlug(e.target.value)}
          placeholder="bu-grace"
          autoComplete="off"
        />
        <button type="submit" className="notion-button notion-button-primary" disabled={claimBusy}>
          {claimBusy ? "Mengikat…" : "Klaim slug"}
        </button>
      </form>
      <p className="order-lead">
        <button type="button" className="notion-button" onClick={() => load()}>
          Muat ulang
        </button>
      </p>
    </div>
  );
}
