import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { DatePicker } from "@/components/DatePicker";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
} from "@/components/MultiSelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

export function ChooseRouteDate() {
  const { setRouteDate } = useTechRoute();
  const routeDate = useSelector(techRouteSelect.routeDate);
  const routeDates = useSelector(techRouteSelect.routeDates);

  return (
    <MultiSelect
      value={routeDate ? [routeDate] : []}
      onValueChange={(date) => setRouteDate(date[0])}
    >
      <MultiSelectTrigger>
        {routeDate ? prettyDate(routeDate, "eee, MMM dd") : "Select Date"}
      </MultiSelectTrigger>
      <MultiSelectContent>
        {routeDates.map((date) => {
          return (
            <MultiSelectItem key={date} value={date}>
              <div>{prettyDate(date, "eee, MMM dd")}</div>
            </MultiSelectItem>
          );
        })}
      </MultiSelectContent>
    </MultiSelect>
    // <DatePicker
    //   className="w-full"
    //   value={routeDate ?? undefined}
    //   onChange={(date) => setRouteDate(date)}
    //   allowedDates={routeDates}
    // />
  );
}
