"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/style/components/dropdown-menu";
import { Button } from "@/style/components/button";
import Link from "next/link";
import type { OpGate } from "@/lib/api/types/rpcUtils";
import { capabilityManagementCapabilities } from "@/app/permission/capabilityManagementCapabilities";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { isGateOpen } from "@/permission/logic/navGate";
import { Menu } from "lucide-react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { accountCapabilities } from "@/app/account/accountCapabilities";
import { formTemplateCapabilities } from "@/app/formTemplate/formTemplateCapabilities";
import { holidayCapabilities } from "@/app/holiday/holidayCapabilities";
import { inventoryCapabilities } from "@/app/inventory/inventoryCapabilities";
import { paceCapabilities } from "@/app/pace/paceCapabilities";
import { plannedTimeOffCapabilities } from "@/app/plannedTimeOff/plannedTimeOffCapabilities";
import { prepayLettersCapabilities } from "@/app/prepayLetters/prepayLettersCapabilities";
import { quickSendCapabilities } from "@/app/quickSend/quickSendCapabilities";
import { priorityServiceCapabilities } from "@/app/priorityService/priorityServiceCapabilities";
import { qboConnectionCapabilities } from "@/app/qbo/connection/qboConnectionCapabilities";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";
import { productCapabilities } from "@/app/realGreen/product/productCapabilities";
import { progServCapabilities } from "@/app/realGreen/progServ/progServCapabilities";
import { schedulingCapabilities } from "@/app/scheduling/schedulingCapabilities";
import { syncUtilsCapabilities } from "@/app/syncUtils/syncUtilsCapabilities";

// A nav entry carries the same gate as an RPC op: roles (legacy) or capability. Entries move to
// capability with their routes, and removing roles from OpGate then flags any left behind.
type NavItem = { title: string; href: string } & OpGate;

type NavSection = {
  title: string;
  navItems: NavItem[];
};

const schedulingSection: NavSection = {
  title: "Scheduling",
  navItems: [
    {
      title: "Pace",
      href: "/pace",
      capability: paceCapabilities.can.assignmentScenarios.read,
    },
    {
      title: "Priority Scheduling",
      href: "/priorityService",
      capability: priorityServiceCapabilities.can.priorityServices.read,
    },
    {
      title: "Cover Sheets",
      href: "/scheduling/coverSheets",
      capability: schedulingCapabilities.can.serviceEtas.read,
    },
    {
      title: "Prenotification",
      href: "/scheduling/prenotify",
      capability: schedulingCapabilities.can.serviceEtas.read,
    },
    {
      title: "Loadout",
      href: "/scheduling/dailyInventory",
      capability: schedulingCapabilities.can.loadouts.read,
    },
    {
      title: "Time Off Calendar",
      href: "/plannedTimeOff/calendar",
      capability: plannedTimeOffCapabilities.can.absences.read,
    },
    {
      title: "Holidays",
      href: "/holiday",
      capability: holidayCapabilities.can.holidays.read,
    },
  ],
};

const customerContactSection: NavSection = {
  title: "Customer Contact",
  navItems: [
    {
      title: "Prepay Letters",
      href: "/prepayLetters/config",
      capability: prepayLettersCapabilities.can.prepayConfigs.read,
    },
    {
      title: "QuickSend",
      href: "/quickSend",
      capability: quickSendCapabilities.can.storedTemplates.read,
    },
    {
      title: "Form Templates",
      href: "/formTemplate",
      capability: formTemplateCapabilities.can.formTemplates.read,
    },
  ],
};

const realGreenParams: NavSection = {
  title: "Real Green",
  navItems: [
    {
      title: "Products",
      href: "/realGreen/product/list",
      capability: productCapabilities.can.products.read,
    },
    {
      title: "Mix Charts",
      href: "/realGreen/product/mixChart",
      capability: productCapabilities.can.products.read,
    },
    {
      title: "Program Codes",
      href: "/realGreen/progServ/progCode",
      capability: progServCapabilities.can.progCodes.read,
    },
    {
      title: "Service Codes",
      href: "/realGreen/progServ/servCode",
      capability: progServCapabilities.can.servCodes.read,
    },
    {
      title: "Sync Utilities",
      href: "/syncUtils/customers",
      capability: syncUtilsCapabilities.can.syncStatus.read,
    },
  ],
};

const bizPlanSection: NavSection = {
  title: "Biz Plan",
  navItems: [
    { title: "Product Forecast", href: "/bizPlan/products", roles: ["admin"] },
    {
      title: "Monthly Inventory",
      href: "/inventory",
      capability: inventoryCapabilities.can.inventoryChecks.read,
    },
    {
      title: "Productivity",
      href: "/productivity",
      roles: ["admin", "office"],
    },
    {
      title: "Customer Sanity Checks",
      href: "/sanity",
      roles: ["admin", "office"],
    },
  ],
};

const quickBooksSection: NavSection = {
  title: "QuickBooks",
  navItems: [
    {
      title: "Connection",
      href: "/qbo/connection",
      capability: qboConnectionCapabilities.can.connection.read,
    },
    {
      title: "Import Credit Cards",
      href: "/qbo/importCCTxn",
      capability: importCCTxnCapabilities.can.importRows.read,
    },
    {
      title: "Account Mapping",
      href: "/account/mapping",
      capability: accountCapabilities.can.accountMappings.read,
    },
  ],
};

const permissionSection: NavSection = {
  title: "Permissions",
  navItems: [
    {
      title: "Users and Bundles",
      href: "/permission/users",
      capability: capabilityManagementCapabilities.can.userCapabilities.read,
    },
  ],
};

const menuSections = [
  schedulingSection,
  customerContactSection,
  realGreenParams,
  bizPlanSection,
  quickBooksSection,
  permissionSection,
];

export default function NavMenu() {
  const isClient = useIsClient();
  const user = useSelector(authSelect.user);
  const mine = useSelector(userCapabilitiesSelect.mine);

  if (!isClient) return null;

  const userSections = menuSections
    .map((section) => ({
      title: section.title,
      navItems: section.navItems.filter((item) =>
        isGateOpen({ gate: item, user, mine }),
      ),
    }))
    .filter((section) => section.navItems.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[600px] p-4" align="start">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userSections.map((section, idx) => (
            <div key={section.title}>
              <DropdownMenuLabel className="text-lg font-bold text-primary border-b pb-2 mb-2">
                {section.title}
              </DropdownMenuLabel>
              {section.navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="w-full cursor-pointer">
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              ))}
              {idx < userSections.length - 1 && (
                <DropdownMenuSeparator className="mt-2" />
              )}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
