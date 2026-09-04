"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Menu, Shield, X } from "lucide-react";
import { useState } from "react";
import { NavbarSession } from "@/components/NavbarSession";
import { isWhatsAppHref } from "@/lib/portal-config";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const path = usePathname() ?? "/";
  const onHub = path === "/";
  const onGate = path === "/gate";

  return (
    <nav className="notion-navbar">
      <Link href="/" className="notion-navbar-brand">
        <Shield size={24} />
        <span>Nexus Cyber</span>
      </Link>
      {!onGate && (
        <div className="notion-navbar-links desktop-only">
          <Link href="/umkm" className="notion-navbar-link">
            UMKM
          </Link>
          <Link href="/sekolah" className="notion-navbar-link">
            Sekolah
          </Link>
          <Link href="/startup" className="notion-navbar-link">
            Startup
          </Link>
          <Link href="/corporat" className="notion-navbar-link">
            Corporat
          </Link>
          <Link href="/pemerintah" className="notion-navbar-link">
            Pemerintah
          </Link>
        </div>
      )}
      <div className="flex gap-2 notion-navbar-actions">
        <NavbarSession />
        {!onHub && !onGate && (
          <Link href="/" className="notion-navbar-link desktop-only">
            Semua segmen
          </Link>
        )}
      </div>
      {!onGate && (
        <button
          type="button"
          className="mobile-menu-btn"
          style={{ display: "none", background: "none", border: "none" }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}
      {open && !onGate && (
        <div className="mobile-menu-drawer">
          <Link href="/umkm" className="notion-navbar-link" onClick={() => setOpen(false)}>
            UMKM
          </Link>
          <Link href="/sekolah" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Sekolah
          </Link>
          <Link href="/startup" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Startup
          </Link>
          <Link href="/corporat" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Corporat
          </Link>
          <Link href="/pemerintah" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Pemerintah
          </Link>
          <Link href="/situs" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Situs saya
          </Link>
          <Link href="/kredit" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Isi Kredit
          </Link>
          <Link href="/" className="notion-button notion-button-primary" onClick={() => setOpen(false)}>
            Semua segmen
          </Link>
        </div>
      )}
    </nav>
  );
}

const ctaStyle = (primary: boolean) =>
  ({
    padding: primary ? "12px 28px" : "10px 20px",
    fontSize: "15px",
    width: "100%",
    justifyContent: "center",
    display: "inline-flex",
    alignItems: "center",
  }) as const;

export function WaCta({
  label,
  href,
  primary = false,
}: {
  label: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener"
      className={primary ? "notion-button notion-button-primary" : "notion-button"}
      style={ctaStyle(primary)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
      {primary && <ArrowRight size={16} style={{ marginLeft: 8, display: "inline" }} />}
    </motion.a>
  );
}

/** Internal `/pesan/{sku}` vs WhatsApp (on-prem saja). */
export function PlanCta({
  label,
  href,
  primary = false,
}: {
  label?: string;
  href: string;
  primary?: boolean;
}) {
  const wa = isWhatsAppHref(href);
  const text = label ?? (wa ? "Pesan via WhatsApp" : "Isi form paket");
  if (wa) {
    return <WaCta label={text} href={href} primary={primary} />;
  }
  return (
    <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} style={{ width: "100%" }}>
      <Link
        href={href}
        className={primary ? "notion-button notion-button-primary" : "notion-button"}
        style={ctaStyle(primary)}
      >
        {text}
        {primary && <ArrowRight size={16} style={{ marginLeft: 8, display: "inline" }} />}
      </Link>
    </motion.div>
  );
}
