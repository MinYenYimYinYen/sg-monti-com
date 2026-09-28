"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { useMirrorQuery } from "@/app/realGreen/customer/mirror/useMirrorQuery";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { corruptedSyncRecordSelect } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSelect";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

// ---------------------------------------------------------------------------
// Build the query plan for the selected season.
// Fetches all programs for the season, then all services for those programs.
// The selector then filters to customers with at least one program with no services.
// ---------------------------------------------------------------------------

function buildSeasonPlan(season: number) {
  return new QueryBuilder()
    .addProgramStep(["entity", "provider"], {
      stepName: "seasonPrograms",
      source: "values",
      filters: [{ field: "season", operator: "eq", value: season }],
      provides: { custId: true, progId: true },
    })
    .addCustomerStep(["entity"], {
      stepName: "seasonCustomers",
      source: "step",
      fromStep: "seasonPrograms",
      joinKey: "custId",
      filters: [],
    })
    .addServiceStep(["entity"], {
      stepName: "seasonServices",
      source: "step",
      fromStep: "seasonPrograms",
      joinKey: "progId",
      filters: [],
    })
    .build();
}

// ---------------------------------------------------------------------------
// Corrupted record neighbor IDs — used to cross-reference against service IDs
// ---------------------------------------------------------------------------

function useNeighborServIds(): Set<number> {
  const allRecords = useSelector(corruptedSyncRecordSelect.corruptedSyncRecords);
  return useMemo(() => {
    const ids = new Set<number>();
    for (const record of allRecords) {
      if (record.entityType === "service") {
        if (record.entityBeforeId !== null) ids.add(record.entityBeforeId);
        if (record.entityAfterId !== null) ids.add(record.entityAfterId);
      }
    }
    return ids;
  }, [allRecords]);
}

// ---------------------------------------------------------------------------
// Program row — shows a program with no services, plus nearby servIds
// ---------------------------------------------------------------------------

function EmptyProgramRow({
  program,
  neighborServIds,
  allServIds,
}: {
  program: Program;
  neighborServIds: Set<number>;
  allServIds: number[];
}) {
  // Find servIds on this customer that are near any corrupted neighbor IDs
  const nearbyNeighbors = useMemo(() => {
    return allServIds.filter((servId) => neighborServIds.has(servId));
  }, [allServIds, neighborServIds]);

  return (
    <div className="pl-5 border-l-2 border-destructive/30 py-1.5 space-y-1">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">
          {program.progCode.progCodeId}
        </span>
        <span className="font-mono text-xs text-foreground/50">
          progId: {program.progId}
        </span>
        <span className="text-xs text-foreground/60">
          Season {program.season} · Status: {program.status}
        </span>
        <span className="text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded px-1.5 py-0.5">
          0 services
        </span>
      </div>
      {nearbyNeighbors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-foreground/50">Neighbor match:</span>
          {nearbyNeighbors.map((servId) => (
            <span
              key={servId}
              className="font-mono text-xs bg-secondary/10 text-secondary border border-secondary/30 rounded px-1.5 py-0.5"
            >
              {servId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customer card — only shown if they have at least one empty program
// ---------------------------------------------------------------------------

function CustomerCard({
  customer,
  neighborServIds,
}: {
  customer: Customer;
  neighborServIds: Set<number>;
}) {
  const emptyPrograms = customer.programs.filter((p) => p.services.length === 0);
  const allServIds = customer.programs.flatMap((p) => p.services.map((s) => s.servId));

  if (emptyPrograms.length === 0) return null;

  const hasNeighborMatch = allServIds.some((id) => neighborServIds.has(id));

  return (
    <div className={[
      "rounded-lg border bg-card overflow-hidden",
      hasNeighborMatch ? "border-secondary/50" : "border-border",
    ].join(" ")}>
      {/* Header */}
      <div className={[
        "flex items-center justify-between px-4 py-3 border-b",
        hasNeighborMatch ? "bg-secondary/10 border-secondary/30" : "bg-accent/10 border-border",
      ].join(" ")}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">{customer.displayName}</span>
          {hasNeighborMatch && (
            <span className="text-xs bg-secondary/20 text-secondary border border-secondary/40 rounded px-1.5 py-0.5 font-medium">
              ⚡ neighbor match
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/50">
            {emptyPrograms.length} empty program{emptyPrograms.length === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-xs text-foreground/50">custId: {customer.custId}</span>
        </div>
      </div>

      {/* Empty programs */}
      <div className="p-4 space-y-2">
        {emptyPrograms.map((program) => (
          <EmptyProgramRow
            key={program.progId}
            program={program}
            neighborServIds={neighborServIds}
            allServIds={allServIds}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProgramsWithoutServicesPage() {
  const selectedSeason = useSelector(corruptedSyncRecordSelect.selectedSeason);
  const [loaded, setLoaded] = useState(false);

  const plan = useMemo(() => buildSeasonPlan(selectedSeason), [selectedSeason]);
  const { reload } = useMirrorQuery({ plan });

  const neighborServIds = useNeighborServIds();
  const allCustomers = useSelector(centralSelect.customers);

  // Filter to customers who have at least one program with no services
  const customersWithEmptyPrograms = useMemo(
    () => allCustomers.filter((c) => c.programs.some((p) => p.services.length === 0)),
    [allCustomers],
  );

  // Sort: customers with neighbor matches first, then alphabetically
  const sortedCustomers = useMemo(() => {
    const allServIds = (customer: Customer) =>
      customer.programs.flatMap((p) => p.services.map((s) => s.servId));

    return [...customersWithEmptyPrograms].sort((a, b) => {
      const aMatch = allServIds(a).some((id) => neighborServIds.has(id));
      const bMatch = allServIds(b).some((id) => neighborServIds.has(id));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [customersWithEmptyPrograms, neighborServIds]);

  const handleLoad = () => {
    setLoaded(true);
    reload();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Programs Without Services</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Loads all programs for season <span className="font-semibold text-foreground">{selectedSeason}</span> and
              finds customers with programs that have no services.
              A program missing its service may indicate a corrupted record.
              Customers whose other service IDs match corrupted record neighbors are highlighted.
            </p>
          </div>
          <button
            onClick={handleLoad}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Load Season {selectedSeason}
          </button>
        </div>

        {/* Results */}
        {!loaded ? (
          <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-foreground/50">
            Click "Load Season {selectedSeason}" to fetch all programs for this season.
            This may take a moment — it loads the full season dataset.
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-foreground/50">
            {allCustomers.length === 0
              ? "Loading data…"
              : "No customers found with programs that have zero services for this season."}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">
              <span className="font-semibold text-foreground">{sortedCustomers.length}</span> customer{sortedCustomers.length === 1 ? "" : "s"} with empty programs
              {" "}(out of <span className="font-semibold text-foreground">{allCustomers.length}</span> total loaded)
            </p>
            {sortedCustomers.map((customer) => (
              <CustomerCard
                key={customer.custId}
                customer={customer}
                neighborServIds={neighborServIds}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
