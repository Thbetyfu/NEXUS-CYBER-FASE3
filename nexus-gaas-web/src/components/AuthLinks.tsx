"use client";

export type AuthView = {
  kind: "guest" | "account" | null;
  orderCode: string | null;
  email: string | null;
};

export async function fetchAuthMe(): Promise<AuthView> {
  const res = await fetch("/api/auth/me");
  const data = (await res.json()) as AuthView & { ok?: boolean };
  if (!res.ok || data.ok === false) {
    return { kind: null, orderCode: null, email: null };
  }
  return { kind: data.kind ?? null, orderCode: data.orderCode ?? null, email: data.email ?? null };
}

export async function continueAsGuest(): Promise<AuthView> {
  const res = await fetch("/api/auth/guest", { method: "POST" });
  const data = (await res.json()) as AuthView & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "Sesi tamu gagal");
  }
  return { kind: data.kind ?? "guest", orderCode: data.orderCode ?? null, email: null };
}
