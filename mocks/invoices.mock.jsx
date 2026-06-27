// ══════════════════════════════════════════════════════════════
//  Mock data — Invoices (seeds the invoices ledger store)
//  Loaded as a global script before Invoices.jsx (see index.html).
//
//  The Invoices module is a LEDGER + workflow layer — no payment ever
//  flows through the system. Each Invoice owns a schedule of
//  ScheduledPayments; the invoice's status is always DERIVED from that
//  schedule (never stored). Reminders + audit events are append-only logs.
//
//  Dates are generated relative to "now" at first load so the demo always
//  shows a realistic mix of scheduled / partial / overdue / paid invoices
//  regardless of when it's opened. After first load the seed is frozen in
//  localStorage (tutoros.invoices.v1).
// ══════════════════════════════════════════════════════════════

// yyyy-mm-dd, `off` days from today (negative = past, positive = future).
const invSeedDate = (off = 0) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
};
// Full ISO timestamp `off` days ago — used for reminder / audit logs.
const invSeedStamp = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toISOString();
};

// ── Families ─────────────────────────────────────────────────────────────────
// A family is the billing party (the "account"). Students belong to a family;
// invoices are addressed to the family and reminders email the registered
// parent. `email: ''` models the "no email on file" state the UI must handle.
// studentIds / guardian fields line up with SEED_STUDENTS in adminPages.mock.jsx.
const SEED_FAMILIES = [
  { id:'f_chen',     name:'Chen family',       parent:'Wei Chen',        email:'w.chen@email.com',      phone:'07700 911002', studentIds:['s2']  },
  { id:'f_thompson', name:'Thompson family',   parent:'Karen Thompson',  email:'k.thompson@email.com',  phone:'07700 911001', studentIds:['s1']  },
  { id:'f_patel',    name:'Patel family',      parent:'Anita Patel',     email:'a.patel@email.com',     phone:'07700 911003', studentIds:['s3']  },
  { id:'f_wilson',   name:'Wilson family',     parent:'Paul Wilson',     email:'p.wilson@email.com',    phone:'07700 911004', studentIds:['s4']  },
  { id:'f_roberts',  name:'Roberts family',    parent:'Diane Roberts',   email:'d.roberts@email.com',   phone:'07700 911005', studentIds:['s5']  },
  // No email on file — reminders must surface the "no email" state for this family.
  { id:'f_fitz',     name:'Fitzgerald family', parent:'Sean Fitzgerald', email:'',                      phone:'07700 911006', studentIds:['s6']  },
  { id:'f_martinez', name:'Martinez family',   parent:'Carmen Martinez', email:'c.martinez@email.com',  phone:'07700 911007', studentIds:['s7']  },
  { id:'f_huang',    name:'Huang family',      parent:'Li Huang',        email:'l.huang@email.com',     phone:'07700 911008', studentIds:['s8']  },
  { id:'f_okonkwo',  name:'Okonkwo family',    parent:'Grace Okonkwo',   email:'g.okonkwo@email.com',   phone:'07700 911009', studentIds:['s9']  },
  { id:'f_hughes',   name:'Hughes family',     parent:'Linda Hughes',    email:'l.hughes@email.com',    phone:'07700 911014', studentIds:['s14'] },
];

// ── Centre-level billing config ──────────────────────────────────────────────
// VAT/tax treatment is NOT hardcoded — it's configurable here (and per-invoice).
//   mode: 'none'      → tuition shown without any tax line
//         'exclusive' → tax added on top of the schedule total
//         'inclusive' → schedule total already includes tax (tax shown for info)
// Most UK tuition is VAT-exempt, so the centre default is 'none' but fully
// switchable. reminderCooldownHours rate-limits how often a family can be chased.
const INVOICE_DEFAULT_CONFIG = {
  taxLabel: 'VAT',
  taxRate: 0.20,
  taxMode: 'none',
  reminderCooldownHours: 24,
};

// ── Invoices + scheduled payments ────────────────────────────────────────────
// `total` is intentionally NOT stored — it is derived as the sum of the schedule.
// Each payment: { id, dueDate, amount, paidAt|null, paidBy|null, method|null }.
// taxMode/taxRate omitted here so invoices inherit the centre config above; set
// them per-invoice to override treatment for a single bill.
const SEED_INVOICES = [
  {
    id:'INV-0284', number:'INV-0284', familyId:'f_chen', studentIds:['s2'],
    classes:['A-Level Mathematics','Further Maths'], issuedDate:invSeedDate(-40),
    payments:[
      { id:'INV-0284-p1', dueDate:invSeedDate(-25), amount:160, paidAt:invSeedDate(-24), paidBy:'Lisa Chen', method:'card' },
      { id:'INV-0284-p2', dueDate:invSeedDate(5),   amount:160, paidAt:null, paidBy:null, method:null },
    ],
  },
  {
    id:'INV-0283', number:'INV-0283', familyId:'f_thompson', studentIds:['s1'],
    classes:['GCSE Mathematics'], issuedDate:invSeedDate(-45),
    payments:[
      { id:'INV-0283-p1', dueDate:invSeedDate(-30), amount:180, paidAt:invSeedDate(-28), paidBy:'Lisa Chen', method:'bank' },
    ],
  },
  {
    id:'INV-0282', number:'INV-0282', familyId:'f_patel', studentIds:['s3'],
    classes:['GCSE Mathematics'], issuedDate:invSeedDate(-45),
    payments:[
      { id:'INV-0282-p1', dueDate:invSeedDate(-30), amount:180, paidAt:invSeedDate(-29), paidBy:'Lisa Chen', method:'cash' },
    ],
  },
  {
    id:'INV-0281', number:'INV-0281', familyId:'f_roberts', studentIds:['s5'],
    classes:['GCSE English Lit.'], issuedDate:invSeedDate(-50),
    payments:[
      { id:'INV-0281-p1', dueDate:invSeedDate(-20), amount:180, paidAt:null, paidBy:null, method:null },
    ],
  },
  {
    id:'INV-0280', number:'INV-0280', familyId:'f_fitz', studentIds:['s6'],
    classes:['GCSE Mathematics','GCSE Science'], issuedDate:invSeedDate(-50),
    payments:[
      { id:'INV-0280-p1', dueDate:invSeedDate(-20), amount:180, paidAt:null, paidBy:null, method:null },
      { id:'INV-0280-p2', dueDate:invSeedDate(10),  amount:180, paidAt:null, paidBy:null, method:null },
    ],
  },
  {
    id:'INV-0279', number:'INV-0279', familyId:'f_martinez', studentIds:['s7'],
    classes:['A-Level Mathematics','Further Maths'], issuedDate:invSeedDate(-35),
    payments:[
      { id:'INV-0279-p1', dueDate:invSeedDate(-20), amount:160, paidAt:invSeedDate(-18), paidBy:'Lisa Chen', method:'bank' },
      { id:'INV-0279-p2', dueDate:invSeedDate(-5),  amount:160, paidAt:invSeedDate(-4),  paidBy:'Lisa Chen', method:'card' },
    ],
  },
  {
    id:'INV-0278', number:'INV-0278', familyId:'f_huang', studentIds:['s8'],
    classes:['GCSE Mathematics','A-Level Physics'], issuedDate:invSeedDate(-35),
    payments:[
      { id:'INV-0278-p1', dueDate:invSeedDate(-20), amount:120, paidAt:invSeedDate(-19), paidBy:'Lisa Chen', method:'card' },
      { id:'INV-0278-p2', dueDate:invSeedDate(10),  amount:120, paidAt:null, paidBy:null, method:null },
      { id:'INV-0278-p3', dueDate:invSeedDate(40),  amount:120, paidAt:null, paidBy:null, method:null },
    ],
  },
  {
    id:'INV-0277', number:'INV-0277', familyId:'f_wilson', studentIds:['s4'],
    classes:['GCSE Mathematics','GCSE Science'], issuedDate:invSeedDate(-10),
    payments:[
      { id:'INV-0277-p1', dueDate:invSeedDate(5),  amount:180, paidAt:null, paidBy:null, method:null },
      { id:'INV-0277-p2', dueDate:invSeedDate(35), amount:180, paidAt:null, paidBy:null, method:null },
    ],
  },
  {
    id:'INV-0285', number:'INV-0285', familyId:'f_okonkwo', studentIds:['s9'],
    classes:['GCSE Science','GCSE English Lit.'], issuedDate:invSeedDate(-5),
    payments:[
      { id:'INV-0285-p1', dueDate:invSeedDate(20), amount:240, paidAt:null, paidBy:null, method:null },
    ],
  },
  {
    id:'INV-0286', number:'INV-0286', familyId:'f_hughes', studentIds:['s14'],
    classes:['A-Level Physics','Further Maths'], issuedDate:invSeedDate(-60),
    payments:[
      { id:'INV-0286-p1', dueDate:invSeedDate(-45), amount:150, paidAt:invSeedDate(-44), paidBy:'Lisa Chen', method:'bank' },
      { id:'INV-0286-p2', dueDate:invSeedDate(-15), amount:150, paidAt:null, paidBy:null, method:null },
    ],
  },
];

// ── Reminder log (append-only) ───────────────────────────────────────────────
// { id, invoiceId, sentAt, toEmail } — powers "last reminded N days ago" and the
// per-family rate-limit. Fitzgerald has none on file, so they were never chased.
const SEED_INVOICE_REMINDERS = [
  { id:'rem1', invoiceId:'INV-0281', sentAt:invSeedStamp(-3),  toEmail:'d.roberts@email.com' },
  { id:'rem2', invoiceId:'INV-0286', sentAt:invSeedStamp(-6),  toEmail:'l.hughes@email.com'  },
  { id:'rem3', invoiceId:'INV-0278', sentAt:invSeedStamp(-12), toEmail:'l.huang@email.com'   },
];

// ── Audit trail (append-only) ────────────────────────────────────────────────
// { id, invoiceId, paymentId, action, actor, at, meta } — every state change is
// recorded here: issuance, marking/un-marking payments, reminders, reconciliation.
const SEED_INVOICE_AUDIT = [
  { id:'a1',  invoiceId:'INV-0284', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-40), meta:{} },
  { id:'a2',  invoiceId:'INV-0284', paymentId:'INV-0284-p1',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-24), meta:{ method:'card', amount:160 } },
  { id:'a3',  invoiceId:'INV-0283', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-45), meta:{} },
  { id:'a4',  invoiceId:'INV-0283', paymentId:'INV-0283-p1',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-28), meta:{ method:'bank', amount:180 } },
  { id:'a5',  invoiceId:'INV-0282', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-45), meta:{} },
  { id:'a6',  invoiceId:'INV-0282', paymentId:'INV-0282-p1',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-29), meta:{ method:'cash', amount:180 } },
  { id:'a7',  invoiceId:'INV-0281', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-50), meta:{} },
  { id:'a8',  invoiceId:'INV-0281', paymentId:null,         action:'reminder_sent',actor:'Lisa Chen',at:invSeedStamp(-3),  meta:{ toEmail:'d.roberts@email.com' } },
  { id:'a9',  invoiceId:'INV-0280', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-50), meta:{} },
  { id:'a10', invoiceId:'INV-0279', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-35), meta:{} },
  { id:'a11', invoiceId:'INV-0279', paymentId:'INV-0279-p1',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-18), meta:{ method:'bank', amount:160 } },
  { id:'a12', invoiceId:'INV-0279', paymentId:'INV-0279-p2',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-4),  meta:{ method:'card', amount:160 } },
  { id:'a13', invoiceId:'INV-0278', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-35), meta:{} },
  { id:'a14', invoiceId:'INV-0278', paymentId:'INV-0278-p1',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-19), meta:{ method:'card', amount:120 } },
  { id:'a15', invoiceId:'INV-0278', paymentId:null,         action:'reminder_sent',actor:'Lisa Chen',at:invSeedStamp(-12), meta:{ toEmail:'l.huang@email.com' } },
  { id:'a16', invoiceId:'INV-0277', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-10), meta:{} },
  { id:'a17', invoiceId:'INV-0285', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-5),  meta:{} },
  { id:'a18', invoiceId:'INV-0286', paymentId:null,         action:'issued',      actor:'Lisa Chen', at:invSeedStamp(-60), meta:{} },
  { id:'a19', invoiceId:'INV-0286', paymentId:'INV-0286-p1',action:'marked_paid', actor:'Lisa Chen', at:invSeedStamp(-44), meta:{ method:'bank', amount:150 } },
  { id:'a20', invoiceId:'INV-0286', paymentId:null,         action:'reminder_sent',actor:'Lisa Chen', at:invSeedStamp(-6),  meta:{ toEmail:'l.hughes@email.com' } },
];

Object.assign(window, {
  SEED_FAMILIES, SEED_INVOICES, SEED_INVOICE_REMINDERS, SEED_INVOICE_AUDIT, INVOICE_DEFAULT_CONFIG,
});
