"use client";

import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { serviceEtaActions } from "@/app/scheduling/eta/serviceEtaSlice";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { ServiceTechNotesPopover } from "@/components/ServiceTechNotesPopover";

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

  const isAsap = !!service.asapSince;
  const isPromised = service.isPromised;

  const [etaValue, setEtaValue] = useState(service.eta ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    if (!service.invoice) {
      console.error("No invoice number found on service", {
        custId: service.program.customer.custId,
        servId: service.servCodeId,
      });
      return;
    }
    dispatch(
      serviceEtaActions.saveServiceEta({
        params: {
          servId: service.servId,
          eta: { invoice: service.invoice, eta: etaValue },
        },
        config: { showLoading: false },
      }),
    )
      .unwrap()
      .then(() => setSaveStatus("success"))
      .catch(() => setSaveStatus("idle"));
  };

  const handleSuccessComplete = () => setSaveStatus("idle");

  return (
    <div className="grid grid-cols-[2rem_1fr_4rem_1.5rem_3rem_3rem_4rem_1fr_auto_auto] gap-2 items-center py-1 border-b last:border-b-0 text-sm">
      {/* Seq */}
      <span className="font-bold text-center">{service.program.tempSeq}</span>

      {/* Name + Address */}
      <span className="truncate flex flex-col leading-tight">
        <span className="font-medium truncate">{customer.displayName}</span>
        <span className="text-muted-foreground text-xs truncate">
          {address.addressLine1}, {address.city}
        </span>
      </span>

      {/* ServCode */}
      <span className="font-mono text-center">{service.servCodeId}</span>

      {/* Tech notes popover — always occupies column */}
      <span className="flex items-center justify-center">
        <ServiceTechNotesPopover service={service} />
      </span>

      {/* ASAP badge */}
      <span className="flex items-center justify-center">
        {isAsap && (
          <span className="rounded px-1 py-0.5 bg-destructive/20 text-destructive font-medium leading-none text-[10px]">
            ASAP
          </span>
        )}
      </span>

      {/* Promised badge */}
      <span className="flex items-center justify-center">
        {isPromised && (
          <span className="rounded px-1 py-0.5 bg-secondary/20 text-secondary font-medium leading-none text-[10px]">
            Prom
          </span>
        )}
      </span>

      {/* Size */}
      <span className="text-right">{service.size}</span>

      {/* CallAhead description */}
      <span className="text-muted-foreground truncate">
        {callAheadDesc ?? "—"}
      </span>

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
