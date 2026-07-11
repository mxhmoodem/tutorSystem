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
  { id: 'u_emma',   name: 'Emma Thompson',role: 'student', centreId: 'bm',   classIds: ['c1','c2'] },
  { id: 'u_sophia', name: 'Sophia Patel', role: 'student', centreId: 'bm',   classIds: ['c1','c2'] },
  // Students wired into David Park's physics classes (c13) + Sarah's Yr 11 Maths
  // group B (c2) so the message channels + safeguarding flag queue populate.
  { id: 'u_aiden',  name: 'Aiden Foster', role: 'student', centreId: 'bm',   classIds: ['c13'] },
  { id: 'u_james',  name: 'James Wilson', role: 'student', centreId: 'bm',   classIds: ['c2','c13'] },
  { id: 'u_mia',    name: 'Mia Okonkwo',  role: 'student', centreId: 'bm',   classIds: ['c2'] },

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
    body: 'Klasio will be briefly unavailable during a platform upgrade this Sunday. No action needed — homework and reports already submitted are safe.',
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
    // §5: Klasio invoicing is ledger-only (payments are external), and payment/
    // invoice lines never appear on the student surface — retargeted to staff only
    // and reworded to drop the "view and pay from the portal" capture language.
    audience: { centreIds: ['bm'], roles: ['admin', 'teacher'], classIds: [] },
    title: 'Summer-term invoices issued',
    body: 'Summer-term invoices have been issued to guardians. Any billing queries, drop me a message.',
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

  // ── Class channels (group teaching threads — always monitored) ──
  {
    id: 'th_chan_c2', centreId: 'bm', type: 'channel',
    participants: ['u_sarah', 'u_emma', 'u_james', 'u_sophia', 'u_mia'],
    classId: 'c2', subject: 'Yr 11 GCSE Maths · Group B',
    createdBy: 'u_sarah', createdAt: _ago(40 * DAY), lastMessageAt: _ago(2 * HOUR + 20),
  },
  {
    id: 'th_chan_c13', centreId: 'bm', type: 'channel',
    participants: ['u_david', 'u_aiden', 'u_james'],
    classId: 'c13', subject: 'A-Level Physics · Year 13',
    createdBy: 'u_david', createdAt: _ago(35 * DAY), lastMessageAt: _ago(1 * DAY),
  },

  // ── Staff ↔ student DMs (monitored; some carry safeguarding triggers) ──
  {
    id: 'th_aiden_david', centreId: 'bm', type: 'dm',
    participants: ['u_aiden', 'u_david'], classId: null, subject: null,
    createdBy: 'u_aiden', createdAt: _ago(2 * DAY), lastMessageAt: _ago(1 * DAY),
  },
  {
    id: 'th_mia_sarah', centreId: 'bm', type: 'dm',
    participants: ['u_mia', 'u_sarah'], classId: null, subject: null,
    createdBy: 'u_mia', createdAt: _ago(2 * DAY), lastMessageAt: _ago(1 * DAY),
  },
  {
    id: 'th_james_david', centreId: 'bm', type: 'dm',
    participants: ['u_james', 'u_david'], classId: null, subject: null,
    createdBy: 'u_james', createdAt: _ago(20 * HOUR), lastMessageAt: _ago(20 * HOUR),
  },
  {
    id: 'th_sophia_sarah', centreId: 'bm', type: 'dm',
    participants: ['u_sophia', 'u_sarah'], classId: null, subject: null,
    createdBy: 'u_sophia', createdAt: _ago(3 * DAY), lastMessageAt: _ago(3 * DAY - 1),
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

  // ── Class channel: Yr 11 GCSE Maths · Group B (c2) ──
  { id: 'm_c2_1', threadId: 'th_chan_c2', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: 'Morning everyone — Worksheet 4B (simultaneous equations) is set for Friday. Sections A and B only.', attachments: [],
    createdAt: _ago(3 * HOUR), readBy: { u_sarah: _ago(3 * HOUR), u_emma: _ago(2 * HOUR + 55), u_james: _ago(2 * HOUR + 52) } },
  { id: 'm_c2_2', threadId: 'th_chan_c2', senderId: 'u_emma', senderName: 'Emma Thompson', senderRole: 'student',
    body: 'Is that the one from the textbook or the printed sheet?', attachments: [],
    createdAt: _ago(2 * HOUR + 50), readBy: { u_emma: _ago(2 * HOUR + 50), u_sarah: _ago(2 * HOUR + 48) } },
  { id: 'm_c2_3', threadId: 'th_chan_c2', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: "The printed sheet I handed out Tuesday. There's a copy in the resources tab if you've lost it.", attachments: [],
    createdAt: _ago(2 * HOUR + 45), readBy: { u_sarah: _ago(2 * HOUR + 45), u_james: _ago(2 * HOUR + 42) } },
  { id: 'm_c2_4', threadId: 'th_chan_c2', senderId: 'u_james', senderName: 'James Wilson', senderRole: 'student',
    body: 'Got it, thanks Miss.', attachments: [],
    createdAt: _ago(2 * HOUR + 40), readBy: { u_james: _ago(2 * HOUR + 40) } },
  { id: 'm_c2_5', threadId: 'th_chan_c2', senderId: 'u_sophia', senderName: 'Sophia Patel', senderRole: 'student',
    body: 'Do we need to show all working for Q7?', attachments: [],
    createdAt: _ago(2 * HOUR + 30), readBy: { u_sophia: _ago(2 * HOUR + 30) } },
  { id: 'm_c2_6', threadId: 'th_chan_c2', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: 'Yes please — full method marks matter in the exam. Show every line.', attachments: [],
    createdAt: _ago(2 * HOUR + 20), readBy: { u_sarah: _ago(2 * HOUR + 20) } },

  // ── Class channel: A-Level Physics · Year 13 (c13) ──
  { id: 'm_c13_1', threadId: 'th_chan_c13', senderId: 'u_david', senderName: 'David Park', senderRole: 'teacher',
    body: "Reminder: bring your data booklets next session — we're working through past-paper Section C.", attachments: [],
    createdAt: _ago(1 * DAY), readBy: { u_david: _ago(1 * DAY), u_aiden: _ago(1 * DAY - 60) } },

  // ── Aiden ↔ Mr Park (external-contact trigger) ──
  { id: 'm_ad_1', threadId: 'th_aiden_david', senderId: 'u_aiden', senderName: 'Aiden Foster', senderRole: 'student',
    body: "Hi sir, I'm stuck on the refraction question from the worksheet.", attachments: [],
    createdAt: _ago(2 * DAY), readBy: { u_aiden: _ago(2 * DAY), u_david: _ago(2 * DAY - 20) } },
  { id: 'm_ad_2', threadId: 'th_aiden_david', senderId: 'u_david', senderName: 'David Park', senderRole: 'teacher',
    body: "No problem Aiden. Which part — Snell's law or the critical angle?", attachments: [],
    createdAt: _ago(2 * DAY - 25), readBy: { u_david: _ago(2 * DAY - 25), u_aiden: _ago(2 * DAY - 30) } },
  { id: 'm_ad_3', threadId: 'th_aiden_david', senderId: 'u_aiden', senderName: 'Aiden Foster', senderRole: 'student',
    body: 'The critical angle one. I keep getting the wrong number.', attachments: [],
    createdAt: _ago(2 * DAY - 35), readBy: { u_aiden: _ago(2 * DAY - 35), u_david: _ago(2 * DAY - 40) } },
  { id: 'm_ad_4', threadId: 'th_aiden_david', senderId: 'u_david', senderName: 'David Park', senderRole: 'teacher',
    body: 'Remember sin(C) = 1/n. Plug in n = 1.5 and take the inverse sine. You should get about 41.8°.', attachments: [],
    createdAt: _ago(2 * DAY - 45), readBy: { u_david: _ago(2 * DAY - 45), u_aiden: _ago(2 * DAY - 50) } },
  // TRIGGER: external contact (phone number + "whatsapp")
  { id: 'm_ad_5', threadId: 'th_aiden_david', senderId: 'u_aiden', senderName: 'Aiden Foster', senderRole: 'student',
    body: "Oh that makes sense. My WhatsApp is 07700 900182 if it's easier to text?", attachments: [],
    createdAt: _ago(2 * DAY - 55), readBy: { u_aiden: _ago(2 * DAY - 55), u_david: _ago(2 * DAY - 58) } },
  { id: 'm_ad_6', threadId: 'th_aiden_david', senderId: 'u_david', senderName: 'David Park', senderRole: 'teacher',
    body: "Let's keep everything here on Klasio, Aiden — that's our centre policy and it keeps us both safe. Happy to help with anything in this channel any time. 👍", attachments: [],
    createdAt: _ago(2 * DAY - 60), readBy: { u_david: _ago(2 * DAY - 60), u_aiden: _ago(2 * DAY - 70) } },
  { id: 'm_ad_7', threadId: 'th_aiden_david', senderId: 'u_aiden', senderName: 'Aiden Foster', senderRole: 'student',
    body: 'Understood! Can we go over Q4 next session?', attachments: [],
    createdAt: _ago(1 * DAY), readBy: { u_aiden: _ago(1 * DAY) } },

  // ── Mia ↔ Ms Clarke (out-of-hours trigger: sent 23:14) ──
  { id: 'm_ms_1', threadId: 'th_mia_sarah', senderId: 'u_mia', senderName: 'Mia Okonkwo', senderRole: 'student',
    body: "Sorry to message so late, I just wanted to check tomorrow's lesson is still at 4pm?", attachments: [],
    createdAt: '2026-06-16T23:14:00.000Z', readBy: { u_mia: '2026-06-16T23:14:00.000Z' } },
  { id: 'm_ms_2', threadId: 'th_mia_sarah', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: 'No problem Mia — yes, 4pm as usual in Room 3. See you then. (Best to message during the day where you can.)', attachments: [],
    createdAt: _ago(1 * DAY), readBy: { u_sarah: _ago(1 * DAY) } },

  // ── James ↔ Mr Park (image-shared trigger) ──
  // TRIGGER: image attachment
  { id: 'm_jd_1', threadId: 'th_james_david', senderId: 'u_james', senderName: 'James Wilson', senderRole: 'student',
    body: "Sir, here's my working for Q7 — I think I went wrong somewhere.",
    attachments: [{ name: 'photo-of-working.jpg', type: 'image' }],
    createdAt: _ago(20 * HOUR), readBy: { u_james: _ago(20 * HOUR) } },

  // ── Sophia ↔ Ms Clarke (keyword trigger: "instagram") — already resolved by DSL ──
  // TRIGGER: keyword
  { id: 'm_sf_kw', threadId: 'th_sophia_sarah', senderId: 'u_sophia', senderName: 'Sophia Patel', senderRole: 'student',
    body: "Miss I've been really stressed about exams. Is it ok if I message you on instagram instead, it's quicker for me?", attachments: [],
    createdAt: _ago(3 * DAY), readBy: { u_sophia: _ago(3 * DAY), u_sarah: _ago(3 * DAY - 1) } },
  { id: 'm_sf_2', threadId: 'th_sophia_sarah', senderId: 'u_sarah', senderName: 'Sarah Clarke', senderRole: 'teacher',
    body: "I'm really glad you told me, Sophia — you're not in any trouble at all. Let's keep chatting here so I can support you properly, and I'll let Ms Chen know so we can help. 💛", attachments: [],
    createdAt: _ago(3 * DAY - 1), readBy: { u_sarah: _ago(3 * DAY - 1) } },

  // Apex — isolation proof
  { id: 'm_ax1', threadId: 'th_apex', senderId: 'u_daniel', senderName: 'Daniel Mehta', senderRole: 'admin',
    body: 'Hannah, can you cover the Friday slot?', attachments: [],
    createdAt: _ago(3 * HOUR), readBy: { u_daniel: _ago(3 * HOUR) } },
];

// ─── Comms config (per-centre safety posture) ──────────────────────────────────────
// Backs the Settings → Comms tab and gates Messages behaviour (1:1 on/off, quiet
// hours, images, DSL observer). Seeds the `standard` preset so the demo shows live
// monitored DMs + channels; an admin can switch to Locked-down to see DMs disabled
// and the quiet-hours composer lock kick in.
// --- Extra activity notifications -------------------------------------------------
// Messages and announcements come from the comms store above. These items cover
// cross-module updates that are relevant to the signed-in demo user.
const COMMS_ACTIVITY_NOTIFICATIONS = [
  // Platform owner
  { id: 'sa-plan-upgrade', roles: ['superadmin'], icon: 'zap', tone: 'info', page: 'revenue',
    title: 'Bright Minds upgraded to Pro', sub: 'Plans - subscription changed 18 minutes ago',
    time: _ago(18 * MIN), sig: 'sa-plan-upgrade:2026-06-18T09:12' },
  { id: 'sa-storage-spike', roles: ['superadmin'], icon: 'archive', tone: 'warning', page: 'system',
    title: 'Storage usage jumped at Riverside', sub: 'Storage - 1.2 GB of uploads today',
    time: _ago(42 * MIN), sig: 'sa-storage-spike:riverside:1200' },

  // Centre admin
  { id: 'adm-submissions-review', roles: ['admin'], centreIds: ['bm'], icon: 'clip', tone: 'success', page: 'classes:classes',
    title: '18 submissions waiting for review', sub: 'Homework - across 4 active classes',
    time: _ago(14 * MIN), sig: 'adm-submissions-review:18' },
  { id: 'adm-report-updated', roles: ['admin'], centreIds: ['bm'], icon: 'file', tone: 'info', page: 'reports',
    title: 'Year 11 progress reports updated', sub: 'Reports - David Park changed 6 drafts',
    time: _ago(36 * MIN), sig: 'adm-report-updated:y11:6' },
  { id: 'adm-timesheet-submitted', roles: ['admin'], centreIds: ['bm'], icon: 'clock', tone: 'warning', page: 'timesheets:review',
    title: '3 timesheets need approval', sub: 'Timesheets - due before payroll export',
    time: _ago(51 * MIN), sig: 'adm-timesheet-submitted:3' },
  { id: 'adm-invoice-paid', roles: ['admin'], centreIds: ['bm'], icon: 'invoice', tone: 'success', page: 'invoices',
    title: 'Invoice BM-1042 was paid', sub: 'Invoices - Emma Thompson account updated',
    time: _ago(2 * HOUR), sig: 'adm-invoice-paid:BM-1042' },

  // Teacher
  { id: 't-submission-emma', userIds: ['u_sarah'], icon: 'clip', tone: 'success', page: 'homework',
    title: 'Emma submitted Worksheet 4B', sub: 'Homework - GCSE Maths Group B',
    time: _ago(9 * MIN), sig: 't-submission-emma:worksheet-4b' },
  { id: 't-lesson-updated', userIds: ['u_sarah'], icon: 'calendar', tone: 'info', page: 'timetable',
    title: 'Room changed for Year 12 Maths', sub: 'Timetable - moved to Room 5 at 16:00',
    time: _ago(28 * MIN), sig: 't-lesson-updated:c3:room5' },
  { id: 't-report-comment', userIds: ['u_sarah'], icon: 'file', tone: 'warning', page: 'reports',
    title: 'Predicted grades need comments', sub: 'Reports - 5 students still missing notes',
    time: _ago(1 * HOUR + 12), sig: 't-report-comment:5' },

  // Student
  { id: 's-feedback-ready', userIds: ['u_oliver'], icon: 'star', tone: 'success', page: 'homework',
    title: 'Integration sheet feedback is ready', sub: 'Homework - Sarah Clarke left comments',
    time: _ago(11 * MIN), sig: 's-feedback-ready:integration-sheet' },
  { id: 's-resource-added', userIds: ['u_oliver'], icon: 'book', tone: 'info', page: 'homework',
    title: 'New revision resource added', sub: 'A-Level Maths - integration practice pack',
    time: _ago(44 * MIN), sig: 's-resource-added:integration-pack' },
  { id: 's-report-published', userIds: ['u_oliver'], icon: 'file', tone: 'warning', page: 'reports',
    title: 'Your June progress report was published', sub: 'Reports - parent copy also available',
    time: _ago(3 * HOUR), sig: 's-report-published:june' },
];

const COMMS_CONFIG = {
  bm: {
    preset: 'standard',
    dmEnabled: true,
    quietFrom: '21:00', quietTo: '07:00',
    images: true,
    dslObserver: true,
    dslLeadId: 'u_lisa', dslDeputyId: 'u_david',
    retention: '3y',
    wordlist: ['address', 'meet up', 'whatsapp', 'snapchat', 'instagram', 'phone number', 'kik', 'secret'],
    announceAuthors: 'admins',
    approvalWorkflow: false,
  },
  apex: {
    preset: 'standard',
    dmEnabled: true,
    quietFrom: '21:00', quietTo: '07:00',
    images: true,
    dslObserver: true,
    dslLeadId: 'u_daniel', dslDeputyId: null,
    retention: '3y',
    wordlist: ['address', 'meet up', 'whatsapp', 'snapchat', 'instagram'],
    announceAuthors: 'admins',
    approvalWorkflow: false,
  },
};

// ─── Flag resolutions (keyed by messageId) ─────────────────────────────────────────
// Flags themselves are COMPUTED client-side from messages (Communications.jsx). This
// map only records what the DSL has done about a flagged message. Sophia's keyword
// message is seeded as already handled, so the queue shows 3 open + 1 resolved.
const COMMS_FLAGS = {
  m_sf_kw: { status: 'resolved', by: 'u_lisa', at: _ago(2 * DAY),
    note: 'Spoke with Sophia — wellbeing check booked with form tutor. Conversation kept on platform.' },
};

// ─── Concerns log (low-level, recorded by the DSL) ─────────────────────────────────
const COMMS_CONCERNS = [
  { id: 'cn_sophia', centreId: 'bm', aboutUserId: 'u_sophia', threadId: 'th_sophia_sarah',
    reason: 'Wellbeing — exam stress', level: 'low', by: 'u_lisa', at: _ago(2 * DAY),
    note: 'Disclosed exam stress and asked to move off-platform (Instagram). Redirected; wellbeing support arranged. Monitoring.' },
  { id: 'cn_aiden', centreId: 'bm', aboutUserId: 'u_aiden', threadId: 'th_aiden_david',
    reason: 'Attempted off-platform contact', level: 'low', by: 'u_david', at: _ago(1 * DAY),
    note: 'Shared personal mobile with tutor. Tutor declined and reinforced policy. Logged for awareness.' },
];
