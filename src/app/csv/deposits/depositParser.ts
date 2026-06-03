import { z } from "zod";
import { format } from "date-fns";
import { ParseConfig } from "@/app/csv/_lib/ParserTypes";
import { createCSVParser } from "@/app/csv/_lib/parserFactory";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { DepositRow } from "@/app/javelin/JavelinTypes";

// Parse the CRM date format (e.g. "6/2/2026  11:17:00 AM") and subtract 1 day.
// Deposits clear the next business day; subtracting one day aligns QBO with the CRM.
function parseDepositDate(val: string): string {
  const parsed = new Date(val.trim());
  const iso = format(parsed, "yyyy-MM-dd");
  return dateStrings.subDays(iso, 1);
}

const parseAmount = (val: string) => parseFloat(val.replace(/,/g, ""));

const DepositRowSchema = z.object({
  date: z.string().min(1, "Date cannot be empty"),
  salesAmount: z.number(),
  refundAmount: z.number(),
  chargeBackAmount: z.number(),
  adjustmentAmount: z.number(),
  grossDepositAmount: z.number(),
  fees: z.number(),
  netDeposit: z.number(),
});

const DEPOSIT_PARSE_CONFIG: ParseConfig<DepositRow> = {
  columnMappings: {
    DepositDate: "date",
    SalesAmount: "salesAmount",
    RefundAmount: "refundAmount",
    ChargebackAmount: "chargeBackAmount",
    AdjustmentAmount: "adjustmentAmount",
    GrossDepositAmount: "grossDepositAmount",
    Fees: "fees",
    NetDepositAmount: "netDeposit",
  },
  requiredColumns: [
    "DepositDate",
    "SalesAmount",
    "RefundAmount",
    "ChargebackAmount",
    "AdjustmentAmount",
    "GrossDepositAmount",
    "Fees",
    "NetDepositAmount",
  ],
  optionalColumns: [],
  transformations: {
    DepositDate: parseDepositDate,
    SalesAmount: parseAmount,
    RefundAmount: parseAmount,
    ChargebackAmount: parseAmount,
    AdjustmentAmount: parseAmount,
    GrossDepositAmount: parseAmount,
    Fees: parseAmount,
    NetDepositAmount: parseAmount,
  },
  schema: DepositRowSchema,
};

export const parseDeposit = createCSVParser<DepositRow>(DEPOSIT_PARSE_CONFIG);
