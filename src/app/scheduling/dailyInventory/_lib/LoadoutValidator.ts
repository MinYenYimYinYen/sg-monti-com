import { BaseValidator, ValidatorSchema } from "@/lib/validation/BaseValidator";
import { LoadoutBase } from "./LoadoutTypes";

export type LoadoutPhase = "start" | "finish";

export class LoadoutValidator extends BaseValidator<LoadoutBase> {
  constructor(private phase: LoadoutPhase) {
    super();
  }

  protected schema: ValidatorSchema<LoadoutBase> = {
    masters: {
      startAmount: {
        label: "Start Amount",
        validate: ({ value, parent }) => {
          // Only validate during "start" phase
          if (this.phase !== "start") return null;

          if (value === null) {
            return `Start amount is required for ${parent.product.productCode}`;
          }

          return null;
        },
      },
      finishAmount: {
        label: "Finish Amount",
        validate: ({ value, parent }) => {
          // Only validate during "finish" phase
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
      appMethods: {
        startAmount: {
          label: "Mix Product Start Amount",
          validate: ({ value, parent }) => {
            if (this.phase !== "start") return null;

            if (value === null) {
              return `Start amount is required for ${parent.mixProduct.productCode}`;
            }

            return null;
          },
        },
        finishAmount: {
          label: "Mix Product Finish Amount",
          validate: ({ value, parent }) => {
            if (this.phase !== "finish") return null;

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
