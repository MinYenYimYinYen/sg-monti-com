import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";
import { mongo } from "mongoose";
import {
  baseNumId,
  baseStrId,
  realGreenConst,
} from "@/app/realGreen/_lib/realGreenConst";

export type ProgramRaw = {
  averagePrice: number;
  // averageTime: number | null;
  billingType: string;
  callAhead: number | null;
  // callBackDate: string | null;
  // cancelCode: number | null;
  // cancelDate: string | null;
  // canceledBy: string;
  // confirmationDate: string | null;
  // confirmedBy: string;
  // contactDate: string | null;
  // contractId: number | null;
  // created: string;
  // customerLetterId: number | null;
  // customerNote: string;
  // customerNoteExpiration: string | null;
  customerNumber: number;
  dateSold: string;
  // dayCode: string;
  // difficulty: number;
  discountCodeId: string;
  // doneToDate: number;
  // endOn: string | null;
  // estimateAssignedDate: string | null;
  // estimateAssignedTo: string;
  // estimatedBy: string;
  // estimateGivenDate: string | null;
  // estimatePrintDate: string | null;
  // estimateReferredBy: number | null;
  // estimateRequestDate: string | null;
  // estimateRequestedBy: string;
  // estimateRequestTakenBy: string;
  // holdBeginDate: string | null;
  // holdCode: number | null;
  // holdDate: string | null;
  id: number;
  // includeInConfirmationLetter: boolean;
  // isAutoRenew: boolean;
  // isComplete: boolean;
  isFullProgram: boolean;
  // isNonServiceYear: boolean;
  // isProgram: boolean;
  // isRenewed: boolean;
  // isWorkOrder: boolean;
  lastPriceChange: string | null;
  // latestDependentServiceCompletionDate: string | null;
  // lockSchedule: boolean;
  // maximumRepetitions: number | null;
  nextDate: string | null;
  // numberOfServices: number | null;
  // paymentPlanByEmployee: string;
  // paymentPlanDate: string | null;
  price: number;
  programCode: string;
  programCodeId: number | null;
  // programDescription: string | null;
  // purchaseOrderNumber: string;
  // rejectionCode: number | null;
  // rejectionDate: string | null;
  // repeat: string | null;
  // repeatBy: string;
  // repeatEvery: number | null;
  // route: string;
  season: number;
  // sequence: number;
  // size: number;
  soldby1: string;
  soldby2: string;
  sourceCode: number;
  // standardPrice: number;
  // startYear: number | null;
  status: string;
  technicianNote: string;
  // technicianNoteExpiration: string | null;
  // temporaryDayCode: string;
  // temporaryRoute: string;
  temporarySequence: number;
  // updated: string;
  // workOrderPricing: number;
  // year: number | null;
};

export type ProgramCore = {
  avgPrice: number;
  billingType: string;
  callAheadId: number;
  custId: number;
  dateSold: string;
  discountId: string;
  progId: number;
  isFullProgram: boolean;
  lastPriceChange: string;
  nextDate: string;
  price: number;
  progDefId: number;
  season: number;
  soldBy: string[];
  sourceCodeId: number;
  status: string;
  techNote: string;
  tempSeq: number;
};

export type ProgramDocProps = CreatedUpdated & {
  progId: number;
};

export type ProgramDoc = ProgramCore & ProgramDocProps;

export type ProgramProps = {};

export type Program = ProgramDoc & ProgramProps;

function remapProgram(raw: ProgramRaw): ProgramCore {
  return {
    avgPrice: raw.averagePrice,
    billingType: raw.billingType,
    callAheadId: raw.callAhead || baseNumId,
    custId: raw.customerNumber,
    dateSold: raw.dateSold,
    discountId: raw.discountCodeId,
    progId: raw.id,
    isFullProgram: raw.isFullProgram,
    lastPriceChange: raw.lastPriceChange || "",
    nextDate: raw.nextDate || "",
    price: raw.price,
    progDefId: raw.programCodeId || baseNumId,
    season: raw.season,
    soldBy: [raw.soldby1, raw.soldby2].filter(Boolean) as string[],
    sourceCodeId: raw.sourceCode,
    status: raw.status,
    techNote: raw.technicianNote,
    tempSeq: raw.temporarySequence,
  };
}

export function remapPrograms(raw: ProgramRaw[]) {
  return raw.map((r) => remapProgram(r));
}

// async function extendProgram(remapped: ProgramCore): Promise<Program> {
//   // This is mocking the extension.  But when it is time to extend,
//   // we can put how to extend here, or more likely remove this function,
//   // and put that logic below.
//   return {
//     ...remapped,
//     createdAt: "",
//     updatedAt: "",
//   };
// }

export async function extendPrograms(
  remapped: ProgramCore[],
): Promise<ProgramDoc[]> {
  const withMongo = remapped.map((prog) => ({
    ...prog,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}


// export function extendPrograms({
//   remapped,
//   mongo,
// }: {
//   remapped: ProgramCore[];
//   mongo: ProgramDoc[];
// }): Program[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.progId);
//
//   return remapped.map((r) =>
//     extendProgram({
//       remapped: r,
//       mongo: mongoMap.get(r.progId),
//     }),
//   );
// }
