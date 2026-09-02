import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  FaucetDisabledError,
  InsufficientKreditError,
  KREDIT,
  type KreditEntry,
  type KreditSnapshot,
} from "./kredit.ts";
import { getTopupUnlocked, markTopupApprovedUnlocked, migratePendingTopupsUnlocked, publicPending } from "./kredit-topup.ts";
import { withLock } from "./mutex.ts";
import { assertSafeId, defaultDataDir, ledgerPathFor } from "./identity-paths.ts";

type StoredLedger = {
  version: 1;
  walletId: string;
  balance: number;
  entries: KreditEntry[];
};

const STARTER_SKU = "channel-starter";

export function isLabLedgerMode(mode = process.env.NEXUS_LEDGER_MODE): boolean {
  return (mode ?? "lab").trim().toLowerCase() !== "live";
}

export function isLabFaucetEnabled(): boolean {
  if (!isLabLedgerMode()) {
    return false;
  }
  const flag = (process.env.NEXUS_LAB_FAUCET ?? "0").trim().toLowerCase();
  return flag === "1" || flag === "on" || flag === "true" || flag === "yes";
}

export function defaultLedgerPath(): string {
  return process.env.NEXUS_KREDIT_LEDGER_PATH?.trim() || path.join(defaultDataDir(), "kredit-ledger.json");
}

export { defaultDataDir, ledgerPathFor };

export function emptyLedger(walletId: string = KREDIT.walletId): StoredLedger {
  return { version: 1, walletId, balance: 0, entries: [] };
}

function readLedger(filePath: string, fallbackWalletId: string = KREDIT.walletId): StoredLedger {
  if (!existsSync(filePath)) {
    return emptyLedger(fallbackWalletId);
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as StoredLedger;
  if (parsed.version !== 1 || typeof parsed.balance !== "number" || !Array.isArray(parsed.entries)) {
    throw new Error("Ledger Kredit rusak");
  }
  return parsed;
}

function writeLedger(filePath: string, ledger: StoredLedger): void {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
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

function snapshotOf(ledger: StoredLedger): KreditSnapshot {
  return {
    walletId: ledger.walletId,
    balance: ledger.balance,
    mode: isLabLedgerMode() ? "lab" : "live",
    starterPriceKr: KREDIT.starterPriceKr,
    idrPerKredit: KREDIT.idrPerKredit,
    faucetAmountKr: KREDIT.faucetAmountKr,
    entries: ledger.entries.slice(-20).reverse(),
  };
}

function pushEntry(
  ledger: StoredLedger,
  kind: KreditEntry["kind"],
  delta: number,
  note: string,
  extra?: { orderId?: string; sku?: string },
): KreditEntry {
  ledger.balance += delta;
  const entry: KreditEntry = {
    id: `KR-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    ts: new Date().toISOString(),
    kind,
    amount: delta,
    note,
    balanceAfter: ledger.balance,
    ...extra,
  };
  ledger.entries.push(entry);
  return entry;
}

export async function getKreditSnapshot(filePath = defaultLedgerPath()): Promise<KreditSnapshot> {
  return withLock(() => snapshotOf(readLedger(filePath)));
}

export async function creditFaucet(
  amount: number = KREDIT.faucetAmountKr,
  filePath = defaultLedgerPath(),
  walletId?: string,
): Promise<KreditSnapshot> {
  return withLock(() => {
    if (!isLabFaucetEnabled()) {
      throw new FaucetDisabledError();
    }
    const add = Math.floor(amount);
    if (!Number.isFinite(add) || add < 1 || add > KREDIT.faucetMaxKr) {
      throw new RangeError(`Keran 1–${KREDIT.faucetMaxKr} Kr`);
    }
    const ledger = readLedger(filePath, walletId ?? KREDIT.walletId);
    if (walletId) {
      ledger.walletId = walletId;
    }
    pushEntry(ledger, "faucet", add, `Keran lab +${add} Kr`);
    writeLedger(filePath, ledger);
    return snapshotOf(ledger);
  });
}

export function creditApprovedTopupUnlocked(
  amount: number,
  filePath: string,
  walletId: string,
  topupId: string,
): KreditSnapshot {
  const add = Math.floor(amount);
  if (!Number.isFinite(add) || add < 1) {
    throw new RangeError("jumlah Kredit tidak valid");
  }
  const ledger = readLedger(filePath, walletId);
  ledger.walletId = walletId;
  if (ledger.entries.some((e) => e.kind === "topup" && e.orderId === topupId)) {
    return snapshotOf(ledger);
  }
  pushEntry(ledger, "topup", add, `Isi ulang disetujui +${add} Kr`, { orderId: topupId });
  writeLedger(filePath, ledger);
  return snapshotOf(ledger);
}

export async function approveTopupRequest(
  topupId: string,
  dataDir = defaultDataDir(),
): Promise<{ id: string; amountKr: number; status: "approved"; balance: number }> {
  return withLock(() => {
    const record = getTopupUnlocked(topupId, dataDir);
    if (!record) {
      throw new Error("Permintaan isi ulang tidak ditemukan");
    }
    const ledgerFile = ledgerPathFor(record.kind, record.identityId, dataDir);
    const snap = creditApprovedTopupUnlocked(record.amountKr, ledgerFile, record.walletId, record.id);
    const settled = markTopupApprovedUnlocked(record.id, dataDir);
    return {
      id: settled.id,
      amountKr: settled.amountKr,
      status: "approved" as const,
      balance: snap.balance,
      pending: publicPending(settled),
    };
  });
}

export async function debitStarter(orderId: string, filePath = defaultLedgerPath()): Promise<KreditSnapshot> {
  return withLock(() => {
    const id = orderId.trim();
    if (!id) {
      throw new Error("orderId wajib");
    }
    const ledger = readLedger(filePath);
    const prior = [...ledger.entries].reverse().find((e) => e.orderId === id && e.sku === STARTER_SKU);
    if (prior?.kind === "debit") {
      return snapshotOf(ledger);
    }
    const needed = KREDIT.starterPriceKr;
    if (ledger.balance < needed) {
      throw new InsufficientKreditError(ledger.balance, needed);
    }
    pushEntry(ledger, "debit", -needed, `Starter Channel Starter −${needed} Kr`, {
      orderId: id,
      sku: STARTER_SKU,
    });
    writeLedger(filePath, ledger);
    return snapshotOf(ledger);
  });
}

export async function refundStarter(orderId: string, filePath = defaultLedgerPath()): Promise<KreditSnapshot> {
  return withLock(() => {
    const id = orderId.trim();
    const ledger = readLedger(filePath);
    const related = ledger.entries.filter((e) => e.orderId === id && e.sku === STARTER_SKU);
    const debited = related.some((e) => e.kind === "debit");
    const refunded = related.some((e) => e.kind === "refund");
    if (!debited || refunded) {
      return snapshotOf(ledger);
    }
    pushEntry(ledger, "refund", KREDIT.starterPriceKr, `Generate gagal — kembalikan ${KREDIT.starterPriceKr} Kr`, {
      orderId: id,
      sku: STARTER_SKU,
    });
    writeLedger(filePath, ledger);
    return snapshotOf(ledger);
  });
}

/** Copy guest ledger into a new account file. Caller must already hold withLock. */
export function migrateGuestLedgerUnlocked(fromGuestId: string, toAccountId: string, dataDir: string): void {
  const fromPath = ledgerPathFor("guest", fromGuestId, dataDir);
  const toPath = ledgerPathFor("account", toAccountId, dataDir);
  const walletId = `account:${assertSafeId(toAccountId)}`;
  const source = readLedger(fromPath, `guest:${assertSafeId(fromGuestId)}`);
  if (existsSync(toPath)) {
    return;
  }
  writeLedger(toPath, { ...source, walletId });
  migratePendingTopupsUnlocked(fromGuestId, toAccountId, dataDir);
  if (existsSync(fromPath)) {
    try {
      unlinkSync(fromPath);
    } catch {
      /* guest file may already be gone */
    }
  }
}

export async function migrateGuestLedger(fromGuestId: string, toAccountId: string, dataDir: string): Promise<void> {
  await withLock(() => {
    migrateGuestLedgerUnlocked(fromGuestId, toAccountId, dataDir);
  });
}

export function slugFromGenerateLocation(location: string | null): string | null {
  if (!location) {
    return null;
  }
  try {
    const pathname = location.startsWith("http") ? new URL(location).pathname : location;
    const match = pathname.match(/\/(?:preview|sites)\/([a-z0-9-]+)\/?$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
