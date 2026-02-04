import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { SelectGroup } from "@radix-ui/react-select";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useSelector } from "react-redux";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { Flag } from "@/app/realGreen/flag/FlagTypes";
import { cn } from "@/lib/utils";

type FlagSelectorProps = {
  onValueChange?: (flagId: number, flag: Flag) => void;
  containerClass?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  groupClassName?: string;
};

export default function FlagSelector({
  onValueChange = () => {},
  containerClass,
  triggerClassName,
  contentClassName,
  itemClassName,
  groupClassName,
}: FlagSelectorProps) {
  useFlag({ autoLoad: true });
  const flags = useSelector(flagSelect.flags);
  const flagMap = useSelector(flagSelect.flagMap);

  const handleValueChange = (value: string) => {
    const flagId: number = Number(value);
    const flag = flagMap.get(flagId)!;
    onValueChange(flagId, flag);
  };

  return (
    <div className={cn("w-full", containerClass)}>
      <Select onValueChange={handleValueChange}>
        <SelectTrigger className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder={"Select Flag"} />
        </SelectTrigger>
        <SelectContent className={cn(contentClassName)}>
          <SelectGroup className={groupClassName}>
            {flags.map((flag) => (
              <SelectItem
                key={flag.flagId}
                value={flag.flagId.toString()}
                className={itemClassName}
              >
                {flag.desc}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
