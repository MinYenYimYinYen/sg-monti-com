"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { customerSanitySelect } from "@/app/sanity/customerSanity/customerSanitySelect";
import { sanityActions, CustomerSanitySortMode, CustomerSanitySortDirection } from "@/app/sanity/sanitySlice";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";

export function CustomerSanitySortControls() {
  const dispatch = useAppDispatch();
  const sortMode = useSelector(customerSanitySelect.sortMode);
  const sortDirection = useSelector(customerSanitySelect.sortDirection);

  return (
    <>
      {/* Sort By */}
      <section className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Sort By
        </p>
        <RadioGroup
          variant="button-group"
          value={sortMode}
          onValueChange={(value) =>
            dispatch(sanityActions.setSortMode(value as CustomerSanitySortMode))
          }
        >
          <RadioGroupItem value="byCustomerCount">
            Customer Count
          </RadioGroupItem>
          <RadioGroupItem value="byProgCodeCount">
            Prog Code Count
          </RadioGroupItem>
        </RadioGroup>
        <p className="text-xs text-muted-foreground mt-2">
          {sortMode === "byCustomerCount"
            ? "Primary: customer count → prog code count → alphabetical"
            : "Primary: prog code count → customer count → alphabetical"}
        </p>
      </section>

      {/* Sort Direction */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Direction
        </p>
        <RadioGroup
          variant="button-group"
          value={sortDirection}
          onValueChange={(value) =>
            dispatch(sanityActions.setSortDirection(value as CustomerSanitySortDirection))
          }
        >
          <RadioGroupItem value="asc">Ascending</RadioGroupItem>
          <RadioGroupItem value="desc">Descending</RadioGroupItem>
        </RadioGroup>
      </section>
    </>
  );
}
