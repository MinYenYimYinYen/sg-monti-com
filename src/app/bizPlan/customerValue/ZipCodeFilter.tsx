"use client";

import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { customerValueFilterSelect } from "@/app/bizPlan/customerValue/customerValueFilterSelect";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { customerValueFilterActions } from "@/app/bizPlan/customerValue/customerValueFilterSlice";

const STORAGE_KEY = "customerValueFilter.selectedZips";

export function ZipCodeFilter() {
  const dispatch = useAppDispatch();
  const allZipCodes = useSelector(customerValueFilterSelect.allZipCodes);
  const selectedZips = useSelector(customerValueFilterSelect.selectedZips);
  const customerCountByZip = useSelector(customerValueFilterSelect.customerCountByZip);
  const zipCodeMap = useSelector(zipCodeSelect.zipCodeMap);

  const [hasSaved, setHasSaved] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });

  // Default to all selected on first load (null = uninitialized)
  useEffect(() => {
    if (selectedZips === null && allZipCodes.length > 0) {
      dispatch(customerValueFilterActions.setSelectedZips(allZipCodes));
    }
  }, [dispatch, allZipCodes, selectedZips]);

  const selectedSet = new Set(selectedZips ?? []);

  const handleToggle = (zip: string) => {
    dispatch(customerValueFilterActions.toggleZip(zip));
  };

  const handleSelectAll = () => {
    dispatch(customerValueFilterActions.setSelectedZips(allZipCodes));
  };

  const handleSelectNone = () => {
    dispatch(customerValueFilterActions.selectNone());
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedZips ?? []));
      setHasSaved(true);
    } catch {
      // localStorage unavailable — silently ignore
    }
  };

  const handleRecall = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as string[];
      dispatch(customerValueFilterActions.setSelectedZips(saved));
    } catch {
      // Corrupt data — silently ignore
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border shrink-0 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Zip Codes
        </p>
        <div className="flex gap-1">
          <Button
            variant="primary"
            intensity="soft"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleSelectAll}
          >
            All
          </Button>
          <Button
            variant="outline"
            intensity="soft"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleSelectNone}
          >
            None
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant="accent"
            intensity="soft"
            size="sm"
            className="flex-1 text-xs gap-1"
            onClick={handleSave}
          >
            <Bookmark className="h-3 w-3" />
            Save
          </Button>
          <Button
            variant="accent"
            intensity="soft"
            size="sm"
            className="flex-1 text-xs gap-1"
            onClick={handleRecall}
            disabled={!hasSaved}
          >
            <BookmarkCheck className="h-3 w-3" />
            Recall
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {allZipCodes.map((zip) => {
          const city = zipCodeMap.get(zip)?.city ?? "";
          return (
            <label
              key={zip}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/10"
            >
              <Checkbox
                checked={selectedSet.has(zip)}
                onCheckedChange={() => handleToggle(zip)}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-xs">{zip}</span>
                {city && (
                  <span className="text-muted-foreground text-xs truncate">{city}</span>
                )}
              </div>
              <span className="text-muted-foreground text-xs ml-auto shrink-0">
                {customerCountByZip.get(zip) ?? 0}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
