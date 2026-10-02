# PostgreSQL Integration Plan

This plan outlines the integration of Neon PostgreSQL into the existing SkillSwap project using Prisma, specifically targeting relational data (skill swaps, sessions, reviews, XP, and leaderboards).

## User Review Required

> [!WARNING]
> **Firebase Admin Authentication Missing in Backend:** 
> Upon auditing `server/index.js`, the current backend has no Firebase authentication middleware (Firebase Admin SDK is not installed or configured). It solely handles Gemini AI requests. 
> 
> **Decision Required:** To securely identify users from Firebase and prevent anyone from making fake requests to the new PostgreSQL APIs, we *must* install and configure `firebase-admin` on the backend. This will involve passing a Firebase ID token from the frontend on every request and verifying it on the backend. Do you approve of adding `firebase-admin` to the backend for this purpose?

## Proposed Changes

---

### Prisma & Database Schema (`server/prisma/schema.prisma`)

We will design a clean, relational schema mapped to the Firebase UID as the primary reference point.

#### [MODIFY] schema.prisma
- Set `url = env("DATABASE_URL")` in the `datasource` block to ensure Prisma reads it correctly.
- Add the following models:
  - `UserReference`: Maps Firebase UID to a PostgreSQL internal ID, caching minimal stats like total XP for quick leaderboard sorting.
  - `SkillSwapRequest`: Tracks requests between users (senderUid, receiverUid, status: PENDING/ACCEPTED/REJECTED, mutual skills).
  - `Session`: Represents a completed or ongoing session (requestId, scheduledTime, status: SCHEDULED/COMPLETED/CANCELLED).
  - `Review`: Ratings and feedback (sessionId, reviewerUid, revieweeUid, rating, comment).
  - `XpTransaction`: Ledger of XP changes (userUid, amount, reason, timestamp).

### Backend Setup (`server/`)

#### [NEW] `server/prismaClient.js`
- Create a singleton Prisma client to avoid connection exhaustion on the Neon database.

#### [NEW] `server/middleware/auth.js`
- Create an Express middleware using `firebase-admin` to verify `Authorization: Bearer <token>` headers and extract `req.user.uid`.

#### [MODIFY] `server/index.js`
- Import and configure the Prisma client and authentication middleware.
- Create new REST endpoints:
  - `POST /api/swap-requests`: Create a new swap request.
  - `GET /api/swap-requests`: Fetch incoming/outgoing requests for the logged-in user.
  - `PATCH /api/swap-requests/:id`: Accept or reject a request.
  - `POST /api/sessions`: Create a session (usually triggered by accepting a request).
  - `PATCH /api/sessions/:id`: Mark session as completed and trigger XP transactions.
  - `POST /api/reviews`: Submit a review and calculate average ratings.
  - `GET /api/leaderboard`: Fetch the top users ranked by XP using PostgreSQL's native ordering.

### Frontend Integration (`src/`)

#### [MODIFY] API Services
- Create a new `apiService.ts` or extend `firestoreService.ts` to include calls to the new Express backend using `axios` or `fetch`, ensuring the Firebase ID token is attached to the headers.

#### [MODIFY] Components
- **Matching / Explore Hub**: Update the "Request Skill Swap" button to hit the POST `/api/swap-requests` endpoint instead of relying on frontend state.
- **Dashboard / History**: Fetch actual swap requests and sessions from the new backend instead of Firestore.
- **Leaderboard**: Fetch the leaderboard from `GET /api/leaderboard` (PostgreSQL) rather than querying Firestore.

## Verification Plan

### Manual Verification
1. **Database Migration**: Run `npx prisma db push` (or `migrate dev` if preferred) and verify the tables are created in Neon.
2. **End-to-End Flow**:
   - Log in as User A and request a skill swap with User B.
   - Verify the POST request is authenticated and stored in PostgreSQL.
   - Log in as User B, accept the request.
   - Verify a Session is created.
   - Complete the session and leave a Review.
   - Verify XP transactions are recorded.
   - Check the Leaderboard to ensure User A and User B's XP reflects the new transactions accurately.

### Automated Checks
- Run `npm run build` on both frontend and backend to catch any TypeScript or module import errors.
