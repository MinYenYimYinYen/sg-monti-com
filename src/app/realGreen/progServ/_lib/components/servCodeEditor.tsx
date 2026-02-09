import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Input } from "@/style/components/input";
import { Toggle } from "@/style/components/toggle";
import { ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { useEffect } from "react";

interface EditServCodeProps {
  servCodeId: string;
}

export function EditServCodeDates({ servCodeId }: EditServCodeProps) {
  const { updateServCode } = useProgServ({});
  const servCode = useSelector(servCodeLookup.byId(servCodeId));

  if (!servCode) return null;
  return (
    <div>
      <DateRangePicker
        value={servCode.dateRange}
        onChange={(dateRange) => updateServCode({ servCodeId, dateRange })}
      />
    </div>
  );
}

export function EditAlwaysAsap({ servCodeId }: EditServCodeProps) {
  const { updateServCode } = useProgServ({});
  const servCode = useSelector(servCodeLookup.byId(servCodeId));

  if (!servCode) return null;

  return (
    <div>
      <Toggle
        pressed={servCode.alwaysAsap}
        onPressedChange={(value) =>
          updateServCode({ servCodeId, alwaysAsap: value })
        }
        className="data-[state=on]:bg-destructive/20 data-[state=on]:text-destructive"
      >
        <ShieldAlert className="h-4 w-4" />
      </Toggle>
    </div>
  );
}
