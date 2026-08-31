"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Alias lama /b2g → /pemerintah */
export default function B2GRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pemerintah");
  }, [router]);
  return (
    <p style={{ textAlign: "center", padding: 48, color: "var(--notion-text-muted)" }}>
      Mengalihkan ke Pemerintah…
    </p>
  );
}
