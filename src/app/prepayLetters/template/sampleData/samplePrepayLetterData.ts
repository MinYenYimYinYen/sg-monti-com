import type { PrepayLetterData } from "@/app/prepayLetters/template/PrepayLetterTypes";
import { sampleCompany } from "@/app/prepayLetters/template/sampleData/sampleCompany";
import { sampleCustomer } from "@/app/prepayLetters/template/sampleData/sampleCustomer";
import { samplePrepayConfig } from "@/app/prepayLetters/template/sampleData/samplePrepayConfig";
import { sampleUpsellProgCode } from "@/app/prepayLetters/template/sampleData/sampleUpsellProgCode";

// Type-only import of PrepayLetterData: PrepayLetterTypes does not import this file, so
// there is no cycle at runtime.
export const samplePrepayLetterData: PrepayLetterData = {
  company: sampleCompany,
  customer: sampleCustomer,
  config: samplePrepayConfig,
  isAutoRenew: true,
  upsell: sampleUpsellProgCode,
};
