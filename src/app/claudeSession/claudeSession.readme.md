# Claude session module

Stores Claude conversations, one record per turn, so a conversation can be recalled and replayed. It is a data module and knows nothing about the knowledge base or any other feature. It sits beside `src/app/anthropic/`, which makes the calls; this module only saves what came back.

## Shape: two collections

| Collection | One per | Holds |
|---|---|---|
| `ClaudeSession` | conversation | `sessionId`, `saId` (owner), `kind`, `title`, `turnCount` and running totals (`apiCalls`, `inputTokens`, `outputTokens`, `costUsd`) |
| `ClaudeSessionTurn` | turn | `sessionId`, `turnIndex`, `system`, and a `ChatTurn` (`prompt`, `replies`, `stats`, `notice`) |

They are separate because the list is small and always loaded, while turns are large and loaded on demand.

- `sessionId` is minted by the client with `crypto.randomUUID()` when a conversation starts. The server validates it with `z.uuid()`.
- Messages are stored verbatim (`Mixed`, `minimize: false`). Thinking blocks must be resent to the API unmodified, and `minimize` would drop a tool call's empty `input: {}`.
- `saId` is History (`src/lib/mongoose/mongo.readme.md` section 4): kept when the user is deleted, not in `deleteUserReferences`.

## Operations (`/claudeSession/api`)

| Op | Capability | Behavior |
|---|---|---|
| `getSessions` | `claudeRequests.read` | Newest first, capped at `CLAUDE_SESSION_LIST_LIMIT`. Every user's, for now |
| `getTurns` | `claudeRequests.read` | One session's turns, in order |
| `appendTurn` | `claudeRequests.write` | Creates the session on its first turn, else adds to the caller's own. Increments the totals atomically |
| `removeSession` | `claudeRequests.delete` | Deletes the session and its turns |

To narrow `read` to a user's own sessions later, filter `getSessions` and `getTurns` by the caller's `saId` (the index is already there).

## Totals

The client sends only the turn. The server adds that turn's `stats` to the session with `$inc`, so the list never loads turns to show cost. Costs are estimates (see `anthropic.readme.md`). A live conversation in the browser gets its totals from `claudeSessionSelect.totalsBySessionId`.

## Recalling a conversation

`loadTurns(sessionId)` then `claudeSessionSelect.chatTurnsBySessionId`, then `flattenConversation` from `anthropicLogic.ts` to get the `messages` array. `getTurns` is skipped when every turn the session holds is already in state.

## Known limits

- Turns are saved after the fact by the client. If the save fails, the turn exists only in the browser.
- If a turn insert fails, the session counters are rolled back. If another turn landed in between, the next `turnIndex` can collide and that save fails. This needs two turns of one session in flight at once, which the chat prevents.
- No pagination on the session list, no rename, no search.
- Not built: the chat page that uses this, and tests.