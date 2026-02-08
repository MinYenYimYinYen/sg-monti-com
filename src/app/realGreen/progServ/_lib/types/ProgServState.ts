import { ProgCodeDoc } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";

export interface UnsavedServCodeChanges {
  original: ServCodeDoc;
  updated: ServCodeDoc;
}

export interface ProgServState {
  progCodeDocs: ProgCodeDoc[];
  servCodeDocs: ServCodeDoc[];
  progServs: ProgServ[];
  unsavedServCodeChanges: UnsavedServCodeChanges[];
}
