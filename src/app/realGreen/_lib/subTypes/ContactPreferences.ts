import {baseStrId} from "@/app/realGreen/_lib/realGreenConst";

export type ContactPreferenceRaw = {
  amaAdministrative: boolean;
  amaMarket: boolean;
  amaService: boolean;
  autoPay: boolean;
  cawRegisteredUser: boolean;
  contAllow: string | null;
  contactPreferred: string;
  contactPreferredDesc: string;
  customerNumber: number;
  dontDirectMail: boolean;
  dontEmail: boolean;
  dontEmailInvoice: boolean;
  dontFollowupByEmail: boolean;
  dontTelemarket: boolean;
  dontTelemarketCustomerRequest: boolean;
  dontTelemarketLocal: boolean;
  dontText: boolean;
  dontUpsell: boolean;
  emailPrenotification: boolean;
  emailStatements: boolean;
  noKnock: boolean;
  preferredLanguage: string;
  preferredLanguageDesc: string;
  preferredPhone: string;
  preferredPhoneDesc: string;
  textPrenotification: boolean;
};

export type ContactPreference = {
  autoPay: boolean;
  prefContactId: string;
  prefContactDesc: string;
  dontDirectMail: boolean;
  dontEmailInvoice: boolean;
  dontFollowUpEmail: boolean;
  dontKnock: boolean;
  dontText: boolean;
  dontUpsell: boolean;
  emailPrenotify: boolean;
  emailStatements: boolean;
  prefPhoneId: string;
  prefPhoneDesc: string;
  textPrenotify: boolean;
};

export function remapContactPreference(
  raw: ContactPreferenceRaw | null,
): ContactPreference {
  if (!raw) return baseContactPreference;
  return {
    autoPay: raw.autoPay,
    prefContactId: raw.contactPreferred,
    prefContactDesc: raw.contactPreferredDesc,
    dontDirectMail: raw.dontDirectMail,
    dontEmailInvoice: raw.dontEmailInvoice,
    dontFollowUpEmail: raw.dontFollowupByEmail,
    dontKnock: raw.noKnock,
    dontUpsell: raw.dontUpsell,
    emailPrenotify: raw.emailPrenotification,
    emailStatements: raw.emailStatements,
    prefPhoneId: raw.preferredPhone, //could refer to ContactType
    prefPhoneDesc: raw.preferredPhoneDesc,
    textPrenotify: raw.textPrenotification,
    dontText: raw.dontText,
  };
}

export const baseContactPreference: ContactPreference = {
  autoPay: false,
  prefContactId: baseStrId,
  prefContactDesc: "",
  dontDirectMail: false,
  dontKnock: false,
  dontEmailInvoice: false,
  dontFollowUpEmail: false,
  dontText: false,
  dontUpsell: false,
  emailPrenotify: false,
  emailStatements: false,
  prefPhoneDesc: "",
  prefPhoneId: baseStrId,
  // We'll default this to true, in case we use this in pre-notify feature
  textPrenotify: true,
};
