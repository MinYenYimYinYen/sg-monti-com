import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";
import { ServCode } from "@/app/realGreen/servCode/ServCode";

export type ProgServLink = {
  progDefId: number;
  servCodeId: string;
};

export type ProgServParams = {
  progCodes: ProgCode[];
  servCodes: ServCode[];
  links: ProgServLink[];
};

export type ProgramsSpecials = {
  programCodes: ProgCode[];
  specialCodes: ProgCode[];
};

function programCodeContainsSpecialProgramCode(
  programCode: ProgCode,
  specialProgramCode: ProgCode,
) {
  if (!programCode.servCodes) return false;
  return programCode.servCodes
    .map((sc) => sc.servCodeId)
    .includes(specialProgramCode.progCodeId);
}

function removeProgramsCodesThatExistInsideAnotherProgramCode(
  programCodes: ProgCode[],
) {
  const programCodesToFilterOut: ProgCode[] = [];
  for (const programCode of programCodes) {
    for (const specialProgramCode of programCodes) {
      if (
        programCodeContainsSpecialProgramCode(
          programCode,
          specialProgramCode,
        ) &&
        programCode.progDefId !== specialProgramCode.progDefId
      ) {
        programCodesToFilterOut.push(specialProgramCode);
      }
    }
  }
  return programCodes.filter(
    (programCode) => !programCodesToFilterOut.includes(programCode),
  );
}

export function assignServCodesToProgCodes(
  params: ProgServParams,
): ProgCode[] {
  const { progCodes, servCodes, links } = params;

  const updatedProgramCodes = progCodes
    .map((programCode) => {
      // Find matching serviceCode IDs for the programCode
      const servCodeIds = links
        .filter((ps) => ps.progDefId === programCode.progDefId)
        .map((ps) => ps.servCodeId);

      // Find serviceCodes by IDs
      const matchedServCodes: ServCode[] = servCodeIds
        .map((id) => servCodes.find((sc) => sc.servCodeId === id))
        .filter((sc): sc is ServCode => !!sc)
        .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId))
        .map((servCode) => ({
          ...servCode,
          progCode: {
            ...programCode,
            servCodes: [], // Placeholder to break circular ref initially
          },
        }));

      // Assign sibling serviceCodes without circular reference
      matchedServCodes.forEach((servCode) => {
        // We cast to unknown to bypass the strict type requirement for the circular reference break
        (servCode as any).progCode.servCodes = matchedServCodes.map((sc) => ({
          ...sc,
          progCode: undefined, // Break the circular reference
        }));
      });

      return {
        ...programCode,
        servCodes: matchedServCodes,
      };
    })
    .sort((a, b) => a.progCodeId.localeCompare(b.progCodeId));

  return removeProgramsCodesThatExistInsideAnotherProgramCode(
    updatedProgramCodes,
  );
}

export function makeProgramSpecials(programCodes: ProgCode[]): ProgramsSpecials {
  const progSpec: ProgramsSpecials = {
    programCodes: [],
    specialCodes: [],
  };

  programCodes.forEach((programCode) => {
    // if program has one service code and its id is the same as the program code, it is a special
    if (
      programCode.servCodes &&
      programCode.servCodes.length === 1 &&
      programCode.servCodes[0].servCodeId === programCode.progCodeId
    ) {
      progSpec.specialCodes.push(programCode);
    } else {
      progSpec.programCodes.push(programCode);
    }
  });

  return {
    programCodes: progSpec.programCodes.sort((a, b) =>
      a.progCodeId.localeCompare(b.progCodeId),
    ),
    specialCodes: progSpec.specialCodes.sort((a, b) =>
      a.progCodeId.localeCompare(b.progCodeId),
    ),
  };
}
