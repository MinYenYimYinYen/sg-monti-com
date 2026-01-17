export interface Companies {
  companies: Company[];
}

// This param is a special case, and we'll handle it last
export interface Company {
  AddressLine1: string;
  AddressLine2: string;
  AddressLine3: string;
  AreaCode: string;
  BranchNumber: string;
  BusinessEndTime: string;
  BusinessStartTime: string;
  CompanyName: string;
  Fax: string;
  ID: number;
  IsDefaultCompany: boolean;
  Latitude: number;
  Longitude: number;
  MarketId: number;
  Phone1: string;
  Phone2: string;
  ReplyEmail: string;
  State: string;
  TaxID1: string;
  TaxID2: string;
  TaxID3: string;
  UnitCodeID: number;
}

export function getCompanyAddressBlock(
  company: Company,
  // includeCompanyName: boolean,
  options?: { includeCompanyName?: boolean; singleLine?: boolean },
): string {
  const { includeCompanyName = false, singleLine = false } = options || {};
  const { CompanyName, AddressLine1, AddressLine2, AddressLine3 } = company;
  const elements = [];
  if (includeCompanyName) elements.push(CompanyName);
  elements.push(AddressLine1);
  elements.push(AddressLine2);
  elements.push(AddressLine3);

  const validElements = elements.filter((e) => {
    return e !== undefined && e !== null && e !== "";
  });

  const joiner = singleLine ? " " : "\n";

  return validElements.join(joiner);
}
