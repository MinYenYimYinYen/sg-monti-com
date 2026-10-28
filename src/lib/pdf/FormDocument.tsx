import { Document, Page } from "@react-pdf/renderer";
import { PositionedBox } from "@/lib/pdf/_components/PositionedBox";
import type { FormTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";
import { hasOptions, type AnyFieldDescriptor } from "@/app/formTemplate/formDataContract";
import { getSchemaDefaults } from "@/app/formTemplate/slotOptionSchema";

type FormDocumentProps = {
  template: FormTemplateDoc;
  /** The full data object passed to every slot renderer. */
  data: unknown;
  /** The feature's data contract — maps slot keys to their react-pdf renderers. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, AnyFieldDescriptor<any>>;
};

/**
 * Generic PDF renderer for form templates.
 * Iterates template slots and delegates rendering to the contract's `render` function
 * for each slot key. The contract owns all rendering decisions; this component only
 * handles positioning via `PositionedBox`.
 *
 * For descriptors with `optionSchema`, the slot's stored options are merged with
 * schema defaults before being passed to the renderer. This ensures renderers always
 * receive a fully populated options object even if the slot predates an option being added.
 */
export function FormDocument({
  template,
  data,
  contract,
}: FormDocumentProps) {
  return (
    <Document title={template.templateName}>
      <Page size={template.pageSize}>
        {template.slots.map((slot) => {
          const descriptor = contract[slot.key];
          if (!descriptor) return null;

          let rendered: React.ReactNode;
          if (hasOptions(descriptor)) {
            const defaults = getSchemaDefaults(descriptor.optionSchema);
            const options = { ...defaults, ...(slot.options ?? {}) };
            rendered = descriptor.render(data, options);
          } else {
            rendered = descriptor.render(data);
          }

          return (
            <PositionedBox
              key={slot.slotId}
              x={slot.x}
              y={slot.y}
              width={slot.width}
              height={slot.height}
            >
              {rendered}
            </PositionedBox>
          );
        })}
      </Page>
    </Document>
  );
}
