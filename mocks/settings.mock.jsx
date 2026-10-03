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
    // NOTE: no trialDays here — the free trial is one global setting owned by
    // Pricing page (PLAN_TRIAL_SEED / tutoros.trial.v1), read via getPlatformTrial('centre').
    platform: {
      defaultPlan: 'growth', defaultSeats: 10, currency: 'GBP',
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
      // Centre teaching policy (decisions #53/#54). New assignments start from
      // teachingDefaults (read by Homework); pupilGradeDisplay decides whether pupils
      // see a percentage, an indicative grade or both on their own screens.
      teachingDefaults: {
        attemptsAllowed: 1, dueDays: 7, allowLate: true, autoGradeMcq: true,
        allowReview: true, hideMarksUntilReleased: false,
      },
      pupilGradeDisplay: 'both',
    },
    // Pupil privacy (decisions #29 / #59) — both comparisons default OFF (AADC).
    // Production: centre_privacy_settings (typed, audited).
    privacy: { showRankToStudents: false, rankMinAge: 13, showClassAverageToStudents: false },
  },

  teacher: {
    account: {
      name: 'James Okoro', displayName: 'Mr Okoro', email: 'james.okoro@brightpath.edu',
      phone: '+44 7700 900123', twoFactor: false,
    },
    notifications: { ...SET_NOTIF_DEFAULTS },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    // Only the teacher's own alerts live here now: homework defaults are centre
    // policy (admin.centre.teachingDefaults), the dead grading-scale setting is
    // gone, and working hours became teaching availability on the admin store.
    teaching: {
      notifyOnSubmission: true,
    },
  },

  // A pupil's settings are NOT a role blob: identity comes from the admin store
  // (read-only, centre-provisioned), notification topics are per pupil
  // (klasio.studentNotifPrefs.v1) and there is no appearance / accessibility /
  // study-reminder state until those features exist (decision #61).
};

Object.assign(window, { SETTINGS_SEED, SET_NOTIF_DEFAULTS, SET_APPEARANCE_DEFAULTS });
