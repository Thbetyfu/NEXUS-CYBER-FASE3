import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KREDIT, isOpenTopupStatus, type OperatorTopupView, type PendingTopup, type TopupStatus } from "./kredit.ts";
import { formatWhatsAppNumber, SALES } from "./portal-config.ts";
import { withLock } from "./mutex.ts";
import { assertSafeId, defaultDataDir, type IdentityKind } from "./identity-paths.ts";
import { lookupOperatorPartyUnlocked } from "./operator-party.ts";

export type TopupRecord = {
  id: string;
  walletId: string;
  kind: IdentityKind;
  identityId: string;
  amountKr: number;
  status: TopupStatus;
  createdAt: string;
  approvedAt?: string;
  notes?: string;
  proofRelPath?: string;
  proofMime?: string;
  proofSubmittedAt?: string;
  proofEmailedAt?: string;
  proofEmailError?: string;
  cancelledAt?: string;
};

export class TopupOpenConflictError extends Error {
  constructor(message = "Sudah ada permintaan isi ulang yang belum selesai. Batalkan dulu untuk ganti paket.") {
    super(message);
    this.name = "TopupOpenConflictError";
  }
}

type TopupStore = {
  version: 1;
  items: TopupRecord[];
};

const TU_RE = /^TU-[A-Z0-9]{8}$/;
const PROOF_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function mimeFromMagic(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (buffer.length >= 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }
  return null;
}

export function topupsPath(dataDir = defaultDataDir()): string {
  return path.join(dataDir, "kredit-topups.json");
}

export function proofDir(dataDir = defaultDataDir()): string {
  return path.join(dataDir, "topup-proofs");
}

export const proofsDir = proofDir;

export function assertTopupId(topupId: string): string {
  const id = topupId.trim().toUpperCase();
  if (!TU_RE.test(id)) {
    throw new Error("id permintaan tidak valid");
  }
  return id;
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
    hasProof: Boolean(record.proofRelPath),
    proofUploadedAt: record.proofSubmittedAt ?? null,
    notes: record.notes ?? null,
  };
}

function toOperatorView(record: TopupRecord, dataDir: string): OperatorTopupView {
  const party = lookupOperatorPartyUnlocked(record.kind, record.identityId, dataDir);
  return {
    id: record.id,
    amountKr: record.amountKr,
    status: record.status,
    createdAt: record.createdAt,
    walletId: record.walletId,
    identityId: party.identityId,
    kind: record.kind,
    email: party.email,
    displayName: party.displayName,
    orderCode: party.orderCode,
    notes: record.notes,
    hasProof: Boolean(record.proofRelPath),
    proofSubmittedAt: record.proofSubmittedAt,
  };
}

export function listPendingUnlocked(walletId: string, dataDir = defaultDataDir()): PendingTopup[] {
  const store = readStore(topupsPath(dataDir));
  return store.items.filter((item) => item.walletId === walletId && isOpenTopupStatus(item.status)).map(publicPending);
}

export async function listPendingTopups(walletId: string, dataDir = defaultDataDir()): Promise<PendingTopup[]> {
  return withLock(() => listPendingUnlocked(walletId, dataDir));
}

export async function listOperatorQueue(dataDir = defaultDataDir()): Promise<OperatorTopupView[]> {
  return withLock(() => {
    return readStore(topupsPath(dataDir))
      .items.filter((item) => isOpenTopupStatus(item.status))
      .map((item) => toOperatorView(item, dataDir))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

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
    const open = store.items.find((item) => item.walletId === identity.walletId && isOpenTopupStatus(item.status));
    if (open) {
      throw new TopupOpenConflictError();
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

export async function submitTopupProof(
  topupId: string,
  walletId: string,
  notes: string,
  file: { buffer: Buffer; mime: string } | null,
  dataDir = defaultDataDir(),
): Promise<PendingTopup> {
  return withLock(() => {
    const id = assertTopupId(topupId);
    const trimmed = notes.trim().slice(0, 500);
    if (!file) {
      throw new RangeError("Unggah berkas bukti");
    }
    const filePath = topupsPath(dataDir);
    const store = readStore(filePath);
    const record = store.items.find((item) => item.id === id);
    if (!record || record.walletId !== walletId) {
      throw new Error("Permintaan isi ulang tidak ditemukan");
    }
    if (record.status === "approved") {
      throw new RangeError("Permintaan sudah disetujui");
    }
    if (record.status === "cancelled") {
      throw new RangeError("Permintaan sudah dibatalkan");
    }
    if (file) {
      const magic = mimeFromMagic(file.buffer);
      const ext = magic ? PROOF_EXT[magic] : undefined;
      if (!magic || !ext) {
        throw new RangeError("Berkas harus gambar (JPEG/PNG/WebP/GIF) atau PDF");
      }
      if (file.buffer.length < 8 || file.buffer.length > MAX_PROOF_BYTES) {
        throw new RangeError("Berkas bukti 8 byte–5 MB");
      }
      mkdirSync(proofDir(dataDir), { recursive: true });
      if (record.proofRelPath) {
        const prev = path.resolve(dataDir, record.proofRelPath);
        try {
          unlinkSync(prev);
        } catch {
          /* previous file may be gone */
        }
      }
      const rel = `topup-proofs/${id}${ext}`;
      writeFileSync(path.join(dataDir, rel), file.buffer);
      record.proofRelPath = rel;
      record.proofMime = magic;
    }
    record.notes = trimmed;
    record.proofSubmittedAt = new Date().toISOString();
    record.status = "proof_submitted";
    writeStore(filePath, store);
    return publicPending(record);
  });
}

export async function cancelTopupRequest(
  topupId: string,
  walletId: string,
  dataDir = defaultDataDir(),
): Promise<PendingTopup[]> {
  return withLock(() => {
    const id = assertTopupId(topupId);
    const filePath = topupsPath(dataDir);
    const store = readStore(filePath);
    const record = store.items.find((item) => item.id === id);
    if (!record || record.walletId !== walletId) {
      throw new Error("Permintaan isi ulang tidak ditemukan");
    }
    if (record.status === "approved") {
      throw new RangeError("Permintaan sudah disetujui");
    }
    if (record.status !== "cancelled") {
      record.status = "cancelled";
      record.cancelledAt = new Date().toISOString();
      writeStore(filePath, store);
    }
    return listPendingUnlocked(walletId, dataDir);
  });
}

export async function markProofEmailResult(
  topupId: string,
  walletId: string,
  emailed: boolean,
  emailError: string | null,
  dataDir = defaultDataDir(),
): Promise<void> {
  await withLock(() => {
    const filePath = topupsPath(dataDir);
    const store = readStore(filePath);
    const id = assertTopupId(topupId);
    const record = store.items.find((item) => item.id === id);
    if (!record || record.walletId !== walletId) {
      return;
    }
    if (emailed) {
      record.proofEmailedAt = new Date().toISOString();
      delete record.proofEmailError;
    } else if (emailError) {
      record.proofEmailError = emailError.slice(0, 400);
    }
    writeStore(filePath, store);
  });
}

export async function readTopupProofFile(
  topupId: string,
  dataDir = defaultDataDir(),
): Promise<{ mime: string; bytes: Buffer } | null> {
  return withLock(() => {
    const id = assertTopupId(topupId);
    const record = readStore(topupsPath(dataDir)).items.find((item) => item.id === id);
    if (!record?.proofRelPath || !record.proofMime) {
      return null;
    }
    const root = path.resolve(proofDir(dataDir));
    const abs = path.resolve(dataDir, record.proofRelPath);
    if (abs !== root && !abs.startsWith(`${root}${path.sep}`)) {
      throw new Error("Berkas bukti tidak valid");
    }
    if (!existsSync(abs)) {
      return null;
    }
    return { mime: record.proofMime, bytes: readFileSync(abs) };
  });
}

export function getTopupUnlocked(topupId: string, dataDir = defaultDataDir()): TopupRecord | undefined {
  const id = topupId.trim().toUpperCase();
  return readStore(topupsPath(dataDir)).items.find((item) => item.id === id);
}

export function markTopupApprovedUnlocked(topupId: string, dataDir = defaultDataDir()): TopupRecord {
  const filePath = topupsPath(dataDir);
  const store = readStore(filePath);
  const record = store.items.find((item) => item.id === topupId.trim().toUpperCase());
  if (!record) {
    throw new Error("Permintaan isi ulang tidak ditemukan");
  }
  if (record.status === "cancelled") {
    throw new Error("Permintaan sudah dibatalkan");
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
  if (value) return value;
  return SALES.whatsapp;
}

function danaDisplayNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return formatWhatsAppNumber(raw).local;
  }
  return raw;
}

/** Nomor DANA tampilan: env jika diisi, else nomor WA publik pemilik (`SALES.whatsapp`). */
export function danaPayInfo(): { number: string; label: string | null } {
  const fromEnv = process.env.NEXUS_DANA_NUMBER?.trim();
  return {
    number: danaDisplayNumber(fromEnv || SALES.whatsapp),
    label: process.env.NEXUS_DANA_LABEL?.trim() || null,
  };
}

/** Tidak ada default di repo — jangan mengarang inbox publik. */
export function proofEmailTo(): string | null {
  const value = process.env.NEXUS_TOPUP_PROOF_EMAIL?.trim();
  return value || null;
}

export const PROOF_MAX_BYTES = MAX_PROOF_BYTES;

export class ProofValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofValidationError";
  }
}

export function assertProofBytes(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) {
    throw new ProofValidationError("Unggah berkas bukti");
  }
  if (bytes.byteLength > MAX_PROOF_BYTES) {
    throw new ProofValidationError("Berkas maksimal 5 MB");
  }
  const mime = mimeFromMagic(Buffer.from(bytes));
  if (!mime) {
    throw new ProofValidationError("Berkas harus gambar (JPEG/PNG/WebP/GIF) atau PDF");
  }
  return mime;
}

export type ProofIdentity = {
  kind: "guest" | "account";
  orderCode: string;
  email?: string | null;
};

export type SendProofMail = (args: {
  to: string;
  from: string;
  subject: string;
  text: string;
  filename: string;
  content: Buffer;
  contentType: string;
}) => Promise<void>;

function readSmtpSettings(): { to: string | null; missing: string[]; smtp: { host: string; port: number; user: string; pass: string; secure: boolean; from: string; to: string } | null } {
  const to = proofEmailTo();
  const host = process.env.NEXUS_SMTP_HOST?.trim() || "";
  const user = process.env.NEXUS_SMTP_USER?.trim() || "";
  const pass = process.env.NEXUS_SMTP_PASS?.trim() || "";
  const from = process.env.NEXUS_SMTP_FROM?.trim() || user;
  const port = Number.parseInt(process.env.NEXUS_SMTP_PORT?.trim() || "587", 10);
  const secure = (process.env.NEXUS_SMTP_SECURE ?? "").trim() === "1" || port === 465;
  const missing: string[] = [];
  if (!to) missing.push("NEXUS_TOPUP_PROOF_EMAIL");
  if (!host) missing.push("NEXUS_SMTP_HOST");
  if (!user) missing.push("NEXUS_SMTP_USER");
  if (!pass) missing.push("NEXUS_SMTP_PASS");
  if (!from) missing.push("NEXUS_SMTP_FROM");
  if (!Number.isFinite(port) || port < 1) missing.push("NEXUS_SMTP_PORT");
  if (missing.length > 0) {
    return { to, missing, smtp: null };
  }
  return { to, missing: [], smtp: { host, port, user, pass, secure, from, to: to as string } };
}

export async function submitTopupProofMail(args: {
  topupId: string;
  walletId: string;
  identity: ProofIdentity;
  note: string;
  originalName: string;
  bytes: Uint8Array;
  dataDir?: string;
  sendMail?: SendProofMail;
}): Promise<{ stored: true; emailed: boolean; emailError: string | null; pending: PendingTopup; amountKr: number }> {
  const mime = assertProofBytes(args.bytes);
  const buffer = Buffer.from(args.bytes);
  let pending: PendingTopup;
  try {
    pending = await submitTopupProof(args.topupId, args.walletId, args.note, { buffer, mime }, args.dataDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bukti gagal";
    if (message.includes("tidak ditemukan") || message.includes("tidak valid") || err instanceof RangeError) {
      throw new ProofValidationError(message.includes("tidak valid") ? "Permintaan isi ulang tidak ditemukan" : message);
    }
    throw err;
  }
  const mail = readSmtpSettings();
  let emailed = false;
  let emailError: string | null = null;
  if (!mail.smtp || !mail.to) {
    emailError = `Bukti tersimpan. Email belum terkirim — set ${mail.missing.join(", ")}. Bukan Midtrans; saldo belum naik.`;
  } else {
    const send =
      args.sendMail ??
      (async (payload) => {
        const { sendProofWithNodemailer } = await import("./kredit-smtp.ts");
        await sendProofWithNodemailer(mail.smtp!, payload);
      });
    const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "bin";
    try {
      await send({
        to: mail.to,
        from: mail.smtp.from,
        subject: `[Nexus Kredit] Bukti ${pending.id} (${pending.amountKr} Kr)`,
        text: [
          "Bukti isi ulang Kredit (bukan pembayaran otomatis, bukan Midtrans/Stripe).",
          `ID: ${pending.id}`,
          `Jumlah: ${pending.amountKr} Kr`,
          `Identitas: ${args.identity.kind} · ${args.identity.orderCode}`,
          args.identity.email ? `Email akun: ${args.identity.email}` : "",
          args.note.trim() ? `Catatan: ${args.note.trim()}` : "",
          "Saldo belum naik. Approve: POST /api/kredit/topup/approve",
        ]
          .filter(Boolean)
          .join("\n"),
        filename: `${pending.id}.${ext}`,
        content: buffer,
        contentType: mime,
      });
      emailed = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "SMTP gagal";
      emailError = `Bukti tersimpan. Email gagal: ${message}. Bukan Midtrans; saldo belum naik.`;
    }
  }
  await markProofEmailResult(args.topupId, args.walletId, emailed, emailError, args.dataDir);
  return { stored: true, emailed, emailError, pending, amountKr: pending.amountKr };
}
