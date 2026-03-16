import { Label } from "@/style/components/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/style/components/popover";
import { Info } from "lucide-react";
import { useSelector } from "react-redux";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { FieldKey } from "@/app/realGreen/product/appMethod/appMethodCreate/FieldSelector";
import { camelDisplay } from "@/lib/primatives/string/camelDisplay";

interface FieldLabelProps {
  label: FieldKey;
  helpText: string;
}

export function FieldLabel({ label, helpText }: FieldLabelProps) {
  const solveForField = useSelector(solverSelect.solveForField);
  const validation = useSelector(solverSelect.validation);

  return (
    <div className="flex items-center gap-2">
      <Label>{camelDisplay(label)}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex">
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-[10000]">
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">{helpText}</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
