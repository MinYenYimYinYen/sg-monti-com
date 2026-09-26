import { NextResponse } from "next/server";
import { CustomerMirrorContract } from "@/app/realGreen/customer/mirror/CustomerMirrorContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

// TODO: Implement getMirrorCustomers handler.
//
// This route will query our synced MongoDB collections (CustomerModel, ProgramModel,
// ServiceModel) and stream back three NDJSON chunks in order:
//   1. { stepName: "customers", data: { customerDocs: [...] } }
//   2. { stepName: "programs",  data: { programDocs: [...] } }
//   3. { stepName: "services",  data: { serviceDocs: [...] } }
//
// Params are not yet defined — see CustomerMirrorContract.ts for the TODO.
// When params are ready, implement the query logic here using:
//   - CustomerModel.find({ custId: { $in: params.custIds } })
//   - ProgramModel.find({ custId: { $in: params.custIds } })
//   - ServiceModel.find({ progId: { $in: progIds } })
//
// Use createRpcHandler (not createRealGreenRpcHandler) — no RealGreen API calls here.
// Use cleanMongoArray() on all results before streaming.
// Use the NDJSON streaming pattern from the existing customer api/route.ts.

const handlers: HandlerMap<CustomerMirrorContract> = {
  getMirrorCustomers: {
    roles: ["admin", "office", "tech"],
    handler: async (_params) => {
      // TODO: Implement — params not yet defined
      return { success: true, payload: [] };
    },
  },
};

export const POST = createRpcHandler(handlers);

// Suppress unused import warning until streaming is implemented
void NextResponse;
