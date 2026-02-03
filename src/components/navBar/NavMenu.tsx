import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuItem,
} from "@/style/components/navigation-menu";
import Link from "next/link";
import { Role } from "@/lib/api/types/roles";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

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

const menuSections = [schedulingSection, prepaySection];

export default function NavMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          {/* 1. Single Trigger Icon */}
          <NavigationMenuTrigger>
            <Menu className="h-4 w-4 mr-2" />
            <span className="sr-only">Open Menu</span>
          </NavigationMenuTrigger>

          {/* 2. Content Wrapper */}
          <NavigationMenuContent className={""}>
            {/* THE KEY CHANGE:
                grid-cols-2 -> Places sections side-by-side
                w-[600px]   -> Makes the menu wide enough to fit them
            */}
            <div className={"grid grid-cols-1 md:grid-cols-2 w-[600px] gap-4"}>
              {menuSections.map((section) => (
                <div key={section.title} className="flex flex-col space-y-3">
                  {/* Section Title */}
                  <div className="font-bold text-lg leading-none mb-1 text-primary border-b pb-2">
                    {section.title}
                  </div>

                  {/* Links for this column */}
                  <ul className="grid gap-2">
                    {section.navItems.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "block select-none rounded-md p-1 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                            )}
                          >
                            <div className="text-sm font-medium leading-none mb-1">
                              {item.title}
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
