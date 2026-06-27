// ══════════════════════════════════════════════════════════════
//  TutorOS — Student Reports & Feedback system
//  Replaces the previous AI-feedback feature. Manual, professional
//  progress reports authored by teachers, read & acknowledged by
//  students, configured by admins. Backed by a shared localStorage
//  store (reports_store_v2) seeded from mocks/reports.mock.jsx.
//
//  Exposes on window:
//    useReportsStore, TeacherReports, StudentReports,
//    AdminReportsConfig (hub: Overview/Generate/Settings),
//    printReportPDF, printCentreReport
// ══════════════════════════════════════════════════════════════

const REPORTS_KEY = 'reports_store_v2';
const REPORTS_STUDENT_SELF = 's_oliver';   // logged-in student in the student app
const REPORTS_TEACHER_SELF = 'Ms. Sarah Clarke';
const REPORTS_TODAY = '2026-06-15';

// ─── Constants / labels ──────────────────────────────────────────────────────────
const RPT_FOURTIER = [
  { v: 'excellent',         label: 'Excellent',         color: '#16A34A' },
  { v: 'good',              label: 'Good',              color: '#0891B2' },
  { v: 'satisfactory',      label: 'Satisfactory',      color: '#D97706' },
  { v: 'needs_improvement', label: 'Needs Improvement', color: '#DC2626' },
];
const RPT_RATING_LABELS = {
  behaviour: 'Behaviour', effort: 'Effort', homework: 'Homework',
  participation: 'Participation', confidence: 'Confidence',
  communication: 'Communication', subjectKnowledge: 'Subject Knowledge',
};
const RPT_SECTION_LABELS = {
  studentInfo: 'Student Information', academic: 'Academic Progress',
  attendance: 'Attendance & Engagement',
  ratings: 'Performance Ratings', comments: 'Teacher Comments',
  strengths: 'Strengths', improvements: 'Areas for Improvement',
  homework: 'Homework & Independent Study',
  targets: 'Targets & Next Steps', attachments: 'Attachments',
  parentNotes: 'Parent Notes', footer: 'Footer',
};
// Icon + order metadata for the template builder's section toggles.
const RPT_SECTION_META = {
  studentInfo:  { icon: 'user' },
  academic:     { icon: 'chart' },
  attendance:   { icon: 'check' },
  ratings:      { icon: 'star' },
  comments:     { icon: 'message' },
  strengths:    { icon: 'flag' },
  improvements: { icon: 'flag' },
  homework:     { icon: 'clip' },
  targets:      { icon: 'flag' },
  attachments:  { icon: 'clip' },
  parentNotes:  { icon: 'message' },
  footer:       { icon: 'file' },
};
const RPT_STATUS_META = {
  draft:     { label: 'Draft',     variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  archived:  { label: 'Archived',  variant: 'default' },
};

// ─── Store hook (localStorage, seeded from mocks) ────────────────────────────────
function rptLoad() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(REPORTS_KEY)); } catch (e) { raw = null; }
  const seed = {
    config:    REPORTS_CONFIG,
    templates: REPORTS_TEMPLATES,
    folders:   REPORTS_FOLDERS,
    tags:      REPORTS_TAGS,
    reports:   REPORTS_SEED,
  };
  if (!raw || typeof raw !== 'object') return seed;
  // backfill missing top-level keys so older blobs still load. config is migrated
  // from the legacy shape (mode/frequency/overrides/requirements) to the new model
  // (defaultRule/reportRules/centreStandards) so old localStorage blobs keep working.
  return {
    config:    rptMigrateConfig(raw.config, seed.config),
    templates: raw.templates || seed.templates,
    folders:   raw.folders   || seed.folders,
    tags:      raw.tags       || seed.tags,
    reports:   raw.reports   || seed.reports,
  };
}

// Map any legacy config (mode/frequency/overrides/requirements.*) onto the new
// model, while preserving already-migrated keys and backfilling new ones from seed.
function rptMigrateConfig(raw, seed) {
  if (!raw || typeof raw !== 'object') return seed;
  const c = { ...seed, ...raw };
  // requirement/frequency enum upgrades (legacy lowercase → new UPPER tokens)
  const reqMap  = { required: 'REQUIRED', optional: 'OPTIONAL', disabled: 'OFF' };
  const freqMap = { weekly: 'WEEKLY', biweekly: 'FORTNIGHTLY', monthly: 'MONTHLY',
    half_term: 'TERMLY', termly: 'TERMLY', yearly: 'TERMLY', every_lesson: 'WEEKLY', custom: 'TERMLY' };

  if (!raw.defaultRule) {
    c.defaultRule = {
      requirement: reqMap[raw.mode] || seed.defaultRule.requirement,
      frequency:   freqMap[raw.frequency] || seed.defaultRule.frequency,
      templateId:  seed.defaultRule.templateId,
    };
  }
  if (!raw.reportRules) {
    // Legacy year/subject overrides become TAG rules on that year/subject value.
    c.reportRules = (raw.overrides || []).map((o, i) => ({
      id: o.id || 'rr_mig_' + i, targetType: 'TAG', tag: o.scope,
      requirement: reqMap[o.mode] || 'REQUIRED', frequency: freqMap[o.frequency] || 'TERMLY',
      templateId: seed.defaultRule.templateId, priority: 0,
    }));
    if (!c.reportRules.length) c.reportRules = seed.reportRules;
  }
  if (!raw.centreStandards) {
    const rq = raw.requirements || {};
    c.centreStandards = {
      minCommentLength: rq.minCommentLength != null ? rq.minCommentLength : seed.centreStandards.minCommentLength,
      requireSignature: rq.requireSignature != null ? rq.requireSignature : seed.centreStandards.requireSignature,
      sectionsRequiredEverywhere: rq.sections
        ? Object.keys(rq.sections).filter(k => rq.sections[k])
        : seed.centreStandards.sectionsRequiredEverywhere,
    };
  }
  // drop legacy keys so the new model is the single source of truth
  delete c.mode; delete c.frequency; delete c.customFrequency; delete c.everyXWeeks;
  delete c.overrides; delete c.requirements;
  return c;
}
function rptSave(store) {
  try { localStorage.setItem(REPORTS_KEY, JSON.stringify(store)); } catch (e) {}
}

function useReportsStore() {
  const [store, setStore] = React.useState(rptLoad);
  const persist = React.useCallback((next) => { rptSave(next); setStore(next); }, []);

  const mutateReports = (fn) => persist({ ...store, reports: fn({ ...store.reports }) });
  const stamp = () => new Date().toISOString();

  const api = {
    store,
    reportsArr: Object.values(store.reports),

    addReport(report) {
      const id = report.id || 'r_' + Date.now() + '_' + Math.floor(Math.random() * 999);
      const r = { ...report, id };
      mutateReports(rs => { rs[id] = r; return rs; });
      return id;
    },
    updateReport(id, patch) {
      mutateReports(rs => {
        if (rs[id]) rs[id] = { ...rs[id], ...patch, dateModified: REPORTS_TODAY,
          history: [...(rs[id].history || []), { action: 'Edited', by: REPORTS_TEACHER_SELF, at: stamp() }] };
        return rs;
      });
    },
    // Atomic upsert used by the editor (avoids two persist calls racing on stale state).
    saveReport(report, status) {
      mutateReports(rs => {
        const exists = !!rs[report.id];
        const next = { ...report, status, dateModified: REPORTS_TODAY };
        if (status === 'published' && !next.datePublished) next.datePublished = REPORTS_TODAY;
        const action = !exists ? 'Created' : status === 'published' ? 'Published' : 'Edited';
        next.history = [...(report.history || []), { action, by: REPORTS_TEACHER_SELF, at: stamp() }];
        rs[report.id] = next;
        return rs;
      });
    },
    publishReports(ids) {
      mutateReports(rs => { ids.forEach(id => { if (rs[id]) rs[id] = { ...rs[id], status: 'published', datePublished: REPORTS_TODAY,
        history: [...(rs[id].history || []), { action: 'Published', by: REPORTS_TEACHER_SELF, at: stamp() }] }; }); return rs; });
    },
    archiveReports(ids) {
      mutateReports(rs => { ids.forEach(id => { if (rs[id]) rs[id] = { ...rs[id], status: 'archived', dateArchived: REPORTS_TODAY,
        history: [...(rs[id].history || []), { action: 'Archived', by: REPORTS_TEACHER_SELF, at: stamp() }] }; }); return rs; });
    },
    unarchiveReports(ids) {
      mutateReports(rs => { ids.forEach(id => { if (rs[id]) rs[id] = { ...rs[id], status: 'draft', dateArchived: null }; }); return rs; });
    },
    deleteReports(ids) {
      mutateReports(rs => { ids.forEach(id => delete rs[id]); return rs; });
    },
    moveToFolder(ids, folderId) {
      mutateReports(rs => { ids.forEach(id => { if (rs[id]) rs[id] = { ...rs[id], folderId }; }); return rs; });
    },
    applyTags(ids, tagIds) {
      mutateReports(rs => { ids.forEach(id => { if (rs[id]) {
        const merged = Array.from(new Set([...(rs[id].tagIds || []), ...tagIds]));
        rs[id] = { ...rs[id], tagIds: merged };
      } }); return rs; });
    },
    togglePin(id) {
      mutateReports(rs => { if (rs[id]) rs[id] = { ...rs[id], pinned: !rs[id].pinned }; return rs; });
    },
    markViewed(id) {
      mutateReports(rs => { if (rs[id]) rs[id] = { ...rs[id], lastViewed: REPORTS_TODAY }; return rs; });
    },
    duplicateReport(id) {
      const src = store.reports[id];
      if (!src) return null;
      const nid = 'r_' + Date.now();
      mutateReports(rs => { rs[nid] = { ...src, id: nid, title: src.title + ' (Copy)', status: 'draft',
        datePublished: null, dateArchived: null, pinned: false,
        acknowledgement: { ack: false, at: null },
        dateCreated: REPORTS_TODAY, dateModified: REPORTS_TODAY,
        history: [{ action: 'Created', by: REPORTS_TEACHER_SELF, at: stamp() }] }; return rs; });
      return nid;
    },
    acknowledge(id) {
      mutateReports(rs => { if (rs[id]) rs[id] = { ...rs[id], acknowledgement: { ack: true, at: stamp() } }; return rs; });
    },
    addFolder(folder) {
      const id = 'f_' + Date.now();
      persist({ ...store, folders: [...store.folders, { id, parentId: null, color: '#4F46E5', ...folder }] });
      return id;
    },
    addTemplate(tpl) {
      const id = 'tpl_' + Date.now();
      persist({ ...store, templates: [...store.templates, { id, scope: 'centre', locked: false, default: false, ...tpl }] });
      return id;
    },
    updateTemplate(id, patch) {
      persist({ ...store, templates: store.templates.map(t => {
        if (t.id !== id) return patch.default ? { ...t, default: false } : t;  // only one default
        return { ...t, ...patch };
      }) });
    },
    deleteTemplate(id) {
      persist({ ...store, templates: store.templates.filter(t => t.id !== id) });
    },
    updateConfig(patch) {
      persist({ ...store, config: { ...store.config, ...patch } });
    },
    // Scoped reporting rules
    setReportRules(reportRules) {
      persist({ ...store, config: { ...store.config, reportRules } });
    },
    setDefaultRule(patch) {
      persist({ ...store, config: { ...store.config, defaultRule: { ...store.config.defaultRule, ...patch } } });
    },
    setCentreStandards(patch) {
      persist({ ...store, config: { ...store.config, centreStandards: { ...store.config.centreStandards, ...patch } } });
    },
    reset() { try { localStorage.removeItem(REPORTS_KEY); } catch (e) {} persist(rptLoad()); },
  };
  return api;
}

// ─── Rating display helpers ──────────────────────────────────────────────────────
const RatingValue = ({ scale, value }) => {
  if (scale === 'stars') {
    return (
      <span style={{ display: 'inline-flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <Icon key={s} name="star" size={14} color={s <= value ? '#F59E0B' : DS.border} />
        ))}
      </span>
    );
  }
  if (scale === 'percent') {
    const col = value >= 85 ? DS.success : value >= 70 ? DS.warning : DS.danger;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 140 }}>
        <span style={{ flex: 1, height: 6, background: DS.surface, borderRadius: 4, overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: value + '%', background: col }} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: col, width: 34 }}>{value}%</span>
      </span>
    );
  }
  const meta = RPT_FOURTIER.find(t => t.v === value) || RPT_FOURTIER[1];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: meta.color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
};

// ─── 0–1 score → scale mapping ────────────────────────────────────────────────────
// A template stores one 0–1 score per category; it maps to whichever scale the
// template picks, so the same data re-renders as fourtier / stars / percent.
function rptScoreToFourtier(score) {
  if (score >= 0.85) return 'excellent';
  if (score >= 0.6)  return 'good';
  if (score >= 0.4)  return 'satisfactory';
  return 'needs_improvement';
}
function rptScoreToScale(scale, score) {
  if (scale === 'stars')   return Math.max(1, Math.round(score * 5));
  if (scale === 'percent') return Math.round(score * 100);
  return rptScoreToFourtier(score);
}

// Filled-meter "pips" rendering for the fourtier scale (Excellent → NI).
const RPT_PIP_COUNT = 5;
const ScorePips = ({ score }) => {
  const filled = Math.max(1, Math.round(score * RPT_PIP_COUNT));
  const meta = RPT_FOURTIER.find(t => t.v === rptScoreToFourtier(score)) || RPT_FOURTIER[1];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {Array.from({ length: RPT_PIP_COUNT }).map((_, i) => (
          <span key={i} style={{ width: 16, height: 7, borderRadius: 3, background: i < filled ? meta.color : DS.border }} />
        ))}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
    </span>
  );
};

// One category row rendered for whichever scale a template selects, driven by a 0–1 score.
const ScoreRow = ({ label, scale, score }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${DS.border}` }}>
    <span style={{ fontSize: 13, color: DS.sub }}>{label}</span>
    {scale === 'fourtier'
      ? <ScorePips score={score} />
      : <RatingValue scale={scale} value={rptScoreToScale(scale, score)} />}
  </div>
);

// editable rating control (teacher editor)
const RatingEditor = ({ scale, value, onChange }) => {
  if (scale === 'stars') {
    return (
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} onClick={() => onChange(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
            <Icon name="star" size={18} color={s <= value ? '#F59E0B' : DS.borderDark} />
          </button>
        ))}
      </span>
    );
  }
  if (scale === 'percent') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width: 200 }}>
        <input type="range" min="0" max="100" value={value} onChange={e => onChange(+e.target.value)} style={{ flex: 1, accentColor: DS.accent }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: DS.text, width: 38 }}>{value}%</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {RPT_FOURTIER.map(t => (
        <button key={t.v} onClick={() => onChange(t.v)} style={{
          padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
          border: `1px solid ${value === t.v ? t.color : DS.border}`,
          background: value === t.v ? t.color + '18' : DS.bg,
          color: value === t.v ? t.color : DS.muted,
        }}>{t.label}</button>
      ))}
    </span>
  );
};

// ─── PDF / print helper ──────────────────────────────────────────────────────────
function rptEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function rptRatingText(scale, v) {
  if (scale === 'stars')   return '★'.repeat(v) + '☆'.repeat(5 - v);
  if (scale === 'percent') return v + '%';
  const m = RPT_FOURTIER.find(t => t.v === v); return m ? m.label : v;
}

// `sections` (optional): when provided, only those section keys render — this lets
// a template drive the export, one source of truth with the live preview. When
// omitted, every section renders (existing teacher/student/admin export behaviour).
function reportPdfBody(r, branding, sections) {
  branding = branding || REPORTS_CONFIG.branding;
  const acc = branding.primaryColor || '#4F46E5';
  const show = (key) => !sections || sections.includes(key);
  const ratingRows = Object.keys(r.ratings || {}).map(k =>
    `<tr><td>${rptEsc((r.ratingLabels && r.ratingLabels[k]) || RPT_RATING_LABELS[k] || k)}</td><td style="text-align:right;font-weight:600">${rptEsc(rptRatingText(r.ratingScale, r.ratings[k]))}</td></tr>`
  ).join('');
  const academic = r.academic || {};
  const acadRows = [
    ['Understanding of topics', rptRatingText('fourtier', academic.understanding)],
    ['Class participation',     rptRatingText('fourtier', academic.participation)],
    ['Homework completion',     academic.homeworkCompletion],
    ['Test performance',        academic.testPerformance],
    ['Attendance',              academic.attendance],
  ].map(([k, v]) => `<tr><td>${rptEsc(k)}</td><td style="text-align:right;font-weight:600">${rptEsc(v)}</td></tr>`).join('');
  const list = (arr) => (arr && arr.length) ? '<ul>' + arr.map(x => `<li>${rptEsc(x)}</li>`).join('') + '</ul>' : '<p class="muted">—</p>';
  const t = r.targets || {};
  const attach = (r.attachments && r.attachments.length)
    ? '<ul>' + r.attachments.map(a => `<li>${rptEsc(a.name)} <span class="muted">(${rptEsc(a.size || a.type)})</span></li>`).join('') + '</ul>'
    : '<p class="muted">No attachments.</p>';
  const ackLine = r.acknowledgement && r.acknowledgement.ack
    ? `<p class="ack">✓ Acknowledged by student on ${new Date(r.acknowledgement.at).toLocaleString('en-GB')}</p>` : '';

  const sec = {
    studentInfo: `
    <table class="info">
      <tr><td class="lbl">Student</td><td>${rptEsc(r.studentName)}</td><td class="lbl">Class</td><td>${rptEsc(r.className)}</td></tr>
      <tr><td class="lbl">Subject</td><td>${rptEsc(r.subject)}</td><td class="lbl">Teacher</td><td>${rptEsc(r.teacher)}</td></tr>
      <tr><td class="lbl">Year group</td><td>${rptEsc(r.year)}</td><td class="lbl">Predicted</td><td>${rptEsc(r.predicted || '—')}</td></tr>
    </table>`,
    academic: `
    <h2 style="border-color:${acc}">Academic Progress</h2>
    <table class="kv">${acadRows}</table>`,
    attendance: `
    <h2 style="border-color:${acc}">Attendance &amp; Engagement</h2>
    <table class="kv">
      <tr><td>Attendance</td><td style="text-align:right;font-weight:600">${rptEsc(academic.attendance || '—')}</td></tr>
      <tr><td>Punctuality</td><td style="text-align:right;font-weight:600">${rptEsc(r.punctuality || 'Excellent')}</td></tr>
      <tr><td>Engagement</td><td style="text-align:right;font-weight:600">${rptEsc(r.engagement || 'Highly engaged')}</td></tr>
    </table>`,
    ratings: `
    <h2 style="border-color:${acc}">Performance Ratings</h2>
    <table class="kv">${ratingRows || '<tr><td class="muted">No ratings recorded.</td></tr>'}</table>`,
    comments: `
    <h2 style="border-color:${acc}">Teacher Comments</h2>
    <div class="comments">${r.comments || '<p class="muted">No comments.</p>'}</div>`,
    strengths: `
    <h2 style="border-color:${acc}">Strengths</h2>
    ${list(academic.strengths)}`,
    improvements: `
    <h2 style="border-color:${acc}">Areas for Improvement</h2>
    ${list(academic.improvements)}`,
    homework: `
    <h2 style="border-color:${acc}">Homework &amp; Independent Study</h2>
    <table class="kv">
      <tr><td>Homework completion</td><td style="text-align:right;font-weight:600">${rptEsc(academic.homeworkCompletion || '—')}</td></tr>
    </table>`,
    targets: `
    <h2 style="border-color:${acc}">Targets &amp; Next Steps</h2>
    <div class="cols">
      <div><h3>Current targets</h3>${list(t.current)}</div>
      <div><h3>Long-term goals</h3>${list(t.longTerm)}</div>
    </div>
    <div class="cols">
      <div><h3>Recommended revision</h3>${list(t.revision)}</div>
      <div><h3>Parent &amp; teacher actions</h3>${list([].concat(t.parentActions || [], t.teacherActions || []))}</div>
    </div>`,
    attachments: `
    <h2 style="border-color:${acc}">Attachments</h2>
    ${attach}`,
    parentNotes: `
    <h2 style="border-color:${acc}">Parent Notes</h2>
    ${list([].concat(t.parentActions || []))}`,
  };

  // footer / signature section is gated only when a template explicitly omits it
  const footerBlock = show('footer')
    ? `<div class="sign">
      <div class="sigline"></div>
      <div><strong>${rptEsc(branding.signatureName)}</strong><br/><span class="muted">${rptEsc(branding.signatureTitle)}</span></div>
    </div>` : '';

  const bodySections = RPT_ALL_SECTIONS.filter(k => k !== 'footer' && show(k) && sec[k]).map(k => sec[k]).join('\n');

  return `
  <section class="report">
    <div class="rhead">
      <div class="crest" style="background:${acc}">${rptEsc(branding.logo || 'TC')}</div>
      <div>
        <div class="centre">${rptEsc(branding.centreName)}</div>
        <div class="htitle" style="color:${acc}">${rptEsc(branding.headerText || 'Progress Report')}</div>
      </div>
      <div class="rmeta">
        <div>${rptEsc(r.period)}</div>
        <div class="muted">Issued ${rptEsc(r.datePublished || r.dateCreated)}</div>
      </div>
    </div>
    ${bodySections}
    ${ackLine}
    ${footerBlock}
  </section>`;
}

function printReportPDF(reports, branding, opts) {
  branding = branding || REPORTS_CONFIG.branding;
  opts = opts || {};
  const list = Array.isArray(reports) ? reports : [reports];
  const landscape = opts.layout === 'landscape';
  const watermark = branding.watermark
    ? `<div class="watermark">${rptEsc(branding.watermark)}</div>` : '';
  const body = list.map(r => reportPdfBody(r, branding, opts.sections)).join('<div class="pagebreak"></div>');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${rptEsc(branding.centreName)} — Report</title>
  <style>
    @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 16mm 14mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Inter','Segoe UI',sans-serif; color:#1f2937; margin:0; font-size:12.5px; line-height:1.55; position:relative; }
    .watermark { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; font-size:90px; font-weight:800; color:rgba(0,0,0,0.05); transform:rotate(-30deg); pointer-events:none; z-index:0; }
    .report { position:relative; z-index:1; }
    .rhead { display:flex; align-items:center; gap:16px; padding-bottom:14px; border-bottom:2px solid #e5e7eb; }
    .crest { width:54px; height:54px; border-radius:10px; color:#fff; font-weight:800; font-size:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .centre { font-size:17px; font-weight:800; color:#111827; }
    .htitle { font-size:13px; font-weight:600; }
    .rmeta { margin-left:auto; text-align:right; font-size:12px; }
    .muted { color:#9ca3af; }
    table { width:100%; border-collapse:collapse; }
    table.info { margin:16px 0; }
    table.info td { padding:5px 8px; border:1px solid #eef0f3; font-size:12px; }
    table.info td.lbl { background:#f9fafb; color:#6b7280; font-weight:600; width:90px; }
    h2 { font-size:13px; text-transform:uppercase; letter-spacing:.04em; margin:22px 0 8px; padding-bottom:5px; border-bottom:2px solid; }
    h3 { font-size:12px; margin:0 0 4px; color:#374151; }
    table.kv td { padding:5px 8px; border-bottom:1px solid #f1f3f5; }
    .cols { display:flex; gap:24px; margin-top:10px; }
    .cols > div { flex:1; }
    ul { margin:4px 0; padding-left:18px; } li { margin-bottom:3px; }
    .comments { background:#f9fafb; border:1px solid #eef0f3; border-radius:8px; padding:10px 14px; }
    .comments p { margin:0 0 6px; } .comments h3 { margin-top:8px; }
    .ack { margin-top:14px; color:#16a34a; font-weight:600; }
    .sign { margin-top:34px; display:flex; align-items:flex-end; gap:14px; }
    .sigline { width:200px; border-bottom:1px solid #9ca3af; height:30px; }
    .pagebreak { page-break-after:always; }
    @media print { .printbar { display:none !important; } }
    .printbar { position:sticky; top:0; background:#111827; color:#fff; padding:10px 16px; display:flex; gap:12px; align-items:center; font-size:13px; z-index:10; }
    .printbar button { background:#4F46E5; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; }
    .sheet { max-width:820px; margin:0 auto; padding:24px; }
  </style></head>
  <body>
    <div class="printbar">
      <span>📄 ${list.length} report${list.length > 1 ? 's' : ''} ready — use your browser's “Save as PDF”.</span>
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="sheet">${watermark}${body}</div>
    <div class="footer-note" style="text-align:center;color:#9ca3af;font-size:10.5px;margin:24px 0;">${rptEsc(branding.footerText)}</div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to export the report PDF.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

// ─── Small shared bits ───────────────────────────────────────────────────────────
const RptTag = ({ tag, onRemove }) => tag ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20,
    fontSize: 11, fontWeight: 600, background: tag.color + '18', color: tag.color, border: `1px solid ${tag.color}44` }}>
    {tag.label}
    {onRemove && <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>}
  </span>
) : null;

const SectionTitle = ({ icon, children, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
    <Icon name={icon} size={15} color={color || DS.accent} />
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.muted }}>{children}</span>
  </div>
);

// Rich-text mini editor (contentEditable + execCommand)
const RichTextEditor = ({ value, onChange }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '';
  }, []);  // initialise once
  const cmd = (c, arg) => { document.execCommand(c, false, arg); ref.current && onChange(ref.current.innerHTML); };
  const tools = [
    ['bold', 'Bold', () => cmd('bold')],
    ['heading', 'Heading', () => cmd('formatBlock', 'H3')],
    ['bullet', 'Bullet list', () => cmd('insertUnorderedList')],
    ['link', 'Link', () => { const u = prompt('Link URL:'); if (u) cmd('createLink', u); }],
  ];
  return (
    <div style={{ border: `1px solid ${DS.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 2, padding: 6, borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
        {tools.map(([icon, title, fn]) => (
          <button key={icon} title={title} onMouseDown={e => { e.preventDefault(); fn(); }} style={{
            width: 30, height: 28, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.sub }}>
            <Icon name={icon} size={15} />
          </button>
        ))}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={() => onChange(ref.current.innerHTML)}
        style={{ minHeight: 130, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.6, color: DS.sub, outline: 'none' }} />
    </div>
  );
};

// Editable list of short text lines (targets, strengths…)
const EditList = ({ items, onChange, placeholder }) => {
  const arr = items || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {arr.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Input value={it} onChange={e => { const n = [...arr]; n[i] = e.target.value; onChange(n); }} style={{ flex: 1 }} />
          <button onClick={() => onChange(arr.filter((_, k) => k !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.faint, padding: 4 }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...arr, ''])} style={{
        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, border: `1px dashed ${DS.border}`,
        background: DS.surface, color: DS.muted, fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>
        <Icon name="plus" size={12} /> {placeholder || 'Add item'}
      </button>
    </div>
  );
};

// ─── Read-only report view (student reading + teacher preview) ────────────────────
const ReportReadingView = ({ report, tags, accent }) => {
  const r = report;
  const acc = accent || r.subjectColor || DS.accent;
  const rtags = (r.tagIds || []).map(id => (tags || []).find(t => t.id === id)).filter(Boolean);
  const academic = r.academic || {};
  const t = r.targets || {};
  const acadRow = (label, val) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${DS.border}` }}>
      <span style={{ fontSize: 13, color: DS.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{val}</span>
    </div>
  );
  const Bullets = ({ items, color }) => (
    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {(items || []).length ? items.map((s, i) => (
        <li key={i} style={{ fontSize: 13, color: DS.sub, lineHeight: 1.55 }}>{s}</li>
      )) : <span style={{ fontSize: 13, color: DS.faint }}>—</span>}
    </ul>
  );

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* hero */}
      <div style={{ background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: 8, background: acc }} />
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: acc + '18', color: acc, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="file" size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: DS.text, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 13, color: DS.muted }}>{r.subject} · {r.teacher} · {r.period}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Badge variant={RPT_STATUS_META[r.status].variant}>{RPT_STATUS_META[r.status].label}</Badge>
                {rtags.map(tg => <RptTag key={tg.id} tag={tg} />)}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
            {[['Student', r.studentName], ['Class', r.className], ['Published', r.datePublished || '—'], ['Predicted', r.predicted || '—']].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: DS.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                <div style={{ fontSize: 13, color: DS.text, fontWeight: 600, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* academic */}
      <Card title="Academic Progress" style={{ marginBottom: 20 }}>
        <div style={{ padding: '4px 20px 16px' }}>
          {acadRow('Understanding of topics', <RatingValue scale="fourtier" value={academic.understanding} />)}
          {acadRow('Class participation', <RatingValue scale="fourtier" value={academic.participation} />)}
          {acadRow('Homework completion', academic.homeworkCompletion)}
          {acadRow('Test performance', academic.testPerformance)}
          {acadRow('Attendance', academic.attendance)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: DS.success, marginBottom: 8 }}>STRENGTHS</div>
              <Bullets items={academic.strengths} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: DS.warning, marginBottom: 8 }}>AREAS TO IMPROVE</div>
              <Bullets items={academic.improvements} />
            </div>
          </div>
        </div>
      </Card>

      {/* ratings */}
      <Card title="Performance Ratings" style={{ marginBottom: 20 }}>
        <div style={{ padding: '4px 20px 16px' }}>
          {Object.keys(r.ratings || {}).map(k => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DS.border}` }}>
              <span style={{ fontSize: 13, color: DS.sub }}>{RPT_RATING_LABELS[k] || k}</span>
              <RatingValue scale={r.ratingScale} value={r.ratings[k]} />
            </div>
          ))}
        </div>
      </Card>

      {/* comments */}
      <Card title="Teacher Comments" style={{ marginBottom: 20 }}>
        <div style={{ padding: '8px 22px 18px', fontSize: 14, lineHeight: 1.65, color: DS.sub }}
          dangerouslySetInnerHTML={{ __html: r.comments || '<p style="color:#9ca3af">No comments.</p>' }} />
      </Card>

      {/* targets */}
      <Card title="Targets & Next Steps" style={{ marginBottom: 20 }}>
        <div style={{ padding: '8px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 8 }}>Current targets</div><Bullets items={t.current} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 8 }}>Long-term goals</div><Bullets items={t.longTerm} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 8 }}>Recommended revision</div><Bullets items={t.revision} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 8 }}>Parent &amp; teacher actions</div><Bullets items={[].concat(t.parentActions || [], t.teacherActions || [])} /></div>
        </div>
      </Card>

      {/* attachments */}
      {(r.attachments || []).length > 0 && (
        <Card title="Attachments" style={{ marginBottom: 20 }}>
          <div style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {r.attachments.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${DS.border}`, borderRadius: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={a.type === 'image' ? 'eye' : 'file'} size={16} />
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: DS.text }}>{a.name}</span>
                <span style={{ fontSize: 12, color: DS.faint }}>{a.size}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── Report editor (teacher) ──────────────────────────────────────────────────────
// Plain-text length of an HTML comment string (so the floor counts words, not tags).
function commentTextLen(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').trim().length;
}
// Which centre-standards completion floors a report has NOT yet met.
function unmetStandards(r, standards) {
  const s = standards || {};
  const out = [];
  if (commentTextLen(r.comments) < (s.minCommentLength || 0)) out.push(`comment must be at least ${s.minCommentLength} characters (currently ${commentTextLen(r.comments)})`);
  if (s.requireSignature && !(r.signature && r.signature.trim())) out.push('a teacher signature is required');
  return out;
}

const ReportEditor = ({ report, store, onBack, onSaved }) => {
  const [r, setR] = React.useState(report);
  const [tab, setTab] = React.useState('edit'); // edit | preview
  const [gateMsg, setGateMsg] = React.useState('');
  const set = (patch) => setR(prev => ({ ...prev, ...patch }));
  const setAcad = (patch) => setR(prev => ({ ...prev, academic: { ...prev.academic, ...patch } }));
  const setTargets = (patch) => setR(prev => ({ ...prev, targets: { ...prev.targets, ...patch } }));
  const acc = r.subjectColor || DS.accent;

  const standards = store.store.config.centreStandards || {};
  const unmet = unmetStandards(r, standards);

  const saveDraft = () => { commit('draft'); };
  // Publishing = "submit for review" — blocked until the centre-standards floors are met.
  const publish   = () => {
    const blocking = unmetStandards(r, standards);
    if (blocking.length) { setGateMsg('Can’t submit yet — ' + blocking.join('; ') + '.'); return; }
    setGateMsg(''); commit('published');
  };
  const commit = (status) => {
    store.saveReport(r, status);
    onSaved && onSaved(status);
  };

  const ratingCats = Object.keys(r.ratings || {});

  return (
    <div>
      {/* sticky action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', position: 'sticky', top: 52, background: DS.surface, zIndex: 5 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, fontSize: 13 }}>
          ← Back to reports
        </button>
        <Segmented options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]} value={tab} onChange={setTab} />
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" icon="copy" small onClick={() => { const id = store.duplicateReport(r.id); onSaved && onSaved('duplicated'); }}>Duplicate</Btn>
        <Btn variant="ghost" icon="file" small onClick={() => store.addTemplate({ name: r.title + ' Template', sections: ['studentInfo', 'academic', 'ratings', 'comments', 'targets'], ratingCategories: ratingCats, ratingScale: r.ratingScale, description: 'Saved from a report.' })}>Save as template</Btn>
        <Btn variant="secondary" icon="print" small onClick={() => printReportPDF(r, store.store.config.branding)}>Export PDF</Btn>
        <Btn variant="secondary" small onClick={saveDraft}>Save draft</Btn>
        <Btn variant="primary" icon="check" small onClick={publish} style={unmet.length ? { opacity: 0.55 } : {}}>Submit for review</Btn>
      </div>

      {/* Centre-standards gate banner */}
      {(gateMsg || (tab === 'edit' && unmet.length > 0)) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 14px', margin: '4px 0 0', borderRadius: 9,
          background: gateMsg ? DS.dangerBg : DS.warningBg, border: `1px solid ${gateMsg ? DS.dangerBorder : DS.warningBorder}` }}>
          <Icon name={gateMsg ? 'x' : 'flag'} size={15} color={gateMsg ? DS.danger : DS.warning} />
          <span style={{ fontSize: 12.5, color: gateMsg ? DS.danger : DS.warning, fontWeight: 500 }}>
            {gateMsg || <>Centre standards not yet met: {unmet.join('; ')}.</>}
          </span>
        </div>
      )}

      {tab === 'preview' ? (
        <div style={{ paddingTop: 16 }}><ReportReadingView report={r} tags={store.store.tags} /></div>
      ) : (
        <div style={{ maxWidth: 820, margin: '0 auto', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Student info */}
          <Card>
            <div style={{ padding: '18px 20px' }}>
              <SectionTitle icon="user" color={acc}>{RPT_SECTION_LABELS.studentInfo}</SectionTitle>
              <Field label="Report title"><Input value={r.title} onChange={e => set({ title: e.target.value })} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Student"><Input value={r.studentName} onChange={e => set({ studentName: e.target.value })} /></Field>
                <Field label="Class"><Input value={r.className} onChange={e => set({ className: e.target.value })} /></Field>
                <Field label="Subject"><Input value={r.subject} onChange={e => set({ subject: e.target.value })} /></Field>
                <Field label="Teacher"><Input value={r.teacher} onChange={e => set({ teacher: e.target.value })} /></Field>
                <Field label="Report period"><Input value={r.period} onChange={e => set({ period: e.target.value })} /></Field>
                <Field label="Predicted grade"><Input value={r.predicted || ''} onChange={e => set({ predicted: e.target.value })} /></Field>
              </div>
            </div>
          </Card>

          {/* Academic */}
          <Card>
            <div style={{ padding: '18px 20px' }}>
              <SectionTitle icon="chart" color={acc}>{RPT_SECTION_LABELS.academic}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Understanding of topics"><RatingEditor scale="fourtier" value={r.academic.understanding} onChange={v => setAcad({ understanding: v })} /></Field>
                <Field label="Class participation"><RatingEditor scale="fourtier" value={r.academic.participation} onChange={v => setAcad({ participation: v })} /></Field>
                <Field label="Homework completion"><Input value={r.academic.homeworkCompletion} onChange={e => setAcad({ homeworkCompletion: e.target.value })} /></Field>
                <Field label="Test performance"><Input value={r.academic.testPerformance} onChange={e => setAcad({ testPerformance: e.target.value })} /></Field>
                <Field label="Attendance"><Input value={r.academic.attendance} onChange={e => setAcad({ attendance: e.target.value })} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                <Field label="Strengths"><EditList items={r.academic.strengths} onChange={v => setAcad({ strengths: v })} placeholder="Add strength" /></Field>
                <Field label="Areas to improve"><EditList items={r.academic.improvements} onChange={v => setAcad({ improvements: v })} placeholder="Add area" /></Field>
              </div>
            </div>
          </Card>

          {/* Ratings */}
          <Card>
            <div style={{ padding: '18px 20px' }}>
              <SectionTitle icon="star" color={acc}>{RPT_SECTION_LABELS.ratings}</SectionTitle>
              <Field label="Rating scale">
                <Segmented options={[{ value: 'fourtier', label: 'Excellent → NI' }, { value: 'stars', label: '1–5 Stars' }, { value: 'percent', label: 'Percentage' }]}
                  value={r.ratingScale} onChange={v => set({ ratingScale: v })} />
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {ratingCats.map(k => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${DS.border}` }}>
                    <span style={{ fontSize: 13, color: DS.sub, fontWeight: 500 }}>{RPT_RATING_LABELS[k] || k}</span>
                    <RatingEditor scale={r.ratingScale} value={typeof r.ratings[k] === (r.ratingScale === 'fourtier' ? 'string' : 'number') ? r.ratings[k] : (r.ratingScale === 'fourtier' ? 'good' : r.ratingScale === 'stars' ? 4 : 80)}
                      onChange={v => setR(prev => ({ ...prev, ratings: { ...prev.ratings, [k]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Comments — gated by the centre minimum-comment-length standard */}
          <Card>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionTitle icon="message" color={acc}>
                  {RPT_SECTION_LABELS.comments}
                  {standards.minCommentLength > 0 && <span style={{ color: DS.danger, marginLeft: 5 }} title="Required to complete">*</span>}
                </SectionTitle>
                {standards.minCommentLength > 0 && (() => {
                  const len = commentTextLen(r.comments), ok = len >= standards.minCommentLength;
                  return <span style={{ fontSize: 11.5, fontWeight: 600, color: ok ? DS.success : DS.warning }}>{len} / {standards.minCommentLength} chars{ok ? ' ✓' : ''}</span>;
                })()}
              </div>
              <RichTextEditor value={r.comments} onChange={v => set({ comments: v })} />
            </div>
          </Card>

          {/* Signature — gated by the centre require-signature standard */}
          {standards.requireSignature && (
            <Card>
              <div style={{ padding: '18px 20px' }}>
                <SectionTitle icon="edit" color={acc}>Teacher signature<span style={{ color: DS.danger, marginLeft: 5 }} title="Required to complete">*</span></SectionTitle>
                <Field label="Type your name to sign this report" hint="Required by your centre before a report can be submitted for review">
                  <Input value={r.signature || ''} onChange={e => set({ signature: e.target.value })} placeholder={REPORTS_TEACHER_SELF} />
                </Field>
              </div>
            </Card>
          )}

          {/* Targets */}
          <Card>
            <div style={{ padding: '18px 20px' }}>
              <SectionTitle icon="flag" color={acc}>{RPT_SECTION_LABELS.targets}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Current targets"><EditList items={r.targets.current} onChange={v => setTargets({ current: v })} placeholder="Add target" /></Field>
                <Field label="Long-term goals"><EditList items={r.targets.longTerm} onChange={v => setTargets({ longTerm: v })} placeholder="Add goal" /></Field>
                <Field label="Recommended revision"><EditList items={r.targets.revision} onChange={v => setTargets({ revision: v })} placeholder="Add revision" /></Field>
                <Field label="Parent actions"><EditList items={r.targets.parentActions} onChange={v => setTargets({ parentActions: v })} placeholder="Add action" /></Field>
                <Field label="Teacher actions"><EditList items={r.targets.teacherActions} onChange={v => setTargets({ teacherActions: v })} placeholder="Add action" /></Field>
              </div>
            </div>
          </Card>

          {/* Attachments */}
          <Card>
            <div style={{ padding: '18px 20px' }}>
              <SectionTitle icon="clip" color={acc}>{RPT_SECTION_LABELS.attachments}</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(r.attachments || []).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: `1px solid ${DS.border}`, borderRadius: 8 }}>
                    <Icon name="file" size={16} color={DS.muted} />
                    <span style={{ flex: 1, fontSize: 13, color: DS.text }}>{a.name}</span>
                    <span style={{ fontSize: 12, color: DS.faint }}>{a.size}</span>
                    <button onClick={() => set({ attachments: r.attachments.filter((_, k) => k !== i) })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.faint }}><Icon name="x" size={14} /></button>
                  </div>
                ))}
                <button onClick={() => set({ attachments: [...(r.attachments || []), { name: 'New_Attachment.pdf', type: 'pdf', size: '— KB' }] })} style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, border: `1px dashed ${DS.border}`,
                  background: DS.surface, color: DS.muted, fontSize: 12, padding: '7px 12px', borderRadius: 6, cursor: 'pointer' }}>
                  <Icon name="upload" size={13} /> Attach file
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ─── New report modal ─────────────────────────────────────────────────────────────
function blankReport(template, opts) {
  opts = opts || {};
  const cats = (template && template.ratingCategories) || ['behaviour', 'effort', 'homework', 'participation', 'confidence', 'communication', 'subjectKnowledge'];
  const scale = (template && template.ratingScale) || 'fourtier';
  const ratings = {};
  cats.forEach(c => ratings[c] = scale === 'fourtier' ? 'good' : scale === 'stars' ? 4 : 80);
  return {
    id: 'r_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
    title: `${opts.period || 'Summer Term 2026'} — ${opts.subject || 'Subject'} Progress Report`,
    studentId: opts.studentId || 's_new', studentName: opts.studentName || '', year: opts.year || 'Year 12',
    className: opts.className || '', subject: opts.subject || '', subjectColor: opts.subjectColor || DS.accent,
    teacher: REPORTS_TEACHER_SELF, predicted: '',
    period: opts.period || 'Summer Term 2026', reportType: (template && template.name) || 'Termly Progress',
    dateCreated: REPORTS_TODAY, dateModified: REPORTS_TODAY, datePublished: null, dateArchived: null,
    status: 'draft', folderId: opts.folderId || null, tagIds: [], pinned: false, lastViewed: null,
    academic: { understanding: 'good', participation: 'good', homeworkCompletion: '', testPerformance: '', attendance: '', strengths: [], improvements: [] },
    comments: '', ratingScale: scale, ratings,
    targets: { current: [], longTerm: [], revision: [], parentActions: [], teacherActions: [] },
    attachments: [], acknowledgement: { ack: false, at: null },
    createdBy: REPORTS_TEACHER_SELF, history: [{ action: 'Created', by: REPORTS_TEACHER_SELF, at: new Date().toISOString() }],
  };
}

const NewReportModal = ({ open, onClose, store, onCreated }) => {
  const [mode, setMode] = React.useState('single');  // single | class | multiple
  const [tplId, setTplId] = React.useState(store.store.templates[0] && store.store.templates[0].id);
  const [name, setName] = React.useState('');
  const [className, setClassName] = React.useState('Mathematics — Year 12 (Set A)');
  const [selected, setSelected] = React.useState([]);
  const students = REPORTS_STUDENTS;
  const tpl = store.store.templates.find(t => t.id === tplId);

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const create = () => {
    let targets = [];
    if (mode === 'single') targets = name ? [{ studentName: name }] : [{ studentName: 'New Student' }];
    if (mode === 'class')  targets = students.slice(0, 5).map(s => ({ studentName: s.name, studentId: s.id, year: s.year }));
    if (mode === 'multiple') targets = students.filter(s => selected.includes(s.id)).map(s => ({ studentName: s.name, studentId: s.id, year: s.year }));
    let firstId = null;
    targets.forEach((t, i) => {
      const rep = blankReport(tpl, { ...t, className, subject: className.split(' — ')[0] });
      const id = store.addReport(rep);
      if (i === 0) firstId = id;
    });
    onCreated(targets.length, firstId);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create report" subtitle="Generate one or more reports from a template" icon="file" width={560}
      footer={<><Btn variant="secondary" small onClick={onClose}>Cancel</Btn><Btn variant="primary" small icon="plus" onClick={create}>Create {mode === 'class' ? '5 reports' : mode === 'multiple' ? `${selected.length} reports` : 'report'}</Btn></>}>
      <Field label="Who is this report for?">
        <Segmented options={[{ value: 'single', label: 'One student' }, { value: 'class', label: 'Whole class' }, { value: 'multiple', label: 'Selected students' }]} value={mode} onChange={setMode} />
      </Field>
      <Field label="Template">
        <Select value={tplId} onChange={e => setTplId(e.target.value)}>
          {store.store.templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.locked ? ' (locked)' : ''}</option>)}
        </Select>
      </Field>
      <Field label="Class"><Input value={className} onChange={e => setClassName(e.target.value)} /></Field>
      {mode === 'single' && <Field label="Student name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oliver Chen" /></Field>}
      {mode === 'class' && <div style={{ fontSize: 13, color: DS.muted, padding: '4px 2px' }}>A draft report will be created for each of the {students.slice(0, 5).length} students in this class.</div>}
      {mode === 'multiple' && (
        <Field label="Select students">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflow: 'auto' }}>
            {students.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: selected.includes(s.id) ? DS.accentLight : DS.surface, border: `1px solid ${selected.includes(s.id) ? DS.accentBorder : DS.border}` }}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} style={{ accentColor: DS.accent }} />
                <Avatar name={s.name} size={26} /><span style={{ fontSize: 13, color: DS.text }}>{s.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: DS.faint }}>{s.year}</span>
              </label>
            ))}
          </div>
        </Field>
      )}
    </Modal>
  );
};

// ─── Teacher Reports surface ───────────────────────────────────────────────────────
const TeacherReports = () => {
  const store = useReportsStore();
  const [view, setView] = React.useState('list');         // list | editor
  const [editing, setEditing] = React.useState(null);
  const [folder, setFolder] = React.useState('all');      // folder id | all | pinned | recent | drafts | archived | shared
  const [tagFilter, setTagFilter] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [subjectF, setSubjectF] = React.useState('all');
  const [sort, setSort] = React.useState('newest');
  const [layout, setLayout] = React.useState('table');
  const [page, setPage] = React.useState(1);
  const PER_PAGE = 8;
  const [sel, setSel] = React.useState([]);
  const [showNew, setShowNew] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [tagOpen, setTagOpen] = React.useState(false);
  const [toast, setToast] = React.useState('');

  const reports = store.reportsArr;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  const config = store.store.config;
  const subjects = Array.from(new Set(reports.map(r => r.subject)));

  // analytics
  const drafts = reports.filter(r => r.status === 'draft');
  const published = reports.filter(r => r.status === 'published');
  const recentlyPublished = published.filter(r => r.datePublished && r.datePublished >= '2026-04-01');
  const dueThisWeek = drafts.length; // demo: all drafts treated as awaiting/due

  // folder + filter pipeline
  let list = reports.filter(r => {
    if (folder === 'all') return r.status !== 'archived';
    if (folder === 'pinned') return r.pinned;
    if (folder === 'recent') return !!r.lastViewed;
    if (folder === 'drafts') return r.status === 'draft';
    if (folder === 'archived') return r.status === 'archived';
    if (folder === 'shared') return (r.tagIds || []).includes('t_pe');
    return r.folderId === folder && r.status !== 'archived';
  });
  if (tagFilter) list = list.filter(r => (r.tagIds || []).includes(tagFilter));
  if (subjectF !== 'all') list = list.filter(r => r.subject === subjectF);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(r => (r.title + r.studentName + r.subject + r.className).toLowerCase().includes(q));
  }
  list = list.slice().sort((a, b) => {
    if (sort === 'az') return a.studentName.localeCompare(b.studentName);
    const da = a.dateModified || a.dateCreated, db = b.dateModified || b.dateCreated;
    return sort === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
  });

  // Pagination — clamp the page whenever filters shrink the result set, then slice.
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const curPage = Math.min(page, pageCount);
  const pageList = list.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  // Reset to page 1 when the active filters change.
  const filterKey = `${folder}|${tagFilter}|${search}|${subjectF}|${sort}`;
  React.useEffect(() => { setPage(1); }, [filterKey]);

  const tagById = (id) => store.store.tags.find(t => t.id === id);
  // "Select all" operates on the current page so the header checkbox matches what's visible.
  const allSelected = pageList.length > 0 && pageList.every(r => sel.includes(r.id));
  const toggleSel = (id) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const openReport = (r) => { store.markViewed(r.id); setEditing(r); setView('editor'); };

  // folder rail definition
  const rootFolders = store.store.folders.filter(f => !f.parentId);
  const childFolders = (pid) => store.store.folders.filter(f => f.parentId === pid);

  if (view === 'editor' && editing) {
    return (
      <div style={{ padding: '0 32px 40px' }}>
        <ReportEditor report={editing} store={store} onBack={() => { setView('list'); setEditing(null); }}
          onSaved={(s) => { setView('list'); setEditing(null); flash(s === 'published' ? 'Report published — now visible to the student.' : s === 'duplicated' ? 'Report duplicated.' : 'Draft saved.'); }} />
      </div>
    );
  }

  if (view === 'due') {
    return (
      <UpcomingReportsPage config={config} store={store} teacherName="Sarah Clarke"
        onBack={() => setView('list')}
        onOpenStudent={(r) => { setView('list'); setFolder('all'); setTagFilter(null); setSearch(r.name); }} />
    );
  }

  const RailItem = ({ id, icon, label, count, color, indent }) => (
    <button onClick={() => { setFolder(id); setSel([]); }} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
      padding: indent ? '7px 10px 7px 26px' : '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
      background: folder === id ? DS.accentLight : 'transparent', color: folder === id ? DS.accent : DS.sub,
      fontSize: 13, fontWeight: folder === id ? 600 : 400 }}>
      <Icon name={icon} size={15} color={color || (folder === id ? DS.accent : DS.muted)} />
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && <span style={{ fontSize: 11, color: DS.faint }}>{count}</span>}
    </button>
  );

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="Reports" subtitle="Create, organise and publish progress reports for students and parents" actions={[
        (config.defaultRule || {}).requirement === 'OFF' && (config.reportRules || []).every(r => r.requirement === 'OFF')
          ? <Badge key="d" variant="warning">Reports turned off by admin</Badge>
          : <Btn key="n" variant="primary" icon="plus" small onClick={() => setShowNew(true)}>New report</Btn>
      ]} />

      {/* analytics */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
        <KPICard label="Awaiting completion" value={drafts.length} icon="edit" iconBg={DS.warningBg} accent={DS.warning} sub="drafts to finish" />
        <KPICard label="Due this week" value={dueThisWeek} icon="clock" iconBg={DS.accentLight} accent={DS.accent} sub={`default: ${rptFreqLabel((config.defaultRule || {}).frequency).toLowerCase()}`} />
        <KPICard label="Recently published" value={recentlyPublished.length} icon="check" iconBg={DS.successBg} accent={DS.success} trend="this term" trendDir="up" />
        <KPICard label="Published total" value={published.length} icon="file" iconBg={DS.accentLight} accent={DS.accent} sub={`${reports.length} reports`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: 24, alignItems: 'start' }}>
        {/* sidebar: the filters rail, with "Reports due" as its own card underneath */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 16 }}>
          {/* folder / filter rail */}
          <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, padding: 12 }}>
            <RailItem id="all" icon="file" label="All reports" count={reports.filter(r => r.status !== 'archived').length} />
            <RailItem id="pinned" icon="pin" label="Pinned" count={reports.filter(r => r.pinned).length} />
            <RailItem id="recent" icon="clock" label="Recently viewed" count={reports.filter(r => r.lastViewed).length} />
            <RailItem id="drafts" icon="edit" label="Drafts" count={drafts.length} />
            <RailItem id="shared" icon="users" label="Shared" count={reports.filter(r => (r.tagIds || []).includes('t_pe')).length} />
            <RailItem id="archived" icon="archive" label="Archived" count={reports.filter(r => r.status === 'archived').length} />
            <div style={{ height: 1, background: DS.border, margin: '10px 4px' }} />
            <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.faint, letterSpacing: '0.05em', padding: '4px 10px' }}>FOLDERS</div>
            {rootFolders.map(f => (
              <React.Fragment key={f.id}>
                <RailItem id={f.id} icon="folder" label={f.name} color={f.color} count={reports.filter(r => r.folderId === f.id).length} />
                {childFolders(f.id).map(c => (
                  <RailItem key={c.id} id={c.id} icon="folder" label={c.name} color={c.color} indent count={reports.filter(r => r.folderId === c.id).length} />
                ))}
              </React.Fragment>
            ))}
            <div style={{ height: 1, background: DS.border, margin: '10px 4px' }} />
            <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.faint, letterSpacing: '0.05em', padding: '4px 10px' }}>TAGS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '4px 8px' }}>
              {store.store.tags.map(t => (
                <button key={t.id} onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)} style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${tagFilter === t.id ? t.color : t.color + '44'}`,
                  background: tagFilter === t.id ? t.color + '22' : t.color + '12', color: t.color }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Reports due — its own card under the filters; overdue first, opens the full due page */}
          <UpcomingReports config={config} store={store} teacherName="Sarah Clarke" limit={5}
            compact onView={() => setView('due')} />
        </div>

        {/* main column */}
        <div>
          {/* toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" style={{ width: 240 }} />
            <Select value={subjectF} onChange={e => setSubjectF(e.target.value)} style={{ width: 160 }}>
              <option value="all">All subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 140 }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">Name A–Z</option>
            </Select>
            <div style={{ flex: 1 }} />
            <Segmented options={[{ value: 'grid', label: '▦' }, { value: 'table', label: '☰' }]} value={layout} onChange={setLayout} />
          </div>

          {/* bulk bar */}
          {sel.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.accent }}>{sel.length} selected</span>
              <div style={{ flex: 1 }} />
              <Btn variant="ghost" icon="check" small onClick={() => { store.publishReports(sel); flash(`${sel.length} report(s) published.`); setSel([]); }}>Publish</Btn>
              <Btn variant="ghost" icon="archive" small onClick={() => { store.archiveReports(sel); flash(`${sel.length} archived.`); setSel([]); }}>Archive</Btn>
              <Btn variant="ghost" icon="folder" small onClick={() => setMoveOpen(true)}>Move</Btn>
              <Btn variant="ghost" icon="tag" small onClick={() => setTagOpen(true)}>Tag</Btn>
              <Btn variant="ghost" icon="print" small onClick={() => { printReportPDF(reports.filter(r => sel.includes(r.id)), config.branding); }}>Export</Btn>
              <Btn variant="ghost" icon="x" small onClick={() => setSel([])}>Clear</Btn>
            </div>
          )}

          {/* list */}
          {list.length === 0 ? (
            <EmptyState icon="file" title="No reports here" message="Try a different folder or create a new report." action={<Btn variant="primary" icon="plus" small onClick={() => setShowNew(true)}>New report</Btn>} />
          ) : layout === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {pageList.map(r => (
                <ReportCard key={r.id} r={r} tags={store.store.tags} selected={sel.includes(r.id)}
                  onToggle={() => toggleSel(r.id)} onOpen={() => openReport(r)}
                  onPin={() => store.togglePin(r.id)} onPrint={() => printReportPDF(r, config.branding)} />
              ))}
            </div>
          ) : (
            <ReportTable list={pageList} sel={sel} allSelected={allSelected} tags={store.store.tags}
              onToggleAll={() => setSel(allSelected ? sel.filter(id => !pageList.some(r => r.id === id)) : Array.from(new Set([...sel, ...pageList.map(r => r.id)])))} onToggle={toggleSel} onOpen={openReport}
              statusMeta={RPT_STATUS_META} />
          )}
          {list.length > 0 && pageCount > 1 && <Pager page={curPage} pageCount={pageCount} onPage={setPage} total={list.length} perPage={PER_PAGE} />}
        </div>
      </div>

      <NewReportModal open={showNew} onClose={() => setShowNew(false)} store={store}
        onCreated={(n, firstId) => { setShowNew(false); flash(`Created ${n} report(s).`); }} />

      {/* move-to-folder modal */}
      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title="Move to folder" icon="folder" width={420}
        footer={<Btn variant="secondary" small onClick={() => setMoveOpen(false)}>Done</Btn>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {store.store.folders.map(f => (
            <button key={f.id} onClick={() => { store.moveToFolder(sel, f.id); setMoveOpen(false); flash(`Moved ${sel.length} to ${f.name}.`); setSel([]); }} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 7, border: `1px solid ${DS.border}`, background: DS.bg, cursor: 'pointer', textAlign: 'left' }}>
              <Icon name="folder" size={16} color={f.color} /><span style={{ fontSize: 13, color: DS.text }}>{f.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* tag modal */}
      <Modal open={tagOpen} onClose={() => setTagOpen(false)} title="Apply tags" icon="tag" width={420}
        footer={<Btn variant="secondary" small onClick={() => setTagOpen(false)}>Done</Btn>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {store.store.tags.map(t => (
            <button key={t.id} onClick={() => { store.applyTags(sel, [t.id]); flash(`Tagged ${sel.length}.`); }} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${t.color}55`, background: t.color + '15', color: t.color }}>{t.label}</button>
          ))}
        </div>
      </Modal>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: DS.text, color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>{toast}</div>
      )}
    </div>
  );
};

const ReportCard = ({ r, tags, selected, onToggle, onOpen, onPin, onPrint }) => {
  const acc = r.subjectColor || DS.accent;
  const meta = RPT_STATUS_META[r.status];
  const rtags = (r.tagIds || []).map(id => tags.find(t => t.id === id)).filter(Boolean);
  return (
    <div style={{ background: DS.bg, border: `1px solid ${selected ? DS.accentBorder : DS.border}`, borderRadius: 12, overflow: 'hidden', position: 'relative', boxShadow: selected ? `0 0 0 2px ${DS.accentLight}` : 'none' }}>
      <div style={{ height: 5, background: acc }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={selected} onChange={onToggle} onClick={e => e.stopPropagation()} style={{ accentColor: DS.accent, marginTop: 3 }} />
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.studentName}</div>
            <div style={{ fontSize: 12, color: DS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject} · {r.period}</div>
          </div>
          <button onClick={onPin} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: r.pinned ? DS.accent : DS.faint }}><Icon name="pin" size={15} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {r.acknowledgement && r.acknowledgement.ack && <Badge variant="success"><Icon name="check" size={10} /> Read</Badge>}
          {rtags.slice(0, 2).map(t => <RptTag key={t.id} tag={t} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DS.border}` }}>
          <span style={{ fontSize: 11, color: DS.faint, flex: 1 }}>Modified {r.dateModified}</span>
          <button onClick={onOpen} style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.muted, padding: 3 }}><Icon name="edit" size={14} /></button>
          <button onClick={onPrint} style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.muted, padding: 3 }}><Icon name="print" size={14} /></button>
        </div>
      </div>
    </div>
  );
};

const ReportTable = ({ list, sel, allSelected, tags, onToggleAll, onToggle, onOpen, statusMeta }) => (
  <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '34px 1.4fr 1fr 0.8fr 0.9fr 0.7fr 60px', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${DS.border}`, background: DS.surface, fontSize: 11, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      <input type="checkbox" checked={allSelected} onChange={onToggleAll} style={{ accentColor: DS.accent }} />
      <span>Student</span><span>Title</span><span>Subject</span><span>Period</span><span>Status</span><span></span>
    </div>
    {list.map(r => {
      const meta = statusMeta[r.status];
      return (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '34px 1.4fr 1fr 0.8fr 0.9fr 0.7fr 60px', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${DS.border}`, alignItems: 'center' }}>
          <input type="checkbox" checked={sel.includes(r.id)} onChange={() => onToggle(r.id)} style={{ accentColor: DS.accent }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => onOpen(r)}>
            <Avatar name={r.studentName} size={28} /><span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.studentName}</span>
          </div>
          <span style={{ fontSize: 12.5, color: DS.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onOpen(r)}>{r.title}</span>
          <span style={{ fontSize: 12.5, color: DS.sub }}>{r.subject}</span>
          <span style={{ fontSize: 12.5, color: DS.muted }}>{r.period}</span>
          <span><Badge variant={meta.variant}>{meta.label}</Badge></span>
          <button onClick={() => onOpen(r)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.muted, justifySelf: 'end' }}><Icon name="chevron_r" size={15} /></button>
        </div>
      );
    })}
  </div>
);

// ─── Student Reports surface ───────────────────────────────────────────────────────
const StudentReports = () => {
  const store = useReportsStore();
  const [open, setOpen] = React.useState(null);   // report being read
  const [search, setSearch] = React.useState('');
  const [subjectF, setSubjectF] = React.useState('all');
  const [teacherF, setTeacherF] = React.useState('all');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const PER_PAGE = 8;

  // only this student's published (or archived) reports
  const mine = store.reportsArr.filter(r => r.studentId === REPORTS_STUDENT_SELF && r.status === 'published');
  const subjects = Array.from(new Set(mine.map(r => r.subject)));
  const teachers = Array.from(new Set(mine.map(r => r.teacher)));

  let list = mine.slice();
  if (subjectF !== 'all') list = list.filter(r => r.subject === subjectF);
  if (teacherF !== 'all') list = list.filter(r => r.teacher === teacherF);
  if (search.trim()) { const q = search.toLowerCase(); list = list.filter(r => (r.title + r.subject + r.teacher).toLowerCase().includes(q)); }
  list.sort((a, b) => {
    if (sort === 'az') return a.title.localeCompare(b.title);
    const da = a.datePublished || a.dateCreated, db = b.datePublished || b.dateCreated;
    return sort === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
  });

  // Pagination — clamp the page whenever filters shrink the result set, then slice.
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const curPage = Math.min(page, pageCount);
  const pageList = list.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  // Reset to page 1 when the active filters change.
  const filterKey = `${search}|${subjectF}|${teacherF}|${sort}`;
  React.useEffect(() => { setPage(1); }, [filterKey]);

  if (open) {
    const r = store.store.reports[open.id] || open;
    return (
      <div style={{ padding: '28px 32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, maxWidth: 820, margin: '0 auto 18px' }}>
          <button onClick={() => setOpen(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, fontSize: 13 }}>← Back to reports</button>
          <div style={{ flex: 1 }} />
          <Btn variant="secondary" icon="download" small onClick={() => printReportPDF(r, store.store.config.branding)}>Download PDF</Btn>
        </div>
        <ReportReadingView report={r} tags={store.store.tags} />
        {/* acknowledgement */}
        <div style={{ maxWidth: 820, margin: '20px auto 0' }}>
          {r.acknowledgement && r.acknowledgement.ack ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: DS.successBg, border: `1px solid ${DS.successBorder}`, borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: DS.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: DS.success }}>You have read this report</div>
                <div style={{ fontSize: 12.5, color: DS.sub }}>Acknowledged on {new Date(r.acknowledgement.at).toLocaleString('en-GB')}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>Please confirm you have read this report</div>
                <div style={{ fontSize: 12.5, color: DS.muted }}>Your teacher will be able to see when you acknowledged it.</div>
              </div>
              <Btn variant="primary" icon="check" small onClick={() => { store.acknowledge(r.id); setOpen({ ...r, acknowledgement: { ack: true, at: new Date().toISOString() } }); }}>I have read this report</Btn>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="My Reports" subtitle="Progress reports your teachers have shared with you" actions={[
        <Badge key="c" variant="accent">{mine.length} report{mine.length !== 1 ? 's' : ''}</Badge>
      ]} />

      {/* Filters stay pinned to the top while the list scrolls under them. */}
      <div style={{ position: 'sticky', top: 52, zIndex: 5, background: DS.surfaceAlt || DS.bg, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', marginBottom: 6, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" style={{ width: 240 }} />
        <Select value={subjectF} onChange={e => setSubjectF(e.target.value)} style={{ width: 150 }}>
          <option value="all">All subjects</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={teacherF} onChange={e => setTeacherF(e.target.value)} style={{ width: 170 }}>
          <option value="all">All teachers</option>{teachers.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 140 }}>
          <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="az">A–Z</option>
        </Select>
        <div style={{ flex: 1 }} />
        {list.length > 0 && <span style={{ fontSize: 12.5, color: DS.muted }}>{list.length} report{list.length !== 1 ? 's' : ''}</span>}
      </div>

      {list.length === 0 ? (
        <EmptyState icon="file" title="No reports yet" message="When your teachers publish a progress report, it will appear here." />
      ) : (
        <>
          <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.6fr 1fr 1fr 0.9fr 0.8fr 36px', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${DS.border}`, background: DS.surface, fontSize: 11, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span></span><span>Report</span><span>Subject</span><span>Teacher</span><span>Published</span><span>Status</span><span></span>
            </div>
            {pageList.map(r => {
              const acc = r.subjectColor || DS.accent;
              const isRead = r.acknowledgement && r.acknowledgement.ack;
              return (
                <div key={r.id} onClick={() => { store.markViewed(r.id); setOpen(r); }} style={{ display: 'grid', gridTemplateColumns: '40px 1.6fr 1fr 1fr 0.9fr 0.8fr 36px', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${DS.border}`, alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: acc + '18', color: acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="file" size={16} /></div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                  <span style={{ fontSize: 12.5, color: DS.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</span>
                  <span style={{ fontSize: 12.5, color: DS.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.teacher}</span>
                  <span style={{ fontSize: 12.5, color: DS.muted }}>{r.datePublished}</span>
                  <span>{isRead
                    ? <Badge variant="success"><Icon name="check" size={10} /> Read</Badge>
                    : <Badge variant="accent">New</Badge>}</span>
                  <span style={{ justifySelf: 'end', display: 'flex' }}><Icon name="chevron_r" size={15} color={DS.muted} /></span>
                </div>
              );
            })}
          </div>
          {pageCount > 1 && <Pager page={curPage} pageCount={pageCount} onPage={setPage} total={list.length} perPage={PER_PAGE} />}
        </>
      )}
    </div>
  );
};

// Compact numbered pager: ‹ 1 2 3 › with a windowed page list and a result range.
const Pager = ({ page, pageCount, onPage, total, perPage }) => {
  // window of at most 5 page numbers centred on the current page
  const span = 5;
  let start = Math.max(1, page - Math.floor(span / 2));
  let end = Math.min(pageCount, start + span - 1);
  start = Math.max(1, end - span + 1);
  const nums = [];
  for (let i = start; i <= end; i++) nums.push(i);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const btn = (label, to_, disabled, active) => (
    <button key={label + to_} onClick={() => !disabled && onPage(to_)} disabled={disabled} style={{
      minWidth: 32, height: 32, padding: '0 8px', borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
      border: `1px solid ${active ? DS.accent : DS.border}`, background: active ? DS.accentLight : DS.bg,
      color: disabled ? DS.faint : active ? DS.accent : DS.sub, fontSize: 13, fontWeight: active ? 700 : 500 }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
      <span style={{ fontSize: 12.5, color: DS.muted }}>{from}–{to} of {total}</span>
      <div style={{ flex: 1 }} />
      {btn('‹', page - 1, page === 1)}
      {start > 1 && <>{btn('1', 1, false, page === 1)}<span style={{ color: DS.faint, fontSize: 13 }}>…</span></>}
      {nums.map(n => btn(String(n), n, false, n === page))}
      {end < pageCount && <><span style={{ color: DS.faint, fontSize: 13 }}>…</span>{btn(String(pageCount), pageCount, false, page === pageCount)}</>}
      {btn('›', page + 1, page === pageCount)}
    </div>
  );
};

// ─── Admin Reports configuration surface ───────────────────────────────────────────
const AdminToggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} style={{
    width: 40, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative',
    background: on ? DS.accent : DS.borderDark, transition: 'background .15s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
  </button>
);

const ToggleRow = ({ label, hint, on, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${DS.border}` }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{hint}</div>}
    </div>
    <AdminToggle on={on} onChange={onChange} />
  </div>
);

// ─── Reporting-rule model: enums, labels, the cascade resolver ───────────────────
// REQUIREMENT is CADENCE ("must a report be written, and how often?") — deliberately
// worded differently from the centre-standards completion floors ("required to
// complete a field"), which are a separate concept.
const RPT_REQUIREMENT = ['REQUIRED', 'OPTIONAL', 'OFF'];
const RPT_REQ_OPTIONS = [
  { value: 'REQUIRED', label: 'Required' }, { value: 'OPTIONAL', label: 'Optional' }, { value: 'OFF', label: 'Off' },
];
const RPT_REQ_META = {
  REQUIRED: { label: 'Report required', variant: 'accent',   short: 'Required' },
  OPTIONAL: { label: 'Report optional', variant: 'default',  short: 'Optional' },
  OFF:      { label: 'Reporting off',   variant: 'warning',  short: 'Off' },
};
// The rule model uses these 4 cadences; `days` drives teacher-dashboard due dates.
const RPT_FREQ = [
  { value: 'WEEKLY',      label: 'Weekly',      days: 7 },
  { value: 'FORTNIGHTLY', label: 'Fortnightly', days: 14 },
  { value: 'MONTHLY',     label: 'Monthly',     days: 30 },
  { value: 'TERMLY',      label: 'Termly',      days: 90 },
];
const rptFreqLabel = (v) => (RPT_FREQ.find(f => f.value === v) || { label: v || '—' }).label;
const rptFreqDays  = (v) => (RPT_FREQ.find(f => f.value === v) || { days: 90 }).days;
const RPT_TARGET_OPTIONS = [
  { value: 'TAG', label: 'Tag / group' }, { value: 'CLASS', label: 'Class' }, { value: 'STUDENT', label: 'Single student' },
];

// Entity sources (typeof-guarded globals, same pattern as adminStudentsData()).
function reportClasses()  { return (typeof SEED_CLASSES  !== 'undefined' && Array.isArray(SEED_CLASSES))  ? SEED_CLASSES  : []; }
function reportStudents() { return (typeof SEED_STUDENTS !== 'undefined' && Array.isArray(SEED_STUDENTS)) ? SEED_STUDENTS : []; }
function reportAllTags() {
  const set = new Set();
  reportClasses().forEach(c => (c.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort();
}
function reportClassById(id)   { return reportClasses().find(c => c.id === id); }
function reportStudentById(id) { return reportStudents().find(s => s.id === id); }
function reportStudentLabel(s) { return s ? `${s.firstName} ${s.lastName}` : ''; }

// Human label for a rule's target, e.g. "Class · A-Level Mathematics".
function ruleLabel(rule) {
  if (!rule) return 'Centre default';
  if (rule.targetType === 'STUDENT') return 'Student · ' + (reportStudentLabel(reportStudentById(rule.studentId)) || 'Unknown');
  if (rule.targetType === 'CLASS')   { const c = reportClassById(rule.classId); return 'Class · ' + (c ? c.name : 'Unknown'); }
  return 'Tag · ' + (rule.tag || '—');
}

// The cascade. `subject` is the narrowest matching target: student > class > tag,
// then same-level ties break on priority (higher wins). Falls back to the centre
// default. Always returns the winning rule + the rules it overrode for the resolver UI.
function resolvePolicy({ studentId, classId, tags }, config) {
  const rules = config.reportRules || [];
  const matches = rules.filter(r =>
    (r.targetType === 'STUDENT' && r.studentId === studentId) ||
    (r.targetType === 'CLASS'   && r.classId === classId) ||
    (r.targetType === 'TAG'     && (tags || []).includes(r.tag)));
  const narrow = { STUDENT: 3, CLASS: 2, TAG: 1 };
  matches.sort((a, b) => narrow[b.targetType] - narrow[a.targetType] || (b.priority || 0) - (a.priority || 0));
  const win = matches[0];
  const def = config.defaultRule || {};
  if (!win) return { requirement: def.requirement, frequency: def.frequency, templateId: def.templateId, source: 'Centre default', winner: null, overridden: [] };
  return { requirement: win.requirement, frequency: win.frequency, templateId: win.templateId, source: ruleLabel(win), winner: win, overridden: matches.slice(1) };
}

// Convenience: resolve straight from a SEED_STUDENTS record (derives class + tags).
function resolveForStudent(student, config) {
  const classId = (student.classIds || [])[0] || null;
  const klass = classId ? reportClassById(classId) : null;
  return resolvePolicy({ studentId: student.id, classId, tags: klass ? (klass.tags || []) : [] }, config);
}

// ─── Upcoming reports (shared by the teacher + admin Reports pages) ───────────────
// For every active student, resolve the effective reporting policy, then compute the
// next due date from (last published report || a notional last cycle) + the cadence.
// Skips OFF. Returns rows enriched with student / class / subject / teacher so callers
// can show "what's due next" grouped however they like. Mirrors the teacher-dashboard
// "Reports due" math so the two surfaces never disagree.
const RPT_DUE_BASE = '2026-03-15';        // notional last reporting cycle when none published
const RPT_SOON_DAYS = 14;                 // "due soon" window for the reminder badge
function rptAddDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function rptDaysBetween(fromIso, toIso) {
  const a = new Date(fromIso + 'T00:00:00'), b = new Date(toIso + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
function rptFmtDue(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

function computeUpcomingReports(config, store, opts = {}) {
  const today = opts.today || REPORTS_TODAY;
  const teacherName = opts.teacherName || null;   // when set, only this teacher's classes
  const reportsArr = store.reportsArr || [];
  return reportStudents().map(s => {
    if (s.status === 'inactive') return null;
    const classId = (s.classIds || [])[0] || null;
    const klass = classId ? reportClassById(classId) : null;
    if (teacherName && (!klass || (klass.teacher || '').split(' / ').indexOf(teacherName) === -1)) return null;
    const pol = resolveForStudent(s, config);
    if (pol.requirement === 'OFF') return null;
    const name = reportStudentLabel(s);
    const last = reportsArr
      .filter(r => r.studentName === name && r.status === 'published' && r.datePublished)
      .sort((a, b) => b.datePublished.localeCompare(a.datePublished))[0];
    const base = last ? last.datePublished : RPT_DUE_BASE;
    const due = rptAddDays(base, rptFreqDays(pol.frequency));
    const dueInDays = rptDaysBetween(today, due);
    const tpl = store.store.templates.find(t => t.id === pol.templateId);
    return {
      id: s.id, studentId: s.id, name,
      className: klass ? klass.name : '—', classGroup: klass ? klass.group : '',
      subject: klass ? klass.name : (s.subjects || [])[0] || '—',
      teacher: klass ? klass.teacher : '',
      requirement: pol.requirement, frequency: pol.frequency,
      templateName: tpl ? tpl.name : 'report', source: pol.source,
      due, dueInDays, overdue: due < today, soon: due >= today && dueInDays <= RPT_SOON_DAYS,
      lastPublished: last ? last.datePublished : null,
    };
  }).filter(Boolean)
    .sort((a, b) => (a.overdue === b.overdue ? a.due.localeCompare(b.due) : a.overdue ? -1 : 1));
}

// A relative "when" label: "Overdue · 3d", "Due today", "in 5 days", "5 Jul".
function rptDueChip(row) {
  if (row.overdue) return { label: `Overdue · ${rptFmtDue(row.due)}`, variant: 'danger' };
  if (row.dueInDays === 0) return { label: 'Due today', variant: 'warning' };
  if (row.soon) return { label: `Due in ${row.dueInDays} day${row.dueInDays === 1 ? '' : 's'}`, variant: 'warning' };
  return { label: `Due ${rptFmtDue(row.due)}`, variant: 'default' };
}

// One due row, shared by every surface. `dense` trims the avatar a touch for the
// sidebar widget, but keeps the full report/subject text and due chip readable.
const UpcomingReportRow = ({ r, showTeacher, dense, onClick }) => {
  const chip = rptDueChip(r);
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: dense ? '11px 14px' : '10px 12px', borderBottom: `1px solid ${DS.border}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <Avatar name={r.name} size={dense ? 30 : 30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.name}
        </div>
        <div style={{ fontSize: 11.5, color: DS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
          {`${rptFreqLabel(r.frequency)} report · ${r.subject}`}
          {!dense && r.classGroup ? ` · ${r.classGroup}` : ''}
          {showTeacher && r.teacher ? ` · ${r.teacher}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <Badge variant={chip.variant}>{chip.label}</Badge>
        {r.requirement === 'OPTIONAL' && <Badge variant="default">Optional</Badge>}
      </div>
    </div>
  );
};

// Small header badge summarising the scope (overdue → due-soon → clear).
const upcomingSummaryBadge = (rows) => {
  const overdue = rows.filter(r => r.overdue).length;
  const soon = rows.filter(r => r.soon || r.dueInDays === 0).length;
  if (overdue > 0) return <Badge variant="danger"><Icon name="flag" size={11} /> {overdue} overdue</Badge>;
  if (soon > 0)    return <Badge variant="warning"><Icon name="clock" size={11} /> {soon} due soon</Badge>;
  return <Badge variant="success"><Icon name="check" size={11} /> Nothing due soon</Badge>;
};

// Shared "Upcoming reports" widget. Two shapes:
//  • compact (sidebar): a tight card that fills the rail space, overdue first, with a
//    footer button that opens the full "Reports due" page.
//  • full card (admin overview): wider rows incl. the teacher column.
// `showTeacher` adds teacher context; `limit` caps rows; `onView` opens the full page.
const UpcomingReports = ({ config, store, teacherName, showTeacher = false, limit = 8, compact = false, onView }) => {
  const rows = computeUpcomingReports(config, store, { teacherName });
  const shown = rows.slice(0, limit);
  const empty = (
    <div style={{ padding: compact ? '14px 12px' : '20px 14px', fontSize: compact ? 12.5 : 13, color: DS.muted }}>
      Nothing due — every student in scope resolves to <strong>optional</strong> or <strong>off</strong>, or is already up to date.
    </div>
  );

  if (compact) {
    return (
      <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: `1px solid ${DS.border}` }}>
          <Icon name="clock" size={16} color={DS.accent} />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: DS.text }}>Reports due</span>
          {upcomingSummaryBadge(rows)}
        </div>
        {shown.length === 0 ? empty : shown.map(r => (
          <UpcomingReportRow key={r.id} r={r} showTeacher={showTeacher} dense onClick={onView} />
        ))}
        {rows.length > 0 && (
          <button onClick={onView} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
            padding: '11px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: DS.accent }}>
            View all {rows.length} due <Icon name="chevron_r" size={13} color={DS.accent} />
          </button>
        )}
      </div>
    );
  }

  return (
    <Card
      title="Upcoming reports"
      subtitle="Next report due for each student, by class and subject"
      actions={[
        <React.Fragment key="b">{upcomingSummaryBadge(rows)}</React.Fragment>,
        onView && <Btn key="v" variant="ghost" icon="eye" small onClick={onView}>View all due</Btn>,
      ].filter(Boolean)}
    >
      <div style={{ padding: '6px 8px 10px' }}>
        {shown.length === 0 ? empty : shown.map(r => (
          <UpcomingReportRow key={r.id} r={r} showTeacher={showTeacher} />
        ))}
        {rows.length > shown.length && (
          <button onClick={onView} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px 2px', border: 'none', background: 'transparent', cursor: onView ? 'pointer' : 'default', fontSize: 12, fontWeight: 600, color: onView ? DS.accent : DS.muted }}>
            +{rows.length - shown.length} more — view all due
          </button>
        )}
      </div>
    </Card>
  );
};

// Full-page "Reports due" surface: every due report in order (overdue first), with a
// grouped/flat toggle and a back button. Opened from the compact sidebar widget or the
// admin overview card. Pure presentation — reuses computeUpcomingReports.
const UpcomingReportsPage = ({ config, store, teacherName, showTeacher = false, onBack, onOpenStudent }) => {
  const [groupBy, setGroupBy] = React.useState('none');   // none | class | subject
  const rows = computeUpcomingReports(config, store, { teacherName });
  const overdue = rows.filter(r => r.overdue).length;
  const soon = rows.filter(r => r.soon || r.dueInDays === 0).length;

  // Group rows; each group keeps the overdue-first order from computeUpcomingReports.
  const groups = (() => {
    if (groupBy === 'none') return [{ key: 'all', label: null, items: rows }];
    const keyOf = (r) => groupBy === 'class' ? (r.classGroup ? `${r.subject} · ${r.classGroup}` : r.subject) : r.subject;
    const map = new Map();
    rows.forEach(r => { const k = keyOf(r); if (!map.has(k)) map.set(k, []); map.get(k).push(r); });
    // groups ordered by their soonest due item
    return Array.from(map.entries())
      .map(([label, items]) => ({ key: label, label, items }))
      .sort((a, b) => a.items[0].due.localeCompare(b.items[0].due));
  })();

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, fontSize: 13 }}>
          ← Back to reports
        </button>
      </div>
      <PageHeader title="Reports due" subtitle={teacherName ? 'Every student you teach with a report coming up, soonest first' : 'Every student with a report coming up, soonest first'} actions={[
        overdue > 0 && <Badge key="o" variant="danger"><Icon name="flag" size={11} /> {overdue} overdue</Badge>,
        soon > 0 && <Badge key="s" variant="warning"><Icon name="clock" size={11} /> {soon} due soon</Badge>,
        <Badge key="t" variant="accent">{rows.length} total</Badge>,
      ].filter(Boolean)} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12.5, color: DS.muted }}>Group by</span>
        <Segmented value={groupBy} onChange={setGroupBy} options={[
          { value: 'none', label: 'None' }, { value: 'class', label: 'Class' }, { value: 'subject', label: 'Subject' },
        ]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="check" title="Nothing due" message="Every student in scope resolves to optional or off, or is already up to date." />
      ) : groups.map(g => (
        <div key={g.key} style={{ marginBottom: g.label ? 18 : 0 }}>
          {g.label && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 2px 8px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: DS.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{g.label}</span>
              <span style={{ fontSize: 11, color: DS.faint }}>· {g.items.length}</span>
            </div>
          )}
          <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {g.items.map(r => (
              <UpcomingReportRow key={r.id} r={r} showTeacher={showTeacher}
                onClick={onOpenStudent ? () => onOpenStudent(r) : undefined} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── "Teachers see →" consequence preview ────────────────────────────────────────
// The one UX principle applied across the settings page: next to each control,
// show what changes downstream for a teacher.
const TeachersSee = ({ children, style }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '9px 12px',
    background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 8, ...style,
  }}>
    <span style={{ color: DS.accent, display: 'flex', marginTop: 1 }}><Icon name="eye" size={14} /></span>
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: DS.accent, letterSpacing: '0.02em' }}>Teachers see → </span>
      <span style={{ fontSize: 12.5, color: DS.sub }}>{children}</span>
    </div>
  </div>
);

// ─── Reporting rules editor (Settings §1) ────────────────────────────────────────
// Centre default rule + a priority-ordered list of override rules (tag/class/student)
// + a live resolver that shows the effective policy and the full winning cascade.
const AdminReportingRules = ({ store, config }) => {
  const rules = config.reportRules || [];
  const def = config.defaultRule || {};
  const templates = store.store.templates;
  const tags = reportAllTags();
  const classes = reportClasses();
  const students = reportStudents();

  const tplName = (id) => { const t = templates.find(x => x.id === id); return t ? t.name : '— none —'; };
  const saveRules = (next) => store.setReportRules(next);
  const updateRule = (id, patch) => saveRules(rules.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeRule = (id) => saveRules(rules.filter(r => r.id !== id));
  // Priority reorder: higher priority wins ties, so "move up" raises priority above
  // its predecessor. We display rules sorted by priority desc and renumber on reorder.
  const sorted = rules.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const move = (id, dir) => {
    const i = sorted.findIndex(r => r.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const reordered = sorted.slice();
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    // renumber priorities top→bottom (descending) so the new order sticks
    const n = reordered.length;
    saveRules(reordered.map((r, k) => ({ ...r, priority: (n - k) * 10 })));
  };
  const addRule = () => {
    const maxP = rules.reduce((m, r) => Math.max(m, r.priority || 0), 0);
    saveRules([...rules, {
      id: 'rr_' + Date.now(), targetType: 'TAG', tag: tags[0] || '',
      requirement: 'REQUIRED', frequency: 'TERMLY', templateId: def.templateId || (templates[0] && templates[0].id),
      priority: maxP + 10,
    }]);
  };

  // Default-target choices for a freshly switched targetType.
  const firstTarget = (type) => type === 'TAG' ? { tag: tags[0] || '' }
    : type === 'CLASS' ? { classId: (classes[0] || {}).id }
    : { studentId: (students[0] || {}).id };

  // ── Live resolver ──
  const [pvType, setPvType] = React.useState('STUDENT');
  const [pvStudent, setPvStudent] = React.useState((students[0] || {}).id || '');
  const [pvClass, setPvClass] = React.useState((classes[0] || {}).id || '');
  let resolved, resolverLabel;
  if (pvType === 'STUDENT') {
    const s = reportStudentById(pvStudent);
    resolved = s ? resolveForStudent(s, config) : null;
    resolverLabel = s ? reportStudentLabel(s) : '';
  } else {
    const c = reportClassById(pvClass);
    resolved = c ? resolvePolicy({ classId: c.id, tags: c.tags || [] }, config) : null;
    resolverLabel = c ? c.name : '';
  }

  const TargetSelect = ({ rule, onChange }) => {
    if (rule.targetType === 'TAG') return (
      <Select value={rule.tag || ''} onChange={e => onChange({ tag: e.target.value })}>
        {tags.map(t => <option key={t} value={t}>{t}</option>)}
        {!tags.includes(rule.tag) && rule.tag && <option value={rule.tag}>{rule.tag}</option>}
      </Select>
    );
    if (rule.targetType === 'CLASS') return (
      <Select value={rule.classId || ''} onChange={e => onChange({ classId: e.target.value })}>
        {classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.group}</option>)}
      </Select>
    );
    return (
      <Select value={rule.studentId || ''} onChange={e => onChange({ studentId: e.target.value })}>
        {students.map(s => <option key={s.id} value={s.id}>{reportStudentLabel(s)}</option>)}
      </Select>
    );
  };

  return (
    <Card title="Reporting rules" subtitle="Whether a report is required, how often, and which template applies"
      actions={[<Btn key="a" variant="ghost" icon="plus" small onClick={addRule}>Add rule</Btn>]}>
      <div style={{ padding: '14px 20px 18px' }}>
        {/* Centre default */}
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.muted, letterSpacing: '0.04em', marginBottom: 8 }}>CENTRE DEFAULT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 1fr', gap: 12, alignItems: 'end', padding: '12px 14px', borderRadius: 10, background: DS.surface, border: `1px solid ${DS.borderDark}` }}>
          <Field label="Requirement" style={{ margin: 0 }}>
            <Segmented value={def.requirement} onChange={v => store.setDefaultRule({ requirement: v })} options={RPT_REQ_OPTIONS} fullWidth />
          </Field>
          <Field label="Frequency" style={{ margin: 0 }}>
            <Select value={def.frequency || ''} disabled={def.requirement === 'OFF'} onChange={e => store.setDefaultRule({ frequency: e.target.value })}>
              {RPT_FREQ.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Field>
          <Field label="Template" style={{ margin: 0 }}>
            <Select value={def.templateId || ''} onChange={e => store.setDefaultRule({ templateId: e.target.value })}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ fontSize: 12, color: DS.muted, marginTop: 6 }}>Applies to anyone not covered by an override rule below.</div>

        {/* Override rules */}
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.muted, letterSpacing: '0.04em', margin: '18px 0 8px' }}>OVERRIDE RULES <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: DS.faint }}>· narrowest target wins (student → class → tag); ties break on priority</span></div>
        {sorted.length === 0 && (
          <div style={{ fontSize: 12.5, color: DS.muted, padding: '6px 2px' }}>No override rules — the centre default applies everywhere.</div>
        )}
        {sorted.map((r, idx) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '130px minmax(150px, 1.2fr) 230px 140px minmax(160px, 1.4fr) 46px 30px', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 8, border: `1px solid ${DS.borderDark}`, marginBottom: 8 }}>
            <Select value={r.targetType} onChange={e => updateRule(r.id, { targetType: e.target.value, ...firstTarget(e.target.value) })}>
              {RPT_TARGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <TargetSelect rule={r} onChange={patch => updateRule(r.id, patch)} />
            <Segmented value={r.requirement} onChange={v => updateRule(r.id, { requirement: v })} options={RPT_REQ_OPTIONS} fullWidth />
            <Select value={r.frequency || ''} disabled={r.requirement === 'OFF'} onChange={e => updateRule(r.id, { frequency: e.target.value })}>
              {RPT_FREQ.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
            <Select value={r.templateId || ''} title={tplName(r.templateId)} disabled={r.requirement === 'OFF'} onChange={e => updateRule(r.id, { templateId: e.target.value })}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => move(r.id, -1)} disabled={idx === 0} title="Higher priority" style={{ border: `1px solid ${DS.border}`, background: DS.bg, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? DS.border : DS.muted, borderRadius: 5, padding: '1px 4px', lineHeight: 0 }}><Icon name="chevron_d" size={12} color="currentColor" /></button>
              <button onClick={() => move(r.id, 1)} disabled={idx === sorted.length - 1} title="Lower priority" style={{ border: `1px solid ${DS.border}`, background: DS.bg, cursor: idx === sorted.length - 1 ? 'default' : 'pointer', color: idx === sorted.length - 1 ? DS.border : DS.muted, borderRadius: 5, padding: '1px 4px', lineHeight: 0, transform: 'rotate(180deg)' }}><Icon name="chevron_d" size={12} color="currentColor" /></button>
            </div>
            <button onClick={() => removeRule(r.id)} title="Remove rule" style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.faint, padding: 4 }}><Icon name="trash" size={15} /></button>
          </div>
        ))}

        {/* Live resolver */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${DS.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.muted, letterSpacing: '0.04em', marginBottom: 8 }}>WHAT APPLIES TO…</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Segmented value={pvType} onChange={setPvType} options={[{ value: 'STUDENT', label: 'A student' }, { value: 'CLASS', label: 'A class' }]} />
            {pvType === 'STUDENT'
              ? <Select value={pvStudent} onChange={e => setPvStudent(e.target.value)} style={{ minWidth: 180 }}>{students.map(s => <option key={s.id} value={s.id}>{reportStudentLabel(s)}</option>)}</Select>
              : <Select value={pvClass} onChange={e => setPvClass(e.target.value)} style={{ minWidth: 220 }}>{classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.group}</option>)}</Select>}
          </div>
          {resolved && (
            <div style={{ padding: '14px 16px', borderRadius: 10, background: DS.surface, border: `1px solid ${DS.borderDark}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{resolverLabel}</span>
                <span style={{ fontSize: 13, color: DS.muted }}>→</span>
                <Badge variant={RPT_REQ_META[resolved.requirement].variant}>{RPT_REQ_META[resolved.requirement].label}</Badge>
                {resolved.requirement !== 'OFF' && <>
                  <span style={{ fontSize: 12.5, color: DS.sub }}>{rptFreqLabel(resolved.frequency)}</span>
                  <span style={{ fontSize: 12.5, color: DS.muted }}>· template: {tplName(resolved.templateId)}</span>
                </>}
              </div>
              {/* cascade: winner + overridden */}
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="check" size={13} color={DS.success} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>Winning rule: {resolved.source}</span>
                </div>
                {resolved.overridden.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 21 }}>
                    <span style={{ fontSize: 11.5, color: DS.faint, textDecoration: 'line-through' }}>{ruleLabel(o)}</span>
                    <span style={{ fontSize: 11, color: DS.faint }}>(overridden)</span>
                  </div>
                ))}
                {!resolved.winner && <div style={{ fontSize: 11.5, color: DS.muted, paddingLeft: 21 }}>No override matched — centre default applied.</div>}
              </div>
            </div>
          )}
        </div>

        <TeachersSee>
          {def.requirement === 'OFF' && (config.reportRules || []).every(r => r.requirement === 'OFF')
            ? 'No “Reports due” items on teacher dashboards while reporting is off everywhere.'
            : <>A <strong>Reports due</strong> list on each teacher’s dashboard (e.g. “{rptFreqLabel(def.frequency)} report — Oliver Chen — due 12 Dec”), with reminders and overdue flags. Students who resolve to <strong>Off</strong> never appear.</>}
        </TeachersSee>
      </div>
    </Card>
  );
};

// ─── Template builder (full split-screen page: settings ↔ live PDF preview) ──────
// Sections render in this fixed order in the PDF; toggling one hides it live.
const RPT_ALL_SECTIONS = [
  'studentInfo', 'academic', 'attendance', 'ratings', 'comments',
  'strengths', 'improvements', 'homework', 'targets', 'attachments', 'parentNotes', 'footer',
];
const RPT_BUILTIN_RATING_CATS = ['behaviour', 'effort', 'homework', 'participation', 'confidence', 'communication', 'subjectKnowledge'];

// A blank template seeds sensible sections + illustrative 0–1 scores per category.
function blankTemplate() {
  return {
    name: '', description: '', scope: 'centre', locked: false, default: false,
    sections: ['studentInfo', 'academic', 'ratings', 'comments', 'strengths', 'improvements', 'targets', 'footer'],
    ratingCategories: ['behaviour', 'effort', 'homework', 'participation'],
    customCategories: [],          // [{ key, label }] admin-defined categories
    ratingScale: 'fourtier',
    ratingScores: {},              // 0–1 per category key; backfilled in the builder
    assignedYears: [], assignedSubjects: [], assignedClasses: [],
  };
}

// Illustrative sample data so the preview shows a realistic, populated report.
const RPT_SAMPLE = {
  centreName: 'Brighton Academy of Excellence', logo: 'BA',
  studentName: 'Oliver Chen', className: 'Mathematics — Year 12 (Set A)', subject: 'Mathematics',
  teacher: 'Ms. Sarah Clarke', year: 'Year 12', predicted: 'A*', period: 'Summer Term 2026',
  understanding: 0.9, participation: 0.78, homeworkCompletion: '94%', testPerformance: '88%',
  attendanceRate: '98%', punctuality: 'Excellent', engagement: 'Highly engaged',
  comments: '<p><strong>A genuinely strong term.</strong> Oliver has shown excellent command of integration techniques and consistently produces well-structured solutions.</p>',
  strengths: ['Clear, well-structured working', 'Strong conceptual understanding', 'Excellent class participation'],
  improvements: ['Improve speed under timed conditions', 'Review exam command words carefully'],
  homework: { setRate: '12 of 12 set tasks completed', independent: 'Regularly attempts extension problems', notes: 'Consistently goes beyond the core task.' },
  current: ['Complete weekly past-paper questions under timed conditions'],
  longTerm: ['Achieve a secure A* in summer mock examinations'],
  attachments: [{ name: 'Mock_Paper_1_Annotated.pdf', size: '482 KB' }, { name: 'Topic_Tracker.xlsx', size: '64 KB' }],
  parentNotes: 'Please continue to support a consistent home study routine and check the homework planner weekly.',
};
// deterministic illustrative score for a category not yet given one
function rptSampleScore(key) {
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return 0.62 + (h % 36) / 100;   // 0.62 – 0.97
}

const AdminTemplateBuilder = ({ template, store, onClose, onSaved }) => {
  const isNew = !template;
  const [t, setT] = React.useState(template ? { ...blankTemplate(), ...template } : blankTemplate());
  const [newCat, setNewCat] = React.useState('');
  const set = (patch) => setT(prev => ({ ...prev, ...patch }));

  const students = adminStudentsData();
  const years = Array.from(new Set(students.map(s => s.year))).sort();
  const subjects = Array.from(new Set(store.reportsArr.map(r => r.subject))).filter(Boolean).sort();
  const classes = Array.from(new Set(store.reportsArr.map(r => r.className))).filter(Boolean).sort();
  const branding = store.store.config.branding;
  const acc = branding.primaryColor || DS.accent;

  const has = (s) => (t.sections || []).includes(s);
  const toggleSection = (s) => set({ sections: has(s) ? t.sections.filter(x => x !== s) : [...(t.sections || []), s] });
  const toggleIn = (key, val) => set({ [key]: (t[key] || []).includes(val) ? t[key].filter(x => x !== val) : [...(t[key] || []), val] });

  // category metadata (built-in + custom) and a score for each active category
  const customCats = t.customCategories || [];
  const catLabel = (k) => RPT_RATING_LABELS[k] || (customCats.find(c => c.key === k) || {}).label || k;
  const allCats = [...RPT_BUILTIN_RATING_CATS, ...customCats.map(c => c.key)];
  const activeCats = (t.ratingCategories || []).filter(k => allCats.includes(k));
  const scoreFor = (k) => (t.ratingScores && t.ratingScores[k] != null) ? t.ratingScores[k] : rptSampleScore(k);

  const addCustomCat = () => {
    const label = newCat.trim();
    if (!label) return;
    const key = 'cat_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (allCats.includes(key)) { setNewCat(''); return; }
    set({
      customCategories: [...customCats, { key, label }],
      ratingCategories: [...(t.ratingCategories || []), key],
    });
    setNewCat('');
  };
  const removeCustomCat = (key) => set({
    customCategories: customCats.filter(c => c.key !== key),
    ratingCategories: (t.ratingCategories || []).filter(k => k !== key),
  });

  const commit = () => {
    const payload = { ...t, name: t.name.trim() || 'Untitled Template' };
    if (isNew) onSaved(store.addTemplate(payload), 'created');
    else { store.updateTemplate(template.id, payload); onSaved(template.id, 'updated'); }
  };

  const Chip = ({ on, onClick, children, onRemove }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${on ? DS.accentBorder : DS.border}`, background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.muted }} onClick={onClick}>
      {children}
      {onRemove && <span onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ opacity: 0.7, fontSize: 13 }}>×</span>}
    </span>
  );

  const exportPdf = () => printReportPDF(templateSampleReport(t, branding), branding, { sections: t.sections });

  return (
    // Fills the admin content area (viewport minus the 40px TopBar); columns scroll internally.
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
      {/* top action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: `1px solid ${DS.border}`, background: DS.bg }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, fontSize: 13 }}>← Back to settings</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{isNew ? 'New report template' : 'Edit template'}</div>
          <div style={{ fontSize: 12, color: DS.muted }}>Toggle sections, ratings and categories — the preview updates live</div>
        </div>
        <div style={{ flex: 1 }} />
        <Btn variant="secondary" icon="print" small onClick={exportPdf}>Export sample PDF</Btn>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" small onClick={commit}>{isNew ? 'Create template' : 'Save changes'}</Btn>
      </div>

      {/* split screen */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ── settings panel (left) ── */}
        <div style={{ width: 420, flexShrink: 0, borderRight: `1px solid ${DS.border}`, overflow: 'auto', padding: '20px 22px', background: DS.bg }}>
          <Field label="Template name"><Input value={t.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Termly Progress Report" /></Field>
          <Field label="Description"><Textarea value={t.description} onChange={e => set({ description: e.target.value })} rows={2} placeholder="What is this template for?" /></Field>

          <Divider margin="16px 0 6px" />
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '8px 0' }}>Sections</div>
          {RPT_ALL_SECTIONS.map(s => (
            <ToggleRow key={s} label={RPT_SECTION_LABELS[s]} on={has(s)} onChange={() => toggleSection(s)} />
          ))}

          {has('ratings') && (
            <>
              <Divider margin="18px 0 6px" />
              <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '8px 0' }}>Rating scale</div>
              <div style={{ width: '100%' }}>
                <Segmented value={t.ratingScale} onChange={v => set({ ratingScale: v })}
                  options={[{ value: 'fourtier', label: 'Excellent → NI' }, { value: 'stars', label: '1–5 Stars' }, { value: 'percent', label: 'Percentage' }]} fullWidth />
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '18px 0 8px' }}>Rating categories</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RPT_BUILTIN_RATING_CATS.map(rc => <Chip key={rc} on={(t.ratingCategories || []).includes(rc)} onClick={() => toggleIn('ratingCategories', rc)}>{RPT_RATING_LABELS[rc]}</Chip>)}
                {customCats.map(c => <Chip key={c.key} on={(t.ratingCategories || []).includes(c.key)} onClick={() => toggleIn('ratingCategories', c.key)} onRemove={() => removeCustomCat(c.key)}>{c.label}</Chip>)}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Add custom category…"
                  onKeyDown={e => { if (e.key === 'Enter') addCustomCat(); }} style={{ flex: 1 }} />
                <Btn variant="secondary" icon="plus" small onClick={addCustomCat}>Add</Btn>
              </div>
            </>
          )}

          <Divider margin="18px 0 6px" />
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '8px 0' }}>Availability</div>
          <Field label="Assign to year groups" hint="Leave empty to make available everywhere">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {years.map(y => <Chip key={y} on={(t.assignedYears || []).includes(y)} onClick={() => toggleIn('assignedYears', y)}>{y}</Chip>)}
            </div>
          </Field>
          <Field label="Assign to subjects">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {subjects.map(s => <Chip key={s} on={(t.assignedSubjects || []).includes(s)} onClick={() => toggleIn('assignedSubjects', s)}>{s}</Chip>)}
            </div>
          </Field>
          {classes.length > 0 && (
            <Field label="Assign to classes / groups">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflow: 'auto' }}>
                {classes.map(cl => <Chip key={cl} on={(t.assignedClasses || []).includes(cl)} onClick={() => toggleIn('assignedClasses', cl)}>{cl}</Chip>)}
              </div>
            </Field>
          )}

          <Divider margin="18px 0 10px" />
          <ToggleRow label="Set as default template" on={!!t.default} onChange={v => set({ default: v })} />
          <ToggleRow label="Lock (admin-only edits)" on={!!t.locked} onChange={v => set({ locked: v })} />
        </div>

        {/* ── live PDF preview (right) ── */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: DS.surface, padding: '28px 24px' }}>
          <TemplatePreview t={t} acc={acc} branding={branding} activeCats={activeCats} scoreFor={scoreFor} catLabel={catLabel} has={has} />
        </div>
      </div>
    </div>
  );
};

// Live A4-styled preview of a template, section-gated. Mirrors the PDF layout
// (reportPdfBody) so the builder and export stay one source of truth.
const TemplatePreview = ({ t, acc, branding, activeCats, scoreFor, catLabel, has }) => {
  const S = RPT_SAMPLE;
  const anyOn = (t.sections || []).length > 0;
  const H = ({ children }) => (
    <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '20px 0 8px', paddingBottom: 5, borderBottom: `2px solid ${acc}`, color: DS.text }}>{children}</h2>
  );
  const KV = ({ rows }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
      {rows.map(([k, v], i) => (
        <tr key={i}><td style={{ padding: '5px 8px', borderBottom: `1px solid ${DS.border}`, fontSize: 12.5, color: DS.muted }}>{k}</td>
          <td style={{ padding: '5px 8px', borderBottom: `1px solid ${DS.border}`, fontSize: 12.5, fontWeight: 600, textAlign: 'right', color: DS.text }}>{v}</td></tr>
      ))}
    </tbody></table>
  );
  const Bullets = ({ items }) => (
    <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{items.map((x, i) => <li key={i} style={{ fontSize: 12.5, color: DS.sub, marginBottom: 3 }}>{x}</li>)}</ul>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 6, boxShadow: '0 1px 3px rgba(17,24,39,0.12)', minHeight: '100%', padding: '40px 44px' }}>
      {!anyOn ? (
        <EmptyState icon="file" title="No sections selected" message="Turn on at least one section to start building this report template." />
      ) : (
        <>
          {/* header (always shown — centre crest + title) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: `2px solid ${DS.border}` }}>
            <div style={{ width: 50, height: 50, borderRadius: 10, background: acc, color: '#fff', fontWeight: 800, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{branding.logo || 'BA'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{branding.centreName || S.centreName}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: acc }}>{branding.headerText || 'Progress Report'}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: DS.muted }}><div>{S.period}</div><div style={{ color: DS.faint }}>Issued {REPORTS_TODAY}</div></div>
          </div>

          {has('studentInfo') && (
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}><tbody>
              {[['Student', S.studentName, 'Class', S.className], ['Subject', S.subject, 'Teacher', S.teacher], ['Year group', S.year, 'Predicted', S.predicted]].map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 8px', border: `1px solid ${DS.border}`, background: DS.surface, fontSize: 11.5, fontWeight: 600, color: DS.muted, width: 90 }}>{row[0]}</td>
                  <td style={{ padding: '5px 8px', border: `1px solid ${DS.border}`, fontSize: 12.5, color: DS.text }}>{row[1]}</td>
                  <td style={{ padding: '5px 8px', border: `1px solid ${DS.border}`, background: DS.surface, fontSize: 11.5, fontWeight: 600, color: DS.muted, width: 90 }}>{row[2]}</td>
                  <td style={{ padding: '5px 8px', border: `1px solid ${DS.border}`, fontSize: 12.5, color: DS.text }}>{row[3]}</td>
                </tr>
              ))}
            </tbody></table>
          )}

          {has('academic') && (<><H>Academic Progress</H>
            <KV rows={[
              ['Understanding of topics', <ScorePips score={S.understanding} />],
              ['Class participation', <ScorePips score={S.participation} />],
              ['Homework completion', S.homeworkCompletion],
              ['Test performance', S.testPerformance],
            ]} /></>)}

          {has('attendance') && (<><H>Attendance &amp; Engagement</H>
            <KV rows={[['Attendance', S.attendanceRate], ['Punctuality', S.punctuality], ['Engagement', S.engagement]]} /></>)}

          {has('ratings') && (<><H>Performance Ratings</H>
            {activeCats.length ? activeCats.map(k => (
              <ScoreRow key={k} label={catLabel(k)} scale={t.ratingScale} score={scoreFor(k)} />
            )) : <div style={{ fontSize: 12.5, color: DS.faint, padding: '6px 0' }}>No rating categories selected.</div>}</>)}

          {has('comments') && (<><H>Teacher Comments</H>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: DS.sub }} dangerouslySetInnerHTML={{ __html: S.comments }} /></>)}

          {has('strengths') && (<><H>Strengths</H><Bullets items={S.strengths} /></>)}
          {has('improvements') && (<><H>Areas for Improvement</H><Bullets items={S.improvements} /></>)}

          {has('homework') && (<><H>Homework &amp; Independent Study</H>
            <KV rows={[['Set tasks', S.homework.setRate], ['Independent study', S.homework.independent]]} />
            <div style={{ fontSize: 12.5, color: DS.sub, marginTop: 6 }}>{S.homework.notes}</div></>)}

          {has('targets') && (<><H>Targets &amp; Next Steps</H>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: DS.text }}>Current targets</div><Bullets items={S.current} /></div>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: DS.text }}>Long-term goals</div><Bullets items={S.longTerm} /></div>
            </div></>)}

          {has('attachments') && (<><H>Attachments</H>
            <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{S.attachments.map((a, i) => (
              <li key={i} style={{ fontSize: 12.5, color: DS.sub, marginBottom: 3 }}>{a.name} <span style={{ color: DS.faint }}>({a.size})</span></li>
            ))}</ul></>)}

          {has('parentNotes') && (<><H>Parent Notes</H>
            <div style={{ fontSize: 12.5, color: DS.sub, lineHeight: 1.6 }}>{S.parentNotes}</div></>)}

          {has('footer') && (
            <div style={{ marginTop: 30, paddingTop: 14, borderTop: `1px solid ${DS.border}`, textAlign: 'center', fontSize: 10.5, color: DS.faint }}>
              {branding.footerText || S.centreName}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Build an illustrative report record from a template, so the existing PDF
// pipeline (reportPdfBody) can render the same content for export.
function templateSampleReport(t, branding) {
  const S = RPT_SAMPLE;
  const cats = (t.ratingCategories || []);
  const customCats = t.customCategories || [];
  const ratings = {};
  cats.forEach(k => { ratings[k] = rptRatingText(t.ratingScale, rptScoreToScale(t.ratingScale, (t.ratingScores && t.ratingScores[k] != null) ? t.ratingScores[k] : rptSampleScore(k))); });
  return {
    id: 'tpl_preview', title: `${S.period} — ${S.subject} Progress Report`,
    studentName: S.studentName, className: S.className, subject: S.subject, teacher: S.teacher,
    year: S.year, predicted: S.predicted, period: S.period,
    datePublished: REPORTS_TODAY, dateCreated: REPORTS_TODAY,
    academic: {
      understanding: rptScoreToFourtier(S.understanding), participation: rptScoreToFourtier(S.participation),
      homeworkCompletion: S.homeworkCompletion, testPerformance: S.testPerformance, attendance: S.attendanceRate,
      strengths: S.strengths, improvements: S.improvements,
    },
    ratingScale: t.ratingScale,
    // map category keys to readable labels for the PDF rows
    ratings, ratingLabels: cats.reduce((m, k) => { m[k] = RPT_RATING_LABELS[k] || (customCats.find(c => c.key === k) || {}).label || k; return m; }, {}),
    comments: S.comments,
    targets: { current: S.current, longTerm: S.longTerm, revision: [], parentActions: [S.parentNotes], teacherActions: [] },
    attachments: S.attachments.map(a => ({ name: a.name, type: 'pdf', size: a.size })),
    acknowledgement: { ack: false, at: null },
  };
}

// ─── Admin All-Reports browser (view every report by every teacher) ──────────────
const AdminReportsBrowser = ({ store }) => {
  const reports = store.reportsArr;
  const [reading, setReading] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [teacher, setTeacher] = React.useState('all');
  const [subject, setSubject] = React.useState('all');
  const [year, setYear] = React.useState('all');
  const [klass, setKlass] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [sort, setSort] = React.useState('newest');

  const uniq = (key) => Array.from(new Set(reports.map(r => r[key]).filter(Boolean))).sort();
  const teachers = uniq('teacher'), subjects = uniq('subject'), years = uniq('year'), classes = uniq('className');

  let list = reports.filter(r =>
    (teacher === 'all' || r.teacher === teacher) &&
    (subject === 'all' || r.subject === subject) &&
    (year === 'all' || r.year === year) &&
    (klass === 'all' || r.className === klass) &&
    (status === 'all' || r.status === status));
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(r => (r.title + r.studentName + r.subject + r.teacher + r.className).toLowerCase().includes(q));
  }
  list = list.slice().sort((a, b) => {
    if (sort === 'student') return a.studentName.localeCompare(b.studentName);
    if (sort === 'teacher') return a.teacher.localeCompare(b.teacher);
    const da = a.datePublished || a.dateModified || a.dateCreated, db = b.datePublished || b.dateModified || b.dateCreated;
    return sort === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
  });

  const branding = store.store.config.branding;
  const resetFilters = () => { setTeacher('all'); setSubject('all'); setYear('all'); setKlass('all'); setStatus('all'); setSearch(''); };
  const activeFilters = [teacher, subject, year, klass, status].filter(v => v !== 'all').length + (search.trim() ? 1 : 0);

  if (reading) {
    const r = store.reportsArr.find(x => x.id === reading) || reading;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button onClick={() => setReading(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, fontSize: 13 }}>← Back to all reports</button>
          <div style={{ flex: 1 }} />
          <Badge variant={RPT_STATUS_META[r.status].variant}>{RPT_STATUS_META[r.status].label}</Badge>
          <Btn variant="secondary" icon="print" small onClick={() => printReportPDF(r, branding)}>Export PDF</Btn>
        </div>
        <ReportReadingView report={r} tags={store.store.tags} />
      </div>
    );
  }

  const Filter = ({ value, onChange, all, opts }) => (
    <Select value={value} onChange={e => onChange(e.target.value)} style={{ minWidth: 120 }}>
      <option value="all">{all}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </Select>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, teacher, subject, class…" style={{ minWidth: 260, maxWidth: 360 }} />
        <Filter value={teacher} onChange={setTeacher} all="All teachers" opts={teachers} />
        <Filter value={subject} onChange={setSubject} all="All subjects" opts={subjects} />
        <Filter value={year} onChange={setYear} all="All years" opts={years} />
        <Filter value={klass} onChange={setKlass} all="All classes" opts={classes} />
        <Select value={status} onChange={e => setStatus(e.target.value)} style={{ minWidth: 120 }}>
          <option value="all">All statuses</option>
          {Object.keys(RPT_STATUS_META).map(s => <option key={s} value={s}>{RPT_STATUS_META[s].label}</option>)}
        </Select>
        <Select value={sort} onChange={e => setSort(e.target.value)} style={{ minWidth: 130 }}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          <option value="student">By student</option><option value="teacher">By teacher</option>
        </Select>
        {activeFilters > 0 && <Btn variant="ghost" small icon="x" onClick={resetFilters}>Clear ({activeFilters})</Btn>}
      </div>

      <Card title={`All reports`} actions={[<Badge key="n" variant="accent">{list.length} of {reports.length}</Badge>]}>
        {list.length === 0 ? (
          <EmptyState icon="file" title="No reports match" message="Try clearing some filters." action={<Btn variant="secondary" small onClick={resetFilters}>Clear filters</Btn>} />
        ) : (
          <div>
            <div style={{ display: 'flex', padding: '10px 20px', borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
              {[['Student', 2], ['Subject', 1.4], ['Class', 1.8], ['Teacher', 1.6], ['Period', 1.4], ['Status', 1], ['', 0.5]].map(([c, fl], i) => (
                <span key={i} style={{ flex: fl, fontSize: 11, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c}</span>
              ))}
            </div>
            {list.map(r => (
              <div key={r.id} onClick={() => setReading(r.id)} style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${DS.border}`, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = DS.surface} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={r.studentName} size={28} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.studentName}</span>
                </span>
                <span style={{ flex: 1.4, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.subjectColor || DS.accent }} />
                  <span style={{ fontSize: 12.5, color: DS.sub }}>{r.subject}</span>
                </span>
                <span style={{ flex: 1.8, fontSize: 12.5, color: DS.muted }}>{r.className}</span>
                <span style={{ flex: 1.6, fontSize: 12.5, color: DS.sub }}>{r.teacher}</span>
                <span style={{ flex: 1.4, fontSize: 12.5, color: DS.muted }}>{r.period}</span>
                <span style={{ flex: 1 }}><Badge variant={RPT_STATUS_META[r.status].variant}>{RPT_STATUS_META[r.status].label}</Badge></span>
                <span style={{ flex: 0.5, textAlign: 'right', color: DS.faint }}><Icon name="chevron_r" size={15} /></span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// `onEditTemplate(template|null)` opens the full-page template builder (owned by
// the hub). `savedToast` flashes the "Saved" badge after a template is saved.
const AdminReportsSettings = ({ store, onEditTemplate, savedToast }) => {
  const c = store.store.config;
  const cs = c.centreStandards || {};
  const [saved, setSaved] = React.useState(false);
  const upd = (patch) => { store.updateConfig(patch); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const updNested = (key, patch) => upd({ [key]: { ...c[key], ...patch } });
  const setStd = (patch) => { store.setCentreStandards(patch); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const toggleGuardSection = (sec) => {
    const cur = cs.sectionsRequiredEverywhere || [];
    setStd({ sectionsRequiredEverywhere: cur.includes(sec) ? cur.filter(s => s !== sec) : [...cur, sec] });
  };

  const b = c.branding;
  const permLabels = {
    editPublished: ['Edit published reports', 'Edit is greyed out on a published report; teachers must duplicate to revise.'],
    deleteReports: ['Delete reports', 'The Delete action is hidden in the report toolbar.'],
    archiveReports: ['Archive reports', 'The Archive action is hidden; reports can’t be moved out of the active list.'],
    exportReports: ['Export reports', 'The Export / Download PDF button is hidden.'],
    shareTemplates: ['Share templates', 'Teachers can’t publish their personal templates to the centre.'],
    viewOthers: ['View other teachers’ reports', 'The “All reports” cross-teacher browser is hidden from teachers.'],
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, height: 22 }}>
        {(saved || savedToast) && <Badge variant="success"><Icon name="check" size={11} /> Saved</Badge>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 1 ─ Reporting rules (cadence: required / optional / off + frequency + template) */}
        <AdminReportingRules store={store} config={c} />

        {/* 2 ─ Templates (list only — the maker is unchanged and owns all section/rating config) */}
        <Card title="Templates" subtitle="Sections, rating scale and categories are configured inside each template"
          actions={[<Btn key="a" variant="ghost" icon="plus" small onClick={() => onEditTemplate(null)}>New template</Btn>]}>
          <div style={{ padding: '8px 20px 16px' }}>
            {store.store.templates.map(t => {
              const assigned = [].concat(
                (t.assignedYears || []).length ? t.assignedYears : [],
                (t.assignedSubjects || []),
                (t.assignedClasses || []),
              );
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${DS.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="file" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{t.name}{t.default && <Badge variant="accent">Default</Badge>}{t.locked && <Badge variant="default">🔒 Locked</Badge>}<Badge variant="default">{(t.sections || []).length} sections</Badge></div>
                    <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{t.description}</div>
                    <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 3 }}>{assigned.length ? 'Assigned to: ' + assigned.join(', ') : 'Available everywhere'}</div>
                  </div>
                  <Btn variant="ghost" icon="copy" small onClick={() => { const id = store.addTemplate({ ...t, id: undefined, name: t.name + ' (Copy)', default: false, locked: false }); }}>Duplicate</Btn>
                  <Btn variant="secondary" icon="edit" small onClick={() => onEditTemplate(t)}>Edit</Btn>
                  <button onClick={() => { if (confirm(`Delete template “${t.name}”?`)) store.deleteTemplate(t.id); }} title="Delete template" style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.faint, padding: 6 }}><Icon name="trash" size={15} /></button>
                </div>
              );
            })}
            <TeachersSee>The report form a teacher fills in — which sections appear and the rating scale — comes entirely from the template the rule resolves to. Edit a template to change them.</TeachersSee>
          </div>
        </Card>

        {/* 3 ─ Centre standards (completion FLOORS only — distinct from cadence "required") */}
        <Card title="Centre standards" subtitle="Minimum bar every report must clear before it can be submitted">
          <div style={{ padding: '14px 20px 16px' }}>
            <Field label="Minimum comment length (characters)" hint="A report can’t be submitted until the teacher’s comment reaches this length">
              <Input type="number" value={cs.minCommentLength} onChange={e => setStd({ minCommentLength: +e.target.value })} style={{ width: 160 }} />
            </Field>
            <ToggleRow label="Require a teacher signature" hint="The report must carry a signature before submission" on={cs.requireSignature} onChange={v => setStd({ requireSignature: v })} />
            <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.04em', margin: '16px 0 8px' }}>SECTIONS THAT MUST APPEAR IN EVERY TEMPLATE</div>
            <div style={{ fontSize: 12, color: DS.muted, marginBottom: 10 }}>A guardrail the template maker reads. Templates may require <strong>more</strong> than this floor, never less. (Sections themselves are configured in the template maker.)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {RPT_ALL_SECTIONS.map(sec => {
                const on = (cs.sectionsRequiredEverywhere || []).includes(sec);
                return (
                  <button key={sec} onClick={() => toggleGuardSection(sec)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 20, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    border: `1px solid ${on ? DS.accentBorder : DS.border}`,
                    background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.muted,
                  }}>
                    {on && <Icon name="check" size={12} />}{RPT_SECTION_LABELS[sec]}
                  </button>
                );
              })}
            </div>
            <TeachersSee>Required-field markers appear on these sections, and <strong>Submit for review</strong> stays blocked until the comment reaches {cs.minCommentLength} characters{cs.requireSignature ? ' and a signature is added' : ''}.</TeachersSee>
          </div>
        </Card>

        {/* 4 ─ Branding (existing fields + live PDF header preview) */}
        <Card title="PDF branding">
          <div style={{ padding: '16px 20px' }}>
            {/* live header preview */}
            <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.04em', marginBottom: 8 }}>LIVE PDF HEADER</div>
            <div style={{ border: `1px solid ${DS.cardBorder}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18, background: '#fff' }}>
              <div style={{ height: 5, background: b.primaryColor }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderBottom: `2px solid #e5e7eb` }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: b.primaryColor, color: '#fff', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{b.logo || 'TC'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.centreName || 'Centre name'}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: b.primaryColor }}>{b.headerText || 'Report title'}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 11, color: '#6b7280', flexShrink: 0 }}>
                  <div>Summer Term 2026</div><div>Generated {REPORTS_TODAY}</div>
                </div>
              </div>
              <div style={{ padding: '8px 18px 12px', fontSize: 9.5, color: '#9ca3af', textAlign: 'center' }}>{b.footerText || 'Footer text'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Centre name"><Input value={b.centreName} onChange={e => updNested('branding', { centreName: e.target.value })} /></Field>
              <Field label="Logo initials"><Input value={b.logo} onChange={e => updNested('branding', { logo: e.target.value })} /></Field>
              <Field label="Primary colour">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={b.primaryColor} onChange={e => updNested('branding', { primaryColor: e.target.value })} style={{ width: 44, height: 34, border: `1px solid ${DS.border}`, borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                  <Input value={b.primaryColor} onChange={e => updNested('branding', { primaryColor: e.target.value })} style={{ flex: 1 }} />
                </div>
              </Field>
              <Field label="PDF theme">
                <Select value={b.pdfTheme} onChange={e => updNested('branding', { pdfTheme: e.target.value })}>
                  <option value="classic">Classic</option><option value="modern">Modern</option><option value="minimal">Minimal</option>
                </Select>
              </Field>
              <Field label="Header text"><Input value={b.headerText} onChange={e => updNested('branding', { headerText: e.target.value })} /></Field>
              <Field label="Watermark (optional)"><Input value={b.watermark} onChange={e => updNested('branding', { watermark: e.target.value })} placeholder="e.g. CONFIDENTIAL" /></Field>
              <Field label="Footer text" style={{ gridColumn: '1 / -1' }}><Input value={b.footerText} onChange={e => updNested('branding', { footerText: e.target.value })} /></Field>
              <Field label="Signature name"><Input value={b.signatureName} onChange={e => updNested('branding', { signatureName: e.target.value })} /></Field>
              <Field label="Signature title"><Input value={b.signatureTitle} onChange={e => updNested('branding', { signatureTitle: e.target.value })} /></Field>
              <Field label="Contact email"><Input value={b.contactEmail} onChange={e => updNested('branding', { contactEmail: e.target.value })} /></Field>
              <Field label="Contact phone"><Input value={b.contactPhone} onChange={e => updNested('branding', { contactPhone: e.target.value })} /></Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Btn variant="secondary" icon="eye" small onClick={() => { const any = store.reportsArr.find(r => r.status === 'published') || store.reportsArr[0]; if (any) printReportPDF(any, b); }}>Preview branded PDF</Btn>
              </div>
            </div>
            <TeachersSee>This header, the accent colour and the footer appear on every exported report PDF a teacher or student downloads.</TeachersSee>
          </div>
        </Card>

        {/* 5 ─ Permissions */}
        <Card title="Teacher permissions">
          <div style={{ padding: '8px 20px 14px' }}>
            {Object.keys(permLabels).map(k => (
              <ToggleRow key={k} label={permLabels[k][0]} on={c.permissions[k]} onChange={v => updNested('permissions', { [k]: v })} />
            ))}
            <TeachersSee>
              {Object.keys(permLabels).filter(k => !c.permissions[k]).length === 0
                ? 'All actions are available to teachers on their reports.'
                : <>{Object.keys(permLabels).filter(k => !c.permissions[k]).map(k => permLabels[k][1]).join(' ')}</>}
            </TeachersSee>
          </div>
        </Card>

        {/* 6 ─ Notifications */}
        <Card title="Notifications">
          <div style={{ padding: '8px 20px 14px' }}>
            <ToggleRow label="Teacher report-due reminders" on={c.notifications.dueReminder} onChange={v => updNested('notifications', { dueReminder: v })} />
            <ToggleRow label="Overdue report alerts" on={c.notifications.overdueReminder} onChange={v => updNested('notifications', { overdueReminder: v })} />
            <ToggleRow label="Notify student when report published" on={c.notifications.publishedToStudent} onChange={v => updNested('notifications', { publishedToStudent: v })} />
            <ToggleRow label="Parent notifications" hint="Coming soon" on={c.notifications.parentNotification} onChange={v => updNested('notifications', { parentNotification: v })} />
            <TeachersSee>
              {[
                c.notifications.dueReminder && 'a reminder before each report is due',
                c.notifications.overdueReminder && 'an alert when a report goes overdue',
                c.notifications.publishedToStudent && 'the student is alerted the moment a report is published',
              ].filter(Boolean).join('; ') || 'no automatic reminders or alerts are sent.'}
            </TeachersSee>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Admin operational reporting (overview + generate) ──────────────────────────
// Centre-wide report types driven live from the existing admin data
// (window.allStudents) + the reports store + REPORTS_INVOICES.
const ADMIN_REPORT_TYPES = [
  { id: 'progress',   label: 'Student Progress Report', icon: 'chart', desc: 'Per-student scores, attendance and predicted grades — suitable for parents.' },
  { id: 'attendance', label: 'Attendance Summary',      icon: 'check', desc: 'Attendance breakdown by student and year group.' },
  { id: 'homework',   label: 'Homework Completion',     icon: 'clip',  desc: 'Submission rates and average scores per student.' },
  { id: 'reporting',  label: 'Reporting Activity',      icon: 'file',  desc: 'How many progress reports are drafted, published and acknowledged.' },
  { id: 'financial',  label: 'Financial Overview',      icon: 'invoice', desc: 'Revenue, outstanding and overdue invoices, enrolment numbers.' },
];

function adminStudentsData() {
  return (typeof allStudents !== 'undefined' && Array.isArray(allStudents)) ? allStudents : [];
}
function avg(arr, key) { return arr.length ? Math.round(arr.reduce((s, x) => s + (key ? x[key] : x), 0) / arr.length) : 0; }
function money(n) { return '£' + n.toLocaleString('en-GB'); }

function financialTotals() {
  const inv = (typeof REPORTS_INVOICES !== 'undefined') ? REPORTS_INVOICES : [];
  const sum = (f) => inv.filter(f).reduce((s, i) => s + i.amount, 0);
  return {
    invoices: inv,
    billed:       sum(() => true),
    paid:         sum(i => i.status === 'paid'),
    outstanding:  sum(i => i.status !== 'paid'),
    overdue:      sum(i => i.status === 'overdue'),
    paidCount:    inv.filter(i => i.status === 'paid').length,
    overdueCount: inv.filter(i => i.status === 'overdue').length,
  };
}

// builds {title, columns, rows, summary[]} for a given report type.
// `f` is the filter object { year, subject, className, teacher, status }.
function buildAdminReport(type, store, f) {
  f = f || {};
  const yearFilter = f.year || 'all';
  const students = adminStudentsData().filter(s => yearFilter === 'all' || s.year === yearFilter);
  const matchReport = (r) =>
    (yearFilter === 'all' || r.year === yearFilter) &&
    (!f.subject || f.subject === 'all' || r.subject === f.subject) &&
    (!f.className || f.className === 'all' || r.className === f.className) &&
    (!f.teacher || f.teacher === 'all' || r.teacher === f.teacher) &&
    (!f.status || f.status === 'all' || r.status === f.status);
  const reports = store.reportsArr.filter(matchReport);
  if (type === 'attendance') {
    return {
      title: 'Attendance Summary',
      summary: [
        ['Average attendance', avg(students, 'attendance') + '%'],
        ['Students below 85%', String(students.filter(s => s.attendance < 85).length)],
        ['Students tracked', String(students.length)],
      ],
      columns: ['Student', 'Year', 'Attendance', 'Status'],
      rows: students.map(s => [s.name, s.year, s.attendance + '%', s.attendance >= 90 ? 'Good' : s.attendance >= 80 ? 'Monitor' : 'At risk']),
    };
  }
  if (type === 'homework') {
    return {
      title: 'Homework Completion',
      summary: [
        ['Average completion', avg(students, 'hw') + '%'],
        ['Below 60%', String(students.filter(s => s.hw < 60).length)],
        ['Students tracked', String(students.length)],
      ],
      columns: ['Student', 'Year', 'HW completion', 'Avg score'],
      rows: students.map(s => [s.name, s.year, s.hw + '%', s.score + '%']),
    };
  }
  if (type === 'reporting') {
    const drafts = reports.filter(r => r.status === 'draft').length;
    const pub = reports.filter(r => r.status === 'published');
    const acked = pub.filter(r => r.acknowledgement && r.acknowledgement.ack).length;
    const summary = [
      ['Total reports', String(reports.length)],
      ['Published', String(pub.length)],
      ['Drafts awaiting', String(drafts)],
      ['Acknowledged', `${acked}/${pub.length}`],
    ];
    // When narrowed to a single subject/class/teacher, list the individual reports;
    // otherwise summarise by subject as before.
    const narrowed = ['subject', 'className', 'teacher'].some(k => f[k] && f[k] !== 'all');
    if (narrowed) {
      return {
        title: 'Reporting Activity',
        summary,
        columns: ['Student', 'Subject', 'Class', 'Teacher', 'Status'],
        rows: reports.map(r => [r.studentName, r.subject, r.className, r.teacher, RPT_STATUS_META[r.status].label]),
      };
    }
    const bySubject = {};
    reports.forEach(r => { bySubject[r.subject] = (bySubject[r.subject] || 0) + 1; });
    return {
      title: 'Reporting Activity',
      summary,
      columns: ['Subject', 'Reports', 'Published', 'Drafts'],
      rows: Object.keys(bySubject).map(sub => {
        const rs = reports.filter(r => r.subject === sub);
        return [sub, String(rs.length), String(rs.filter(r => r.status === 'published').length), String(rs.filter(r => r.status === 'draft').length)];
      }),
    };
  }
  if (type === 'financial') {
    const f = financialTotals();
    return {
      title: 'Financial Overview',
      summary: [
        ['Total billed', money(f.billed)],
        ['Paid', money(f.paid)],
        ['Outstanding', money(f.outstanding)],
        ['Overdue', money(f.overdue)],
      ],
      columns: ['Student', 'Plan', 'Amount', 'Status'],
      rows: f.invoices.map(i => [i.student, i.plan, money(i.amount), i.status[0].toUpperCase() + i.status.slice(1)]),
    };
  }
  // progress (default)
  return {
    title: 'Student Progress Report',
    summary: [
      ['Average score', avg(students, 'score') + '%'],
      ['On track', String(students.filter(s => s.status !== 'at-risk').length)],
      ['Needs support', String(students.filter(s => s.status === 'at-risk').length)],
      ['Students', String(students.length)],
    ],
    columns: ['Student', 'Year', 'Avg score', 'Attendance', 'Status'],
    rows: students.map(s => [s.name, s.year, s.score + '%', s.attendance + '%', s.status === 'at-risk' ? 'Needs support' : 'On track']),
  };
}

function printCentreReport(report, branding, period) {
  branding = branding || REPORTS_CONFIG.branding;
  const acc = branding.primaryColor || '#4F46E5';
  const head = report.columns.map(c => `<th>${rptEsc(c)}</th>`).join('');
  const body = report.rows.map(r => '<tr>' + r.map((c, i) => `<td${i === 0 ? ' class="b"' : ''}>${rptEsc(c)}</td>`).join('') + '</tr>').join('');
  const cards = report.summary.map(([k, v]) => `<div class="stat"><div class="sk">${rptEsc(k)}</div><div class="sv">${rptEsc(v)}</div></div>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${rptEsc(branding.centreName)} — ${rptEsc(report.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 14mm 20mm; }
    body { font-family:'Inter','Segoe UI',sans-serif; color:#1f2937; margin:0; font-size:12.5px; }
    .printbar { position:sticky; top:0; background:#111827; color:#fff; padding:10px 16px; display:flex; gap:12px; align-items:center; font-size:13px; }
    .printbar button { background:${acc}; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-weight:600; cursor:pointer; }
    @media print { .printbar { display:none; } }
    .sheet { max-width:820px; margin:0 auto; padding:24px; }
    .rhead { display:flex; align-items:center; gap:16px; padding-bottom:14px; border-bottom:2px solid #e5e7eb; }
    .crest { width:50px; height:50px; border-radius:10px; background:${acc}; color:#fff; font-weight:800; font-size:19px; display:flex; align-items:center; justify-content:center; }
    .centre { font-size:17px; font-weight:800; } .htitle { font-size:13px; font-weight:600; color:${acc}; }
    .meta { margin-left:auto; text-align:right; font-size:12px; color:#6b7280; }
    .stats { display:flex; gap:12px; margin:18px 0; flex-wrap:wrap; }
    .stat { flex:1; min-width:120px; border:1px solid #eef0f3; border-radius:8px; padding:10px 12px; }
    .sk { font-size:11px; color:#6b7280; } .sv { font-size:18px; font-weight:800; margin-top:3px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#6b7280; padding:8px; border-bottom:2px solid ${acc}33; }
    td { padding:7px 8px; border-bottom:1px solid #f1f3f5; } td.b { font-weight:600; }
    .footer-note { text-align:center; color:#9ca3af; font-size:10.5px; margin:24px 0; }
  </style></head><body>
  <div class="printbar"><span>📄 ${rptEsc(report.title)} ready — use “Save as PDF”.</span><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="rhead">
      <div class="crest">${rptEsc(branding.logo || 'TC')}</div>
      <div><div class="centre">${rptEsc(branding.centreName)}</div><div class="htitle">${rptEsc(report.title)}</div></div>
      <div class="meta"><div>${rptEsc(period || 'Spring Term 2026')}</div><div>Generated ${REPORTS_TODAY}</div></div>
    </div>
    <div class="stats">${cards}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </div>
  <div class="footer-note">${rptEsc(branding.footerText)}</div>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to export the report.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

const AdminReportsOverview = ({ store, onGenerate, onBrowse, onViewDue }) => {
  const students = adminStudentsData();
  const reports = store.reportsArr;
  const f = financialTotals();
  const atRisk = students.filter(s => s.status === 'at-risk');
  const pub = reports.filter(r => r.status === 'published');
  const drafts = reports.filter(r => r.status === 'draft');

  const yearGroups = Array.from(new Set(students.map(s => s.year))).sort();

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPICard label="Average score" value={avg(students, 'score') + '%'} icon="chart" iconBg={DS.accentLight} accent={DS.accent} sub={`${students.length} students`} />
        <KPICard label="Average attendance" value={avg(students, 'attendance') + '%'} icon="check" iconBg={DS.successBg} accent={DS.success} trend="this term" trendDir="up" />
        <KPICard label="At-risk students" value={atRisk.length} icon="alert" iconBg={DS.dangerBg} accent={DS.danger} sub="need support" />
        <KPICard label="Outstanding fees" value={money(f.outstanding)} icon="invoice" iconBg={DS.warningBg} accent={DS.warning} sub={`${f.overdueCount} overdue`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
        {/* Upcoming reports across all teachers — driven by the reporting rules */}
        <UpcomingReports config={store.store.config} store={store} showTeacher limit={6} onView={onViewDue} />

        {/* Reporting status */}
        <Card title="Progress reports" actions={[<Btn key="b" variant="ghost" icon="grid" small onClick={onBrowse}>View all reports</Btn>]}>
          <div style={{ padding: '16px 20px' }}>
            {[['Published', pub.length, DS.success], ['Drafts awaiting completion', drafts.length, DS.warning], ['Acknowledged by students', pub.filter(r => r.acknowledgement && r.acknowledgement.ack).length, DS.accent]].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${DS.border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                <span style={{ flex: 1, fontSize: 13, color: DS.sub }}>{l}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{v}</span>
              </div>
            ))}
            <Btn variant="ghost" icon="file" small onClick={() => onGenerate('reporting')}>Generate reporting activity report</Btn>
          </div>
        </Card>

        {/* Attendance by year */}
        <Card title="Attendance by year group">
          <div style={{ padding: '16px 20px' }}>
            {yearGroups.map(yr => {
              const g = students.filter(s => s.year === yr);
              const a = avg(g, 'attendance');
              const col = a >= 90 ? DS.success : a >= 80 ? DS.warning : DS.danger;
              return (
                <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <span style={{ width: 48, fontSize: 12.5, color: DS.sub, fontWeight: 600 }}>{yr}</span>
                  <span style={{ flex: 1, height: 8, background: DS.surface, borderRadius: 4, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: a + '%', background: col }} />
                  </span>
                  <span style={{ width: 38, fontSize: 12.5, fontWeight: 700, color: col, textAlign: 'right' }}>{a}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Quick generate strip */}
      <Card title="Generate a report" actions={[<Btn key="g" variant="ghost" icon="chevron_r" small onClick={() => onGenerate('progress')}>Open generator</Btn>]}>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {ADMIN_REPORT_TYPES.map(rt => (
            <button key={rt.id} onClick={() => onGenerate(rt.id)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', textAlign: 'left',
              border: `1px solid ${DS.cardBorder}`, borderRadius: 10, background: DS.bg, cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={rt.icon} size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{rt.label}</div>
                <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 2, lineHeight: 1.45 }}>{rt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

const AdminReportsGenerate = ({ store, initialType }) => {
  const [type, setType] = React.useState(initialType || 'progress');
  const [year, setYear] = React.useState('all');
  const [subject, setSubject] = React.useState('all');
  const [className, setClassName] = React.useState('all');
  const [teacher, setTeacher] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [period, setPeriod] = React.useState('Spring Term 2026');
  const branding = store.store.config.branding;
  const students = adminStudentsData();
  const years = ['all', ...Array.from(new Set(students.map(s => s.year))).sort()];
  const uniq = (key) => Array.from(new Set(store.reportsArr.map(r => r[key]).filter(Boolean))).sort();
  const subjects = uniq('subject'), classes = uniq('className'), teachers = uniq('teacher');

  // Report-level filters (subject/class/teacher/status) only affect report-derived types.
  const reportScoped = type === 'reporting';
  const filters = { year, period, subject, className, teacher, status };
  const report = buildAdminReport(type, store, filters);
  const resetScope = () => { setSubject('all'); setClassName('all'); setTeacher('all'); setStatus('all'); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
      {/* config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Report type">
          <div style={{ padding: '8px 0' }}>
            {ADMIN_REPORT_TYPES.map((rt, i) => (
              <div key={rt.id} onClick={() => setType(rt.id)} style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < ADMIN_REPORT_TYPES.length - 1 ? `1px solid ${DS.border}` : 'none',
                background: type === rt.id ? DS.accentLight : 'transparent',
                borderLeft: `3px solid ${type === rt.id ? DS.accent : 'transparent'}` }}>
                <div style={{ fontSize: 13, fontWeight: type === rt.id ? 600 : 500, color: type === rt.id ? DS.accent : DS.text }}>{rt.label}</div>
                <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 2, lineHeight: 1.45 }}>{rt.desc}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Filters">
          <div style={{ padding: '16px' }}>
            <Field label="Year group">
              <Select value={year} onChange={e => setYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y === 'all' ? 'All students' : y}</option>)}
              </Select>
            </Field>
            <Field label="Period">
              <Select value={period} onChange={e => setPeriod(e.target.value)}>
                <option>Spring Term 2026</option><option>Autumn Term 2025</option><option>Summer Term 2025</option>
              </Select>
            </Field>

            {reportScoped ? (
              <>
                <Field label="Subject">
                  <Select value={subject} onChange={e => setSubject(e.target.value)}>
                    <option value="all">All subjects</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Class / group">
                  <Select value={className} onChange={e => setClassName(e.target.value)}>
                    <option value="all">All classes</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Teacher">
                  <Select value={teacher} onChange={e => setTeacher(e.target.value)}>
                    <option value="all">All teachers</option>{teachers.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="all">All statuses</option>{Object.keys(RPT_STATUS_META).map(s => <option key={s} value={s}>{RPT_STATUS_META[s].label}</option>)}
                  </Select>
                </Field>
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: DS.faint, lineHeight: 1.5, margin: '0 0 14px', padding: '8px 10px', background: DS.surface, borderRadius: 7 }}>
                Subject, class, teacher and status filters apply to the <strong>Reporting Activity</strong> report.
              </div>
            )}

            <Btn variant="primary" icon="print" onClick={() => printCentreReport(report, branding, period)}>Generate &amp; export PDF</Btn>
            {reportScoped && [subject, className, teacher, status].some(v => v !== 'all') &&
              <Btn variant="ghost" small icon="x" onClick={resetScope} style={{ marginTop: 8 }}>Clear scope</Btn>}
          </div>
        </Card>
      </div>

      {/* preview */}
      <Card title={`Preview — ${report.title}`} actions={[<Badge key="n" variant="accent">{report.rows.length} rows</Badge>]}>
        <div style={{ padding: '24px 28px', background: DS.surface, minHeight: 460 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: `2px solid ${DS.border}`, marginBottom: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: branding.primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{branding.logo}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: DS.text }}>{branding.centreName}</div>
              <div style={{ fontSize: 12.5, color: DS.accent, fontWeight: 600 }}>{report.title}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: DS.muted }}>
              <div>{period}</div><div>Generated {REPORTS_TODAY}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            {report.summary.map(([k, v]) => (
              <div key={k} style={{ flex: 1, minWidth: 120, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: DS.muted }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: DS.text, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', padding: '10px 14px', borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
              {report.columns.map((c, i) => (
                <span key={c} style={{ flex: i === 0 ? 2 : 1, fontSize: 11, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c}</span>
              ))}
            </div>
            {report.rows.slice(0, 12).map((row, ri) => (
              <div key={ri} style={{ display: 'flex', padding: '9px 14px', borderBottom: ri < Math.min(report.rows.length, 12) - 1 ? `1px solid ${DS.border}` : 'none' }}>
                {row.map((cell, ci) => (
                  <span key={ci} style={{ flex: ci === 0 ? 2 : 1, fontSize: 12.5, color: ci === 0 ? DS.text : DS.sub, fontWeight: ci === 0 ? 600 : 400 }}>{cell}</span>
                ))}
              </div>
            ))}
            {report.rows.length > 12 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: DS.faint, textAlign: 'center' }}>+ {report.rows.length - 12} more rows in the exported PDF</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── Admin Reports hub (Overview / Generate / Settings) ─────────────────────────
// The section (overview | browse | generate | settings) is driven by the sidebar
// dropdown via the `section` prop. `goTab` keeps the sidebar's active sub-item in
// sync when the page navigates between sections internally (e.g. a "Generate" CTA).
const AdminReportsConfig = ({ section }) => {
  const store = useReportsStore();
  const tab = section || 'overview';
  const goTab = (t) => { window.__navigate ? window.__navigate('admin', 'reports:' + t) : null; };
  const [genType, setGenType] = React.useState('progress');
  const [tplEdit, setTplEdit] = React.useState(undefined);   // undefined=closed, null=new, obj=editing
  const [savedToast, setSavedToast] = React.useState(false);
  const [dueOpen, setDueOpen] = React.useState(false);       // full "Reports due" page
  const goGenerate = (t) => { setGenType(t); goTab('generate'); };

  // The template builder is its own full-page surface — replace the whole hub
  // (no PageHeader) so it reads as a separate page.
  if (tplEdit !== undefined) {
    return (
      <AdminTemplateBuilder template={tplEdit || null} store={store}
        onClose={() => setTplEdit(undefined)}
        onSaved={() => { setTplEdit(undefined); setSavedToast(true); setTimeout(() => setSavedToast(false), 1800); }} />
    );
  }

  // "Reports due" is also its own full-page surface (all teachers, soonest first).
  if (dueOpen) {
    return (
      <UpcomingReportsPage config={store.store.config} store={store} showTeacher
        onBack={() => setDueOpen(false)}
        onOpenStudent={() => { setDueOpen(false); goTab('browse'); }} />
    );
  }

  const titles = {
    overview: 'Centre-wide reporting — generate, export and configure',
    browse:   'Browse, filter and export every report across the centre',
    generate: 'Generate progress, attendance and performance reports',
    settings: 'Templates, reporting rules and centre standards',
  };

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="Reports" subtitle={titles[tab] || titles.overview} />

      {tab === 'overview' && <AdminReportsOverview store={store} onGenerate={goGenerate} onBrowse={() => goTab('browse')} onViewDue={() => setDueOpen(true)} />}
      {tab === 'browse' && <AdminReportsBrowser store={store} />}
      {tab === 'generate' && <AdminReportsGenerate store={store} initialType={genType} />}
      {tab === 'settings' && <AdminReportsSettings store={store} onEditTemplate={setTplEdit} savedToast={savedToast} />}
    </div>
  );
};

Object.assign(window, { useReportsStore, printReportPDF, printCentreReport, ReportReadingView, ReportEditor, TeacherReports, StudentReports, AdminReportsConfig, AdminReportsSettings, AdminReportingRules, resolvePolicy, resolveForStudent, ruleLabel, reportClasses, reportStudents, reportStudentLabel, reportClassById, RPT_REQUIREMENT, RPT_REQ_META, RPT_FREQ, rptFreqLabel, rptFreqDays, RatingValue, RatingEditor, RichTextEditor, EditList, RptTag, SectionTitle, RPT_FOURTIER, RPT_RATING_LABELS, RPT_SECTION_LABELS, RPT_STATUS_META });
