"use client";

import { useQboAccount } from "@/app/qbo/account/useQboAccount";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";

/**
 * Single orchestration point for the data the QuickBooks test tabs display.
 * Called once in layout.tsx. Sub-route pages never call these hooks with autoLoad again.
 * Add each entity's hook here as its tab is built.
 */
export function useQboTestDeps() {
  useQboAccount({ autoLoad: true });
  useQboVendor({ autoLoad: true });
}
