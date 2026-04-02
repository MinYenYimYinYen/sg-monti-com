"use client";

import { useState } from "react";
import { TemplateTabs } from "./TemplateTabs";
import { Editor } from "./Editor";

export type ProgramType = "preferred" | "economy" | null;

export type CrmData = {
  sqFt: number;
  price: number;
  customerName: string;
  program: ProgramType;
};

export function QuickSend() {
  const [crmData, setCrmData] = useState<CrmData>({
    sqFt: 0,
    price: 0,
    customerName: "",
    program: null,
  });

  return (
    <div className="flex h-full w-full gap-4 p-4">
      <div className="flex w-1/2 flex-col overflow-y-auto rounded-md border border-border bg-card">
        <TemplateTabs onCrmChange={setCrmData} />
      </div>
      <div className="flex w-1/2 flex-col">
        <Editor crmData={crmData} />
      </div>
    </div>
  );
}
