# Marksheet implementation checkpoints

Source: INF4001N MarksheetEntranceExam2027.pdf, 56 marks (14 criteria, four marks each).
This checklist records implementation evidence, not a prediction of awarded marks.
Stop after each checkpoint for the user to review, commit and push.

## 1. Game and battle engine: ready for review

- GameEngine owns state and applies validated commands to a copy before accepting them.
- BattleEngine generates dice through an injected random source and uses the brief's paired-dice rules.
- Setup selects nine distinct opponents and randomizes the player order.
- Commands enforce turns, stale-state rejection, ownership, reinforcement allocation,
  transfer limits, attack phases, conquest occupation and game completion.
- Round tracking skips eliminated participants. Reinforcements begin in round two.
- Ordered events retain dice pairs, losses, transfers, turn changes and outcomes for the later UI.
- Automated tests cover rule boundaries, invalid actions, isolation of snapshots,
  elimination, reinforcement rounds and a complete ten-country conquest.

This engine is not yet connected to the page. Player ids are domain identities,
not authentication credentials. A later server controller must authenticate users,
authorize the game owner, validate request payloads and provide server-generated randomness.
Revision checks are in-memory for now; persistence must enforce them atomically.

### Explicit interpretation of conquest

The brief specifies the bonus amount but not its initial location. The bonus joins
the attacking country, then the player must move at least one soldier into the
captured country while retaining at least one in the source. Further attacks wait
until the player's next turn. Zero defenders are allowed only during this pending
occupation phase. Victory is recorded after occupation, leaving all countries occupied.

## Remaining checkpoints (not implemented yet)

2. Strategic NPC decisions, reinforcement allocation, transfers, stopping conditions,
   and event explanations: implemented in `src/lib/ai/npc-strategy.ts` and tested.
   The UI still needs to render the decision events and control playback speed.
3. Connect the playable board, combat presentation, fast-forward, sessions,
   navigation, country search/filtering and public spectator views.
4. Server action boundaries, authentication/authorization code and separate
   repository contracts. Database provisioning and live connection follow with the user.
5. Real LLM commentary integration, failure handling, end-to-end verification,
   one explicit bonus feature and submission documentation.

The population list now contains all 234 country and dependency entries in the
Worldometer 2026 table. The selection screen identifies that the source includes
dependent territories. Saved games must keep their own population snapshots.

## Criteria and evidence

| Marksheet criterion | Current evidence / remaining work |
| --- | --- |
| Database layer | Deferred: isolated repository implementation and online configuration |
| Connection to database | Deferred: verify real connection with the user |
| Database design | Deferred: users, games, events, indexes and concurrency |
| Coding structure | Types, pure rules and independent engine modules; controllers/UI still to connect |
| Object-oriented concepts | GameEngine and BattleEngine; private state and copy-based snapshots |
| Validation, controls and security | Domain checks implemented; request validation and identity checks pending |
| Functionality | Engine tested; browser gameplay integration pending |
| Lists, searching, filtering, viewing | Basic country list exists; search/filter/session views pending |
| User interface | Selection prototype exists; playable interface pending |
| Ease of navigation | Pending session and game navigation |
| Authentication and authorization | Pending; no client-supplied player id may establish permission |
| Sophistication and complexity | Engine foundation implemented; strategic NPC, AI and server integration pending |
| AI application | Pending real provider integration; template text must not be labelled LLM output |
| Overall evidence of effort | Tests, documented decisions and staged commits; remaining milestones pending |

## Verification

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
Do not store database credentials or AI keys in source control.
