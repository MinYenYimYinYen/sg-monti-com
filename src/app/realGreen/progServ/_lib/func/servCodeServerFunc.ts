import {
  ServCodeCore,
  ServCodeDoc,
  ServCodeRaw,
} from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import ServCodeModel from "@/app/realGreen/progServ/_lib/models/ServCodeModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { Grouper } from "@/lib/Grouper";
import { baseServCodeDocProps } from "@/app/realGreen/progServ/_lib/baseServCode";

export function remapServCode(raw: ServCodeRaw): ServCodeCore {
  return {
    servCodeId: raw.id,
    isServiceCall: raw.isServiceCall,
    available: raw.available,
    longName: raw.longName,
    invoiceMessage: raw.invoiceMessage,
  };
}

export async function extendServCodes(
  servCodesCore: ServCodeCore[],
): Promise<ServCodeDoc[]> {
  await connectToMongoDB();
  const servCodeDocPropDocs = await ServCodeModel.find().lean();
  const servCodeDocProps = cleanMongoArray(servCodeDocPropDocs);


  const docPropMap = new Grouper(servCodeDocProps).toUniqueMap(
    (sc) => sc.servCodeId,
  );

  return servCodesCore.map((core) => {
    const docProps = docPropMap.get(core.servCodeId) || baseServCodeDocProps;
    const { servCodeId, ...rest } = docProps;
    const docs = {
      ...core,
      ...rest,
    };
    return docs;
  });
}
