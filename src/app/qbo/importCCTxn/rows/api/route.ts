import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportRowContract } from "@/app/qbo/importCCTxn/rows/api/ImportRowContract";
import { commitImport, previewImport } from "@/app/qbo/importCCTxn/_lib/importRowServer";
import {
  getImportingUserName,
  loadOpenImportRows,
  setImportRowAccount,
  setImportRowSkip,
} from "@/app/qbo/importCCTxn/_lib/importRowAccessServer";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";

const { can } = importCCTxnCapabilities;

// Nothing here talks to QuickBooks. Posting is a later phase.
const handlers: HandlerMap<ImportRowContract> = {
  // Writes nothing, but it is the first step of an import, so it needs the import write.
  previewImport: {
    capability: can.importRows.write,
    handler: async ({ rows }) => {
      return { success: true, payload: await previewImport({ rows }) };
    },
  },
  commitImport: {
    capability: can.importRows.write,
    handler: async ({ rows, fileName, duplicateRowNumbers }) => {
      const importedByUserName = await getImportingUserName();
      const payload = await commitImport({ rows, fileName, duplicateRowNumbers, importedByUserName });
      return { success: true, payload };
    },
  },
  getOpenRows: {
    capability: can.importRows.read,
    handler: async () => {
      return { success: true, payload: await loadOpenImportRows() };
    },
  },
  setRowSkip: {
    capability: can.importRows.write,
    handler: async ({ rowId, skipReason }) => {
      return { success: true, payload: await setImportRowSkip({ rowId, skipReason }) };
    },
  },
  // Choosing an account is a mapping decision, not a write to QuickBooks, so it is not the
  // posting capability.
  setRowAccount: {
    capability: can.importRows.write,
    handler: async ({ rowId, accountId }) => {
      return { success: true, payload: await setImportRowAccount({ rowId, accountId }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
