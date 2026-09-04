"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { OwnedSiteCard } from "@/lib/portal-site-owner";

export function MySitesPanel() {
  const [sites, setSites] = useState<OwnedSiteCard[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    void fetch("/api/channel-starter/sites")
      .then(async (res) => {
        const data = (await res.json()) as { ok?: boolean; error?: string; sites?: OwnedSiteCard[] };
        if (res.status === 401) {
          window.location.assign("/gate?next=/situs");
          return;
        }
        if (!res.ok || !data.ok) {
          setSites([]);
          setError(data.error || "Tidak bisa memuat situs");
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
          <Link href="/pesan/umkm-starter">/pesan/umkm-starter</Link> (20 Kredit). Situs lama tanpa
          pemilik di manifest tidak muncul — generate ulang, jangan mengklaim semua folder lab.
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
        <button type="button" className="notion-button" onClick={() => load()}>
          Muat ulang
        </button>
      </p>
    </div>
  );
}
