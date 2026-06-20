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

const studentHomework = [
  { id:1, title: 'Calculus: Integration by Parts',    subject:'Mathematics',   teacher:'Ms. Clarke', due:'Today, 11:59 PM',  status:'pending',   urgent:true,  desc:'Complete questions 1–8 from Chapter 12. Show all working.' },
  { id:2, title: 'Optics: Refraction & Snell\'s Law', subject:'Physics',       teacher:'Mr. Park',   due:'Tomorrow, 11:59 PM',status:'pending',   urgent:false, desc:'Answer the 5 questions on the worksheet. Include ray diagrams where applicable.' },
  { id:3, title: 'Vectors: Cross Products',           subject:'Further Maths', teacher:'Ms. Clarke', due:'Wed 30 Apr',        status:'pending',   urgent:false, desc:'Worksheet Section B, Q1–6.' },
  { id:4, title: 'Algebra: Simultaneous Equations',   subject:'Mathematics',   teacher:'Ms. Clarke', due:'22 Apr',            status:'submitted', urgent:false, score:92, feedback:'Excellent work — all methods correct. Minor notation issue on Q4.' },
  { id:5, title: 'Mechanics: Moments & Torque',       subject:'Physics',       teacher:'Mr. Park',   due:'20 Apr',            status:'marked',    urgent:false, score:78, feedback:'Good attempt. Q3 had the wrong sign convention — review lever arm direction.' },
  { id:6, title: 'Sequences: nth Term Proofs',        subject:'Further Maths', teacher:'Ms. Clarke', due:'16 Apr',            status:'marked',    urgent:false, score:87, feedback:'Strong algebraic proof on Q4. Q2 coefficient was slightly off — see annotation.' },
  { id:7, title: 'Organic: Alkanes & Alkenes',        subject:'Chemistry',     teacher:'Dr. Owens',  due:'Fri 2 May',         status:'pending',   urgent:false, desc:'Complete the reaction mechanisms worksheet, Q1–10.' },
  { id:8, title: 'Stoichiometry: Mole Calculations',  subject:'Chemistry',     teacher:'Dr. Owens',  due:'18 Apr',            status:'marked',    urgent:false, score:84, feedback:'Solid working. Q6 — remember to convert grams to moles before using the ratio.' },
  { id:9, title: 'Differential Equations: Modelling', subject:'Further Maths', teacher:'Ms. Clarke', due:'14 Apr',            status:'marked',    urgent:false, score:90, feedback:'Excellent setup of the model. Take care with the constant of integration in Q5.' },
];

const studentSessions = [
  { subject:'Mathematics',   date:'Mon 28 Apr', time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Sarah Clarke', type:'Regular' },
  { subject:'Further Maths', date:'Wed 30 Apr', time:'10:30–12:00', room:'Room 5',  teacher:'Ms. Sarah Clarke', type:'Regular' },
  { subject:'Physics',       date:'Thu 1 May',  time:'14:00–15:30', room:'Room 7',  teacher:'Mr. David Park',   type:'Regular' },
  { subject:'Chemistry',     date:'Thu 1 May',  time:'16:00–17:30', room:'Room 8',  teacher:'Dr. Hannah Owens', type:'Regular' },
  { subject:'Mathematics',   date:'Fri 2 May',  time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Sarah Clarke', type:'Regular' },
  { subject:'Physics',       date:'Mon 5 May',  time:'14:00–15:30', room:'Room 7',  teacher:'Mr. David Park',   type:'Mock prep' },
  { subject:'Mathematics',   date:'Wed 7 May',  time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Sarah Clarke', type:'Mock prep' },
  { subject:'Chemistry',     date:'Thu 8 May',  time:'16:00–17:30', room:'Room 8',  teacher:'Dr. Hannah Owens', type:'Mock prep' },
];

