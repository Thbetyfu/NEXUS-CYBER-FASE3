import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Cyber — Channel Starter & GaaS Cowork",
  description:
    "Channel Starter (20 Kr, header tepi) ≠ Edge Shield (--tier tepi, 1 host lab) ≠ Job/Loop Cowork. Bukan 100 UMKM di belakang WAF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Inspector/ekstensi sering menyuntik style cursor:none ke <body> → overlay hydration Next.
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
