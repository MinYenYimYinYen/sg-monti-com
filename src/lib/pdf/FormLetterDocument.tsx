import { Document, Page } from "@react-pdf/renderer";
import { PositionedBox } from "@/lib/pdf/_components/PositionedBox";
import type { FormLetterTemplateDoc, FormLetterData } from "@/app/formTemplate/FormTemplateTypes";
import type { FieldDescriptor } from "@/app/formTemplate/formLetterDataTypes";

type FormLetterDocumentProps = {
  template: FormLetterTemplateDoc;
  data: FormLetterData;
  /** The feature's data contract — maps slot keys to their react-pdf renderers. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, FieldDescriptor<any>>;
};

/**
 * Generic PDF renderer for form letter templates.
 * Iterates template slots and delegates rendering to the contract's `render` function
 * for each slot key. The contract owns all rendering decisions; this component only
 * handles positioning via `PositionedBox`.
 *
 * Static slots (keys present in the contract but not in `data`) receive `undefined`
 * as their value — their renderers are expected to ignore it.
 */
export function FormLetterDocument({
  template,
  data,
  contract,
}: FormLetterDocumentProps) {
  return (
    <Document title={template.templateName}>
      <Page size={template.pageSize}>
        {template.slots.map((slot) => {
          const descriptor = contract[slot.key];
          if (!descriptor) return null;

          return (
            <PositionedBox
              key={slot.key}
              x={slot.x}
              y={slot.y}
              width={slot.width}
              height={slot.height}
            >
              {descriptor.render(data[slot.key])}
            </PositionedBox>
          );
        })}
      </Page>
    </Document>
  );
}
