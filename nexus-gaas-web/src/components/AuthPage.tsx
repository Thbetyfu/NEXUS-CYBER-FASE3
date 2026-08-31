"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { continueAsGuest } from "@/components/AuthLinks";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setError(data.error || "Gagal");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Portal tidak merespons");
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    setBusy(true);
    setError("");
    try {
      await continueAsGuest();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sesi tamu gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="order-page">
      <Navbar />
      <main className="notion-container order-main auth-page">
        <Link href="/" className="order-back">
          ← Kembali
        </Link>
        <h1 className="order-title">{register ? "Daftar akun" : "Masuk"}</h1>
        <p className="order-lead">
          Ini pintu jual Channel Portal — bukan Operator GaaS Console.{" "}
          {register
            ? "Akun menyimpan Kredit di ledger sendiri. Satu akun bisa punya banyak site nanti; MVP ini memisahkan saldo per identitas."
            : "Masuk ke akun yang sudah didaftar. Tamu memakai cookie di browser ini saja."}
        </p>
        <form onSubmit={(e) => void submit(e)} className="notion-database order-form">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="auth-password">Kata sandi</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="kredit-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="notion-button notion-button-primary order-submit" disabled={busy}>
            {busy ? "Memproses…" : register ? "Daftar" : "Masuk"}
          </button>
        </form>
        <p className="auth-switch">
          {register ? (
            <>
              Sudah punya akun? <Link href="/masuk">Masuk</Link>
            </>
          ) : (
            <>
              Belum punya akun? <Link href="/daftar">Daftar</Link>
            </>
          )}
        </p>
        <button type="button" className="notion-button auth-guest-btn" onClick={() => void guest()} disabled={busy}>
          Lanjut sebagai tamu
        </button>
        <p className="auth-honest">
          Tamu = cookie <code>nexus_portal_sid</code> di browser ini; ganti HP atau hapus cookie = saldo tamu hilang.
          Daftar = simpan akun (Kredit ikut jika daftar dari sesi tamu). Bukan SSO. Bukan login operator :3001.
        </p>
      </main>
    </div>
  );
}
