type ValidationContext<V, P> = {
  value: V;
  parent: P;
  label: string;
};

type ValidatorFn<V, P> = (ctx: ValidationContext<V, P>) => string | null;

// A field can now define a Label for better error messages
type FieldValidation<V, P> =
  | ValidatorFn<V, P>
  | { label: string; validate: ValidatorFn<V, P> };

export type ValidatorSchema<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? ValidatorSchema<U>
    : T[K] extends object
      ? ValidatorSchema<T[K]>
      : FieldValidation<T[K], T>;
};


export abstract class BaseValidator<T extends object> {
  protected abstract schema: ValidatorSchema<T>;

  public validate(data: T): Record<string, string> {
    console.log("data", data);
    const errors: Record<string, string> = {};

    const walk = (
      rule: any,
      value: any,
      parent: any,
      path: string,
      key: string,
    ) => {
      if (!rule) return;

      if (
        typeof rule === "function" ||
        (typeof rule === "object" && rule.validate)
      ) {
        const isObjectRule = typeof rule === "object";
        const validateFn = isObjectRule ? rule.validate : rule;
        const label = isObjectRule ? rule.label : key;

        const error = validateFn({ value, parent, label });
        if (error) errors[path] = error;
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          walk(rule, item, item, `${path}[${index}]`, key);
        });
      } else if (typeof rule === "object" && value !== null) {
        for (const subKey in rule) {
          const nextPath = path ? `${path}.${subKey}` : subKey;
          walk(rule[subKey], value[subKey], value, nextPath, subKey);
        }
      }
    };

    walk(this.schema, data, data, "", "");
    return errors;
  }
}
