"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { Container } from "@/components/Containers";
import { Button } from "@/style/components/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/style/components/card";
import { format, parseISO, isValid } from "date-fns";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ScrollArea } from "@/style/components/scroll-area";
import { usePriorityService } from "@/app/priorityService/usePriorityService";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { singleCustSelect } from "@/app/realGreen/customer/selectors/singleCustSelect";
import { useSingleCustomer } from "@/app/realGreen/customer/hooks/useSingleCustomer";
import { PriorityServiceForm } from "@/app/priorityService/_components/PriorityServiceForm";
import { PriorityServiceListItem } from "@/app/priorityService/_components/PriorityServiceListItem";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { usePriorityServiceCustomers } from "@/app/realGreen/customer/hooks/usePriorityServiceCustomers";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { CustomerQueryBuilder } from "@/app/realGreen/customer/mirror/CustomerQueryBuilder";

// ---------------------------------------------------------------------------
// Single-customer lookup plan for the "New Entry" form.
//
// Seeds from custId (injected by useSingleCustomer at call time) and walks
// down to programs and services for the current season. Season is injected
// here because the form needs to show only current-season services.
// ---------------------------------------------------------------------------

function buildSingleCustomerPlan(season: number) {
  return new CustomerQueryBuilder()
    .addCustomerStep(["entity", "provider"], {
      stepName: "getCustomer",
      source: "values",
      filters: [] as [],  // custId injected by useSingleCustomer
      provides: { custId: true },
    })
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getCustomer",
      joinKey: "custId",
      filters: [{ field: "season", operator: "eq", value: season }],
      provides: { progId: true },
    })
    .addServiceStep(["entity"], {
      stepName: "getServices",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "progId",
      filters: [{ field: "season", operator: "eq", value: season }],
    })
    .build();
}

// ---------------------------------------------------------------------------
// PriorityServicePage
// ---------------------------------------------------------------------------

export default function PriorityServicePage() {
  const { loadByServIds: loadPriorityServiceCustomers } = usePriorityServiceCustomers();

  // Load priority service docs
  usePriorityService({ autoLoad: true });

  // "priorityService" context handles the list hydration only.
  // The form's customer lookup uses the "single" context independently.
  useCustomerContext({ contexts: ["priorityService"] });

  // ProgServ needed to resolve servCode names in the form dropdowns
  useProgServ({ autoLoad: true });

  // Global settings needed for the single-customer plan (season)
  useGlobalSettings({ autoLoad: true });

  const docs = useSelector(priorityServiceSelect.docs);
  const priorityServiceMap = useSelector(priorityServiceSelect.priorityServiceMap);
  const season = useSelector(globalSettingsSelect.season);

  // lookupCustomer reads from state.customer.single (not central), so it never
  // conflicts with the priorityService list context.
  const lookupCustomer = useSelector(singleCustSelect.customer);

  // Build the single-customer plan once season is available.
  // React Compiler handles memoization — no useMemo needed.
  const singleCustomerPlan = season ? buildSingleCustomerPlan(season) : null;

  const { clearCustomer } = useSingleCustomer({
    queryPlan: singleCustomerPlan ?? [],
  });

  // Load the full customer/program/service data for each priority service doc
  // into the "priorityService" customer context so the CRUD list can hydrate.
  // Guard with a ref so this only fires once on mount (or when season first
  // becomes available) — not on every doc change after a CRUD operation.
  const initialLoadFired = useRef(false);
  useEffect(() => {
    if (!docs.length || !season) return;
    if (initialLoadFired.current) return;
    initialLoadFired.current = true;
    loadPriorityServiceCustomers(
      docs.map((d) => d.servId),
      { loadingMsg: "Loading priority services..." },
    );
  }, [docs, loadPriorityServiceCustomers, season]);

  // null = nothing selected, "new" = create form, number = edit form for that servId
  const [selected, setSelected] = useState<number | "new" | null>(null);

  const selectedDoc =
    typeof selected === "number"
      ? docs.find((d) => d.servId === selected) ?? null
      : null;

  const selectedPs =
    typeof selected === "number" ? priorityServiceMap.get(selected) ?? null : null;

  const handleDone = () => setSelected(null);

  return (
    <Container variant="scroll-shell" title="Priority Scheduling">
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ── Left panel: list ── */}
        <div className="w-[432px] shrink-0 flex flex-col gap-2">
          <Button
            variant="primary"
            intensity="soft"
            className="w-full justify-start gap-2"
            onClick={() => {
              // Clear any previously looked-up single customer before opening the new form
              if (lookupCustomer) {
                clearCustomer(lookupCustomer.custId);
              }
              setSelected("new");
            }}
          >
            <Plus className="w-4 h-4" />
            New Entry
          </Button>

          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-1">
              {docs.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  No priority services yet.
                </p>
              )}
              {docs.map((doc) => (
                <PriorityServiceListItem
                  key={doc.servId}
                  servId={doc.servId}
                  isSelected={selected === doc.servId}
                  onClick={() => setSelected(doc.servId)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right panel: form ── */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selected === null && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select an entry to edit, or click &#34;New Entry&#34; to add one.
            </div>
          )}

          {selected === "new" && (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>
                  {lookupCustomer ? (
                    <CustomerLink
                      customerId={lookupCustomer.custId}
                      customerTab="customer"
                      className="hover:underline"
                    >
                      {lookupCustomer.displayName}
                    </CustomerLink>
                  ) : (
                    "Add Priority Service"
                  )}
                </CardTitle>
                <CardDescription>
                  Flag a customer service for priority scheduling
                </CardDescription>
                {lookupCustomer && (() => {
                  const custNote = lookupCustomer.techNote;
                  if (!custNote) return null;
                  return (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex-1">
                        <span className="font-medium text-foreground/60 block mb-0.5">Customer</span>
                        {custNote}
                      </div>
                    </div>
                  );
                })()}
              </CardHeader>
              {/* key resets form state when switching between new/edit */}
              <PriorityServiceForm key="new" onDone={handleDone} />
            </Card>
          )}

          {typeof selected === "number" && selectedDoc && (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>
                  {selectedPs ? (
                    <CustomerLink
                      customerId={selectedPs.service.program.customer.custId}
                      customerTab="customer"
                      className="hover:underline"
                    >
                      {selectedDoc.custDisplayName || `Serv #${selectedDoc.servId}`}
                    </CustomerLink>
                  ) : (
                    selectedDoc.custDisplayName || `Serv #${selectedDoc.servId}`
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="font-mono">{selectedDoc.servCodeId}</span>
                  {" · "}
                  {selectedDoc.date ?? `${selectedDoc.dateRange?.min}–${selectedDoc.dateRange?.max}`}
                  {selectedPs && (() => {
                    const si = selectedPs.service.x.schedInfo;
                    if (!si) return null;
                    const dateStr = (() => {
                      try {
                        const d = parseISO(si.schedDate);
                        return isValid(d) ? format(d, "EEE M/d") : si.schedDate;
                      } catch {
                        return si.schedDate;
                      }
                    })();
                    return (
                      <span className="block mt-0.5 text-[10px] tabular-nums">
                        {si.hasAssignment
                          ? `$ ${si.employeeId} · ${dateStr} · Stop ${si.sequence}`
                          : dateStr}
                      </span>
                    );
                  })()}
                </CardDescription>
                {selectedPs && (() => {
                  const custNote = selectedPs.service.program.customer.techNote;
                  const progNote = selectedPs.service.program.techNote;
                  const servNote = selectedPs.service.techNote;
                  if (!custNote && !progNote && !servNote) return null;
                  return (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {custNote && (
                        <div className="flex-1">
                          <span className="font-medium text-foreground/60 block mb-0.5">Customer</span>
                          {custNote}
                        </div>
                      )}
                      {progNote && (
                        <div className="flex-1">
                          <span className="font-medium text-foreground/60 block mb-0.5">Program</span>
                          {progNote}
                        </div>
                      )}
                      {servNote && (
                        <div className="flex-1">
                          <span className="font-medium text-foreground/60 block mb-0.5">Service</span>
                          {servNote}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardHeader>
              <PriorityServiceForm
                key={selected}
                existingDoc={selectedDoc}
                onDone={handleDone}
              />
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
