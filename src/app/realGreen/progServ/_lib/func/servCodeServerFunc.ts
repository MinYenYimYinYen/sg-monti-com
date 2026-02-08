import {
  ServCodeCore,
  ServCodeDoc,
  ServCodeRaw,
} from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export function remapServCode(raw: ServCodeRaw): ServCodeCore {
  return {
    servCodeId: raw.id,
    isServiceCall: raw.isServiceCall,
    available: raw.available,
    longName: raw.longName,
    invoiceMessage: raw.invoiceMessage,
  };
}

export async function extendServCodes(servCodesCore: ServCodeCore[]): Promise<ServCodeDoc[]> {
  //todo: implement this and we should be good on managing servCodes
  return servCodesCore as ServCodeDoc[];
}
