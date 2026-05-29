import { ReactNode } from "react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overscroll-none">
      {children}
    </div>
  );
}
