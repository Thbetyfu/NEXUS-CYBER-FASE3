import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OperatorTopupBoard } from "@/components/OperatorTopupBoard";
import { isOpenTopupStatus } from "@/lib/kredit";
import { listOperatorQueue } from "@/lib/kredit-topup";
import { isLoopbackFromHeaders } from "@/lib/operator-gate";

export const dynamic = "force-dynamic";

export default async function OperatorTopupPage() {
  const h = await headers();
  if (!isLoopbackFromHeaders(h)) {
    notFound();
  }
  const items = (await listOperatorQueue()).filter((item) => isOpenTopupStatus(item.status));
  return <OperatorTopupBoard initialItems={items} />;
}
