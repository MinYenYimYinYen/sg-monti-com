"use client";

import { usePDF } from "@react-pdf/renderer";
import { Button } from "@/style/components/button";
import { Printer } from "lucide-react";
import { FormLetterDocument } from "@/lib/pdf/FormLetterDocument";
import type { FormLetterTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";
import type { AnyFieldDescriptor } from "@/app/formTemplate/formLetterDataTypes";

type SamplePdfDownloadProps = {
  draft: FormLetterTemplateDoc;
  sampleData: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, AnyFieldDescriptor<any>>;
};

/**
 * Renders a usePDF instance for the current draft + sample data and exposes a download button.
 * Filename: "sample-{dataType}.pdf"
 */
export function SamplePdfDownload({ draft, sampleData, contract }: SamplePdfDownloadProps) {
  const doc = (
    <FormLetterDocument
      template={draft}
      data={sampleData}
      contract={contract}
    />
  );

  const [instance] = usePDF({ document: doc });

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
