import type { Goal, Project, DreamSelfData } from './types';

export const initialDreamSelf: DreamSelfData = {
  visionText: `5 active clients. Service delivery dialed in — clients getting great results consistently. 3 setters hitting KPIs every week. 70% show rate. 20% sales conversion. 3 outreach systems running. Ads launched and generating leads.

Physically: 10% body fat, lean and strong. 13,000 steps every day. 2,200 calories. 150g protein.

Focused and in control: 2 hours screen time max per day, 20 phone pickups. Deep work by default.`,
  lifeAreas: [
    {
      id: 'la1',
      name: 'Body Composition',
      currentScore: 4,
      dreamScore: 9,
      currentDescription: '20% body fat',
      dreamDescription: '10% body fat',
    },
    {
      id: 'la2',
      name: 'Activity',
      currentScore: 6,
      dreamScore: 9,
      currentDescription: '9,000 steps/day · gym 6x/week',
      dreamDescription: '13,000 steps/day',
    },
    {
      id: 'la3',
      name: 'Nutrition',
      currentScore: 5,
      dreamScore: 9,
      currentDescription: '2,700 cal · 120g protein/day',
      dreamDescription: '2,200 cal · 150g protein/day',
    },
    {
      id: 'la4',
      name: 'Sales',
      currentScore: 3,
      dreamScore: 9,
      currentDescription: '25% show rate · 10% close rate',
      dreamDescription: '70% show rate · 20% close rate',
    },
    {
      id: 'la5',
      name: 'Business',
      currentScore: 2,
      dreamScore: 9,
      currentDescription: '1 active client · 1 outreach system · no ads',
      dreamDescription: '5 active clients · 3 outreach systems · ads live',
    },
    {
      id: 'la6',
      name: 'Team & Delivery',
      currentScore: 3,
      dreamScore: 9,
      currentDescription: '1 setter not on KPI · service delivery not dialed',
      dreamDescription: '3 setters hitting KPIs · great results for clients',
    },
    {
      id: 'la7',
      name: 'Focus',
      currentScore: 3,
      dreamScore: 9,
      currentDescription: '5h screen time · 50 phone pickups/day',
      dreamDescription: '2h screen time · 20 phone pickups/day',
    },
  ],
};

export const initialGoals: Goal[] = [
  {
    id: 'g1',
    title: 'Get to 10% Body Fat',
    description: 'Drop from 20% to 10% BF while keeping muscle',
    category: 'Health',
    progress: 0,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g1m1', title: 'Reach 18% body fat', completed: false },
      { id: 'g1m2', title: 'Reach 15% body fat', completed: false },
      { id: 'g1m3', title: 'Reach 12% body fat', completed: false },
      { id: 'g1m4', title: 'Reach 10% body fat', completed: false },
    ],
  },
  {
    id: 'g2',
    title: 'Scale to 5 Active Clients',
    description: 'From 1 to 5 paying clients with great results',
    category: 'Career',
    progress: 10,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g2m1', title: 'Close 2nd client', completed: false },
      { id: 'g2m2', title: 'Dial in service delivery', completed: false },
      { id: 'g2m3', title: 'Close 3rd client', completed: false },
      { id: 'g2m4', title: 'Close 4th & 5th client', completed: false },
    ],
  },
  {
    id: 'g3',
    title: 'Improve Show Rate to 70%',
    description: 'From 25% to 70% — better qualifying and follow-up',
    category: 'Career',
    progress: 0,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g3m1', title: 'Identify why leads ghost', completed: false },
      { id: 'g3m2', title: 'Build pre-call reminder sequence', completed: false },
      { id: 'g3m3', title: 'Hit 40% show rate', completed: false },
      { id: 'g3m4', title: 'Hit 55% show rate', completed: false },
      { id: 'g3m5', title: 'Hit 70% show rate', completed: false },
    ],
  },
  {
    id: 'g4',
    title: 'Build 3 Outreach Systems',
    description: 'Diversify lead gen beyond the single current system',
    category: 'Career',
    progress: 20,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g4m1', title: 'Current system optimized', completed: true },
      { id: 'g4m2', title: 'Launch 2nd outreach channel', completed: false },
      { id: 'g4m3', title: 'Launch paid ads', completed: false },
      { id: 'g4m4', title: 'Launch 3rd outreach channel', completed: false },
    ],
  },
  {
    id: 'g5',
    title: 'Cut Screen Time to 2h/day',
    description: 'From 5h to 2h — reclaim focus and mental energy',
    category: 'Personal',
    progress: 0,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g5m1', title: 'Audit & remove time-wasting apps', completed: false },
      { id: 'g5m2', title: 'Hit 4h screen time consistently', completed: false },
      { id: 'g5m3', title: 'Hit 3h screen time consistently', completed: false },
      { id: 'g5m4', title: 'Hit 2h screen time consistently', completed: false },
    ],
  },
  {
    id: 'g6',
    title: 'Get Setter on KPI',
    description: 'Restructure setter comp and hold accountable to results',
    category: 'Career',
    progress: 0,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g6m1', title: 'Define setter KPIs and weekly targets', completed: false },
      { id: 'g6m2', title: 'Restructure pay to performance-based', completed: false },
      { id: 'g6m3', title: 'Setter hits KPI 4 weeks in a row', completed: false },
    ],
  },
  {
    id: 'g7',
    title: 'Improve Sales Conversion to 20%',
    description: 'From 10% to 20% close rate — better offer, better calls',
    category: 'Career',
    progress: 0,
    createdAt: new Date().toISOString(),
    milestones: [
      { id: 'g7m1', title: 'Review & fix call recordings', completed: false },
      { id: 'g7m2', title: 'Sharpen offer and objection handling', completed: false },
      { id: 'g7m3', title: 'Hit 15% close rate', completed: false },
      { id: 'g7m4', title: 'Hit 20% close rate', completed: false },
    ],
  },
];

export const initialProjects: Project[] = [
  {
    id: 'p1',
    title: 'Fix Show Rate',
    description: '25% → 70% — build reminder sequence, qualify harder',
    status: 'active',
    progress: 10,
  },
  {
    id: 'p2',
    title: 'Dial In Service Delivery',
    description: 'Build a repeatable process that gets consistent client results',
    status: 'active',
    progress: 20,
  },
  {
    id: 'p3',
    title: 'Launch Paid Ads',
    description: 'First ad campaign — add a 2nd lead source',
    status: 'active',
    progress: 0,
  },
  {
    id: 'p4',
    title: 'Setter KPI System',
    description: 'Define metrics, restructure pay, weekly accountability',
    status: 'active',
    progress: 5,
  },
];
