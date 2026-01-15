"use client";

import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { uiActions } from "@/store/reduxUtil/uiSlice";
import { GlobalLoader } from "@/components/globalLoader/GlobalLoader";

export default function GlobalLoaderTest() {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(uiActions.simulateLoading());
  }, [dispatch]);
  return (
    <div>
      <GlobalLoader />
    </div>
  );
}
