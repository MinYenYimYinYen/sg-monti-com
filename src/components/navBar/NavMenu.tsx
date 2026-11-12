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
      roles: ["admin", "office", "tech"],
    },
    {
      title: "Priority Scheduling",
      href: "/priorityService",
      roles: ["admin", "office"],
    },
    {
      title: "Cover Sheets",
      href: "/scheduling/coverSheets",
      roles: ["admin", "office"],
    },
    {
      title: "Prenotification",
      href: "/scheduling/prenotify",
      roles: ["admin", "office"],
    },
    {
      title: "Loadout",
      href: "/scheduling/dailyInventory",
      roles: ["admin", "office", "tech"],
    },
    {
      title: "Time Off Calendar",
      href: "/plannedTimeOff/calendar",
      roles: ["admin", "office"],
    },
    {
      title: "Holidays",
      href: "/holiday",
      roles: ["admin"],
    },
  ],
};

const customerContactSection: NavSection = {
  title: "Customer Contact",
  navItems: [
    { title: "Prepay Letters", href: "/prepayLetters/config", roles: ["admin", "office"] },
    { title: "QuickSend", href: "/quickSend", roles: ["admin", "office"] },
    { title: "Form Templates", href: "/formTemplate", roles: ["admin", "office"] },
  ],
};

const realGreenParams: NavSection = {
  title: "Real Green",
  navItems: [
    { title: "Products", href: "/realGreen/product/list", roles: ["admin"] },
    {
      title: "Mix Charts",
      href: "/realGreen/product/mixChart",
      roles: ["admin", "office", "tech"],
    },
    {
      title: "Program Codes",
      href: "/realGreen/progServ/progCode",
      roles: ["admin"],
    },
    {
      title: "Service Codes",
      href: "/realGreen/progServ/servCode",
      roles: ["admin"],
    },
    { title: "Sync Utilities", href: "/syncUtils/customers", roles: ["admin"] },
  ],
};

const bizPlanSection: NavSection = {
  title: "Biz Plan",
  navItems: [
    { title: "Product Forecast", href: "/bizPlan/products", roles: ["admin"] },
    { title: "Monthly Inventory", href: "/inventory", roles: ["admin"] },
    { title: "Productivity", href: "/productivity", roles: ["admin", "office"] },
    { title: "Customer Sanity Checks", href: "/sanity", roles: ["admin", "office"] },
  ],
};

const quickBooksSection: NavSection = {
  title: "QuickBooks",
  navItems: [
    { title: "Connection", href: "/qbo/connection", roles: ["admin"] },
    { title: "Import Credit Cards", href: "/qbo/importCCTxn", roles: ["admin", "office"] },
    { title: "Account Mapping", href: "/account/mapping", roles: ["admin"] },
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
      navItems: section.navItems.filter((item) => isGateOpen({ gate: item, user, mine })),
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
