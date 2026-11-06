# QA Results

## Latest Verification (6 November 2026)

### Environment & Integration
- **MongoDB Atlas:** Successfully reconnected. `npm run db:check`, `npm run accounts:check`, and `npm run saved-games:check` all passed.
- **AI Commentary:** Migrated from OpenAI to Google AI Studio (`gemini-3.1-flash-lite`) using the OpenAI-compatible endpoint. Added exponential backoff retry logic to handle 503 (high demand) errors. `npm run ai:check` passed with a live, successful AI response.
- **Automated Tests:** All 31 automated tests passed.
- **Code Quality:** ESLint, TypeScript checking, and production build all pass.

### Browser Verification (Manual)
- **Authentication Cycle:** Logout, sign-in, and game resume verified.
- **Spectator View:** Public viewing via incognito window verified. Live AI commentary successfully renders. Owner-controlled link revocation verified (spectator window stops updating).
- **Mobile Layout:** Simulated at 390px width using browser DevTools. Welcome/sign-up navigation and gameplay layout verified with no horizontal document overflow. AI commentary boxes fit appropriately.
- **AI Persistence:** Verified that AI commentary is saved to the database. Reloading the page and viewing via spectator link does not regenerate commentary; it reads the saved text.

### Outstanding / Pending
- Full manual browser playthrough to victory (automated test already covers the 10-country conquest rules).
- Test data cleanup (in progress/completed via `scripts/browser-fixture.mjs`).