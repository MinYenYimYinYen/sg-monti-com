
export type PhoneType = "Home" | "Work" | "Cell" | "Other" | "Fax" | "Text";

export type Phone = {
  isPreferred: boolean;
  number: string;
  phoneType: number;
  type: PhoneType;
  typeDescription: string | null;
};

