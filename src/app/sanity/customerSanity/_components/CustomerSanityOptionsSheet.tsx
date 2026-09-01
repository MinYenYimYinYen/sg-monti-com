"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { customerSanitySelect } from "@/app/sanity/customerSanity/customerSanitySelect";
import { sanityActions, CustomerSanitySortMode, CustomerSanitySortDirection } from "@/app/sanity/sanitySlice";
import { ExcludedProgCodeFilter } from "@/app/sanity/customerSanity/_components/ExcludedProgCodeFilter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Label } from "@/style/components/label";
import { Settings2 } from "lucide-react";

export function CustomerSanityOptionsSheet() {
  const dispatch = useAppDispatch();
  const sortMode = useSelector(customerSanitySelect.sortMode);
  const sortDirection = useSelector(customerSanitySelect.sortDirection);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" />
          Options
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Customer Sanity Options</SheetTitle>
        </SheetHeader>

        {/* Sort */}
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
        <section className="mb-6">
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

        {/* Exclude Prog Codes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exclude Prog Codes
            </p>
          </div>
          <Label className="text-xs text-muted-foreground block mb-2">
            Excluded codes are removed from combo keys before grouping.
          </Label>
          <ExcludedProgCodeFilter />
        </section>
      </SheetContent>
    </Sheet>
  );
}
