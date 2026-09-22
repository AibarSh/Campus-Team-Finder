import { createContext, useState } from 'react';

export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    firstName: 'Aisha',
    lastName: 'Bekova',
    initials: 'AB',
    major: 'Computer Science',
    year: '3rd year',
    completionRate: 72,
    skills: ['React', 'TypeScript', 'Python', 'Figma', 'Node.js'],
  });

  const [teams, setTeams] = useState([
    {
      id: 1,
      name: 'AI Study Buddy',
      event: 'KBTU Hackathon 2026',
      badgeLetter: 'A',
      badgeBg: 'bg-purple-600',
      category: 'AI/ML',
      description: 'AI-powered study assistant with personalized learning plans and course-material semantic search...',
      openRoles: ['Frontend Developer', 'UI/UX Designer'],
      members: ['D', 'A', 'B'],
      maxMembers: 5,
      prize: '₸500,000',
      daysLeft: 17,
    },
    {
      id: 2,
      name: 'EcoTrack Mobile',
      event: 'Startup Weekend Almaty',
      badgeLetter: 'E',
      badgeBg: 'bg-emerald-600',
      category: 'Mobile',
      description: 'Gamified carbon-footprint tracker with social challenges and rewards for sustainable campus habits...',
      openRoles: ['React Native Developer', 'Data Analyst'],
      members: ['A', 'Y'],
      maxMembers: 4,
      prize: '₸300,000 + mentorship',
      daysLeft: 24,
    },
    {
      id: 3,
      name: 'BlockVote',
      event: 'Web3 KZ Hackathon',
      badgeLetter: 'B',
      badgeBg: 'bg-amber-600',
      category: 'Web3',
      description: 'Decentralised voting system for KBTU student-government elections using Ethereum smart contracts...',
      openRoles: ['Solidity Developer', 'Security Analyst'],
      members: ['B', 'N'],
      maxMembers: 5,
      prize: '₸800,000',
      daysLeft: 34,
    },
    {
      id: 4,
      name: 'MedAI Diagnostics',
      event: 'HealthTech Challenge 2026',
      badgeLetter: 'M',
      badgeBg: 'bg-indigo-600',
      category: 'AI/ML',
      description: 'AI preliminary-diagnosis tool for rural Kazakhstan using image recognition and patient telemetry...',
      openRoles: ['AI / ML', 'Frontend Developer'],
      members: ['M', 'K'],
      maxMembers: 4,
      prize: '₸600,000',
      daysLeft: 43,
    },
    {
      id: 5,
      name: 'SmartCampus IoT',
      event: 'KBTU Innovation Grant',
      badgeLetter: 'S',
      badgeBg: 'bg-sky-600',
      category: 'IoT',
      description: 'IoT system to optimise KBTU campus resources — smart lighting, room booking, and occupancy sensor network...',
      openRoles: ['IoT Developer', 'Backend Developer'],
      members: ['S', 'P'],
      maxMembers: 4,
      prize: '₸450,000',
      daysLeft: 52,
    },
    {
      id: 6,
      name: 'LearnKZ',
      event: 'Digital Kazakhstan Hackathon',
      badgeLetter: 'L',
      badgeBg: 'bg-rose-600',
      category: 'EdTech',
      description: 'Gamified Kazakh-language learning platform with an AI conversation partner and cultural immersive lessons...',
      openRoles: ['Full Stack Developer', 'Content Lead'],
      members: ['L', 'T'],
      maxMembers: 5,
      prize: '₸700,000',
      daysLeft: 29,
    },
  ]);

  const [applications] = useState([
    { id: 1, teamName: 'AI Study Buddy', status: 'Pending', date: '2 days ago' },
  ]);

  return (
    <UserContext.Provider value={{ user, setUser, teams, setTeams, applications }}>
      {children}
    </UserContext.Provider>
  );
}