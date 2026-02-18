import { CoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type GlobalSettings = CreatedUpdated & {
  season: number;
  coverSheetsConfig: CoverSheetsConfig;
}