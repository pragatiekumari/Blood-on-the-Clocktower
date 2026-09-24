# Implementation Plan

## Overview

This plan builds the Blood on the Clocktower web app bottom-up: shared script/protocol data first, then the server's session, distribution, rules, and chat services, then the React client shell, and finally the role-specific views (Storyteller Grimoire, Player game view). Each server-side service is unit/integration tested before its corresponding UI is built against it. The plan ends with cross-cutting error-handling verification and full end-to-end dry runs at the minimum (5) and maximum (15) supported player counts.

## Task Dependency Graph

Tasks 6, 7, and 8 are independent of each other and can be built in parallel once task 5 (Distribution Service) is complete, since they each extend session state in non-overlapping ways (Grimoire/status, voting, chat). Tasks 12 and 13 similarly can proceed in parallel once their respective backend dependencies are done, and both depend on task 9 (client shell) and task 11 (onboarding, for the shared modal infrastructure) being in place first.

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2], "dependsOn": [1] },
    { "wave": 3, "tasks": [3], "dependsOn": [2] },
    { "wave": 4, "tasks": [4], "dependsOn": [3] },
    { "wave": 5, "tasks": [5], "dependsOn": [4] },
    { "wave": 6, "tasks": [6, 7, 8], "dependsOn": [5] },
    { "wave": 7, "tasks": [9], "dependsOn": [8] },
    { "wave": 8, "tasks": [10, 11], "dependsOn": [9] },
    { "wave": 9, "tasks": [12, 13], "dependsOn": [11] },
    { "wave": 10, "tasks": [14], "dependsOn": [12, 13] },
    { "wave": 11, "tasks": [15], "dependsOn": [14] }
  ]
}
```

## Tasks

- [ ] 1. Set up monorepo structure and shared package
  - Create `packages/shared`, `packages/server`, `packages/client` with TypeScript configs, a root workspace config (npm workspaces), and shared `tsconfig.base.json`.
  - Add `zod` to `shared` for schema validation.
  - _Requirements: (foundation for all)_

- [ ] 2. Build shared script data and protocol types
  - [ ] 2.1 Author `shared/script-data/troubleBrewing.ts` with the full 13 Townsfolk / 4 Outsider / 4 Minion / 1 Demon `CharacterDefinition[]` roster, including ability text and first/other night order values.
    - _Requirements: 3.5, 4.1_
  - [ ] 2.2 Author `shared/script-data/distributionTable.ts` with the `DISTRIBUTION_TABLE` for N = 5 through 15 exactly matching the values in the design.
    - _Requirements: 2.1_
  - [ ] 2.3 Define shared TypeScript interfaces/types for `PlayerRecord`, `GameSession` (client-safe subset), `CharacterDefinition`, `ActiveNomination`, and all WebSocket event payloads.
    - _Requirements: 2.5, 2.6, 3.1, 4.1, 5.3, 5.4_
  - [ ] 2.4 Define zod schemas for every client-to-server event payload listed in the design's protocol table, and a validation helper used by the gateway.
    - _Requirements: 9.5_
  - [ ] 2.5 Write unit tests asserting `DISTRIBUTION_TABLE` sums equal N for every key 5-15, and that the character roster has the correct per-type counts (13/4/4/1).
    - _Requirements: 2.1_

- [ ] 3. Implement server session management
  - [ ] 3.1 Implement `GameSession` and `PlayerRecord` in-memory store (`Map<code, GameSession>`) with a join-code generator that retries on collision.
    - _Requirements: 1.1_
  - [ ] 3.2 Implement `POST /api/sessions` (create session, assign Storyteller, issue signed storyteller token).
    - _Requirements: 1.1, 1.2_
  - [ ] 3.3 Implement `POST /api/sessions/:code/join` with validation: unknown code (404), duplicate display name (409), lobby full/max player count (403/422), issuing a signed player token + stable `playerId`.
    - _Requirements: 1.3, 1.4, 1.5, 1.8_
  - [ ] 3.4 Implement `GET /api/sessions/:code` lightweight lookup for pre-join validation.
    - _Requirements: 1.5_
  - [ ] 3.5 Implement minimum-player-count guard preventing distribution start below 5 players, surfaced as a named error code.
    - _Requirements: 1.7_
  - [ ] 3.6 Write unit tests for session creation, join validation (duplicate name, invalid code, over-capacity), and token issuance.
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.7, 1.8_

- [ ] 4. Implement WebSocket gateway and auth/reconnect
  - [ ] 4.1 Set up Socket.IO server, wire `session:{code}` room joins on connection, and implement the `auth` event to resolve a token to an existing `PlayerRecord`/Storyteller identity.
    - _Requirements: 8.2, 8.3_
  - [ ] 4.2 Implement reconnect logic: on reconnect with a valid existing token, rebind the new socket id to the existing `playerId` without creating a duplicate record; restore character view, alive/dead status, and room memberships (including evil chat room if applicable).
    - _Requirements: 8.2, 8.3, 8.4_
  - [ ] 4.3 Implement Storyteller-disconnect handling: pause Storyteller-only controls for other clients (broadcast a `storyteller:disconnected` status) without destroying the session; resume on reconnect.
    - _Requirements: 8.4_
  - [ ] 4.4 Implement the centralized `sendToPlayer(session, playerId, event, payloadBuilder)` helper and the general try/catch wrapper around every WebSocket handler that emits a typed `error` event back to the originating socket only.
    - _Requirements: 2.6, 3.6, 3.7, 4.2, 4.3, 9.5_
  - [ ] 4.5 Implement `lobby:update` broadcast on every join/leave while `phase === 'lobby'`.
    - _Requirements: 1.6_
  - [ ] 4.6 Write integration tests (in-process Socket.IO client) for: connect+auth, reconnect rebinding to the same `playerId`, Storyteller disconnect/resume, and lobby update broadcasts on join/leave.
    - _Requirements: 1.6, 8.1, 8.2, 8.3, 8.4_

- [ ] 5. Implement the Distribution Service
  - [ ] 5.1 Implement `distributeRoles(session)`: validate player count range (5-15), throw `DistributionRangeError` outside range.
    - _Requirements: 2.1, 2.2_
  - [ ] 5.2 Implement type-count lookup from `DISTRIBUTION_TABLE`, Fisher-Yates sampling without replacement per type, and 1:1 shuffled assignment to players.
    - _Requirements: 2.3, 2.4_
  - [ ] 5.3 Implement Evil bluff computation (3 unused Townsfolk names not in play) attached only to each Evil player's private payload.
    - _Requirements: 4.2_
  - [ ] 5.4 Implement the `buildDistributionPayload` per-recipient filter (Storyteller gets full Grimoire; player gets own character + type + alignment + ability, plus teammates/bluffs if evil) and wire `storyteller:startDistribution` to call distribution then emit filtered `game:distributed` to every socket plus `game:phaseChanged` to `day`/`dayNumber: 1`.
    - _Requirements: 2.5, 2.6, 2.8, 4.1, 4.3_
  - [ ] 5.5 Implement `storyteller:redistribute`, allowed only while `phase === 'lobby'`, discarding prior assignment and re-running distribution.
    - _Requirements: 2.7_
  - [ ] 5.6 Write unit tests: correct counts for every N in 5-15, no duplicate character assignments, rejection outside [5,15], bijection between players and characters, and payload-filter tests asserting a Good player's payload never contains another player's character/alignment while an Evil player's payload contains teammates+bluffs.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 4.2, 4.3_

- [ ] 6. Implement Storyteller Grimoire and phase controls
  - [ ] 6.1 Implement `grimoire:update` emission (Storyteller-only) reflecting every player's name, character, type, alignment, and alive/dead status whenever session state changes.
    - _Requirements: 3.1, 3.6_
  - [ ] 6.2 Implement `storyteller:setPlayerStatus` handler (poisoned/drunk/protected toggles) with Storyteller-only authorization check.
    - _Requirements: 3.2, 3.7_
  - [ ] 6.3 Implement `storyteller:setPhase` handler broadcasting `game:phaseChanged` to the session room, and wire the day-phase entry to reset nomination state (see task 7).
    - _Requirements: 3.3, 4.4_
  - [ ] 6.4 Implement `storyteller:markDead` handler updating `alive = false` and broadcasting the status change; ensure voting/nomination guards (task 7) respect it immediately.
    - _Requirements: 3.4_
  - [ ] 6.5 Implement night-order lookup endpoint/event returning first-night and other-night order for characters currently in play, sorted by their `firstNightOrder`/`otherNightOrder` values.
    - _Requirements: 3.5_
  - [ ] 6.6 Implement `storyteller:shareAbilityResult` handler delivering a Storyteller-authored result string to a specific player's `player:selfUpdate` event.
    - _Requirements: 4.6_
  - [ ] 6.7 Enforce Storyteller-only authorization (reject with a named error code) on all Grimoire-reading and Storyteller-only mutation events when invoked by a non-Storyteller socket.
    - _Requirements: 3.6, 3.7_
  - [ ] 6.8 Write unit/integration tests: Grimoire visibility restricted to Storyteller socket, status toggle persistence, phase broadcast reaching all clients, dead-player status propagation, night order sorting, and rejection of Storyteller-only actions from player sockets.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.4, 4.6_

- [ ] 7. Implement the Rules Engine (nominations, voting, execution)
  - [ ] 7.1 Implement `nominate(session, nominatorId, targetId)` with guards: nominator alive, no prior nomination today by this nominator, target alive, no other nomination currently open; emit `nomination:opened`.
    - _Requirements: 5.1, 5.2_
  - [ ] 7.2 Implement `vote(session, nominationId, playerId, voting)` with guards: nomination open, voter alive OR (dead AND not `usedDeadVote`); set `usedDeadVote = true` on a dead player's vote; emit `nomination:voteUpdate` with live tally.
    - _Requirements: 5.4, 5.5_
  - [ ] 7.3 Implement `closeVote(session, nominationId)` (Storyteller-only): tally yes-votes against `ceil(livingPlayers / 2)`, detect ties against other qualifying nominees resolved that day, set `pendingExecution`, emit `nomination:closed`.
    - _Requirements: 5.6, 5.7_
  - [ ] 7.4 Implement `confirmExecution(session, nominationId)` (Storyteller-only): mark target `alive = false`, emit `execution:confirmed`.
    - _Requirements: 5.8_
  - [ ] 7.5 Implement day-phase-entry reset: clear `hasNominatedToday` for all players and clear the active `nomination` while preserving `usedDeadVote`, wired to the `storyteller:setPhase` handler from task 6.3 when transitioning into `day`.
    - _Requirements: 5.9_
  - [ ] 7.6 Write unit tests covering: nomination guards (already nominated, dead nominator/target, concurrent nomination), vote guards (dead player without remaining vote), 50% threshold math at various living-player counts, tie detection, dead-vote one-time consumption, and day-reset behavior.
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.9_
  - [ ] 7.7 Write an integration test exercising the full nominate to vote to close to confirm-execution flow across multiple connected sockets, asserting all clients receive consistent state.
    - _Requirements: 5.3, 5.8_

- [ ] 8. Implement the Evil Chat Service
  - [ ] 8.1 Implement Evil room membership computation and socket join/leave wiring at distribution completion (all Evil-aligned players + Storyteller join `session:{code}:evil`).
    - _Requirements: 6.1_
  - [ ] 8.2 Implement `chat:evil:send` handler with server-side re-check of sender alignment before broadcasting `chat:evil:message` to the room.
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 8.3 Implement a bounded per-session message ring buffer and `chat:evil:history` replay on room join/reconnect.
    - _Requirements: 6.6_
  - [ ] 8.4 Implement `storyteller:setPlayerAlignment` hook to move a socket in/out of the evil room if a character effect changes alignment mid-game.
    - _Requirements: 6.5_
  - [ ] 8.5 Write integration tests asserting: only Evil sockets + Storyteller receive `chat:evil:message`; a Good player's socket never receives it even if it requests chat state; history replay works on reconnect.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 9. Build the React client shell and routing
  - [ ] 9.1 Scaffold Vite + React + TypeScript app with React Router routes: `/`, `/host`, `/play/:code`, and role-aware game routes.
    - _Requirements: (foundation)_
  - [ ] 9.2 Implement `useGameSocket` hook: connect, send stored token for auth, typed event subscriptions, automatic reconnect with backoff.
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ] 9.3 Implement `useSession` hook deriving role-aware state (lobby players, own character, phase, nomination/vote state, chat) from socket events.
    - _Requirements: 1.6, 2.6, 3.1, 4.1, 4.4, 4.5, 5.3, 5.4_
  - [ ] 9.4 Implement the gothic theme tokens file (`theme/tokens.css`) defining the color palette, typography, and clocktower iconography used across all screens.
    - _Requirements: 9.1_
  - [ ] 9.5 Implement `ErrorToast` component subscribing to socket `error` events and REST error responses, mapping known error codes to friendly copy.
    - _Requirements: 9.5_

- [ ] 10. Build HomePage and LobbyPage
  - [ ] 10.1 Implement `HomePage`: create-game action (calls create session, stores Storyteller token, navigates to Storyteller lobby) and join-game form (join code + display name, calls join endpoint, stores player token, navigates to player lobby).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 10.2 Implement `LobbyPage` (shared by both roles): live joined-player list via `lobby:update`, player-count validation messaging (below minimum / at maximum), and a Storyteller-only "Start Distribution" button gated on the minimum player count.
    - _Requirements: 1.6, 1.7, 1.8, 2.1, 2.2_
  - [ ] 10.3 Implement the Storyteller's "Re-roll Distribution" control, available only pre-game.
    - _Requirements: 2.7_

- [ ] 11. Build the Onboarding flow
  - [ ] 11.1 Author `shared/content/onboarding.ts` with Theme, Goal (generic and alignment-specific variants), and the four Core Rules text, sourced from the rules explanation sheet content.
    - _Requirements: 7.2, 7.3, 7.4_
  - [ ] 11.2 Implement `OnboardingModal` component rendering Theme, then Goal, then Rules as sequential steps, shown automatically on first join per device.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 11.3 Implement `localStorage`-based "seen" flag (`botc:onboarding:seen`) to skip auto-show on subsequent games, plus a manually triggerable "Rules" entry point that reopens the modal anytime.
    - _Requirements: 7.5, 7.6_
  - [ ] 11.4 Implement an in-game rules/character reference panel (core rules + current player's own character ability text) accessible without leaving the game screen.
    - _Requirements: 7.6_

- [ ] 12. Build the Storyteller Game View
  - [ ] 12.1 Implement `GrimoireTable` component displaying every player's name, character, type badge, alignment color, and alive/dead status, with responsive collapse to a card list under ~768px.
    - _Requirements: 3.1, 9.2, 9.3, 9.4_
  - [ ] 12.2 Implement per-player status toggle controls (poisoned/drunk/protected) and dead-marking action wired to `storyteller:setPlayerStatus` / `storyteller:markDead`.
    - _Requirements: 3.2, 3.4_
  - [ ] 12.3 Implement day/night phase toggle control wired to `storyteller:setPhase`.
    - _Requirements: 3.3_
  - [ ] 12.4 Implement the night-order reference panel showing first-night/other-night wake order for in-play characters.
    - _Requirements: 3.5_
  - [ ] 12.5 Implement the ability-result input control (select player, enter result text) wired to `storyteller:shareAbilityResult`.
    - _Requirements: 4.6_
  - [ ] 12.6 Implement Storyteller-side nomination/vote monitoring view and the "Close Vote" / "Confirm Execution" action controls wired to `storyteller:closeVote` and `storyteller:confirmExecution`.
    - _Requirements: 5.6, 5.7, 5.8_
  - [ ] 12.7 Implement a read-only Evil chat viewer panel for the Storyteller.
    - _Requirements: 6.4_

- [ ] 13. Build the Player Game View
  - [ ] 13.1 Implement `CharacterCard` component showing the player's character name, type badge, alignment color, and ability text.
    - _Requirements: 4.1, 9.2, 9.3_
  - [ ] 13.2 Implement Evil-player-specific view additions: teammate list and bluff characters, rendered only when `alignment === 'evil'`.
    - _Requirements: 4.2, 4.3_
  - [ ] 13.3 Implement day/night phase indicator reacting to `game:phaseChanged`.
    - _Requirements: 4.4_
  - [ ] 13.4 Implement dead-status indicator and display of shared ability results via `player:selfUpdate`.
    - _Requirements: 4.5, 4.6_
  - [ ] 13.5 Implement `NominationBar` (nominate-a-player control, disabled per guards) and `VoteTally` (live vote display, cast/retract vote control respecting dead-vote-once-used rule) components.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 13.6 Implement `EvilChatPanel`, rendered only for Evil-aligned players, sending/receiving via `chat:evil:send`/`chat:evil:message`/`chat:evil:history`.
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  - [ ] 13.7 Implement mobile-width responsive layout for the player action bar (nominate/vote/chat) as a bottom tab bar.
    - _Requirements: 9.4_

- [ ] 14. Cross-cutting error handling pass
  - [ ] 14.1 Verify every REST endpoint returns the structured `{ error: { code, message } }` shape with correct HTTP status codes.
    - _Requirements: 9.5_
  - [ ] 14.2 Verify every WebSocket handler emits a typed `error` event on failure rather than throwing uncaught, and that the session/game loop survives a bad request from one client.
    - _Requirements: 9.5_
  - [ ] 14.3 Verify `ErrorToast` copy for each defined error code is non-technical and actionable.
    - _Requirements: 9.5_

- [ ] 15. End-to-end verification pass
  - [ ] 15.1 Run the full server unit + integration test suite and the client unit test suite; fix any failures.
    - _Requirements: (all)_
  - [ ] 15.2 Perform a scripted 5-player dry run (minimum player count) end to end: lobby, distribution, day/night cycling, one nomination/vote/execution cycle, Evil chat exchange, onboarding flow, and a reconnect mid-game.
    - _Requirements: 1.7, 2.1, 3.3, 5.1, 5.3, 5.8, 6.1, 7.1, 8.2, 8.3_
  - [ ] 15.3 Perform a scripted 15-player dry run (maximum player count) end to end, focused on distribution correctness and UI responsiveness at scale.
    - _Requirements: 1.8, 2.1, 9.4_
  - [ ] 15.4 Verify build passes for all three packages (`shared`, `server`, `client`) with no TypeScript errors.
    - _Requirements: (all)_

## Notes

- All task-level requirement references use the numbering from `requirements.md` (Requirement N, Acceptance Criterion M as N.M).
- Tasks 6, 7, and 8 (Grimoire, Rules Engine, Chat) touch the same `GameSession`/`PlayerRecord` structures; implement and merge them sequentially if working solo, or coordinate carefully on shared state shape if parallelized, to avoid merge conflicts in `server/session`.
- No task in this plan introduces automated character-ability logic (e.g. computing what the Empath actually learns) — per the design's Storyteller-driven-night-actions scope decision, ability results are always Storyteller-authored text pushed via `storyteller:shareAbilityResult` (task 6.6).
- Task 15's dry runs are the primary functional acceptance gate for this feature; do not consider the implementation complete until both the 5-player and 15-player scripted runs pass without manual workarounds.
