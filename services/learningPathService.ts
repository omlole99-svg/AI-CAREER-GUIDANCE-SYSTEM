import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LearningPath, RoadmapDay } from '../types';
import { aiService } from './aiService';
import { firestoreService } from './firestoreService';
import { streakService } from './streakService';
import { apiService } from './apiService';

export const learningPathService = {
  /**
   * Safely normalize a skill string for use as an ID component.
   * e.g., "C++" -> "c_plus_plus", "Machine Learning" -> "machine_learning"
   */
  normalizeSkill: (skill: string): string => {
    return skill.trim().toLowerCase()
      .replace(/\+/g, 'plus')
      .replace(/#/g, 'sharp')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  },

  /**
   * Gets an existing learning path from Firestore, or returns null.
   */
  getLearningPath: async (userId: string, skill: string): Promise<LearningPath | null> => {
    const normalized = learningPathService.normalizeSkill(skill);
    const pathId = `${userId}_${normalized}`;
    
    try {
      const docRef = doc(db, 'learningPaths', pathId);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        return snap.data() as LearningPath;
      }
      return null;
    } catch (e) {
      console.error("Failed to get learning path:", e);
      return null;
    }
  },

  /**
   * Generates a 30-day roadmap using AI and saves it to Firestore safely.
   */
  generateAndSaveLearningPath: async (userId: string, skill: string, signal?: AbortSignal): Promise<LearningPath> => {
    const normalized = learningPathService.normalizeSkill(skill);
    const pathId = `${userId}_${normalized}`;
    
    // Safety Check: Avoid generating if it already exists (Race condition defense)
    const existing = await learningPathService.getLearningPath(userId, skill);
    if (existing) return existing;

    // Call AI Service
    const rawDays = await aiService.getLearningRoadmap(skill, signal);
    
    // Ensure the data has exactly 30 days
    if (!rawDays || rawDays.length !== 30) {
      throw new Error("AI did not return exactly 30 days. Please try again.");
    }
    
    // Ensure sequential indexing
    const validDays = rawDays.sort((a, b) => a.day - b.day).map((d, i) => ({
      ...d,
      day: i + 1
    })) as RoadmapDay[];

    const newPath: LearningPath = {
      id: pathId,
      userId,
      skill,
      normalizedSkill: normalized,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      currentDay: 1,
      highestUnlockedDay: 1,
      generatedThroughDay: 30,
      masteryStatus: 0,
      roadmapDays: validDays
    };

    // Save to Firestore idemptotently
    // Merge true guarantees we don't accidentally overwrite a race-condition write
    const docRef = doc(db, 'learningPaths', pathId);
    await setDoc(docRef, newPath, { merge: true });
    
    return newPath;
  },

  /**
   * Fetches or generates the detailed content for a specific day.
   */
  getOrGenerateDayContent: async (userId: string, skill: string, dayNumber: number, signal?: AbortSignal): Promise<LearningPath> => {
    const existing = await learningPathService.getLearningPath(userId, skill);
    if (!existing) throw new Error("Roadmap not found.");

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= existing.roadmapDays.length) {
      throw new Error("Invalid day number.");
    }

    const dayData = existing.roadmapDays[dayIndex];
    
    // If we already generated this day's content, return immediately.
    if (dayData.content) {
      return existing;
    }

    // Call AI Service
    const content = await aiService.getLearningDayContent(skill, dayNumber, dayData.title, dayData.topics, signal);
    
    existing.roadmapDays[dayIndex].content = content;

    // Save to Firestore idemptotently
    const docRef = doc(db, 'learningPaths', existing.id);
    await setDoc(docRef, { roadmapDays: existing.roadmapDays }, { merge: true });
    
    return existing;
  },

  /**
   * Completes a day via the backend API.
   */
  completeDay: async (userId: string, skill: string, dayNumber: number, score: number = 0): Promise<{ path: LearningPath, xpAwarded: number, passed: boolean }> => {
    // Calling the secure backend API
    const result = await apiService.completeLearningDay(skill, dayNumber, score);
    return {
      path: result.path as LearningPath,
      xpAwarded: result.xpAwarded,
      passed: result.passed
    };
  }
};
