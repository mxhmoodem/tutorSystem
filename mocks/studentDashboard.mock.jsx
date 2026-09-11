// ══════════════════════════════════════════════════════════════
//  Mock data — Student Dashboard
//  Loaded as a global script before StudentDashboard.jsx (see index.html).
// ══════════════════════════════════════════════════════════════

const studentSelf = {
  name: 'Oliver Chen',
  year: 'Year 12',
  subjects: [
    { name: 'Mathematics',   color: '#43b190', scores: [82,85,84,88,90,89,92,94], predicted: 'A*', attendance: 98 },
    { name: 'Further Maths', color: '#7C3AED', scores: [78,80,82,83,85,86,87,88], predicted: 'A',  attendance: 96 },
    { name: 'Physics',       color: '#0891B2', scores: [72,74,77,79,78,80,81,81], predicted: 'A',  attendance: 94 },
    { name: 'Chemistry',     color: '#D97706', scores: [68,70,73,72,75,77,78,80], predicted: 'A',  attendance: 92 },
  ],
};


const studentSessions = [
  { subject:'Mathematics',   date:'Mon 28 Apr', time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Heebz A', type:'Regular' },
  { subject:'Further Maths', date:'Wed 30 Apr', time:'10:30–12:00', room:'Room 5',  teacher:'Ms. Heebz A', type:'Regular' },
  { subject:'Physics',       date:'Thu 1 May',  time:'14:00–15:30', room:'Room 7',  teacher:'Mr. David Park',   type:'Regular' },
  { subject:'Chemistry',     date:'Thu 1 May',  time:'16:00–17:30', room:'Room 8',  teacher:'Dr. Hannah Owens', type:'Regular' },
  { subject:'Mathematics',   date:'Fri 2 May',  time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Heebz A', type:'Regular' },
  { subject:'Physics',       date:'Mon 5 May',  time:'14:00–15:30', room:'Room 7',  teacher:'Mr. David Park',   type:'Mock prep' },
  { subject:'Mathematics',   date:'Wed 7 May',  time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Heebz A', type:'Mock prep' },
  { subject:'Chemistry',     date:'Thu 8 May',  time:'16:00–17:30', room:'Room 8',  teacher:'Dr. Hannah Owens', type:'Mock prep' },
];

