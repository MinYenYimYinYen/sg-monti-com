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

const TABS: TabNavItem[] = [
  { label: "By Employee", href: "/productivity/byEmployee" },
  { label: "By Date", href: "/productivity/byDate" },
];

export default function ProductivityLayout({ children }: { children: React.ReactNode }) {
  useProductivity();

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
