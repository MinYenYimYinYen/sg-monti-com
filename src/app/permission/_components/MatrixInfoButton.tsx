"use client";

import { Info } from "lucide-react";
import { Button } from "@/style/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";

type MatrixInfoButtonProps = {
  name: string;
  description: string;
};

/** An info button that opens a group's or resource's description. Rendered only when there is one. */
export function MatrixInfoButton({ name, description }: MatrixInfoButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="primary"
          intensity="ghost"
          className="h-6 w-6"
          aria-label={`About ${name}`}
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm text-foreground">
        {description}
      </PopoverContent>
    </Popover>
  );
}
