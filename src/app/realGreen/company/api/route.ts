import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CompanyContract } from "@/app/realGreen/company/api/CompanyContract";
import { CompanyRaw } from "@/app/realGreen/company/_lib/CompanyTypes";
import { remapCompany } from "@/app/realGreen/company/_lib/serverCompanyFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<CompanyContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawCompanies = await rgApi<CompanyRaw[]>({
        path: "/Company",
        method: "GET",
      });

      const companies = rawCompanies.map(remapCompany);

      return { success: true, payload: companies };
    },
  },
};

export const POST = createRpcHandler(handlers);
