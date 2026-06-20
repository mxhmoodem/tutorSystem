// ══════════════════════════════════════════════════════════════
//  Mock data — Admin Pages (seeds the localStorage admin store)
//  Loaded as a global script before AdminPages.jsx (see index.html).
//
//  SEED_* arrays seed the shared admin store (teachers / classes /
//  students / subjects). `allStudents` backs the read-only roster view.
// ══════════════════════════════════════════════════════════════

const SEED_TEACHERS = [
  { id:'t1', name:'Sarah Clarke',  subject:'Mathematics',         classes:4, students:29, hwToMark:7, attendance:96, rating:4.9, joined:'Sep 2023', email:'s.clarke@centre.co.uk', phone:'07700 900111', status:'active',  color:'#4F46E5' },
  { id:'t2', name:'Priya Nair',    subject:'Science / Biology',   classes:2, students:19, hwToMark:3, attendance:98, rating:4.8, joined:'Jan 2024', email:'p.nair@centre.co.uk',   phone:'07700 900112', status:'active',  color:'#0891B2' },
  { id:'t3', name:'David Park',    subject:'Chemistry / Physics', classes:4, students:21, hwToMark:2, attendance:95, rating:4.7, joined:'Sep 2022', email:'d.park@centre.co.uk',   phone:'07700 900113', status:'active',  color:'#0D9488' },
  { id:'t4', name:'Marcus Webb',   subject:'English Literature',  classes:2, students:18, hwToMark:4, attendance:92, rating:4.6, joined:'Sep 2023', email:'m.webb@centre.co.uk',   phone:'07700 900114', status:'active',  color:'#D97706' },
  { id:'t5', name:'Helen Yoo',     subject:'History / RS',        classes:2, students:15, hwToMark:0, attendance:97, rating:4.8, joined:'Feb 2024', email:'h.yoo@centre.co.uk',    phone:'07700 900115', status:'active',  color:'#DC2626' },
  { id:'t6', name:'Daniel Mehta',  subject:'Computer Science',    classes:3, students:25, hwToMark:5, attendance:94, rating:4.7, joined:'Sep 2023', email:'d.mehta@centre.co.uk',  phone:'07700 900116', status:'active',  color:'#7C3AED' },
  { id:'t7', name:'Aisha Begum',   subject:'Geography',           classes:3, students:27, hwToMark:1, attendance:99, rating:4.9, joined:'Jan 2025', email:'a.begum@centre.co.uk',  phone:'07700 900117', status:'active',  color:'#DB2777' },
  { id:'t8', name:'Tom Rivera',    subject:'Mathematics',         classes:2, students:17, hwToMark:2, attendance:93, rating:4.5, joined:'Apr 2026', email:'t.rivera@centre.co.uk', phone:'07700 900118', status:'active',  color:'#2563EB' },
  { id:'t9', name:'Claire Dubois', subject:'French / Spanish',    classes:4, students:30, hwToMark:3, attendance:97, rating:4.8, joined:'Sep 2024', email:'c.dubois@centre.co.uk', phone:'07700 900119', status:'active',  color:'#059669' },
  { id:'t10',name:'James Okafor',  subject:'Biology / Science',   classes:3, students:28, hwToMark:4, attendance:96, rating:4.7, joined:'Sep 2023', email:'j.okafor@centre.co.uk', phone:'07700 900120', status:'active',  color:'#9333EA' },
  { id:'t11',name:'Rebecca Stone', subject:'Economics / Business',classes:4, students:29, hwToMark:2, attendance:95, rating:4.6, joined:'Jan 2024', email:'r.stone@centre.co.uk',  phone:'07700 900121', status:'active',  color:'#EA580C' },
  { id:'t12',name:'Nadia Hassan',  subject:'Psychology',          classes:0, students:0,  hwToMark:0, attendance:0,  rating:0,   joined:'Jun 2026', email:'n.hassan@centre.co.uk', phone:'07700 900122', status:'pending', color:'#0EA5E9' },
];

// `tags` are free-form labels a centre attaches to classes. They are the generic
// targeting mechanism for reporting rules (see reports.mock.jsx) — a centre that
// doesn't use year/subject can tag classes however it likes ("GCSE", "1-to-1",
// "Intervention", "Exam Year"…). Year/subject are just two possible tag values.
const SEED_CLASSES = [
  { id:'c1',  name:'GCSE Mathematics',     group:'Year 10 – Group A', teacher:'Sarah Clarke', day:'Friday',    time:'09:00–10:30', room:'Room 3', students:8,  capacity:10, status:'active', tags:['GCSE'] },
  { id:'c2',  name:'GCSE Mathematics',     group:'Year 11 – Group B', teacher:'Sarah Clarke', day:'Friday',    time:'10:30–12:00', room:'Room 3', students:7,  capacity:10, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c3',  name:'A-Level Mathematics',  group:'Year 12 – Group A', teacher:'Sarah Clarke', day:'Friday',    time:'13:00–14:30', room:'Room 5', students:5,  capacity:8,  status:'active', tags:['A-Level'] },
  { id:'c4',  name:'GCSE Mathematics',     group:'Year 9 – Group C',  teacher:'Sarah Clarke', day:'Friday',    time:'15:00–16:30', room:'Room 3', students:9,  capacity:10, status:'active', tags:['GCSE'] },
  { id:'c5',  name:'GCSE Science',         group:'Year 10 – Group A', teacher:'Priya Nair',   day:'Wednesday', time:'09:00–10:30', room:'Room 6', students:11, capacity:12, status:'active', tags:['GCSE'] },
  { id:'c6',  name:'GCSE Science',         group:'Year 11 – Group A', teacher:'Priya Nair',   day:'Wednesday', time:'11:00–12:30', room:'Room 6', students:8,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c7',  name:'A-Level Chemistry',    group:'Year 12 – Group A', teacher:'David Park',   day:'Thursday',  time:'10:00–11:30', room:'Room 7', students:6,  capacity:8,  status:'active', tags:['A-Level','Intervention'] },
  { id:'c8',  name:'GCSE English Lit.',    group:'Year 10 – Group A', teacher:'Marcus Webb',  day:'Tuesday',   time:'14:00–15:30', room:'Room 2', students:10, capacity:12, status:'active', tags:['GCSE'] },
  { id:'c9',  name:'GCSE History',         group:'Year 11 – Group B', teacher:'Helen Yoo',    day:'Monday',    time:'09:00–10:30', room:'Room 4', students:7,  capacity:10, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c10', name:'GCSE Computer Science',group:'Year 10 – Group B', teacher:'Daniel Mehta', day:'Tuesday',   time:'09:00–10:30', room:'Lab 1',  students:9,  capacity:12, status:'active', tags:['GCSE'] },
  { id:'c11', name:'A-Level Comp Sci',     group:'Year 12 – Group A', teacher:'Daniel Mehta', day:'Thursday',  time:'13:00–14:30', room:'Lab 1',  students:7,  capacity:10, status:'active', tags:['A-Level'] },
  { id:'c12', name:'GCSE Geography',       group:'Year 11 – Group A', teacher:'Aisha Begum',  day:'Monday',    time:'11:00–12:30', room:'Room 1', students:9,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c13', name:'A-Level Physics',      group:'Year 13 – Group A', teacher:'David Park',   day:'Thursday',  time:'15:00–16:30', room:'Room 7', students:4,  capacity:8,  status:'active', tags:['A-Level','Exam Year'] },

  // ── Monday ──
  { id:'c14', name:'GCSE Mathematics',     group:'Year 10 – Group B', teacher:'Tom Rivera',    day:'Monday',    time:'13:00–14:30', room:'Room 5', students:9,  capacity:12, status:'active', tags:['GCSE'] },
  { id:'c15', name:'GCSE French',          group:'Year 9 – Group A',  teacher:'Claire Dubois', day:'Monday',    time:'14:00–15:30', room:'Room 8', students:8,  capacity:12, status:'active', tags:['GCSE'] },
  { id:'c16', name:'A-Level Biology',      group:'Year 12 – Group B', teacher:'James Okafor',  day:'Monday',    time:'15:00–16:30', room:'Lab 3', students:7,  capacity:10, status:'active', tags:['A-Level'] },

  // ── Tuesday ──
  { id:'c17', name:'A-Level Economics',    group:'Year 12 – Group A', teacher:'Rebecca Stone', day:'Tuesday',   time:'10:00–11:30', room:'Room 9', students:8,  capacity:12, status:'active', tags:['A-Level'] },
  { id:'c18', name:'GCSE Geography',       group:'Year 10 – Group A', teacher:'Aisha Begum',   day:'Tuesday',   time:'11:00–12:30', room:'Room 1', students:9,  capacity:12, status:'active', tags:['GCSE'] },
  { id:'c19', name:'GCSE Spanish',         group:'Year 10 – Group A', teacher:'Claire Dubois', day:'Tuesday',   time:'13:00–14:30', room:'Room 8', students:7,  capacity:12, status:'active', tags:['GCSE'] },
  { id:'c20', name:'A-Level Physics',      group:'Year 12 – Group A', teacher:'David Park',    day:'Tuesday',   time:'15:00–16:30', room:'Room 7', students:6,  capacity:8,  status:'active', tags:['A-Level'] },

  // ── Wednesday ──
  { id:'c21', name:'GCSE Biology',         group:'Year 11 – Group A', teacher:'James Okafor',  day:'Wednesday', time:'10:00–11:30', room:'Lab 3', students:10, capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c22', name:'GCSE Business',        group:'Year 11 – Group B', teacher:'Rebecca Stone', day:'Wednesday', time:'13:00–14:30', room:'Room 9', students:9,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c23', name:'GCSE English Lit.',    group:'Year 11 – Group A', teacher:'Marcus Webb',   day:'Wednesday', time:'14:00–15:30', room:'Room 2', students:8,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c24', name:'GCSE History',         group:'Year 10 – Group A', teacher:'Helen Yoo',     day:'Wednesday', time:'15:00–16:30', room:'Room 4', students:8,  capacity:12, status:'active', tags:['GCSE'] },

  // ── Thursday ──
  { id:'c25', name:'GCSE Mathematics',     group:'Year 11 – Group A', teacher:'Tom Rivera',    day:'Thursday',  time:'09:00–10:30', room:'Room 5', students:8,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c26', name:'GCSE French',          group:'Year 11 – Group A', teacher:'Claire Dubois', day:'Thursday',  time:'11:00–12:30', room:'Room 8', students:7,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c27', name:'A-Level Economics',    group:'Year 13 – Group A', teacher:'Rebecca Stone', day:'Thursday',  time:'14:00–15:30', room:'Room 9', students:5,  capacity:10, status:'active', tags:['A-Level','Exam Year'] },

  // ── Friday ──
  { id:'c28', name:'GCSE Science',         group:'Year 9 – Group A',  teacher:'James Okafor',  day:'Friday',    time:'09:00–10:30', room:'Lab 3', students:11, capacity:12, status:'active', tags:['GCSE'] },
  { id:'c29', name:'GCSE Computer Science',group:'Year 11 – Group A', teacher:'Daniel Mehta',  day:'Friday',    time:'10:30–12:00', room:'Lab 1', students:9,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c30', name:'GCSE Geography',       group:'Year 9 – Group B',  teacher:'Aisha Begum',   day:'Friday',    time:'11:00–12:30', room:'Room 1', students:9,  capacity:12, status:'active', tags:['GCSE'] },
  { id:'c31', name:'A-Level Chemistry',    group:'Year 13 – Group A', teacher:'David Park',    day:'Friday',    time:'13:00–14:30', room:'Room 7', students:5,  capacity:8,  status:'active', tags:['A-Level','Exam Year'] },
  { id:'c32', name:'GCSE Spanish',         group:'Year 11 – Group B', teacher:'Claire Dubois', day:'Friday',    time:'14:00–15:30', room:'Room 8', students:8,  capacity:12, status:'active', tags:['GCSE','Exam Year'] },
  { id:'c33', name:'GCSE Business',        group:'Year 10 – Group A', teacher:'Rebecca Stone', day:'Friday',    time:'15:00–16:30', room:'Room 9', students:7,  capacity:12, status:'active', tags:['GCSE'] },
];

// Students now persist in the shared store too (alongside teachers + classes) so
// the enrol flow, profile page and class enrolment all reflect each other.
const SEED_STUDENTS = [
  { id:'s1', firstName:'Emma',     lastName:'Thompson',  year:'Yr 10', dob:'2009-04-12', email:'emma.t@email.com',    phone:'07700 901001', address:'12 Oak Lane, Leeds',     subjects:['Mathematics','English'], classIds:['c1','c8'], guardianName:'Karen Thompson', guardianRelation:'Mother', guardianEmail:'k.thompson@email.com', guardianPhone:'07700 911001', notes:'', attendance:91, hw:82, score:76, status:'active',  teacher:'Sarah Clarke / Marcus Webb', lastSeen:'Today' },
  { id:'s2', firstName:'Oliver',   lastName:'Chen',      year:'Yr 12', dob:'2007-09-03', email:'oliver.c@email.com',  phone:'07700 901002', address:'4 Elm Court, Leeds',     subjects:['Mathematics','Further Maths','Physics'], classIds:['c3'], guardianName:'Wei Chen', guardianRelation:'Father', guardianEmail:'w.chen@email.com', guardianPhone:'07700 911002', notes:'', attendance:98, hw:96, score:94, status:'active', teacher:'Sarah Clarke / David Park', lastSeen:'Today' },
  { id:'s3', firstName:'Sophia',   lastName:'Patel',     year:'Yr 10', dob:'2009-01-22', email:'sophia.p@email.com',  phone:'07700 901003', address:'88 Birch Rd, Leeds',     subjects:['Mathematics'], classIds:['c1'], guardianName:'Anita Patel', guardianRelation:'Mother', guardianEmail:'a.patel@email.com', guardianPhone:'07700 911003', notes:'', attendance:88, hw:74, score:68, status:'active', teacher:'Sarah Clarke', lastSeen:'Yesterday' },
  { id:'s4', firstName:'James',    lastName:'Wilson',    year:'Yr 11', dob:'2008-06-30', email:'james.w@email.com',   phone:'07700 901004', address:'21 Maple Ave, Leeds',    subjects:['Mathematics','Science'], classIds:['c2','c6'], guardianName:'Paul Wilson', guardianRelation:'Father', guardianEmail:'p.wilson@email.com', guardianPhone:'07700 911004', notes:'', attendance:85, hw:71, score:71, status:'active', teacher:'Sarah Clarke / Priya Nair', lastSeen:'Yesterday' },
  { id:'s5', firstName:'Amelia',   lastName:'Roberts',   year:'Yr 11', dob:'2008-11-08', email:'amelia.r@email.com',  phone:'07700 901005', address:'7 Cedar Close, Leeds',   subjects:['English Literature'], classIds:['c8'], guardianName:'Diane Roberts', guardianRelation:'Mother', guardianEmail:'d.roberts@email.com', guardianPhone:'07700 911005', notes:'Attendance concern — follow up.', attendance:76, hw:35, score:52, status:'at-risk', teacher:'Marcus Webb', lastSeen:'14 Apr' },
  { id:'s6', firstName:'Noah',     lastName:'Fitzgerald',year:'Yr 10', dob:'2009-02-17', email:'noah.f@email.com',    phone:'07700 901006', address:'33 Willow St, Leeds',    subjects:['Mathematics','Science'], classIds:['c1','c5'], guardianName:'Sean Fitzgerald', guardianRelation:'Father', guardianEmail:'s.fitz@email.com', guardianPhone:'07700 911006', notes:'', attendance:68, hw:48, score:55, status:'at-risk', teacher:'Sarah Clarke / Priya Nair', lastSeen:'8 Apr' },
  { id:'s7', firstName:'Isabella', lastName:'Martinez',  year:'Yr 12', dob:'2007-07-14', email:'bella.m@email.com',   phone:'07700 901007', address:'15 Pine Way, Leeds',     subjects:['Mathematics','Further Maths'], classIds:['c3'], guardianName:'Carmen Martinez', guardianRelation:'Mother', guardianEmail:'c.martinez@email.com', guardianPhone:'07700 911007', notes:'', attendance:97, hw:95, score:91, status:'active', teacher:'Sarah Clarke', lastSeen:'Today' },
  { id:'s8', firstName:'Ethan',    lastName:'Huang',     year:'Yr 11', dob:'2008-03-25', email:'ethan.h@email.com',   phone:'07700 901008', address:'2 Ash Grove, Leeds',     subjects:['Mathematics','Physics'], classIds:['c2'], guardianName:'Li Huang', guardianRelation:'Father', guardianEmail:'l.huang@email.com', guardianPhone:'07700 911008', notes:'', attendance:93, hw:88, score:83, status:'active', teacher:'Sarah Clarke / David Park', lastSeen:'Today' },
  { id:'s9', firstName:'Mia',      lastName:'Okonkwo',   year:'Yr 9',  dob:'2010-05-19', email:'mia.o@email.com',     phone:'07700 901009', address:'9 Rowan Dr, Leeds',      subjects:['Science','English'], classIds:['c5','c8'], guardianName:'Grace Okonkwo', guardianRelation:'Mother', guardianEmail:'g.okonkwo@email.com', guardianPhone:'07700 911009', notes:'', attendance:95, hw:90, score:79, status:'active', teacher:'Priya Nair / Marcus Webb', lastSeen:'Yesterday' },
  { id:'s10', firstName:'Liam',    lastName:'Thornton',  year:'Yr 10', dob:'2009-08-02', email:'liam.t@email.com',    phone:'07700 901010', address:'41 Beech Rd, Leeds',     subjects:['Science','Chemistry'], classIds:['c5','c7'], guardianName:'Mark Thornton', guardianRelation:'Father', guardianEmail:'m.thornton@email.com', guardianPhone:'07700 911010', notes:'Test score dropped — monitor.', attendance:82, hw:62, score:63, status:'at-risk', teacher:'Priya Nair / David Park', lastSeen:'17 Apr' },
  { id:'s11', firstName:'Zoe',     lastName:'Patterson', year:'Yr 11', dob:'2008-12-11', email:'zoe.p@email.com',     phone:'07700 901011', address:'6 Holly Court, Leeds',   subjects:['Chemistry','Biology'], classIds:['c7'], guardianName:'Rachel Patterson', guardianRelation:'Mother', guardianEmail:'r.patterson@email.com', guardianPhone:'07700 911011', notes:'No submissions in 2 weeks.', attendance:79, hw:44, score:61, status:'at-risk', teacher:'David Park', lastSeen:'10 Apr' },
  { id:'s12', firstName:'Aiden',   lastName:'Foster',    year:'Yr 9',  dob:'2010-03-07', email:'aiden.f@email.com',   phone:'07700 901012', address:'18 Sycamore Ave, Leeds', subjects:['Mathematics'], classIds:['c4'], guardianName:'Claire Foster', guardianRelation:'Mother', guardianEmail:'c.foster@email.com', guardianPhone:'07700 911012', notes:'', attendance:94, hw:85, score:81, status:'active', teacher:'Sarah Clarke', lastSeen:'Today' },
  { id:'s13', firstName:'Priya',   lastName:'Nair',      year:'Yr 10', dob:'2009-06-23', email:'priya.n@email.com',   phone:'07700 901013', address:'27 Laurel St, Leeds',    subjects:['Computer Science','Mathematics'], classIds:['c1','c10'], guardianName:'Vijay Nair', guardianRelation:'Father', guardianEmail:'v.nair@email.com', guardianPhone:'07700 911013', notes:'', attendance:90, hw:79, score:75, status:'active', teacher:'Sarah Clarke / Daniel Mehta', lastSeen:'Today' },
  { id:'s14', firstName:'Thomas',  lastName:'Hughes',    year:'Yr 13', dob:'2006-10-30', email:'thomas.h@email.com',  phone:'07700 901014', address:'3 Fir Close, Leeds',     subjects:['Physics','Further Maths'], classIds:['c13'], guardianName:'Linda Hughes', guardianRelation:'Mother', guardianEmail:'l.hughes@email.com', guardianPhone:'07700 911014', notes:'', attendance:96, hw:92, score:88, status:'active', teacher:'David Park', lastSeen:'Yesterday' },
  { id:'s15', firstName:'Aisha',   lastName:'Rahman',    year:'Yr 11', dob:'2008-09-15', email:'aisha.r@email.com',   phone:'07700 901015', address:'52 Chestnut Rd, Leeds',  subjects:['Geography','Science'], classIds:['c6','c12'], guardianName:'Yusuf Rahman', guardianRelation:'Father', guardianEmail:'y.rahman@email.com', guardianPhone:'07700 911015', notes:'', attendance:97, hw:88, score:82, status:'active', teacher:'Priya Nair / Aisha Begum', lastSeen:'Today' },
];

// Subjects are the academic offerings that classes, teachers and students sit
// under. Each class/student/teacher links to a subject by name, so the cards on
// the Subjects view can roll up how many classes and people fall under each one.
const SEED_SUBJECTS = [
  { id:'sub1', name:'Mathematics',        level:'GCSE & A-Level', color:'#4F46E5', description:'Number, algebra, geometry and statistics across GCSE and A-Level.' },
  { id:'sub2', name:'Science',            level:'GCSE',           color:'#0891B2', description:'Combined and separate sciences at GCSE level.' },
  { id:'sub3', name:'Chemistry',          level:'A-Level',        color:'#0D9488', description:'A-Level chemistry — physical, organic and inorganic.' },
  { id:'sub4', name:'English Literature', level:'GCSE',           color:'#D97706', description:'Prose, poetry and drama for GCSE English Literature.' },
  { id:'sub5', name:'History',            level:'GCSE',           color:'#DC2626', description:'Modern and medieval history at GCSE.' },
  { id:'sub6', name:'Computer Science',   level:'GCSE & A-Level', color:'#7C3AED', description:'Programming, algorithms and computer systems at GCSE and A-Level.' },
  { id:'sub7', name:'Geography',          level:'GCSE',           color:'#DB2777', description:'Physical and human geography for GCSE.' },
  { id:'sub8', name:'Physics',            level:'A-Level',        color:'#2563EB', description:'A-Level physics — mechanics, fields and particle physics.' },
  { id:'sub9', name:'Biology',            level:'GCSE & A-Level', color:'#9333EA', description:'Cells, genetics, ecology and physiology at GCSE and A-Level.' },
  { id:'sub10',name:'French',             level:'GCSE',           color:'#059669', description:'Spoken and written French for GCSE.' },
  { id:'sub11',name:'Spanish',            level:'GCSE',           color:'#10B981', description:'Spoken and written Spanish for GCSE.' },
  { id:'sub12',name:'Economics',          level:'A-Level',        color:'#EA580C', description:'Micro and macroeconomics at A-Level.' },
  { id:'sub13',name:'Business',           level:'GCSE',           color:'#F59E0B', description:'Enterprise, finance and operations for GCSE Business.' },
];

// ── Configurable dimensions ──────────────────────────────────────────────────
// Year groups, levels and exam boards are NOT fixed enums — they are values the
// centre admin creates and reuses. Each is a simple { id, name } list the admin
// can append to from the "Create a class" form; new values persist to the store
// and become selectable everywhere. (Subjects already live in SEED_SUBJECTS above.)
const SEED_YEAR_GROUPS = [
  { id:'yg7',  name:'Year 7'  }, { id:'yg8',  name:'Year 8'  }, { id:'yg9',  name:'Year 9'  },
  { id:'yg10', name:'Year 10' }, { id:'yg11', name:'Year 11' }, { id:'yg12', name:'Year 12' },
  { id:'yg13', name:'Year 13' },
];

const SEED_LEVELS = [
  { id:'lvl-ks3',   name:'KS3'         },
  { id:'lvl-gcse',  name:'GCSE'        },
  { id:'lvl-alvl',  name:'A-Level'     },
  { id:'lvl-entry', name:'Entry Level' },
  { id:'lvl-ib',    name:'IB'          },
];

const SEED_EXAM_BOARDS = [
  { id:'eb-aqa',     name:'AQA'         },
  { id:'eb-edexcel', name:'Edexcel'     },
  { id:'eb-ocr',     name:'OCR'         },
  { id:'eb-wjec',    name:'WJEC'        },
  { id:'eb-cie',     name:'Cambridge (CIE)' },
];

const allStudents = [
  { name:'Emma Thompson',    year:'Yr 10', subjects:['Mathematics','English'],     attendance:91, hw:82, score:76, status:'active',   teacher:'Ms. Clarke / Mr. Webb',  lastSeen:'Today'     },
  { name:'Oliver Chen',      year:'Yr 12', subjects:['Mathematics','Further Maths','Physics'], attendance:98, hw:96, score:94, status:'active', teacher:'Ms. Clarke / Mr. Park', lastSeen:'Today' },
  { name:'Sophia Patel',     year:'Yr 10', subjects:['Mathematics'],              attendance:88, hw:74, score:68, status:'active',   teacher:'Ms. Clarke',             lastSeen:'Yesterday' },
  { name:'James Wilson',     year:'Yr 11', subjects:['Mathematics','Science'],    attendance:85, hw:71, score:71, status:'active',   teacher:'Ms. Clarke / Ms. Nair',  lastSeen:'Yesterday' },
  { name:'Amelia Roberts',   year:'Yr 11', subjects:['English Literature'],       attendance:76, hw:35, score:52, status:'at-risk',  teacher:'Mr. Webb',               lastSeen:'14 Apr'    },
  { name:'Noah Fitzgerald',  year:'Yr 10', subjects:['Mathematics','Science'],    attendance:68, hw:48, score:55, status:'at-risk',  teacher:'Ms. Clarke / Ms. Nair',  lastSeen:'8 Apr'     },
  { name:'Isabella Martinez',year:'Yr 12', subjects:['Mathematics','Further Maths'], attendance:97, hw:95, score:91, status:'active', teacher:'Ms. Clarke',            lastSeen:'Today'     },
  { name:'Ethan Huang',      year:'Yr 11', subjects:['Mathematics','Physics'],   attendance:93, hw:88, score:83, status:'active',   teacher:'Ms. Clarke / Mr. Park',  lastSeen:'Today'     },
  { name:'Mia Okonkwo',      year:'Yr 9',  subjects:['Science','English'],        attendance:95, hw:90, score:79, status:'active',   teacher:'Ms. Nair / Mr. Webb',    lastSeen:'Yesterday' },
  { name:'Liam Thornton',    year:'Yr 10', subjects:['Science','Chemistry'],      attendance:82, hw:62, score:63, status:'at-risk',  teacher:'Ms. Nair',               lastSeen:'17 Apr'    },
  { name:'Zoe Patterson',    year:'Yr 11', subjects:['Chemistry','Biology'],      attendance:79, hw:44, score:61, status:'at-risk',  teacher:'Mr. Park',               lastSeen:'10 Apr'    },
  { name:'Aiden Foster',     year:'Yr 9',  subjects:['Mathematics'],              attendance:94, hw:85, score:81, status:'active',   teacher:'Ms. Clarke',             lastSeen:'Today'     },
  { name:'Priya Nair',       year:'Yr 10', subjects:['Computer Science','Mathematics'], attendance:90, hw:79, score:75, status:'active', teacher:'Ms. Clarke / Mr. Mehta', lastSeen:'Today' },
  { name:'Thomas Hughes',    year:'Yr 13', subjects:['Physics','Further Maths'],  attendance:96, hw:92, score:88, status:'active',   teacher:'Mr. Park',               lastSeen:'Yesterday' },
  { name:'Aisha Rahman',     year:'Yr 11', subjects:['Geography','Science'],      attendance:97, hw:88, score:82, status:'active',   teacher:'Ms. Nair / Ms. Begum',   lastSeen:'Today'     },
];
