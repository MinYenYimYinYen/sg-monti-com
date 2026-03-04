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
import { Role } from "@/lib/api/types/roles";
import { Menu } from "lucide-react";
import { cn } from "@/lib/tailwindUtils";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useIsClient } from "@/lib/hooks/useIsClient";

// ... (Types and Data objects remain the same) ...

type NavItem = {
  title: string;
  href: string;
  roles: Role[];
};

type NavSection = {
  title: string;
  navItems: NavItem[];
  roles: Role[];
};

const schedulingSection: NavSection = {
  title: "Scheduling",
  roles: ["admin", "office"],
  navItems: [
    {
      title: "Routing",
      href: "/scheduling/routing",
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
  ],
};

const prepaySection: NavSection = {
  title: "Prepay Letters",
  roles: ["admin", "office"],
  navItems: [
    {
      title: "Email",
      href: "/prepayLetters/email",
      roles: ["admin", "office"],
    },
    { title: "PDF", href: "/prepayLetters/pdf", roles: ["admin", "office"] },
  ],
};

const realGreenParams: NavSection = {
  title: "Real Green",
  roles: ["admin"],
  navItems: [
    { title: "Products", href: "/realGreen/product/list", roles: ["admin"] },
    {
      title: "Mix Charts",
      href: "/realGreen/product/mixChart",
      roles: ["admin", "office", "tech"],
    },
    {
      title: "Service Codes",
      href: "/realGreen/progServ/list/serviceCodes",
      roles: ["admin"],
    },
  ],
};

const bizPlanSection: NavSection = {
  title: "Biz Plan",
  roles: ["admin"],
  navItems: [
    { title: "Products", href: "/bizPlan/products", roles: ["admin"] },
  ],
};

const menuSections = [
  schedulingSection,
  prepaySection,
  realGreenParams,
  bizPlanSection,
];

export default function NavMenu() {
  const isClient = useIsClient();
  const user = useSelector(authSelect.user);
  const role = user?.role || "public";

  if (!isClient) return null;

  const userSections = menuSections
    .filter((section) => section.roles.includes(role))
    .map((section) => {
      return {
        title: section.title,
        navItems: section.navItems.filter((item) => item.roles.includes(role)),
      };
    });

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
