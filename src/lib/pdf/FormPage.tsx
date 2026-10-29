import { Page } from "@react-pdf/renderer";
import { PositionedBox } from "@/lib/pdf/_components/PositionedBox";
import type { FormTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";
import { hasOptions, type AnyFieldDescriptor } from "@/app/formTemplate/formDataContract";
import { getSchemaDefaults } from "@/app/formTemplate/slotOptionSchema";

type FormPageProps = {
  template: FormTemplateDoc;
  /** The full data object passed to every slot renderer. */
  data: unknown;
  contract: Record<string, AnyFieldDescriptor<any>>;
};

/**
 * One page of a form template. Shared by `FormDocument` (one page) and `FormBatchDocument`
 * (many pages) so the two can never render a slot differently.
 *
 * For descriptors with `optionSchema`, the slot's stored options are merged with schema
 * defaults before being passed to the renderer, so a slot that predates an option still
 * receives a fully populated options object.
 */
export function FormPage({ template, data, contract }: FormPageProps) {
  return (
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
  );
}
