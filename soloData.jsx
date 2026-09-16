// ══════════════════════════════════════════════════════════════════════════════
//  Solo tutor demo — state + derived model
// ──────────────────────────────────────────────────────────────────────────────
//  Session-only demo state (tier, page, registers taken, reopen reasons, payments,
//  concerns) and ONE derived model built from mocks/solo.mock.jsx + that state.
//  Nothing is persisted and nothing is written to the centre demo's stores.
//
//  Everything a solo page shows comes from soloModel(): the book (roster cut to the
//  tier's size), lessons, sessions with their register state, attendance rates,
//  invoices with status, balances and earnings. Pages never recompute these.
//  Capabilities come from soloCapabilities.jsx — this file never names a tier.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const F = window.SOLO_FIXTURES;
const H = 3600000, DAY = 86400000;

// ── Date helpers (local time) ────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = (iso) => { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const atTime = (iso, hhmm) => { const d = dateOf(iso); const t = hhmm.split(':').map(Number); d.setHours(t[0], t[1], 0, 0); return d; };
const dayNum = (d) => ((d.getDay() + 6) % 7) + 1;          // Mon = 1 … Sun = 7
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtShort = (iso) => { const d = dateOf(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtLong = (iso) => { const d = dateOf(iso); return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDay = (iso) => DAYS[dayNum(dateOf(iso)) - 1];
const fmtMonthYear = (ym) => { const p = ym.split('-').map(Number); return `${MONTHS_LONG[p[1] - 1]} ${p[0]}`; };
const fmtMins = (m) => (m % 60 === 0 ? `${m / 60}h` : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${pad(m % 60)}`);
const money = (n) => {
  const v = Math.round(n * 100) / 100;
  return `£${v.toLocaleString('en-GB', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};
// Deterministic small hash so generated fixtures are stable across renders.
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

const NOW = atTime(F.SOLO_NOW.date, F.SOLO_NOW.time);
const TODAY = F.SOLO_NOW.date;

// ── Demo state ───────────────────────────────────────────────────────────────
const state = {
  tier: window.SOLO_DEFAULT_TIER,
  page: 'dashboard',
  studentId: null,
  registers: {},   // sessionId → { marks, mins, takenAt }
  reopened: {},    // sessionId → { reason, at }
  payments: {},    // invoiceId → { paidOn, method }
  concerns: [],    // { id, studentId, at, what, action }
  version: 0,
};
const subs = new Set();
const update = (patch) => {
  Object.assign(state, patch);
  state.version += 1;
  subs.forEach(fn => fn());
};
const useSoloDemo = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  return state;
};

// ── Model ────────────────────────────────────────────────────────────────────
const priceOf = (lesson, mins) => lesson.rate * mins / 60;   // per student

let cache = { v: -1, m: null };
const soloModel = () => {
  if (cache.v === state.version) return cache.m;

  const caps = window.getSoloCapabilities(state.tier);
  const tier = window.getSoloTier(state.tier);

  // Book = the roster cut to this tier's size, in join order.
  const students = F.SOLO_STUDENTS.slice(0, tier.demoStudents).map((s, i) => ({ ...s, rank: i + 1 }));
  const studentById = {};
  students.forEach(s => { studentById[s.id] = s; });

  // Lessons with at least one student on the book. Groups only where the plan runs them.
  const lessons = F.SOLO_LESSONS
    .filter(l => l.kind === 'one' || caps.groupLessons)
    .map(l => ({ ...l, students: l.students.filter(id => studentById[id]) }))
    .filter(l => l.students.length > 0)
    .map(l => ({ ...l, title: l.kind === 'group' ? l.name : studentById[l.students[0]].name }));
  const lessonById = {};
  lessons.forEach(l => { lessonById[l.id] = l; });
  const lessonsFor = (sid) => lessons.filter(l => l.students.includes(sid));

  const gapSet = new Set(F.SOLO_REGISTER_GAPS.map(g => `${g.lesson}@${g.date}`));
  const absent = (sid, iso) => (F.SOLO_ABSENCES[sid] || []).includes(iso);
  const lateOf = (sid, iso) => (F.SOLO_LATES[sid] || []).find(x => x.date === iso);

  const sessionAt = (lesson, slot, iso) => {
    const id = `${lesson.id}@${iso}`;
    const start = atTime(iso, slot.start);
    const end = new Date(start.getTime() + slot.mins * 60000);
    const ended = end <= NOW;
    // The register: one taken in this demo session, else the fixture history.
    let register = state.registers[id] || null;
    if (!register && ended && !gapSet.has(id)) {
      const marks = {};
      lesson.students.forEach(sid => { marks[sid] = absent(sid, iso) ? 'absent' : lateOf(sid, iso) ? 'late' : 'present'; });
      const anyone = Object.values(marks).some(m => m !== 'absent');
      register = { marks, mins: anyone ? slot.mins : 0, history: true };
    }
    let status;
    if (register) status = 'taken';
    else if (NOW < new Date(start.getTime() - F.SOLO_REGISTER_RULES.opensBeforeMins * 60000)) status = 'upcoming';
    else if (NOW < end) status = 'live';
    else if (state.reopened[id]) status = 'open';
    else status = (NOW - end) < F.SOLO_REGISTER_RULES.windowHours * H ? 'open' : 'locked';
    const hoursLeft = Math.max(0, Math.floor((F.SOLO_REGISTER_RULES.windowHours * H - (NOW - end)) / H));
    const opensAt = new Date(start.getTime() - F.SOLO_REGISTER_RULES.opensBeforeMins * 60000);
    // Amount earned: one-to-one by time delivered; groups by places on the lesson.
    const amount = !register ? 0
      : lesson.kind === 'group' ? lesson.students.length * priceOf(lesson, register.mins ? slot.mins : 0)
      : priceOf(lesson, register.mins);
    return {
      id, lesson, iso, start, end, mins: slot.mins, register, status, amount,
      late: status === 'open' && !state.reopened[id] && end < NOW,
      reopened: state.reopened[id] || null,
      hoursLeft, daysAgo: Math.floor((dateOf(TODAY) - dateOf(iso)) / DAY),
      opensAt: clock(opensAt),
    };
  };

  const sessionsBetween = (fromIso, toIso) => {
    const out = [];
    for (let d = dateOf(fromIso); d <= dateOf(toIso); d = addDays(d, 1)) {
      const iso = isoOf(d), n = dayNum(d);
      lessons.forEach(l => l.slots.forEach(slot => { if (slot.day === n) out.push(sessionAt(l, slot, iso)); }));
    }
    return out.sort((a, b) => a.start - b.start);
  };

  const history = sessionsBetween(F.SOLO_HISTORY_FROM, TODAY);
  const past = history.filter(s => s.end <= NOW);
  const today = history.filter(s => s.iso === TODAY);
  const needsRegister = past.filter(s => s.status === 'open' || s.status === 'locked').sort((a, b) => b.start - a.start);
  const registersToTake = history.filter(s => s.status === 'open' || s.status === 'live').length;

  // Attendance over the last 8 weeks of taken registers.
  const since = addDays(dateOf(TODAY), -56);
  const attendance = {};
  students.forEach(s => { attendance[s.id] = { marks: 0, attended: 0, recent: [] }; });
  past.filter(s => s.register && s.start >= since).forEach(s => {
    Object.keys(s.register.marks).forEach(sid => {
      const a = attendance[sid]; if (!a) return;
      const mark = s.register.marks[sid];
      a.marks += 1; if (mark !== 'absent') a.attended += 1;
      a.recent.push({ session: s, mark, note: (lateOf(sid, s.iso) || {}).note });
    });
  });
  Object.keys(attendance).forEach(sid => {
    const a = attendance[sid];
    a.rate = a.marks ? Math.round(100 * a.attended / a.marks) : null;
    a.missed = a.marks - a.attended;
    a.recent.sort((x, y) => y.session.start - x.session.start);
  });

  // ── Invoices ──
  const families = {};
  students.forEach(s => { (families[s.family] = families[s.family] || []).push(s); });
  const monthIso = TODAY.slice(0, 7);
  const monthStart = `${monthIso}-01`;
  const monthEndD = new Date(dateOf(monthStart).getFullYear(), dateOf(monthStart).getMonth() + 1, 0);
  const handWritten = F.SOLO_INVOICES.filter(inv => inv.students.every(id => studentById[id]));
  const invoicedThisMonth = new Set(handWritten.filter(i => i.issued.startsWith(monthIso)).map(i => i.family));
  const sessionsInMonth = sessionsBetween(monthStart, isoOf(monthEndD));
  const generated = Object.keys(families)
    .filter(f => !invoicedThisMonth.has(f) && families[f].every(s => s.billing !== 'termly'))
    .map(f => {
      const kids = families[f];
      let amount = 0; const bits = [];
      kids.forEach(k => {
        const parts = [];
        lessonsFor(k.id).forEach(l => {
          const n = sessionsInMonth.filter(s => s.lesson.id === l.id).length;
          amount += n * priceOf(l, l.slots[0].mins);
          parts.push(l.kind === 'group' ? `${l.name} ×${n}` : `${n} lessons`);
        });
        bits.push(`${k.first} · ${parts.join(' + ')}`);
      });
      const h = hash(f);
      const firstRank = Math.min.apply(null, kids.map(k => k.rank));
      const inv = {
        id: `INV-${String(100 + firstRank).padStart(4, '0')}`, family: f, students: kids.map(k => k.id),
        covers: bits.join(' · '), issued: monthStart, due: `${monthIso}-30`, amount,
      };
      if (h % 10 < 3) { inv.paidOn = `${monthIso}-${pad(3 + h % 8)}`; inv.method = h % 2 ? 'Bank transfer' : 'Card'; }
      else if (h % 10 === 3) inv.draft = true;
      else if (h % 10 === 9) inv.due = `${monthIso}-07`;
      return inv;
    });
  const invoices = handWritten.concat(generated).map(inv => {
    const pay = state.payments[inv.id];
    const paidOn = inv.paidOn || (pay && pay.paidOn) || null;
    const method = inv.method || (pay && pay.method) || null;
    const daysLate = Math.floor((dateOf(TODAY) - dateOf(inv.due)) / DAY);
    const status = paidOn ? 'paid' : inv.draft ? 'draft' : daysLate > 0 ? 'overdue' : 'sent';
    const lead = studentById[inv.students[0]];
    return {
      ...inv, paidOn, method, status, daysLate: status === 'overdue' ? daysLate : 0,
      familyName: `${lead.last} family`, billTo: lead.guardian,
      studentNames: inv.students.map(id => studentById[id].first),
    };
  }).sort((a, b) => (b.issued.localeCompare(a.issued)) || a.id.localeCompare(b.id));

  const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdue = unpaid.filter(i => i.status === 'overdue');
  const balances = {};
  students.forEach(s => { balances[s.id] = 0; });
  unpaid.forEach(i => i.students.forEach(id => { balances[id] += i.amount / i.students.length; }));
  const raisedThisMonth = invoices.filter(i => i.issued.startsWith(monthIso)).length;

  // ── Earnings (this month, from registers) ──
  const monthSessions = past.filter(s => s.iso.startsWith(monthIso));
  const counted = monthSessions.filter(s => s.register);
  const earned = counted.reduce((t, s) => t + s.amount, 0);
  const minsTaught = counted.reduce((t, s) => t + (s.register.mins || 0), 0);
  const perHour = (list) => {
    const mins = list.reduce((t, s) => t + (s.register.mins || 0), 0);
    return mins ? list.reduce((t, s) => t + s.amount, 0) / (mins / 60) : 0;
  };
  const oneToOne = counted.filter(s => s.lesson.kind === 'one');
  const groups = counted.filter(s => s.lesson.kind === 'group');
  const billedThisMonth = invoices.filter(i => i.issued.startsWith(monthIso)).reduce((t, i) => t + i.amount, 0);
  const receivedThisMonth = invoices.filter(i => i.paidOn && i.paidOn.startsWith(monthIso)).reduce((t, i) => t + i.amount, 0);
  const weeklyValue = lessons.reduce((t, l) => t + l.slots.reduce((u, sl) => u + priceOf(l, sl.mins) * l.students.length, 0), 0);
  const monthValue = sessionsInMonth.reduce((t, s) => t + priceOf(s.lesson, s.mins) * s.lesson.students.length, 0);
  const trend = F.SOLO_SEASON.map(m => ({ month: m.month, value: Math.round(monthValue * m.share) }))
    .concat([{ month: MONTHS[dateOf(TODAY).getMonth()], value: Math.round(monthValue) }]);

  // ── Tracking marks (hand-written where the demo talks about a student) ──
  const topics = { Maths: ['Algebra check', 'Past paper', 'Topic test'], Physics: ['Forces quiz', 'Past paper', 'Required practical'], Chemistry: ['Moles quiz', 'Past paper', 'Bonding test'], Science: ['Cells quiz', 'Topic test', 'Energy check'] };
  const tracking = {};
  students.forEach(s => {
    if (F.SOLO_TRACKING[s.id]) { tracking[s.id] = F.SOLO_TRACKING[s.id]; return; }
    const h = hash(s.id);
    const key = Object.keys(topics).find(k => s.subject.includes(k)) || 'Maths';
    tracking[s.id] = topics[key].map((title, i) => ({
      title, date: isoOf(addDays(dateOf(TODAY), -((2 - i) * 7 + 2 + (h % 3)))), score: 12 + ((h >> (i * 3)) % 8), out: 20,
    }));
  });

  // ── Worth a look (at-risk signals, only surfaced where the plan flags them) ──
  const watch = [];
  students.forEach(s => {
    const a = attendance[s.id], marks = tracking[s.id] || [];
    if (a.rate != null && a.rate < 75) watch.push({ student: s, kind: 'attendance', label: `Attendance ${a.rate}%`, sub: `Missed ${a.missed} of the last ${a.marks} lessons` });
    else if (marks.length >= 3 && (marks[marks.length - 1].score / marks[marks.length - 1].out) < (marks[0].score / marks[0].out) - 0.2) watch.push({ student: s, kind: 'slipping', label: 'Slipping', sub: `${marks[0].score}/${marks[0].out} to ${marks[marks.length - 1].score}/${marks[marks.length - 1].out} since ${fmtShort(marks[0].date)}` });
    const returned = F.SOLO_HOMEWORK_RETURNED[s.id];
    if (returned && (dateOf(TODAY) - dateOf(returned)) >= 21 * DAY) watch.push({ student: s, kind: 'homework', label: 'Homework', sub: `No homework returned in ${Math.floor((dateOf(TODAY) - dateOf(returned)) / (7 * DAY))} weeks` });
  });

  const reportsDue = F.SOLO_REPORTS_DUE.filter(r => studentById[r.student]).map(r => ({ ...r, s: studentById[r.student] }));

  const nextLessonFor = (sid) => sessionsBetween(TODAY, isoOf(addDays(dateOf(TODAY), 7)))
    .find(s => s.lesson.students.includes(sid) && s.end > NOW) || null;

  const m = {
    now: NOW, today: TODAY, tier, caps, tutor: F.SOLO_TUTOR,
    students, studentById, lessons, lessonById, lessonsFor, families,
    sessionsBetween, history, past, todaySessions: today, needsRegister, registersToTake,
    attendance, invoices, unpaid, overdue, balances, raisedThisMonth,
    earnings: { earned, minsTaught, perHourOne: perHour(oneToOne), perHourGroup: perHour(groups), perHourAll: perHour(counted), billedThisMonth, receivedThisMonth, monthSessions, weeklyValue, trend },
    tracking, watch, reportsDue, nextLessonFor,
    waitingList: F.SOLO_WAITING_LIST, escalation: F.SOLO_ESCALATION, reportsPublished: F.SOLO_REPORTS_PUBLISHED,
    concerns: state.concerns,
    storageUsed: tier.demoStorageBytes, monthLabel: MONTHS_LONG[dateOf(TODAY).getMonth()],
  };
  cache = { v: state.version, m };
  return m;
};

// ── Actions ──────────────────────────────────────────────────────────────────
const soloActions = {
  enter: () => update({ page: 'dashboard', studentId: null }),
  nav: (page, studentId) => update({ page: page || 'dashboard', studentId: studentId != null ? studentId : state.studentId }),
  setTier: (tier) => update({ tier }),
  takeRegister: (sessionId, marks, mins) => {
    const registers = { ...state.registers, [sessionId]: { marks, mins, takenAt: NOW.getTime() } };
    update({ registers });
  },
  reopen: (sessionId, reason) => update({ reopened: { ...state.reopened, [sessionId]: { reason, at: NOW.getTime() } } }),
  recordPayment: (invoiceId, method) => update({ payments: { ...state.payments, [invoiceId]: { paidOn: TODAY, method } } }),
  logConcern: (entry) => update({ concerns: [{ id: `c${state.concerns.length + 1}`, at: NOW.getTime(), ...entry }].concat(state.concerns) }),
};

Object.assign(window, {
  useSoloDemo, soloModel, soloActions,
  soloFmt: { isoOf, dateOf, addDays, dayNum, clock, fmtShort, fmtLong, fmtDay, fmtMonthYear, fmtMins, money, DAYS, MONTHS },
});

})();
