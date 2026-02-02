import {
  ConditionRaw,
  ConditionCore,
  ConditionDoc,
  ConditionDocProps,
} from "@/app/realGreen/conditionCode/_types/ConditionCode";
import { ConditionDocPropsModel } from "@/app/realGreen/conditionCode/_models/ConditionDocPropsModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { Grouper } from "@/lib/Grouper";
import { baseConditionDocProps } from "./baseCondition";

function remapCondition(raw: ConditionRaw): ConditionCore {
  return {
    conditionId: raw.id,
    desc: raw.description,
    available: raw.available,
  };
}

export function remapConditions(raw: ConditionRaw[]): ConditionCore[] {
  return raw.map((r) => remapCondition(r));
}

export async function extendConditions(
  remapped: ConditionCore[],
): Promise<ConditionDoc[]> {
  await connectToMongoDB();
  const docPropDocs = await ConditionDocPropsModel.find({}).lean();
  const docProps = cleanMongoArray<ConditionDocProps>(docPropDocs);
  const docPropsMap = new Grouper(docProps).toUniqueMap((d) => d.conditionId);
  const extended: ConditionDoc[] = remapped.map((core) => {
    const { conditionId, ...docProps } =
      docPropsMap.get(core.conditionId) || baseConditionDocProps;
    return {
      ...core,
      ...docProps,
    };
  });
  return extended;
}
