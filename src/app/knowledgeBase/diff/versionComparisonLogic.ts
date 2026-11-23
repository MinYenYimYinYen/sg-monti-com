import type { VersionComparison } from "@/app/knowledgeBase/diff/versionDiffTypes";

// Which older versions the head can be compared with, as pure functions of plain numbers so the panel,
// the popover and any test run the same code.
//
//   previous  the version just before the head. Absent for version 1.
//   approved  the version the AI reads, when that is older than the head. Absent when the head is
//             the approved one or nothing has been approved yet.

export function listVersionComparisons({
  headVersion,
  liveVersion,
}: {
  headVersion: number;
  liveVersion: number | null;
}): VersionComparison[] {
  const previousVersion = headVersion > 1 ? headVersion - 1 : null;
  const approvedVersion = liveVersion !== null && liveVersion < headVersion ? liveVersion : null;

  if (previousVersion !== null && previousVersion === approvedVersion) {
    return [
      {
        olderVersion: previousVersion,
        label: `Previous version (v${previousVersion}), also the approved one`,
        isPrevious: true,
        isApproved: true,
      },
    ];
  }

  const comparisons: VersionComparison[] = [];
  if (previousVersion !== null) {
    comparisons.push({
      olderVersion: previousVersion,
      label: `Previous version (v${previousVersion})`,
      isPrevious: true,
      isApproved: false,
    });
  }
  if (approvedVersion !== null) {
    comparisons.push({
      olderVersion: approvedVersion,
      label: `Approved version (v${approvedVersion}), the one the AI uses`,
      isPrevious: false,
      isApproved: true,
    });
  }
  return comparisons;
}

/** The approved comparison when there is one, because it shows what approving the head would change. */
export function pickDefaultComparison(comparisons: VersionComparison[]): VersionComparison | null {
  return comparisons.find((comparison) => comparison.isApproved) ?? comparisons[0] ?? null;
}
