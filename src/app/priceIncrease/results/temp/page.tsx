"use client";

import { useSelector } from "react-redux";
import { serviceIncreaseResultsSelect } from "@/app/priceIncrease/results/serviceIncreaseResultsSelect";
import { CustomerIncreaseCard } from "@/app/priceIncrease/results/_components/CustomerIncreaseCard";

const MAX_DISPLAY = 100;

export default function TempResultsPage() {
  const byCustomer = useSelector(serviceIncreaseResultsSelect.byCustomer);
  const dataIssues = useSelector(serviceIncreaseResultsSelect.dataIssues);

  const entries = Array.from(byCustomer.entries()).slice(0, MAX_DISPLAY);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Service Increase Results (temp)
        </h2>
        <span className="text-sm text-foreground/50">
          {byCustomer.size} customers · showing {entries.length}
        </span>
        {dataIssues.length > 0 && (
          <span className="text-sm text-destructive">
            {dataIssues.length} data issue{dataIssues.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {entries.map(([custId, serviceResults]) => (
        <CustomerIncreaseCard key={custId} serviceResults={serviceResults} />
      ))}

      {byCustomer.size === 0 && (
        <p className="text-sm text-foreground/50">
          No results — check that settings are configured and customers are loaded.
        </p>
      )}
    </div>
  );
}
