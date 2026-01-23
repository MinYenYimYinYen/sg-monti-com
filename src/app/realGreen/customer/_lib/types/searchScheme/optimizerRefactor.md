# Search Optimizer Refactor Plan

This document outlines the proposed changes to the `SearchOptimizer` data structure to improve clarity and simplify runtime calculations.

## Proposed Data Structure

| Strategy | Current Name | **Proposed Name** | **Type** | **Why?** |
| :--- | :--- | :--- | :--- | :--- |
| **Pagination** | `lastRecordCount` | **`initialPageCount`** | `number` | **Direct Usage.** Instead of storing `1250` records and calculating `Math.ceil(1250/500)` every time, we just store `3`. The step simply fires 3 requests. |
| **Batching** | `optimalBatchSize` | **`batchSize`** | `number` | **Simplicity.** It is the batch size. "Optimal" is implied. |
| **Batching** | `currentMaxRecordCount` | **`lastMaxResponseSize`** | `number` | **Clarity.** "Current" is confusing for a stored historical value. This clearly indicates it was the max density found in the *last* run (used to tune the next batch). |
| **Global** | `totalCalls` | **`totalRequests`** | `number` | **Accuracy.** "Calls" is vague. This tracks the total number of HTTP requests made. |
| **Global** | `avgDuration` | **`avgLatencyMs`** | `number` | **Units.** Explicitly states this is the average time (in ms) per HTTP request. |
| **Global** | `totalRecords` | **`totalRecords`** | `number` | (Unchanged) Useful for high-level stats. |
