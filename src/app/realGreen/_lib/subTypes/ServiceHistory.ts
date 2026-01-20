/**
 * realGreen gives start/end in numeric format, but as military time
 * @example: start: 1430
 * This function returns 1430 as "14:30:00", standard ISO format
 * */
function timeIntToMilitaryString(timeInt: number): string {
  const hours24 = Math.floor(timeInt / 100); // Get the `hh` part
  const minutes = timeInt % 100; // Get the `mm` part
  const formattedHours = String(hours24).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes}:00`;
}

export type ServiceHistoryRaw = {
  postBy?: string;
  feedback?: string;
  actualManHours?: number;
  rating?: number;
  temperature?: number;
  windSpeed?: number;
  windDirection?: string;
  start?: number;
  end?: number;
  duration?: number;
  crewSize?: number;
  billType:
    | "A_CreditCard"
    | "C_Installment"
    | "D_ACH"
    | "M_StatementOnly"
    | "R_RegularInvoice";
  companyId: number;
  customerNumber: number;
};

export type ServiceHistoryRemapped = {
  postedBy: string;
  feedback: string;
  minutes: number;
  temperature: number;
  windSpeed: number;
  start: string;
  end: string;
  crewSize: number;
  
};

export type ServiceHistoryHydrate = {}

export type ServiceHistory = ServiceHistoryRemapped & ServiceHistoryHydrate;

export function remapServiceHistory(raw: ServiceHistoryRaw): ServiceHistory {
  let startInt = raw.start;
  let endInt = raw.end;

  // If start is present but end is missing, default end to start
  if (startInt !== undefined && endInt === undefined) {
    endInt = startInt;
  }

  // If end is present but start is missing, default start to end
  if (endInt !== undefined && startInt === undefined) {
    startInt = endInt;
  }

  return {
    postedBy: raw.postBy || "",
    feedback: raw.feedback || "",
    minutes: raw.actualManHours || 0,
    temperature: raw.temperature || 0,
    windSpeed: raw.windSpeed || 0,
    start: startInt !== undefined ? timeIntToMilitaryString(startInt) : "00:00:00",
    end: endInt !== undefined ? timeIntToMilitaryString(endInt) : "00:00:00",
    crewSize: raw.crewSize || 0,
  }
}
