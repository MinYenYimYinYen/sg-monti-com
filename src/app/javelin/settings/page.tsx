"use client";

import { AccountMappingPanel } from "@/app/account/_components/AccountMappingPanel";

// The account mapping is the one source of truth for every QuickBooks link in the app, so
// Javelin shows that same panel instead of keeping a copy.
export default function JavelinSettingsPage() {
  return <AccountMappingPanel />;
}
