export type RGStringRange = {
  minValue: string;
  maxValue: string;
};

export type RGNumRange = {
  minValue?: number;
  maxValue?: number;
}

export type ProgStat = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
export type CustStat = "M" & ProgStat;

export function custStatRangeToArray(status: RGStringRange): string[] {
  // string range can be 0-9 or M

  const statusArray: string[] = [];
  if (status.minValue === "M") {
    statusArray.push("M");
  } else {
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
  // Separate "M" if it exists in the array
  const hasM = statusArray.includes("M");

  // Filter out "M" and sort numeric values
  const numericStatuses = statusArray
    .filter((status) => status !== "M")
    .sort((a, b) => Number(a) - Number(b));

  // Determine minValue and maxValue
  const minValue = hasM ? "M" : numericStatuses[0];
  const maxValue =
    numericStatuses.length > 0
      ? numericStatuses[numericStatuses.length - 1]
      : "M";

  return { minValue, maxValue };
}

export function stringIsInStringRange(string: string, range: RGStringRange) {
  return custStatRangeToArray(range).includes(string);
}