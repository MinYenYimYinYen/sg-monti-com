
export type ServiceStatusType =
  | "skips"
  | "active"
  | "asap"
  | "printed"
  | "never"
  | "completed";

export function getServiceStatuses(types: ServiceStatusType[]): string[] {
  const statuses: string[] = [];
  for (const type of types) {
    switch (type) {
      case "skips":
        // push all capital letters except for 'N' and 'Y'
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(i + 65);
          if (letter !== "N" && letter !== "Y" && letter !== "S") {
            statuses.push(letter);
          }
        }
        break;
      case "active":
        statuses.push("Y");
        break;
      case "asap":
        statuses.push("*");
        break;
      case "never":
        statuses.push("N");
        break;
      case "printed":
        statuses.push("$");
        break;
      case "completed":
        statuses.push("S");
        break;
    }
  }
  return statuses;
}
