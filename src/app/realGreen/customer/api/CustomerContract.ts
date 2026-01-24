import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { searchScheme } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchSchemes";
import { CustomerDoc } from "../_lib/entities/types/CustomerTypes";
import { ProgramDoc } from "../_lib/entities/types/ProgramTypes";
import { ServiceDoc } from "../_lib/entities/types/ServiceTypes";

export type StreamChunkData = {
  customerDocs: CustomerDoc[];
  programDocs: ProgramDoc[];
  serviceDocs: ServiceDoc[];
};

export type StreamChunk = {
  stepName: string;
  // data: CustomerDoc[] | ProgramDoc[] | ServiceDoc[];
  data: Partial<StreamChunkData>;
  metrics?: {
    calls: number;
    durationMs: number;
    cumulativeRecords: number;
  };
};

export interface CustomerContract extends ApiContract {
  runSearchScheme: {
    params: { schemeName: keyof typeof searchScheme };
    result: DataResponse<StreamChunk[]>; // In streaming, this represents the chunk structure
  };
}
