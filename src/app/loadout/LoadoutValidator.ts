import { BaseValidator, ValidatorSchema } from "@/lib/validation/BaseValidator";
import { LoadoutBase } from "./LoadoutTypes";
import { LoadoutConstituent } from "./Mixture";

type LoadoutEquipment = LoadoutBase["masters"][number]["equipments"][number];

export type LoadoutPhase = "start" | "finish";

export class LoadoutValidator extends BaseValidator<LoadoutBase> {
  constructor(private phase: LoadoutPhase) {
    super();
  }

  protected schema: ValidatorSchema<LoadoutBase> = {
    masters: {
      // masters[].startAmount and finishAmount are derived from the route (ksf),
      // not user-entered fields — no validation needed here.
      equipments: {
        startAmount: {
          label: "Mix Product Start Amount",
          validate: ({ value, parent }: { value: number | null; parent: LoadoutEquipment }) => {
            if (this.phase !== "start") return null;

            // Skip validation for non-tank equipment (backpack, hose, etc.)
            if (!parent.appMethod.tracksTankLevel) return null;

            if (value === null) {
              // Identify the carrier by its position (constituents[0]) for the error label
              const carrierCode = parent.constituents[0]?.product.productCode ?? "equipment";
              return `Start amount is required for ${carrierCode}`;
            }

            return null;
          },
        },
        finishAmount: {
          label: "Carrier Product Finish Amount",
          validate: ({ value, parent }: { value: number | null; parent: LoadoutEquipment }) => {
            if (this.phase !== "finish") return null;

            // Skip validation for non-tank equipment
            if (!parent.appMethod.tracksTankLevel) return null;

            if (value === null) {
              const carrierCode = parent.constituents[0]?.product.productCode ?? "equipment";
              return `Finish amount is required for ${carrierCode}`;
            }

            if (parent.startAmount !== null && value > parent.startAmount) {
              return `Finish amount cannot be greater than start amount`;
            }

            return null;
          },
        },
        constituents: {
          startAmount: {
            label: "Constituent Start Amount",
            validate: ({ value, parent }: { value: number | null; parent: LoadoutConstituent }) => {
              if (this.phase !== "start") return null;

              if (value === null) {
                return `Start amount is required for ${parent.product.productCode}`;
              }

              return null;
            },
          },
          finishAmount: {
            label: "Constituent Finish Amount",
            validate: ({ value, parent }: { value: number | null; parent: LoadoutConstituent }) => {
              if (this.phase !== "finish") return null;

              if (value === null) {
                return `Finish amount is required for ${parent.product.productCode}`;
              }

              if (parent.startAmount !== null && value > parent.startAmount) {
                return `Finish amount cannot be greater than start amount`;
              }

              return null;
            },
          },
        },
      },
      subProducts: {
        startAmount: {
          label: "Sub Product Start Amount",
          validate: ({ value, parent }: { value: number | null; parent: LoadoutBase["masters"][number]["subProducts"][number] }) => {
            if (this.phase !== "start") return null;

            if (value === null) {
              return `Start amount is required for ${parent.product.productCode}`;
            }

            return null;
          },
        },
        finishAmount: {
          label: "Sub Product Finish Amount",
          validate: ({ value, parent }: { value: number | null; parent: LoadoutBase["masters"][number]["subProducts"][number] }) => {
            if (this.phase !== "finish") return null;

            if (value === null) {
              return `Finish amount is required for ${parent.product.productCode}`;
            }

            if (parent.startAmount !== null && value > parent.startAmount) {
              return `Finish amount cannot be greater than start amount`;
            }

            return null;
          },
        },
      },
    },
    singles: {
      startAmount: {
        label: "Single Product Start Amount",
        validate: ({ value, parent }: { value: number | null; parent: LoadoutBase["singles"][number] }) => {
          if (this.phase !== "start") return null;

          if (value === null) {
            return `Start amount is required for ${parent.product.productCode}`;
          }

          return null;
        },
      },
      finishAmount: {
        label: "Single Product Finish Amount",
        validate: ({ value, parent }: { value: number | null; parent: LoadoutBase["singles"][number] }) => {
          if (this.phase !== "finish") return null;

          if (value === null) {
            return `Finish amount is required for ${parent.product.productCode}`;
          }

          if (parent.startAmount !== null && value > parent.startAmount) {
            return `Finish amount cannot be greater than start amount`;
          }

          return null;
        },
      },
    },
    subProducts: {
      startAmount: {
        label: "Sub Product Start Amount",
        validate: ({ value, parent }: { value: number | null; parent: LoadoutBase["subProducts"][number] }) => {
          if (this.phase !== "start") return null;

          if (value === null) {
            return `Start amount is required for ${parent.product.productCode}`;
          }

          return null;
        },
      },
      finishAmount: {
        label: "Sub Product Finish Amount",
        validate: ({ value, parent }: { value: number | null; parent: LoadoutBase["subProducts"][number] }) => {
          if (this.phase !== "finish") return null;

          if (value === null) {
            return `Finish amount is required for ${parent.product.productCode}`;
          }

          if (parent.startAmount !== null && value > parent.startAmount) {
            return `Finish amount cannot be greater than start amount`;
          }

          return null;
        },
      },
    },
  };
}
