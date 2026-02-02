import { Grouper } from "@/lib/Grouper";
import {
  CallAheadCore,
  CallAheadDoc,
  CallAheadDocProps,
  CallAheadRaw,
} from "@/app/realGreen/callAhead/_lib/CallAhead";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import CallAheadModel from "@/app/realGreen/callAhead/models/CallAheadModel";
import { baseCallAheadDocProps } from "@/app/realGreen/callAhead/_lib/baseCallAhead";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";

function remapCallAhead(raw: CallAheadRaw): CallAheadCore {
  return {
    available: raw.available,
    description: raw.callAheadDescription,
    type: raw.notificationType,
    callAheadId: raw.id,
  };
}

export function remapCallAheads(raw: CallAheadRaw[]) {
  return raw.map((raw) => remapCallAhead(raw));
}

export async function extendCallAheads(
  cores: CallAheadCore[],
): Promise<CallAheadDoc[]> {
  await connectToMongoDB();
  const docPropDocs: CallAheadDocProps[] = await CallAheadModel.find({
    callAheadId: { $in: cores.map((c) => c.callAheadId) },
  }).lean();
  const docProps = cleanMongoArray(docPropDocs);

  const docPropMap = new Grouper(docProps).toUniqueMap((d) => d.callAheadId);

  const docs = cores.map((c) => {
    const doc: CallAheadDoc = {
      ...(docPropMap.get(c.callAheadId) || baseCallAheadDocProps),
      ...c,
    };
    return doc;
  });
  return docs;
}
