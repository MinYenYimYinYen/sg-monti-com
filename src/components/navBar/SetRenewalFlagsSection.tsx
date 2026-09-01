"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { RenewalFlagIds } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { Label } from "@/style/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";

const RENEWAL_FLAG_FIELDS: { key: keyof RenewalFlagIds; label: string }[] = [
  { key: "autoRenew", label: "Auto Renew" },
  { key: "dontAutoRenew", label: "Don't Auto Renew" },
  { key: "confirmed", label: "Confirmed" },
];

const NONE_VALUE = "none";

export function SetRenewalFlagsSection() {
  const dispatch = useAppDispatch();
  const flagDocs = useSelector(flagSelect.flagDocs);
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const currentSettings = useSelector(globalSettingsSelect.settings);

  const sortedFlagDocs = [...flagDocs].sort((a, b) => a.desc.localeCompare(b.desc));

  function handleChange(key: keyof RenewalFlagIds, value: string) {
    if (!currentSettings) return;

    const newId = value === NONE_VALUE ? null : Number(value);
    const updatedRenewalFlagIds: RenewalFlagIds = { ...renewalFlagIds, [key]: newId };

    // Optimistic update
    dispatch(
      globalSettingsActions.setSettings({
        ...currentSettings,
        renewalFlagIds: updatedRenewalFlagIds,
      }),
    );

    // Persist to DB
    dispatch(
      globalSettingsActions.updateSettings({
        params: { renewalFlagIds: updatedRenewalFlagIds },
        config: { showLoading: false },
      }),
    );
  }

  return (
    <div className="p-2 w-56">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
        Set Renewal Flags
      </span>
      <div className="space-y-3">
        {RENEWAL_FLAG_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select
              variant="shadcnDefault"
              value={renewalFlagIds[key]?.toString() ?? NONE_VALUE}
              onValueChange={(value) => handleChange(key, value)}
            >
              <SelectTrigger variant="shadcnDefault" className="h-8 text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  <span className="text-muted-foreground italic">None</span>
                </SelectItem>
                {sortedFlagDocs.map((flag) => (
                  <SelectItem key={flag.flagId} value={flag.flagId.toString()}>
                    {flag.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
