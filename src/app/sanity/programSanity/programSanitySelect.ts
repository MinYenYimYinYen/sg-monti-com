
import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

const selectSelectedProgCodeId = (state: AppState) =>
  state.sanity.programSanity.selectedProgCodeId;

const selectProgramsByProgCode = createSelector(
  [centralSelect.programs],
  (programs) => {
    const map = new Grouper(programs).groupBy((p) => p.progCode.progCodeId).toMap();
    // Exclude single-service progCodes — not meaningful for renewal sanity
    for (const [key, progs] of map) {
      if (progs[0].progCode.servCodes.length <= 1) map.delete(key);
    }
    return map;
  },
);

export type ProgCodeSummary = {
  progCodeId: string;
  label: string;
  count: number;
};

const selectProgCodeSummaries = createSelector(
  [selectProgramsByProgCode],
  (map): ProgCodeSummary[] =>
    [...map.entries()]
      .map(([progCodeId, programs]) => ({
        progCodeId,
        label: `${progCodeId} - ${programs.length}`,
        count: programs.length,
      }))
      .sort((a, b) => a.progCodeId.localeCompare(b.progCodeId)),
);

const selectSelectedPrograms = createSelector(
  [selectProgramsByProgCode, selectSelectedProgCodeId],
  (map, id): Program[] => (id ? (map.get(id) ?? []) : []),
);

export type ServStatGroup = {
  statString: string;
  programs: Program[];
  count: number;
};

const selectServStatDistribution = createSelector(
  [selectSelectedPrograms],
  (programs): ServStatGroup[] => {
    const grouped = new Grouper(programs)
      .groupBy((p) => p.x.getServStats("renewal"))
      .toMap();
    return [...grouped.entries()]
      .map(([statString, progs]) => ({
        statString,
        programs: progs,
        count: progs.length,
      }))
      .sort((a, b) => b.count - a.count);
  },
);

export const programSanitySelect = {
  selectedProgCodeId: selectSelectedProgCodeId,
  progCodeSummaries: selectProgCodeSummaries,
  selectedPrograms: selectSelectedPrograms,
  servStatDistribution: selectServStatDistribution,
};
