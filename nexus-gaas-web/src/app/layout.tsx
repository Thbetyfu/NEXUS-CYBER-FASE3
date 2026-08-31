import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Cyber — Channel Starter & GaaS Cowork",
  description:
    "Website UMKM dari form + template (Rp 20.000/bulan). Upsell keamanan wasit Job/Loop GaaS — paket terpisah.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
