import {
  TaxCode,
  TaxCodeCore,
  TaxCodeDoc,
  TaxCodeDocProps,
  TaxCodeProps,
} from "@/app/realGreen/taxCode/TaxCodeTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseTaxCodeCore: TaxCodeCore = {
  taxCodeId: baseStrId,
  available: true,
  taxRate: baseNumId,
};

export const baseTaxCodeDocProps: TaxCodeDocProps = {
  taxCodeId: baseStrId,
  createdAt: "",
  updatedAt: "",
};

export const baseTaxCodeDoc: TaxCodeDoc = {
  ...baseTaxCodeCore,
  ...baseTaxCodeDocProps,
};

export const baseTaxCodeProps: TaxCodeProps = {
  customers: [],
};

export const baseTaxCode: TaxCode = {
  ...baseTaxCodeDoc,
  ...baseTaxCodeProps,
};
