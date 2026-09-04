import { NextRequest, NextResponse } from "next/server";
import { wizardAttachUnowned } from "@/lib/channel-starter-owned";
import { isOperatorRequest } from "@/lib/operator-gate";
import { lookupAccountByEmail } from "@/lib/portal-identity";
import { identityOwnerQuery, normalizeOwnerId, type PortalOwnerQuery } from "@/lib/portal-site-owner";

/** Operator loopback: stamp one unowned slug onto a known account. Fail-closed off-lab. */
export async function POST(request: NextRequest) {
  if (!isOperatorRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Attach slug tanpa pemilik hanya loopback atau header operator" },
      { status: 403 },
    );
  }

  let slug = "";
  let email = "";
  let ownerId = "";
  let ownerKind = "";
  let ownerEmail = "";
  try {
    const body = (await request.json()) as {
      slug?: string;
      email?: string;
      owner_id?: string;
      owner_kind?: string;
      owner_email?: string;
    };
    slug = typeof body.slug === "string" ? body.slug : "";
    email = typeof body.email === "string" ? body.email : "";
    ownerId = typeof body.owner_id === "string" ? body.owner_id : "";
    ownerKind = typeof body.owner_kind === "string" ? body.owner_kind : "";
    ownerEmail = typeof body.owner_email === "string" ? body.owner_email : "";
  } catch {
    slug = "";
  }

  let query: PortalOwnerQuery | null = null;
  const explicitId = normalizeOwnerId(ownerId);
  if (explicitId && (ownerKind === "guest" || ownerKind === "account")) {
    query = {
      ownerId: explicitId,
      ownerKind: ownerKind === "account" ? "account" : "guest",
      ownerEmail: ownerEmail.trim().toLowerCase(),
      extraOwnerIds: [],
    };
  } else {
    const account = lookupAccountByEmail(email);
    if (account) {
      query = identityOwnerQuery({
        sid: account.id,
        kind: "account",
        accountId: account.id,
        email: account.email,
        walletId: `account:${account.id}`,
        orderCode: "",
      });
    }
  }

  if (!query) {
    return NextResponse.json(
      { ok: false, error: "Akun tidak ditemukan. Isi email terdaftar atau owner_id." },
      { status: 404 },
    );
  }

  const attached = await wizardAttachUnowned(slug, query);
  if (attached.status !== 200) {
    return NextResponse.json(
      { ok: false, error: attached.error, outcome: attached.outcome },
      { status: attached.status },
    );
  }
  return NextResponse.json({
    ok: true,
    outcome: attached.outcome,
    site: attached.site,
    debitStarter: false,
  });
}
