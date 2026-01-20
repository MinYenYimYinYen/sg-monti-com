I need to implement a "Streaming Data" pattern for customerSlice. I want to fetch data from a single API endpoint that streams NDJSON (Newline Delimited JSON) responses, and update Redux incrementally as chunks arrive.

Please help me implement this by following these 3 steps.

Context & Architecture:
- My Redux store setup is in: src/store (or equivalent)
- I use standard Redux Toolkit (createSlice, createAsyncThunk).
- I want to avoid "blocking" UI. As soon as the 'customers' chunk arrives, the UI should update, even if 'services' is still downloading.

Please generate the code for these files:

1. The API Route (Next.js App Router)
    - File: app/api/stream-dashboard/route.ts
    - It should simulate a delay and stream 3 separate JSON objects (e.g., {type: 'customers', data: ...}, {type: 'programs'...}) separated by newlines.

2. The Slice (Redux)
    - File: src/lib/features/dashboard/dashboardSlice.ts
    - It needs reducers for `receiveCustomers`, `receivePrograms`, etc.
    - Initial state should have these fields as null.

3. The Streaming Thunk
    - File: src/lib/features/dashboard/dashboardThunks.ts
    - Use `createAsyncThunk`.
    - IMPORTANT: Do NOT return the final data. Instead, use `response.body.getReader()` to read the stream.
    - As each NDJSON line is parsed, strictly use `dispatch(dashboardActions.receiveX(data))` to update the store immediately.

Please look at my existing `employeeSlice.ts` (if available) to match my project's coding style, but adapt it for this streaming pattern.