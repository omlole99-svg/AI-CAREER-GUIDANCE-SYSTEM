# SkillSwap - Product Requirements Document (PRD)

## 1. Problem Statement
Students and professionals often struggle to find peers to exchange skills with. While formal courses and tutorials are plentiful, finding a dedicated learning partner for 1-on-1, reciprocal knowledge exchange (e.g., teaching React in exchange for learning Python) is difficult without a centralized platform. 

## 2. Project Objective
SkillSwap aims to build a dynamic, AI-enhanced platform where users can connect based on complementary skills. It facilitates peer-to-peer learning, tracks progress, and leverages AI to structure learning sessions through auto-generated roadmaps and quizzes.

## 3. Target Users
- **University Students:** Looking to supplement their academic learning with practical skills.
- **Self-taught Developers:** Seeking guidance from experienced peers.
- **Lifelong Learners:** Anyone wanting to learn a new skill while offering their own expertise.

## 4. Core Features
- **User Authentication:** Secure email/password and Google login.
- **Profile Management:** Users declare skills they can teach (strong skills) and skills they want to learn (weak skills).
- **Algorithmic Matching:** Recommends partners whose skills perfectly align with the user's needs.
- **Swap Requests:** Users can send, accept, or reject skill swap proposals.
- **Collaborative Sessions:** Real-time chat workspace to exchange knowledge.
- **AI Integration:** 
  - Generates structured learning roadmaps.
  - Generates multiple-choice quizzes to validate learning.
  - Provides a conversational AI assistant and contextual insights.
- **Gamification:** Users earn XP (points), maintain streaks, and rank on a global leaderboard.

## 5. Functional Requirements
- **Authentication:** Handled exclusively via Firebase Auth.
- **Data Synchronization:** Real-time chat and online presence using Firebase RTDB and Firestore.
- **Relational Integrity:** Sessions, reviews, swap requests, and XP logic must be enforced via PostgreSQL/Prisma.
- **AI Processing:** Prompts must be sanitized and protected against injection. Token usage must be monitored on the backend.
- **Routing:** Client-side URL routing must enable direct linking (e.g., `/dashboard`, `/leaderboard`).

## 6. Non-functional Requirements
- **Security:** Strict input sanitization (removing malicious HTML/scripts) and Zod payload validation on all backend API routes. Rate limiting applied to API and AI endpoints.
- **Performance:** Fast initial load times (SPA fallback on Netlify) and responsive database queries via connection pooling (Neon Serverless).
- **Reliability:** Backend transactions must be atomic (e.g., awarding XP and completing a session).
- **Usability:** Rich, responsive, dark-mode compatible UI without full page reloads.

## 7. User Flows
1. **Onboarding:** User signs up → Completes profile (adds strong/weak skills, college).
2. **Matching:** User views "Smart Recommendations" → Clicks "Request Skill Swap".
3. **Acceptance:** Partner receives request on Dashboard → Accepts → A `SCHEDULED` session is created.
4. **Execution:** Both users click "Start" → Enter `/workspace`.
5. **Collaboration:** Users chat in real-time, generate an AI roadmap, and review curated AI docs.
6. **Completion:** Session ends → AI generates a Quiz → User completes Quiz → XP awarded via atomic transaction → Ranked on Leaderboard.

## 8. Security Requirements
- All API requests to PostgreSQL/Gemini must pass a Firebase bearer token.
- User input must be validated via Zod against strict schemas before processing.
- Text fields must pass through `sanitize-html` to prevent XSS.
- AI Prompts must be wrapped in injection-protection boundaries to prevent prompt leaking.
- Secrets (Gemini Keys, DB URLs) must remain strictly server-side.

## 9. Current Limitations & Future Scope
- **Current Limitations:** Video/audio streaming is not implemented (currently relies on text chat).
- **Future Scope:** WebRTC for live video calls, collaborative code editors, and more robust scheduling systems.
