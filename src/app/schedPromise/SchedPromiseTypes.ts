export enum TimeFrame {
  at = "at",
  before = "before",
  after = "after",
  between = "between",
  first = "First Stop",
  last = "Last Stop",
}

export type TimeOfDay =
  | {
      timeFrame: Exclude<
        TimeFrame,
        TimeFrame.between | TimeFrame.first | TimeFrame.last
      >;
      time: string;
    }
  | { timeFrame: TimeFrame.between; start: string; end: string }
  | { timeFrame: TimeFrame.first | TimeFrame.last };

export enum DayOfWeek {
  Mon = "Mon",
  Tue = "Tue",
  Wed = "Wed",
  Thr = "Thr",
  Fri = "Fri",
}

export enum GranLiq {
  gran = "Granular only",
  liquid = "Liquid only",
  hoseOrPush = "Hose or push spreader only",
}

export enum DateScope {
  before = "before",
  after = "after",
  weekOf = "week of",
  monthOf = "month of",
  even = "even days",
  odd = "odd days",
  onDate = "on",
}

export enum TargetPeriod {
  early = "early",
  mid = "mid",
  late = "late",
  anyDay = "any day",
}

export type DateTarget =
  | { dateScope: DateScope.before | DateScope.after; date: string }
  | {
      dateScope: DateScope.weekOf | DateScope.monthOf;
      targetPeriod:
        | TargetPeriod.early
        | TargetPeriod.mid
        | TargetPeriod.late
        | TargetPeriod.anyDay;
      date: string;
    }
  | { dateScope: DateScope.even | DateScope.odd }
  | { dateScope: DateScope.onDate; date: string };

export enum SchedCondition {
  weedsUp = "weeds up",
  cleanupDone = "cleanup done",
}


export type SchedPromiseDraft = {
  isPermanent: "true" | "false" | "";
  tech?: string;
  equip?: string;
  condition?: SchedCondition.weedsUp | SchedCondition.cleanupDone;
  granLiq?: GranLiq;
  dateTarget?: DateTarget;
  timeOfDay?: TimeOfDay;
  daysOfWeek?: DayOfWeek[];
  other?: string;
};

export type SchedPromise = SchedPromiseDraft & (
  | { entityType: "service"; entityId: number }
  | { entityType: "program"; entityId: number }
  | { entityType: "customer"; entityId: number }
);

export const PromiseType: {
  [key in SelectedPromiseType]: string;
} = {
  tech: "Tech",
  equip: "Equipment",
  condition: "Customer Condition",
  granLiq: "Granular/Liquid",
  dateTarget: "Date Target",
  timeOfDay: "Time of Day",
  daysOfWeek: "OK Days",
  other: "Other",
};

export type SelectedPromiseType = keyof Omit<
  SchedPromiseDraft,
  "serviceId" | "isPermanent"
>;
