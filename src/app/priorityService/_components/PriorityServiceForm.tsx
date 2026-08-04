"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { CardContent } from "@/style/components/card";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Separator } from "@/style/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { DatePicker } from "@/components/DatePicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FormGroup } from "@/components/FormGroup";
import { singleCustSelect } from "@/app/realGreen/customer/selectors/singleCustSelect";
import { priorityServiceCustomerActions } from "@/app/realGreen/customer/slices/customerSlices";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { usePriorityService } from "@/app/priorityService/usePriorityService";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

interface PriorityServiceFormProps {
  /** When provided, the form is in edit mode for this existing doc. */
  existingDoc?: PriorityServiceDoc;
  onDone: () => void;
}

export function PriorityServiceForm({
  existingDoc,
  onDone,
}: PriorityServiceFormProps) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  const lookup = (custId: number) => {
    if (!season || !custId || custId < 0) return;
    dispatch(
      priorityServiceCustomerActions.getDocs({
        params: {
          schemeName: "singleCustomer",
          season,
          schemeParams: { custId },
        },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const clearCustomer = (custId: number) => {
    dispatch(priorityServiceCustomerActions.removeCustomer(custId));
  };
  const { upsert, deleteOne } = usePriorityService();
  const priorityServiceMap = useSelector(priorityServiceSelect.priorityServiceMap);

  // Customer lookup state (create mode only)
  const [custIdInput, setCustIdInput] = useState("");
  const [selectedProgId, setSelectedProgId] = useState<number | null>(null);
  const [selectedServId, setSelectedServId] = useState<number | null>(
    existingDoc?.servId ?? null,
  );

  // Date mode
  const [dateMode, setDateMode] = useState<"single" | "range">(
    existingDoc?.dateRange ? "range" : "single",
  );
  const [singleDate, setSingleDate] = useState(existingDoc?.date ?? "");
  const [dateRange, setDateRange] = useState<TRange<string>>(
    existingDoc?.dateRange ?? { min: "", max: "" },
  );

  // Note
  const [note, setNote] = useState(existingDoc?.note ?? "");

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Loaded customer from single context
  const customer = useSelector(singleCustSelect.customer);

  const isEditMode = !!existingDoc;

  // Derive selected program and its services
  const selectedProgram: Program | null =
    customer?.programs.find((p) => p.progId === selectedProgId) ?? null;

  const eligibleServices: Service[] =
    selectedProgram?.services.filter((s) => s.status !== "S") ?? [];

  // Auto-select service if only one eligible
  const resolvedServId: number | null = (() => {
    if (isEditMode) return existingDoc.servId;
    if (selectedServId !== null) return selectedServId;
    if (eligibleServices.length === 1) return eligibleServices[0].servId;
    return null;
  })();

  // Resolved service entity (for display fields on save)
  const resolvedService: Service | null =
    eligibleServices.find((s) => s.servId === resolvedServId) ?? null;

  // When a servId is resolved, check if there's already a doc for it (edit-in-create)
  const existingForServ = resolvedServId
    ? priorityServiceMap.get(resolvedServId)
    : null;

  const effectiveDoc = existingDoc ?? existingForServ;

  const handleCustIdBlur = () => {
    const id = parseInt(custIdInput, 10);
    if (!isNaN(id) && id > 0) {
      lookup(id);
      setSelectedProgId(null);
      setSelectedServId(null);
    }
  };

  const handleProgChange = (value: string) => {
    setSelectedProgId(parseInt(value, 10));
    setSelectedServId(null);
  };

  const handleServChange = (value: string) => {
    const servId = parseInt(value, 10);
    setSelectedServId(servId);

    // Pre-populate form if this servId already has a priority doc
    const existing = priorityServiceMap.get(servId);
    if (existing) {
      setDateMode(existing.dateRange ? "range" : "single");
      setSingleDate(existing.date ?? "");
      setDateRange(existing.dateRange ?? { min: "", max: "" });
      setNote(existing.note);
    }
  };

  const getEffectiveServId = (): number | null => {
    if (isEditMode) return existingDoc.servId;
    return resolvedServId;
  };

  const canSave = (): boolean => {
    const servId = getEffectiveServId();
    if (!servId) return false;
    if (dateMode === "single" && !singleDate) return false;
    if (dateMode === "range" && (!dateRange.min || !dateRange.max)) return false;
    return true;
  };

  const handleSave = async () => {
    const servId = getEffectiveServId();
    if (!servId || !canSave()) return;

    // Resolve display fields: from existing doc (edit) or from the selected service (create)
    const custDisplayName =
      effectiveDoc?.custDisplayName ??
      resolvedService?.program.customer.displayName ??
      "";
    const servCodeId =
      effectiveDoc?.servCodeId ??
      resolvedService?.servCode.servCodeId ??
      "";

    const doc: PriorityServiceDoc = {
      servId,
      note,
      custDisplayName,
      servCodeId,
      ...(dateMode === "single" ? { date: singleDate } : { dateRange }),
      createdAt: effectiveDoc?.createdAt ?? "",
      updatedAt: effectiveDoc?.updatedAt ?? "",
    };

    setSaveStatus("saving");
    await upsert(doc);
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    if (!isEditMode && customer) {
      clearCustomer(customer.custId);
    }
    onDone();
  };

  const handleCancel = () => {
    if (!isEditMode && customer) {
      clearCustomer(customer.custId);
    }
    onDone();
  };

  const handleDelete = async () => {
    const servId = getEffectiveServId();
    if (!servId) return;
    await deleteOne(servId);
    onDone();
  };

  return (
    <CardContent className="pt-4">
      <div className="space-y-3">
        {/* ── Service Lookup (create mode only) ── */}
        {!isEditMode && (
          <>
            <FormGroup>
              <Label>Customer ID</Label>
              <Input
                type="number"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter customer ID"
                value={custIdInput}
                onChange={(e) => setCustIdInput(e.target.value)}
                onBlur={handleCustIdBlur}
              />
            </FormGroup>

            <FormGroup>
              <Label>Program</Label>
              <Select
                value={selectedProgId?.toString() ?? ""}
                onValueChange={handleProgChange}
              >
                <SelectTrigger disabled={!customer}>
                  <SelectValue placeholder="Select program…" />
                </SelectTrigger>
                <SelectContent>
                  {customer?.programs.map((program) => (
                    <SelectItem
                      key={program.progId}
                      value={program.progId.toString()}
                    >
                      {program.progCode.progCodeId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Service</Label>
              <Select
                value={
                  resolvedServId !== null ? resolvedServId.toString() : ""
                }
                onValueChange={handleServChange}
              >
                <SelectTrigger disabled={!selectedProgram}>
                  <SelectValue placeholder="Select service…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleServices.map((service) => (
                    <SelectItem
                      key={service.servId}
                      value={service.servId.toString()}
                    >
                      {service.servCode.servCodeId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormGroup>

            <Separator />
          </>
        )}

        {/* ── Date ── */}
        <FormGroup>
          <Label>Date Type</Label>
          <RadioGroup
            variant="button-group"
            value={dateMode}
            onValueChange={(v) => setDateMode(v as "single" | "range")}
          >
            <RadioGroupItem value="single">Single Date</RadioGroupItem>
            <RadioGroupItem value="range">Date Range</RadioGroupItem>
          </RadioGroup>
        </FormGroup>

        {dateMode === "single" ? (
          <FormGroup>
            <Label>Date</Label>
            <DatePicker value={singleDate} onChange={setSingleDate} />
          </FormGroup>
        ) : (
          <FormGroup>
            <Label>Date Range</Label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </FormGroup>
        )}

        {/* ── Note ── */}
        <FormGroup>
          <Label>Note</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Add a note for the production manager…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormGroup>

        {/* ── Actions ── */}
        <div className="flex gap-2 items-center">
          <SaveButton
            disabled={!canSave()}
            status={saveStatus}
            onClick={handleSave}
            onSuccessComplete={handleSuccessComplete}
          >
            Save
          </SaveButton>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>

        {/* ── Delete (edit mode only) ── */}
        {isEditMode && (
          <>
            <Separator className="my-2" />
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                intensity="soft"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Remove Priority Flag
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Are you sure? This will remove the priority flag for this
                  service.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CardContent>
  );
}
