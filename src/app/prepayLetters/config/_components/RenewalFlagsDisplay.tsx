"use client";

import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const FLAG_FIELDS = [
  { key: "autoRenew" as const, label: "Auto Renew" },
  { key: "dontAutoRenew" as const, label: "Don't Auto Renew" },
  { key: "confirmed" as const, label: "Confirmed" },
] as const;

export function RenewalFlagsDisplay() {
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const flagDocMap = useSelector(flagSelect.flagDocMap);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          These flags drive customer filtering for auto-renew and don&apos;t-auto-renew
          letter batches. They are configured globally and affect other modules.
        </p>
        <Link
          href="/globalSettings"
          className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
        >
          Edit in Global Settings
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {FLAG_FIELDS.map(({ key, label }) => {
          const flagId = renewalFlagIds[key];
          const flagName = flagId != null ? (flagDocMap.get(flagId)?.desc ?? `Flag #${flagId}`) : null;

          return (
            <div key={key} className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-sm text-foreground">
                {flagName ?? (
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
