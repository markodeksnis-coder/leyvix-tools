export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  milestones: Milestone[];
  createdAt: string;
  targetDate?: string;
}

export interface LifeArea {
  id: string;
  name: string;
  currentScore: number;
  dreamScore: number;
  currentDescription: string;
  dreamDescription: string;
}

export interface DreamSelfData {
  visionText: string;
  lifeAreas: LifeArea[];
}

export interface Priority {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  isPriority: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
}

export type TabId = 'dashboard' | 'goals' | 'dream-self' | 'daily-focus';
