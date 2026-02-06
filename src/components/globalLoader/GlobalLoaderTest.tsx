"use client";

import React, { useEffect } from "react";
import { uiActions } from "@/store/reduxUtil/uiSlice";
import { GlobalLoader } from "@/components/globalLoader/GlobalLoader";
import { useAppDispatch } from "@/lib/hooks/redux";

export default function GlobalLoaderTest() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(uiActions.simulateLoading());
  }, [dispatch]);
  return (
    <div>
      <GlobalLoader />
    </div>
  );
}
