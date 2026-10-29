"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useFormTemplate } from "./useFormTemplate";
import { formTemplateSelect } from "./formTemplateSelect";
import { formTemplateActions } from "./formTemplateSlice";
import { makeNewTemplate } from "./formTemplateFactory";
import { FormTemplateEditor } from "./_components/FormTemplateEditor";
import { FormTemplateFileControls } from "./_components/FormTemplateFileControls";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { authSelect } from "@/app/auth/authSlice";
import { FORM_DATA_TYPE_REGISTRY } from "@/app/formDataTypes/formDataTypeRegistry";

const DEFAULT_DATA_TYPE = Object.keys(FORM_DATA_TYPE_REGISTRY)[0];

export default function FormTemplatePage() {
  const dispatch = useAppDispatch();
  const draft = useSelector(formTemplateSelect.draft);
  const saId = useSelector(authSelect.user)?.saId;
  useFormTemplate({ autoLoad: true });

  // The empty state is a blank form, so the editor always has a draft. Also recreates
  // the blank after a delete clears it. Waits for the user so the owner is never empty.
  useEffect(() => {
    if (!draft && saId) {
      dispatch(
        formTemplateActions.setDraft(makeNewTemplate({ dataType: DEFAULT_DATA_TYPE, saId })),
      );
    }
  }, [draft, saId, dispatch]);

  return (
    <PageLayout>
      <PageLayout.Header
        left={<FormTemplateFileControls defaultDataType={DEFAULT_DATA_TYPE} />}
      />
      <PageLayout.Body>
        <FormTemplateEditor dataTypeRegistry={FORM_DATA_TYPE_REGISTRY} />
      </PageLayout.Body>
    </PageLayout>
  );
}

