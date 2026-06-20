// ══════════════════════════════════════════════════════════════
//  Mock data — SuperAdmin (Platform Owner) Dashboard
//  Loaded as a global script before SuperAdmin.jsx (see index.html).
// ══════════════════════════════════════════════════════════════

const SA_CENTRES = [
  { name: 'Bright Minds Tuition',   owner: 'Lisa Chen',          plan: 'Scale',      mrr: 1240, students: 142, teachers: 8,  status: 'active',    joined: 'Aug 2024', country: 'UK', city: 'London',     usage: 94, churnRisk: 'low'    },
  { name: 'Apex Learning Centre',   owner: 'Daniel Mehta',       plan: 'Scale',      mrr: 1240, students: 198, teachers: 11, status: 'active',    joined: 'Jun 2024', country: 'UK', city: 'Manchester', usage: 88, churnRisk: 'low'    },
  { name: 'Summit Academy',        owner: 'Helen Yoo',          plan: 'Growth',     mrr: 480,  students: 76,  teachers: 5,  status: 'active',    joined: 'Nov 2024', country: 'UK', city: 'Birmingham', usage: 71, churnRisk: 'med'    },
  { name: 'Kingsway Tutors',       owner: 'Marcus Webb',        plan: 'Growth',     mrr: 480,  students: 68,  teachers: 4,  status: 'active',    joined: 'Jan 2025', country: 'UK', city: 'Leeds',      usage: 82, churnRisk: 'low'    },
  { name: 'EduFirst',              owner: 'Priya Nair',         plan: 'Starter',    mrr: 180,  students: 32,  teachers: 2,  status: 'active',    joined: 'Feb 2025', country: 'UK', city: 'Bristol',    usage: 64, churnRisk: 'med'    },
  { name: 'Acorn Study Centre',    owner: 'David Park',         plan: 'Starter',    mrr: 180,  students: 24,  teachers: 2,  status: 'active',    joined: 'Mar 2025', country: 'UK', city: 'Cardiff',    usage: 41, churnRisk: 'high'   },
  { name: 'Pinnacle Prep',         owner: 'Jonathan Reeves',    plan: 'Scale',      mrr: 1240, students: 167, teachers: 9,  status: 'active',    joined: 'May 2024', country: 'IE', city: 'Dublin',     usage: 92, churnRisk: 'low'    },
  { name: 'NorthStar Tuition',     owner: 'Aisha Begum',        plan: 'Growth',     mrr: 480,  students: 89,  teachers: 6,  status: 'active',    joined: 'Sep 2024', country: 'UK', city: 'Edinburgh',  usage: 79, churnRisk: 'low'    },
  { name: 'BrightPath Learning',   owner: 'Carlos Rivera',      plan: 'Growth',     mrr: 480,  students: 54,  teachers: 4,  status: 'trial',     joined: 'Apr 2026', country: 'ES', city: 'Madrid',     usage: 22, churnRisk: 'med'    },
  { name: 'Mind & Method',         owner: 'Sofia Andersson',    plan: 'Scale',      mrr: 1240, students: 134, teachers: 7,  status: 'active',    joined: 'Jul 2024', country: 'SE', city: 'Stockholm',  usage: 86, churnRisk: 'low'    },
  { name: 'Elite Academy',         owner: 'Faisal Ahmed',       plan: 'Growth',     mrr: 480,  students: 47,  teachers: 3,  status: 'past_due',  joined: 'Dec 2024', country: 'AE', city: 'Dubai',      usage: 18, churnRisk: 'high'   },
  { name: 'Lumen Tutors',          owner: 'Beatrice Schmidt',   plan: 'Starter',    mrr: 180,  students: 19,  teachers: 1,  status: 'suspended', joined: 'Oct 2024', country: 'DE', city: 'Berlin',     usage: 0,  churnRisk: 'high'   },
  { name: 'Scholar Hub',           owner: 'Grace Okonkwo',      plan: 'Scale',      mrr: 1240, students: 176, teachers: 10, status: 'active',    joined: 'Mar 2024', country: 'UK', city: 'Glasgow',    usage: 90, churnRisk: 'low'    },
  { name: 'Athena Learning',       owner: 'Nikos Pappas',       plan: 'Growth',     mrr: 480,  students: 61,  teachers: 4,  status: 'active',    joined: 'Feb 2025', country: 'GR', city: 'Athens',     usage: 68, churnRisk: 'med'    },
  { name: 'NextStep Academy',      owner: 'Ravi Sharma',        plan: 'Starter',    mrr: 180,  students: 28,  teachers: 2,  status: 'trial',     joined: 'May 2026', country: 'UK', city: 'Sheffield',  usage: 35, churnRisk: 'med'    },
  { name: 'Aurora Tuition',        owner: 'Emilie Laurent',     plan: 'Growth',     mrr: 480,  students: 73,  teachers: 5,  status: 'active',    joined: 'Oct 2024', country: 'FR', city: 'Paris',      usage: 77, churnRisk: 'low'    },
];

const SA_USERS = [
  { name: 'Marcus Hale',      email: 'marcus@tutoros.io',          role: 'superadmin', centre: '—',                       status: 'active',    lastSeen: 'Now',         joined: 'May 2024', mfa: true  },
  { name: 'Lisa Chen',        email: 'lisa@brightminds.co.uk',     role: 'admin',      centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '2m ago',      joined: 'Aug 2024', mfa: true  },
  { name: 'Sarah Clarke',     email: 'sarah.c@brightminds.co.uk',  role: 'teacher',    centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '12m ago',     joined: 'Sep 2024', mfa: true  },
  { name: 'Daniel Mehta',     email: 'd.mehta@apex.uk',            role: 'admin',      centre: 'Apex Learning Centre',    status: 'active',    lastSeen: '1h ago',      joined: 'Jun 2024', mfa: false },
  { name: 'Oliver Chen',      email: 'oliver.c@brightminds.co.uk', role: 'student',    centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '3h ago',      joined: 'Sep 2024', mfa: false },
  { name: 'Helen Yoo',        email: 'helen@summit.ac.uk',         role: 'admin',      centre: 'Summit Academy',          status: 'active',    lastSeen: 'Yesterday',   joined: 'Nov 2024', mfa: true  },
  { name: 'Beatrice Schmidt', email: 'b@lumen.de',                 role: 'admin',      centre: 'Lumen Tutors',            status: 'suspended', lastSeen: '23 days ago', joined: 'Oct 2024', mfa: false },
  { name: 'Priya Nair',       email: 'priya@edufirst.uk',          role: 'admin',      centre: 'EduFirst',                status: 'active',    lastSeen: '4h ago',      joined: 'Feb 2025', mfa: true  },
  { name: 'Faisal Ahmed',     email: 'faisal@elite.ae',            role: 'admin',      centre: 'Elite Academy',           status: 'locked',    lastSeen: '2 days ago',  joined: 'Dec 2024', mfa: false },
  { name: 'Grace Okonkwo',    email: 'grace@scholarhub.uk',        role: 'admin',      centre: 'Scholar Hub',             status: 'active',    lastSeen: '20m ago',     joined: 'Mar 2024', mfa: true  },
  { name: 'David Park',       email: 'd.park@brightminds.co.uk',   role: 'teacher',    centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '40m ago',     joined: 'Sep 2024', mfa: true  },
  { name: 'Emilie Laurent',   email: 'emilie@aurora.fr',           role: 'admin',      centre: 'Aurora Tuition',          status: 'active',    lastSeen: '5h ago',      joined: 'Oct 2024', mfa: true  },
  { name: 'Ravi Sharma',      email: 'ravi@nextstep.uk',           role: 'admin',      centre: 'NextStep Academy',        status: 'active',    lastSeen: '1d ago',      joined: 'May 2026', mfa: false },
];

const SA_REVENUE_TREND = {
  labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { label: 'MRR (£)',     data: [4180, 4520, 4820, 5240, 5680, 6120, 6450, 6920], color: '#7C3AED' },
    { label: 'New centres', data: [3, 1, 2, 3, 2, 4, 3, 5],                          color: '#0891B2' },
  ],
};

const SA_USER_GROWTH = {
  labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { label: 'Total users', data: [712, 778, 842, 968, 1124, 1287, 1456, 1623], color: '#0891B2' },
    { label: 'DAU',         data: [268, 291, 312, 358, 421, 487, 542, 612],     color: '#16A34A' },
  ],
};

const SA_ACTIVITY = [
  { type: 'signup',   text: 'New centre "BrightPath Learning" started Growth trial',                 time: '14m ago',  severity: 'info'    },
  { type: 'upgrade',  text: 'Apex Learning Centre upgraded from Growth → Scale',                     time: '2h ago',   severity: 'success' },
  { type: 'payment',  text: 'Payment failed: Elite Academy (£480, retry in 3 days)',                 time: '4h ago',   severity: 'warning' },
  { type: 'signup',   text: 'New admin user registered at Pinnacle Prep',                            time: '6h ago',   severity: 'info'    },
  { type: 'flag',     text: 'Suspicious login attempt blocked for faisal@elite.ae (12 attempts)',    time: '8h ago',   severity: 'danger'  },
  { type: 'cancel',   text: 'Lumen Tutors suspended (non-payment, 23 days overdue)',                 time: 'Yesterday', severity: 'danger' },
  { type: 'support',  text: 'New support ticket #4821 — "Cannot import student CSV"',                time: 'Yesterday', severity: 'info'   },
  { type: 'upgrade',  text: 'Bright Minds Tuition added 14 new student seats',                       time: '2 days ago', severity: 'success'},
  { type: 'signup',   text: 'New centre "NextStep Academy" started Starter trial',                   time: '2 days ago', severity: 'info'   },
  { type: 'upgrade',  text: 'Scholar Hub renewed annual Scale contract (£14,880)',                   time: '3 days ago', severity: 'success'},
];

const SA_FEATURE_USAGE = [
  { feature: 'Lesson Planner',  pct: 87, trend: '+4%',  color: '#7C3AED' },
  { feature: 'AI Feedback',     pct: 73, trend: '+12%', color: '#0891B2' },
  { feature: 'Homework System', pct: 91, trend: '+1%',  color: '#16A34A' },
  { feature: 'Progress Reports',pct: 64, trend: '+8%',  color: '#D97706' },
  { feature: 'Parent Portal',   pct: 52, trend: '-3%',  color: '#DB2777' },
  { feature: 'Tracking',        pct: 41, trend: '+6%',  color: '#0D9488' },
  { feature: 'Attendance',      pct: 96, trend: '+2%',  color: '#2563EB' },
  { feature: 'Invoicing',       pct: 69, trend: '+5%',  color: '#DC2626' },
];

const SA_GEOGRAPHIC = [
  { country: 'United Kingdom', flag: '🇬🇧', centres: 10, users: 1308, revenue: 5760 },
  { country: 'Ireland',        flag: '🇮🇪', centres: 1, users: 167,  revenue: 1240 },
  { country: 'Sweden',         flag: '🇸🇪', centres: 1, users: 134,  revenue: 1240 },
  { country: 'France',         flag: '🇫🇷', centres: 1, users: 73,   revenue: 480  },
  { country: 'Greece',         flag: '🇬🇷', centres: 1, users: 61,   revenue: 480  },
  { country: 'Spain',          flag: '🇪🇸', centres: 1, users: 54,   revenue: 480  },
  { country: 'Germany',        flag: '🇩🇪', centres: 1, users: 19,   revenue: 0    },
  { country: 'UAE',            flag: '🇦🇪', centres: 1, users: 47,   revenue: 0    },
];

const SA_DEVICE = [
  { device: 'Desktop', pct: 58, color: '#7C3AED' },
  { device: 'Mobile',  pct: 31, color: '#0891B2' },
  { device: 'Tablet',  pct: 11, color: '#0D9488' },
];

const SA_TICKETS = [
  { id: '#4821', subject: 'Cannot import student CSV', centre: 'Apex Learning Centre',  priority: 'high',   status: 'open',     opened: '4h ago',  assignee: 'Marcus H.' },
  { id: '#4820', subject: 'Stripe webhook timing out', centre: 'Bright Minds Tuition',  priority: 'urgent', status: 'open',     opened: '8h ago',  assignee: 'Marcus H.' },
  { id: '#4819', subject: 'Question about Scale plan', centre: 'Summit Academy',        priority: 'low',    status: 'pending',  opened: '1d ago',  assignee: 'Support'   },
  { id: '#4818', subject: 'Bulk export request',       centre: 'Pinnacle Prep',         priority: 'med',    status: 'open',     opened: '1d ago',  assignee: 'Marcus H.' },
  { id: '#4817', subject: 'AI feedback rate limit',    centre: 'Mind & Method',         priority: 'med',    status: 'resolved', opened: '2d ago',  assignee: 'Support'   },
  { id: '#4816', subject: 'GDPR export request',       centre: 'EduFirst',              priority: 'high',   status: 'pending',  opened: '3d ago',  assignee: 'Compliance'},
  { id: '#4815', subject: 'SSO setup for Google Workspace', centre: 'Scholar Hub',      priority: 'med',    status: 'open',     opened: '3d ago',  assignee: 'Marcus H.' },
  { id: '#4814', subject: 'Invoice currency wrong (EUR vs GBP)', centre: 'Aurora Tuition', priority: 'high', status: 'resolved', opened: '4d ago', assignee: 'Support'   },
];

const SA_AUDIT = [
  { actor: 'Marcus Hale',   action: 'Suspended centre "Lumen Tutors"',         target: 'Lumen Tutors',         time: '2h ago',   ip: '82.14.21.5'  },
  { actor: 'Marcus Hale',   action: 'Toggled feature flag "ai_feedback_v2"',   target: 'Global',               time: '5h ago',   ip: '82.14.21.5'  },
  { actor: 'System',        action: 'Auto-locked account after 12 failures',   target: 'faisal@elite.ae',      time: '8h ago',   ip: 'auto'        },
  { actor: 'Marcus Hale',   action: 'Granted Scale plan trial extension',     target: 'BrightPath Learning',   time: 'Yesterday', ip: '82.14.21.5' },
  { actor: 'Lisa Chen',     action: 'Bulk-exported 142 student records',       target: 'Bright Minds Tuition', time: 'Yesterday', ip: '92.40.118.3'},
  { actor: 'Marcus Hale',   action: 'Edited pricing plan "Growth"',            target: 'Plans',                time: '2 days ago', ip: '82.14.21.5'},
  { actor: 'Daniel Mehta',  action: 'Invited 3 new teachers',                  target: 'Apex Learning Centre', time: '2 days ago', ip: '203.0.45.9'},
  { actor: 'Grace Okonkwo', action: 'Enabled SSO (Google Workspace)',          target: 'Scholar Hub',          time: '3 days ago', ip: '88.97.12.40'},
  { actor: 'System',        action: 'Nightly backup completed (all tenants)',  target: 'Global',               time: '3 days ago', ip: 'auto'        },
];

const SA_FLAGS = [
  { id: 'ai_feedback_v2',     desc: 'New AI feedback model (Claude Opus 4.8)', on: true,  scope: 'global',         coverage: '100%' },
  { id: 'lesson_planner_beta',desc: 'Drag-and-drop lesson planner v2',       on: true,  scope: 'opt-in',         coverage: '34%'  },
  { id: 'parent_payments',    desc: 'Parents pay invoices in-app',           on: false, scope: 'Scale only',     coverage: '0%'   },
  { id: 'multi_currency',     desc: 'Currency support beyond GBP',           on: true,  scope: 'global',         coverage: '100%' },
  { id: 'gradebook_export',   desc: 'Excel gradebook export',                on: true,  scope: 'global',         coverage: '100%' },
  { id: 'hw_ai_grading',      desc: 'Auto-grade homework with AI',           on: false, scope: 'beta cohort',    coverage: '8%'   },
  { id: 'realtime_chat',      desc: 'In-app teacher ↔ student chat',         on: false, scope: 'opt-in',         coverage: '12%'  },
  { id: 'mobile_offline',     desc: 'Offline homework on mobile app',        on: true,  scope: 'beta cohort',    coverage: '21%'  },
];
