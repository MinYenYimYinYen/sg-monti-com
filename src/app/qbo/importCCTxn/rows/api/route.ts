import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportRowContract } from "@/app/qbo/importCCTxn/rows/api/ImportRowContract";
import { commitImport, previewImport } from "@/app/qbo/importCCTxn/_lib/importRowServer";
import {
  getImportingUserName,
  loadOpenImportRows,
  setImportRowSkip,
} from "@/app/qbo/importCCTxn/_lib/importRowAccessServer";

// Nothing here talks to QuickBooks. Posting is a later phase.
const handlers: HandlerMap<ImportRowContract> = {
  previewImport: {
    roles: ["office", "admin"],
    handler: async ({ rows }) => {
      return { success: true, payload: await previewImport({ rows }) };
    },
  },
  commitImport: {
    roles: ["office", "admin"],
    handler: async ({ rows, fileName, duplicateRowNumbers }) => {
      const importedByUserName = await getImportingUserName();
      const payload = await commitImport({ rows, fileName, duplicateRowNumbers, importedByUserName });
      return { success: true, payload };
    },
  },
  getOpenRows: {
    roles: ["office", "admin"],
    handler: async () => {
      return { success: true, payload: await loadOpenImportRows() };
    },
  },
  setRowSkip: {
    roles: ["office", "admin"],
    handler: async ({ rowId, skipReason }) => {
      return { success: true, payload: await setImportRowSkip({ rowId, skipReason }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
