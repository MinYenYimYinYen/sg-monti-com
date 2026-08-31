"use client";

import { useSelector } from "react-redux";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Container } from "@/components/Containers";
import { ScrollArea } from "@/style/components/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { FlagRuleCRUD } from "@/app/sanity/flags/_components/FlagRuleCRUD";
import {
  sanityFlagRuleSelect,
  ViolationGroup,
} from "@/app/sanity/flags/sanityFlagRuleSelect";
import { flagRuleSelect } from "@/app/flagRule/flagRuleSelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { cn } from "@/style/utils";
import { FlagRuleStatus } from "@/app/flagRule/flagRuleEngine";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: FlagRuleStatus }) {
  const isConflict = status === "conflict";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
        isConflict
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary/20 text-secondary-foreground",
      )}
    >
      {isConflict ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      {isConflict ? "Conflict" : "Missing"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ViolationAccordionItem
// ---------------------------------------------------------------------------

function ViolationAccordionItem({ group }: { group: ViolationGroup }) {
  const sortedCustomers = [...group.customers].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return (
    <AccordionItem value={group.message}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <StatusBadge status={group.status} />
          <span className="text-sm font-medium text-left truncate">
            {group.message}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground font-normal">
            {group.customers.length} customer
            {group.customers.length !== 1 ? "s" : ""}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pl-1">
          {sortedCustomers.map((customer) => (
            <CustomerLink
              key={customer.custId}
              customerId={customer.custId}
              customerTab="customer"
              className="text-xs text-primary hover:underline"
            >
              {customer.displayName}
            </CustomerLink>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ---------------------------------------------------------------------------
// ViolationsView
// ---------------------------------------------------------------------------

function ViolationsView() {
  const rules = useSelector(flagRuleSelect.all);
  const customers = useSelector(centralSelect.customers);
  const violationGroups = useSelector(sanityFlagRuleSelect.violationGroups);

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 opacity-40" />
        <p className="text-sm">No flag rules configured yet.</p>
        <p className="text-xs">Switch to the &quot;Manage Rules&quot; tab to add rules.</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading customer data…
      </div>
    );
  }

  if (violationGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <CheckCircle2 className="w-8 h-8 text-accent opacity-70" />
        <p className="text-sm font-medium">No violations found.</p>
        <p className="text-xs">
          All {customers.length.toLocaleString()} customers pass the configured
          flag rules.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="pr-2">
        <p className="text-xs text-muted-foreground mb-3">
          {violationGroups.length} violation type
          {violationGroups.length !== 1 ? "s" : ""} across{" "}
          {new Set(violationGroups.flatMap((g) => g.customers.map((c) => c.custId))).size.toLocaleString()}{" "}
          customer
          {new Set(violationGroups.flatMap((g) => g.customers.map((c) => c.custId))).size !== 1 ? "s" : ""}
        </p>
        <Accordion type="multiple">
          {violationGroups.map((group) => (
            <ViolationAccordionItem key={group.message} group={group} />
          ))}
        </Accordion>
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// FlagRulesPage
// ---------------------------------------------------------------------------

export default function FlagRulesPage() {
  return (
    <Container variant="scroll-shell" title="Flag Rules">
      <Tabs defaultValue="violations" className="flex-1 min-h-0 flex flex-col">
        <TabsList variant="primary" className="mb-3 self-start">
          <TabsTrigger value="violations" variant="primary">
            Violations
          </TabsTrigger>
          <TabsTrigger value="manage" variant="primary">
            Manage Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="flex-1 min-h-0 flex flex-col">
          <ViolationsView />
        </TabsContent>

        <TabsContent value="manage" className="flex-1 min-h-0 overflow-auto">
          <FlagRuleCRUD />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
