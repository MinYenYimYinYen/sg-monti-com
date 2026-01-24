import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type ZipCodeRaw = {
  zip: string;
  taxID1: string | null;
  taxID2: string | null;
  taxID3: string | null;
  city: string;
  alternate1: string | null;
  alternate2: string | null;
  alternate3: string | null;
  alternate4: string | null;
  alternate5: string | null;
  alternate6: string | null;
  alternate7: string | null;
  alternate8: string | null;
  alternate9: string | null;
  cityDisplay: string | null;
  state: string | null;
  areaCode: string | null;
  companyID: number;
  route: string | null;
  territory: string | null;
  alternateCities: (string | null)[] | null;
};

export type ZipCodeCore = {
  zip: string;
  city: string;
};

export type ZipCodeDocProps = CreatedUpdated & {
  zip: string;
};

export type ZipCodeDoc = ZipCodeCore & ZipCodeDocProps;


export type ZipCodeProps = {};

export type ZipCode = ZipCodeDoc & ZipCodeProps;
