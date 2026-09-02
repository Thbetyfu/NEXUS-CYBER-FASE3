import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { identitiesPath, orderCodeFromId } from "./identity-paths.ts";
import { operatorPartyLabel } from "./kredit.ts";
import { createTopupRequest, listOperatorQueue } from "./kredit-topup.ts";

const dir = mkdtempSync(path.join(tmpdir(), "nexus-op-queue-"));

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("label operator: akun = email, tamu = Tamu + ORDER", () => {
  assert.equal(
    operatorPartyLabel({ kind: "account", email: "warung@example.test", orderCode: "ORDER-AAAAAAAA" }),
    "warung@example.test",
  );
  assert.equal(operatorPartyLabel({ kind: "account", email: null, orderCode: "ORDER-AAAAAAAA" }), "Akun");
  assert.equal(
    operatorPartyLabel({ kind: "guest", email: null, orderCode: "ORDER-3F1C9A2E" }),
    "Tamu · ORDER-3F1C9A2E",
  );
});

test("antrian operator memakai email akun dan ORDER tamu, tanpa hash sandi", async () => {
  const guestId = "3f1c9a2e-7b44-4c11-9a00-abcdeffedcba";
  const accountId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee10";
  writeFileSync(
    identitiesPath(dir),
    `${JSON.stringify(
      {
        version: 1,
        sessions: {},
        accounts: [
          {
            id: accountId,
            email: "kasir@example.test",
            passwordHash: "scrypt$jangan-tampilkan",
            createdAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await createTopupRequest(20, { kind: "guest", identityId: guestId, walletId: `guest:${guestId}` }, dir);
  await createTopupRequest(50, { kind: "account", identityId: accountId, walletId: `account:${accountId}` }, dir);

  const items = await listOperatorQueue(dir);
  const guest = items.find((row) => row.kind === "guest");
  const account = items.find((row) => row.kind === "account");
  assert.ok(guest);
  assert.ok(account);
  assert.equal(guest.email, null);
  assert.equal(guest.orderCode, orderCodeFromId(guestId));
  assert.equal(operatorPartyLabel(guest), "Tamu · ORDER-3F1C9A2E");
  assert.equal(account.email, "kasir@example.test");
  assert.equal(operatorPartyLabel(account), "kasir@example.test");
  const dumped = JSON.stringify(items);
  assert.equal(dumped.includes("passwordHash"), false);
  assert.equal(dumped.includes("scrypt$"), false);
});
