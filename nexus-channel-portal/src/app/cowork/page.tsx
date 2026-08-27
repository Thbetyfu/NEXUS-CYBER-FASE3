"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Alias lama /cowork → Corporat hosted */
export default function CoworkRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/corporat");
  }, [router]);
  return (
    <p style={{ textAlign: "center", padding: 48, color: "var(--notion-text-muted)" }}>
      Mengalihkan ke paket Corporat…
    </p>
  );
}
