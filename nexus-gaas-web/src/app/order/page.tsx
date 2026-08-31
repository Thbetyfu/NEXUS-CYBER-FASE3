import { redirect } from "next/navigation";
import { DEFAULT_STARTER_SKU, checkoutHref } from "@/lib/checkout";

/** Alias lama — jangan dipromosikan di navbar. */
export default function OrderAliasPage() {
  redirect(checkoutHref(DEFAULT_STARTER_SKU));
}
