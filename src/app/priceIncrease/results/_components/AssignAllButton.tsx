"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { FlagTriangleRight, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/style/components/dialog";
import { CustomerIncreaseResult } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";
import { customerIncreaseResultsSelect } from "@/app/priceIncrease/results/customerIncreaseResultsSelect";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { authActions, authSelect } from "@/app/auth/authSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { CustFlagAdd } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";

const ACTIVE_STATUSES = ["9"];

// ---------------------------------------------------------------------------
// Pre-flight analysis
// ---------------------------------------------------------------------------

type PreflightSummary = {
  conflictCount: number;
  eligibleCount: number;
  alreadyCorrectCount: number;
  overrideCount: number;
  exemptCount: number;
  /** Grouped by flagId — ready to pass to addFlags */
  assignments: CustFlagAdd[];
};

function analyzeResults(results: CustomerIncreaseResult[]): PreflightSummary {
  let conflictCount = 0;
  let eligibleCount = 0;
  let alreadyCorrectCount = 0;
  let overrideCount = 0;
  let exemptCount = 0;

  // Group eligible customers by flagId
  const byFlag = new Map<number, number[]>();

  for (const result of results) {
    const { preExistingFlagStatus, isExempt } = result.groupable;

    if (isExempt) {
      exemptCount++;
      continue;
    }

    if (preExistingFlagStatus === "conflict") {
      conflictCount++;
      continue;
    }

    if (preExistingFlagStatus === "matching") {
      alreadyCorrectCount++;
      continue;
    }

    if (preExistingFlagStatus === "override") {
      overrideCount++;
      continue;
    }

    // "none" — eligible for assignment
    if (result.resolvedFlag) {
      eligibleCount++;
      const existing = byFlag.get(result.resolvedFlag.flagId) ?? [];
      existing.push(result.customer.custId);
      byFlag.set(result.resolvedFlag.flagId, existing);
    }
  }

  const assignments: CustFlagAdd[] = Array.from(byFlag.entries()).map(([flagId, custIds]) => ({
    flagId,
    custIds,
  }));

  return { conflictCount, eligibleCount, alreadyCorrectCount, overrideCount, exemptCount, assignments };
}

// ---------------------------------------------------------------------------
// Dialog steps
// ---------------------------------------------------------------------------

type DialogStep = "preflight" | "password" | "success";

// ---------------------------------------------------------------------------
// AssignAllButton
// ---------------------------------------------------------------------------

/**
 * En masse flag assignment button for the By Customer view header.
 *
 * Pre-flight gate:
 * - Disabled when any customer has preExistingFlagStatus === "conflict"
 * - Disabled when no eligible customers exist
 *
 * On click: opens a Dialog with:
 * 1. Pre-flight summary (counts by status)
 * 2. Password re-entry for confirmation
 * 3. Success state after assignment completes
 */
export function AssignAllButton() {
  const results = useSelector(customerIncreaseResultsSelect.results);
  const currentUser = useSelector(authSelect.user);
  const increaseFlagMappings = useSelector(globalSettingsSelect.increaseFlagMappings);
  const exemptFlagId = useSelector(globalSettingsSelect.priceIncreaseExemptFlagId);
  const manualFlagId = useSelector(globalSettingsSelect.priceIncreaseManualFlagId);

  const flagIds = [
    ...increaseFlagMappings.map((m) => m.flagId),
    ...(exemptFlagId !== null ? [exemptFlagId] : []),
    ...(manualFlagId !== null ? [manualFlagId] : []),
  ];

  const { addFlags } = useCustFlag({ flagIds, custStatuses: ACTIVE_STATUSES });
  const { confirmPassword } = useAuth();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("preflight");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);

  const preflight = analyzeResults(results);
  const isDisabled = preflight.conflictCount > 0 || preflight.eligibleCount === 0;

  function handleOpen() {
    setStep("preflight");
    setPassword("");
    setShowPassword(false);
    setAuthError(null);
    setIsConfirming(false);
    setIsAssigning(false);
    setAssignedCount(0);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleConfirm() {
    if (!currentUser) return;
    setAuthError(null);
    setIsConfirming(true);

    try {
      const result = await confirmPassword({ password });

      if (authActions.confirmPassword.rejected.match(result)) {
        setAuthError("Unable to verify password. Please try again.");
        return;
      }

      if (!result.payload) {
        setAuthError("Incorrect password. Please try again.");
        return;
      }

      // Password confirmed — proceed with assignment
      setIsConfirming(false);
      setIsAssigning(true);

      await addFlags(preflight.assignments);

      const totalAssigned = preflight.assignments.reduce((sum, a) => sum + a.custIds.length, 0);
      setAssignedCount(totalAssigned);
      setIsAssigning(false);
      setStep("success");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      {/* Trigger button + inline gate messaging */}
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="primary"
          intensity="solid"
          size="sm"
          onClick={handleOpen}
          disabled={isDisabled}
          className="flex items-center gap-1.5"
        >
          <FlagTriangleRight className="h-3.5 w-3.5" />
          Assign All
        </Button>

        {/* Inline gate messaging below the button */}
        {preflight.conflictCount > 0 && (
          <span className="text-xs text-destructive">
            {preflight.conflictCount} conflict{preflight.conflictCount !== 1 ? "s" : ""} must be resolved in RealGreen first
          </span>
        )}
        {preflight.conflictCount === 0 && preflight.eligibleCount === 0 && (
          <span className="text-xs text-foreground/40">No customers need flag assignment</span>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "success" ? "Flags Assigned 🎉" : "Assign All Flags"}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Pre-flight summary */}
          {step === "preflight" && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-card p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">To assign</span>
                  <span className="font-medium text-foreground">{preflight.eligibleCount}</span>
                </div>
                {preflight.alreadyCorrectCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Already correct (skip)</span>
                    <span className="text-foreground/50">{preflight.alreadyCorrectCount}</span>
                  </div>
                )}
                {preflight.overrideCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Pre-existing override (skip)</span>
                    <span className="text-foreground/50">{preflight.overrideCount}</span>
                  </div>
                )}
                {preflight.exemptCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Exempt (excluded)</span>
                    <span className="text-foreground/50">{preflight.exemptCount}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-foreground/50">
                Flags will be written to RealGreen. This action cannot be undone automatically — flags must be removed manually in RealGreen if needed.
              </p>

              <DialogFooter>
                <Button variant="outline" intensity="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  intensity="solid"
                  size="sm"
                  onClick={() => setStep("password")}
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2: Password confirmation */}
          {step === "password" && (
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                Re-enter your password to confirm assigning{" "}
                <span className="font-medium text-foreground">{preflight.eligibleCount}</span>{" "}
                flag{preflight.eligibleCount !== 1 ? "s" : ""} in RealGreen.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="assign-all-password">Password</Label>
                <div className="relative">
                  <Input
                    id="assign-all-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setAuthError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password.length > 0 && !isConfirming && !isAssigning) {
                        handleConfirm();
                      }
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    autoCapitalize="off"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="text-xs text-destructive">{authError}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  intensity="ghost"
                  size="sm"
                  onClick={() => setStep("preflight")}
                  disabled={isConfirming || isAssigning}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  intensity="solid"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={password.length === 0 || isConfirming || isAssigning}
                >
                  {isConfirming || isAssigning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isConfirming ? "Verifying..." : "Assigning..."}
                    </>
                  ) : (
                    "Confirm & Assign"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-accent" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {assignedCount} flag{assignedCount !== 1 ? "s" : ""} assigned
                  </p>
                  {(preflight.alreadyCorrectCount > 0 || preflight.overrideCount > 0) && (
                    <p className="text-sm text-foreground/50 mt-1">
                      {[
                        preflight.alreadyCorrectCount > 0 && `${preflight.alreadyCorrectCount} already correct`,
                        preflight.overrideCount > 0 && `${preflight.overrideCount} override (skipped)`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="primary" intensity="solid" size="sm" onClick={handleClose}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
