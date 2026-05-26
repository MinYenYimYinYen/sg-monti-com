"use client";

import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

export function Layer3ServicesPanel() {
  const services = useSelector(centralSelect.services);
  const completedServices = services.filter((s) => s.status === "S");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold text-foreground">Layer 3 — Services in Store</h3>
      <p className="text-foreground/60 text-xs">
        <code>centralSelect.services</code> — {services.length} total, {completedServices.length} completed (status &#34;S&#34;).
        If this is 0, <code>recentProduction</code> has not loaded yet or returned no results.
      </p>
      {completedServices.length === 0 ? (
        <p className="text-foreground/40 text-xs italic">No completed services in store.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-foreground/10 rounded">
            <thead>
              <tr className="text-foreground/50 border-b border-foreground/10 text-left">
                <th className="py-1 px-2 font-medium">servId</th>
                <th className="py-1 px-2 font-medium">custId</th>
                <th className="py-1 px-2 font-medium">status</th>
                <th className="py-1 px-2 font-medium">doneDate</th>
                <th className="py-1 px-2 font-medium">doneBys</th>
                <th className="py-1 px-2 font-medium text-right">usedProducts</th>
              </tr>
            </thead>
            <tbody>
              {completedServices.map((service) => {
                const doneBys = service.production?.doneBys.map((db) => db.employeeId).join(", ") ?? "—";
                const usedCount = service.production?.usedAppProducts?.length ?? 0;
                return (
                  <tr key={service.servId} className="border-b border-foreground/5 last:border-0">
                    <td className="py-1 px-2 tabular-nums">{service.servId}</td>
                    <td className="py-1 px-2 tabular-nums">{service.custId}</td>
                    <td className="py-1 px-2">{service.status}</td>
                    <td className="py-1 px-2 tabular-nums">{service.production?.doneDate ?? "—"}</td>
                    <td className="py-1 px-2 text-foreground/60">{doneBys}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{usedCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
