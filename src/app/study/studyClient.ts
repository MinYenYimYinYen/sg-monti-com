import { api } from "@/lib/api/api";
import type { DataResponse } from "@/lib/api/types/responses";
import type { OpMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import type { StudyContract } from "@/app/study/api/StudyContract";
import type { GenerateCardsParams, GenerateCardsResult, PlanImportParams } from "@/app/study/StudyApiTypes";
import type { StudyImportDoc } from "@/app/study/StudyTypes";

const API_PATH = "/study/api";

/**
 * One request to the route. `api()` returns an operational failure as data, so it is turned into a
 * thrown AppError here: the import loop treats a thrown error as the end of the run.
 */
async function callStudyApi<TPayload>(body: OpMap<StudyContract>): Promise<TPayload> {
  const response = await api<DataResponse<TPayload>>(API_PATH, { method: "POST", body });
  if (!response.success) {
    throw new AppError({ message: response.message, type: "API_ERROR", statusCode: response.code ?? 500 });
  }
  return response.payload;
}

export function planImportViaApi(params: PlanImportParams): Promise<StudyImportDoc> {
  return callStudyApi<StudyImportDoc>({ op: "planImport", ...params });
}

export function generateCardsViaApi(params: GenerateCardsParams): Promise<GenerateCardsResult> {
  return callStudyApi<GenerateCardsResult>({ op: "generateCards", ...params });
}
