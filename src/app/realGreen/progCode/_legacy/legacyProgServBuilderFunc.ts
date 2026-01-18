// import { ProgServResponse } from "@/pages/api/progServ.types";
// import { ProgramCode } from "@/realGreen/types/ProgramCode";
// import { IServCode } from "@/realGreen/progServ/models/ExtServCode.types";
// import { ProgramsSpecials } from "@/realGreen/progServ/progServSlice.types";
//
// function programCodeContainsSpecialProgramCode(
//   programCode: ProgramCode,
//   specialProgramCode: ProgramCode,
// ) {
//   return programCode.serviceCodes
//     .map((sc) => sc.saId)
//     .includes(specialProgramCode.programCode);
// }
// /**
//  * This handles the situation where a new service code is created, then added
//  * to a program. When the new service is created, it gets a programDefinitionId.
//  * Then when it gets added to a program code, it also gets that
//  * programDefinitionId.  So in the api, it looks like there is a LR1 RawService
//  * and a LR1 RawProgram.  And the goal with progServ is to populate all of the
//  * service codes with their program info and all of the program codes with their
//  * service info.  In order not to have duplicate service codes, the standalone
//  * program codes representing a standalone service must be filtered out if they
//  * also exist in any of the program codes.
//  * The situation this does NOT handle, and which I personally will not run into
//  * is when multiple program codes use the same service code.  I don't know what
//  * the api data would look like in that case, but I'm not going to alter my data
//  * in that way to test it.
//  * */
// function removeProgramsCodesThatExistInsideAnotherProgramCode(
//   programCodes: ProgramCode[],
// ) {
//   const programCodesToFilterOut: ProgramCode[] = [];
//   for (const programCode of programCodes) {
//     for (const specialProgramCode of programCodes) {
//       if (
//         programCodeContainsSpecialProgramCode(
//           programCode,
//           specialProgramCode,
//         ) &&
//         programCode.programDefinitionID !==
//         specialProgramCode.programDefinitionID
//       ) {
//         // console.log(
//         //   "programCode",
//         //   programCode,
//         //   "specialProgramCode",
//         //   specialProgramCode,
//         // );
//         programCodesToFilterOut.push(specialProgramCode);
//       }
//     }
//   }
//   return programCodes.filter(
//     (programCode) => !programCodesToFilterOut.includes(programCode),
//   );
// }
//
// export function assignServCodesToProgCodes(
//   params: ProgServResponse,
// ): ProgramCode[] {
//   const { programCodes, serviceCodes, progServs } = params;
//
//   const updatedProgramCodes = programCodes
//     .map((programCode) => {
//       // Find matching serviceCode IDs for the programCode
//       const servCodeIds = progServs
//         .filter(
//           (ps) => ps.programDefinitionID === programCode.programDefinitionID,
//         )
//         .map((ps) => ps.serviceCode);
//
//       // Find serviceCodes by IDs and build the circular-safe structure
//       const servCodes: IServCode[] = servCodeIds
//         .map((servCodeId) => serviceCodes.find((sc) => sc.saId === servCodeId))
//         .filter((sc): sc is IServCode => !!sc) // Ensure no undefined values
//         .sort((a, b) => a.saId.localeCompare(b.saId))
//
//         .map((servCode) => ({
//           ...servCode,
//           programCode: {
//             ...programCode,
//             serviceCodes: [], // Will be replaced later to break circular reference
//           },
//         }));
//
//       // Assign sibling serviceCodes without circular reference
//       servCodes.forEach((servCode) => {
//         servCode.programCode.serviceCodes = servCodes.map((sc) => ({
//           ...sc,
//           programCode: undefined as unknown as ProgramCode, // Break the circular reference
//         }));
//       });
//
//       return {
//         ...programCode,
//         serviceCodes: servCodes,
//       };
//     })
//     .sort((a, b) => a.programCode.localeCompare(b.programCode));
//   return removeProgramsCodesThatExistInsideAnotherProgramCode(
//     updatedProgramCodes,
//   );
// }
//
// export function makeProgramSpecials(programCodes: ProgramCode[]) {
//   const progSpec: ProgramsSpecials = {
//     programCodes: [],
//     specialCodes: [],
//   };
//
//   // if program has one service code and its id is the same as the program code, it is a special
//   programCodes.forEach((programCode) => {
//     if (
//       programCode.serviceCodes.length === 1 &&
//       programCode.serviceCodes[0].saId === programCode.programCode
//     ) {
//       progSpec.specialCodes.push(programCode);
//     } else {
//       progSpec.programCodes.push(programCode);
//     }
//   });
//   const sortedProgSpec = {
//     programCodes: progSpec.programCodes.sort((a, b) =>
//       a.programCode.localeCompare(b.programCode),
//     ),
//     specialCodes: progSpec.specialCodes.sort((a, b) =>
//       a.programCode.localeCompare(b.programCode),
//     ),
//   };
//   return sortedProgSpec;
// }
