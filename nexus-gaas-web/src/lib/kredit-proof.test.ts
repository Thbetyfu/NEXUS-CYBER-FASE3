import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { ledgerPathFor } from "./identity-paths.ts";
import { approveTopupRequest, getKreditSnapshot } from "./kredit-ledger.ts";
import { topupWhatsAppMessage } from "./portal-config.ts";
import {
  assertProofBytes,
  createTopupRequest,
  danaPayInfo,
  proofDir,
  proofWaNumber,
  ProofValidationError,
  PROOF_MAX_BYTES,
  submitTopupProof,
  submitTopupProofMail,
} from "./kredit-topup.ts";

const dir = mkdtempSync(path.join(tmpdir(), "nexus-kredit-proof-"));

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]);
const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

function proofCount(dataDir: string): number {
  const folder = proofDir(dataDir);
  return existsSync(folder) ? readdirSync(folder).length : 0;
}

test("WhatsApp bukti default ke nomor SALES", () => {
  delete process.env.NEXUS_TOPUP_PROOF_WA;
  delete process.env.NEXT_PUBLIC_TOPUP_PROOF_WA;
  assert.equal(proofWaNumber(), "62895603358692");
});

test("pesan WhatsApp setelah Kirim bukti pendek (id + jumlah)", () => {
  assert.equal(topupWhatsAppMessage({ id: "TU-A22E43F0", amountKr: 50 }), "TU-A22E43F0 50 Kr");
  assert.doesNotMatch(topupWhatsAppMessage({ id: "TU-A22E43F0", amountKr: 50 }), /wa\.me|Midtrans|instruksi/i);
});

test("Nomor DANA tidak punya default di git", () => {
  delete process.env.NEXUS_DANA_NUMBER;
  delete process.env.NEXUS_DANA_LABEL;
  assert.deepEqual(danaPayInfo(), { number: null, label: null });
  process.env.NEXUS_DANA_NUMBER = "081234567890";
  process.env.NEXUS_DANA_LABEL = "DANA lab";
  assert.deepEqual(danaPayInfo(), { number: "081234567890", label: "DANA lab" });
  delete process.env.NEXUS_DANA_NUMBER;
  delete process.env.NEXUS_DANA_LABEL;
});

test("menolak tipe berkas dan ukuran", () => {
  assert.throws(() => assertProofBytes(Uint8Array.from([1, 2, 3, 4])), { name: "ProofValidationError" });
  assert.throws(() => assertProofBytes(new Uint8Array(PROOF_MAX_BYTES + 1)), (err: unknown) => {
    assert.equal(err instanceof ProofValidationError, true);
    assert.match((err as Error).message, /5 MB/);
    return true;
  });
  assert.equal(assertProofBytes(PNG), "image/png");
  assert.equal(assertProofBytes(PDF), "application/pdf");
});

test("id TU tidak dikenal tidak menulis berkas", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeea1";
  await assert.rejects(
    () => submitTopupProof("TU-DEADBEEF", `guest:${guestId}`, "catatan", { buffer: Buffer.from(PNG), mime: "image/png" }, dir),
    /tidak ditemukan/,
  );
  assert.equal(proofCount(dir), 0);
});

test("unggah tanpa SMTP menyimpan bukti dan tidak menambah saldo", async () => {
  delete process.env.NEXUS_TOPUP_PROOF_EMAIL;
  delete process.env.NEXUS_SMTP_HOST;
  delete process.env.NEXUS_SMTP_USER;
  delete process.env.NEXUS_SMTP_PASS;
  delete process.env.NEXUS_SMTP_FROM;
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeea2";
  const walletId = `guest:${guestId}`;
  const created = await createTopupRequest(20, { kind: "guest", identityId: guestId, walletId }, dir);
  const result = await submitTopupProofMail({
    topupId: created.pending.id,
    walletId,
    identity: { kind: "guest", orderCode: "ORDER-AAAAAAAA", email: null },
    note: "transfer lab",
    originalName: "bukti.png",
    bytes: PNG,
    dataDir: dir,
  });
  assert.equal(result.stored, true);
  assert.equal(result.emailed, false);
  assert.match(result.emailError ?? "", /NEXUS_SMTP_HOST|NEXUS_TOPUP_PROOF_EMAIL/);
  assert.equal(result.pending.status, "proof_submitted");
  assert.equal(proofCount(dir), 1);
  assert.equal((await getKreditSnapshot(ledgerPathFor("guest", guestId, dir))).balance, 0);
  const approved = await approveTopupRequest(created.pending.id, dir);
  assert.equal(approved.balance, 20);
});

test("SMTP mock mengirim lampiran tanpa kredit saldo", async () => {
  process.env.NEXUS_TOPUP_PROOF_EMAIL = "owner-lab@example.test";
  process.env.NEXUS_SMTP_HOST = "127.0.0.1";
  process.env.NEXUS_SMTP_USER = "lab";
  process.env.NEXUS_SMTP_PASS = "lab";
  process.env.NEXUS_SMTP_FROM = "lab@example.test";
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeea3";
  const walletId = `guest:${guestId}`;
  const created = await createTopupRequest(50, { kind: "guest", identityId: guestId, walletId }, dir);
  let sent = 0;
  const result = await submitTopupProofMail({
    topupId: created.pending.id,
    walletId,
    identity: { kind: "guest", orderCode: "ORDER-AAAAAAAA" },
    note: "",
    originalName: "slip.pdf",
    bytes: PDF,
    dataDir: dir,
    sendMail: async (mail) => {
      sent += 1;
      assert.equal(mail.to, "owner-lab@example.test");
      assert.match(mail.subject, new RegExp(created.pending.id));
    },
  });
  assert.equal(sent, 1);
  assert.equal(result.emailed, true);
  assert.equal((await getKreditSnapshot(ledgerPathFor("guest", guestId, dir))).balance, 0);
});
