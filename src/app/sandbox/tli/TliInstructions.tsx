"use client";

import { useState } from "react";

export function TliInstructions() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
        <h2 className="text-lg font-bold">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80">
          <li>Click the link to open the program in Service Assistant.</li>
          <li>
            Change the salesperson to <strong>Luke</strong>.
          </li>
          <li>Repeat for each item in the list.</li>
          <li>
            Refresh the page as needed (or when you&apos;re done) to re-query
            and confirm all is dealt with.
          </li>
        </ol>
        <button
          onClick={() => setOpen(false)}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
