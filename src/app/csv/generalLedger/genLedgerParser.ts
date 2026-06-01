import { z } from "zod";
import { ParseConfig } from "@/app/csv/_lib/ParserTypes";
import { createCSVParser } from "@/app/csv/_lib/parserFactory";
import { GenLedgerRow } from "@/app/javelin/JavelinTypes";

const GenLedgerRowSchema = z.object({
  account: z.string().min(1, "Account cannot be empty"),
  // Negative values are valid — credits are represented as negative amounts
  totalNetAmount: z.number(),
});

const GEN_LEDGER_PARSE_CONFIG: ParseConfig<GenLedgerRow> = {
  columnMappings: {
    Account: "account",
    TotalNetAmount: "totalNetAmount",
  },
  requiredColumns: ["Account", "TotalNetAmount"],
  optionalColumns: [],
  transformations: {
    Account: (val) => val.trim(),
    TotalNetAmount: (val) => parseFloat(val.replace(/,/g, "")),
  },
  schema: GenLedgerRowSchema,
};

export const parseGenLedger = createCSVParser<GenLedgerRow>(GEN_LEDGER_PARSE_CONFIG);
