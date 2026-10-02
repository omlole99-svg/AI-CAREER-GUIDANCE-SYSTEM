import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType = 'session' | 'quiz' | 'learning_task';

export const streakService = {
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
   * Evaluates and updates the user's streak idempotently.
   * Uses a Firestore transaction to prevent double counting on same day.
   */
  async recordLearningActivity(uid: string, activityType: ActivityType): Promise<void> {
    const todayStr = this.getLocalDateString();
    
    // Parse "YYYY-MM-DD" as UTC midnight for safe day-difference math
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const todayUTC = Date.UTC(tY, tM - 1, tD);

    const userRef = doc(db, 'users', uid);

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const data = userDoc.data();
        let currentStreak = typeof data.streak === 'number' ? data.streak : 0;
        const lastActiveDateStr = data.lastActiveDate as string | undefined;

        let newStreak = currentStreak;

        if (!lastActiveDateStr) {
          // First activity ever
          newStreak = 1;
        } else {
          if (lastActiveDateStr === todayStr) {
            // Already active today, streak remains the same (idempotent)
            return;
          }

          const [lY, lM, lD] = lastActiveDateStr.split('-').map(Number);
          const lastDateUTC = Date.UTC(lY, lM - 1, lD);
          
          const diffTime = todayUTC - lastDateUTC;
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Consecutive day
            newStreak += 1;
          } else if (diffDays > 1) {
            // Missed day
            newStreak = 1;
          } else {
             // In case of time traveling backwards
             return;
          }
        }

        // Apply update
        transaction.update(userRef, {
          streak: newStreak,
          lastActiveDate: todayStr
        });
      });
    } catch (error) {
      console.error("Streak transaction failed: ", error);
    }
  }
};
