import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { ContactType } from "@/app/realGreen/_lib/subTypes/PhoneRaw";

export enum NotificationType {
  Text = "Text",
  Manual = "Manual",
  Phone = "Phone",
  Email = "Email",
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
  notificationTypes: NotificationType[];
};

export type CallAheadDoc = CallAheadCore & CallAheadDocProps;

export type CallAheadProps = {
  contactTypes: ContactType[];
  keywordMessage: string;
};

export type CallAhead = CallAheadDoc & CallAheadProps;
