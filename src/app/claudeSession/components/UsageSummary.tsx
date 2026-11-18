import { PRICES_READ_ON, formatUsd } from "@/app/anthropic/anthropicPricing";
import type { ConversationTotals } from "@/app/anthropic/AnthropicTypes";

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

export function UsageSummary({
  totals,
  contextTokens,
}: {
  totals: ConversationTotals;
  contextTokens: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      title={`Estimate from the published prices read on ${PRICES_READ_ON}. The Claude Console usage report is the real bill.`}
    >
      <span>Conversation total: {formatUsd(totals.costUsd)} (estimate)</span>
      <span>{formatCount(totals.inputTokens)} in</span>
      <span>{formatCount(totals.outputTokens)} out</span>
      <span>{totals.apiCalls} calls</span>
      <span>Next prompt resends about {formatCount(contextTokens)} tokens</span>
    </div>
  );
}
