import { db } from './firebase';
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export type ActivityType = 'chat' | 'session' | 'quiz' | 'learning_task';

export interface ActivityRecord {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const activityService = {
  /**
   * Helper to get local calendar date as YYYY-MM-DD
   */
  getLocalDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Record a user activity idempotently.
   * Uses a determinisic activityId so repeated/duplicate executions 
   * overwrite the same record safely instead of creating spam.
   */
  async recordActivity(
    userId: string, 
    activityId: string, 
    type: ActivityType, 
    title: string, 
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const activityRef = doc(db, 'students', userId, 'activity', activityId);
      
      const activityData: ActivityRecord = {
        id: activityId,
        userId,
        type,
        title,
        description,
        timestamp: Date.now(),
        ...(metadata && { metadata })
      };

      // Upsert using setDoc (merge: true) to ensure idempotency. 
      // If we record "Chatted with Rahul" again today, it just updates the timestamp.
      await setDoc(activityRef, activityData, { merge: true });
    } catch (e) {
      console.error("Failed to record activity:", e);
      // We swallow the error so that the primary action (e.g. sending a message) is not blocked
    }
  },

  /**
   * Subscribe to recent activities for the dashboard
   */
  subscribeToRecentActivities(userId: string, callback: (activities: ActivityRecord[]) => void, maxLimit = 15) {
    const q = query(
      collection(db, 'students', userId, 'activity'),
      orderBy('timestamp', 'desc'),
      limit(maxLimit)
    );

    return onSnapshot(q, (snapshot) => {
      const activities: ActivityRecord[] = [];
      snapshot.forEach(doc => {
        activities.push(doc.data() as ActivityRecord);
      });
      callback(activities);
    }, (error) => {
      console.warn("Could not subscribe to recent activities. Ensure Firebase Rules allow reading /students/{uid}/activity.", error);
    });
  }
};
