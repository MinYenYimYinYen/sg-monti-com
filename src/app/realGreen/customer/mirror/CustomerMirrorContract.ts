import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { StreamChunk } from "@/app/realGreen/customer/api/CustomerContract";

export interface CustomerMirrorContract extends ApiContract {
  /**
   * Fetches customer, program, and service docs from our synced MongoDB collections
   * (the "mirror" of RealGreen data) and streams them back as NDJSON chunks.
   *
   * Streams three chunks in order: customers → programs → services.
   * Each chunk uses the same StreamChunk shape as the existing RealGreen pipeline,
   * so the receiving slice's receiveChunk reducer works unchanged.
   *
   * Params are not yet implemented — query shape will be designed when the
   * corrupted records investigation UI is built.
   *
   * TODO: Define params (e.g., custIds, season filter)
   */
  getMirrorCustomers: {
    params: Record<string, never>;
    result: DataResponse<StreamChunk[]>;
  };
}
