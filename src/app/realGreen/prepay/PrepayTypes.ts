export type PrepayRaw = {
  id: string;
  description: string;
  percent: number | null;
  // allPrograms: boolean;
  // allSpecials: boolean;
  // available: boolean;
  // installment: boolean;
  // anybranch: boolean;
  // residentalAccount: string;
  // commercialAccount: string;
  // descriptionFrench: string;
  // descriptionSpanish: string;
  // handheld: boolean;
  // availableForServiceCodes: any[] | null;
  // created: string;
  // updated: string;
  // companies: any[] | null;
  // services: any[] | null;
};

export type PrepayCore = {
  prepayId: string;
  description: string;
  percent: number;
};

export type PrepayDocProps = { prepayId: string };

export type PrepayDoc = PrepayCore & PrepayDocProps;

export type PrepayProps = {};

export type Prepay = PrepayDoc & PrepayProps;
