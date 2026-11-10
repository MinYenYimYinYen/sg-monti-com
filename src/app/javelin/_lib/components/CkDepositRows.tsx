"use client";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { DatePicker } from "@/components/DatePicker";
import { ckDepositSelect } from "@/app/javelin/ckDepositSelect";
import { ckDepositActions } from "@/app/javelin/ckDepositSlice";
import { formatCents } from "@/app/javelin/_lib/latestUtils";

// Spin arrows would invite scrolling or clicking a total by accident, and amounts are typed.
const NUMBER_INPUT_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/**
 * Fast entry for checking deposits. Tab goes date -> amount -> the next row's date, and Tab out of
 * a filled amount on the last row adds a row first. Every field selects its text on focus, so
 * typing over a value needs no clearing. The date field takes shorthand (1027, 10/27, today).
 */
export function CkDepositRows() {
  const dispatch = useAppDispatch();
  const rows = useSelector(ckDepositSelect.rows);
  const summary = useSelector(ckDepositSelect.summary);

  const handleAmountKeyDown = ({
    event,
    rowIndex,
  }: {
    event: React.KeyboardEvent<HTMLInputElement>;
    rowIndex: number;
  }) => {
    const isLastRow = rowIndex === rows.length - 1;
    if (event.key !== "Tab" || event.shiftKey || !isLastRow) return;
    if (event.currentTarget.value.trim() === "") return;
    // Without this the browser's own Tab would run after the new row takes focus and skip its date.
    event.preventDefault();
    dispatch(ckDepositActions.addRow());
  };

  return (
    <div className="mb-4 space-y-2">
      <div className="grid max-w-md grid-cols-[9rem_10rem_2.5rem] items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Date</span>
        <span>Deposit total</span>
        <span />
      </div>

      {rows.map((row, rowIndex) => {
        const isNewestRow = rowIndex === rows.length - 1 && rows.length > 1;
        return (
          <div
            // Rows have no natural key and are only ever added or removed at known positions.
            key={rowIndex}
            className="grid max-w-md grid-cols-[9rem_10rem_2.5rem] items-center gap-2"
          >
            <DatePicker
              hideCalendar
              className="w-full"
              value={row.date}
              autoFocus={isNewestRow}
              onChange={(date) => dispatch(ckDepositActions.setDate({ index: rowIndex, date }))}
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className={NUMBER_INPUT_CLASS}
              value={row.amount}
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                dispatch(
                  ckDepositActions.setAmount({ index: rowIndex, amount: event.target.value }),
                )
              }
              onKeyDown={(event) => handleAmountKeyDown({ event, rowIndex })}
            />
            <Button
              variant="primary"
              intensity="ghost"
              size="icon"
              tabIndex={-1}
              aria-label="Remove deposit"
              onClick={() => dispatch(ckDepositActions.removeRow(rowIndex))}
            >
              <X />
            </Button>
          </div>
        );
      })}

      <p className="text-sm text-muted-foreground">
        {summary.rows.length} deposit{summary.rows.length === 1 ? "" : "s"},{" "}
        {formatCents(summary.totalCents)}
        {summary.incompleteCount > 0 &&
          `. ${summary.incompleteCount} row${summary.incompleteCount === 1 ? " needs" : "s need"} both a date and an amount.`}
      </p>
    </div>
  );
}
