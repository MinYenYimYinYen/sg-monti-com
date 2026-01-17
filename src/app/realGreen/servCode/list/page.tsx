"use client";

import { useServCode } from "@/app/realGreen/servCode/useServCode";
import { useSelector } from "react-redux";
import { servCodeSelect } from "@/app/realGreen/servCode/servCodeSlice";
import { CenteredContainer } from "@/style/components/Containers";
import { cn } from "@/style/utils";

export default function ServCodeListPage() {
  useServCode({ autoLoad: true });
  const servCodes = useSelector(servCodeSelect.activeServCodes);

  return (
    <CenteredContainer className="items-start pt-10">
      <div className="w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text">Service Codes</h1>
          <span className="text-sm text-text-500">
            Total: {servCodes.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-background-300 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background-50 text-text-500">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Schedule</th>
                  <th className="px-6 py-3 font-medium">Invoice Msg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {servCodes.map((code) => (
                  <tr
                    key={code.servCodeId}
                    className="hover:bg-background-50/50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-text">
                      {code.servCodeId}
                    </td>
                    <td className="px-6 py-4 text-text font-medium">
                      {code.longName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          code.available
                            ? "bg-secondary-100 text-secondary-700"
                            : "bg-background-200 text-text-500",
                        )}
                      >
                        {code.available ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {code.isServiceCall ? (
                        <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-1 text-xs font-medium text-accent-700">
                          Service Call
                        </span>
                      ) : (
                        <span className="text-text-500">Regular</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-text-500">
                      {code.alwaysAsap ? (
                        <span className="font-medium text-primary-600">ASAP</span>
                      ) : code.begin || code.end ? (
                        <span>
                          {code.begin} - {code.end}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-500 max-w-xs truncate" title={code.invoiceMessage || ""}>
                      {code.invoiceMessage || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CenteredContainer>
  );
}
