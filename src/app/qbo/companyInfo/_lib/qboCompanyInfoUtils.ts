import { QboCompanyInfo } from "@/app/qbo/companyInfo/types/QboCompanyInfoTypes";

// Pure helpers for CompanyInfo, free of fetch and the database so they can be tested.

/** Looks up one entry of CompanyInfo's NameValue list, such as SubscriptionStatus. */
export function readCompanyNameValue({
  companyInfo,
  name,
}: {
  companyInfo: QboCompanyInfo;
  name: string;
}): string | null {
  return companyInfo.NameValue?.find((nameValue) => nameValue.Name === name)?.Value ?? null;
}

/** The only CompanyInfo fields that may reach the browser. EmployerId (the EIN) is not among them. */
export type QboCompanySummary = {
  companyName: string;
  legalName: string | null;
  country: string | null;
  subscriptionStatus: string | null;
  offeringSku: string | null;
};

export function summarizeCompanyInfo(companyInfo: QboCompanyInfo): QboCompanySummary {
  return {
    companyName: companyInfo.CompanyName,
    legalName: companyInfo.LegalName ?? null,
    country: companyInfo.Country ?? null,
    subscriptionStatus: readCompanyNameValue({ companyInfo, name: "SubscriptionStatus" }),
    offeringSku: readCompanyNameValue({ companyInfo, name: "OfferingSku" }),
  };
}
