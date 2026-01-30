import {
  CompanyCore,
  CompanyRaw,
} from "@/app/realGreen/company/_lib/CompanyTypes";

export function remapCompany(raw: CompanyRaw): CompanyCore {
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