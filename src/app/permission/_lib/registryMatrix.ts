import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { buildMatrix } from "@/permission/logic/capabilityMatrix";

// The registry never changes while the app runs, so the matrix is built once.
export const registryMatrix = buildMatrix({ registry: capabilityRegistry });
