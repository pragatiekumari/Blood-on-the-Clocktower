# Requirements Document

## Introduction

This feature is a web application that lets a group of people play *Blood on the Clocktower* online. One player takes the **Storyteller** role (the "God" view) and runs the game; every other player joins as a **Townsperson** and is shown a screen tailored to their secret character and alignment. The app handles player registration, role/character distribution based on the official Trouble Brewing player-count tables, day/night phase flow, nominations and voting, and a private chat channel visible only to Evil-aligned players (and the Storyteller). The experience should feel thematic (Ravenswood Bluff / gothic mystery aesthetic) and be friendly to newcomers, consistent with the Theme → Goal → Rules explanation philosophy used when teaching the game in person.

Reference material: character types, setup, and rules text are drawn from bloodontheclocktower.com and its companion wiki (wiki.bloodontheclocktower.com), specifically the Trouble Brewing base script.

## Glossary

- **Storyteller**: The player who runs the game, sees all information, and controls game flow. Equivalent to a "God" or game master view.
- **Grimoire**: The Storyteller's private reference showing every player's true character and status (alive/dead, poisoned/drunk, etc).
- **Townsfolk / Outsider**: Good-aligned character types.
- **Minion / Demon**: Evil-aligned character types.
- **Alignment**: Good (blue) or Evil (red).
- **Nomination**: A public proposal to execute a specific player.
- **Execution**: The result of a successful vote against a nominated player.
- **Script**: The set of characters in play for a given game (this spec scopes to the Trouble Brewing script only).

## Requirements

### Requirement 1: Game Creation and Player Registration

**User Story:** As a host, I want to create a new game session and share a join code, so that my friends can join from their own devices before I distribute roles.

#### Acceptance Criteria

1. WHEN a user chooses to host a game THEN the system SHALL create a new game session with a unique, human-shareable join code (e.g. a 4-6 character alphanumeric code).
2. WHEN a game session is created THEN the system SHALL assign the creator the Storyteller role for that session by default.
3. WHEN a user enters a valid join code and a display name THEN the system SHALL add them to the session's player list as a Townsperson (non-Storyteller) participant.
4. IF a submitted display name is already taken within that session THEN the system SHALL reject the join attempt and prompt for a different name.
5. IF a join code does not correspond to an active session THEN the system SHALL display an error explaining the code is invalid or the game has ended.
6. WHILE the session is in the "lobby" state (before role distribution) THE Storyteller's screen SHALL display the live list of joined players, updating in real time as players join or leave.
7. WHEN the number of joined players is fewer than 5 THEN the system SHALL prevent the Storyteller from starting role distribution and SHALL indicate the minimum player count has not been met.
8. WHEN the number of joined players exceeds the maximum supported by the configured script (15 for Trouble Brewing) THEN the system SHALL prevent additional players from joining.

### Requirement 2: Player-Count-Based Role Distribution

**User Story:** As a Storyteller, I want the app to automatically determine and assign the correct mix of character types for however many players joined, so that I don't have to manually calculate the Townsfolk/Outsider/Minion/Demon split.

#### Acceptance Criteria

1. WHEN the Storyteller starts distribution for N joined players (5 ≤ N ≤ 15) THEN the system SHALL determine the number of Townsfolk, Outsiders, Minions, and Demons using the official Trouble Brewing distribution table.
2. IF N is outside the supported range (fewer than 5 or more than 15) THEN the system SHALL block distribution and display the valid range to the Storyteller.
3. WHEN the type counts are determined THEN the system SHALL randomly select specific characters of each type from the Trouble Brewing script without repeating a character within the same game.
4. WHEN characters are selected THEN the system SHALL randomly assign exactly one character to each joined player, ensuring no player receives more than one character.
5. WHEN distribution completes THEN the system SHALL record, for the Storyteller's Grimoire view only, each player's character, character type, and alignment (good/evil).
6. WHEN distribution completes THEN each player's own client SHALL receive only their own character, character type, alignment, and ability text — never another player's identity.
7. IF the Storyteller chooses to re-roll distribution before the game starts THEN the system SHALL discard the prior assignment and repeat the distribution process.
8. WHEN distribution completes THEN the system SHALL transition the session from "lobby" to "in progress" and reveal each player's character screen.

### Requirement 3: Storyteller ("God") View

**User Story:** As the Storyteller, I want a dedicated control screen showing every player's true identity and game state, so that I can run night actions, track deaths, and manage the game.

#### Acceptance Criteria

1. WHEN the Storyteller views their screen THEN the system SHALL display the full Grimoire: every player's name, character, character type, alignment, and alive/dead status.
2. WHEN the Storyteller views a player entry THEN the system SHALL allow marking that player's status as poisoned, drunk, or protected, and toggling it off.
3. WHEN the Storyteller advances the game from day to night (or night to day) THEN the system SHALL broadcast the updated phase to all connected player clients.
4. WHEN the Storyteller marks a player as dead THEN the system SHALL update that player's status across all views and SHALL restrict that player's subsequent voting and nomination rights as described in Requirement 5.
5. WHEN the Storyteller opens night order guidance THEN the system SHALL display the Trouble Brewing first-night and other-night character wake order for the characters currently in play.
6. ONLY the Storyteller's client SHALL have access to the Grimoire and full player identity list.
7. IF a non-Storyteller client attempts to access Grimoire data via a direct request THEN the system SHALL deny the request.

### Requirement 4: Player Character View

**User Story:** As a joined player, I want a personal screen showing my character, my alignment, and what I need to know to play, so that I understand my role without seeing anyone else's identity.

#### Acceptance Criteria

1. WHEN a player's character screen loads THEN the system SHALL display their character name, character type (Townsfolk/Outsider/Minion/Demon), alignment (good/evil), and ability text.
2. WHEN a player is Evil-aligned (Minion or Demon) THEN the system SHALL additionally display the identities of other Evil players and, where applicable per the script's rules, "bluff" Townsfolk/Outsider characters not in play.
3. WHEN a player is Good-aligned THEN the system SHALL NOT reveal any other player's character or alignment on their screen.
4. WHEN the current game phase changes (day/night) THEN each player's screen SHALL reflect the current phase.
5. WHEN a player is marked dead by the Storyteller THEN that player's screen SHALL indicate their dead status while still allowing them to view game state and use their single remaining vote per Requirement 5.
6. IF a player's character has a passive ability the Storyteller has recorded a result for (e.g. information learned at night) THEN the system SHALL display that result on the player's screen when the Storyteller shares it.

### Requirement 5: Day Phase — Nominations, Voting, and Execution

**User Story:** As a player, I want to nominate someone for execution and cast votes during the day phase, so the town can act on its collective suspicions.

#### Acceptance Criteria

1. WHEN the game is in the day phase THEN the system SHALL allow any living player to submit one nomination against another living player.
2. IF a player has already made a nomination on the current day THEN the system SHALL prevent them from nominating again that day.
3. WHEN a nomination is submitted THEN the system SHALL open a public vote visible to all connected clients, showing the nominee and a live tally.
4. WHEN a living player casts or retracts their vote during an open nomination THEN the system SHALL update the live tally for all clients in real time.
5. WHEN a dead player casts a vote THEN the system SHALL enforce that they may only do so if they have not already used their one lifetime vote, per game rules.
6. WHEN voting closes on a nomination THEN the system SHALL determine whether the nominee's vote count meets or exceeds 50% of living players and SHALL flag the nominee as "pending execution" if so.
7. IF two or more nominees are tied for the highest qualifying vote count at end of day THEN the system SHALL mark that no execution occurs.
8. WHEN the Storyteller confirms an execution THEN the system SHALL mark that player dead and update all clients.
9. WHEN the day phase ends THEN the system SHALL reset per-day nomination usage while preserving each player's lifetime dead-vote usage.

### Requirement 6: Evil Private Chat

**User Story:** As an Evil-aligned player, I want a private chat channel with the other Evil players, so we can coordinate without good players seeing our conversation.

#### Acceptance Criteria

1. WHEN a player is assigned an Evil-aligned character THEN the system SHALL grant that player access to a chat channel containing only the other currently Evil-aligned players.
2. WHEN a Good-aligned player's client requests chat access THEN the system SHALL NOT expose the Evil chat channel or its message history.
3. WHEN an Evil player sends a message in the Evil chat THEN the system SHALL deliver it in real time to all other Evil players' clients and to the Storyteller.
4. WHEN the Storyteller views the game THEN the system SHALL allow the Storyteller to read the Evil chat for moderation/support purposes.
5. IF a character's ability changes a player's effective alignment or evil-team membership during the game (e.g. becoming Evil via a special ability) THEN the system SHALL update that player's chat access accordingly.
6. WHEN a player disconnects and reconnects THEN the system SHALL restore their access to the Evil chat (if applicable) and recent message history for the current session.

### Requirement 7: New-Player Onboarding (Theme → Goal → Rules)

**User Story:** As a new player, I want a short guided introduction before the game starts, so I understand the theme, my goal, and the core rules without being overwhelmed.

#### Acceptance Criteria

1. WHEN a player joins a session for the first time THEN the system SHALL offer a brief onboarding sequence structured as Theme, then Goal, then Rules, consistent with the three-step explanation process.
2. WHEN the onboarding sequence displays the Theme step THEN the system SHALL present the Ravenswood Bluff narrative framing (murder, demon, storyteller) without gameplay rules.
3. WHEN the onboarding sequence displays the Goal step THEN the system SHALL present the player's win condition based on their eventual alignment being unknown yet, phrased generally (good seeks to find and execute the Demon; evil seeks to survive and eliminate the town) — OR, if the player's character has already been assigned, phrased specifically to their alignment.
4. WHEN the onboarding sequence displays the Rules step THEN the system SHALL present only the four core rules (talk freely, no peeking at others' info, ask the Storyteller questions, play kindly) plus the basic day/night structure, deferring character-specific and voting-specific detail until those moments occur in-game.
5. WHEN a player has completed onboarding once on a given device THEN the system SHALL allow them to skip it on subsequent games while still offering a way to revisit it manually.
6. WHEN a player requests help during the game THEN the system SHALL provide a way to view rules reference content (core rules, voting rules, their character's ability text) without leaving the current game screen.

### Requirement 8: Real-Time Synchronization and Session Resilience

**User Story:** As a player, I want the game state on my screen to stay in sync with everyone else's, and to be able to reconnect if I lose connection, so a dropped connection doesn't ruin the game.

#### Acceptance Criteria

1. WHEN any game state changes (phase, votes, deaths, nominations) THEN the system SHALL push updates to all affected connected clients without requiring a manual page refresh.
2. IF a player's connection drops THEN the system SHALL preserve their session state server-side for the duration of the game.
3. WHEN a disconnected player reconnects using their original session THEN the system SHALL restore their character view, alive/dead status, and chat access exactly as before disconnection.
4. IF the Storyteller disconnects THEN the system SHALL pause Storyteller-only controls for other clients but SHALL NOT terminate the session, allowing the Storyteller to reconnect and resume.

### Requirement 9: Thematic, Friendly UI

**User Story:** As any player, I want the interface to look and feel like Blood on the Clocktower, so the experience feels immersive rather than like a generic form-based app.

#### Acceptance Criteria

1. WHEN any screen renders THEN the system SHALL apply a consistent gothic/mystery visual theme (color palette, typography, iconography) evoking Ravenswood Bluff and the game's clocktower motif.
2. WHEN a player's alignment is Good THEN the system SHALL use the established blue token convention for alignment-colored UI elements; WHEN Evil, the system SHALL use red.
3. WHEN displaying character information THEN the system SHALL show a character type icon/badge consistent with Townsfolk, Outsider, Minion, or Demon.
4. WHEN the app is viewed on a mobile-width screen THEN the system SHALL present a responsive layout usable for all core actions (viewing character, nominating, voting, chatting).
5. WHEN errors or invalid actions occur (e.g. invalid join code, nominating a dead player) THEN the system SHALL present a clear, non-technical message to the user.
