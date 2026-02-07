// import { createSelector, Selector } from "@reduxjs/toolkit";
// import { AppState } from "@/store";
// import { CustBatch } from "@/app/realGreen/customer/_lib/deprecated/entitySelectors";
//
// /**
//  * A utility to create a "Selector Factory" that depends on other Selector Factories.
//  * This ensures that all selectors in the chain accept `batch` and are memoized correctly.
//  *
//  * @param inputFactories An array of functions that take a `batch` and return a Selector.
//  * @param combiner The function to combine the results of the selectors.
//  * @returns A function that takes a `batch` and returns a memoized Selector.
//  */
// export function createBatchSelector<T extends any[], Result>(
//   inputFactories: {
//     [K in keyof T]: (batch: CustBatch) => Selector<AppState, T[K]>;
//   },
//   combiner: (...args: T) => Result,
// ) {
//   const cache = new Map<CustBatch, Selector<AppState, Result>>();
//
//   return (batch: CustBatch): Selector<AppState, Result> => {
//     if (!cache.has(batch)) {
//       // HERE is where the batch is passed down to the dependencies
//       const inputSelectors = inputFactories.map((factory) => factory(batch));
//
//       cache.set(batch, createSelector(inputSelectors, combiner));
//     }
//     return cache.get(batch)!;
//   };
// }