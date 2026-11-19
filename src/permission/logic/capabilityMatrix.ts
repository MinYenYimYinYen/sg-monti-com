import type { Capability } from "@/permission/PermissionTypes";
import { VERB_COMPANIONS, type CapabilityRegistry } from "@/permission/registryTypes";
import { canAssign, canRemove } from "@/permission/logic/assignmentGuards";

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

/**
 * One resource inside a group row. Its cells use the same columns as the group's, and each holds
 * only this resource's capability for the verb, so ticking one overrides that resource alone.
 */
export type MatrixResource = {
  key: string;
  name: string;
  description?: string;
  source?: string;
  cells: (MatrixCell | null)[];
};

export type MatrixRow = {
  /** The registry group's key. */
  key: string;
  name: string;
  description?: string;
  members: MatrixMember[];
  /** The group's resources that have something to grant, in registry order. */
  resources: MatrixResource[];
  /** One entry per matrix column, null where this row has no capability with that verb. */
  cells: (MatrixCell | null)[];
};

export type Matrix = { columns: string[]; rows: MatrixRow[] };

/** Identifies one cell, for keys and for the lock notes an editor passes to the table. */
export function cellKey({ rowKey, verb }: { rowKey: string; verb: string }): string {
  return `${rowKey}|${verb}`;
}

/**
 * The `rowKey` of a resource's cells. Prefixed with the group so it can never collide with a group
 * row's key, even if a group and a resource were given the same key.
 */
export function resourceRowKey({ groupKey, resourceKey }: { groupKey: string; resourceKey: string }): string {
  return `${groupKey}/${resourceKey}`;
}

function verbRank(verb: string): number {
  const index = VERB_ORDER.indexOf(verb);
  return index === -1 ? VERB_ORDER.length : index;
}

/** One cell per column: the capabilities that have the column's verb, or null when there are none. */
function cellsFor({
  columns,
  capabilities,
  registry,
}: {
  columns: string[];
  capabilities: readonly Capability[];
  registry: MatrixRegistry;
}): (MatrixCell | null)[] {
  return columns.map((verb) => {
    const matching = capabilities.filter((capability) => registry.describe(capability)?.verb === verb);
    return matching.length > 0 ? { verb, capabilities: matching } : null;
  });
}

/**
 * One row per registry group, in registry order. A group left with nothing to grant (every
 * capability public) has no row.
 */
export function buildMatrix({ registry }: { registry: MatrixRegistry }): Matrix {
  const rowsWithoutCells: Omit<MatrixRow, "cells" | "resources">[] = [];

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

  const rows = rowsWithoutCells.map((row): MatrixRow => {
    const group = registry.byGroup.find((registryGroup) => registryGroup.key === row.key);
    const resources = (group?.resources ?? [])
      .filter((resource) => resource.capabilities.length > 0)
      .map(
        (resource): MatrixResource => ({
          key: resource.key,
          name: resource.name,
          ...(resource.description ? { description: resource.description } : {}),
          ...(resource.source ? { source: resource.source } : {}),
          cells: cellsFor({ columns, capabilities: resource.capabilities, registry }),
        }),
      );

    return {
      ...row,
      resources,
      cells: cellsFor({ columns, capabilities: row.members.map((member) => member.capability), registry }),
    };
  });

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
  /**
   * What the click would change that the actor may not: capabilities it would add that they do not
   * hold, or take away that they do not hold. A click is either all adds or all removals.
   */
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

  const addGuard = canAssign({ actorIsSuperUser, actorCapabilities, granting: effectiveChange.add });
  const removeGuard = canRemove({ actorIsSuperUser, actorCapabilities, removing: effectiveChange.remove, registry });
  const blockedForActor = [
    ...(addGuard.allowed ? [] : addGuard.missing),
    ...(removeGuard.allowed ? [] : removeGuard.missing),
  ];

  const nothingToDo = effectiveChange.add.length === 0 && effectiveChange.remove.length === 0;
  return {
    state,
    change: effectiveChange,
    lockedByBundle,
    blockedForActor,
    enabled: !nothingToDo && blockedForActor.length === 0,
  };
}

function pluralCapabilities(count: number): string {
  return count === 1 ? "capability" : "capabilities";
}

/** Why a cell is locked or refused, for its tooltip. Undefined when there is nothing to explain. */
function userCellNote(plan: UserCellPlan): string | undefined {
  if (plan.blockedForActor.length > 0) {
    const verb = plan.change.remove.length > 0 ? "remove" : "grant";
    return `You do not hold ${plan.blockedForActor.length} of the ${pluralCapabilities(plan.blockedForActor.length)} this would ${verb}, so you cannot change it.`;
  }
  if (plan.lockedByBundle.length === 0) return undefined;
  return plan.enabled
    ? "Part of this is granted by a bundle and stays either way."
    : "Granted by a bundle. Change the bundle to change this.";
}

export type UserMatrixPlan = {
  /** Every cell's plan, keyed by `cellKey`. A click reads its change from here. */
  plans: Record<string, UserCellPlan>;
  /** Keys of the cells that cannot be clicked, for the table's `disabledCells`. */
  disabledCells: Set<string>;
  /** Tooltip text by cell key, for the table's `cellNotes`. */
  cellNotes: Record<string, string>;
};

/**
 * Plans every group cell and every resource cell of the matrix for one user, so the editor only
 * hands the result to the table. Group and resource cells go through the same `planUserCell`.
 */
export function planUserMatrix({
  matrix,
  effective,
  viaBundle,
  actorIsSuperUser,
  actorCapabilities,
  registry,
}: {
  matrix: Matrix;
  effective: ReadonlySet<Capability>;
  viaBundle: ReadonlySet<Capability>;
  actorIsSuperUser: boolean;
  actorCapabilities: readonly Capability[];
  registry: KnownCapabilities;
}): UserMatrixPlan {
  const result: UserMatrixPlan = { plans: {}, disabledCells: new Set(), cellNotes: {} };

  function planCells({ rowKey, cells }: { rowKey: string; cells: (MatrixCell | null)[] }) {
    for (const cell of cells) {
      if (!cell) continue;
      const key = cellKey({ rowKey, verb: cell.verb });
      const plan = planUserCell({ cell, effective, viaBundle, actorIsSuperUser, actorCapabilities, registry });
      result.plans[key] = plan;
      if (!plan.enabled) result.disabledCells.add(key);
      const note = userCellNote(plan);
      if (note) result.cellNotes[key] = note;
    }
  }

  for (const row of matrix.rows) {
    planCells({ rowKey: row.key, cells: row.cells });
    for (const resource of row.resources) {
      planCells({ rowKey: resourceRowKey({ groupKey: row.key, resourceKey: resource.key }), cells: resource.cells });
    }
  }
  return result;
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
