"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Menu, Shield, X } from "lucide-react";
import { useState } from "react";
import { whatsappUrl } from "@/lib/portal-config";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="notion-navbar">
      <Link href="/" className="notion-navbar-brand">
        <Shield size={24} />
        <span>Nexus Cyber</span>
      </Link>
      <div className="notion-navbar-links desktop-only">
        <a href="#fitur" className="notion-navbar-link">
          Fitur
        </a>
        <a href="#harga" className="notion-navbar-link">
          Harga
        </a>
        <a href="#faq" className="notion-navbar-link">
          FAQ
        </a>
      </div>
      <div className="flex gap-2 notion-navbar-actions desktop-only">
        <a href={whatsappUrl()} target="_blank" rel="noopener" className="notion-button notion-button-text">
          WhatsApp
        </a>
        <Link href="/order" className="notion-button notion-button-primary">
          Pesan Sekarang
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
          <a href="#fitur" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Fitur
          </a>
          <a href="#harga" className="notion-navbar-link" onClick={() => setOpen(false)}>
            Harga
          </a>
          <Link href="/order" className="notion-button notion-button-primary" onClick={() => setOpen(false)}>
            Pesan Sekarang
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
      style={{ padding: primary ? "12px 28px" : "10px 20px", fontSize: "15px" }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
      {primary && <ArrowRight size={16} style={{ marginLeft: 8, display: "inline" }} />}
    </motion.a>
  );
}
