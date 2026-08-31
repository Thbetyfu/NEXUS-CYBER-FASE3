import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { KREDIT } from "./kredit.ts";
import { creditFaucet, debitStarter, getKreditSnapshot, refundStarter } from "./kredit-ledger.ts";

const dir = mkdtempSync(path.join(tmpdir(), "nexus-kredit-"));
const filePath = path.join(dir, "kredit-ledger.json");

before(() => {
  process.env.NEXUS_LEDGER_MODE = "lab";
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
