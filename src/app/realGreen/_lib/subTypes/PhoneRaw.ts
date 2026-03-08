export type ContactType =
  | "Home"
  | "Work"
  | "Cell"
  | "Other"
  | "Fax"
  | "Text"
  | "Email";

export type PhoneRaw = {
  isPreferred: boolean;
  number: string;
  phoneType: number;
  type: ContactType;
  typeDescription: string | null;
};

export type ContactPoint = {
  point: string;
  type: ContactType;
};
