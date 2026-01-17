
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


import {Grouper} from "@/lib/Grouper";
import {CreatedUpdated} from "@/lib/mongoose/mongooseTypes";

export type RawServCode = {
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


export type RemappedServCode = {
  servCodeId: string;
  isServiceCall: boolean;
  available: boolean;
  longName: string;
  invoiceMessage: string | null;

};

export type MongoServCode = CreatedUpdated & {
  servCodeId: string;
  begin: string;
  end: string;
  alwaysAsap: boolean;
};

export type ServCode = RemappedServCode & MongoServCode;

export function remapServCode(raw: RawServCode): RemappedServCode {
  return {
    servCodeId: raw.id,
    isServiceCall: raw.isServiceCall,
    available: raw.available,
    longName: raw.longName,
    invoiceMessage: raw.invoiceMessage,
  };
}

export function extendServCode({
  remapped,
  mongo,
}: {
  remapped: RemappedServCode;
  mongo?: MongoServCode;
}): ServCode {
  return {
    ...remapped,
    createdAt: mongo?.createdAt,
    updatedAt: mongo?.updatedAt,
  } as ServCode;
}

export function extendServCodes({
  remapped,
  mongo,
}: {
  remapped: RemappedServCode[];
  mongo: MongoServCode[];
}): ServCode[] {
  const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.servCodeId);

  return remapped.map((r) =>
    extendServCode({
      remapped: r,
      mongo: mongoMap.get(r.servCodeId),
    }),
  );
}