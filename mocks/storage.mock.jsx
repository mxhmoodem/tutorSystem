// ══════════════════════════════════════════════════════════════
//  TutorOS — Storage usage & quota seed data
//  Loaded AFTER mocks/onboarding.mock.jsx + mocks/plans.mock.jsx (needs
//  PLANS / centre ids) and consumed by Storage.jsx (the derivation store).
//
//  Frontend-only. There is NO real cloud storage — every usage figure and
//  cost in the app is DERIVED live from the file records seeded here. Nothing
//  here is a running total; totals are computed on render (see Storage.jsx).
//
//  Two seeds:
//    • STORAGE_ACCOUNTS_SEED — the ACCOUNT layer (the tenancy tier above centre).
//      One paying account owns 1–20 centres. Subscription/plan/quota attach to
//      the account, not the centre. This is the platform (owner) registry.
//    • STORAGE_FILES_SEED — mock uploaded-file records spread across categories
//      and centres, summing to a believable few GB per centre so usage bars and
//      illustrative costs render meaningfully. Guarded/idempotent seed in
//      Storage.jsx never overwrites real (edited) data.
// ══════════════════════════════════════════════════════════════

// Binary GB — the whole app talks in "GB"; keep one definition so derived
// usage matches the plan's storageGb allowance and the sidebar meter.
const STORAGE_GB = 1024 * 1024 * 1024;

// Top-up unit + illustrative rate (owner-facing, always labelled illustrative).
const STORAGE_ADDON_BLOCK_GB    = 100;     // one add-on block = 100 GB
const STORAGE_ADDON_BLOCK_PRICE = 5;       // £5 / month per block
const STORAGE_UNIT_COST_USD_GB  = 0.015;   // ≈ Cloudflare R2 Standard, $/GB/month

// The signed-in demo identity's (Lisa Chen's) account — her admin Storage panel
// derives from the LIVE subscription store (Centres.jsx), so its centres/plan
// stay in sync as she edits them. The registry below mirrors it for the owner
// view. Files for her centres carry this accountId.
const STORAGE_SELF_ACCOUNT_ID = 'acc_brightminds';

// ─── Account registry (owner / platform view) ────────────────────────────────
// A realistic spread: one Starter single-centre account, the demo Growth
// multi-centre account, and one larger Scale account. `centres` mirror the
// centre ids used by the file records below.
const STORAGE_ACCOUNTS_SEED = [
  {
    accountId: STORAGE_SELF_ACCOUNT_ID, name: 'Bright Minds Group',
    ownerEmail: 'lisa.chen@brightminds.co.uk', planId: 'growth',
    centres: [
      { id: 'bm',     name: 'Bright Minds Tuition' },
      { id: 'apex',   name: 'Apex Learning Centre' },
      { id: 'summit', name: 'Summit Academy' },
    ],
  },
  {
    accountId: 'acc_riverside', name: 'Riverside Tuition',
    ownerEmail: 'admin@riversidetuition.co.uk', planId: 'starter',
    centres: [
      { id: 'riverside', name: 'Riverside Tuition' },
    ],
  },
  {
    accountId: 'acc_northgate', name: 'Northgate Learning Trust',
    ownerEmail: 'ops@northgatelearning.org', planId: 'scale',
    centres: [
      { id: 'ng_central', name: 'Northgate Central' },
      { id: 'ng_south',   name: 'Northgate South' },
    ],
  },
];

// ─── Deterministic file-record generator ─────────────────────────────────────
// Seeded PRNG (mulberry32) so the seed is identical on every load — usage bars,
// costs and "largest/oldest" insights stay stable across renders/reloads.
const _stgRand = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const _STG_UPLOADERS = ['Lisa Chen', 'Marcus Webb', 'S. Clarke', 'H. Bell', 'Daniel Foster', 'Grace Adeyemi', 'Leo Whitfield', 'Ava Sinclair'];
const _STG_TODAY = new Date('2026-07-01');

// Per-centre category targets in MB (approximate — the generator splits each into
// a handful of files). Chosen so pooled/per-centre bars + costs look real:
//   Bright Minds (Growth, 50 GB pool)  ≈ 14 GB total across 3 centres
//   Riverside     (Starter, 10 GB)     ≈ 8.7 GB → near quota (drives upgrade CTA)
//   Northgate     (Scale, 200 GB)      ≈ 40 GB across 2 centres (comfortable)
const _STG_TARGETS = {
  bm:        { resources: 3200, submissions: 2600, question_attachments: 700, avatars: 120, comms_attachments: 380, invoices: 120, safeguarding: 48 },
  apex:      { resources: 2000, submissions: 1700, question_attachments: 500, avatars: 80,  comms_attachments: 220, invoices: 80,  safeguarding: 28 },
  summit:    { resources: 1100, submissions: 950,  question_attachments: 300, avatars: 50,  comms_attachments: 120, invoices: 30,  safeguarding: 10 },
  riverside: { resources: 4200, submissions: 3200, question_attachments: 900, avatars: 150, comms_attachments: 190, invoices: 60,  safeguarding: 9 },
  ng_central:{ resources: 12000,submissions: 10000,question_attachments: 3000,avatars: 400, comms_attachments: 900, invoices: 300, safeguarding: 24 },
  ng_south:  { resources: 6500, submissions: 5400, question_attachments: 1600,avatars: 250, comms_attachments: 450, invoices: 120, safeguarding: 16 },
};

// A representative filename per category (index picks one) so insights read well.
const _STG_NAMES = {
  resources:            ['Revision-Pack.pdf', 'Worksheet-Bundle.pptx', 'Exam-Board-Notes.pdf', 'Video-Walkthrough.mp4', 'Topic-Cheatsheet.pdf', 'Practice-Papers.zip'],
  submissions:          ['Homework-Scan.pdf', 'Essay-Draft.docx', 'Photo-of-Working.jpg', 'Mock-Answers.pdf', 'Coursework.pdf'],
  question_attachments: ['Diagram.png', 'Graph-Figure.png', 'Question-Image.jpg', 'Equation-Snip.png'],
  invoices:             ['Invoice.pdf', 'Statement.pdf', 'Receipt.pdf'],
  avatars:              ['avatar.jpg', 'profile.png', 'photo.jpg'],
  comms_attachments:    ['Message-Attachment.pdf', 'Shared-Photo.jpg', 'Notice.pdf'],
  safeguarding:         ['Incident-Log.pdf', 'DSL-Record.pdf'],
};

const _buildStorageFiles = () => {
  const files = [];
  let n = 0;
  STORAGE_ACCOUNTS_SEED.forEach(acc => {
    acc.centres.forEach(centre => {
      const targets = _STG_TARGETS[centre.id] || {};
      Object.keys(targets).forEach(category => {
        const totalMb = targets[category];
        if (!totalMb) return;
        const rnd = _stgRand(_hashStg(acc.accountId + centre.id + category));
        // Split the category target into a believable number of files. Weight the
        // first file heavier so "largest item" insights have a clear leader.
        const count = Math.max(1, Math.min(14, Math.round(totalMb / 380)));
        let remaining = totalMb;
        for (let i = 0; i < count; i++) {
          const last = i === count - 1;
          // First file ~ 22% of the pile; the rest share the remainder with jitter.
          let mb;
          if (last) mb = remaining;
          else if (i === 0) mb = totalMb * (0.20 + rnd() * 0.10);
          else mb = (remaining / (count - i)) * (0.7 + rnd() * 0.6);
          mb = Math.max(0.05, Math.min(remaining - (last ? 0 : 0.05 * (count - i - 1)), mb));
          remaining = Math.max(0, remaining - mb);
          const names = _STG_NAMES[category] || ['file'];
          const ageDays = Math.floor(rnd() * 330) + (category === 'safeguarding' ? 30 : 3);
          const created = new Date(_STG_TODAY.getTime() - ageDays * 86400000);
          files.push({
            fileId: 'f_' + (++n).toString(36),
            accountId: acc.accountId,
            centreId: centre.id,
            category,
            sizeBytes: Math.round(mb * 1024 * 1024),
            createdAt: created.toISOString().slice(0, 10),
            uploadedBy: _STG_UPLOADERS[Math.floor(rnd() * _STG_UPLOADERS.length)],
            name: names[Math.floor(rnd() * names.length)],
          });
        }
      });
    });
  });
  return files;
};

// Tiny string hash → PRNG seed (stable per account/centre/category).
function _hashStg(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const STORAGE_FILES_SEED = _buildStorageFiles();

// Prototype R2 config (persisted as strings by Storage.jsx; NEVER a live link).
const STORAGE_R2_SEED = {
  scope: 'platform',
  bucketName: 'tutoros-prod-eu',
  region: 'auto',
  jurisdiction: 'EU',
  accessKeyId: '',
  secretMasked: '',
  connected: false,
};

Object.assign(window, {
  STORAGE_GB, STORAGE_ADDON_BLOCK_GB, STORAGE_ADDON_BLOCK_PRICE, STORAGE_UNIT_COST_USD_GB,
  STORAGE_SELF_ACCOUNT_ID, STORAGE_ACCOUNTS_SEED, STORAGE_FILES_SEED, STORAGE_R2_SEED,
});
