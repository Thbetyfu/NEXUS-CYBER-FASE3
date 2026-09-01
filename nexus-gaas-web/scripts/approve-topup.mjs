/**
 * Operator-only: credit a pending top-up. Not the customer Isi button.
 * Usage: node scripts/approve-topup.mjs TU-XXXXXXXX
 * Optional env: NEXUS_OPERATOR_SECRET, PORTAL_URL (default http://127.0.0.1:3003)
 */
const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/approve-topup.mjs TU-XXXXXXXX");
  process.exit(1);
}

const base = (process.env.PORTAL_URL || "http://127.0.0.1:3003").replace(/\/$/, "");
const headers = { "Content-Type": "application/json" };
if (process.env.NEXUS_OPERATOR_SECRET) {
  headers["x-nexus-operator-secret"] = process.env.NEXUS_OPERATOR_SECRET;
}

const res = await fetch(`${base}/api/kredit/topup/approve`, {
  method: "POST",
  headers,
  body: JSON.stringify({ id }),
});
const data = await res.json();
if (!res.ok) {
  console.error(data);
  process.exit(1);
}
console.log(data);
