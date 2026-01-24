import { ProgCode, ProgCodeDoc } from "../_lib/types/ProgCodeTypes";
import { ServCode, ServCodeDoc } from "../_lib/types/ServCodeTypes";
import { ProgServ } from "../_lib/types/ProgServ";

export function hydrateProgCodes(
  dryProgCodes: ProgCodeDoc[],
  dryServCodes: ServCodeDoc[],
  links: ProgServ[],
): ProgCode[] {
  // --- Data Preparation ---
  const progToServMap = mapProgDefIdToServCodeIds(links);
  const servMap = mapServCodeIdToServCode(dryServCodes);
  const isSpecialMap = mapProgDefIdToIsSpecial(dryProgCodes, progToServMap);

  // --- DAG Construction (Bottom-Up) ---

  // Level 5: Stub ProgCodes (Terminators)
  const stubProgCodes = createStubProgCodes(
    dryProgCodes,
    isSpecialMap
  );

  // Level 3: Context ProgCodes (Parents containing Leaf ServCodes)
  const contextProgCodes = createContextProgCodes(
    dryProgCodes,
    stubProgCodes,
    progToServMap,
    servMap,
    isSpecialMap
  );

  // Level 1: Root ProgCodes (Result containing Rich ServCodes)
  const rootProgCodes = createRootProgCodes(
    dryProgCodes,
    contextProgCodes,
    progToServMap,
    servMap,
    isSpecialMap
  );

  // --- Final Filtering ---
  return filterNestedPrograms(rootProgCodes);
}

// --- Helper Functions ---

function mapProgDefIdToServCodeIds(links: ProgServ[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  links.forEach((l) => {
    const list = map.get(l.progDefId) || [];
    if (l.servCodeId) list.push(l.servCodeId);
    map.set(l.progDefId, list);
  });
  return map;
}

function mapServCodeIdToServCode(
  dryServCodes: ServCodeDoc[],
): Map<string, ServCodeDoc> {
  const map = new Map<string, ServCodeDoc>();
  dryServCodes.forEach((s) => map.set(s.servCodeId, s));
  return map;
}

function mapProgDefIdToIsSpecial(
  dryProgCodes: ProgCodeDoc[],
  progToServMap: Map<number, string[]>,
): Map<number, boolean> {
  const map = new Map<number, boolean>();
  dryProgCodes.forEach((pc) => {
    const sids = progToServMap.get(pc.progDefId) || [];
    const isSpecial = sids.length === 1 && sids[0] === pc.progCodeId;
    map.set(pc.progDefId, isSpecial);
  });
  return map;
}

function createStubProgCodes(
  dryProgCodes: ProgCodeDoc[],
  isSpecialMap: Map<number, boolean>,
): Map<number, ProgCode> {
  const map = new Map<number, ProgCode>();
  dryProgCodes.forEach((dry) => {
    map.set(dry.progDefId, {
      ...dry,
      servCodes: [],
      isSpecial: isSpecialMap.get(dry.progDefId) ?? false,
    });
  });
  return map;
}

function createLeafServCodes(
  servCodeIds: string[],
  servMap: Map<string, ServCodeDoc>,
  stubParent: ProgCode,
): ServCode[] {
  return servCodeIds
    .map((id) => servMap.get(id))
    .filter((s): s is ServCodeDoc => !!s)
    .map((dryServ) => ({
      ...dryServ,
      progCode: stubParent,
    }))
    .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId));
}

function createContextProgCodes(
  dryProgCodes: ProgCodeDoc[],
  stubProgCodes: Map<number, ProgCode>,
  progToServMap: Map<number, string[]>,
  servMap: Map<string, ServCodeDoc>,
  isSpecialMap: Map<number, boolean>,
): Map<number, ProgCode> {
  const map = new Map<number, ProgCode>();
  dryProgCodes.forEach((dry) => {
    const servIds = progToServMap.get(dry.progDefId) || [];
    const stub = stubProgCodes.get(dry.progDefId)!;

    map.set(dry.progDefId, {
      ...dry,
      servCodes: createLeafServCodes(servIds, servMap, stub),
      isSpecial: isSpecialMap.get(dry.progDefId) ?? false,
    });
  });
  return map;
}

function createRichServCodes(
  servCodeIds: string[],
  servMap: Map<string, ServCodeDoc>,
  contextParent: ProgCode,
): ServCode[] {
  return servCodeIds
    .map((id) => servMap.get(id))
    .filter((s): s is ServCodeDoc => !!s)
    .map((dryServ) => ({
      ...dryServ,
      progCode: contextParent,
    }))
    .sort((a, b) => a.servCodeId.localeCompare(b.servCodeId));
}

function createRootProgCodes(
  dryProgCodes: ProgCodeDoc[],
  contextProgCodes: Map<number, ProgCode>,
  progToServMap: Map<number, string[]>,
  servMap: Map<string, ServCodeDoc>,
  isSpecialMap: Map<number, boolean>,
): ProgCode[] {
  return dryProgCodes
    .map((dry) => {
      const servIds = progToServMap.get(dry.progDefId) || [];
      const context = contextProgCodes.get(dry.progDefId)!;

      return {
        ...dry,
        servCodes: createRichServCodes(servIds, servMap, context),
        isSpecial: isSpecialMap.get(dry.progDefId) ?? false,
      };
    })
    .sort((a, b) => a.progCodeId.localeCompare(b.progCodeId));
}

function filterNestedPrograms(programCodes: ProgCode[]): ProgCode[] {
  const programCodesToFilterOut = new Set<string>();
  const allProgIds = new Set(programCodes.map((p) => p.progCodeId));

  for (const programCode of programCodes) {
    for (const serv of programCode.servCodes) {
      // If a service code is also a program code (and not the program itself),
      // it means that program is nested inside this one.
      if (
        allProgIds.has(serv.servCodeId) &&
        serv.servCodeId !== programCode.progCodeId
      ) {
        programCodesToFilterOut.add(serv.servCodeId);
      }
    }
  }

  return programCodes.filter(
    (programCode) => !programCodesToFilterOut.has(programCode.progCodeId),
  );
}
