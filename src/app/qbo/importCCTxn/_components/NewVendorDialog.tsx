"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";
import { qboMergedSelect } from "@/app/qbo/_lib/qboMergedSelect";
import { describeUsedNameEntity, findUsedName } from "@/app/qbo/_lib/qboNameUtils";
import {
  findVendorByName,
  normalizeVendorName,
  validateVendorName,
} from "@/app/qbo/vendor/_lib/qboVendorUtils";

/**
 * Creates a vendor in the live QuickBooks books. Admin only: the parent only offers it to
 * admins, and the server refuses anyone else. The name starts blank on purpose, so capital
 * letters are whatever the admin types and stay consistent. The merchant's description is shown
 * above it for reference. Mount it only while open, so its state starts fresh each time.
 */
export function NewVendorDialog({
  merchantDescription,
  onUseVendorAction,
  onCloseAction,
}: {
  merchantDescription: string;
  onUseVendorAction: (vendorId: string) => void;
  onCloseAction: () => void;
}) {
  const vendors = useSelector(qboVendorSelect.vendors);
  const usedNames = useSelector(qboMergedSelect.usedNames);
  const status = useSelector(qboVendorSelect.vendorCreateStatus);
  const result = useSelector(qboVendorSelect.vendorCreateResult);
  const { createVendor, resetVendorCreate } = useQboVendor({ autoLoad: false });
  const [name, setName] = useState("");

  const cleanName = normalizeVendorName(name);
  const problem = name.length > 0 ? validateVendorName(name) : null;
  const existing = findVendorByName({ vendors, displayName: name });
  // A customer or employee holding the name blocks it just as a vendor does.
  const usedName = findUsedName({ usedNames, name });
  const heldByOther = usedName && usedName.entityType !== "Vendor" ? usedName : null;
  const isPending = status === "pending";
  const isSettled = status === "settled" && result !== null;
  const canCreate =
    cleanName.length > 0 && !problem && !existing && !heldByOther && !isPending && !isSettled;

  const close = () => {
    resetVendorCreate();
    onCloseAction();
  };

  const chooseVendor = (vendorId: string) => {
    resetVendorCreate();
    onUseVendorAction(vendorId);
  };

  const renderOutcome = () => {
    if (result?.status === "created") {
      return (
        <div className="space-y-2 rounded-md border border-border bg-accent/10 p-3 text-sm">
          <div className="text-foreground">
            Created <span className="font-semibold">{result.vendor.DisplayName}</span> in QuickBooks.
          </div>
          <Button variant="primary" onClick={() => chooseVendor(result.vendor.Id)}>
            Use this vendor
          </Button>
        </div>
      );
    }
    if (result?.status === "exists") {
      return (
        <div className="space-y-2 rounded-md border border-border bg-accent/10 p-3 text-sm">
          <div className="text-foreground">
            QuickBooks already has <span className="font-semibold">{result.vendor.DisplayName}</span>.
            Nothing was created.
          </div>
          <Button variant="primary" onClick={() => chooseVendor(result.vendor.Id)}>
            Use this vendor
          </Button>
        </div>
      );
    }
    if (result?.status === "unavailable") {
      return <div className="text-sm text-destructive">{result.message}</div>;
    }
    return null;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New QuickBooks vendor</DialogTitle>
          <DialogDescription>
            Merchant on the statement:{" "}
            <span className="font-mono font-semibold text-foreground">{merchantDescription}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            autoFocus
            aria-label="Vendor name"
            placeholder="Vendor name, exactly as it should appear in QuickBooks"
            value={name}
            disabled={isPending || isSettled}
            onChange={(event) => setName(event.target.value)}
          />

          {problem && <div className="text-sm text-destructive">{problem}</div>}

          {!isSettled && heldByOther && (
            <div className="rounded-md border border-border bg-secondary/10 p-3 text-sm text-foreground">
              <span className="font-semibold">{heldByOther.name}</span> is already{" "}
              {describeUsedNameEntity(heldByOther)} in QuickBooks. Every customer, vendor and
              employee needs a different name.
            </div>
          )}

          {!isSettled && existing && (
            <div className="space-y-2 rounded-md border border-border bg-secondary/10 p-3 text-sm">
              {existing.Active ? (
                <>
                  <div className="text-foreground">
                    <span className="font-semibold">{existing.DisplayName}</span> already exists in
                    QuickBooks.
                  </div>
                  <Button variant="primary" intensity="soft" onClick={() => chooseVendor(existing.Id)}>
                    Use the existing vendor
                  </Button>
                </>
              ) : (
                <div className="text-foreground">
                  <span className="font-semibold">{existing.DisplayName}</span> exists in QuickBooks
                  but is inactive. Reactivate it in QuickBooks, then reload the vendors. This app
                  does not change existing vendors.
                </div>
              )}
            </div>
          )}

          {canCreate && (
            <p className="text-sm text-muted-foreground">
              This creates a vendor named <span className="font-semibold">{cleanName}</span> in the
              live QuickBooks books. This app cannot rename or delete it afterwards.
            </p>
          )}

          {renderOutcome()}
          {status === "error" && (
            <div className="text-sm text-destructive">
              The request failed. Check the message shown, then try again.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {isSettled ? "Close" : "Cancel"}
          </Button>
          {!isSettled && (
            <Button variant="primary" disabled={!canCreate} onClick={() => createVendor(cleanName)}>
              Create vendor
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
