import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OperatorTepiBoard } from "@/components/OperatorTepiBoard";
import { isLoopbackFromHeaders } from "@/lib/operator-gate";

export const dynamic = "force-dynamic";

export default async function OperatorTepiPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const h = await headers();
  if (!isLoopbackFromHeaders(h)) {
    notFound();
  }
  const params = await searchParams;
  const slug = typeof params.slug === "string" ? params.slug : "";
  return <OperatorTepiBoard initialSlug={slug} />;
}
