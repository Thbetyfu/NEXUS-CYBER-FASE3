import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { ledgerPathFor } from "./identity-paths.ts";
import { approveTopupRequest, getKreditSnapshot } from "./kredit-ledger.ts";
import { formatWhatsAppNumber, SALES } from "./portal-config.ts";
import { createTopupRequest, proofDir, proofWaNumber, submitTopupProof } from "./kredit-topup.ts";

const dir = mkdtempSync(path.join(tmpdir(), "nexus-kredit-proof-"));

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]);

function proofCount(dataDir: string): number {
  const folder = proofDir(dataDir);
  if (!existsSync(folder)) {
    return 0;
  }
  return readdirSync(folder).length;
}

test("nomor WhatsApp isi ulang default SALES.whatsapp", () => {
  delete process.env.NEXUS_TOPUP_PROOF_WA;
  delete process.env.NEXT_PUBLIC_TOPUP_PROOF_WA;
  assert.equal(proofWaNumber(), SALES.whatsapp);
  const shown = formatWhatsAppNumber(SALES.whatsapp);
  assert.equal(shown.digits, "62895603358692");
  assert.match(shown.local, /^0895 /);
});

test("id TU tidak dikenal tidak menulis berkas dan tidak kredit", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeea1";
  await assert.rejects(
    () => submitTopupProof("TU-DEADBEEF", `guest:${guestId}`, "catatan", { buffer: PNG, mime: "image/png" }, dir),
    /tidak ditemukan/,
  );
  assert.equal(proofCount(dir), 0);
  assert.equal((await getKreditSnapshot(ledgerPathFor("guest", guestId, dir))).balance, 0);
});

test("catatan wajib; berkas palsu ditolak; notes-only tidak kredit", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeea2";
  const walletId = `guest:${guestId}`;
  const created = await createTopupRequest(20, { kind: "guest", identityId: guestId, walletId }, dir);
  await assert.rejects(() => submitTopupProof(created.pending.id, walletId, "   ", null, dir), RangeError);
  await assert.rejects(
    () =>
      submitTopupProof(created.pending.id, walletId, "ok", {
        buffer: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
        mime: "image/png",
      }, dir),
    RangeError,
  );
  const notesOnly = await submitTopupProof(created.pending.id, walletId, "transfer sesuai WA", null, dir);
  assert.equal(notesOnly.status, "proof_submitted");
  assert.equal((await getKreditSnapshot(ledgerPathFor("guest", guestId, dir))).balance, 0);
});

test("unggah bukti tidak menambah saldo sampai approve", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeea3";
  const walletId = `guest:${guestId}`;
  const ledgerPath = ledgerPathFor("guest", guestId, dir);
  const created = await createTopupRequest(20, { kind: "guest", identityId: guestId, walletId }, dir);
  const pending = await submitTopupProof(
    created.pending.id,
    walletId,
    "transfer sesuai instruksi WA",
    { buffer: PNG, mime: "image/png" },
    dir,
  );
  assert.equal(pending.status, "proof_submitted");
  assert.equal(pending.hasProof, true);
  assert.equal(proofCount(dir), 1);
  assert.equal((await getKreditSnapshot(ledgerPath)).balance, 0);
  await assert.rejects(() => approveTopupRequest("TU-ZZZZZZZZ", dir));
  const approved = await approveTopupRequest(created.pending.id, dir);
  assert.equal(approved.balance, 20);
  assert.equal(approved.status, "approved");
});
