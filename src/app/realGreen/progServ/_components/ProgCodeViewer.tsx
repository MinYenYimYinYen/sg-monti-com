"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_selectors/progServSelectors";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { Modal } from "@/components/Modal";
import { ServCodeViewer } from "./ServCodeViewer";
import {Button} from "@/style/components/button";

export function ProgCodeViewer() {
  const progCodes = useSelector(progServSelect.progCodes);
  const [selectedProgram, setSelectedProgram] = useState<ProgCode | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              <th className="p-3 font-semibold text-text">Program ID</th>
              <th className="p-3 font-semibold text-text">Description</th>
              <th className="p-3 font-semibold text-text">Type</th>
              <th className="p-3 font-semibold text-text">Special</th>
              <th className="p-3 font-semibold text-text">Services</th>
              <th className="p-3 font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {progCodes.map((pc) => (
              <tr
                key={pc.progCodeId}
                className="border-b border-border hover:bg-surface-hover"
              >
                <td className="p-3 font-mono font-medium text-text">
                  {pc.progCodeId}
                </td>
                <td className="p-3 text-text">{pc.description}</td>
                <td className="p-3 text-text">{pc.programType || "-"}</td>
                <td className="p-3 text-text">
                  {pc.isSpecial ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      Special
                    </span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="p-3 text-text">
                  {pc.servCodes.length} services
                </td>
                <td className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProgram(pc)}
                  >
                    View Services
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!selectedProgram}
        onClose={() => setSelectedProgram(null)}
        title={
          selectedProgram
            ? `Services for ${selectedProgram.description} (${selectedProgram.progCodeId})`
            : ""
        }
        className="max-w-4xl"
      >
        {selectedProgram && (
          <div className="p-4">
            <ServCodeViewer servCodes={selectedProgram.servCodes} />
          </div>
        )}
      </Modal>
    </div>
  );
}
