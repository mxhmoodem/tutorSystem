// ══════════════════════════════════════════════════════════════
//  Klasio — Canonical centre-profile record (single source of truth)
//  Loaded as a global before centreMetrics.jsx (see index.html).
//
//  ONE record per centre, keyed by centreId. This is the single source of
//  truth for a centre's IDENTITY — name / logo / brand accent / contact /
//  address. Every surface that renders the centre's identity (topbar centre
//  chip, sidebar switcher, invoice PDF header, report PDF branding, portal)
//  reads it through centreMetrics.getCentreProfile() — no screen keeps its
//  own copy anymore (this seed replaces the four divergent names the app used
//  to carry: "Hillcrest" on the dashboard, "Brighton Academy of Excellence"
//  in report branding, "BrightPath" in Settings, "Bright Minds" everywhere
//  else).
//
//  Editable fields (name / contact / address / accent) live on the
//  subscription's centre record (tutoros.subscription.v2, edited in
//  Settings → Centre profile); getCentreProfile merges those live edits OVER
//  this seed, which supplies the logo + defaults and backfills any centre the
//  subscription doesn't carry. Keyed by centreId so a future multi-tenant
//  backend maps one row per centre with no shape change.
// ══════════════════════════════════════════════════════════════

const CENTRE_PROFILES = {
  bm: {
    id: 'bm', accountId: 'acc_brightminds',
    name: 'Bright Minds Tuition', logo: 'BM',
    brandAccent: null,                       // null → the platform default accent
    contactEmail: 'office@brightminds.co.uk', contactPhone: '020 7946 0102',
    address: '14 Kingsway, London WC2B 6LH', city: 'London', region: 'Greater London',
  },
  apex: {
    id: 'apex', accountId: 'acc_brightminds',
    name: 'Apex Learning Centre', logo: 'AL',
    brandAccent: null,
    contactEmail: 'hello@apexlearning.co.uk', contactPhone: '0161 496 0118',
    address: '', city: 'Manchester', region: 'Greater Manchester',
  },
  summit: {
    id: 'summit', accountId: 'acc_brightminds',
    name: 'Summit Academy', logo: 'SA',
    brandAccent: null,
    contactEmail: 'office@summitacademy.co.uk', contactPhone: '0121 496 0377',
    address: '', city: 'Birmingham', region: 'West Midlands',
  },
};

Object.assign(window, { CENTRE_PROFILES });
