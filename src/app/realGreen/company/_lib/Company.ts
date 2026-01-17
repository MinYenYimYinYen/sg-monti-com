import { Grouper } from "@/lib/Grouper";

export type RawCompany = {
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

export type RemappedCompany = {
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

export type Company = RemappedCompany;

export function remapCompany(raw: RawCompany): RemappedCompany {
  return {
    companyId: raw.ID,
    companyName: raw.CompanyName,
    addressLine1: raw.AddressLine1,
    addressLine2: raw.AddressLine2,
    addressLine3: raw.AddressLine3,
    areaCode: raw.AreaCode,
    isDefaultCompany: raw.IsDefaultCompany,
    latitude: raw.Latitude,
    longitude: raw.Longitude,
    phone1: raw.Phone1,
    phone2: raw.Phone2,
    replyEmail: raw.ReplyEmail,
    state: raw.State,
    unitCodeId: raw.UnitCodeID,
  };
}
