# Task List: PostgreSQL & Firebase Auth Integration

- `[x]` Install `firebase-admin` in `server/`.
- `[x]` Create PostgreSQL models in `server/prisma/schema.prisma` (`UserReference`, `SkillSwapRequest`, `Session`, `Review`, `XpTransaction`).
- `[x]` Create `server/prismaClient.js` for DB connection.
- `[x]` Create `server/middleware/auth.js` for Firebase Admin verification.
- `[x]` Update `server/index.js` with new protected API endpoints.
- `[x]` Create `src/services/apiService.ts` for frontend API calls.
- `[x]` Integrate `apiService.ts` into frontend components (`Matching`, `Dashboard`, `Leaderboard`).
- `[x]` Run build/validation checks.
- `[x]` Write `walkthrough.md` with manual steps (Env variables, Prisma commands).
