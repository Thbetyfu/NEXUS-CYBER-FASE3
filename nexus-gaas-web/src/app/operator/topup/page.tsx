import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OperatorTopupBoard } from "@/components/OperatorTopupBoard";
import { isLoopbackFromParts } from "@/lib/operator-gate";

export const dynamic = "force-dynamic";

export default async function OperatorTopupPage() {
  const h = await headers();
  if (!isLoopbackFromParts(h.get("host") ?? "", h.get("x-forwarded-for"))) {
    notFound();
  }
  return <OperatorTopupBoard />;
}
