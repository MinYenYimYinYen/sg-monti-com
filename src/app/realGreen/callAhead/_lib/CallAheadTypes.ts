import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export enum NotificationType {
  Text = "T",
  Manual = "U",
  Phone = "P",
  Email = "E",
}

export type CallAheadRaw = {
  available: boolean;
  callAheadDescription: string;
  callDescFrench: string;
  callDescSpanish: string;
  highlight: boolean;
  id: number;
  notificationType: NotificationType;
  renewable: boolean;
};

export type CallAheadCore = {
  available: boolean;
  callAheadId: number;
  description: string;
  type: NotificationType;
};

export type CallAheadDocProps = CreatedUpdated & {
  callAheadId: number;
  keywordIds: string[];
};

export type CallAheadDoc = CallAheadCore & CallAheadDocProps;

export type CallAheadProps = {};

export type CallAhead = CallAheadDoc & CallAheadProps;


