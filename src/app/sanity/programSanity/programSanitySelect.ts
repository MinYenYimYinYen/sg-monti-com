import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

const selectSelectedProgCodeId = (state: AppState) =>
  state.sanity.programSanityPage.selectedProgCodeId;

const selectFinishedProgIds = (state: AppState): number[] =>
  state.sanity.programSanityPage.finishedProgIds;

const selectProgramsByProgCode = createSelector(
  [sanitySelect.programs],
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

/** All stat groups regardless of finished state — used to build the finished list. */
const selectAllServStatGroups = createSelector(
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

/** Stat groups with finished programs filtered out. Groups that become empty are dropped. */
const selectServStatDistribution = createSelector(
  [selectAllServStatGroups, selectFinishedProgIds],
  (groups, finishedIds): ServStatGroup[] => {
    if (finishedIds.length === 0) return groups;
    const finishedSet = new Set(finishedIds);
    return groups
      .map((group) => ({
        ...group,
        programs: group.programs.filter((p) => !finishedSet.has(p.progId)),
      }))
      .filter((group) => group.programs.length > 0)
      .map((group) => ({ ...group, count: group.programs.length }));
  },
);

/** Finished programs — shown in the finished popover. */
const selectFinishedPrograms = createSelector(
  [selectSelectedPrograms, selectFinishedProgIds],
  (programs, finishedIds): Program[] => {
    if (finishedIds.length === 0) return [];
    const finishedSet = new Set(finishedIds);
    return programs.filter((p) => finishedSet.has(p.progId));
  },
);

const selectFinishedCount = createSelector(
  [selectFinishedProgIds],
  (ids) => ids.length,
);

export const programSanitySelect = {
  selectedProgCodeId: selectSelectedProgCodeId,
  progCodeSummaries: selectProgCodeSummaries,
  selectedPrograms: selectSelectedPrograms,
  servStatDistribution: selectServStatDistribution,
  finishedProgIds: selectFinishedProgIds,
  finishedPrograms: selectFinishedPrograms,
  finishedCount: selectFinishedCount,
};
