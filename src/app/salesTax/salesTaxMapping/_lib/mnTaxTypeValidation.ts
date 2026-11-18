import { MnJurisdiction, MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import { MN_JURISDICTIONS, roundRate } from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";

const CODE_PATTERN = /^\d{3}$/;

/** Null when the type is fit to store, otherwise a message the user can act on. */
export function findMnTaxTypeProblem(mnTaxType: MnTaxType): string | null {
  if (!CODE_PATTERN.test(mnTaxType.code)) return "A tax type code is 3 digits.";
  if (!mnTaxType.description.trim()) return `Tax type ${mnTaxType.code} needs a description.`;
  if (!Number.isFinite(mnTaxType.ratePercent) || mnTaxType.ratePercent <= 0) {
    return `Tax type ${mnTaxType.code} needs a rate above 0.`;
  }
  if (mnTaxType.ratePercent > 100) return `Tax type ${mnTaxType.code} has a rate above 100%.`;
  if (!MN_JURISDICTIONS.includes(mnTaxType.jurisdiction)) {
    return `Tax type ${mnTaxType.code} needs a jurisdiction.`;
  }
  return null;
}

/** The server runs this on what the browser sent, so it also guards the shape. */
export function findMnTaxTypesProblem(mnTaxTypes: MnTaxType[]): string | null {
  if (!Array.isArray(mnTaxTypes)) return "The mapping needs a list of tax types.";
  const seenCodes = new Set<string>();
  for (const mnTaxType of mnTaxTypes) {
    const problem = findMnTaxTypeProblem(mnTaxType);
    if (problem) return problem;
    if (seenCodes.has(mnTaxType.code)) return `Tax type ${mnTaxType.code} is listed twice.`;
    seenCodes.add(mnTaxType.code);
  }
  return null;
}

/** What the new-definition form holds while typing, so every field is text. */
export type NewMnTaxTypeInput = {
  code: string;
  description: string;
  fipsCode: string;
  ratePercent: string;
  jurisdiction: MnJurisdiction;
};

export const EMPTY_NEW_MN_TAX_TYPE_INPUT: NewMnTaxTypeInput = {
  code: "",
  description: "",
  fipsCode: "",
  ratePercent: "",
  jurisdiction: "city",
};

export type NewMnTaxTypeResult =
  | { ok: true; mnTaxType: MnTaxType }
  | { ok: false; message: string };

export function validateNewMnTaxType({
  input,
  takenCodes,
}: {
  input: NewMnTaxTypeInput;
  takenCodes: ReadonlySet<string>;
}): NewMnTaxTypeResult {
  const code = input.code.trim();
  if (takenCodes.has(code)) return { ok: false, message: `Code ${code} already exists.` };
  const mnTaxType: MnTaxType = {
    code,
    description: input.description.trim(),
    fipsCode: input.fipsCode.trim() || null,
    ratePercent: roundRate(Number(input.ratePercent.trim())),
    jurisdiction: input.jurisdiction,
    effectiveFrom: null,
    endedOn: null,
  };
  const problem = findMnTaxTypeProblem(mnTaxType);
  return problem ? { ok: false, message: problem } : { ok: true, mnTaxType };
}
