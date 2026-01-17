"use client";

import { useProgCode } from "@/app/realGreen/programCode/useProgCode";
import { useSelector } from "react-redux";
import { progCodeSelect } from "@/app/realGreen/programCode/progCodeSlice";
import { CenteredContainer } from "@/style/components/Containers";
import { cn } from "@/style/utils";

export default function ProgCodeListPage() {
  useProgCode({ autoLoad: true });
  const progCodes = useSelector(progCodeSelect.allProgCodes);

  return (
    <CenteredContainer className="items-start pt-10">
      <div className="w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text">Program Codes</h1>
          <span className="text-sm text-text-500">
            Total: {progCodes.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-background-300 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background-50 text-text-500">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Def ID</th>
                  <th className="px-6 py-3 font-medium">Unit Code</th>
                  <th className="px-6 py-3 font-medium">Service Codes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {progCodes.map((code) => (
                  <tr
                    key={code.progCodeId}
                    className="hover:bg-background-50/50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-text">
                      {code.progCodeId}
                    </td>
                    <td className="px-6 py-4 text-text font-medium">
                      {code.description}
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
                    <td className="whitespace-nowrap px-6 py-4 text-text-500">
                      {code.programType || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-text-500">
                      {code.progDefId}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-text-500">
                      {code.unitCode}
                    </td>
                    <td className="px-6 py-4">
                      {code.servCodes && code.servCodes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {code.servCodes.map((sc) => (
                            <span
                              key={sc.servCodeId}
                              className="rounded bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700"
                            >
                              {sc.servCodeId}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-400">-</span>
                      )}
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
