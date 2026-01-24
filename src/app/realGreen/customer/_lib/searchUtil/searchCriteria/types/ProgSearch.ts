import {
  ProgStat,
  RGNumRange,
  RGStringRange,
} from "@/app/realGreen/_lib/subTypes/RGSearchRanges";
import { TRange } from "@/lib/primatives/TRange";
import { RGSearchBase } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/RGSearchBase";

export type ProgramSearchRaw = RGSearchBase & {
  searchType: "program";
  // averagePrice?: DecimalRange;
  // averageTime?: IntRange;
  // billingType?: string;
  // callAhead?: number;
  // callBackDate?: DateTimeRange;
  // cancelCode?: number;
  // cancelDate?: DateTimeRange;
  // canceledBy?: string;
  // complete?: boolean;
  // confirmationDate?: DateTimeRange;
  // confirmedBy?: string;
  // contactDate?: DateTimeRange;
  // contractID?: number;
  // // created?: DateTimeRange;
  // customerLetterID?: number;
  // customerNote?: string;
  // customerNoteExpiration?: DateTimeRange;
  customerNumber?: number[];
  dateSold?: RGStringRange;
  // dayCode?: string;
  // difficulty?: DecimalRange;
  // discountCode?: string;
  // doneToDate?: IntRange;
  // endOn?: DateTimeRange;
  // estimateGiven?: DateTimeRange;
  // estimatePrinted?: DateTimeRange;
  // estimateReferredBy?: number;
  // estimateRequestDate?: DateTimeRange;
  // estimateRequestTakenBy?: string;
  // estimateRequestedBy?: string;
  // estimatedBy?: string;
  id?: number[];
  // includeInConfirmationLetter?: boolean;
  // isAutoRenew?: boolean;
  // isFullProgram?: boolean;
  // isRenewed?: boolean;
  // lastPriceChange?: DateTimeRange;
  // latestDependentServiceCompletionDate?: DateTimeRange;
  // lockSchedule?: boolean;
  // maximumRepetitions?: number;
  // nextDate?: DateTimeRange;
  // numberOfServices?: IntRange;
  // // offset?: number;
  // paymentPlanByEmployee?: string;
  // paymentPlanDate?: DateTimeRange;
  // price?: DecimalRange;
  // programDefinitionID?: number[];
  // purchaseOrderNumber?: string;
  // // records?: number;
  // rejectCode?: number;
  // rejectDate?: DateTimeRange;
  // repeat?: string;
  // repeatBy?: string;
  // repeatEvery?: number;
  // route?: string;
  // sequence?: number;
  serviceYear?: RGNumRange;
  // size?: DecimalRange;
  // soldBy1?: StringRange;
  // soldBy2?: StringRange;
  // sourceCode?: number[];
  // standardPrice?: DecimalRange;
  status?: string[];
  // technicianNote?: string;
  // technicianNoteExpiration?: DateTimeRange;
  // temporaryDaycode?: string;
  // temporaryRoute?: string;
  // temporarySequence?: number;
  // // updated?: DateTimeRange;
  // workOrderPricing?: number;
};

export type ProgramSearchCriteria = {
  custIds?: number[];
  soldRange?: TRange<string>;
  progIds?: number[];
  statuses?: ProgStat[];
  season?: number;
};
