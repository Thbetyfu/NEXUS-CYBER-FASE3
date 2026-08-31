"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Alias lama /institusi → /corporat */
export default function InstitusiRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/corporat");
  }, [router]);
  return (
    <p style={{ textAlign: "center", padding: 48, color: "var(--notion-text-muted)" }}>
      Mengalihkan ke Corporat…
    </p>
  );
}
