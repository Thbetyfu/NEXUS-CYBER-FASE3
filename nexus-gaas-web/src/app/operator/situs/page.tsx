import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OperatorUnownedBoard } from "@/components/OperatorUnownedBoard";
import { isLoopbackFromHeaders } from "@/lib/operator-gate";

export const dynamic = "force-dynamic";

export default async function OperatorSitusPage() {
  const h = await headers();
  if (!isLoopbackFromHeaders(h)) {
    notFound();
  }
  return <OperatorUnownedBoard />;
}
