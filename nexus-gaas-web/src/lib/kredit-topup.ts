import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KREDIT, type PendingTopup, type TopupStatus } from "./kredit.ts";
import { withLock } from "./mutex.ts";
import { assertSafeId, defaultDataDir, type IdentityKind } from "./identity-paths.ts";

export type TopupRecord = {
  id: string;
  walletId: string;
  kind: IdentityKind;
  identityId: string;
  amountKr: number;
  status: TopupStatus;
  createdAt: string;
  approvedAt?: string;
};

type TopupStore = {
  version: 1;
  items: TopupRecord[];
};

export function topupsPath(dataDir = defaultDataDir()): string {
  return path.join(dataDir, "kredit-topups.json");
}

function emptyStore(): TopupStore {
  return { version: 1, items: [] };
}

function readStore(filePath: string): TopupStore {
  if (!existsSync(filePath)) {
    return emptyStore();
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as TopupStore;
  if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
    throw new Error("Berkas isi ulang Kredit rusak");
  }
  return parsed;
}

function writeStore(filePath: string, store: TopupStore): void {
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

export function publicPending(record: TopupRecord): PendingTopup {
  return {
    id: record.id,
    amountKr: record.amountKr,
    createdAt: record.createdAt,
    status: record.status,
  };
}

export function listPendingUnlocked(walletId: string, dataDir = defaultDataDir()): PendingTopup[] {
  const store = readStore(topupsPath(dataDir));
  return store.items.filter((item) => item.walletId === walletId && item.status === "pending").map(publicPending);
}

export async function listPendingTopups(walletId: string, dataDir = defaultDataDir()): Promise<PendingTopup[]> {
  return withLock(() => listPendingUnlocked(walletId, dataDir));
}

/** Called from migrateGuestLedgerUnlocked — already under withLock. */
export function migratePendingTopupsUnlocked(fromGuestId: string, toAccountId: string, dataDir: string): void {
  const guest = assertSafeId(fromGuestId);
  const account = assertSafeId(toAccountId);
  const filePath = topupsPath(dataDir);
  const store = readStore(filePath);
  let changed = false;
  for (const item of store.items) {
    if (item.kind === "guest" && item.identityId === guest) {
      item.kind = "account";
      item.identityId = account;
      item.walletId = `account:${account}`;
      changed = true;
    }
  }
  if (changed) {
    writeStore(filePath, store);
  }
}

export async function createTopupRequest(
  amountKr: number,
  identity: { kind: IdentityKind; identityId: string; walletId: string },
  dataDir = defaultDataDir(),
): Promise<{ pending: PendingTopup; pendingTopups: PendingTopup[] }> {
  return withLock(() => {
    const packs: readonly number[] = KREDIT.topupPacksKr;
    const add = Math.floor(amountKr);
    if (!packs.includes(add) || add > KREDIT.topupMaxKr) {
      throw new RangeError(`Pilih ${packs.join(" / ")} Kr`);
    }
    const id = assertSafeId(identity.identityId);
    const filePath = topupsPath(dataDir);
    const store = readStore(filePath);
    const pendingCount = store.items.filter((item) => item.walletId === identity.walletId && item.status === "pending")
      .length;
    if (pendingCount >= KREDIT.pendingMaxPerWallet) {
      throw new RangeError(`Maksimal ${KREDIT.pendingMaxPerWallet} permintaan pending. Tunggu operator atau batalkan lewat operator.`);
    }
    const record: TopupRecord = {
      id: `TU-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      walletId: identity.walletId,
      kind: identity.kind,
      identityId: id,
      amountKr: add,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.items.push(record);
    writeStore(filePath, store);
    return {
      pending: publicPending(record),
      pendingTopups: listPendingUnlocked(identity.walletId, dataDir),
    };
  });
}

/** Already under withLock (approve path). */
export function getTopupUnlocked(topupId: string, dataDir = defaultDataDir()): TopupRecord | undefined {
  const id = topupId.trim().toUpperCase();
  return readStore(topupsPath(dataDir)).items.find((item) => item.id === id);
}

/** Already under withLock. Idempotent if already approved. */
export function markTopupApprovedUnlocked(topupId: string, dataDir = defaultDataDir()): TopupRecord {
  const filePath = topupsPath(dataDir);
  const store = readStore(filePath);
  const record = store.items.find((item) => item.id === topupId.trim().toUpperCase());
  if (!record) {
    throw new Error("Permintaan isi ulang tidak ditemukan");
  }
  if (record.status !== "approved") {
    record.status = "approved";
    record.approvedAt = new Date().toISOString();
    writeStore(filePath, store);
  }
  return record;
}

export function proofWaNumber(): string | null {
  const value = process.env.NEXUS_TOPUP_PROOF_WA?.trim() || process.env.NEXT_PUBLIC_TOPUP_PROOF_WA?.trim();
  return value || null;
}
