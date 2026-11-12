import { describe, expect, it } from "vitest";
import { isGateOpen, NavUser } from "@/permission/logic/navGate";
import { widgetCan } from "./logicFixtures";

const office: NavUser = { userName: "dana", role: "office" };
const superUser: NavUser = { userName: "superLuke", role: "admin", isSuperUser: true };
const loaded = (capabilities = [widgetCan.widgets.read], isSuperUser = false) => ({ capabilities, isSuperUser });

describe("isGateOpen: roles gate (legacy)", () => {
  it("opens for a listed role and stays shut for others", () => {
    expect(isGateOpen({ gate: { roles: ["admin", "office"] }, user: office, mine: null })).toBe(true);
    expect(isGateOpen({ gate: { roles: ["admin"] }, user: office, mine: null })).toBe(false);
  });

  it("treats no user as the public role, like the nav menu always has", () => {
    expect(isGateOpen({ gate: { roles: ["public"] }, user: null, mine: null })).toBe(true);
    expect(isGateOpen({ gate: { roles: ["admin"] }, user: null, mine: null })).toBe(false);
  });

  it("ignores the loaded capabilities entirely", () => {
    expect(isGateOpen({ gate: { roles: ["admin"] }, user: office, mine: loaded([widgetCan.widgets.read]) })).toBe(false);
  });
});

describe("isGateOpen: capability gate", () => {
  it("opens for a user holding the capability", () => {
    expect(isGateOpen({ gate: { capability: widgetCan.widgets.read }, user: office, mine: loaded() })).toBe(true);
  });

  it("stays shut for a user without it", () => {
    expect(isGateOpen({ gate: { capability: widgetCan.widgets.write }, user: office, mine: loaded() })).toBe(false);
  });

  it("stays shut until the capabilities have loaded", () => {
    expect(isGateOpen({ gate: { capability: widgetCan.widgets.read }, user: office, mine: null })).toBe(false);
  });

  it("opens for a confirmed superuser holding nothing", () => {
    expect(isGateOpen({ gate: { capability: widgetCan.widgets.write }, user: superUser, mine: loaded([], true) })).toBe(true);
  });

  it("does not trust the user's own superuser flag, only the server-confirmed one", () => {
    expect(isGateOpen({ gate: { capability: widgetCan.widgets.write }, user: superUser, mine: loaded([], false) })).toBe(false);
  });

  it("opens the 'superUser' requirement only for a confirmed superuser", () => {
    expect(isGateOpen({ gate: { capability: "superUser" }, user: superUser, mine: loaded([], true) })).toBe(true);
    expect(isGateOpen({ gate: { capability: "superUser" }, user: office, mine: loaded() })).toBe(false);
  });

  it("opens a 'public' requirement for anyone, signed in or not", () => {
    expect(isGateOpen({ gate: { capability: "public" }, user: null, mine: null })).toBe(true);
  });

  it("stays shut for no user on a protected requirement", () => {
    expect(isGateOpen({ gate: { capability: widgetCan.widgets.read }, user: null, mine: loaded() })).toBe(false);
  });
});
