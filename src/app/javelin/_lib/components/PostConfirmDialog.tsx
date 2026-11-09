"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/style/components/alert-dialog";
import { Button } from "@/style/components/button";
import { formatCents } from "@/app/javelin/_lib/latestUtils";

/**
 * Posting creates real journal entries in the live books, so it is confirmed with the count and
 * total first. The server re-derives and re-checks every entry; this only shows what to expect.
 */
export function PostConfirmDialog({
  count,
  totalCents,
  noun,
  disabled,
  confirmAction,
}: {
  count: number;
  totalCents: number;
  noun: string;
  disabled: boolean;
  confirmAction: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="accent" intensity="solid" disabled={disabled}>
          Post to QuickBooks
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Post to QuickBooks?</AlertDialogTitle>
          <AlertDialogDescription>
            This creates {count} {noun}
            {count === 1 ? "" : "s"} in the live books, totalling {formatCents(totalCents)} in
            debits. Entries already posted are never sent again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmAction}>
            Post {count} {noun}
            {count === 1 ? "" : "s"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
