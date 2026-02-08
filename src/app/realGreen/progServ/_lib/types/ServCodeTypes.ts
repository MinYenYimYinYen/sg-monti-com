// type ProductionParams = {
//   canChangeProductionPrice: boolean;
//   canChangeProductionSize: boolean;
//   canEnterConditionCodes: boolean;
//   canEnterCrew: boolean;
//   canEnterEndTime: boolean;
//   canEnterPH: boolean;
//   canEnterRating: boolean;
//   canEnterStartTime: boolean;
//   canEnterTemperature: boolean;
//   canEnterWind: boolean;
//   canSaveAssociatedConditionCodes: boolean;
//   canUseProducts: boolean;
//   noScheduleDate: boolean;
//   preNotify: boolean;
// };

import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { baseProgCode } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCodeProductDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeProduct";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type ServCodeRaw = {
  // autopostMobile: boolean;
  available: boolean;
  // basePrice: number | null;
  // branchIDs: number[] | null;
  // branchIDsInUse: number[] | null;
  // branchPrices: { [key: string]: number | null } | null;
  // callAhead: number | null;
  // canBeProgramRound: boolean;
  // canBeSpecialJob: boolean;
  // canChangeProductionPrice: boolean;
  // canEnterConditionCodes: boolean;
  // canEnterEndTime: boolean;
  // canEnterPh: boolean;
  // canEnterRating: boolean;
  // canEnterSize: boolean;
  // canEnterStartTime: boolean;
  // canEnterTemperature: boolean;
  // canEnterWind: boolean;
  // canSaveAssociatedConditionCodes?: boolean;
  // canUseProducts: boolean;
  // discountAccountComId: string | null;
  // discountAccountResId: string | null;
  // doNotDefaultStartDate: boolean;
  // estimatedManHours: number | null;
  // hexBackcolor: string | null;
  // hexForecolor: string | null;
  // htmlBackcolor: string | null;
  id: string;
  // ignoreCreditHold: boolean;
  invoiceMessage: string | null;
  // invoiceMessageShort: string | null;
  // isAnyBranch: boolean;
  // isEstimate: boolean;
  // isPesticideUsed: boolean;
  // isProgramService: boolean;
  isServiceCall: boolean;
  // isSpecial: boolean;
  // isWorkOrder: boolean;
  // letterID: number | null;
  longName: string;
  // manHourRate: number | null;
  // maximumDays: number | null;
  // maximumTemperature: number | null;
  // maximumWind: number | null;
  // minimumDays: number | null;
  // minimumTemperature: number | null;
  // name: string | null;
  // noScheduleDate?: boolean;
  // preNotify: boolean;
  // prepayAccountComId: string | null;
  // prepayAccountResId: string | null;
  // priceBy: number;
  // priceID: number | null;
  // productionParams: ProductionParams;
  // programCode: ProgramCode;
  // programType: string | null;
  // quickFitTimeWindow: number | null;
  // roundQuickFit: boolean;
  // sentriconServiceType: number | null;
  // sentriconServiceTypeCount: number | null;
  // standardAccountComDescription: string | null;
  // standardAccountComId: string | null;
  // standardAccountResDescription: string | null;
  // standardAccountResId: string | null;
  // startDate: string | null;
  // surchargeAccountComId: string | null;
  // surchargeAccountResId: string | null;
  // technicianNote: string | null;
};

export type ServCodeCore = {
  servCodeId: string;
  isServiceCall: boolean;
  available: boolean;
  longName: string;
  invoiceMessage: string | null;
};

export type ServCodeDocProps = CreatedUpdated & {
  servCodeId: string;
  dateRange: TRange<string>;

  alwaysAsap: boolean;
  productDocs: ServCodeProductDoc[];
};

export type ServCodeDoc = ServCodeCore & ServCodeDocProps;

export type ServCodeProps = {
  progCode: ProgCode;
  progCodeId: string;
  services: Service[];
  isSpecial: boolean;
};

export type ServCode = ServCodeDoc & ServCodeProps;

export const baseServCode: ServCode = {
  servCodeId: baseStrId,
  progCodeId: baseStrId,
  isServiceCall: false,
  available: true,
  longName: "",
  invoiceMessage: "",
  alwaysAsap: false,
  dateRange: { min: "", max: "" },
  progCode: baseProgCode,
  services: [],
  createdAt: "",
  updatedAt: "",
  productDocs: [],
  isSpecial: false,
};
