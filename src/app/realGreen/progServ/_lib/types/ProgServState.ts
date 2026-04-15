import { ProgCodeDoc, ProgCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeDoc, ServCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";

export interface UnsavedServCodeChanges {
  original: ServCodeDocProps;
  updated: ServCodeDocProps;
}

export interface UnsavedProgCodeChanges {
  original: ProgCodeDocProps;
  updated: ProgCodeDocProps;
}

export interface ProgServState {
  progCodeDocs: ProgCodeDoc[];
  servCodeDocs: ServCodeDoc[];
  progServs: ProgServ[];
  unsavedServCodeChanges: UnsavedServCodeChanges[];
  unsavedProgCodeChanges: UnsavedProgCodeChanges[];
}
