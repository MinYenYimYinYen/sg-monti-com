import {
  ProgCodeDoc,
  ProgCodeDocProps,
  ProgCodeRaw,
  ProgCodeRemapped,
} from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { ProgCodeDocPropsModel } from "../../_models/ProgCodeDocPropsModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { Grouper } from "@/lib/Grouper";
import { baseProgCodeDocProps } from "../baseProgCode";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

export function remapProgramCode(raw: ProgCodeRaw): ProgCodeRemapped {
  return {
    progCodeId: raw.programCode,
    available: raw.available,
    description: raw.description,
    programType: raw.programType,
    progDefId: raw.programDefinitionID,
    unitCode: raw.unitCode || baseNumId,
  };
}

export function remapProgCodes(raw: ProgCodeRaw[]): ProgCodeRemapped[] {
  return raw.map(remapProgramCode);
}

export async function extendProgCodes(
  remapped: ProgCodeRemapped[],
): Promise<ProgCodeDoc[]> {
  await connectToMongoDB();
  const docPropDocs = await ProgCodeDocPropsModel.find({}).lean();
  const docProps: ProgCodeDocProps[] =
    cleanMongoArray<ProgCodeDocProps>(docPropDocs);
  const docPropsMap = new Grouper(docProps).toUniqueMap((d) => d.progCodeId);
  const extended: ProgCodeDoc[] = remapped.map((core) => {
    const { progCodeId, ...docProps } =
      docPropsMap.get(core.progCodeId) || baseProgCodeDocProps;
    const progCodeDoc: ProgCodeDoc = {
      ...core,
      ...docProps,
    };
    return progCodeDoc;
  });
  return extended;
}
