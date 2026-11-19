import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import {
  QboAccountBalance,
  QboBalanceSheetReport,
} from "@/app/qbo/balanceSheet/types/QboBalanceSheetTypes";
import {
  buildBalanceSheetQueryString,
  findAccountInReport,
  isRealIsoDate,
  isSafeAccountId,
} from "@/app/qbo/balanceSheet/_lib/qboBalanceSheetUtils";

// Server only. Read only: it never writes to QuickBooks.

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/**
 * The whole balance sheet as of a day, always a fresh read. Accrual is pinned so the figures match
 * the account registers. No start_date is sent: a balance sheet as of a day does not need one.
 * UNVERIFIED: that the report accepts end_date without start_date.
 */
export async function loadQboBalanceSheet(asOfDate: string): Promise<QboBalanceSheetReport> {
  if (!isRealIsoDate(asOfDate)) throw validationError("The date must be a real date written YYYY-MM-DD.");
  const query = buildBalanceSheetQueryString({ end_date: asOfDate, accounting_method: "Accrual" });
  // Annotated so the path keeps the template literal type qboApi requires.
  const path: `/reports/BalanceSheet?${string}` = `/reports/BalanceSheet?${query}`;
  return qboApi<QboBalanceSheetReport>({
    path,
    method: "GET",
    pathTemplate: "/reports/BalanceSheet",
  });
}

/**
 * One account's balance on a day, in the account's normal direction (see QboAccountBalance). An
 * account with sub-accounts has no figure of its own on the report, so it is refused rather than
 * guessed: link a leaf account instead.
 */
export async function readQboAccountBalance({
  accountId,
  asOfDate,
}: {
  accountId: string;
  asOfDate: string;
}): Promise<QboAccountBalance> {
  if (!isSafeAccountId(accountId)) throw validationError("The QuickBooks account Id is not valid.");

  const report = await loadQboBalanceSheet(asOfDate);
  const lookup = findAccountInReport({ report, accountId });

  if (lookup.found === "section") {
    throw validationError(
      "This QuickBooks account has sub-accounts, so the balance sheet has no single balance for it. Link an account without sub-accounts.",
    );
  }
  if (lookup.found === "unreadable") {
    throw new AppError({
      message: `QuickBooks returned a balance that could not be read ("${lookup.text}").`,
      type: "EXTERNAL_ERROR",
      statusCode: 502,
      isOperational: true,
    });
  }
  // Absent means the report left the account off, which this app reads as a zero balance.
  return {
    accountId,
    asOfDate,
    balanceCents: lookup.found === "balance" ? lookup.balanceCents : 0,
  };
}
