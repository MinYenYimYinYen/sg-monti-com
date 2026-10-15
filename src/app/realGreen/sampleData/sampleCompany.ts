import type { Company } from "@/app/realGreen/company/_lib/CompanyTypes";
import { formatPhoneDigits } from "@/lib/primatives/string/formatPhoneDigits";

export const sampleCompany: Company = {
  companyId: 1,
  companyName: "Sample Lawn Co.",
  addressLine1: "P.O. Box 1",
  addressLine2: "Monticello, MN 55362",
  addressLine3: "",
  areaCode: "555",
  isDefaultCompany: true,
  latitude: 0,
  longitude: 0,
  phone1: formatPhoneDigits("7635551234"),
  phone2: "",
  replyEmail: "sample@samplelawn.com",
  state: "MN",
  unitCodeId: 1,
};
