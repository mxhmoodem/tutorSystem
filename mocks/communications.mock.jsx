// ══════════════════════════════════════════════════════════════
//  Mock data — Communications (Announcements + Messages/threads)
//  Loaded as a global script before Communications.jsx (see index.html).
//
//  Seeds the localStorage comms store (tutoros.comms.v1). Everything is
//  multi-tenant: users/announcements/threads carry a `centreId` and the
//  store filters every read by the active user's centre (superadmin only
//  sees across centres). `COMMS_SELF` maps the active role → demo userId.
// ══════════════════════════════════════════════════════════════

// ─── Centres ─────────────────────────────────────────────────────────────────────
// `bm` = Bright Minds Tuition (the centre every other persona lives in — see
// SA_USERS / SEED_TEACHERS). `apex` exists only to prove tenant isolation: a
// Bright Minds teacher must never see Apex content.
const COMMS_CENTRES = [
  { id: 'bm',   name: 'Bright Minds Tuition' },
  { id: 'apex', name: 'Apex Learning Centre' },
];

// ─── Users ─────────────────────────────────────────────────────────────────────
// classIds let teacher/class targeting and teacher↔student DM scoping resolve to
// concrete people. Reconciled with SEED_TEACHERS / SEED_STUDENTS / SA_USERS.
const COMMS_USERS = [
  // Platform owner — no centre (sees everything)
  { id: 'u_marcus', name: 'Marcus Hale',  role: 'superadmin', centreId: null,   classIds: [] },

  // ── Bright Minds Tuition ──
  { id: 'u_lisa',   name: 'Lisa Chen',    role: 'admin',   centreId: 'bm',   classIds: [] },
  { id: 'u_sarah',  name: 'Sarah Clarke', role: 'teacher', centreId: 'bm',   classIds: ['c1','c2','c3','c4'] },
  { id: 'u_david',  name: 'David Park',   role: 'teacher', centreId: 'bm',   classIds: ['c7','c13','c20','c31'] },
  { id: 'u_priya',  name: 'Priya Nair',   role: 'teacher', centreId: 'bm',   classIds: ['c5','c6'] },
  { id: 'u_marcusw',name: 'Marcus Webb',  role: 'teacher', centreId: 'bm',   classIds: ['c8','c23'] },
  { id: 'u_oliver', name: 'Oliver Chen',  role: 'student', centreId: 'bm',   classIds: ['c3'] },
  { id: 'u_emma',   name: 'Emma Thompson',role: 'student', centreId: 'bm',   classIds: ['c1','c8'] },
  { id: 'u_sophia', name: 'Sophia Patel', role: 'student', centreId: 'bm',   classIds: ['c1'] },

  // ── Apex Learning Centre (isolation proof — should never surface for bm users) ──
  { id: 'u_daniel', name: 'Daniel Mehta', role: 'admin',   centreId: 'apex', classIds: [] },
  { id: 'u_apexT',  name: 'Hannah Bell',  role: 'teacher', centreId: 'apex', classIds: ['ax1'] },
];

// The logged-in demo identity for each role (active centre is derived from the user).
const COMMS_SELF = {
  superadmin: 'u_marcus',
  admin:      'u_lisa',
  teacher:    'u_sarah',
  student:    'u_oliver',
};

// ─── Relative timestamps (anchored near the app's "today" = 2026-06-18) ──────────
const _now = new Date('2026-06-18T09:30:00Z').getTime();
const _ago = (mins) => new Date(_now - mins * 60000).toISOString();
const MIN = 1, HOUR = 60, DAY = 1440;

// ─── Announcements ───────────────────────────────────────────────────────────────
const COMMS_ANNOUNCEMENTS = [
  {
    id: 'an_platform_maint',
    scope: 'platform', centreId: null, classId: null,
    authorId: 'u_marcus', authorName: 'Marcus Hale', authorRole: 'superadmin',
    audience: { centreIds: 'all', roles: 'all', classIds: [] },
    title: 'Scheduled maintenance — Sunday 02:00–04:00 BST',
    body: 'TutorOS will be briefly unavailable during a platform upgrade this Sunday. No action needed — homework and reports already submitted are safe.',
    priority: 'important', pinned: true, requiresAck: false,
    createdAt: _ago(2 * DAY), expiresAt: null,
    reads: { u_lisa: _ago(2 * DAY - 30), u_daniel: _ago(2 * DAY - 90) }, acks: {},
  },
  {
    id: 'an_bm_inset',
    scope: 'centre', centreId: 'bm', classId: null,
    authorId: 'u_lisa', authorName: 'Lisa Chen', authorRole: 'admin',
    audience: { centreIds: ['bm'], roles: ['teacher'], classIds: [] },
    title: 'INSET day reminder — Friday 27 June',
    body: 'All teaching staff: the centre is closed to students on Friday 27 June for our summer-term INSET. Please confirm you have read this so I can finalise the room plan.',
    priority: 'important', pinned: false, requiresAck: true,
    createdAt: _ago(1 * DAY), expiresAt: '2026-06-27',
    reads: { u_sarah: _ago(1 * DAY - 20), u_david: _ago(1 * DAY - 60) },
    acks:  { u_david: _ago(1 * DAY - 55) },
  },
  {
    id: 'an_bm_fees',
    scope: 'centre', centreId: 'bm', classId: null,
    authorId: 'u_lisa', authorName: 'Lisa Chen', authorRole: 'admin',
    audience: { centreIds: ['bm'], roles: 'all', classIds: [] },
    title: 'Summer-term invoices now available',
    body: 'Summer-term invoices have gone out. Parents can view and pay from the portal. Any queries, drop me a message.',
    priority: 'normal', pinned: false, requiresAck: false,
    createdAt: _ago(8 * HOUR), expiresAt: null,
    reads: { u_sarah: _ago(7 * HOUR) }, acks: {},
  },
  {
    id: 'an_bm_safeguarding',
    scope: 'centre', centreId: 'bm', classId: null,
    authorId: 'u_lisa', authorName: 'Lisa Chen', authorRole: 'admin',
    audience: { centreIds: ['bm'], roles: ['teacher'], classIds: [] },
    title: 'URGENT: Updated safeguarding policy — acknowledge today',
    body: 'Our safeguarding policy has been updated following the latest LA guidance. All staff must read and acknowledge before teaching tomorrow. Printed copies are in the staff room.',
    priority: 'urgent', pinned: false, requiresAck: true,
    createdAt: _ago(3 * HOUR), expiresAt: null,
    reads: {}, acks: {},
  },
  {
    id: 'an_class_mock',
    scope: 'class', centreId: 'bm', classId: 'c3',
    authorId: 'u_sarah', authorName: 'Sarah Clarke', authorRole: 'teacher',
    audience: { centreIds: ['bm'], roles: ['student'], classIds: ['c3'] },
    title: 'A-Level Maths mock — bring a calculator Friday',
    body: 'Reminder for Year 12 Group A: your end-of-unit mock is this Friday in Room 5. Bring a calculator and the formula booklet. We will review the integration topics on Wednesday.',
    priority: 'normal', pinned: false, requiresAck: false,
    createdAt: _ago(5 * HOUR), expiresAt: null,
    reads: {}, acks: {},
  },
  // Apex-scoped — Bright Minds users must never see this.
  {
    id: 'an_apex_only',
    scope: 'centre', centreId: 'apex', classId: null,
    authorId: 'u_daniel', authorName: 'Daniel Mehta', authorRole: 'admin',
    audience: { centreIds: ['apex'], roles: 'all', classIds: [] },
    title: 'Apex — new timetable live',
    body: 'The autumn timetable is now published in your dashboards.',
    priority: 'normal', pinned: false, requiresAck: false,
    createdAt: _ago(6 * HOUR), expiresAt: null,
    reads: {}, acks: {},
  },
];

// ─── Threads ─────────────────────────────────────────────────────────────────────
const COMMS_THREADS = [
  {
    id: 'th_staffroom', centreId: 'bm', type: 'group',
    participants: ['u_lisa', 'u_sarah', 'u_david', 'u_priya', 'u_marcusw'],
    classId: null, subject: 'Staff Room',
    createdBy: 'u_lisa', createdAt: _ago(30 * DAY), lastMessageAt: _ago(40 * MIN),
  },
  {
    id: 'th_sarah_david', centreId: 'bm', type: 'dm',
    participants: ['u_sarah', 'u_david'], classId: null, subject: null,
    createdBy: 'u_sarah', createdAt: _ago(3 * DAY), lastMessageAt: _ago(2 * HOUR),
  },
  {
    id: 'th_sarah_lisa', centreId: 'bm', type: 'dm',
    participants: ['u_sarah', 'u_lisa'], classId: null, subject: null,
    createdBy: 'u_lisa', createdAt: _ago(5 * DAY), lastMessageAt: _ago(1 * DAY),
  },
  {
    id: 'th_sarah_oliver', centreId: 'bm', type: 'dm',
    participants: ['u_sarah', 'u_oliver'], classId: null, subject: null,
    createdBy: 'u_oliver', createdAt: _ago(2 * DAY), lastMessageAt: _ago(20 * MIN),
  },
  // Apex DM — isolation proof.
  {
    id: 'th_apex', centreId: 'apex', type: 'dm',
    participants: ['u_daniel', 'u_apexT'], classId: null, subject: null,
    createdBy: 'u_daniel', createdAt: _ago(4 * DAY), lastMessageAt: _ago(3 * HOUR),
  },
];

// ─── Messages ────────────────────────────────────────────────────────────────────
const COMMS_MESSAGES = [
  // Staff Room
  { id: 'm_sr1', threadId: 'th_staffroom', senderId: 'u_lisa',  senderName: 'Lisa Chen',    senderRole: 'admin',
    body: 'Morning all — could everyone confirm their availability for the INSET day by end of week? 🙏', attachments: [],
    createdAt: _ago(6 * HOUR), readBy: { u_lisa: _ago(6 * HOUR), u_sarah: _ago(5 * HOUR), u_david: _ago(4 * HOUR) } },
  { id: 'm_sr2', threadId: 'th_staffroom', senderId: 'u_david', senderName: 'David Park',   senderRole: 'teacher',
    body: 'All good for me. I can take the science lab walkthrough in the afternoon.', attachments: [],
    createdAt: _ago(4 * HOUR), readBy: { u_david: _ago(4 * HOUR), u_lisa: _ago(3 * HOUR), u_sarah: _ago(3 * HOUR) } },
  { id: 'm_sr3', threadId: 'th_staffroom', senderId: 'u_priya', senderName: 'Priya Nair',   senderRole: 'teacher',
    body: 'Same here. Quick one — are we keeping Room 6 for the GCSE intervention group?', attachments: [],
    createdAt: _ago(40 * MIN), readBy: { u_priya: _ago(40 * MIN) } },

  // Sarah ↔ David
  { id: 'm_sd1', threadId: 'th_sarah_david', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: 'Hi David — do you have the Year 12 mark scheme for the joint mock? Want to keep our grading consistent.', attachments: [],
    createdAt: _ago(3 * HOUR), readBy: { u_sarah: _ago(3 * HOUR), u_david: _ago(2 * HOUR + 30) } },
  { id: 'm_sd2', threadId: 'th_sarah_david', senderId: 'u_david', senderName: 'David Park', senderRole: 'teacher',
    body: 'Yep, sending it over now. I added a row for the new integration question.', attachments: [],
    createdAt: _ago(2 * HOUR), readBy: { u_david: _ago(2 * HOUR) } },

  // Sarah ↔ Lisa
  { id: 'm_sl1', threadId: 'th_sarah_lisa', senderId: 'u_lisa', senderName: 'Lisa Chen', senderRole: 'admin',
    body: 'Sarah, the parents of Year 12 Group A asked about predicted grades — could you draft something this week?', attachments: [],
    createdAt: _ago(1 * DAY + 2 * HOUR), readBy: { u_lisa: _ago(1 * DAY + 2 * HOUR), u_sarah: _ago(1 * DAY + 1 * HOUR) } },
  { id: 'm_sl2', threadId: 'th_sarah_lisa', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: 'Will do — I should have draft reports ready by Thursday.', attachments: [],
    createdAt: _ago(1 * DAY), readBy: { u_sarah: _ago(1 * DAY), u_lisa: _ago(23 * HOUR) } },

  // Sarah ↔ Oliver (teacher ↔ own student)
  { id: 'm_so1', threadId: 'th_sarah_oliver', senderId: 'u_oliver', senderName: 'Oliver Chen', senderRole: 'student',
    body: 'Hi Miss, I had a question about Q4 on the integration sheet — I keep getting a negative area. Could you take a look?', attachments: [],
    createdAt: _ago(20 * MIN), readBy: { u_oliver: _ago(20 * MIN) } },

  // Apex — isolation proof
  { id: 'm_ax1', threadId: 'th_apex', senderId: 'u_daniel', senderName: 'Daniel Mehta', senderRole: 'admin',
    body: 'Hannah, can you cover the Friday slot?', attachments: [],
    createdAt: _ago(3 * HOUR), readBy: { u_daniel: _ago(3 * HOUR) } },
];
