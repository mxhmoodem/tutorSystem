// ══════════════════════════════════════════════════════════════
//  Mock data — Teacher Dashboard
//  Loaded as a global script before TeacherDashboard.jsx (see index.html).
// ══════════════════════════════════════════════════════════════

const todaySchedule = [
  { time: '09:00', subject: 'GCSE Mathematics', group: 'Year 10 – Group A', room: 'Room 3', students: 8, status: 'completed' },
  { time: '10:30', subject: 'GCSE Mathematics', group: 'Year 11 – Group B', room: 'Room 3', students: 7, status: 'current'   },
  { time: '13:00', subject: 'A-Level Maths',    group: 'Year 12 – Group A', room: 'Room 5', students: 5, status: 'upcoming'  },
  { time: '15:00', subject: 'GCSE Mathematics', group: 'Year 9 – Group C',  room: 'Room 3', students: 9, status: 'upcoming'  },
  { time: '16:30', subject: 'A-Level Maths',    group: 'Year 13 – Group A', room: 'Room 5', students: 4, status: 'upcoming'  },
];

const homeworkItems = [
  { title: 'Algebra: Simultaneous Equations',   class: 'Yr 10 Group A', due: '22 Apr', submitted: 8,  total: 8,  toMark: 3,  status: 'marking'   },
  { title: 'Calculus: Differentiation Basics',  class: 'Yr 12 Group A', due: '24 Apr', submitted: 4,  total: 5,  toMark: 4,  status: 'marking'   },
  { title: 'Trigonometry: Sine & Cosine Rules', class: 'Yr 11 Group B', due: '27 Apr', submitted: 2,  total: 7,  toMark: 0,  status: 'open'      },
  { title: 'Statistics: Probability Trees',     class: 'Yr 10 Group A', due: '29 Apr', submitted: 0,  total: 8,  toMark: 0,  status: 'open'      },
  { title: 'Vectors: Magnitude & Direction',    class: 'Yr 13 Group A', due: '30 Apr', submitted: 1,  total: 4,  toMark: 1,  status: 'marking'   },
  { title: 'Number: Surds & Indices',           class: 'Yr 9 Group C',  due: '02 May', submitted: 0,  total: 9,  toMark: 0,  status: 'open'      },
];

const studentProgress = [
  { name: 'Emma Thompson',    scores: [72, 76, 74, 80, 83], predicted: 'B',  trend: 'up'   },
  { name: 'Oliver Chen',      scores: [88, 90, 87, 92, 94], predicted: 'A*', trend: 'up'   },
  { name: 'Sophia Patel',     scores: [65, 63, 68, 66, 70], predicted: 'C',  trend: 'up'   },
  { name: 'James Wilson',     scores: [79, 75, 72, 71, 69], predicted: 'B',  trend: 'down' },
  { name: 'Amelia Roberts',   scores: [55, 50, 48, 52, 49], predicted: 'D',  trend: 'down' },
  { name: 'Noah Fitzgerald',  scores: [70, 68, 60, 55, 52], predicted: 'D',  trend: 'down' },
  { name: 'Isabella Martinez',scores: [82, 85, 88, 90, 91], predicted: 'A',  trend: 'up'   },
  { name: 'Ethan Huang',      scores: [77, 79, 80, 78, 83], predicted: 'B',  trend: 'up'   },
  { name: 'Maya Choudhury',   scores: [60, 58, 64, 67, 71], predicted: 'C',  trend: 'up'   },
  { name: 'Daniel Owusu',     scores: [74, 70, 66, 63, 61], predicted: 'C',  trend: 'down' },
  { name: 'Freya Lindqvist',  scores: [90, 86, 84, 80, 76], predicted: 'B',  trend: 'down' },
  { name: 'Aisha Rahman',     scores: [68, 72, 75, 79, 82], predicted: 'B',  trend: 'up'   },
  { name: 'Ryan Mitchell',    scores: [66, 70, 72, 73, 74], predicted: 'C',  trend: 'up'   },
  { name: 'Grace Adeyemi',    scores: [78, 80, 81, 82, 83], predicted: 'B',  trend: 'up'   },
  { name: 'Toby Grant',       scores: [83, 82, 80, 81, 81], predicted: 'B',  trend: 'flat' },
  { name: 'Ananya Iyer',      scores: [86, 88, 89, 90, 90], predicted: 'A*', trend: 'up'   },
  { name: 'Oscar Whitfield',  scores: [64, 61, 60, 58, 59], predicted: 'D',  trend: 'down' },
];

const attendanceClass = {
  group: 'Year 11 – Group B',
  subject: 'GCSE Mathematics',
  students: [
    { name: 'Emma Thompson',  status: 'present' },
    { name: 'Oliver Chen',    status: 'present' },
    { name: 'Sophia Patel',   status: null },
    { name: 'James Wilson',   status: null },
    { name: 'Amelia Roberts', status: 'absent' },
    { name: 'Noah Fitzgerald',status: null },
    { name: 'Ethan Huang',    status: null },
  ],
};

// Expose on window for the teacher-metrics selector layer (teacherMetrics.jsx) —
// Babel-standalone top-level consts are lexical globals, not window properties.
Object.assign(window, { todaySchedule, homeworkItems, studentProgress, attendanceClass });
