import { QuizQuestion, LearningResource } from "../types";
import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export const aiService = {
  /**
   * Generate a 10-question MCQ quiz for a skill.
   */
  generateQuiz: async (
    skill: string,
    signal?: AbortSignal
  ): Promise<QuizQuestion[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill }),
      signal
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "AI quota temporarily exceeded. Please try again later.");
      }
      throw new Error('Failed to generate quiz');
    }
    
    return response.json();
  },

  /**
   * Generate a structured 30-day learning roadmap for a skill.
   */
  getLearningRoadmap: async (
    skill: string,
    signal?: AbortSignal
  ): Promise<any[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/roadmap`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill }),
      signal
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "AI quota temporarily exceeded. Please try again later.");
      }
      throw new Error('Failed to generate roadmap');
    }
    
    const parsed = await response.json();
    
    if (!Array.isArray(parsed) || parsed.length < 1) {
       throw new Error("Invalid roadmap format received from AI.");
    }
    
    return parsed;
  },

  /**
   * Generate detailed content for a specific day in the roadmap.
   */
  getLearningDayContent: async (
    skill: string,
    dayNumber: number,
    dayTitle: string,
    topics: string[],
    signal?: AbortSignal
  ): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/day-content`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill, dayNumber, dayTitle, topics }),
      signal
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "AI quota temporarily exceeded. Please try again later.");
      }
      throw new Error('Failed to generate day content');
    }
    
    return response.json();
  },

  /**
   * Generate a 10-question MCQ quiz for a specific day in the roadmap.
   */
  generateDayQuiz: async (
    skill: string,
    dayNumber: number,
    dayTitle: string,
    topics: string[],
    signal?: AbortSignal
  ): Promise<QuizQuestion[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/day-quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill, dayNumber, dayTitle, topics }),
      signal
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "AI quota temporarily exceeded. Please try again later.");
      }
      throw new Error('Failed to generate day quiz');
    }
    
    return response.json();
  },

  /**
   * Returns static curated resource links.
   */
  getWebResources: async (skill: string): Promise<LearningResource[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/resources`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill })
    });
    
    if (!response.ok) {
       return [
         { title: `${skill} Documentation`, uri: `https://www.google.com/search?q=${encodeURIComponent(skill + " docs")}` },
         { title: `${skill} Crash Course`, uri: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " crash course")}` },
       ];
    }
    return response.json();
  },

  /**
   * Motivational growth insight.
   */
  getGrowthInsight: async (
    skills: string[],
    signal?: AbortSignal
  ): Promise<string> => {
    if (!skills.length) return "Start learning new skills to get insights!";
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/insight`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ skills }),
        signal
      });
      
      if (!response.ok) {
        return "Every session brings you closer to mastery. Keep going!";
      }
      const data = await response.json();
      return data.message || "Every session brings you closer to mastery. Keep going!";
    } catch {
      return "Every session brings you closer to mastery. Keep going!";
    }
  },

  /**
   * AI Assistant chat reply.
   */
  askAssistant: async (
    query: string,
    signal?: AbortSignal
  ): Promise<string> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "AI quota temporarily exceeded. Please try again later.");
        }
        return "I'm having trouble right now. Please try again.";
      }
      
      const data = await response.json();
      return data.message || "I'm having trouble right now. Please try again.";
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      return e.message || "I'm having trouble right now. Please try again.";
    }
  },
};
