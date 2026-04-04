"use client";

import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralDocPropsActions } from "@/app/csv/_lib/centralDocPropsSlice";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { SaveButton, SaveStatus } from "@/components/SaveButton";

type EtaServiceRowProps = {
  service: Service;
};

export function EtaServiceRow({ service }: EtaServiceRowProps) {
  const dispatch = useAppDispatch();
  const customer = service.x.customer;
  const address = customer.address;

  const callAheadDesc =
    service.callAhead?.description ??
    service.program.callAhead?.description ??
    service.program.customer.callAhead?.description ??
    null;

  const hasEta =
    service.callAhead?.hasEta ||
    service.program.callAhead?.hasEta ||
    service.program.customer.callAhead?.hasEta ||
    false;

  const [etaValue, setEtaValue] = useState(service.eta ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    dispatch(
      centralDocPropsActions.saveEta({
        params: { servId: service.servId, eta: etaValue || null },
        config: { showLoading: false },
      }),
    )
      .unwrap()
      .then(() => setSaveStatus("success"))
      .catch(() => setSaveStatus("idle"));
  };

  const handleSuccessComplete = () => setSaveStatus("idle");

  return (
    <div className="grid grid-cols-[2rem_1fr_4rem_4rem_1fr_auto_auto] gap-2 items-center py-1 border-b last:border-b-0 text-sm">
      {/* Seq */}
      <span className="font-bold text-center">{service.program.tempSeq}</span>

      {/* Address */}
      <span className="truncate">
        {address.addressLine1}, {address.city}
      </span>

      {/* ServCode */}
      <span className="font-mono text-center">{service.servCodeId}</span>

      {/* Size */}
      <span className="text-right">{service.size}</span>

      {/* CallAhead description */}
      <span className="text-muted-foreground truncate">{callAheadDesc ?? "—"}</span>

      {/* ETA input */}
      {hasEta ? (
        <input
          value={etaValue}
          onChange={(e) => setEtaValue(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-card w-28"
        />
      ) : (
        <span className="text-muted-foreground text-center w-28">—</span>
      )}

      {/* Save button */}
      {hasEta ? (
        <SaveButton
          status={saveStatus}
          onClick={handleSave}
          onSuccessComplete={handleSuccessComplete}
          variant="primary"
          intensity="soft"
          size="sm"
        >
          Save
        </SaveButton>
      ) : (
        <span className="w-16" />
      )}
    </div>
  );
}
