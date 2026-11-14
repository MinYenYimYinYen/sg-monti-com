"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useProductivity } from "@/app/productivity/useProductivity";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { productivityActions } from "@/app/productivity/productivitySlice";
import { PunchImportWidget } from "@/components/timeCardImport/PunchImportWidget";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";

const TABS: TabNavItem[] = [
  { label: "By Employee", href: "/productivity/byEmployee" },
  { label: "By Date", href: "/productivity/byDate" },
  { label: "Reliability", href: "/productivity/reliability" },
];

export default function ProductivityLayout({ children }: { children: React.ReactNode }) {
  const allows = useSelector(userCapabilitiesSelect.allows);
  // Each load is gated by the capability its route needs, so a user holding only part of what the
  // screen uses never fires a request that would be refused.
  useProductivity({
    canLoad: {
      holidays: allows(can.holidays.read),
      absences: allows(can.employeeAbsences.read),
      assignments: allows(can.serviceAssignments.read),
    },
  });

  const dispatch = useAppDispatch();
  const doneDateRange = useSelector(productivitySelect.doneDateRange);

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <>
            <DateRangePicker
              value={doneDateRange}
              onChange={(range) => dispatch(productivityActions.setDoneDateRange(range))}
              size="sm"
            />
            <PunchImportWidget />
          </>
        }
        right={<TabNav items={TABS} rootHref="/productivity/byEmployee" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
