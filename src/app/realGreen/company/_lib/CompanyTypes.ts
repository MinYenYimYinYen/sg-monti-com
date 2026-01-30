export type CompanyRaw = {
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
};

export type CompanyCore = {
  companyId: number;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  areaCode: string;
  isDefaultCompany: boolean;
  latitude: number;
  longitude: number;
  phone1: string;
  phone2: string;
  replyEmail: string;
  state: string;
  unitCodeId: number;
};

export type Company = CompanyCore;

