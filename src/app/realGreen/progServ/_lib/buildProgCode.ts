import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgCodeUtils } from "@/app/realGreen/progServ/_lib/classes/ProgCodeUtils";
import { ServCodeUtils } from "@/app/realGreen/progServ/_lib/classes/ServCodeUtils";

/**
 * Constructs a fully circularized ProgCode with ServCodes.
 *
 * Two-phase builder + mutate pattern:
 * - Phase 1: build progCode with empty servCodes
 * - Phase 2: build each ServCode pointing at the progCode builder, attach x
 * - Mutate progCode.servCodes to close the circle, attach x
 *
 * All external lookups (price tables, product rules, etc.) must be resolved
 * before calling this function — it only handles the circular reference.
 */
export function buildProgCode(
  progCodeData: Omit<ProgCode, "servCodes" | "x">,
  servCodeDatas: Omit<ServCode, "progCode" | "x">[],
): ProgCode {
  // Phase 1: build progCode with empty servCodes (no x yet)
  const progCodeBuilder = { ...progCodeData, servCodes: [] } as Omit<
    ProgCode,
    "x"
  >;

  // Phase 2: build each ServCode pointing at the progCode builder, attach x
  const servCodes = servCodeDatas.map((servData) => {
    const servBuilder = {
      ...servData,
      progCode: progCodeBuilder as ProgCode,
    } as Omit<ServCode, "x">;
    (servBuilder as ServCode).x = new ServCodeUtils(servBuilder);
    return servBuilder as ServCode;
  });

  // Close the circle, attach x — pass buildProgCode itself as the factory so
  // ProgCodeUtils.getByServCodeIds has a single source of truth for construction
  progCodeBuilder.servCodes = servCodes;
  (progCodeBuilder as ProgCode).x = new ProgCodeUtils(progCodeBuilder, buildProgCode);

  return progCodeBuilder as ProgCode;
}
