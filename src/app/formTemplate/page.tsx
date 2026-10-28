"use client";

import { useFormTemplate } from "./useFormTemplate";
import { FormTemplateEditor } from "./_components/FormTemplateEditor";
import { FORM_DATA_TYPE_REGISTRY } from "@/app/formDataTypes/formDataTypeRegistry";

export default function FormTemplatePage() {
  useFormTemplate({ autoLoad: true });

  return (
    <div className="h-full overflow-hidden">
      <FormTemplateEditor dataTypeRegistry={FORM_DATA_TYPE_REGISTRY} />
    </div>
  );
}
