/**
 * Totals for one tax code. A service whose customer has several tax codes contributes its full
 * price after all discounts to `revenue` under each code, so summing `revenue` across codes
 * double-counts by design.
 */
export type TaxSummary = {
  revenue: number;
  taxAmount: number;
};
