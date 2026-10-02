"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { useCustomerQuery } from "@/app/realGreen/customer/mirror/useCustomerQuery";
import { CustomerQueryBuilder } from "@/app/realGreen/customer/mirror/CustomerQueryBuilder";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Investigation accounts — employees used for CRM testing.
// The corrupted service record between Kevin (3804029) and Forrest (3835113)
// likely belongs to one of these accounts.
// ---------------------------------------------------------------------------

const INVESTIGATION_CUST_IDS = [4073100, 4009417, 3804029, 3835113];

const CUST_LABELS: Record<number, string> = {
  4073100: "Luke (me)",
  4009417: "Adam",
  3804029: "Kevin",
  3835113: "Forrest",
};

const INVESTIGATION_PLAN = new CustomerQueryBuilder()
  .addCustomerStep(["entity", "provider"], {
    stepName: "investigationCustomers",
    source: "values",
    filters: [{ field: "custId", operator: "in", value: INVESTIGATION_CUST_IDS }],
    provides: { custId: true },
  })
  .addProgramStep(["entity", "provider"], {
    stepName: "investigationPrograms",
    source: "step",
    fromStep: "investigationCustomers",
    joinKey: "custId",
    filters: [],
    provides: { progId: true },
  })
  .addServiceStep(["entity"], {
    stepName: "investigationServices",
    source: "step",
    fromStep: "investigationPrograms",
    joinKey: "progId",
    filters: [],
  })
  .build();

// ---------------------------------------------------------------------------
// Service row
// ---------------------------------------------------------------------------

function ServiceRow({ service }: { service: Service }) {
  return (
    <div className="pl-10 border-l-2 border-primary/20 py-1 space-y-0.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-foreground/50 w-20 shrink-0">
          servId: {service.servId}
        </span>
        <span className="text-xs text-foreground/70">
          {service.servCodeId} · Status: {service.status} · Season: {service.season}
        </span>
        {service.size > 0 && (
          <span className="text-xs text-foreground/50">Size: {service.size}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Program block
// ---------------------------------------------------------------------------

function ProgramBlock({ program }: { program: Program }) {
  return (
    <div className="pl-5 border-l-2 border-accent/30 space-y-1">
      <div className="flex items-center gap-3 py-1">
        <span className="text-sm font-medium text-foreground">
          {program.progCode.progCodeId}
        </span>
        <span className="font-mono text-xs text-foreground/50">
          progId: {program.progId}
        </span>
        <span className="text-xs text-foreground/60">
          Season {program.season} · Status: {program.status}
        </span>
        {program.services.length === 0 && (
          <span className="text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded px-1.5 py-0.5">
            no services
          </span>
        )}
      </div>
      {program.services.map((service) => (
        <ServiceRow key={service.servId} service={service} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customer card
// ---------------------------------------------------------------------------

function CustomerCard({ customer }: { customer: Customer }) {
  const label = CUST_LABELS[customer.custId];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">{customer.displayName}</span>
          {label && (
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
              {label}
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-foreground/50">custId: {customer.custId}</span>
      </div>

      {/* Programs */}
      <div className="p-4 space-y-3">
        {customer.programs.length === 0 ? (
          <p className="text-sm text-foreground/40 italic">No programs loaded</p>
        ) : (
          customer.programs.map((program) => (
            <ProgramBlock key={program.progId} program={program} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmployeeCorruptedPage() {
  const { reload } = useCustomerQuery({ plan: INVESTIGATION_PLAN });

  const allCustomers = useSelector(centralSelect.customers);

  // Filter to only the investigation accounts
  const investigationCustomers = useMemo(
    () => allCustomers.filter((c) => INVESTIGATION_CUST_IDS.includes(c.custId)),
    [allCustomers],
  );

  // Sort by the order defined in INVESTIGATION_CUST_IDS
  const sortedCustomers = useMemo(
    () => [...investigationCustomers].sort(
      (a, b) => INVESTIGATION_CUST_IDS.indexOf(a.custId) - INVESTIGATION_CUST_IDS.indexOf(b.custId),
    ),
    [investigationCustomers],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Employee Corrupted?</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Full customer/program/service trees for the employee test accounts.
              The corrupted service between Kevin (3804029) and Forrest (3835113)
              likely belongs to Luke or Adam &mdash; look for a program with a gap in its service IDs.
            </p>
          </div>
          <button
            onClick={reload}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Load / Refresh
          </button>
        </div>

        {/* Customer cards */}
        {sortedCustomers.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-foreground/50">
            Click &#34;Load / Refresh&#34; to fetch the investigation accounts.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCustomers.map((customer) => (
              <CustomerCard key={customer.custId} customer={customer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
