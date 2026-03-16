import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";
import { Label } from "@/style/components/label";

type FieldKey = "groundSpeed" | "patternWidth" | "flowRate" | "coverage";

interface FieldSelectorProps {
  selectedFields: FieldKey[];
  onSelectionChange: (fields: FieldKey[]) => void;
}

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "groundSpeed", label: "Ground Speed" },
  { key: "patternWidth", label: "Pattern Width" },
  { key: "flowRate", label: "Flow Rate" },
  { key: "coverage", label: "Coverage" },
];

export function FieldSelector({
  selectedFields,
  onSelectionChange,
}: FieldSelectorProps) {
  const handleValueChange = (values: string[]) => {
    // Ensure exactly 3 fields are selected
    if (values.length <= 3) {
      onSelectionChange(values as FieldKey[]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Select 3 Known Fields (the 4th will be calculated)</Label>
      <ToggleGroup
        type="multiple"
        value={selectedFields}
        onValueChange={handleValueChange}
        className="flex-wrap justify-start"
      >
        {FIELDS.map((field) => (
          <ToggleGroupItem
            key={field.key}
            value={field.key}
            aria-label={`Toggle ${field.label}`}
            disabled={
              selectedFields.length === 3 && !selectedFields.includes(field.key)
            }
          >
            {field.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {selectedFields.length < 3 && (
        <p className="text-sm text-muted-foreground">
          Select {3 - selectedFields.length} more field
          {3 - selectedFields.length !== 1 ? "s" : ""}
        </p>
      )}
      {selectedFields.length === 3 && (
        <p className="text-sm text-green-600">
          Ready to calculate:{" "}
          {FIELDS.find((f) => !selectedFields.includes(f.key))?.label}
        </p>
      )}
    </div>
  );
}

export type { FieldKey };
