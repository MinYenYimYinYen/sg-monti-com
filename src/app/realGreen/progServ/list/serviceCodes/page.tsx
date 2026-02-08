"use client";
import React, { useMemo } from "react";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { DataGrid } from "@/components/DataGrid";
import { createServiceCodeColumns } from "@/app/realGreen/progServ/list/serviceCodes/createServiceCodeColumns";

export default function ListServiceCodes() {
  useProgServ({ autoLoad: true });
  const servCodes = useSelector(progServSelect.servCodes);

  const columns = useMemo(() => {
    return createServiceCodeColumns(
      (servCode) => {}
    )
  }, [])
  return (
    <Container variant={"page"}>
      <h2 className={"text-2xl font-semibold tracking-tight"}>Service Codes</h2>
      <p className={"text-sm text-muted-foreground"}>
        View and manage SA5 service code extensions.
      </p>
      <DataGrid data={servCodes} columns={columns} enableColumnResizing={false} />
    </Container>
  );
}