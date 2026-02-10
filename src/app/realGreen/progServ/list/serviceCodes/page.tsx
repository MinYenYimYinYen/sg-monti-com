"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { DataGrid } from "@/components/DataGrid";
import { createServiceCodeColumns } from "@/app/realGreen/progServ/list/serviceCodes/createServiceCodeColumns";
import { Button } from "@/style/components/button";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import {EditDefaultProducts} from "@/app/realGreen/progServ/_lib/components/servCodeEditor/servCodeEditor";

export default function ListServiceCodes() {
  const {saveServCodeChanges} = useProgServ({ autoLoad: true });
  const servCodes = useSelector(progServSelect.servCodes);

  const unsavedChanges = useSelector(servCodeLookup.unsavedChanges);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const handleSave = async () => {
    setSaveStatus("saving")
    try {
      await saveServCodeChanges(unsavedChanges)
      setSaveStatus("success")
    }
    catch (error) {
      console.error("Failed to save changes", error)
      setSaveStatus("idle")
    }
  }
  
  const [editServCodeId, setEditServCodeId] = useState<string>("");

  const columns = useMemo(() => {
    return createServiceCodeColumns((servCode) => setEditServCodeId(servCode));
  }, []);

  return (
    <Container variant={"page"} className={"relative"} >
      <div className={"flex items-center justify-start gap-2 sticky top-15 z-40 bg-background pb-4"}>
        <h2 className={"text-2xl font-semibold tracking-tight"}>
          Service Codes
        </h2>
        <SaveButton
          className={"w-[12rem]"}
          disabled={unsavedChanges.length === 0}
          status={saveStatus}
          onClick={handleSave}
          onSuccessComplete={() => setSaveStatus("idle")}
        >Save Changes</SaveButton>
      </div>
      <p className={"text-sm text-muted-foreground"}>
        View and manage SA5 service code extensions.
      </p>
      <DataGrid
        data={servCodes}
        columns={columns}
        enableColumnResizing={true}
      />
      {editServCodeId && (
        <EditDefaultProducts 
          key={editServCodeId} 
          servCodeId={editServCodeId} 
          onClose={() => setEditServCodeId("")}
        />
      )}
    </Container>
  );
}
