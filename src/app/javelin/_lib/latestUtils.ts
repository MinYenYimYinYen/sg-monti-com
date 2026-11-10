import { JavelinKind, JavelinLatest } from "@/app/javelin/JavelinTypes";

// Pure. The wording of the "what to export next" banner, so it can be tested.

const currencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return currencyFormat.format(cents / 100);
}

/** The day after a YYYY-MM-DD date, in UTC so no time zone can shift it. */
export function nextIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function describeLatest({
  kind,
  latest,
}: {
  kind: JavelinKind;
  latest: JavelinLatest;
}): string {
  const entry = latest[kind];
  if (kind === "genLedger") {
    return entry
      ? `Last general ledger entry: ${entry.txnDate}. Export the next ledger file from ${nextIsoDate(entry.txnDate)}.`
      : "No general ledger entries have been posted yet.";
  }
  if (kind === "ckDeposit") {
    if (!entry) return "No check deposit entries have been posted yet.";
    const amount = entry.amountCents !== undefined ? `, ${formatCents(entry.amountCents)}` : "";
    return `Last check deposit entry: ${entry.txnDate}${amount}. Enter deposits after that.`;
  }
  if (!entry) return "No credit card deposit entries have been posted yet.";
  const amount = entry.netDepositCents !== undefined ? `, ${formatCents(entry.netDepositCents)} net` : "";
  return `Last credit card deposit entry: ${entry.txnDate}${amount}. Export deposits after that.`;
}
