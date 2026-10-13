"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateActions } from "./formTemplateSlice";
import { FormTemplateEditor } from "./_components/FormTemplateEditor";

export default function FormTemplatePage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      formTemplateActions.getAll({
        params: {},
        config: { loadingMsg: "Loading form templates..." },
      }),
    );
  }, [dispatch]);

  return (
    <div className="h-full overflow-hidden">
      <FormTemplateEditor />
    </div>
  );
}
