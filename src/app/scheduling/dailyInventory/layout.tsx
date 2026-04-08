"use client";
import { Container } from "@/components/Containers";
import { ScrollArea } from "@/style/components/scroll-area";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function DailyInventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  const pathname = usePathname();
  const isRoot = pathname === "/scheduling/dailyInventory";

  return (
    <Container
      variant={"fluid"}
      className="flex flex-col h-full overflow-hidden"
    >
      <div className={"flex gap-1"}>
        {isRoot ? (
          <div className={"text-xl font-bold"}>Daily Inventory</div>
        ) : (
          <Link href={"/scheduling/dailyInventory"}>
            <div className={"flex items-center gap-1"}>
              <ArrowLeft />
              <div className={"text-xl font-bold"}>Daily Inventory</div>
            </div>
          </Link>
        )}
      </div>
      <ScrollArea className="flex-1">{children}</ScrollArea>
    </Container>
  );
}
