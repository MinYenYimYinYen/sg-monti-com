import type { AnthropicModelId } from "@/app/anthropic/anthropicConst";
import type { TokenUsage } from "@/app/anthropic/AnthropicTypes";

/**
 * Read from Anthropic's pricing page on this date. Prices change, so the cost the page shows is an
 * estimate: compare it with the Claude Console usage report before relying on it.
 */
export const PRICES_READ_ON = "2026-11-17";

type PriceRate = { inputPerMTok: number; outputPerMTok: number };

type ModelPrice = {
  standard: PriceRate;
  /** Haiku 5.5 charges a higher rate for a request whose prompt is over 100,000 tokens. */
  longPrompt?: { aboveInputTokens: number; rate: PriceRate };
};

const MODEL_PRICES: Record<AnthropicModelId, ModelPrice> = {
  "claude-haiku-5-5": {
    standard: { inputPerMTok: 0.1, outputPerMTok: 0.5 },
    longPrompt: { aboveInputTokens: 100_000, rate: { inputPerMTok: 0.5, outputPerMTok: 2.5 } },
  },
  "claude-sonnet-5-5": { standard: { inputPerMTok: 2, outputPerMTok: 10 } },
  "claude-opus-5-5": { standard: { inputPerMTok: 4, outputPerMTok: 20 } },
};

const TOKENS_PER_MTOK = 1_000_000;

/** Prompt caching is not used, so only plain input and output tokens are priced. */
export function computeCallCost({ model, usage }: { model: AnthropicModelId; usage: TokenUsage }): number {
  const { standard, longPrompt } = MODEL_PRICES[model];
  const rate = longPrompt && usage.inputTokens > longPrompt.aboveInputTokens ? longPrompt.rate : standard;
  return (usage.inputTokens * rate.inputPerMTok + usage.outputTokens * rate.outputPerMTok) / TOKENS_PER_MTOK;
}

/** Priced call by call, because the rate depends on each request's own prompt size. */
export function computeTotalCost({
  model,
  usagePerCall,
}: {
  model: AnthropicModelId;
  usagePerCall: TokenUsage[];
}): number {
  return usagePerCall.reduce((total, usage) => total + computeCallCost({ model, usage }), 0);
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  return `$${amount.toFixed(amount < 0.01 ? 5 : 4)}`;
}
