import { format, parseISO } from "date-fns";
import { MN_RETURN_FILLER, MN_RETURN_LINE_ENDING } from "@/app/salesTax/_lib/mnReturnConst";

// Pure, safe for the browser and the server. Reads the state's upload file, in the layout
// buildMnReturnFile writes.

const PERIOD_LABEL_FORMAT = "dd-MMM-yyyy";

export type ReturnFileReading = {
  /** The filing period row, as the state writes it ("30-Sep-2026"), or null if the row is missing. */
  periodLabel: string | null;
  /** The sum of every TAX DUE column on the location row, in whole dollars, or null if unreadable. */
  taxDueDollars: number | null;
};

/**
 * Reads the two things the payment needs from the return file: the filing period, to catch a file
 * from another month, and the tax due, shown for reference.
 */
export function readMnReturnFile(text: string): ReturnFileReading {
  const rows = text
    .split(MN_RETURN_LINE_ENDING)
    .filter((row) => row.length > 0)
    .map((row) => row.split(","));
  const periodLabel = rows[1]?.[1] ?? null;
  const locationRow = rows[3];
  if (!locationRow || locationRow[0] !== MN_RETURN_FILLER) {
    return { periodLabel, taxDueDollars: null };
  }

  // After FILLER, location and receipts, each line is a tax type, taxable and tax due triple.
  let total = 0;
  for (let index = 5; index < locationRow.length; index += 3) {
    const due = Number(locationRow[index]);
    if (!Number.isInteger(due)) return { periodLabel, taxDueDollars: null };
    total += due;
  }
  return { periodLabel, taxDueDollars: total };
}

/** A message for the user, or null when the return file is for this period. */
export function checkReturnFileMatchesPeriod({
  returnFileText,
  periodEnd,
}: {
  returnFileText: string;
  periodEnd: string;
}): string | null {
  const { periodLabel } = readMnReturnFile(returnFileText);
  const expected = format(parseISO(periodEnd), PERIOD_LABEL_FORMAT);
  if (periodLabel !== expected) {
    return `The Minnesota return file is for ${periodLabel ?? "an unreadable period"}, not ${expected}.`;
  }
  return null;
}
