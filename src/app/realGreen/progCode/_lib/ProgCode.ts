import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";
import { ServCode } from "../../servCode/ServCode";

export type RawProgramCode = {
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

export type RemappedProgramCode = {
  progCodeId: string;
  available: boolean;
  description: string;
  programType: string | null; // todo: I should make an enum for this
  progDefId: number;
  unitCode: number;


};

// export type MongoProgramCode = CreatedUpdated & {
//   progCodeId: string;
// };

export type ProgCode = RemappedProgramCode & {
  servCodes?: ServCode[];

} // & MongoProgramCode;

export function remapProgramCode(raw: RawProgramCode): RemappedProgramCode {
  return {
    progCodeId: raw.programCode,
    available: raw.available,
    description: raw.description,
    programType: raw.programType,
    progDefId: raw.programDefinitionID,
    unitCode: raw.unitCode || -1,
  };
}

// export function extendProgramCode({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedProgramCode;
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
//   remapped: RemappedProgramCode[];
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