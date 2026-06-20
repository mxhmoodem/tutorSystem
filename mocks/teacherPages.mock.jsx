// ══════════════════════════════════════════════════════════════
//  Mock data — Teacher Pages
//  Loaded as a global script before TeacherPages.jsx (see index.html).
//  Depends on DS (from shared.jsx) for accent colours.
//
//  DEFAULT_TRACKERS seeds the tracking store on first load.
// ══════════════════════════════════════════════════════════════

const teacherClasses = [
  {
    id: 1, name: 'GCSE Mathematics',  group: 'Year 10 – Group A', day: 'Fri', time: '09:00', room: 'Room 3',
    students: 8, nextSession: 'Fri 25 Apr, 09:00', color: DS.accent,
    hwPending: 2, avgScore: 76, attendance: 94,
    studentList: ['Emma Thompson','Oliver Chen','Sophia Patel','James Wilson','Aiden Foster','Mia Okonkwo','Liam Thornton','Zoe Patterson'],
  },
  {
    id: 2, name: 'GCSE Mathematics',  group: 'Year 11 – Group B', day: 'Fri', time: '10:30', room: 'Room 3',
    students: 7, nextSession: 'Fri 25 Apr, 10:30', color: DS.accent,
    hwPending: 3, avgScore: 71, attendance: 88,
    studentList: ['Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez','James Wilson','Sophia Patel','Emma Thompson'],
  },
  {
    id: 3, name: 'A-Level Mathematics', group: 'Year 12 – Group A', day: 'Fri', time: '13:00', room: 'Room 5',
    students: 5, nextSession: 'Fri 25 Apr, 13:00', color: '#7C3AED',
    hwPending: 4, avgScore: 88, attendance: 97,
    studentList: ['Oliver Chen','Isabella Martinez','Ethan Huang','Mia Okonkwo','Aiden Foster'],
  },
  {
    id: 4, name: 'GCSE Mathematics',  group: 'Year 9 – Group C',  day: 'Fri', time: '15:00', room: 'Room 3',
    students: 9, nextSession: 'Fri 25 Apr, 15:00', color: DS.accent,
    hwPending: 1, avgScore: 79, attendance: 92,
    studentList: ['Mia Okonkwo','Aiden Foster','Emma Thompson','Sophia Patel','James Wilson','Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez'],
  },
  {
    id: 5, name: 'A-Level Mathematics', group: 'Year 13 – Group A', day: 'Thu', time: '16:30', room: 'Room 5',
    students: 4, nextSession: 'Thu 24 Apr, 16:30', color: '#7C3AED',
    hwPending: 1, avgScore: 85, attendance: 95,
    studentList: ['Thomas Hughes','Isabella Martinez','Oliver Chen','Freya Lindqvist'],
  },
];

const homeworkFull = [
  { id:1, title:'Algebra: Simultaneous Equations',   class:'Yr 10 Group A', subject:'GCSE Maths', set:'18 Apr', due:'22 Apr', submitted:8, total:8, marked:5, avgScore:81, status:'marking'  },
  { id:2, title:'Calculus: Differentiation Basics',  class:'Yr 12 Group A', subject:'A-Level',    set:'20 Apr', due:'24 Apr', submitted:4, total:5, marked:0, avgScore:null,status:'marking'  },
  { id:3, title:'Trigonometry: Sine & Cosine Rules', class:'Yr 11 Group B', subject:'GCSE Maths', set:'22 Apr', due:'27 Apr', submitted:2, total:7, marked:0, avgScore:null,status:'open'     },
  { id:4, title:'Statistics: Probability Trees',     class:'Yr 10 Group A', subject:'GCSE Maths', set:'22 Apr', due:'29 Apr', submitted:0, total:8, marked:0, avgScore:null,status:'open'     },
  { id:5, title:'Integration: Reverse Chain Rule',   class:'Yr 12 Group A', subject:'A-Level',    set:'15 Apr', due:'20 Apr', submitted:5, total:5, marked:5, avgScore:84,  status:'complete' },
  { id:6, title:'Quadratics: Completing the Square', class:'Yr 11 Group B', subject:'GCSE Maths', set:'14 Apr', due:'17 Apr', submitted:7, total:7, marked:7, avgScore:73,  status:'complete' },
  { id:7, title:'Vectors: Magnitude & Direction',    class:'Yr 13 Group A', subject:'A-Level',    set:'21 Apr', due:'30 Apr', submitted:1, total:4, marked:0, avgScore:null,status:'open'     },
  { id:8, title:'Number: Surds & Indices',           class:'Yr 9 Group C',  subject:'GCSE Maths', set:'22 Apr', due:'02 May', submitted:0, total:9, marked:0, avgScore:null,status:'open'     },
  { id:9, title:'Geometry: Circle Theorems',         class:'Yr 11 Group B', subject:'GCSE Maths', set:'10 Apr', due:'15 Apr', submitted:7, total:7, marked:7, avgScore:69,  status:'complete' },
  { id:10,title:'Differential Equations: Modelling', class:'Yr 13 Group A', subject:'A-Level',    set:'08 Apr', due:'14 Apr', submitted:4, total:4, marked:4, avgScore:87,  status:'complete' },
];

const teacherAllClasses = [
  { group:'Year 10 – Group A', subject:'GCSE Mathematics', students:['Emma Thompson','Oliver Chen','Sophia Patel','James Wilson','Aiden Foster','Mia Okonkwo','Liam Thornton','Zoe Patterson'] },
  { group:'Year 11 – Group B', subject:'GCSE Mathematics', students:['Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez','James Wilson','Sophia Patel','Emma Thompson'] },
  { group:'Year 12 – Group A', subject:'A-Level Mathematics', students:['Oliver Chen','Isabella Martinez','Ethan Huang','Mia Okonkwo','Aiden Foster'] },
  { group:'Year 9 – Group C',  subject:'GCSE Mathematics', students:['Mia Okonkwo','Aiden Foster','Emma Thompson','Sophia Patel','James Wilson','Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez'] },
  { group:'Year 13 – Group A', subject:'A-Level Mathematics', students:['Thomas Hughes','Isabella Martinez','Oliver Chen','Freya Lindqvist'] },
];

const DEFAULT_TRACKERS = [
  {
    id: 't_hw',
    name: 'Homework Scores',
    description: 'Weekly homework marks per student',
    classGroup: 'Year 10 – Group A',
    columns: [
      { id: 'c1', name: 'HW1: Algebra',       type: 'score', max: 20 },
      { id: 'c2', name: 'HW2: Equations',     type: 'score', max: 20 },
      { id: 'c3', name: 'HW3: Probability',   type: 'score', max: 25 },
      { id: 'c4', name: 'On time?',           type: 'check' },
      { id: 'c5', name: 'Notes',              type: 'text' },
    ],
    entries: {
      'Emma Thompson':   { c1: 17, c2: 18, c3: 22, c4: true,  c5: 'Excellent presentation' },
      'Oliver Chen':     { c1: 19, c2: 20, c3: 24, c4: true,  c5: '' },
      'Sophia Patel':    { c1: 14, c2: 13, c3: 18, c4: false, c5: 'Late submission' },
      'James Wilson':    { c1: 12, c2: 14, c3: 16, c4: true,  c5: '' },
      'Aiden Foster':    { c1: 16, c2: 17, c3: 20, c4: true,  c5: '' },
      'Mia Okonkwo':     { c1: 18, c2: 19, c3: 23, c4: true,  c5: '' },
      'Liam Thornton':   { c1: 11, c2: 12, c3: 14, c4: false, c5: 'Needs support' },
      'Zoe Patterson':   { c1: 15, c2: 16, c3: 19, c4: true,  c5: '' },
    },
  },
  {
    id: 't_test',
    name: 'Test Scores',
    description: 'Half-term assessments',
    classGroup: 'Year 10 – Group A',
    columns: [
      { id: 'c1', name: 'Mock Paper 1',  type: 'score', max: 100 },
      { id: 'c2', name: 'Mock Paper 2',  type: 'score', max: 100 },
      { id: 'c3', name: 'Predicted',     type: 'grade' },
    ],
    entries: {
      'Emma Thompson':   { c1: 76, c2: 81, c3: 'B'  },
      'Oliver Chen':     { c1: 92, c2: 95, c3: 'A*' },
      'Sophia Patel':    { c1: 64, c2: 68, c3: 'C'  },
      'James Wilson':    { c1: 71, c2: 69, c3: 'B'  },
      'Aiden Foster':    { c1: 79, c2: 82, c3: 'B'  },
      'Mia Okonkwo':     { c1: 84, c2: 88, c3: 'A'  },
      'Liam Thornton':   { c1: 58, c2: 63, c3: 'D'  },
      'Zoe Patterson':   { c1: 66, c2: 61, c3: 'C'  },
    },
  },
  {
    id: 't_engage',
    name: 'Engagement Log',
    description: 'Participation and effort each lesson',
    classGroup: 'Year 11 – Group B',
    columns: [
      { id: 'c1', name: 'Participation', type: 'select' },
      { id: 'c2', name: 'Effort /5',     type: 'number', max: 5 },
      { id: 'c3', name: 'Target met?',   type: 'check' },
    ],
    entries: {
      'Amelia Roberts':   { c1: 'Low',    c2: 2, c3: false },
      'Noah Fitzgerald':  { c1: 'Low',    c2: 2, c3: false },
      'Ethan Huang':      { c1: 'High',   c2: 5, c3: true  },
      'Isabella Martinez':{ c1: 'High',   c2: 5, c3: true  },
      'James Wilson':     { c1: 'Medium', c2: 3, c3: true  },
    },
  },

  // Additional trackers so the grouped switcher is meaningful — a real teacher
  // accumulates several per class across subjects and year groups.
  {
    id: 't_hw_11b', name: 'Homework Scores', description: 'Weekly homework marks',
    classGroup: 'Year 11 – Group B',
    columns: [
      { id: 'c1', name: 'HW1: Trig',    type: 'score', max: 20 },
      { id: 'c2', name: 'HW2: Vectors', type: 'score', max: 20 },
      { id: 'c3', name: 'On time?',     type: 'check' },
    ],
    entries: {},
  },
  {
    id: 't_behaviour_9c', name: 'Behaviour Log', description: 'Conduct and merits each lesson',
    classGroup: 'Year 9 – Group C',
    columns: [
      { id: 'c1', name: 'Conduct',  type: 'select', options: ['Excellent', 'Good', 'Concern'] },
      { id: 'c2', name: 'Merits',   type: 'number', max: 3 },
      { id: 'c3', name: 'Note',     type: 'text' },
    ],
    entries: {},
  },
  {
    id: 't_hw_9c', name: 'Homework Scores', description: 'Weekly homework marks',
    classGroup: 'Year 9 – Group C',
    columns: [
      { id: 'c1', name: 'HW1: Surds', type: 'score', max: 20 },
      { id: 'c2', name: 'On time?',   type: 'check' },
    ],
    entries: {},
  },
  {
    id: 't_test_12a', name: 'Test Scores', description: 'Half-term assessments',
    classGroup: 'Year 12 – Group A',
    columns: [
      { id: 'c1', name: 'Calculus Mock', type: 'score', max: 100 },
      { id: 'c2', name: 'Predicted',     type: 'grade' },
    ],
    entries: {},
  },
  {
    id: 't_ucas_12a', name: 'Coursework Tracker', description: 'NEA / coursework milestones',
    classGroup: 'Year 12 – Group A',
    columns: [
      { id: 'c1', name: 'Draft in?',  type: 'check' },
      { id: 'c2', name: 'Stage',      type: 'select', options: ['Planning', 'Drafting', 'Final'] },
      { id: 'c3', name: 'Due',        type: 'date' },
    ],
    entries: {},
  },
  {
    id: 't_test_13a', name: 'Test Scores', description: 'Mock exam results',
    classGroup: 'Year 13 – Group A',
    columns: [
      { id: 'c1', name: 'Mock 1', type: 'score', max: 100 },
      { id: 'c2', name: 'Mock 2', type: 'score', max: 100 },
      { id: 'c3', name: 'Target', type: 'grade' },
    ],
    entries: {},
  },
  {
    id: 't_revision_13a', name: 'Revision Attendance', description: 'After-school revision sessions',
    classGroup: 'Year 13 – Group A',
    columns: [
      { id: 'c1', name: 'Session 1', type: 'check' },
      { id: 'c2', name: 'Session 2', type: 'check' },
      { id: 'c3', name: 'Session 3', type: 'check' },
    ],
    entries: {},
  },
];
