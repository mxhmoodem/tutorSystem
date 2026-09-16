// ══════════════════════════════════════════════════════════════════════════════
//  Solo tutor demo — fixtures (never mixed into the centre demo's mocks)
// ──────────────────────────────────────────────────────────────────────────────
//  ONE roster, listed in the order the students joined Sarah's book. The active
//  tier decides how far down the list the book reaches (capability module →
//  demoStudents), so raising the tier grows the same book rather than swapping
//  datasets. Lessons, registers, invoices, tracking and reports all key off
//  student ids; whatever sits outside the current book simply isn't shown.
//
//  Registers, balances, attendance and earnings are NOT stored here — soloData.jsx
//  works them out from the lesson schedule, the register gaps / absences below and
//  the invoices. Phone numbers use Ofcom's reserved drama ranges.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const SOLO_TUTOR = {
  name: 'Sarah Whitfield', first: 'Sarah', initials: 'SW',
  business: 'Whitfield Tutoring', email: 'sarah@whitfieldtutoring.co.uk',
  card: 'Visa ending 4417', renews: '2026-10-14', term: 'Autumn 2026',
};

// The demo's fixed "now": Monday 14 September 2026, 16:10 — mid-way through
// Maya's lesson, so the dashboard opens on a live lesson.
const SOLO_NOW = { date: '2026-09-14', time: '16:10' };

// Registers open 10 minutes before a lesson and can be taken for 7 days after it
// ends; after that they lock and need reopening with a reason.
const SOLO_REGISTER_RULES = { opensBeforeMins: 10, windowHours: 168 };

// Register history is generated from this date up to now.
const SOLO_HISTORY_FROM = '2026-07-20';

// ── Roster (join order) ──────────────────────────────────────────────────────
// family: billing household key · g: billing guardian · rel: relationship
// g2: optional second guardian [name, relation] · since: first lesson month
const S = (id, first, last, year, subject, family, g, rel, since, extra) =>
  ({ id, first, last, name: `${first} ${last}`, year, subject, family, guardian: g, relation: rel, since, ...(extra || {}) });

const SOLO_STUDENTS = [
  // Solo Free book (3)
  S('maya',   'Maya',   'Choudhury', 'Year 11', 'GCSE Maths',        'choudhury', 'Priya Choudhury',  'Mother', '2026-01', { g2: ['Raj Choudhury', 'Father'], photoConsent: '2026-01-12', dataConsent: '2026-01-12' }),
  S('tom',    'Tom',    'Brennan',   'Year 13', 'A-Level Maths',     'brennan',   'Claire Brennan',   'Mother', '2025-09'),
  S('ethan',  'Ethan',  'Huang',     'Year 10', 'GCSE Maths',        'huang',     'Wei Huang',        'Father', '2025-11', { billing: 'termly' }),
  // Solo book (to 18)
  S('aisha',  'Aisha',  'Rahman',    'Year 11', 'GCSE Maths',        'rahman',    'Nadia Rahman',     'Mother', '2026-02'),
  S('zayn',   'Zayn',   'Rahman',    'Year 9',  'GCSE Maths',        'rahman',    'Nadia Rahman',     'Mother', '2026-02'),
  S('freya',  'Freya',  'Lindqvist', 'Year 11', 'GCSE Physics',      'lindqvist', 'Anna Lindqvist',   'Mother', '2026-03', { allergies: 'Nut allergy — carries an EpiPen' }),
  S('daniel', 'Daniel', 'Owusu',     'Year 10', 'GCSE Maths',        'owusu',     'Grace Owusu',      'Mother', '2026-03'),
  S('james',  'James',  'Wilson',    'Year 11', 'GCSE Maths',        'wilson',    'Helen Wilson',     'Mother', '2026-04'),
  S('noah',   'Noah',   'Fitzgerald','Year 11', 'GCSE Maths',        'fitzgerald','Mark Fitzgerald',  'Father', '2026-04'),
  S('lily',   'Lily',   'Park',      'Year 11', 'GCSE Maths',        'park',      'Soo-jin Park',     'Mother', '2026-04'),
  S('oscar',  'Oscar',  'Reid',      'Year 11', 'GCSE Maths',        'reid',      'Fiona Reid',       'Mother', '2026-04'),
  S('hannah', 'Hannah', 'Byrne',     'Year 11', 'GCSE Maths',        'byrne',     'Declan Byrne',     'Father', '2026-05', { sen: 'Dyslexia — prefers printed worksheets on cream paper' }),
  S('isla',   'Isla',   'Morgan',    'Year 12', 'A-Level Chemistry', 'morgan',    'Rhian Morgan',     'Mother', '2026-05'),
  S('leo',    'Leo',    'Asante',    'Year 8',  'KS3 Maths',         'asante',    'Kofi Asante',      'Father', '2026-06'),
  S('grace',  'Grace',  'Kowalski',  'Year 10', 'GCSE Physics',      'kowalski',  'Marta Kowalski',   'Mother', '2026-06'),
  S('samir',  'Samir',  'Haddad',    'Year 13', 'A-Level Physics',   'haddad',    'Layla Haddad',     'Mother', '2026-07'),
  S('ruby',   'Ruby',   'Thompson',  'Year 9',  'KS3 Science',       'thompson',  'Mark Thompson',    'Father', '2026-08'),
  S('kai',    'Kai',    'Nakamura',  'Year 12', 'A-Level Maths',     'nakamura',  'Yuki Nakamura',    'Mother', '2026-09'),
  // Solo Pro book (to 42)
  S('priya',  'Priya',  'Nair',      'Year 11', 'GCSE Maths',        'nair',      'Deepa Nair',       'Mother', '2026-09'),
  S('ella',   'Ella',   'Fraser',    'Year 13', 'A-Level Maths',     'fraser',    'Iain Fraser',      'Father', '2026-09'),
  S('mohammed','Mohammed','Ali',     'Year 13', 'A-Level Maths',     'ali',       'Sara Ali',         'Mother', '2026-09'),
  S('sophie', 'Sophie', 'Clarke',    'Year 13', 'A-Level Maths',     'clarke',    'Emma Clarke',      'Mother', '2026-09'),
  S('ben',    'Ben',    'Harper',    'Year 13', 'A-Level Maths',     'harper',    'Rob Harper',       'Father', '2026-09'),
  S('amelia', 'Amelia', 'Jones',     'Year 10', 'GCSE Maths',        'jones',     'Kate Jones',       'Mother', '2026-09'),
  S('harry',  'Harry',  'Evans',     'Year 10', 'GCSE Maths',        'evans',     'Owen Evans',       'Father', '2026-09'),
  S('chloe',  'Chloe',  'Davies',    'Year 10', 'GCSE Maths',        'davies',    'Sian Davies',      'Mother', '2026-09'),
  S('jacob',  'Jacob',  'Hughes',    'Year 10', 'GCSE Maths',        'hughes',    'Gareth Hughes',    'Father', '2026-09'),
  S('mia',    'Mia',    'Roberts',   'Year 11', 'GCSE Chemistry',    'roberts',   'Laura Roberts',    'Mother', '2026-09'),
  S('alfie',  'Alfie',  'Turner',    'Year 12', 'A-Level Physics',   'turner',    'Dan Turner',       'Father', '2026-09'),
  S('evie',   'Evie',   'Walsh',     'Year 10', 'GCSE Maths',        'walsh',     'Niamh Walsh',      'Mother', '2026-09'),
  S('arjun',  'Arjun',  'Patel',     'Year 13', 'A-Level Further Maths', 'patel', 'Meera Patel',      'Mother', '2026-09'),
  S('zara',   'Zara',   'Hussain',   'Year 11', 'GCSE Physics',      'hussain',   'Imran Hussain',    'Father', '2026-09'),
  S('finn',   'Finn',   "O'Connor",  'Year 9',  'KS3 Maths',         'oconnor',   "Aoife O'Connor",   'Mother', '2026-09'),
  S('poppy',  'Poppy',  'Bennett',   'Year 11', 'GCSE Maths',        'bennett',   'Jo Bennett',       'Mother', '2026-09'),
  S('theo',   'Theo',   'Marshall',  'Year 12', 'A-Level Chemistry', 'marshall',  'Paul Marshall',    'Father', '2026-09'),
  S('aria',   'Aria',   'Shah',      'Year 10', 'GCSE Maths',        'shah',      'Nisha Shah',       'Mother', '2026-09'),
  S('jack',   'Jack',   'Lewis',     'Year 11', 'GCSE Physics',      'lewis',     'Carys Lewis',      'Mother', '2026-09'),
  S('layla',  'Layla',  'Ahmed',     'Year 8',  'KS3 Maths',         'ahmed',     'Yusuf Ahmed',      'Father', '2026-09'),
  S('oliver', 'Oliver', 'Grant',     'Year 13', 'A-Level Maths',     'grant',     'Ruth Grant',       'Mother', '2026-09'),
  S('isabelle','Isabelle','Moore',   'Year 11', 'GCSE Maths',        'moore',     'Tessa Moore',      'Mother', '2026-09'),
  S('nathan', 'Nathan', 'Price',     'Year 12', 'A-Level Maths',     'price',     'Gavin Price',      'Father', '2026-09'),
  S('sienna', 'Sienna', 'Wright',    'Year 10', 'GCSE Maths',        'wright',    'Holly Wright',     'Mother', '2026-09'),
];

// People waiting for a place (shown where the plan keeps a waiting list).
const SOLO_WAITING_LIST = [
  { name: 'Ava Mitchell',   year: 'Year 11', subject: 'GCSE Maths',      added: '2026-08-28', note: 'Weekday after 5pm' },
  { name: 'Rory Campbell',  year: 'Year 13', subject: 'A-Level Physics', added: '2026-09-03', note: 'Online only' },
  { name: 'Hana Kobayashi', year: 'Year 10', subject: 'GCSE Maths',      added: '2026-09-10', note: 'Saturday group if a place opens' },
];

// ── Lessons ──────────────────────────────────────────────────────────────────
// A one-to-one lesson is a lesson with one student on it; a group is the same
// thing with more. day: 1 = Monday … 7 = Sunday. rate: £ an hour (per head for
// groups). place: where it happens, in the tutor's words.
const L = (id, students, subject, day, start, mins, place, rate, extra) =>
  ({ id, kind: 'one', students, subject, slots: [{ day, start, mins }], place, rate, ...(extra || {}) });
const G = (id, name, students, subject, capacity, day, start, mins, place, rate) =>
  ({ id, kind: 'group', name, students, subject, capacity, slots: [{ day, start, mins }], place, rate });

const SOLO_LESSONS = [
  L('l-maya',   ['maya'],   'GCSE Maths',        1, '16:00', 60, 'At your home', 35, { topic: 'Quadratics · week 3 of the plan' }),
  { id: 'l-tom', kind: 'one', students: ['tom'], subject: 'A-Level Maths', slots: [{ day: 1, start: '17:30', mins: 60 }, { day: 4, start: '17:30', mins: 60 }], place: 'Online', rate: 40, topic: 'Integration by parts' },
  L('l-ethan',  ['ethan'],  'GCSE Maths',        6, '09:00', 60, 'At your home', 35, { topic: 'Trigonometry' }),
  G('g-rahman', 'Rahman siblings', ['aisha', 'zayn'], 'GCSE Maths', 2, 1, '19:00', 60, 'At the family home', 22),
  L('l-freya',  ['freya'],  'GCSE Physics',      1, '20:00', 60, 'Online', 35, { topic: 'Electricity' }),
  L('l-daniel', ['daniel'], 'GCSE Maths',        2, '17:00', 60, 'At your home', 35),
  L('l-james',  ['james'],  'GCSE Maths',        4, '19:00', 60, 'Online', 35),
  G('g-saturday', 'Saturday revision', ['james', 'noah', 'lily', 'oscar', 'hannah', 'isabelle'], 'GCSE Maths', 6, 6, '10:30', 90, 'Library study room', 18),
  L('l-isla',   ['isla'],   'A-Level Chemistry', 3, '17:00', 60, 'Online', 40),
  L('l-leo',    ['leo'],    'KS3 Maths',         3, '16:00', 60, 'At your home', 30),
  L('l-grace',  ['grace'],  'GCSE Physics',      5, '17:00', 60, 'Online', 35),
  L('l-samir',  ['samir'],  'A-Level Physics',   2, '19:00', 60, 'Online', 40),
  L('l-ruby',   ['ruby'],   'KS3 Science',       5, '16:00', 60, 'At your home', 30),
  L('l-kai',    ['kai'],    'A-Level Maths',     3, '18:30', 60, 'Online', 40),
  L('l-priya',  ['priya'],  'GCSE Maths',        2, '18:30', 60, 'At your home', 35),
  G('g-clinic', 'Year 13 clinic', ['ella', 'mohammed', 'sophie', 'ben', 'nathan'], 'A-Level Maths', 6, 7, '11:00', 120, 'Online', 20),
  G('g-year10', 'Year 10 group',  ['amelia', 'harry', 'chloe', 'jacob', 'sienna'], 'GCSE Maths', 5, 6, '12:30', 60, 'Library study room', 18),
  L('l-mia',    ['mia'],    'GCSE Chemistry',    2, '16:00', 60, 'Online', 35),
  L('l-alfie',  ['alfie'],  'A-Level Physics',   4, '16:00', 60, 'Online', 40),
  L('l-evie',   ['evie'],   'GCSE Maths',        5, '18:30', 60, 'At your home', 35),
  L('l-arjun',  ['arjun'],  'A-Level Further Maths', 7, '14:00', 60, 'Online', 45),
  L('l-zara',   ['zara'],   'GCSE Physics',      3, '19:30', 60, 'Online', 35),
  L('l-finn',   ['finn'],   'KS3 Maths',         4, '18:00', 45, 'Online', 30),
  L('l-poppy',  ['poppy'],  'GCSE Maths',        6, '14:00', 60, 'At your home', 35),
  L('l-theo',   ['theo'],   'A-Level Chemistry', 2, '20:00', 60, 'Online', 40),
  L('l-aria',   ['aria'],   'GCSE Maths',        7, '16:00', 60, 'Online', 35),
  L('l-jack',   ['jack'],   'GCSE Physics',      4, '20:00', 60, 'Online', 35),
  L('l-layla',  ['layla'],  'KS3 Maths',         6, '15:30', 45, 'At your home', 30),
  L('l-oliver', ['oliver'], 'A-Level Maths',     5, '19:30', 60, 'Online', 40),
];

// ── Register exceptions ──────────────────────────────────────────────────────
// Every past lesson has a register EXCEPT these. Tom's Thursday is still inside
// the 7-day window (open, late); Ethan's Saturday has passed it (locked).
const SOLO_REGISTER_GAPS = [
  { lesson: 'l-tom',   date: '2026-09-10' },
  { lesson: 'l-ethan', date: '2026-09-05' },
];
// Dates a student was marked absent / late on an otherwise-taken register.
const SOLO_ABSENCES = {
  noah:   ['2026-08-01', '2026-08-22', '2026-09-12'],
  tom:    ['2026-08-27'],
  freya:  ['2026-08-10', '2026-09-07'],
  oscar:  ['2026-08-15'],
  daniel: ['2026-08-18'],
  zayn:   ['2026-08-31'],
  aisha:  ['2026-08-31'],
  kai:    ['2026-09-09'],
  ben:    ['2026-08-30'],
};
const SOLO_LATES = {
  maya:  [{ date: '2026-08-24', note: 'Arrived 16:12' }],
  james: [{ date: '2026-09-05', note: 'Arrived 10:40' }],
};

// ── Invoices ─────────────────────────────────────────────────────────────────
// Hand-written invoices. Families without a September invoice here get one
// generated from their lesson schedule (soloData.jsx).
const SOLO_INVOICES = [
  { id: 'INV-0031', family: 'huang',     students: ['ethan'], covers: 'Summer block · 10 lessons', issued: '2026-07-01', due: '2026-07-15', amount: 350, paidOn: '2026-07-10', method: 'Bank transfer' },
  { id: 'INV-0036', family: 'choudhury', students: ['maya'],  covers: 'August · 4 lessons',        issued: '2026-08-01', due: '2026-08-21', amount: 140, paidOn: '2026-09-03', method: 'Bank transfer' },
  { id: 'INV-0039', family: 'brennan',   students: ['tom'],   covers: 'August · 4 lessons',        issued: '2026-08-01', due: '2026-09-07', amount: 160 },
  { id: 'INV-0042', family: 'choudhury', students: ['maya'],  covers: 'September · 4 lessons',     issued: '2026-09-01', due: '2026-09-21', amount: 140 },
  { id: 'INV-0043', family: 'brennan',   students: ['tom'],   covers: 'September · 8 lessons',     issued: '2026-09-01', due: '2026-09-28', amount: 320 },
  { id: 'INV-0044', family: 'rahman',    students: ['aisha', 'zayn'], covers: 'September · 4 lessons each', issued: '2026-09-01', due: '2026-09-09', amount: 176 },
];

// ── Tracking (marks) ─────────────────────────────────────────────────────────
// Hand-written for the students the demo talks about; everyone else gets a
// steady generated set in soloData.jsx.
const SOLO_TRACKING = {
  maya:  [{ title: 'Surds worksheet', date: '2026-08-24', score: 9, out: 15 }, { title: 'Quadratics check', date: '2026-09-07', score: 14, out: 15 }, { title: 'Mock paper 2', date: '2026-09-14', score: 18, out: 20 }],
  tom:   [{ title: 'Differentiation test', date: '2026-08-27', score: 15, out: 20 }, { title: 'Integration · past paper', date: '2026-09-10', score: 11, out: 20 }],
  ethan: [{ title: 'Angles review', date: '2026-08-29', score: 13, out: 20 }, { title: 'Trigonometry · topic test', date: '2026-09-12', score: 16, out: 20 }],
  james: [{ title: 'Algebra check', date: '2026-07-25', score: 17, out: 20 }, { title: 'Mock paper 1', date: '2026-08-22', score: 12, out: 20 }, { title: 'Mock paper 2', date: '2026-09-12', score: 9, out: 20 }],
};

// When each student last handed homework back (default: within the last week).
const SOLO_HOMEWORK_RETURNED = { daniel: '2026-08-24' };

// ── Reports ──────────────────────────────────────────────────────────────────
// Published: the summer review went to every family on the books by July.
const SOLO_REPORTS_PUBLISHED = { title: 'Summer term review', date: '2026-07-18', joinedBy: '2026-07' };
// Rule-driven reports due this week (shown where the plan has report rules).
const SOLO_REPORTS_DUE = [
  { student: 'maya',  title: 'Autumn half-term', rule: 'Half-termly', due: '2026-09-18', draft: false },
  { student: 'james', title: 'September',        rule: 'Monthly',     due: '2026-09-18', draft: false },
  { student: 'freya', title: 'September',        rule: 'Monthly',     due: '2026-09-18', draft: true  },
];

// ── Safeguarding ─────────────────────────────────────────────────────────────
const SOLO_ESCALATION = [
  { label: 'Local authority', value: 'Nottingham City LADO', phone: '0115 496 0321' },
  { label: 'Out of hours',    value: 'Emergency duty team',  phone: '0115 496 0457' },
  { label: 'Immediate risk',  value: 'Police',               phone: '999' },
];

// ── Earnings by month (hours taught, as a share of a full September book) ─────
const SOLO_SEASON = [
  { month: 'Mar', share: 0.58 }, { month: 'Apr', share: 0.72 }, { month: 'May', share: 0.88 },
  { month: 'Jun', share: 0.61 }, { month: 'Jul', share: 0.22 }, { month: 'Aug', share: 0.27 },
];

window.SOLO_FIXTURES = {
  SOLO_TUTOR, SOLO_NOW, SOLO_REGISTER_RULES, SOLO_HISTORY_FROM,
  SOLO_STUDENTS, SOLO_WAITING_LIST, SOLO_LESSONS,
  SOLO_REGISTER_GAPS, SOLO_ABSENCES, SOLO_LATES,
  SOLO_INVOICES, SOLO_TRACKING, SOLO_HOMEWORK_RETURNED,
  SOLO_REPORTS_PUBLISHED, SOLO_REPORTS_DUE, SOLO_ESCALATION, SOLO_SEASON,
};

})();
