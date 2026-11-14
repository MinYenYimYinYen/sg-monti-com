import type { Capability } from "@/permission/PermissionTypes";
import { VERB_COMPANIONS, type CapabilityRegistry } from "@/permission/registryTypes";
import { canAssign } from "@/permission/logic/assignmentGuards";

// The admin screens show capabilities as a table: one row per registry group, one column per verb,
// one checkbox per cell. A cell toggles every member of the row that has that verb. Everything
// here is pure, so the rules can be tested without React.

export type MatrixRegistry = Pick<CapabilityRegistry, "byGroup" | "describe" | "has">;

/** Columns come out in this order. A verb not listed here goes after these, alphabetically. */
const VERB_ORDER = ["read", "write", "delete"];

export type MatrixMember = {
  capability: Capability;
  resourceKey: string;
  resourceName: string;
  source?: string;
  verb: string;
};

/** The members of a row that have one verb. Ticking the cell grants all of them. */
export type MatrixCell = { verb: string; capabilities: Capability[] };

export type MatrixRow = {
  /** The registry group's key. */
  key: string;
  name: string;
  description?: string;
  members: MatrixMember[];
  /** One entry per matrix column, null where this row has no capability with that verb. */
  cells: (MatrixCell | null)[];
};

export type Matrix = { columns: string[]; rows: MatrixRow[] };

/** Identifies one cell, for keys and for the lock notes an editor passes to the table. */
export function cellKey({ rowKey, verb }: { rowKey: string; verb: string }): string {
  return `${rowKey}|${verb}`;
}

export type MemberSummary = { resourceKey: string; resource: string; verbs: string[] };

/** A row's members for the info popover: one line per resource with its verbs. */
export function summarizeMembers({ row }: { row: Pick<MatrixRow, "members"> }): MemberSummary[] {
  const summaries = new Map<string, MemberSummary>();
  for (const member of row.members) {
    const summary = summaries.get(member.resourceKey) ?? {
      resourceKey: member.resourceKey,
      resource: resourceLabel(member),
      verbs: [],
    };
    summary.verbs.push(member.verb);
    summaries.set(member.resourceKey, summary);
  }
  return [...summaries.values()];
}

function verbRank(verb: string): number {
  const index = VERB_ORDER.indexOf(verb);
  return index === -1 ? VERB_ORDER.length : index;
}

function resourceLabel(member: Pick<MatrixMember, "resourceName" | "source">): string {
  return member.source ? `${member.resourceName} (${member.source})` : member.resourceName;
}

/**
 * One row per registry group, in registry order. A group left with nothing to grant (every
 * capability public) has no row.
 */
export function buildMatrix({ registry }: { registry: MatrixRegistry }): Matrix {
  const rowsWithoutCells: Omit<MatrixRow, "cells">[] = [];

  for (const group of registry.byGroup) {
    const members: MatrixMember[] = [];

    for (const capability of group.capabilities) {
      const description = registry.describe(capability);
      if (!description) continue;
      members.push({
        capability,
        resourceKey: description.resourceKey,
        resourceName: description.resourceName,
        ...(description.source ? { source: description.source } : {}),
        verb: description.verb,
      });
    }

    if (members.length > 0) {
      rowsWithoutCells.push({
        key: group.key,
        name: group.name,
        ...(group.description ? { description: group.description } : {}),
        members,
      });
    }
  }

  const columns = [...new Set(rowsWithoutCells.flatMap((row) => row.members.map((member) => member.verb)))].sort(
    (first, second) => verbRank(first) - verbRank(second) || first.localeCompare(second),
  );

  const rows = rowsWithoutCells.map((row) => ({
    ...row,
    cells: columns.map((verb) => {
      const capabilities = row.members.filter((member) => member.verb === verb).map((member) => member.capability);
      return capabilities.length > 0 ? { verb, capabilities } : null;
    }),
  }));

  return { columns, rows };
}

// ---------- verb companions ----------
// Holding write is of little use without read, so ticking a cell also takes the companions of
// each member, and clearing one takes whatever depends on it. Only the built-in verb companions
// count, and only within one resource.

type KnownCapabilities = Pick<CapabilityRegistry, "has">;

function companionsOf({ capability, registry }: { capability: Capability; registry: KnownCapabilities }): Capability[] {
  const separator = capability.lastIndexOf(".");
  const prefix = capability.slice(0, separator);
  return (VERB_COMPANIONS[capability.slice(separator + 1)] ?? [])
    .map((companionVerb) => `${prefix}.${companionVerb}`)
    .filter((companion) => registry.has(companion)) as Capability[];
}

/** The capability's companions, and theirs in turn. Never contains the capability itself. */
function companionClosure({
  capability,
  registry,
}: {
  capability: Capability;
  registry: KnownCapabilities;
}): Set<Capability> {
  const closure = new Set<Capability>();
  const queue = [capability];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const companion of companionsOf({ capability: next, registry })) {
      if (companion === capability || closure.has(companion)) continue;
      closure.add(companion);
      queue.push(companion);
    }
  }
  return closure;
}

export type CellChange = { add: Capability[]; remove: Capability[] };

/**
 * What ticking (`turnOn`) or clearing a cell changes, given what is held now. Ticking adds the
 * members and their companions that are not held. Clearing removes the held members and every
 * held capability that needs one of them.
 */
export function cellChange({
  cell,
  held,
  turnOn,
  registry,
}: {
  cell: MatrixCell;
  held: ReadonlySet<Capability>;
  turnOn: boolean;
  registry: KnownCapabilities;
}): CellChange {
  if (turnOn) {
    const wanted = new Set<Capability>(cell.capabilities);
    for (const capability of cell.capabilities) {
      companionClosure({ capability, registry }).forEach((companion) => wanted.add(companion));
    }
    return { add: [...wanted].filter((capability) => !held.has(capability)), remove: [] };
  }

  const cleared = new Set<Capability>(cell.capabilities);
  for (const heldCapability of held) {
    const needs = companionClosure({ capability: heldCapability, registry });
    if (cell.capabilities.some((capability) => needs.has(capability))) cleared.add(heldCapability);
  }
  return { add: [], remove: [...cleared].filter((capability) => held.has(capability)) };
}

// ---------- what a cell shows ----------
export type CellState = "all" | "some" | "none";

/** All, some or none of the cell's members are in the list. */
export function cellState({
  cell,
  held,
}: {
  cell: MatrixCell;
  held: ReadonlySet<Capability>;
}): CellState {
  const heldCount = cell.capabilities.filter((capability) => held.has(capability)).length;
  if (heldCount === 0) return "none";
  return heldCount === cell.capabilities.length ? "all" : "some";
}

/** A row is used when at least one of its capabilities is held, so a partial row counts. */
export function isRowUsed({ row, held }: { row: MatrixRow; held: ReadonlySet<Capability> }): boolean {
  return row.members.some((member) => held.has(member.capability));
}



// ---------- the user editor's cells ----------
// A user holds capabilities through bundles and directly. A direct grant cannot be added or
// removed for something a held bundle lists, so those members are locked: they show as held and
// only the bundle can change them.

export type UserCellPlan = {
  state: CellState;
  /** What a click would send. Empty when the click does nothing. */
  change: CellChange;
  /** Members held through a bundle: they stay held whatever the click does. */
  lockedByBundle: Capability[];
  /** Members the actor may not hand out, so a click that adds them is refused. */
  blockedForActor: Capability[];
  /** Whether the checkbox can be clicked. */
  enabled: boolean;
};

export function planUserCell({
  cell,
  effective,
  viaBundle,
  actorIsSuperUser,
  actorCapabilities,
  registry,
}: {
  cell: MatrixCell;
  /** Bundles plus direct grants. */
  effective: ReadonlySet<Capability>;
  /** Only what the user's bundles list. */
  viaBundle: ReadonlySet<Capability>;
  actorIsSuperUser: boolean;
  actorCapabilities: readonly Capability[];
  registry: KnownCapabilities;
}): UserCellPlan {
  const state = cellState({ cell, held: effective });
  const turnOn = state !== "all";
  const change = cellChange({ cell, held: effective, turnOn, registry });
  const lockedByBundle = cell.capabilities.filter((capability) => viaBundle.has(capability));

  // Clearing cannot touch a bundle's capability, so it only drops what is direct.
  const removable = change.remove.filter((capability) => !viaBundle.has(capability));
  const effectiveChange: CellChange = { add: change.add, remove: removable };

  const guard = canAssign({ actorIsSuperUser, actorCapabilities, granting: change.add });
  const blockedForActor = guard.allowed ? [] : guard.missing;

  const nothingToDo = effectiveChange.add.length === 0 && effectiveChange.remove.length === 0;
  return {
    state,
    change: effectiveChange,
    lockedByBundle,
    blockedForActor,
    enabled: !nothingToDo && blockedForActor.length === 0,
  };
}

// ---------- the filter ----------
export type UsageFilter = "all" | "unused" | "used";

/**
 * Whether a row shows for the text and the used/unused toggle. The text matches the row's name,
 * its description and its members' resource keys and names, so a search for a resource finds
 * the group it sits in. `held` is what the editor shows as held: a bundle's draft, or a user's
 * effective capabilities.
 */
export function matchesRowFilter({
  row,
  text,
  usage,
  held,
}: {
  row: MatrixRow;
  text: string;
  usage: UsageFilter;
  held: ReadonlySet<Capability>;
}): boolean {
  if (usage !== "all" && isRowUsed({ row, held }) !== (usage === "used")) return false;

  const needle = text.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [
    row.name,
    row.description ?? "",
    ...row.members.flatMap((member) => [member.resourceKey, member.resourceName]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}
