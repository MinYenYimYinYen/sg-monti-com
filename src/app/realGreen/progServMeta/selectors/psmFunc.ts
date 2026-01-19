import { ProgCode } from "@/app/realGreen/progServMeta/_lib/types/ProgCode";

function getServCodesFromProgCodes(progCodes: ProgCode[]) {
  return progCodes.flatMap((progCode) => progCode.servCodes);
}
