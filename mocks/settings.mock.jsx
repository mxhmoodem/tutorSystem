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
      name: 'Sarah Mitchell', displayName: 'Sarah', email: 'sarah@brightpath.edu',
      phone: '+44 161 496 0123', twoFactor: false,
    },
    notifications: { ...SET_NOTIF_DEFAULTS },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    centre: {
      name: 'BrightPath Tuition', email: 'hello@brightpath.edu',
      phone: '+44 161 496 0123', website: 'brightpath.edu',
      address: '14 Oxford Road\nManchester M1 5QA',
      brandColor: '#43b190', term: 'Spring Term 2026', currency: 'GBP',
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

  student: {
    account: {
      name: 'Aisha Khan', displayName: 'Aisha', email: 'aisha.k@student.brightpath.edu',
      phone: '', twoFactor: false,
    },
    notifications: { ...SET_NOTIF_DEFAULTS, digest: false },
    appearance:    { ...SET_APPEARANCE_DEFAULTS },
    learning: {
      guardianName: 'Nadia Khan', guardianEmail: 'nadia.khan@gmail.com',
      shareWithGuardian: true, reminderLead: '1d', streakNudges: true,
      textSize: 'normal', highContrast: false, dyslexiaFont: false,
    },
  },
};

Object.assign(window, { SETTINGS_SEED, SET_NOTIF_DEFAULTS, SET_APPEARANCE_DEFAULTS });
