/**
 * Shared type for label-value pair data used by PrepayLabelValueList (PDF)
 * and PreviewPrepayLabelValueList (DOM preview).
 */
export type LabelValuePair = {
  /** The left-column label text. */
  label: string;
  /** The right-column value — number for formatted output, string for raw text. */
  value: number | string | null | undefined;
  /** Optional center-column annotation (e.g. "10% off"). Omit when not needed. */
  annotation?: string | null;
  /** When true, formats value as currency via PDFNumber / formatNumber. */
  isMoney?: boolean;
  /** Number of decimal places. Defaults to 0. */
  decimals?: number;
};
