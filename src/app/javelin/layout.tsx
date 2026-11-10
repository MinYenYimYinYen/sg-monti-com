"use client";

import { useSelector } from "react-redux";
import { CreditCard, FileSpreadsheet, Landmark, Settings2 } from "lucide-react";
import { authSelect } from "@/app/auth/authSlice";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { useJavelinDeps } from "@/app/javelin/useJavelinDeps";

const ROOT_HREF = "/javelin";

// Settings is last: it is the account mapping every entry is built from.
const TABS: readonly TabNavItem[] = [
  { label: "General Ledger", href: ROOT_HREF, icon: FileSpreadsheet },
  { label: "CC Deposits", href: "/javelin/ccDeposits", icon: CreditCard },
  { label: "CK Deposits", href: "/javelin/ckDeposits", icon: Landmark },
  { label: "Settings", href: "/javelin/settings", icon: Settings2 },
];

/** Admin only: every operation behind these pages reads or writes the live books. */
export default function JavelinLayout({ children }: { children: React.ReactNode }) {
  const role = useSelector(authSelect.role);

  if (role !== "admin") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-2xl">
          <Alert variant="destructive">
            <AlertTitle>Admins only</AlertTitle>
            <AlertDescription>Only an admin can post journal entries.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  return <JavelinShell>{children}</JavelinShell>;
}

// Separate from the gate so the deps hook is only ever called for an admin.
function JavelinShell({ children }: { children: React.ReactNode }) {
  useJavelinDeps();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold">Javelin</span>}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
