import { Document } from "@react-pdf/renderer";
import { FormPage } from "@/lib/pdf/FormPage";
import type { FormTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";
import type { AnyFieldDescriptor } from "@/app/formTemplate/formDataContract";

type FormBatchDocumentProps = {
  template: FormTemplateDoc;
  /** One data object per page, already hydrated. Page order follows array order. */
  dataItems: unknown[];
  contract: Record<string, AnyFieldDescriptor<any>>;
};

/** Mail-merge document: the same template rendered once per data object, one page each. */
export function FormBatchDocument({ template, dataItems, contract }: FormBatchDocumentProps) {
  return (
    <Document title={template.templateName}>
      {dataItems.map((data, pageIndex) => (
        <FormPage key={pageIndex} template={template} data={data} contract={contract} />
      ))}
    </Document>
  );
}
