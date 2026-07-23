// ══════════════════════════════════════════════════════════════
//  Mock data — Settings
//  Loaded as a global script before Settings.jsx (see index.html).
//  Seeds the `settings_store_v1` localStorage store. Keyed by role so
//  each role's settings are independent in the demo.
//
//  Shape:  SETTINGS_SEED[role] = { <section>: { <key>: <value> } }
//  Sections: account, notifications, appearance are common to every role;
//  the final section (platform/centre/teaching/learning) is role-specific.
// ══════════════════════════════════════════════════════════════

// Shared defaults reused across roles (spread, then overridden per role).
const SET_NOTIF_DEFAULTS = {
  channel: 'email', digest: true, quietHours: false,
  announcements: true, messages: true, reminders: true,
};
const SET_APPEARANCE_DEFAULTS = {
  theme: 'light', compact: false, reduceMotion: false,
  language: 'en-GB', timezone: 'Europe/London', dateFormat: 'dd/mm/yyyy', weekStart: 'monday',
};

const SETTINGS_SEED = {
  superadmin: {
    account: {
      name: 'Owais Rahman', displayName: 'Owais', email: 'owais@tutoros.io',
      phone: '+44 20 7946 0000', twoFactor: true,
    },
    notifications: { ...SET_NOTIF_DEFAULTS, channel: 'both' },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    platform: {
      defaultPlan: 'growth', trialDays: 14, defaultSeats: 10, currency: 'GBP',
      billingEmail: 'billing@tutoros.io', autoSuspend: true, retention: '90d',
      supportAccess: true, maintenanceNotices: true,
    },
  },

  admin: {
    account: {
      name: 'Taqqy', displayName: 'Taqqy', email: 'lisa.chen@brightminds.co.uk',
      phone: '+44 20 7946 0102', twoFactor: false,
    },
    notifications: { ...SET_NOTIF_DEFAULTS },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    // Centre IDENTITY (name / email / phone / address / brand accent) is NOT the
    // source of truth here — it lives on the single centre-profile record (§1),
    // stored on the subscription's active centre and edited via the Settings →
    // Centre profile tab (which now writes to the subscription store). Only
    // `website`, `terms` and the invoicing defaults below are owned by this store.
    centre: {
      name: 'Bright Minds Tuition', email: 'office@brightminds.co.uk',
      phone: '020 7946 0102', website: 'brightminds.co.uk',
      address: '14 Kingsway\nLondon WC2B 6LH',
      brandColor: '#4F46E5',
      // Academic term schedule — the header auto-selects whichever term covers
      // today's date, so admins set these once and they apply on the right day.
      terms: [
        { id: 't_spr26', name: 'Spring Term 2026',  start: '2026-01-06', end: '2026-03-27' },
        { id: 't_sum26', name: 'Summer Term 2026',  start: '2026-04-20', end: '2026-07-17' },
        { id: 't_aut26', name: 'Autumn Term 2026',  start: '2026-09-02', end: '2026-12-18' },
        { id: 't_spr27', name: 'Spring Term 2027',  start: '2027-01-05', end: '2027-03-26' },
      ],
      currency: 'GBP',
      invoiceDueDays: 14, taxRate: 0, autoSendInvoices: true, lateReminders: true,
    },
  },

  teacher: {
    account: {
      name: 'James Okoro', displayName: 'Mr Okoro', email: 'james.okoro@brightpath.edu',
      phone: '+44 7700 900123', twoFactor: false,
    },
    notifications: { ...SET_NOTIF_DEFAULTS },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    teaching: {
      attempts: 1, dueDays: 7, allowLate: true, autoGradeMcq: true, allowReview: true,
      gradingScale: 'percent', releaseAfterApproval: true,
      hoursFrom: '09:00', hoursTo: '17:00', notifyOnSubmission: true,
    },
  },

  // §1: the account identity here is the SAME canonical principal as the header,
  // greeting and Homework/Reports (Oliver Chen) — no divergent "Aisha Khan".
  student: {
    account: {
      name: 'Oliver Chen', displayName: 'Oliver', email: 'oliver.chen@student.brightpath.edu',
      phone: '', twoFactor: false,
    },
    notifications: { ...SET_NOTIF_DEFAULTS, digest: false },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    // Guardian = the linked Parent account (read-only to the student). Share-reports
    // is centre-policy, not a free student toggle. streakNudges defaults OFF (AADC —
    // de-gamified, no loss-aversion nudging).
    learning: {
      guardianName: 'David Chen', guardianEmail: 'david.chen@gmail.com',
      shareWithGuardian: true, reminderLead: '1d', streakNudges: false,
      textSize: 'normal', highContrast: false, dyslexiaFont: false,
    },
  },
};

Object.assign(window, { SETTINGS_SEED, SET_NOTIF_DEFAULTS, SET_APPEARANCE_DEFAULTS });
