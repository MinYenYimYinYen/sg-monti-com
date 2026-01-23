export type Address = {
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  countryCode?: string;
  formattedAddress: string;
  formattedAddressWithCulture: string | null;
  formattedZip?: string;
  formattedZipWithCulture: string | null;
  houseNumber: string;
  latitude: number | null;
  longitude: number | null;
  postDirection: string;
  preDirection: string;
  state?: string;
  streetName: string;
  streetSuffix: string;
  zip?: string;
};

export const baseAddress: Address = {
  formattedAddress: "",
  formattedAddressWithCulture: "",
  formattedZip: "",
  formattedZipWithCulture: "",
  houseNumber: "",
  latitude: null,
  longitude: null,
  postDirection: "",
  preDirection: "",
  streetName: "",
  streetSuffix: "",
};





