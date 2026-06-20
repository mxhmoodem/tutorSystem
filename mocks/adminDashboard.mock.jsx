// ══════════════════════════════════════════════════════════════
//  Mock data — Admin Dashboard
//  Loaded as a global script before AdminDashboard.jsx (see index.html).
//  Depends on DS (from shared.jsx) for accent colours.
// ══════════════════════════════════════════════════════════════

const atRiskStudents = [
  { name: 'Noah Fitzgerald',   subject: 'Mathematics',        reason: '3 consecutive absences',       lastSeen: '8 Apr',  severity: 'danger'  },
  { name: 'Amelia Roberts',    subject: 'English Literature', reason: 'Homework completion below 35%', lastSeen: '14 Apr', severity: 'danger'  },
  { name: 'Liam Thornton',     subject: 'Science',            reason: 'Test score dropped 22 pts',     lastSeen: '17 Apr', severity: 'warning' },
  { name: 'Zoe Patterson',     subject: 'Chemistry',          reason: 'No submissions in 2 weeks',     lastSeen: '10 Apr', severity: 'warning' },
  { name: 'Isaac Okafor',      subject: 'Mathematics',        reason: 'Engagement score: Low',         lastSeen: '21 Apr', severity: 'warning' },
  { name: 'Maya Choudhury',    subject: 'Physics',            reason: '4 late submissions in a row',   lastSeen: '19 Apr', severity: 'warning' },
  { name: 'Daniel Owusu',      subject: 'Biology',            reason: 'Attendance below 60%',          lastSeen: '6 Apr',  severity: 'danger'  },
  { name: 'Freya Lindqvist',   subject: 'Further Maths',      reason: 'Mock exam grade fell to U',      lastSeen: '20 Apr', severity: 'danger'  },
  { name: 'Oliver Bennett',    subject: 'History',            reason: 'Engagement score: Low',         lastSeen: '12 Apr', severity: 'warning' },
  { name: 'Priya Nair',        subject: 'Computer Science',   reason: 'Missed 2 assessments',          lastSeen: '15 Apr', severity: 'warning' },
];

const revenueData = {
  labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { label: 'Revenue (£)', data: [7600, 8200, 9400, 8800, 10200, 11500, 12400, 13100], color: DS.accent },
    { label: 'Enrolments',  data: [91, 98, 107, 103, 118, 131, 142, 149],                color: '#0891B2' },
  ],
};

const recentActivity = [
  { type: 'enrol',   text: 'Sophia Patel enrolled in GCSE Maths',           time: '2h ago'    },
  { type: 'invoice', text: 'Invoice #INV-0284 sent to Williams family',     time: '4h ago'    },
  { type: 'alert',   text: 'Noah Fitzgerald flagged as at-risk',            time: '6h ago'    },
  { type: 'enrol',   text: 'James Wilson enrolled in A-Level Chemistry',    time: 'Yesterday' },
  { type: 'invoice', text: 'Invoice #INV-0283 paid — £320',                 time: 'Yesterday' },
  { type: 'enrol',   text: 'Aisha Rahman enrolled in GCSE Biology',         time: 'Yesterday' },
  { type: 'alert',   text: 'HW completion for Yr 11 dropped below 70%',     time: '2d ago'    },
  { type: 'invoice', text: 'Invoice #INV-0282 sent to Okafor family',       time: '2d ago'    },
  { type: 'enrol',   text: 'Thomas Hughes enrolled in A-Level Physics',     time: '3d ago'    },
  { type: 'invoice', text: 'Invoice #INV-0281 paid — £480',                 time: '3d ago'    },
];
