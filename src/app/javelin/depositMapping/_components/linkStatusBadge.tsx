import { Badge } from "@/style/components/badge";
import { AccountLinkStatus } from "@/app/account/AccountMappingTypes";

const statusDisplay: Record<
  AccountLinkStatus,
  { label: string; variant: "accent" | "primary" | "destructive"; intensity: "soft" | "ghost" }
> = {
  mapped: { label: "Mapped", variant: "accent", intensity: "soft" },
  unmapped: { label: "Unmapped", variant: "primary", intensity: "ghost" },
  unverified: { label: "Unverified", variant: "primary", intensity: "soft" },
  inactive: { label: "QBO account inactive", variant: "destructive", intensity: "soft" },
  missing: { label: "QBO account missing", variant: "destructive", intensity: "soft" },
  needsName: { label: "Needs customer", variant: "destructive", intensity: "soft" },
};

export function LinkStatusBadge({ status }: { status: AccountLinkStatus }) {
  const display = statusDisplay[status];
  return (
    <Badge variant={display.variant} intensity={display.intensity}>
      {display.label}
    </Badge>
  );
}
