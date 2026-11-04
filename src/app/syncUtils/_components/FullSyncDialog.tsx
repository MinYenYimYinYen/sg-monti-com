"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
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
import { GROUP_LABELS, SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { StartFullSyncResult } from "@/app/syncUtils/_lib/useSyncGroup";

type DialogStep = "warning" | "password";

type FullSyncDialogProps = {
  group: SyncGroup;
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  /** Resolves once the server has verified the password and finished the wipe. */
  onConfirmAction: (password: string) => Promise<StartFullSyncResult>;
};

/**
 * Two-step confirmation for the destructive full sync. The password is verified on the
 * server as part of the same request that wipes, so it cannot be bypassed by calling the API.
 * Remount with a new `key` to reset (the parent keys it on `open`).
 */
export function FullSyncDialog({ group, open, onOpenChangeAction, onConfirmAction }: FullSyncDialogProps) {
  const [step, setStep] = useState<DialogStep>("warning");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupLabel = GROUP_LABELS[group];

  async function handleConfirm() {
    if (password.length === 0 || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await onConfirmAction(password);
    setIsSubmitting(false);
    if (result.ok) {
      onOpenChangeAction(false);
    } else {
      setErrorMessage(result.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChangeAction(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Full Sync: {groupLabel}</DialogTitle>
        </DialogHeader>

        {step === "warning" && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-2 text-foreground/80">
                <p>
                  This <span className="font-semibold text-foreground">deletes every {groupLabel} record</span> in
                  the mirror, then reloads them all from RealGreen.
                </p>
                <p>
                  Until it finishes, mirror queries return an error and delta syncs are paused. A full load can
                  take a long time. Leave this page open while it runs.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" intensity="ghost" size="sm" onClick={() => onOpenChangeAction(false)}>
                Cancel
              </Button>
              <Button variant="destructive" intensity="solid" size="sm" onClick={() => setStep("password")}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">Re-enter your password to confirm the full sync.</p>

            <div className="space-y-1.5">
              <Label htmlFor="full-sync-password">Password</Label>
              <div className="relative">
                <Input
                  id="full-sync-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoCapitalize="off"
                  className="pr-10"
                  autoFocus
                  disabled={isSubmitting}
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
              {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                intensity="ghost"
                size="sm"
                onClick={() => setStep("warning")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                intensity="solid"
                size="sm"
                onClick={handleConfirm}
                disabled={password.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Confirm & Clear"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
