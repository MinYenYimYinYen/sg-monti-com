"use client";

import { Dialog, DialogContent } from "@/style/components/dialog";
import { PostSalesTaxPaymentForm } from "@/app/salesTax/salesTaxPosting/_components/PostSalesTaxPaymentForm";

/**
 * The dialog around the form. Radix unmounts the content when it closes, so the form's loads run
 * each time it opens and its state is reset each time it closes.
 */
export function PostSalesTaxPaymentDialog({
  isOpen,
  onOpenChangeAction,
  periodEnd,
  returnFileText,
}: {
  isOpen: boolean;
  onOpenChangeAction: (isOpen: boolean) => void;
  periodEnd: string;
  returnFileText: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChangeAction}>
      <DialogContent className="max-w-xl">
        <PostSalesTaxPaymentForm periodEnd={periodEnd} returnFileText={returnFileText} />
      </DialogContent>
    </Dialog>
  );
}
