export type RGStringRange = {
  minValue: string;
  maxValue: string;
};

export type RGNumRange = {
  minValue?: number;
  maxValue?: number;
}

export type ProgStat = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
export type CustStat = "M" | ProgStat;

export function custStatRangeToArray(status: RGStringRange): string[] {
  // RealGreen orders statuses as 0-9 then M (M is after 9).
  // A range with maxValue "M" means "include all numerics from minValue to 9, plus M".
  // A range with minValue "M" and maxValue "M" means M only.

  const statusArray: string[] = [];

  if (status.minValue === "M" && status.maxValue === "M") {
    // M-only range
    statusArray.push("M");
  } else if (status.maxValue === "M") {
    // Numeric range plus M
    for (let i = parseInt(status.minValue); i <= 9; i++) {
      statusArray.push(i.toString());
    }
    statusArray.push("M");
  } else {
    // Pure numeric range
    for (
      let i = parseInt(status.minValue);
      i <= parseInt(status.maxValue);
      i++
    ) {
      statusArray.push(i.toString());
    }
  }

  return statusArray;
}

export function statusArrayToStringRange(statusArray: string[]): RGStringRange {
  // RealGreen orders statuses as 0-9 then M (M is after 9).
  // Encode M as maxValue when present alongside numerics: { minValue: "0", maxValue: "M" }.
  // M-only: { minValue: "M", maxValue: "M" }.

  const hasM = statusArray.includes("M");

  const numericStatuses = statusArray
    .filter((status) => status !== "M")
    .sort((a, b) => Number(a) - Number(b));

  if (numericStatuses.length === 0) {
    // M-only
    return { minValue: "M", maxValue: "M" };
  }

  const minValue = numericStatuses[0];
  const maxValue = hasM ? "M" : numericStatuses[numericStatuses.length - 1];

  return { minValue, maxValue };
}

export function stringIsInStringRange(string: string, range: RGStringRange) {
  return custStatRangeToArray(range).includes(string);
}