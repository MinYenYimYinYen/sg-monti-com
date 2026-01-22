import { ApiContract } from "@/lib/api/types/ApiContract";
import { ArrayResponse } from "@/lib/api/types/responses";
import { CustomerWithMongo } from "@/app/realGreen/customer/_lib/types/Customer";
import { ProgramWithMongo } from "@/app/realGreen/customer/_lib/types/Program";
import { ServiceWithMongo } from "@/app/realGreen/customer/_lib/types/Service";
import { searchScheme } from "@/app/realGreen/customer/_lib/searchSchemes/searchSchemes";

export type StreamChunkData = {
  dryCustomers: CustomerWithMongo[];
  dryPrograms: ProgramWithMongo[];
  dryServices: ServiceWithMongo[];
};

export type StreamChunk = {
  stepName: string;
  // data: CustomerWithMongo[] | ProgramWithMongo[] | ServiceWithMongo[];
  data: Partial<StreamChunkData>;
  metrics?: {
    calls: number;
    durationMs: number;
  };
};

export interface CustomerContract extends ApiContract {
  runSearchScheme: {
    params: { schemeName: keyof typeof searchScheme };
    result: ArrayResponse<StreamChunk>; // In streaming, this represents the chunk structure
  };
}
