import {
  ZipCode,
  ZipCodeCore,
  ZipCodeDoc,
  ZipCodeDocProps,
  ZipCodeProps,
} from "./ZipCodeTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseZipCodeCore: ZipCodeCore = {
  zip: baseStrId,
  city: baseStrId,
  taxIds: [],
  altCities: [],
};

export const baseZipCodeDocProps: ZipCodeDocProps = {
  zip: baseStrId,
  createdAt: "",
  updatedAt: "",
};

export const baseZipCodeDoc: ZipCodeDoc = {
  ...baseZipCodeCore,
  ...baseZipCodeDocProps,
};

export const baseZipCodeProps: ZipCodeProps = {
  taxCodes: [],
  taxRate: 0,
};

export const baseZipCode: ZipCode = {
  ...baseZipCodeDoc,
  ...baseZipCodeProps,
};
