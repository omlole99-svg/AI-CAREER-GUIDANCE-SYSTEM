import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { buildSafePrompt, chatSchema, skillSchema, insightSchema, createSwapRequestSchema, respondSwapRequestSchema, updateSessionSchema, createReviewSchema, dayContentSchema, dayQuizSchema, completeDaySchema } from "./utils.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "./prismaClient.js";
import { requireAuth, initAuth } from "./middleware/auth.js";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

initAuth();

const app = express();
app.use(helmet());

/* ================= CORS FIX ================= */
const allowedOrigins = ['https://skillswap-grow.netlify.app', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
/* ================================================ */

app.use(express.json());

// Trust proxy required for Render/Vercel/Heroku if behind a reverse proxy
app.set("trust proxy", 1);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests, please try again later." },
  keyGenerator: (req) => {
    return req.user ? req.user.uid : req.ip;
  }
});

app.use("/api", generalLimiter);
app.use("/api/chat", requireAuth, aiLimiter);
app.use("/api/quiz", requireAuth, aiLimiter);
app.use("/api/day-quiz", requireAuth, aiLimiter);
app.use("/api/roadmap", requireAuth, aiLimiter);
app.use("/api/day-content", requireAuth, aiLimiter);
app.use("/api/insight", requireAuth, aiLimiter);
app.use("/api/resources", requireAuth, generalLimiter);

const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.issues ? error.issues.map(e => ({ path: e.path.join('.'), message: e.message })) : []
      });
    }
    return res.status(400).json({ error: "Invalid request data" });
  }
};

const apiKey = process.env.GEMINI_API_KEY || "";
let aiClient = null;
if (apiKey) {
  aiClient = new GoogleGenerativeAI(apiKey);
  console.log("Loaded Gemini API Key:", apiKey.slice(0, 5) + "...");
} else {
  console.warn("⚠️ WARNING: GEMINI_API_KEY is not set in .env! Using Mock AI responses so the UI remains fully working. Please add GEMINI_API_KEY to .env for real responses.");
}

async function generateAIResponse(prompt, feature = 'Unknown') {
  if (aiClient) {
    const model = aiClient.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const usage = result.response.usageMetadata;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      feature,
      inputLength: prompt.length,
      outputLength: text.length,
      tokens: usage ? {
        prompt: usage.promptTokenCount,
        candidates: usage.candidatesTokenCount,
        total: usage.totalTokenCount
      } : null
    }));

    return text;
  }

  let text = "";
  if (prompt.includes("multiple-choice quiz")) {
    text = JSON.stringify([
      { question: "What is the primary purpose of this skill?", options: ["To build things", "To break things", "To eat things", "To sleep"], correctIndex: 0 },
      { question: "Which tool is commonly associated with this?", options: ["Hammer", "Compiler", "Screwdriver", "Oven"], correctIndex: 1 },
      { question: "How long does it take to master?", options: ["1 Day", "1 Week", "Years of practice", "Never"], correctIndex: 2 }
    ]);
  } else if (prompt.includes("learning roadmap")) {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      days.push({
        day: i,
        title: `Day ${i}: Fundamentals`,
        topics: ["Topic 1", "Topic 2"],
        learningObjective: "Understand the basics.",
        difficulty: "Beginner"
      });
    }
    text = JSON.stringify(days);
  } else {
    text = "This is a mock response because the GEMINI_API_KEY is not set. The UI is fully working! To get real AI responses, add a valid Gemini API key to your backend's .env file.";
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    feature,
    inputLength: prompt.length,
    outputLength: text.length,
    tokens: null,
    mock: true
  }));

  return text;
}

app.post("/api/chat", validateRequest(chatSchema), async (req, res) => {
  try {
    const { query } = req.body;
    const instruction = "You are a helpful learning assistant for a skill-sharing app called SkillSwap. Answer clearly and concisely.";
    const prompt = buildSafePrompt(instruction, query);
    const text = await generateAIResponse(prompt, 'Chat AI');
    res.json({ message: text });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again later." });
    }
    res.status(500).json({ error: "AI failed to respond" });
  }
});

app.post("/api/quiz", validateRequest(skillSchema), async (req, res) => {
  try {
    const { skill } = req.body;
    const instruction = `Create a 3-question multiple-choice quiz about the user's requested skill.\nReturn ONLY valid JSON in this format:\n[\n  { "question": "...", "options": ["A","B","C","D"], "correctIndex": 0 }\n]`;
    const prompt = buildSafePrompt(instruction, skill);
    const text = await generateAIResponse(prompt, 'Quiz AI');
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleanJson);
    res.json(json);
  } catch (error) {
    console.error("QUIZ ERROR:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again later." });
    }
    res.json([
      { question: `Which of these best describes ${req.body.skill}?`, options: ["Concept", "Tool", "Framework", "Language"], correctIndex: 0 }
    ]);
  }
});

app.post("/api/roadmap", validateRequest(skillSchema), async (req, res) => {
  try {
    const { skill } = req.body;
    const instruction = `Create a detailed exactly 30-day professional learning roadmap for the user's requested skill: ${skill}.
    
Return ONLY a valid JSON array of exactly 30 objects.
Format each object exactly like this:
{
  "day": <number 1-30>,
  "title": "<string, name of the day's topic>",
  "topics": ["<string>", "<string>"],
  "learningObjective": "<string>",
  "difficulty": "<string: Beginner|Intermediate|Advanced>"
}
Do NOT wrap the response in markdown blocks like \`\`\`json. Return JUST the raw JSON array.`;
    const prompt = buildSafePrompt(instruction, skill);
    const text = await generateAIResponse(prompt, 'Roadmap AI');
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleanJson);
    if (!Array.isArray(json) || json.length !== 30) {
      throw new Error(`AI generated ${json?.length} days instead of 30.`);
    }
    res.json(json);
  } catch (error) {
    console.error("ROADMAP ERROR:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again later." });
    }
    res.status(500).json({ error: "Failed to generate roadmap. Please try again." });
  }
});

app.post("/api/day-content", validateRequest(dayContentSchema), async (req, res) => {
  try {
    const { skill, dayNumber, dayTitle, topics } = req.body;
    const instruction = `Create detailed educational content for Day ${dayNumber} of a learning roadmap for ${skill}.
The topic for today is: ${dayTitle}.
Specific areas to cover: ${topics.join(", ")}.

Return ONLY valid JSON in this precise format:
{
  "explanation": "<Detailed educational explanation of the topics>",
  "examples": ["<Practical example 1>", "<Practical example 2>"],
  "task": "<A small practical task for the user to complete today>",
  "takeaways": ["<Key takeaway 1>", "<Key takeaway 2>"]
}
Do NOT wrap the response in markdown blocks like \`\`\`json. Return JUST the raw JSON object.`;

    const prompt = buildSafePrompt(instruction, skill);
    const text = await generateAIResponse(prompt, 'Day Content AI');
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleanJson);

    res.json(json);
  } catch (error) {
    console.error("DAY CONTENT ERROR:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again later." });
    }
    res.status(500).json({ error: "Failed to generate day content. Please try again." });
  }
});

app.post("/api/day-quiz", validateRequest(dayQuizSchema), async (req, res) => {
  try {
    const { skill, dayNumber, dayTitle, topics } = req.body;
    const instruction = `Create an EXACTLY 10-question multiple-choice quiz about Day ${dayNumber} of learning ${skill}.
The topic for today is: ${dayTitle}.
Specific areas covered: ${topics.join(", ")}.

Ensure there are EXACTLY 10 questions.
Each question must have EXACTLY 4 options, and exactly 1 correct index (0-3).
Return ONLY valid JSON in this precise format:
[
  { "question": "...", "options": ["A","B","C","D"], "correctIndex": 0 }
]
Do NOT wrap the response in markdown blocks like \`\`\`json. Return JUST the raw JSON array.`;

    const prompt = buildSafePrompt(instruction, skill);
    const text = await generateAIResponse(prompt, 'Day Quiz AI');
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleanJson);

    if (!Array.isArray(json) || json.length !== 10) {
      console.warn(`Day Quiz AI generated ${json?.length} questions instead of 10. Returning anyway, but might be less than 10.`);
    }

    res.json(json);
  } catch (error) {
    console.error("DAY QUIZ ERROR:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again later." });
    }
    res.status(500).json({ error: "Failed to generate day quiz. Please try again." });
  }
});

// 🌐 Resources
app.post("/api/resources", validateRequest(skillSchema), (req, res) => {
  const { skill } = req.body;
  res.json([
    { title: `${skill} Documentation`, uri: `https://www.google.com/search?q=${skill}+documentation` },
    { title: `${skill} Tutorial`, uri: `https://www.youtube.com/results?search_query=${skill}+tutorial` },
    { title: `${skill} Course`, uri: `https://www.udemy.com/courses/search/?q=${skill}` }
  ]);
});

// 🚀 Insight
app.post("/api/insight", validateRequest(insightSchema), (req, res) => {
  const { skills } = req.body;
  res.json({ message: `You're progressing well in ${skills ? skills.join(", ") : "your skills"}. Keep building and practicing daily.` });
});

/* =======================================================
   POSTGRESQL + PRISMA ROUTES (PROTECTED BY FIREBASE AUTH)
   ======================================================= */

// Ensure a UserReference exists in Postgres (Helper function, called on protected routes if needed)
async function ensureUser(uid) {
  let userRef = await prisma.userReference.findUnique({ where: { firebaseUid: uid } });
  if (!userRef) {
    userRef = await prisma.userReference.create({ data: { firebaseUid: uid } });
  }
  return userRef;
}

// 1. Skill Swap Requests
app.post("/api/swap-requests", requireAuth, validateRequest(createSwapRequestSchema), async (req, res) => {
  try {
    const { receiverUid, skillOffered, skillWanted } = req.body;
    const senderUid = req.user.uid;

    if (senderUid === receiverUid) {
      return res.status(400).json({ error: "Cannot request a swap with yourself." });
    }

    try {
      await ensureUser(senderUid);
      await ensureUser(receiverUid);

      const newRequest = await prisma.$transaction(async (tx) => {
        const existingPending = await tx.skillSwapRequest.findFirst({
          where: {
            status: "PENDING",
            OR: [
              { senderUid, receiverUid },
              { senderUid: receiverUid, receiverUid: senderUid }
            ]
          }
        });
        if (existingPending) {
          throw new Error("PENDING_EXISTS");
        }

        const recentSession = await tx.session.findFirst({
          where: {
            AND: [
              {
                OR: [
                  { tutorUid: senderUid, learnerUid: receiverUid },
                  { tutorUid: receiverUid, learnerUid: senderUid }
                ]
              },
              {
                OR: [
                  { status: "SCHEDULED" },
                  { status: "COMPLETED", updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
                ]
              }
            ]
          }
        });
        if (recentSession) {
          throw new Error("RECENT_SESSION");
        }

        return await tx.skillSwapRequest.create({
          data: {
            senderUid,
            receiverUid,
            skillOffered,
            skillWanted
          }
        });
      }, {
        isolationLevel: 'Serializable'
      });

      res.json(newRequest);
    } catch (txError) {
      if (txError.message === "PENDING_EXISTS") {
        return res.status(400).json({ error: "A pending request already exists between you and this user." });
      }
      if (txError.message === "RECENT_SESSION") {
        return res.status(429).json({ error: "You can only have one active or completed session with this user per 24 hours." });
      }
      throw txError; // let outer catch handle it
    }
  } catch (error) {
    console.error("CREATE REQUEST ERROR:", error);
    res.status(500).json({ error: "Failed to create request." });
  }
});

app.get("/api/swap-requests", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const requests = await prisma.skillSwapRequest.findMany({
      where: {
        OR: [{ senderUid: uid }, { receiverUid: uid }]
      },
      include: {
        session: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    console.error("GET REQUESTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch requests." });
  }
});

app.patch("/api/swap-requests/:id", requireAuth, validateRequest(respondSwapRequestSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const uid = req.user.uid;

    const request = await prisma.skillSwapRequest.findUnique({ where: { id } });

    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.receiverUid !== uid) {
      return res.status(403).json({ error: "You are not authorized to respond to this request." });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed." });
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

    const updatedRequest = await prisma.skillSwapRequest.update({
      where: { id },
      data: { status: newStatus }
    });

    // If accepted, auto-create a session
    if (newStatus === 'ACCEPTED') {
      const recentSession = await prisma.session.findFirst({
        where: {
          AND: [
            {
              OR: [
                { tutorUid: request.senderUid, learnerUid: request.receiverUid },
                { tutorUid: request.receiverUid, learnerUid: request.senderUid }
              ]
            },
            {
              OR: [
                { status: "SCHEDULED" },
                { status: "COMPLETED", updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
              ]
            }
          ]
        }
      });
      if (recentSession) {
        return res.status(429).json({ error: "Cannot accept. You already have an active or recently completed session with this user." });
      }

      await prisma.session.create({
        data: {
          requestId: id,
          tutorUid: request.receiverUid, // Simplification: Receiver is tutor initially
          learnerUid: request.senderUid
        }
      });
    }

    res.json(updatedRequest);
  } catch (error) {
    console.error("PATCH REQUEST ERROR:", error);
    res.status(500).json({ error: "Failed to update request." });
  }
});

// 2. Sessions
app.get("/api/sessions/stats", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    // Demonstrate filtering (where), grouping (by), aggregation (_count), and ordering (orderBy)
    const stats = await prisma.session.groupBy({
      by: ['status'],
      where: {
        tutorUid: uid
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    res.json(stats);
  } catch (error) {
    console.error("GET SESSION STATS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch session stats." });
  }
});

app.get("/api/sessions", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const sessions = await prisma.session.findMany({
      where: {
        OR: [{ tutorUid: uid }, { learnerUid: uid }]
      },
      include: { request: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error("GET SESSIONS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch sessions." });
  }
});

app.patch("/api/sessions/:id", requireAuth, validateRequest(updateSessionSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { status } = req.body; // 'COMPLETED' or 'CANCELLED'

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: "Session not found." });
    if (session.tutorUid !== uid && session.learnerUid !== uid) {
      return res.status(403).json({ error: "Unauthorized access to session." });
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error("PATCH SESSION ERROR:", error);
    res.status(500).json({ error: "Failed to update session." });
  }
});

// 3. Reviews & XP
app.post("/api/reviews", requireAuth, validateRequest(createReviewSchema), async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body;
    const reviewerUid = req.user.uid;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "COMPLETED") {
      return res.status(400).json({ error: "Can only review completed sessions." });
    }
    if (session.tutorUid !== reviewerUid && session.learnerUid !== reviewerUid) {
      return res.status(403).json({ error: "You were not part of this session." });
    }

    const revieweeUid = session.tutorUid === reviewerUid ? session.learnerUid : session.tutorUid;

    const xpAmount = rating * 10; // Simple XP logic
    const [review, xpTx, updatedUser] = await prisma.$transaction([
      prisma.review.create({
        data: {
          sessionId,
          reviewerUid,
          revieweeUid,
          rating,
          comment
        }
      }),
      prisma.xpTransaction.create({
        data: {
          userUid: revieweeUid,
          amount: xpAmount,
          reason: `Received a ${rating}-star review for session ${sessionId}`
        }
      }),
      prisma.userReference.update({
        where: { firebaseUid: revieweeUid },
        data: { totalXp: { increment: xpAmount } }
      })
    ]);

    res.json(review);
  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);
    res.status(500).json({ error: "Failed to create review or you already reviewed this session." });
  }
});

// 3.5 Learning Path XP
app.post("/api/learning-path/complete", requireAuth, validateRequest(completeDaySchema), async (req, res) => {
  try {
    const { skill, dayNumber, score } = req.body;
    const uid = req.user.uid;
    const adminDb = getFirestore();
    
    const result = await adminDb.runTransaction(async (t) => {
      const normalized = skill.trim().toLowerCase().replace(/\+/g, 'plus').replace(/#/g, 'sharp').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const pathId = `${uid}_${normalized}`;
      
      const pathRef = adminDb.collection('learningPaths').doc(pathId);
      const pathDoc = await t.get(pathRef);
      if (!pathDoc.exists) throw new Error("Path not found");
      
      const pathData = pathDoc.data();
      const passed = score >= 8;
      let xpAwarded = 0;
      
      const isFirstTimePass = passed && dayNumber === pathData.highestUnlockedDay;
      
      if (isFirstTimePass) {
        if (score === 8) xpAwarded = 40;
        else if (score === 9) xpAwarded = 45;
        else if (score === 10) xpAwarded = 50;
        
        pathData.highestUnlockedDay = Math.min(30, pathData.highestUnlockedDay + 1);
      }
      
      if (passed && dayNumber === pathData.currentDay && pathData.currentDay < 30) {
        pathData.currentDay += 1;
      }
      
      const dayIndex = dayNumber - 1;
      if (dayIndex >= 0 && dayIndex < pathData.roadmapDays.length) {
         pathData.roadmapDays[dayIndex].passed = passed || pathData.roadmapDays[dayIndex].passed;
         pathData.roadmapDays[dayIndex].bestScore = Math.max(pathData.roadmapDays[dayIndex].bestScore || 0, score);
         if (isFirstTimePass) {
           pathData.roadmapDays[dayIndex].xpAwarded = xpAwarded;
           pathData.roadmapDays[dayIndex].completedAt = Date.now();
         }
      }
      
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");
      
      const userData = userDoc.data();
      let newStreak = typeof userData.streak === 'number' ? userData.streak : 0;
      const todayStr = new Date().toISOString().split('T')[0];
      
      if (passed) {
        const lastActiveDateStr = userData.lastActiveDate;
        if (!lastActiveDateStr) {
          newStreak = 1;
        } else if (lastActiveDateStr !== todayStr) {
           const [tY, tM, tD] = todayStr.split('-').map(Number);
           const todayUTC = Date.UTC(tY, tM - 1, tD);
           const [lY, lM, lD] = lastActiveDateStr.split('-').map(Number);
           const lastDateUTC = Date.UTC(lY, lM - 1, lD);
           const diffDays = Math.round((todayUTC - lastDateUTC) / (1000 * 60 * 60 * 24));
           if (diffDays === 1) newStreak += 1;
           else if (diffDays > 1) newStreak = 1;
        }
      }
      
      if (passed || isFirstTimePass) {
        const newQuizHistory = [...(userData.quizHistory || [])];
        if (isFirstTimePass && xpAwarded > 0) {
          newQuizHistory.push({
            date: new Date().toLocaleDateString(),
            score: score,
            pointsEarned: xpAwarded
          });
        }
        t.update(userRef, {
          points: (userData.points || 0) + xpAwarded,
          quizHistory: newQuizHistory,
          streak: newStreak,
          lastActiveDate: todayStr
        });
      }
      
      t.update(pathRef, {
        highestUnlockedDay: pathData.highestUnlockedDay,
        currentDay: pathData.currentDay,
        roadmapDays: pathData.roadmapDays
      });
      
      return { path: pathData, xpAwarded, passed, newStreak };
    });
    
    res.json(result);
  } catch (error) {
    console.error("Complete Day Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// 4. Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  // Can optionally be protected or public. We'll make it public for now, 
  // but it queries Postgres for the rankings.
  try {
    const leaderboard = await prisma.userReference.findMany({
      orderBy: { totalXp: 'desc' },
      take: 10,
      select: {
        firebaseUid: true,
        totalXp: true
      }
    });
    res.json(leaderboard);
  } catch (error) {
    console.error("GET LEADERBOARD ERROR:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard." });
  }
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`AI Server running on port ${PORT}`);
  });
}

export { app };
