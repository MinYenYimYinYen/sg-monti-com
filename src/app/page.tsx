"use client";
import { AppDispatch, AppState } from "@/store";
import { useDispatch, useSelector } from "react-redux";
import {
  activeCustomersActions,
  activeCustomersSelect,
} from "@/app/realGreen/customer/slices/activeCustomersSlice";
import { useEffect } from "react";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(
      activeCustomersActions.getCustDocs({
        params: {
          schemeName: "activeCustomers",
        },
      }),
    );
  }, [dispatch]);

  const { services } = useActiveCustomers();
  console.log(services);

  return (
    <div>
      <div>Hello</div>
    </div>
  );
}
