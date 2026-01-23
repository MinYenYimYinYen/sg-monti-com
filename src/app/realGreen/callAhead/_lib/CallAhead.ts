import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";



export enum NotificationType {
  Text = "T",
  Manual = "U",
  Phone = "P",
  Email = "E",
}

export type RawCallAhead = {
  available: boolean;
  callAheadDescription: string;
  callDescFrench: string;
  callDescSpanish: string;
  highlight: boolean;
  id: number;
  notificationType: NotificationType;
  renewable: boolean;
};

export type RemappedCallAhead = {
  available: boolean;
  callAheadId: number;
  description: string;
  type: NotificationType;
};

export type MongoCallAhead = CreatedUpdated & {
  callAheadId: number;
};

export type CallAhead = RemappedCallAhead & MongoCallAhead;

export function remapCallAhead(raw: RawCallAhead): RemappedCallAhead {
  return {
    available: raw.available,
    description: raw.callAheadDescription,
    type: raw.notificationType,
    callAheadId: raw.id,
  };
}

export function extendCallAhead({
  remapped,
  mongo,
}: {
  remapped: RemappedCallAhead;
  mongo?: MongoCallAhead;
}): CallAhead {
  return {
    ...remapped,
    createdAt: mongo?.createdAt,
    updatedAt: mongo?.updatedAt,
  } as CallAhead;
}

export function extendCallAheads({
  remapped,
  mongo,
}: {
  remapped: RemappedCallAhead[];
  mongo: MongoCallAhead[];
}): CallAhead[] {
  const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.callAheadId);

  return remapped.map((r) =>
    extendCallAhead({
      remapped: r,
      mongo: mongoMap.get(r.callAheadId),
    }),
  );
}