import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export const baseTaxCode: TaxCode = {
  id: baseStrId,
  taxCodeId: baseStrId,

  available: true,
  createdAt: "",
  updatedAt: "",

  // THE LANDMINE
  get taxRate(): number {
    throw new AppError({
      message:
        "CRITICAL ARCHITECTURE FAIL: Attempted to access 'baseTaxCode.taxRate' before hydration. " +
        "Selectors should have replaced this object before use.",
    });
  },
};
