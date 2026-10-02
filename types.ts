
export type SkillCategory = 'Development' | 'Design' | 'AI & Data' | 'Academics' | 'Soft Skills' | 'Other';

export type SortOption = 'relevance' | 'rating' | 'points' | 'streak';

export interface Skill {
  name: string;
  category: SkillCategory;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Student {
  id: string;
  uid?: string; // Firebase Auth UID
  name: string;
  displayName?: string;
  email?: string;
  college: string;
  branch: string;
  year: number;
  strongSkills: string[];
  weakSkills: string[];
  teachingScore: number;
  learningScore: number;
  skillReputation: number;
  points: number;
  rank: string;
  avatar: string;
  bio?: string;
  badges: Badge[];
  streak: number;
  completedTopics?: string[];
  sessionsCount?: number;
  profileComplete?: boolean;
  quizHistory?: QuizResult[];
  lastActiveDate?: string;
}

export interface QuizResult {
  date: string;
  score: number;
  pointsEarned: number;
}

export interface Match {
  partner: Student;
  matchPercentage: number;
  mutualStrongSkill: string;
  mutualWeakSkill: string;
}

export type SessionMode = 'F2F' | 'ONLINE';

export interface RoadmapStep {
  title: string;
  description: string;
}

export interface DayContent {
  explanation: string;
  examples: string[];
  keyPoints: string[];
  exercise: string;
  prerequisites: string;
}

export interface RoadmapDay {
  day: number;
  title: string;
  topics: string[];
  learningObjective: string;
  difficulty?: string;
  
  content?: DayContent;

  // Future fields placeholders:
  notes?: string;
  quiz?: any;
  bestScore?: number;
  passed?: boolean;
  xpAwarded?: number;
  completedAt?: number;
}

export interface LearningPath {
  id: string;
  userId: string;
  skill: string;
  normalizedSkill: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'mastered';
  currentDay: number;
  highestUnlockedDay: number;
  generatedThroughDay: number;
  masteryStatus: number;
  roadmapDays: RoadmapDay[];
}

export interface LearningResource {
  title: string;
  uri: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Session {
  id: string;
  partnerId: string;
  skill: string;
  timestamp: number;
  mode: SessionMode;
  score: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  read?: boolean;
}
