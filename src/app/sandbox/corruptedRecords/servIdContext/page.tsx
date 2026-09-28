"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { corruptedSyncRecordSelect } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSelect";
import { CorruptedEntityType, CorruptedSyncRecord } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveTab = CorruptedEntityType;

const TABS: { key: ActiveTab; label: string }[] = [
  { key: "service",  label: "Services" },
  { key: "program",  label: "Programs" },
  { key: "customer", label: "Customers" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findRepeatedIds(records: CorruptedSyncRecord[]): Set<number> {
  const counts = new Map<number, number>();
  for (const record of records) {
    if (record.entityBeforeId !== null) {
      counts.set(record.entityBeforeId, (counts.get(record.entityBeforeId) ?? 0) + 1);
    }
    if (record.entityAfterId !== null) {
      counts.set(record.entityAfterId, (counts.get(record.entityAfterId) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// ---------------------------------------------------------------------------
// Neighbor column — shows customer/program/service hierarchy for one neighbor
// ---------------------------------------------------------------------------

function NeighborColumn({
  label,
  servId,
  serviceMap,
}: {
  label: string;
  servId: number | null;
  serviceMap: Map<number, Service>;
}) {
  const labelClass = label === "Before"
    ? "text-accent font-semibold uppercase text-xs tracking-wide"
    : "text-secondary font-semibold uppercase text-xs tracking-wide";

  if (servId === null) {
    return (
      <div className="space-y-2">
        <p className={labelClass}>{label}</p>
        <p className="text-foreground/40 italic text-sm">No neighbor ID captured</p>
      </div>
    );
  }

  const service = serviceMap.get(servId);

  if (!service) {
    return (
      <div className="space-y-2">
        <p className={labelClass}>{label}</p>
        <p className="text-foreground/60 text-sm font-mono">servId: {servId}</p>
        <p className="text-foreground/40 italic text-xs">Loading…</p>
      </div>
    );
  }

  const customer = service.x.customer;
  const program = service.program;

  return (
    <div className="space-y-3">
      <p className={labelClass}>{label}</p>

      {/* Customer */}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Customer</p>
        <p className="font-semibold text-foreground">{customer.displayName}</p>
        <p className="font-mono text-xs text-foreground/50">custId: {customer.custId}</p>
      </div>

      {/* Program */}
      <div className="pl-3 border-l-2 border-accent/30 space-y-0.5">
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Program</p>
        <p className="text-foreground">{program.progCode.progCodeId}</p>
        <p className="font-mono text-xs text-foreground/50">progId: {program.progId} · Season {program.season}</p>
        <p className="text-xs text-foreground/60">Status: {program.status}</p>
      </div>

      {/* Service */}
      <div className="pl-6 border-l-2 border-primary/30 space-y-0.5">
        <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Service</p>
        <p className="font-mono text-xs text-foreground/50">servId: {service.servId}</p>
        <p className="text-xs text-foreground/60">
          Code: {service.servCodeId} · Status: {service.status} · Season: {service.season}
        </p>
        {service.size > 0 && (
          <p className="text-xs text-foreground/60">Size: {service.size}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accordion row
// ---------------------------------------------------------------------------

function AccordionRow({
  record,
  repeated,
  isExpanded,
  onToggle,
  serviceMap,
}: {
  record: CorruptedSyncRecord;
  repeated: { before: boolean; after: boolean };
  isExpanded: boolean;
  onToggle: () => void;
  serviceMap: Map<number, Service>;
}) {
  return (
    <div className="border-b border-border/50 last:border-0">
      {/* Trigger row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-accent/5 text-left transition-colors"
      >
        <span className="text-foreground/40 text-xs w-4 shrink-0">
          {isExpanded ? "▼" : "▶"}
        </span>

        {/* Before ID */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-foreground/50 w-12 shrink-0">Before</span>
          {record.entityBeforeId !== null ? (
            <span className={[
              "font-mono text-sm",
              repeated.before ? "text-destructive font-semibold" : "text-foreground",
            ].join(" ")}>
              {record.entityBeforeId}
              {repeated.before && (
                <span className="ml-1.5 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded px-1 py-0.5">
                  ⚠ repeated
                </span>
              )}
            </span>
          ) : (
            <span className="text-foreground/40 italic text-sm">—</span>
          )}
        </div>

        {/* After ID */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-foreground/50 w-12 shrink-0">After</span>
          {record.entityAfterId !== null ? (
            <span className={[
              "font-mono text-sm",
              repeated.after ? "text-destructive font-semibold" : "text-foreground",
            ].join(" ")}>
              {record.entityAfterId}
              {repeated.after && (
                <span className="ml-1.5 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded px-1 py-0.5">
                  ⚠ repeated
                </span>
              )}
            </span>
          ) : (
            <span className="text-foreground/40 italic text-sm">—</span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-card/30 border-t border-border/30">
          <div className="grid grid-cols-2 gap-6">
            <NeighborColumn
              label="Before"
              servId={record.entityBeforeId}
              serviceMap={serviceMap}
            />
            <NeighborColumn
              label="After"
              servId={record.entityAfterId}
              serviceMap={serviceMap}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timestamp group — accordion item
// ---------------------------------------------------------------------------

function TimestampGroup({
  timestamp,
  records,
  repeatedIds,
  serviceMap,
}: {
  timestamp: string;
  records: CorruptedSyncRecord[];
  repeatedIds: Set<number>;
  serviceMap: Map<number, Service>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Timestamp accordion trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-accent/10 border-b border-border hover:bg-accent/15 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-foreground/40 text-xs w-4 shrink-0">
            {isOpen ? "▼" : "▶"}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatTimestamp(timestamp)}
          </span>
        </div>
        <span className="text-xs text-foreground/60 bg-card border border-border rounded px-2 py-0.5">
          {records.length} hit{records.length === 1 ? "" : "s"}
        </span>
      </button>

      {/* Expanded: column headers + accordion rows */}
      {isOpen && (
        <>
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card/50">
            <span className="w-4 shrink-0" />
            <span className="flex-1 text-xs font-medium text-foreground/60">Before ID</span>
            <span className="flex-1 text-xs font-medium text-foreground/60">After ID</span>
          </div>

          {records.map((record) => (
            <AccordionRow
              key={record.corruptedContextId}
              record={record}
              repeated={{
                before: record.entityBeforeId !== null && repeatedIds.has(record.entityBeforeId),
                after: record.entityAfterId !== null && repeatedIds.has(record.entityAfterId),
              }}
              isExpanded={expandedRowId === record.corruptedContextId}
              onToggle={() =>
                setExpandedRowId(
                  expandedRowId === record.corruptedContextId ? null : record.corruptedContextId,
                )
              }
              serviceMap={serviceMap}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity tab
// ---------------------------------------------------------------------------

function EntityTab({
  records,
  serviceMap,
}: {
  records: CorruptedSyncRecord[];
  serviceMap: Map<number, Service>;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-foreground/50">
        No corrupted records found for this entity type.
      </div>
    );
  }

  const byTimestamp = new Grouper(records).groupBy((r) => r.timestamp).toMap();
  const timestamps = [...byTimestamp.keys()].sort((a, b) => b.localeCompare(a));
  const repeatedIds = findRepeatedIds(records);
  const repeatedCount = repeatedIds.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-foreground/70">
        <span>
          <span className="font-semibold text-foreground">{records.length}</span> total hits across{" "}
          <span className="font-semibold text-foreground">{timestamps.length}</span> sync run{timestamps.length === 1 ? "" : "s"}
        </span>
        {repeatedCount > 0 && (
          <span className="text-destructive font-medium">
            ⚠ {repeatedCount} ID{repeatedCount === 1 ? "" : "s"} appear in multiple runs
          </span>
        )}
      </div>

      {timestamps.map((ts) => (
        <TimestampGroup
          key={ts}
          timestamp={ts}
          records={byTimestamp.get(ts) ?? []}
          repeatedIds={repeatedIds}
          serviceMap={serviceMap}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ServIdContextPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("service");
  const byEntityType = useSelector(corruptedSyncRecordSelect.byEntityType);
  const allRecords = useSelector(corruptedSyncRecordSelect.corruptedSyncRecords);
  const allServices = useSelector(centralSelect.services);

  const activeRecords = byEntityType.get(activeTab) ?? [];

  const serviceMap = useMemo(
    () => new Map(allServices.map((s) => [s.servId, s])),
    [allServices],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-foreground">ServId Context</h2>
          <p className="text-sm text-foreground/60 mt-1">
            Records captured during sync operations where RealGreen returned a corrupted record.
            The IDs shown are the neighbors immediately before and after the gap.
            Expand a row to see the full customer/program/service hierarchy.
          </p>
        </div>

        {/* Total count */}
        {allRecords.length > 0 && (
          <div className="rounded-md bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-foreground/70">
            <span className="font-semibold text-foreground">{allRecords.length.toLocaleString()}</span> total corrupted record encounters across all entity types.
          </div>
        )}

        {/* Entity type tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(({ key, label }) => {
            const count = byEntityType.get(key)?.length ?? 0;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={[
                  "px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-foreground/60 hover:text-foreground hover:bg-accent/10",
                ].join(" ")}
              >
                {label}
                {count > 0 && (
                  <span className={[
                    "ml-2 text-xs rounded-full px-1.5 py-0.5",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-foreground/10 text-foreground/60",
                  ].join(" ")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        <EntityTab records={activeRecords} serviceMap={serviceMap} />
      </div>
    </div>
  );
}
