import { BaseValidator, ValidatorSchema } from "@/lib/validation/BaseValidator";
import { LoadoutBase } from "./LoadoutTypes";

type EquipmentEntry = LoadoutBase["masters"][number]["equipments"][number];

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
          validate: ({ value, parent }: { value: number | null; parent: EquipmentEntry }) => {
            if (this.phase !== "start") return null;

            // Skip validation for non-tank equipment (backpack, hose, etc.)
            if (!parent.appMethod.tracksTankLevel) return null;

            if (value === null) {
              return `Start amount is required for ${parent.mixProduct.productCode}`;
            }

            return null;
          },
        },
        finishAmount: {
          label: "Mix Product Finish Amount",
          validate: ({ value, parent }: { value: number | null; parent: EquipmentEntry }) => {
            if (this.phase !== "finish") return null;

            // Skip validation for non-tank equipment
            if (!parent.appMethod.tracksTankLevel) return null;

            if (value === null) {
              return `Finish amount is required for ${parent.mixProduct.productCode}`;
            }

            if (parent.startAmount !== null && value > parent.startAmount) {
              return `Finish amount cannot be greater than start amount (${parent.startAmount})`;
            }

            return null;
          },
        },
        subProducts: {
          startAmount: {
            label: "Sub Product Start Amount",
            validate: ({ value, parent }) => {
              if (this.phase !== "start") return null;

              if (value === null) {
                return `Start amount is required for ${parent.product.productCode}`;
              }

              return null;
            },
          },
          finishAmount: {
            label: "Sub Product Finish Amount",
            validate: ({ value, parent }) => {
              if (this.phase !== "finish") return null;

              if (value === null) {
                return `Finish amount is required for ${parent.product.productCode}`;
              }

              if (parent.startAmount !== null && value > parent.startAmount) {
                return `Finish amount cannot be greater than start amount (${parent.startAmount})`;
              }

              return null;
            },
          },
        },
      },
      subProducts: {
        startAmount: {
          label: "Sub Product Start Amount",
          validate: ({ value, parent }) => {
            if (this.phase !== "start") return null;

            if (value === null) {
              return `Start amount is required for ${parent.product.productCode}`;
            }

            return null;
          },
        },
        finishAmount: {
          label: "Sub Product Finish Amount",
          validate: ({ value, parent }) => {
            if (this.phase !== "finish") return null;

            if (value === null) {
              return `Finish amount is required for ${parent.product.productCode}`;
            }

            if (parent.startAmount !== null && value > parent.startAmount) {
              return `Finish amount cannot be greater than start amount (${parent.startAmount})`;
            }

            return null;
          },
        },
      },
    },
    singles: {
      startAmount: {
        label: "Single Product Start Amount",
        validate: ({ value, parent }) => {
          if (this.phase !== "start") return null;

          if (value === null) {
            return `Start amount is required for ${parent.product.productCode}`;
          }

          return null;
        },
      },
      finishAmount: {
        label: "Single Product Finish Amount",
        validate: ({ value, parent }) => {
          if (this.phase !== "finish") return null;

          if (value === null) {
            return `Finish amount is required for ${parent.product.productCode}`;
          }

          if (parent.startAmount !== null && value > parent.startAmount) {
            return `Finish amount cannot be greater than start amount (${parent.startAmount})`;
          }

          return null;
        },
      },
    },
    subProducts: {
      startAmount: {
        label: "Sub Product Start Amount",
        validate: ({ value, parent }) => {
          if (this.phase !== "start") return null;

          if (value === null) {
            return `Start amount is required for ${parent.product.productCode}`;
          }

          return null;
        },
      },
      finishAmount: {
        label: "Sub Product Finish Amount",
        validate: ({ value, parent }) => {
          if (this.phase !== "finish") return null;

          if (value === null) {
            return `Finish amount is required for ${parent.product.productCode}`;
          }

          if (parent.startAmount !== null && value > parent.startAmount) {
            return `Finish amount cannot be greater than start amount (${parent.startAmount})`;
          }

          return null;
        },
      },
    },
  };
}
