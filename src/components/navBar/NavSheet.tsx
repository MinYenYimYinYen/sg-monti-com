import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/style/components/sheet";
import { Menu } from "lucide-react";
import NavMenu from "@/components/navBar/NavMenu";

export default function NavSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Menu className={"h-6 w-6"} />
        <span className={"sr-only"}>Toggle navigation menu</span>
      </SheetTrigger>
      <SheetContent side={"left"}>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <NavMenu />
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
