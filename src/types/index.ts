export type Role = 'participant' | 'volunteer' | 'admin';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  role: Role;
  teamId?: string;
  teamName?: string;
  mentorName?: string;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  projectId?: string;
  tableNumber?: string;
  mentorName?: string;
}

export interface Project {
  id: string;
  teamId: string;
  teamName: string;
  githubUrl?: string;
  demoUrl?: string;
  devpostUrl?: string;
  description?: string;
  submittedAt: number;
  submittedBy: string;
}

export interface Score {
  id: string;
  projectId: string;
  teamId: string;
  teamName: string;
  judgeId: string;
  judgeName: string;
  innovation: number;
  technical: number;
  presentation: number;
  impact: number;
  total: number;
  notes?: string;
  round: number;
  createdAt: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  type: 'event' | 'speaker' | 'break' | 'meal';
  location?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'broadcast' | 'notice';
  targetUid?: string;
  targetTeamId?: string;
  postedBy: string;
  createdAt: number;
  pinned?: boolean;
}

export interface Advice {
  id: string;
  teamId: string;
  mentorName: string;
  type: 'suggestion' | 'praise' | 'warning';
  content: string;
  round: number;
  implemented: boolean;
  createdAt: number;
}