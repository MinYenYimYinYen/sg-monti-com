import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type {
  ProgramAggregates,
  ProgramVariables,
  ProgLeafKey,
  LoopLeafKey,
} from "../QuickSendTypes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const UNFULFILLED_MARK = `<mark style="background-color: rgba(220,38,38,0.3); border-radius: 3px; padding: 0 2px;">`;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function escapeReplacement(str: string): string {
  return str.replace(/\$/g, "$$$$");
}

// ---------------------------------------------------------------------------
// Program mention resolution
// ---------------------------------------------------------------------------

export function resolveProgMention(
  fullMatch: string,
  prop: string,
  vars: ProgramVariables,
  mentionPrefix: string,
): string {
  const mentionId = `${mentionPrefix}.${prop}`;

  if (prop === "servTable") {
    if (vars.servTable.length === 0) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
    const rows = vars.servTable
      .map((row) => {
        const priceCell = row.price !== null ? `$${row.price.toFixed(2)}` : "—";
        return `<tr><td>${row.description}</td><td>${priceCell}</td></tr>`;
      })
      .join("");
    return `<table><tbody>${rows}</tbody></table>`;
  }

  const typedProp = prop as ProgLeafKey | LoopLeafKey;
  const value = (vars as Record<string, unknown>)[typedProp];
  if (value === null || value === undefined) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;

  const isDollarAmount =
    (typedProp.toLowerCase().includes("price") ||
      typedProp.toLowerCase().includes("amt") ||
      typedProp === "subTotal" ||
      typedProp === "total") &&
    typeof value === "number";
  const displayValue = escapeReplacement(
    isDollarAmount ? `$${(value as number).toFixed(2)}` : String(value),
  );

  return fullMatch
    .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
    .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
}

// ---------------------------------------------------------------------------
// Pre-pass: drop entire outermost block elements that contain optional-namespace
// mentions whose data is null.
//
// "Optional" namespaces: loop.*, installment.*, totals.*
// "Outermost block" = top-level <p>, <table>, <ul>, <ol>, <blockquote>, <h1>–<h6>
// ---------------------------------------------------------------------------

const OPTIONAL_MENTION_RE = /data-id="(loop|installment|totals)\.[^"]*"/;

/**
 * Returns `true` if the segment should be dropped (contains an optional-namespace
 * mention whose data is null).
 *
 * @param nonInstallmentVars - Programs that will be rendered by `@loop.*`. Drop
 *   `loop.*` blocks when this is empty (matches what `resolveLoopMentions` renders).
 */
export function shouldDropSegment(
  segment: string,
  nonInstallmentVars: ProgramVariables[],
  installmentVars: ProgramVariables[],
  aggregates: ProgramAggregates,
): boolean {
  if (!OPTIONAL_MENTION_RE.test(segment)) return false;
  if (/data-id="loop\.[^"]*"/.test(segment) && nonInstallmentVars.length === 0) return true;
  if (/data-id="installment\.[^"]*"/.test(segment) && installmentVars.length === 0) return true;
  const totalsMatches = [...segment.matchAll(/data-id="totals\.(subTotal|prepayDiscAmt|taxAmt|total)"/g)];
  for (const m of totalsMatches) {
    const field = m[1] as keyof ProgramAggregates;
    if (aggregates[field] === null) return true;
  }
  return false;
}

/**
 * Drops entire outermost block elements that contain optional-namespace mentions
 * whose data is null.
 *
 * - `loop.*` → drop when `nonInstallmentVars` is empty
 * - `installment.*` → drop when `installmentVars` is empty
 * - `totals.*` → drop when any referenced aggregate field is null
 */
export function dropNullOptionalBlocks(
  html: string,
  nonInstallmentVars: ProgramVariables[],
  installmentVars: ProgramVariables[],
  aggregates: ProgramAggregates,
): string {
  const TABLE_SPLIT_RE = /(<table[\s\S]*?<\/table>)/g;
  const P_BLOCK_RE = /(<(?:p|ul|ol|blockquote|h[1-6])(?:\s[^>]*)?>[\s\S]*?<\/(?:p|ul|ol|blockquote|h[1-6])>)/g;

  return html
    .split(TABLE_SPLIT_RE)
    .map((segment) => {
      if (segment.startsWith("<table")) {
        return shouldDropSegment(segment, nonInstallmentVars, installmentVars, aggregates) ? "" : segment;
      }
      return segment.replace(P_BLOCK_RE, (block) =>
        shouldDropSegment(block, nonInstallmentVars, installmentVars, aggregates) ? "" : block,
      );
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Loop expanders
// ---------------------------------------------------------------------------

/**
 * Generic loop expander used by both `@loop.*` and `@installment.*`.
 */
export function resolveLoopLike(
  html: string,
  filteredVars: ProgramVariables[],
  namespace: string,
): string {
  const trRe = new RegExp(
    `(<tr(?:\\s[^>]*)?>)((?:(?!<\\/tr>)[\\s\\S])*?data-id="${namespace}\\.[^"]*"(?:(?!<\\/tr>)[\\s\\S])*?)(<\\/tr>)`,
    "g",
  );
  const pRe = new RegExp(
    `(<p(?:\\s[^>]*)?>)((?:(?!<\\/p>)[\\s\\S])*?data-id="${namespace}\\.[^"]*"(?:(?!<\\/p>)[\\s\\S])*?)(<\\/p>)`,
    "g",
  );
  const mentionRe = new RegExp(
    `<span[^>]*data-type="mention"[^>]*data-id="${namespace}\\.([^"]+)"[^>]*>[^<]*<\\/span>`,
    "g",
  );
  const hasMentionRe = new RegExp(`data-id="${namespace}\\.[^"]*"`);

  const expandUnit = (open: string, inner: string, close: string, isTableRow: boolean): string => {
    const resolvedInners = filteredVars.map((vars) =>
      inner.replace(mentionRe, (fullMatch, prop: string) =>
        resolveProgMention(fullMatch, prop, vars, namespace),
      ),
    );
    if (isTableRow) {
      return resolvedInners.map((resolvedInner) => `${open}${resolvedInner}${close}`).join("");
    }
    return `${open}${resolvedInners.join("<br>")}${close}`;
  };

  const TABLE_SPLIT_RE = /(<table[\s\S]*?<\/table>)/g;
  return html
    .split(TABLE_SPLIT_RE)
    .map((segment) => {
      if (segment.startsWith("<table")) {
        return segment.replace(trRe, (_, open, inner, close) =>
          expandUnit(open, inner, close, true),
        );
      }
      if (hasMentionRe.test(segment)) {
        return segment.replace(pRe, (_, open, inner, close) =>
          expandUnit(open, inner, close, false),
        );
      }
      return segment;
    })
    .join("");
}

/** Resolves `@loop.*` mentions — iterates non-installment programs only. */
export function resolveLoopMentions(html: string, nonInstallmentVars: ProgramVariables[]): string {
  return resolveLoopLike(html, nonInstallmentVars, "loop");
}

/** Resolves `@installment.*` mentions — iterates installment programs only. */
export function resolveInstallmentMentions(html: string, installmentVars: ProgramVariables[]): string {
  return resolveLoopLike(html, installmentVars, "installment");
}

/**
 * Resolves `@totals.{prop}` mention spans to their summed dollar values.
 * By the time this runs, `dropNullOptionalBlocks` has already removed any
 * block where a totals value is null, so all values here are non-null.
 */
export function resolveTotalsMentions(html: string, aggregates: ProgramAggregates): string {
  return html.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="totals\.(subTotal|prepayDiscAmt|taxAmt|total)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, prop: string) => {
      const value = aggregates[prop as keyof ProgramAggregates];
      if (value === null) return fullMatch;
      const displayValue = escapeReplacement(`$${value.toFixed(2)}`);
      return fullMatch
        .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
        .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
    },
  );
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Full mention-to-value replacement pipeline for a single section's HTML.
 *
 * Resolution order:
 * 1. Pre-pass: drop block elements whose optional mentions have no data
 * 2. Flat vars (@name, @size, @taxRate, @season, @sgBillpayInfo, @prepayPercent, @aux.*)
 * 3. Program-specific mentions (@{progCodeId}.{prop})
 * 4. Loop expansion (@loop.*) — non-installment programs only
 * 5. Installment loop expansion (@installment.*)
 * 6. Aggregate mentions (@totals.{prop})
 *
 * @param dropOptionalBlocks - When false, skips the pre-pass (used by the preview
 *   editor so the user sees error-state chips instead of silently dropped blocks).
 */
export function resolveHtml(
  html: string,
  name: string,
  size: string,
  taxRate: string | null,
  season: string | null,
  prepayPercent: number | null,
  progVarMap: Map<string, ProgramVariables>,
  customer: Customer | null,
  auxValues: Record<string, string>,
  auxPurposes: Record<string, string>,
  progVars: ProgramVariables[],
  aggregates: ProgramAggregates,
  dropOptionalBlocks = true,
): string {
  const nonInstallmentVars = progVars.filter((v) => !v.isInstallment);
  const installmentVars = progVars.filter((v) => v.isInstallment);

  let preview = dropOptionalBlocks
    ? dropNullOptionalBlocks(html, nonInstallmentVars, installmentVars, aggregates)
    : html;

  // --- Flat vars ---

  if (name) {
    const safeName = escapeReplacement(name);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeName}"$3${safeName}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{name}}</mark>`,
    );
  }

  if (size) {
    const safeSize = escapeReplacement(size);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="size"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeSize}"$3${safeSize}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="size"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{size}}</mark>`,
    );
  }

  if (taxRate) {
    const safeTaxRate = escapeReplacement(taxRate);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="taxRate"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeTaxRate}"$3${safeTaxRate}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="taxRate"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{taxRate}}</mark>`,
    );
  }

  if (season) {
    const safeSeason = escapeReplacement(season);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="season"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeSeason}"$3${safeSeason}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="season"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{season}}</mark>`,
    );
  }

  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="sgBillpayInfo"[^>]*>[^<]*<\/span>/g,
    () => {
      if (!customer) return `${UNFULFILLED_MARK}{{sgBillpayInfo}}</mark>`;
      const rows = [
        `<tr><td>Account Number:</td><td>${customer.custId}</td></tr>`,
        `<tr><td>Last Name:</td><td>${customer.lastName}</td></tr>`,
        `<tr><td>Zip Code:</td><td>${customer.address.zip ?? ""}</td></tr>`,
      ].join("");
      return `<table><tbody>${rows}</tbody></table>`;
    },
  );

  if (prepayPercent !== null) {
    const safePrepay = escapeReplacement(`${prepayPercent}%`);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="prepayPercent"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safePrepay}"$3${safePrepay}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="prepayPercent"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{prepayPercent}}</mark>`,
    );
  }

  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="(aux(?:_\d+)?)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, auxId: string) => {
      const value = auxValues[auxId];
      if (!value) {
        // Use the purpose label in the error mark so the user knows which field is missing.
        const label = auxPurposes[auxId] || auxId;
        return `${UNFULFILLED_MARK}{{${label}}}</mark>`;
      }
      const safeValue = escapeReplacement(value);
      return fullMatch
        .replace(/data-label="[^"]*"/, `data-label="${safeValue}"`)
        .replace(/>([^<]*)<\/span>$/, `>${safeValue}</span>`);
    },
  );

  // --- Program-specific mentions: @{progCodeId}.{prop} ---
  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)\.([^"]+)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, prefix: string, prop: string) => {
      if (prefix === "loop" || prefix === "installment" || prefix === "totals") return fullMatch;
      const vars = progVarMap.get(prefix);
      if (!vars) return `${UNFULFILLED_MARK}{{${prefix}.${prop}}}</mark>`;
      return resolveProgMention(fullMatch, prop, vars, prefix);
    },
  );

  // --- Loop expansion (@loop.*) — non-installment programs only ---
  preview = resolveLoopMentions(preview, nonInstallmentVars);

  // --- Installment loop expansion (@installment.*) ---
  preview = resolveInstallmentMentions(preview, installmentVars);

  // --- Aggregate totals ---
  preview = resolveTotalsMentions(preview, aggregates);

  return preview;
}
