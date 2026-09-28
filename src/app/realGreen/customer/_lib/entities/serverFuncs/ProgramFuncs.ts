import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { ProgramCore, ProgramDoc, ProgramRaw } from "../types/ProgramTypes";
// ProgramDoc = ProgramCore — no DocProps extension needed

function remapProgram(raw: ProgramRaw): ProgramCore {
  return {
    avgPrice: raw.averagePrice,
    billingType: raw.billingType,
    callAheadId: raw.callAhead || baseNumId,
    custId: raw.customerNumber,
    dateSold: raw.dateSold ?? "",
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
    tempSeq: raw.temporarySequence / 10,
    holdCodeId: raw.holdCode,
    holdStart: raw.holdBeginDate ? raw.holdBeginDate.split("T")[0] : null,
    holdEnd: raw.holdDate ? raw.holdDate.split("T")[0] : null,
    avgTime: raw.averageTime,
    cancelCodeId: raw.cancelCode,
    cancelDate: raw.cancelDate ? raw.cancelDate.split("T")[0] : null,
    canceledBy: raw.canceledBy,
    custNote: raw.customerNote,
    custNoteExpiration: raw.customerNoteExpiration ? raw.customerNoteExpiration.split("T")[0] : null,
    dayCodeId: raw.dayCode,
    difficulty: raw.difficulty,
    isProgram: raw.isProgram,
    isRenewed: raw.isRenewed,
  };
}

export function remapPrograms(raw: ProgramRaw[]) {
  return raw.map((r) => remapProgram(r));
}
export function extendPrograms(remapped: ProgramCore[]): ProgramDoc[] {
  return remapped;
}
