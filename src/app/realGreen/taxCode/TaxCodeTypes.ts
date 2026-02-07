import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type TaxCodeCore = {
  taxCodeId: string;
  available: boolean;
  taxRate: number;
};
export type TaxCodeRaw = {
  anyBranch: boolean;
  available: boolean;
  description: string;
  descriptionFrench: string;
  descriptionSpanish: string;
  id: string;
  invoiceDescription: string;
  taxRate: number;
};

export type TaxCodeDocProps = CreatedUpdated & {
  taxCodeId: string;
};

export type TaxCodeDoc = TaxCodeCore & TaxCodeDocProps;

export type TaxCodeProps = {
  customers: Customer[]
};

export type TaxCode = TaxCodeDoc & TaxCodeProps;
