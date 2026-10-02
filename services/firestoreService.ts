import { db } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Student } from '../types';

const USERS_COLLECTION = 'users';

// Normalization Layer for Student Data
const normalizeStudent = (data: any, id: string): Student => {
  return {
    name: data?.name || '',
    displayName: data?.displayName || data?.name || '',
    email: data?.email || '',
    college: data?.college || '',
    branch: data?.branch || '',
    year: typeof data?.year === 'number' ? data.year : 1,
    strongSkills: Array.isArray(data?.strongSkills) ? data.strongSkills : [],
    weakSkills: Array.isArray(data?.weakSkills) ? data.weakSkills : [],
    teachingScore: typeof data?.teachingScore === 'number' ? data.teachingScore : 0,
    learningScore: typeof data?.learningScore === 'number' ? data.learningScore : 0,
    skillReputation: typeof data?.skillReputation === 'number' ? data.skillReputation : 0,
    points: typeof data?.points === 'number' ? data.points : 0,
    rank: data?.rank || 'Beginner',
    avatar: data?.avatar || '',
    bio: data?.bio || '',
    badges: Array.isArray(data?.badges) ? data.badges : [],
    streak: typeof data?.streak === 'number' ? data.streak : 0,
    completedTopics: Array.isArray(data?.completedTopics) ? data.completedTopics : [],
    sessionsCount: typeof data?.sessionsCount === 'number' ? data.sessionsCount : 0,
    profileComplete: typeof data?.profileComplete === 'boolean' ? data.profileComplete : false,
    quizHistory: Array.isArray(data?.quizHistory) ? data.quizHistory : [],
    ...data, // Keep any extra fields just in case
    id: id,  // STRICT: Must always be the canonical Document ID
    uid: id  // STRICT: Must always be the canonical Document ID
  } as Student;
};

export const firestoreService = {
  // Get a single user by UID
  getUser: async (uid: string): Promise<Student | null> => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeStudent(docSnap.data(), docSnap.id);
    }
    return null;
  },

  // Update or create a user profile
  updateUser: async (uid: string, data: Partial<Student>) => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, data, { merge: true });
  },

  // Subscribe to all users (for Explore Hub, Leaderboard, etc.)
  subscribeToUsers: (callback: (users: Student[]) => void) => {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const users: Student[] = [];
      snapshot.forEach((doc) => {
        const user = normalizeStudent(doc.data(), doc.id);
        
        // Filter out fake or incomplete users. Must have real data.
        if (
          user.uid &&
          user.name && user.name.trim() !== '' &&
          user.college && user.college.trim() !== '' &&
          Array.isArray(user.strongSkills) && user.strongSkills.length > 0 &&
          Array.isArray(user.weakSkills) && user.weakSkills.length > 0
        ) {
          users.push(user);
        }
      });
      callback(users);
    });
  },

  // Subscribe to current user
  subscribeToUser: (uid: string, callback: (user: Student | null) => void) => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(normalizeStudent(docSnap.data(), docSnap.id));
      } else {
        callback(null);
      }
    }, (error) => {
      // Silent error handling
      callback(null);
    });
  }
};
