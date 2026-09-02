"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { customerSanitySelect } from "@/app/sanity/customerSanity/customerSanitySelect";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { sanityActions } from "@/app/sanity/sanitySlice";
import { cn } from "@/style/utils";

export function ExcludedProgCodeFilter() {
  const dispatch = useAppDispatch();
  const allProgCodeIds = useSelector(customerSanitySelect.allProgCodeIds);
  const excludedIds = useSelector(sanitySelect.excludedProgCodeIds);

  if (allProgCodeIds.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No customers loaded yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allProgCodeIds.map((id) => {
        const isExcluded = excludedIds.includes(id);
        return (
          <button
            key={id}
            onClick={() => dispatch(sanityActions.toggleExcludedProgCodeId(id))}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono font-medium transition-colors",
              isExcluded
                ? "border-destructive bg-destructive/10 text-destructive line-through"
                : "border-border bg-card text-foreground hover:bg-accent/10",
            )}
          >
            {id}
          </button>
        );
      })}
      {excludedIds.length > 0 && (
        <button
          onClick={() => dispatch(sanityActions.clearExcludedProgCodeIds())}
          className="text-xs text-primary hover:underline self-center"
        >
          Clear ({excludedIds.length})
        </button>
      )}
    </div>
  );
}
