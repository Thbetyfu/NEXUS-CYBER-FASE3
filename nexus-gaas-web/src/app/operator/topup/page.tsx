import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OperatorTopupBoard } from "@/components/OperatorTopupBoard";
import { isLoopbackFromHeaders } from "@/lib/operator-gate";

export const dynamic = "force-dynamic";

export default async function OperatorTopupPage() {
  const h = await headers();
  if (!isLoopbackFromHeaders(h)) {
    notFound();
  }
  return <OperatorTopupBoard />;
}
