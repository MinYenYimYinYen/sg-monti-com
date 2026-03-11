import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  SchedPromiseDraft,
  CustPromise,
  ProgPromise,
  ServPromise,
} from "@/app/schedPromise/SchedPromiseTypes";

/**
 * Type guard to check if a promise is a CustomerPromise
 * Checks for the presence of custId property
 */
function isCustPromise(
  promise: SchedPromiseDraft
): promise is CustPromise {
  return typeGuard.hasDefined(promise, "custId" as keyof SchedPromiseDraft);
}

/**
 * Type guard to check if a promise is a ProgramPromise
 * Checks for the presence of progId property
 */
function isProgPromise(
  promise: SchedPromiseDraft
): promise is ProgPromise {
  return typeGuard.hasDefined(promise, "progId" as keyof SchedPromiseDraft);
}

/**
 * Type guard to check if a promise is a ServicePromise
 * Checks for the presence of servId property
 */
function isServPromise(
  promise: SchedPromiseDraft
): promise is ServPromise {
  return typeGuard.hasDefined(promise, "servId" as keyof SchedPromiseDraft);
}

/**
 * Filters an array to only CustomerPromises
 */
function filterCustPromises(
  promises: SchedPromiseDraft[]
): CustPromise[] {
  return promises.filter(isCustPromise);
}

/**
 * Filters an array to only ProgramPromises
 */
function filterProgPromises(
  promises: SchedPromiseDraft[]
): ProgPromise[] {
  return promises.filter(isProgPromise);
}

/**
 * Filters an array to only ServicePromises
 */
function filterServPromises(
  promises: SchedPromiseDraft[]
): ServPromise[] {
  return promises.filter(isServPromise);
}

/**
 * Merges multiple arrays of typed promises into a single array of SchedPromiseDraft
 * @param params Object containing arrays of customer, program, and service promises
 * @returns Combined array of all promises as SchedPromiseDraft
 * @example
 * const merged = mergePromises({
 *   customerPromises: [{ custId: 1, isPermanent: "true", ... }],
 *   programPromises: [{ progId: 10, isPermanent: "false", ... }],
 *   servicePromises: [{ servId: 100, isPermanent: "true", ... }]
 * });
 */
export function mergePromises(params: {
  customerPromises: CustPromise[];
  programPromises: ProgPromise[];
  servicePromises: ServPromise[];
}): SchedPromiseDraft[] {
  const { customerPromises, programPromises, servicePromises } = params;
  return [...customerPromises, ...programPromises, ...servicePromises];
}

/**
 * Separates a mixed array of promises into typed arrays based on their ID properties
 * @param params Object containing array of promises to separate
 * @returns Object with three arrays: customerPromises, programPromises, servicePromises
 * @example
 * const separated = separatePromises({
 *   promises: [
 *     { custId: 1, isPermanent: "true", ... },
 *     { servId: 100, isPermanent: "false", ... },
 *     { progId: 10, isPermanent: "true", ... }
 *   ]
 * });
 * // separated.customerPromises: CustPromise[]
 * // separated.programPromises: ProgPromise[]
 * // separated.servicePromises: ServPromise[]
 */
function separatePromises(params: { promises: SchedPromiseDraft[] }): {
  customerPromises: CustPromise[];
  programPromises: ProgPromise[];
  servicePromises: ServPromise[];
} {
  const { promises } = params;
  return {
    customerPromises: filterCustPromises(promises),
    programPromises: filterProgPromises(promises),
    servicePromises: filterServPromises(promises),
  };
}

export const schedPromiseTypeGuard = {
  isCustPromise,
  isProgPromise,
  isServPromise,
  filterCustPromises,
  filterProgPromises,
  filterServPromises,
  mergePromises,
  separatePromises,
}
