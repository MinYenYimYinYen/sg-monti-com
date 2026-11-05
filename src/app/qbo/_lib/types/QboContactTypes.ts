// Small shapes shared by several QBO entities (Vendor, CompanyInfo, Purchase). Intuit's
// reference pages name these types without defining them, so every shape here was written
// from the sample JSON on the entity pages (minor version 75). Fields that never appear in a
// sample are left out rather than guessed. Check a shape against a live response before
// relying on a field that is not in a sample.

/**
 * Intuit's PhysicalAddress. The pages say Lat and Long are deprecated and not returned, but
 * some samples still show them, so they are listed and commented out.
 */
export type QboPhysicalAddress = {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  // Line4?: string; // Documented as Line1 through Line5, but only Line1 to Line3 appear in samples.
  // Line5?: string;
  City?: string;
  Country?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  // Lat?: string; // Deprecated.
  // Long?: string; // Deprecated.
};

export type QboEmailAddress = {
  Address?: string;
};

/** The sample shows an empty object when no website is set. */
export type QboWebSiteAddress = {
  URI?: string;
};

export type QboTelephoneNumber = {
  FreeFormNumber?: string;
};

/** Intuit's NameValue pair, used for settings that have no field of their own. */
export type QboNameValue = {
  Name: string;
  Value: string;
};

/** The calendar month names, spelled out. */
export type QboMonth =
  | "January"
  | "February"
  | "March"
  | "April"
  | "May"
  | "June"
  | "July"
  | "August"
  | "September"
  | "October"
  | "November"
  | "December";
