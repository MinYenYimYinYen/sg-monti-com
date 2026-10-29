import { Document } from "@react-pdf/renderer";
import { FormPage } from "@/lib/pdf/FormPage";
import type { FormTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";
import type { AnyFieldDescriptor } from "@/app/formTemplate/formDataContract";

type FormDocumentProps = {
  template: FormTemplateDoc;
  /** The full data object passed to every slot renderer. */
  data: unknown;
  /** The feature's data contract — maps slot keys to their react-pdf renderers. */
  contract: Record<string, AnyFieldDescriptor<any>>;
};

/**
 * Generic PDF renderer for one form template page. The slot loop lives in `FormPage`,
 * shared with `FormBatchDocument`.
 */
export function FormDocument({
  template,
  data,
  contract,
}: FormDocumentProps) {
  return (
    <Document title={template.templateName}>
      <FormPage template={template} data={data} contract={contract} />
    </Document>
  );
}
