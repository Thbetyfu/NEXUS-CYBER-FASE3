import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { withLock } from "./mutex.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import {
  COOKIE_SID,
  defaultDataDir,
  identitiesPath,
  isUuid,
  ledgerPathFor,
  orderCodeFromId,
  walletIdFor,
  type IdentityKind,
} from "./identity-paths.ts";

export {
  COOKIE_SID,
  defaultDataDir,
  identitiesPath,
  isUuid,
  ledgerPathFor,
  orderCodeFromId,
  walletIdFor,
  type IdentityKind,
};

type SessionRow = {
  sid: string;
  kind: IdentityKind;
  guestId?: string;
  accountId?: string;
  createdAt: string;
};

type AccountRow = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type IdentityStore = {
  version: 1;
  sessions: Record<string, SessionRow>;
  accounts: AccountRow[];
};

export type PortalIdentity = {
  sid: string;
  kind: IdentityKind;
  guestId?: string;
  accountId?: string;
  email?: string;
  walletId: string;
  orderCode: string;
};

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function ledgerFileFor(identity: PortalIdentity, dataDir = defaultDataDir()): string {
  const id = identity.kind === "account" ? identity.accountId : identity.guestId;
  if (!id) {
    throw new Error("identitas tanpa id");
  }
  return ledgerPathFor(identity.kind, id, dataDir);
}

function emptyStore(): IdentityStore {
  return { version: 1, sessions: {}, accounts: [] };
}

function readStore(filePath: string): IdentityStore {
  if (!existsSync(filePath)) {
    return emptyStore();
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as IdentityStore;
  if (parsed.version !== 1 || !parsed.sessions || !Array.isArray(parsed.accounts)) {
    throw new Error("Berkas identitas portal rusak");
  }
  return parsed;
}

function writeStore(filePath: string, store: IdentityStore): void {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  try {
    renameSync(tmp, filePath);
  } catch {
    try {
      unlinkSync(filePath);
    } catch {
      /* dest may not exist */
    }
    renameSync(tmp, filePath);
  }
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function applySidCookie(response: NextResponse, sid: string): void {
  response.cookies.set(COOKIE_SID, sid, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSidCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_SID, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function toIdentity(store: IdentityStore, session: SessionRow): PortalIdentity {
  if (session.kind === "account" && session.accountId) {
    const account = store.accounts.find((a) => a.id === session.accountId);
    return {
      sid: session.sid,
      kind: "account",
      accountId: session.accountId,
      email: account?.email,
      walletId: walletIdFor("account", session.accountId),
      orderCode: orderCodeFromId(session.accountId),
    };
  }
  const guestId = session.guestId ?? session.sid;
  return {
    sid: session.sid,
    kind: "guest",
    guestId,
    walletId: walletIdFor("guest", guestId),
    orderCode: orderCodeFromId(guestId),
  };
}

export function readSidFromRequest(request: NextRequest): string | null {
  const raw = request.cookies.get(COOKIE_SID)?.value?.trim() ?? "";
  return isUuid(raw) ? raw.toLowerCase() : null;
}

export async function lookupIdentity(
  sid: string | null,
  dataDir = defaultDataDir(),
): Promise<PortalIdentity | null> {
  if (!sid) {
    return null;
  }
  return withLock(() => {
    const store = readStore(identitiesPath(dataDir));
    const session = store.sessions[sid];
    if (!session) {
      return null;
    }
    return toIdentity(store, session);
  });
}

function createGuestRow(): SessionRow {
  const sid = randomUUID();
  return { sid, kind: "guest", guestId: sid, createdAt: new Date().toISOString() };
}

export async function ensureGuestIdentity(
  request: NextRequest,
  dataDir = defaultDataDir(),
): Promise<{ identity: PortalIdentity; issuedSid: string | null }> {
  const existingSid = readSidFromRequest(request);
  return withLock(() => {
    const filePath = identitiesPath(dataDir);
    const store = readStore(filePath);
    if (existingSid && store.sessions[existingSid]) {
      return { identity: toIdentity(store, store.sessions[existingSid]), issuedSid: null };
    }
    const row = createGuestRow();
    store.sessions[row.sid] = row;
    writeStore(filePath, store);
    return { identity: toIdentity(store, row), issuedSid: row.sid };
  });
}

export async function continueAsGuest(
  request: NextRequest,
  dataDir = defaultDataDir(),
): Promise<{ identity: PortalIdentity; issuedSid: string | null }> {
  const existingSid = readSidFromRequest(request);
  return withLock(() => {
    const filePath = identitiesPath(dataDir);
    const store = readStore(filePath);
    if (existingSid && store.sessions[existingSid]?.kind === "guest") {
      return { identity: toIdentity(store, store.sessions[existingSid]), issuedSid: null };
    }
    const row = createGuestRow();
    store.sessions[row.sid] = row;
    writeStore(filePath, store);
    return { identity: toIdentity(store, row), issuedSid: row.sid };
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertPassword(password: string): void {
  if (password.length < 8) {
    throw new AuthError("Kata sandi minimal 8 karakter", 400);
  }
}

/** Must be the unlocked migrate — register already holds withLock. */
export type LedgerMigrateFn = (fromGuestId: string, toAccountId: string, dataDir: string) => void | Promise<void>;

export async function registerAccount(
  emailRaw: string,
  password: string,
  request: NextRequest,
  migrateGuestLedger: LedgerMigrateFn,
  dataDir = defaultDataDir(),
): Promise<{ identity: PortalIdentity; issuedSid: string }> {
  const email = normalizeEmail(emailRaw);
  if (!email.includes("@") || email.length < 5) {
    throw new AuthError("Email tidak valid", 400);
  }
  assertPassword(password);
  const passwordHash = await hashPassword(password);
  const existingSid = readSidFromRequest(request);

  return withLock(async () => {
    const filePath = identitiesPath(dataDir);
    const store = readStore(filePath);
    if (store.accounts.some((a) => a.email === email)) {
      throw new AuthError("Email sudah terdaftar", 409);
    }
    const accountId = randomUUID();
    store.accounts.push({
      id: accountId,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    const guestId =
      existingSid && store.sessions[existingSid]?.kind === "guest"
        ? store.sessions[existingSid].guestId ?? existingSid
        : undefined;
    if (guestId) {
      await migrateGuestLedger(guestId, accountId, dataDir);
    }
    const sid = randomUUID();
    if (existingSid) {
      delete store.sessions[existingSid];
    }
    store.sessions[sid] = {
      sid,
      kind: "account",
      accountId,
      createdAt: new Date().toISOString(),
    };
    writeStore(filePath, store);
    return { identity: toIdentity(store, store.sessions[sid]), issuedSid: sid };
  });
}

export async function loginAccount(
  emailRaw: string,
  password: string,
  request: NextRequest,
  dataDir = defaultDataDir(),
): Promise<{ identity: PortalIdentity; issuedSid: string }> {
  const email = normalizeEmail(emailRaw);
  const existingSid = readSidFromRequest(request);

  const preview = await withLock(() => {
    const store = readStore(identitiesPath(dataDir));
    return store.accounts.find((a) => a.email === email) ?? null;
  });
  if (!preview) {
    throw new AuthError("Email atau kata sandi salah", 401);
  }
  const ok = await verifyPassword(password, preview.passwordHash);
  if (!ok) {
    throw new AuthError("Email atau kata sandi salah", 401);
  }

  return withLock(() => {
    const filePath = identitiesPath(dataDir);
    const store = readStore(filePath);
    const account = store.accounts.find((a) => a.email === email);
    if (!account) {
      throw new AuthError("Email atau kata sandi salah", 401);
    }
    if (existingSid) {
      delete store.sessions[existingSid];
    }
    const sid = randomUUID();
    store.sessions[sid] = {
      sid,
      kind: "account",
      accountId: account.id,
      createdAt: new Date().toISOString(),
    };
    writeStore(filePath, store);
    return { identity: toIdentity(store, store.sessions[sid]), issuedSid: sid };
  });
}

export async function logoutSession(request: NextRequest, dataDir = defaultDataDir()): Promise<void> {
  const sid = readSidFromRequest(request);
  if (!sid) {
    return;
  }
  await withLock(() => {
    const filePath = identitiesPath(dataDir);
    const store = readStore(filePath);
    delete store.sessions[sid];
    writeStore(filePath, store);
  });
}

export function publicIdentity(identity: PortalIdentity | null) {
  if (!identity) {
    return { kind: null as IdentityKind | null, orderCode: null as string | null, email: null as string | null };
  }
  return {
    kind: identity.kind,
    orderCode: identity.orderCode,
    email: identity.email ?? null,
  };
}
