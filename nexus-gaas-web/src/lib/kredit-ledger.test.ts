import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { KREDIT } from "./kredit.ts";
import { creditFaucet, debitStarter, getKreditSnapshot, isLabFaucetEnabled, migrateGuestLedger, refundStarter, slugFromGenerateLocation, approveTopupRequest } from "./kredit-ledger.ts";
import { createTopupRequest, cancelTopupRequest, listPendingTopups, listOperatorQueue } from "./kredit-topup.ts";
import { assertSafeId, ledgerPathFor, orderCodeFromId } from "./identity-paths.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";

const dir = mkdtempSync(path.join(tmpdir(), "nexus-kredit-"));
const filePath = path.join(dir, "kredit-ledger.json");

before(() => {
  process.env.NEXUS_LEDGER_MODE = "lab";
  process.env.NEXUS_LAB_FAUCET = "1";
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("saldo awal 0 dan keran menambah Kredit", async () => {
  const empty = await getKreditSnapshot(filePath);
  assert.equal(empty.balance, 0);
  const filled = await creditFaucet(KREDIT.faucetAmountKr, filePath);
  assert.equal(filled.balance, 100);
});

test("debit Starter fail-closed jika saldo kurang", async () => {
  const poorPath = path.join(dir, "poor.json");
  await assert.rejects(() => debitStarter("order-poor", poorPath), { name: "InsufficientKreditError" });
});

test("debit 20 Kr lalu refund jika generate gagal", async () => {
  const okPath = path.join(dir, "ok.json");
  await creditFaucet(20, okPath);
  const charged = await debitStarter("order-a", okPath);
  assert.equal(charged.balance, 0);
  const again = await debitStarter("order-a", okPath);
  assert.equal(again.balance, 0);
  const refunded = await refundStarter("order-a", okPath);
  assert.equal(refunded.balance, 20);
  const twice = await refundStarter("order-a", okPath);
  assert.equal(twice.balance, 20);
});

test("slug generate dari Location /preview atau /sites", () => {
  assert.equal(slugFromGenerateLocation("/preview/warung-bu-siti"), "warung-bu-siti");
  assert.equal(slugFromGenerateLocation("/sites/kedai-palet-biru"), "kedai-palet-biru");
  assert.equal(slugFromGenerateLocation("http://127.0.0.1:3010/preview/contoh-nexcent"), "contoh-nexcent");
});

test("dua session id punya saldo Kredit independen", async () => {
  const guestA = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1";
  const guestB = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2";
  const pathA = ledgerPathFor("guest", guestA, dir);
  const pathB = ledgerPathFor("guest", guestB, dir);
  await creditFaucet(100, pathA, `guest:${guestA}`);
  await creditFaucet(40, pathB, `guest:${guestB}`);
  assert.equal((await getKreditSnapshot(pathA)).balance, 100);
  assert.equal((await getKreditSnapshot(pathB)).balance, 40);
  await debitStarter("order-a", pathA);
  assert.equal((await getKreditSnapshot(pathA)).balance, 80);
  assert.equal((await getKreditSnapshot(pathB)).balance, 40);
});

test("fail-closed debit tetap per-ledger", async () => {
  const guest = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3";
  const isolated = ledgerPathFor("guest", guest, dir);
  await assert.rejects(() => debitStarter("order-x", isolated), { name: "InsufficientKreditError" });
});

test("daftar dari tamu memindahkan ledger ke akun", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee4";
  const accountId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee5";
  await creditFaucet(80, ledgerPathFor("guest", guestId, dir), `guest:${guestId}`);
  await migrateGuestLedger(guestId, accountId, dir);
  assert.equal((await getKreditSnapshot(ledgerPathFor("account", accountId, dir))).balance, 80);
  assert.equal((await getKreditSnapshot(ledgerPathFor("guest", guestId, dir))).balance, 0);
});

test("kode ORDER dari UUID dan id bukan integer berurutan", () => {
  const id = "3f1c9a2e-7b44-4c11-9a00-abcdeffedcba";
  assert.equal(orderCodeFromId(id), "ORDER-3F1C9A2E");
  assert.throws(() => assertSafeId("1"));
  assert.throws(() => assertSafeId("../etc/passwd"));
});

test("kata sandi di-hash scrypt, bukan plaintext", async () => {
  const hash = await hashPassword("rahasia-lab-1");
  assert.equal(hash.includes("rahasia-lab-1"), false);
  assert.equal(hash.startsWith("scrypt$"), true);
  assert.equal(await verifyPassword("rahasia-lab-1", hash), true);
  assert.equal(await verifyPassword("salah", hash), false);
});

test("isi ulang pending tidak menambah saldo sampai approve operator", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee6";
  const walletId = `guest:${guestId}`;
  const ledgerPath = ledgerPathFor("guest", guestId, dir);
  const before = await getKreditSnapshot(ledgerPath);
  assert.equal(before.balance, 0);
  const created = await createTopupRequest(100, { kind: "guest", identityId: guestId, walletId }, dir);
  assert.equal(created.pending.status, "pending");
  assert.equal(created.pending.amountKr, 100);
  assert.equal((await getKreditSnapshot(ledgerPath)).balance, 0);
  const pending = await listPendingTopups(walletId, dir);
  assert.equal(pending.length, 1);
  const approved = await approveTopupRequest(created.pending.id, dir);
  assert.equal(approved.balance, 100);
  assert.equal(approved.status, "approved");
  assert.equal((await getKreditSnapshot(ledgerPath)).balance, 100);
  assert.equal((await listPendingTopups(walletId, dir)).length, 0);
  const again = await approveTopupRequest(created.pending.id, dir);
  assert.equal(again.balance, 100);
});

test("permintaan dibatalkan tidak dikredit dan tidak menghalangi Isi berikutnya", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee9";
  const walletId = `guest:${guestId}`;
  const ledgerPath = ledgerPathFor("guest", guestId, dir);
  const created = await createTopupRequest(50, { kind: "guest", identityId: guestId, walletId }, dir);
  await cancelTopupRequest(created.pending.id, walletId, dir);
  assert.equal((await listPendingTopups(walletId, dir)).length, 0);
  assert.equal((await listOperatorQueue(dir)).length, 0);
  await assert.rejects(() => approveTopupRequest(created.pending.id, dir), /dibatalkan/);
  assert.equal((await getKreditSnapshot(ledgerPath)).balance, 0);
  const next = await createTopupRequest(20, { kind: "guest", identityId: guestId, walletId }, dir);
  assert.equal(next.pending.amountKr, 20);
});

test("pending isi ulang ikut pindah saat tamu daftar", async () => {
  const guestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee7";
  const accountId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee8";
  const created = await createTopupRequest(
    20,
    { kind: "guest", identityId: guestId, walletId: `guest:${guestId}` },
    dir,
  );
  await migrateGuestLedger(guestId, accountId, dir);
  assert.equal((await listPendingTopups(`guest:${guestId}`, dir)).length, 0);
  assert.equal((await listPendingTopups(`account:${accountId}`, dir)).length, 1);
  const approved = await approveTopupRequest(created.pending.id, dir);
  assert.equal(approved.balance, 20);
  assert.equal((await getKreditSnapshot(ledgerPathFor("account", accountId, dir))).balance, 20);
});

test("keran mati kecuali NEXUS_LAB_FAUCET opt-in di mode lab", async () => {
  const prevMode = process.env.NEXUS_LEDGER_MODE;
  const prevFaucet = process.env.NEXUS_LAB_FAUCET;
  process.env.NEXUS_LEDGER_MODE = "live";
  process.env.NEXUS_LAB_FAUCET = "1";
  assert.equal(isLabFaucetEnabled(), false);
  process.env.NEXUS_LEDGER_MODE = "lab";
  delete process.env.NEXUS_LAB_FAUCET;
  assert.equal(isLabFaucetEnabled(), false);
  const denyPath = path.join(dir, "no-faucet.json");
  await assert.rejects(() => creditFaucet(20, denyPath), { name: "FaucetDisabledError" });
  process.env.NEXUS_LAB_FAUCET = "1";
  assert.equal(isLabFaucetEnabled(), true);
  process.env.NEXUS_LEDGER_MODE = prevMode;
  process.env.NEXUS_LAB_FAUCET = prevFaucet ?? "1";
});

