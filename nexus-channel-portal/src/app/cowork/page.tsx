"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Alias lama /cowork → segmen institusi (satu portal). */
export default function CoworkRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/institusi");
  }, [router]);
  return (
    <p style={{ textAlign: "center", padding: 48, color: "var(--notion-text-muted)" }}>
      Mengalihkan ke paket Institusi…
    </p>
  );
}
