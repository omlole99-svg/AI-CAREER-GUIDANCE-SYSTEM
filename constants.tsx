
import { Student, Badge, SkillCategory } from './types';
import { Layout, Users, Book, Trophy, Target, MessageSquareCode, Inbox } from 'lucide-react';

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Development', 'AI & Data', 'Design', 'Academics', 'Soft Skills'
];

// Map individual skills to categories for robust filtering
export const SKILL_MAP: Record<string, SkillCategory> = {
  'React': 'Development',
  'Node.js': 'Development',
  'Tailwind': 'Development',
  'TypeScript': 'Development',
  'HTML': 'Development',
  'CSS': 'Development',
  'Java': 'Development',
  'C++': 'Development',
  'Python': 'AI & Data',
  'Machine Learning': 'AI & Data',
  'PyTorch': 'AI & Data',
  'SQL': 'AI & Data',
  'Data Structures': 'Academics',
  'System Design': 'Development',
  'Figma': 'Design',
  'UI Design': 'Design',
  'Interaction Design': 'Design',
  'Public Speaking': 'Soft Skills',
  'Technical Writing': 'Soft Skills',
  'Communication': 'Soft Skills',
  'Programming': 'Development'
};

export const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Layout },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'matching', label: 'Explore Hub', icon: Users },
  { id: 'learnhub', label: 'Learn Hub', icon: Book },
  { id: 'sessions', label: 'History', icon: Book },
  { id: 'leaderboard', label: 'Rankings', icon: Trophy },
  { id: 'marketplace', label: 'Assets', icon: Target },
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquareCode },
];
