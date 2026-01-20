export type DoneByRaw = {
  created?: string;
  /**
   * @deprecated use 'service.doneDate' instead. doneDate is always null as of 2024-12-06
   * */
  doneDate?: string;
  employeeID: string | null;
  employeeName: string | null;
  endTime?: number;
  id: number;
  percent: number | null;
  serviceID: number;
  starTime?: number;
  updated?: string;
};

export type DoneByRemapped = {
  doneById: number;
  employeeId: string;
  servId: number;
  percent: number;
};

export type DoneByHydrate = {};

export type DoneBy = DoneByRemapped & DoneByHydrate;

function remapDoneBy(raw: DoneByRaw): DoneByRemapped {
  return {
    doneById: raw.id,
    employeeId: raw.employeeID || "",
    percent: raw.percent || -1, //should never not be defined if exists
    servId: raw.serviceID,
  };
}

export function remapDoneBys (raw: DoneByRaw[]): DoneByRemapped[] {
  return raw.map((r) => remapDoneBy(r));
}
