import React from "react";
import { Ban, Check, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";

interface TabInfoProps {
  title: string;
  isProduction: boolean;
  isMobile: boolean;
  isMaster: boolean;
}

const TabInfoRow = ({ label, value }: { label: string; value: boolean }) => (
  <span className="grid grid-cols-[2rem_max-content] items-center justify-start">
    {value ? (
      <Check className="size-4 text-foreground" />
    ) : (
      <Ban className="size-4 text-muted-foreground" />
    )}
    <div>{label}</div>
  </span>
);

export const TabInfo = ({
  title,
  isProduction,
  isMobile,
  isMaster,
}: TabInfoProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Info className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2 text-sm">
          <p className="font-medium">
            {title} are recognized by the following settings in SA5:
          </p>
          <div className="text-muted-foreground">
            <TabInfoRow label="For Production" value={isProduction} />
            <TabInfoRow label="Mobile Device" value={isMobile} />
            <TabInfoRow label="Master Product" value={isMaster} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
