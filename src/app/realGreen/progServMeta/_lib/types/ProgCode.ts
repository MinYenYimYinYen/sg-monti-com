import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";
import { ServCode } from "./ServCode";

export type ProgCodeRaw = {
  // anyBranch: boolean;
  // autoRenew: boolean;
  available: boolean;
  // availableCompanies: number[] | null;
  // billingType: string | null;
  // branchIDs: number[] | null;
  // budgetId: number | null;
  // canBeServiceCall: boolean;
  description: string;
  // descriptions: TranslateableString | null;
  // dontPrintInvoice: boolean;
  // endOn: string | null;
  // estimateServiceCode: string | null;
  // hasAutoRenewDate: boolean;
  // hasPriceChart: boolean;
  // hasSentriconInstallationInitialService: boolean;
  // htmlBackgroundColor: string | null;
  // htmlForegroundColor: string | null;
  // includeConfirmationLetter: boolean;
  // includeInConfirmationLetter: boolean;
  // initialServiceCode: string | null;
  // isAutoRenew: boolean;
  // isCancelDateRequired: boolean;
  // isCancelReasonRequired: boolean;
  // isEstimatedByRequired: boolean;
  // isMobile: boolean;
  // isNonServiceYear: boolean;
  // isRejectReasonRequired: boolean;
  // isRouteRequired: boolean;
  // isSentriconInstallationService: boolean;
  // isSentriconMonitoringService: boolean;
  // isSentriconRemovalService: boolean;
  // isSizeRequired: boolean;
  // isSoldByRequired: boolean;
  // isSoldDateRequired: boolean;
  // isSourceRequired: boolean;
  // isWebAvailable: boolean;
  // isWorkOrder: boolean;
  // lockSchedule: boolean;
  // lockSoldCancelDate: boolean;
  // max: number | null;
  // maximumRepetitions: number | null;
  // minimumRoundForCAW: number | null;
  // minimumRoundForFullProgram: number | null;
  priceID: number | null;
  programCode: string;
  // programCodeIsSpecial: boolean;
  programDefinitionID: number;
  // programJobTypes: string[] | null;
  // programPriceTable?: IProgramPriceTable; //not provided by realGreen API
  // programSpecial: string | null;
  // programSpecification: string | null;
  programType: string | null;
  // repeat: string | null;
  // repeatBy: string | null;
  // repeatEvery: number | null;
  // serviceCategory: number | null;
  // serviceCodes: IServCode[];
  unitCode: number | null;
  // unitOfMeasure: UnitOfMeasure | null;
  // unitOfMeasureId: number | null;
};

export type ProgCodeRemapped = {
  progCodeId: string;
  available: boolean;
  description: string;
  programType: string | null;
  progDefId: number;
  unitCode: number;


};

export type ProgCodeMongo = CreatedUpdated & {
  progCodeId: string;
};

export type ProgCodeWithMongo = ProgCodeRemapped & ProgCodeMongo;

export type ProgCodeHydrate = {
  servCodes: ServCode[];
  isSpecial: boolean;
}

export type ProgCode = ProgCodeWithMongo & ProgCodeHydrate;

function remapProgramCode(raw: ProgCodeRaw): ProgCodeRemapped {
  return {
    progCodeId: raw.programCode,
    available: raw.available,
    description: raw.description,
    programType: raw.programType,
    progDefId: raw.programDefinitionID,
    unitCode: raw.unitCode || -1,
  };
}

export function remapProgCodes (raw: ProgCodeRaw[]): ProgCodeRemapped[] {
  return raw.map(remapProgramCode);
}

// export function extendProgramCode({
//   remapped,
//   mongo,
// }: {
//   remapped: ProgCodeRemapped;
//   mongo?: MongoProgramCode;
// }): ProgCode {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt,
//     updatedAt: mongo?.updatedAt,
//   } as ProgCode;
// }
//
// export function extendProgramCodes({
//   remapped,
//   mongo,
// }: {
//   remapped: ProgCodeRemapped[];
//   mongo: MongoProgramCode[];
// }): ProgCode[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.progCodeId);
//
//   return remapped.map((r) =>
//     extendProgramCode({
//       remapped: r,
//       mongo: mongoMap.get(r.progCodeId),
//     }),
//   );
// }