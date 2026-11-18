import { MnJurisdiction, MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

export const MN_JURISDICTIONS: readonly MnJurisdiction[] = ["state", "county", "city", "region"];

export const MN_JURISDICTION_LABELS: Record<MnJurisdiction, string> = {
  state: "State",
  county: "County",
  city: "City",
  region: "Region or district",
};

// RealGreen and the state both carry rates to at most three decimals of a percent, so two rates
// closer than this are the same rate and the gap is floating point noise from summing.
const RATE_TOLERANCE = 0.0005;

export function roundRate(rate: number): number {
  return Math.round(rate * 1e6) / 1e6;
}

function byCode(a: MnTaxType, b: MnTaxType): number {
  return a.code.localeCompare(b.code);
}

export function sumRatePercent(mnTaxTypes: MnTaxType[]): number {
  return roundRate(mnTaxTypes.reduce((sum, mnTaxType) => sum + mnTaxType.ratePercent, 0));
}

export function ratesMatch({
  mappedPercent,
  taxRate,
}: {
  mappedPercent: number;
  taxRate: number;
}): boolean {
  return Math.abs(mappedPercent - taxRate) < RATE_TOLERANCE;
}

/** `primary` wins when both lists carry the same code, so a hardcoded definition is never shadowed. */
export function mergeMnTaxTypes({
  primary,
  additional,
}: {
  primary: MnTaxType[];
  additional: MnTaxType[];
}): MnTaxType[] {
  const byCodeMap = new Map<string, MnTaxType>();
  for (const mnTaxType of [...primary, ...additional]) {
    if (!byCodeMap.has(mnTaxType.code)) byCodeMap.set(mnTaxType.code, mnTaxType);
  }
  return [...byCodeMap.values()].sort(byCode);
}

export function toggleMnTaxType({
  selected,
  mnTaxType,
}: {
  selected: MnTaxType[];
  mnTaxType: MnTaxType;
}): MnTaxType[] {
  const isSelected = selected.some((chosen) => chosen.code === mnTaxType.code);
  return isSelected
    ? selected.filter((chosen) => chosen.code !== mnTaxType.code)
    : [...selected, mnTaxType].sort(byCode);
}

function isSameMnTaxType({ first, second }: { first: MnTaxType; second: MnTaxType }): boolean {
  return (
    first.code === second.code &&
    first.description === second.description &&
    first.fipsCode === second.fipsCode &&
    first.ratePercent === second.ratePercent &&
    first.jurisdiction === second.jurisdiction &&
    first.effectiveFrom === second.effectiveFrom &&
    first.endedOn === second.endedOn
  );
}

export function isSameMnTaxTypes({
  first,
  second,
}: {
  first: MnTaxType[];
  second: MnTaxType[];
}): boolean {
  if (first.length !== second.length) return false;
  const sortedFirst = [...first].sort(byCode);
  const sortedSecond = [...second].sort(byCode);
  return sortedFirst.every((mnTaxType, index) =>
    isSameMnTaxType({ first: mnTaxType, second: sortedSecond[index] }),
  );
}

/**
 * Ended types are hidden unless asked for, because a current month never files under them. One that
 * is already selected stays visible so it can be unticked.
 */
export function filterMnTaxTypes({
  mnTaxTypes,
  search,
  showEnded,
  selectedCodes,
}: {
  mnTaxTypes: MnTaxType[];
  search: string;
  showEnded: boolean;
  selectedCodes: ReadonlySet<string>;
}): MnTaxType[] {
  const needle = search.trim().toLowerCase();
  return mnTaxTypes.filter((mnTaxType) => {
    if (mnTaxType.endedOn !== null && !showEnded && !selectedCodes.has(mnTaxType.code)) {
      return false;
    }
    if (!needle) return true;
    return (
      mnTaxType.code.includes(needle) ||
      mnTaxType.description.toLowerCase().includes(needle) ||
      (mnTaxType.fipsCode ?? "").includes(needle)
    );
  });
}

export type MnTaxTypeGroup = {
  jurisdiction: MnJurisdiction;
  mnTaxTypes: MnTaxType[];
};

export function groupMnTaxTypesByJurisdiction(mnTaxTypes: MnTaxType[]): MnTaxTypeGroup[] {
  return MN_JURISDICTIONS.map((jurisdiction) => ({
    jurisdiction,
    mnTaxTypes: mnTaxTypes.filter((mnTaxType) => mnTaxType.jurisdiction === jurisdiction),
  })).filter((group) => group.mnTaxTypes.length > 0);
}
