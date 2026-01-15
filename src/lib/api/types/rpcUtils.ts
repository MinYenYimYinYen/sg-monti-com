import { Role } from "@/lib/api/types/roles";

// export type OpMap<T extends Record<string, { params: any; result: any }>> = {
//   [K in keyof T]: { op: K } & T[K]["params"];
// }[keyof T];
//
// // NEW: A handler is now an Object containing the Security Config AND the Function
// export type HandlerMap<T extends Record<string, { params: any; result: any }>> =
//   {
//     [K in keyof T]: {
//       roles: Role[]; // Force explicit security definition
//       handler: (params: T[K]["params"]) => Promise<T[K]["result"]>;
//     };
//   };
/**
 * 1. OpMap
 * Generates the Request Body Union (e.g., { op: 'getAll', ...params } | { op: 'save', ... })
 * We removed the 'extends Record' constraint to support Interfaces.
 */
export type OpMap<T> = {
  [K in keyof T]: T[K] extends { params: infer P } ? { op: K } & P : never;
}[keyof T];

/**
 * 2. HandlerMap
 * Enforces that every operation in the contract has a 'handler' and 'roles'.
 */
export type HandlerMap<T> = {
  [K in keyof T]: T[K] extends { params: infer P; result: infer R }
    ? {
        roles: Role[];
        handler: (params: P) => Promise<R>;
      }
    : never;
};
