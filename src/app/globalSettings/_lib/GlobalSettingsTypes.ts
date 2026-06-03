import { CoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { ContactType } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { DepositAccountMap, GenLedgerAccountEntry } from "@/app/javelin/JavelinTypes";

export type GlobalSettings = CreatedUpdated & {
  season: number;
  coverSheetsConfig: CoverSheetsConfig;
  phoneMap: Record<NotificationType, ContactType[]>;
  companyId: number;
  genLedgerAccountMap: Record<string, GenLedgerAccountEntry>;
  depositAccountMap: DepositAccountMap;
};
