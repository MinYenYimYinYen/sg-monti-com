// Intuit's BalanceSheet report, written from the BalanceSheet reference page (minor version 75).
// A report is a tree: sections hold rows, and a row is either a data row (an account and an
// amount) or a nested section. Read only. The query parameters we do not send are commented in
// QboBalanceSheetQuery so the full surface stays visible.

export type QboReportColumnValue = {
  value: string;
  /** On the first column of a data row: the account's QuickBooks Id. Absent on totals. */
  id?: string;
};

export type QboReportRowData = {
  ColData: QboReportColumnValue[];
};

/** A data row has `type: "Data"` and ColData. A section has Header, Rows and Summary instead. */
export type QboReportRow = {
  type?: "Data" | "Section";
  group?: string;
  ColData?: QboReportColumnValue[];
  Header?: QboReportRowData;
  Summary?: QboReportRowData;
  Rows?: { Row?: QboReportRow[] };
};

export type QboBalanceSheetReport = {
  Header: {
    ReportName: string;
    ReportBasis?: string;
    StartPeriod?: string;
    EndPeriod?: string;
    Currency?: string;
    Time?: string;
    SummarizeColumnsBy?: string;
  };
  Rows: { Row?: QboReportRow[] };
  Columns?: { Column?: { ColType: string; ColTitle: string }[] };
};

/** What we send. Dates are YYYY-MM-DD. */
export type QboBalanceSheetQuery = {
  end_date: string;
  accounting_method: "Accrual" | "Cash";

  // Parameters we do not send.
  // start_date?: string; // Must be before end_date. A balance sheet as of a day does not need it.
  // date_macro?: string;
  // summarize_column_by?: string;
  // customer?: string;
  // vendor?: string;
  // class?: string;
  // department?: string;
  // item?: string;
  // sort_order?: "ascend" | "descend";
  // adjusted_gain_loss?: boolean;
  // qzurl?: boolean;
};

/** One account's balance on one day, as the balance sheet reports it. */
export type QboAccountBalance = {
  accountId: string;
  /** YYYY-MM-DD. */
  asOfDate: string;
  /**
   * The amount in the account's normal direction: a liability or equity account is positive when
   * it holds a credit balance, and an asset account is positive when it holds a debit balance.
   * Negative means the opposite side.
   */
  balanceCents: number;
};
