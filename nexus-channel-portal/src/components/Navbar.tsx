"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Menu, Shield, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="notion-navbar">
      <Link href="/" className="notion-navbar-brand">
        <Shield size={24} />
        <span>Nexus Cyber</span>
      </Link>
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
        <Link href="/institusi" className="notion-navbar-link">
          Institusi
        </Link>
        <Link href="/b2g" className="notion-navbar-link">
          B2G
        </Link>
      </div>
      <div className="flex gap-2 notion-navbar-actions desktop-only">
        <Link href="/" className="notion-button notion-button-primary">
          Pilih segmen
        </Link>
      </div>
      <button
        type="button"
        className="mobile-menu-btn"
        style={{ display: "none", background: "none", border: "none" }}
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
      {open && (
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
          <Link href="/institusi" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Institusi
          </Link>
          <Link href="/b2g" className="notion-navbar-link" onClick={() => setOpen(false)}>
            B2G
          </Link>
          <Link href="/" className="notion-button notion-button-primary" onClick={() => setOpen(false)}>
            Pilih segmen
          </Link>
        </div>
      )}
    </nav>
  );
}

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
      style={{
        padding: primary ? "12px 28px" : "10px 20px",
        fontSize: "15px",
        width: "100%",
        justifyContent: "center",
        display: "inline-flex",
        alignItems: "center",
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
      {primary && <ArrowRight size={16} style={{ marginLeft: 8, display: "inline" }} />}
    </motion.a>
  );
}
