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

export const apiService = {
  async createSwapRequest(receiverUid: string, skillOffered: string, skillWanted: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/swap-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ receiverUid, skillOffered, skillWanted })
    });
    if (!response.ok) throw new Error('Failed to create swap request');
    return response.json();
  },

  async getSwapRequests() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/swap-requests`, {
      method: 'GET',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch swap requests');
    return response.json();
  },

  async respondToSwapRequest(requestId: string, action: 'accept' | 'reject') {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/swap-requests/${requestId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action })
    });
    if (!response.ok) throw new Error('Failed to respond to request');
    return response.json();
  },

  async getSessions() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'GET',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  async completeSession(sessionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    if (!response.ok) throw new Error('Failed to complete session');
    return response.json();
  },

  async createReview(sessionId: string, rating: number, comment: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId, rating, comment })
    });
    if (!response.ok) throw new Error('Failed to create review');
    return response.json();
  },

  async getLeaderboard() {
    // Leaderboard is public, no auth headers needed
    const response = await fetch(`${API_BASE}/api/leaderboard`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  },

  async completeLearningDay(skill: string, dayNumber: number, score: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/learning-path/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skill, dayNumber, score })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete day');
    }
    return response.json();
  }
};
