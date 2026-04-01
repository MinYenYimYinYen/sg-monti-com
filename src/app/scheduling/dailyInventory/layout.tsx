"use client";
import { Container } from "@/components/Containers";
import { ScrollArea } from "@/style/components/scroll-area";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";
import Link from "next/link";
import { CalendarSync } from "lucide-react";

export default function DailyInventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePrintedCustomers({ autoLoad: true });
  useRecentProduction();
  useLoadoutFormDeps();




  return (
    <Container
      variant={"fluid"}
      className="flex flex-col h-full overflow-hidden"
    >
      <div className={"flex gap-1"}>
        <Link href={"/scheduling/dailyInventory"}>
          <div className={"text-2xl font-bold"}>Daily Inventory</div>
        </Link>
      </div>
      <ScrollArea className="flex-1">{children}</ScrollArea>
    </Container>
  );
}
