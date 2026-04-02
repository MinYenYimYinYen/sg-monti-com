"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { authSelect } from "@/app/auth/authSlice";
import type { CrmData, ProgramType } from "./QuickSend";

const LEVEL1_TABS = [
  { value: "sales", label: "Sales" },
  { value: "cancels", label: "Cancels" },
  { value: "ar", label: "A/R" },
] as const;

const SALES_SUBTABS = [
  { value: "web-lead", label: "Web Lead" },
  { value: "upsell", label: "Upsell" },
  { value: "estimate-followup", label: "Estimate Follow-up" },
] as const;

const PROGRAM_TABS = [
  { value: "preferred", label: "Preferred" },
  { value: "economy", label: "Economy" },
] as const;

type Level1Value = (typeof LEVEL1_TABS)[number]["value"];

// Mock CRM lookup — replace with real API call later
function lookupCustomerName(custId: string): string {
  if (custId === "12345") return "President Scroob";
  return "";
}

type Props = {
  onCrmChange: (data: CrmData) => void;
};

export function TemplateTabs({ onCrmChange }: Props) {
  const [level1, setLevel1] = useState<Level1Value>("sales");
  const [salesSub, setSalesSub] = useState("web-lead");
  const [program, setProgram] = useState<ProgramType>(null);
  const [sqFt, setSqFt] = useState("");
  const [custId, setCustId] = useState("");

  const repFirstName = useSelector(authSelect.user)?.firstName ?? "";

  function buildCrmData({
    sqFtVal,
    custIdVal,
    programVal,
  }: {
    sqFtVal: string;
    custIdVal: string;
    programVal: ProgramType;
  }): CrmData {
    const parsed = parseFloat(sqFtVal);
    const sqFtNum = isNaN(parsed) ? 0 : parsed;
    return {
      sqFt: sqFtNum,
      price: sqFtNum * 4,
      customerName: lookupCustomerName(custIdVal),
      program: programVal,
    };
  }

  function handleSqFtChange(value: string) {
    setSqFt(value);
    onCrmChange(buildCrmData({ sqFtVal: value, custIdVal: custId, programVal: program }));
  }

  function handleCustIdChange(value: string) {
    setCustId(value);
    onCrmChange(buildCrmData({ sqFtVal: sqFt, custIdVal: value, programVal: program }));
  }

  function handleProgramChange(value: string) {
    // Clicking the active tab again deselects it (toggle off)
    const next = value === program ? null : (value as ProgramType);
    setProgram(next);
    onCrmChange(buildCrmData({ sqFtVal: sqFt, custIdVal: custId, programVal: next }));
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {repFirstName && (
        <p className="text-xs text-muted-foreground">Rep: {repFirstName}</p>
      )}

      <Tabs value={level1} onValueChange={(value) => setLevel1(value as Level1Value)}>
        <TabsList variant="primary">
          {LEVEL1_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} variant="primary">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {level1 === "sales" && (
        <Tabs value={salesSub} onValueChange={setSalesSub}>
          <TabsList variant="accent">
            {SALES_SUBTABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} variant="accent">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="web-lead">
            <div className="mt-3 flex flex-col gap-4">
              {/* Customer ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="custid-input">
                  Customer ID
                </label>
                <input
                  id="custid-input"
                  type="text"
                  value={custId}
                  onChange={(e) => handleCustIdChange(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-40 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {custId && lookupCustomerName(custId) && (
                  <p className="text-xs text-accent">{lookupCustomerName(custId)}</p>
                )}
                {custId && !lookupCustomerName(custId) && (
                  <p className="text-xs text-muted-foreground">Customer not found</p>
                )}
              </div>

              {/* Lawn Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="sqft-input">
                  Lawn Size (sq ft)
                </label>
                <input
                  id="sqft-input"
                  type="number"
                  min="0"
                  value={sqFt}
                  onChange={(e) => handleSqFtChange(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-40 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Program selection — no default, clicking active tab deselects */}
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-foreground">Program</p>
                <div className="flex gap-2">
                  {PROGRAM_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleProgramChange(tab.value)}
                      className={[
                        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                        program === tab.value
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upsell" />
          <TabsContent value="estimate-followup" />
        </Tabs>
      )}
    </div>
  );
}
