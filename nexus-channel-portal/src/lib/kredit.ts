/** Konstanta Kredit — aman diimpor klien. Tanpa process.env (itu merusak bundle /order). */

export const KREDIT = {
  name: "Kredit",
  abbr: "Kr",
  idrPerKredit: 1_000,
  starterPriceKr: 20,
  faucetAmountKr: 100,
  faucetMaxKr: 500,
  walletId: "lab",
  labSubdomainBase: "nexus-lab.test",
} as const;

export function starterPriceIdr(): number {
  return KREDIT.starterPriceKr * KREDIT.idrPerKredit;
}

export type KreditKind = "faucet" | "debit" | "refund";

export type KreditEntry = {
  id: string;
  ts: string;
  kind: KreditKind;
  amount: number;
  orderId?: string;
  sku?: string;
  note: string;
  balanceAfter: number;
};

export type KreditSnapshot = {
  walletId: string;
  balance: number;
  mode: "lab" | "live";
  starterPriceKr: number;
  idrPerKredit: number;
  faucetAmountKr: number;
  entries: KreditEntry[];
};

export class InsufficientKreditError extends Error {
  readonly balance: number;
  readonly needed: number;

  constructor(balance: number, needed: number) {
    super(`Saldo Kredit tidak cukup (${balance} Kr, perlu ${needed} Kr)`);
    this.name = "InsufficientKreditError";
    this.balance = balance;
    this.needed = needed;
  }
}

export class FaucetDisabledError extends Error {
  constructor() {
    super("Keran Kredit hanya untuk mode lab");
    this.name = "FaucetDisabledError";
  }
}
