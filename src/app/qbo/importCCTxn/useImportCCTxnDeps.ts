"use client";

import { useQboAccount } from "@/app/qbo/account/useQboAccount";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";

/**
 * Single orchestration point for the data the import pages need. Called once in layout.tsx;
 * panels call these hooks with autoLoad off, only to get their actions.
 */
export function useImportCCTxnDeps() {
  useQboAccount({ autoLoad: true });
  useQboVendor({ autoLoad: true });
  useImportCCTxnMapping({ autoLoad: true });
  useImportRow({ autoLoad: true });
}
