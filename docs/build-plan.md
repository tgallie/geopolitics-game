# Geopolitics game build plan

Source: UCT INF4001 Entrance Exam, Full-Time Honours Programme 2027,
Geopolitics Game Case Study (six-page supplied brief).

This is a proposed implementation sequence derived from the brief, not a
reconstruction of inaccessible assistant replies in the original chat.

## Step 1: Environment and project (completed)

Next.js, TypeScript, Tailwind, App Router, ESLint, Visual Studio and GitHub.
The starter page runs locally. Node 26 is installed; the brief's recommended
LTS environment still needs alignment. No database or authentication is configured.

## Step 2: Rules and data model (completed)

- Types for countries, participants, territory ownership and game state.
- Population brackets, conquest rewards and round-based reinforcements.
- One combat phase with ordered dice pairs, simultaneous losses and ties.
- Transfer arithmetic that leaves one soldier behind.
- Automated boundary tests and the brief's combat examples (`npm test`).

These are foundations, not a complete turn engine. No UI or server handler uses
them yet. Transfer ownership, phase restrictions, turn permissions, elimination
and win detection must be enforced by the later authoritative turn handler.

## Step 3: Country data and new-game setup

Import a dated population snapshot from the Worldometers source specified in
the brief. Let the human select any supported country; randomly sample nine
distinct other countries and randomize the initial player order. Store original
population and soldier values in each game so data refreshes do not alter it.

## Step 4: Playable board and turn engine

Show all ten countries and soldier counts. Implement reinforcements, transfers,
one attack per turn (with repeated combat phases), stopping/skipping, conquest,
elimination and victory. Any country can attack any enemy country: no adjacency.
The player retains conquered countries if their starting country is lost.

## Step 5: Strategic NPCs and visible battles

NPCs allocate reinforcements, choose targets, transfer armies and stop attacks
using a strategy. Display each decision and its justification. Fast-forward
speeds up presentation without hiding actions. Add genuine LLM battle commentary;
keep generated text separate from authoritative game rules.

## Step 6: Accounts and NoSQL persistence

Use a NoSQL database (MongoDB is the current planned option). Save multiple
independent sessions per user. Public game links permit watching; only the
authenticated owner may act. Validate actions and generate dice on the server.
Use state revisions to prevent duplicate moves and conflicting updates.

## Step 7: Deployment and submission

Deploy, test access control and game recovery, and choose one bonus feature.
Prepare source ZIP, run instructions, deployed URL and required assessor access.
Never commit passwords or API keys to GitHub.

## Clarifications to settle before the full turn engine

- The brief gives a conquest reward but does not explicitly specify where it is
  placed. Decide the allocation flow while ensuring both territories remain occupied.
- Track round completion explicitly, skipping eliminated players without granting
  reinforcements during round one.
- A conquered country may have zero soldiers only during conquest resolution;
  complete occupation before allowing the next turn.

## Exact combat rules

Dice per side = min(attacker soldiers - 1, defender soldiers). Pair dice by their
original index, without sorting. The lower die loses one soldier; a tie loses
none. There is no standard Risk three-dice limit or defender-wins-ties rule.
Conquest reward = max(2, floor(original country soldier value / 2)). Beginning
in round two, each participant receives two soldiers per owned country per turn.
