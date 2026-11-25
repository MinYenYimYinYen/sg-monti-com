"use client";

import { useEffect } from "react";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useTimeCard } from "@/app/timeCard/useTimeCard";

/** Everything the timeCard shell and its tabs need loaded. Called only from `layout.tsx`. */
export function useTimeCardDeps() {
  const { fetchLastImportedDate } = useTimeCard();
  useEmployee({ autoLoad: true });

  useEffect(() => {
    fetchLastImportedDate();
  }, [fetchLastImportedDate]);
}
