# 🎓 SkillSwap – Peer-to-Peer Learning Platform

SkillSwap is a peer-to-peer learning platform where students exchange knowledge by teaching what they know and learning what they don't. The platform connects students based on complementary skills, encourages collaborative learning through interactive sessions, and rewards participation with a gamified points system.

## 🌐 Live Demo

**🔗 Live Application:** https://skillswap-grow.netlify.app/

---

## ✨ Features

* 🤝 **Smart Skill Matching** – Connects students based on complementary strengths and learning goals.
* 👨‍🏫 **Peer Learning Sessions** – Teach topics you excel at and learn from others.
* 📝 **Post-Session Quizzes** – Reinforce learning and validate knowledge transfer.
* 🏆 **Gamified Points System** – Earn points by teaching, learning, and staying active.
* 🤖 **AI-Powered Recommendations** – Personalized learning suggestions using Google Gemini AI.
* 💬 **Real-Time Chat** – Instant messaging powered by Firebase Firestore.
* 🟢 **Live Online Presence** – See who's online using Firebase Realtime Database.
* 📚 **AI Learn Hub** – Generate notes and learning resources with Gemini AI.
* 📊 **Interactive Dashboard** – Visualize learning progress through charts and analytics.

---

## 🛠️ Tech Stack

### Frontend

* React 19
* TypeScript
* Vite

### Backend & Database

* Firebase Authentication (Google Sign-In)
* Firebase Firestore
* Firebase Realtime Database

### AI Integration

* Google Gemini AI (`@google/genai`)

### Libraries

* Recharts
* Lucide React

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Rishikesh-Bagal/SkillSwap-Capstone.git
cd SkillSwap-Capstone
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

---

## 📂 Project Structure

```text
SkillSwap-Capstone/
│
├── components/        # Reusable UI components
│   ├── Dashboard
│   ├── ChatDrawer
│   ├── LearnHub
│   └── ...
│
├── services/          # Firebase & AI service files
│   ├── firestoreService
│   ├── chatService
│   ├── geminiService
│   └── ...
│
├── App.tsx            # Root component
├── MainApp.tsx        # Main application layout
├── types.ts           # TypeScript definitions
├── constants.tsx      # Global constants
└── ...
```

---

## 💡 Core Functionality

* Student-to-student skill exchange
* AI-assisted learning recommendations
* Real-time communication
* Live user presence tracking
* Knowledge assessment through quizzes
* Progress tracking with gamification
* AI-generated learning notes

---

## 📄 License

This project was developed as a capstone project for educational purposes. Feel free to explore the source code, learn from it, and use it as a reference for your own projects.

---

## 👨‍💻 Author

**Rishikesh Bagal**

* GitHub: https://github.com/Rishikesh-Bagal
* Live Demo: https://skillswap-grow.netlify.app/
