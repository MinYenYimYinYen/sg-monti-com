import React from "react";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

type ServCodeViewerProps = {
  servCodes: ServCode[];
}

export function ServCodeViewer({ servCodes }: ServCodeViewerProps) {
  if (!servCodes || servCodes.length === 0) {
    return (
      <div className="p-4 text-center text-text-muted">
        No service codes available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-left">
            <th className="p-2 font-semibold text-text">ID</th>
            <th className="p-2 font-semibold text-text">Name</th>
            <th className="p-2 font-semibold text-text">Available</th>
            <th className="p-2 font-semibold text-text">Service Call</th>
            <th className="p-2 font-semibold text-text">Parent Program</th>
          </tr>
        </thead>
        <tbody>
          {servCodes.map((sc) => (
            <tr
              key={`${sc.servCodeId}-${sc.progCode.progCodeId}`}
              className="border-b border-border hover:bg-surface-hover"
            >
              <td className="p-2 font-mono text-text">{sc.servCodeId}</td>
              <td className="p-2 text-text">{sc.longName}</td>
              <td className="p-2 text-text">
                {sc.available ? (
                  <span className="text-accent">Yes</span>
                ) : (
                  <span className="text-destructive">No</span>
                )}
              </td>
              <td className="p-2 text-text">
                {sc.isServiceCall ? "Yes" : "No"}
              </td>
              <td className="p-2 text-text-muted">
                {sc.progCode.progCodeId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
