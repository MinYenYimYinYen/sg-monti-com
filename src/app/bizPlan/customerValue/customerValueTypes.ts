export type CustomerValueByZip = {
  zip: string;
  city: string;
  activeCustomerCount: number;
  customerValue: number;
  avgCustomerValue: number;
  avgCustomerSize: number;
  pestControlCustomerCount: number;
  mlcCustomerCount: number;
  avgExtraServicesPerCustomer: number;
  /** Mean price-chart (acquisition) price across qualifying services that have a price table. */
  avgAcquisitionPrice: number;
  /**
   * Ratio of actual average service revenue to average acquisition price.
   * 1.0 = charging at acquisition price; 1.25 = fully matured (regular price).
   * 0 when no acquisition price data is available.
   */
  avgMaturityRatio: number;
};
