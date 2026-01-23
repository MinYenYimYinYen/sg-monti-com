import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { CustomerDoc } from "@/app/realGreen/customer/_lib/types/entities/Customer";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/types/entities/Program";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/types/entities/Service";
import { searchScheme } from "@/app/realGreen/customer/_lib/types/searchScheme/searchSchemes";

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
