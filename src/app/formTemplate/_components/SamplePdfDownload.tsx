"use client";

import { useEffect } from "react";
import { usePDF } from "@react-pdf/renderer";
import { Button } from "@/style/components/button";
import { Printer } from "lucide-react";
import { FormDocument } from "@/lib/pdf/FormDocument";
import type { FormTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";
import type { AnyFieldDescriptor } from "@/app/formTemplate/formDataContract";

type SamplePdfDownloadProps = {
  draft: FormTemplateDoc;
  sampleData: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, AnyFieldDescriptor<any>>;
};

/**
 * Renders a usePDF instance for the current draft + sample data and exposes a download button.
 * Filename: "sample-{dataType}.pdf"
 */
export function SamplePdfDownload({ draft, sampleData, contract }: SamplePdfDownloadProps) {
  // usePDF reads its `document` argument only once, on mount, so later edits to the
  // draft would never reach the PDF. Pushing each new document through the update
  // function (as react-pdf's own PDFViewer does) keeps the download current.
  const [instance, updateInstance] = usePDF();

  useEffect(() => {
    updateInstance(
      <FormDocument
        template={draft}
        data={sampleData}
        contract={contract}
      />,
    );
  }, [draft, sampleData, contract, updateInstance]);

  const filename = `sample-${draft.dataType}.pdf`;

  if (instance.loading) {
    return (
      <Button size="sm" variant="outline" intensity="ghost" disabled>
        <Printer className="h-3 w-3 mr-1" />
        Generating...
      </Button>
    );
  }

  if (instance.error || !instance.url) {
    return (
      <Button size="sm" variant="destructive" intensity="ghost" disabled title={instance.error ?? "PDF error"}>
        <Printer className="h-3 w-3 mr-1" />
        PDF Error
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" intensity="ghost" asChild title="Download sample PDF">
      <a href={instance.url} download={filename}>
        <Printer className="h-3 w-3 mr-1" />
        Print Sample
      </a>
    </Button>
  );
}
